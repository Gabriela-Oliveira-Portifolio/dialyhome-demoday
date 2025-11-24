// backend/src/controllers/doctorController.js - VERSÃO REFATORADA

const db = require('../config/database');
const bcrypt = require('bcrypt');
const emailService = require('../services/emailService');

// ===============================
// FUNÇÕES AUXILIARES PARA ANALYTICS
// ===============================

const analyticsHelpers = {
  // Buscar dados de pressão arterial
  async fetchPressureData(patientId, startDate) {
    const query = `
      SELECT 
        TO_CHAR(data_registro, 'DD/MM') as date,
        pressao_arterial_sistolica as systolic,
        pressao_arterial_diastolica as diastolic,
        140 as "systolicIdeal",
        90 as "diastolicIdeal"
      FROM registros_dialise
      WHERE paciente_id = $1 AND data_registro >= $2 AND sintomas is null
      ORDER BY data_registro ASC
    `;
    const result = await db.query(query, [patientId, startDate]);
    return result.rows;
  },

  // Buscar dados de ultrafiltração
  async fetchUFData(patientId, startDate) {
    const query = `
      SELECT 
        TO_CHAR(data_registro, 'DD/MM') as date,
        uf_total as uf
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND data_registro >= $2
        AND uf_total IS NOT NULL
        AND sintomas is null
      ORDER BY data_registro ASC
    `;
    const result = await db.query(query, [patientId, startDate]);
    return result.rows;
  },

  // Buscar dados de glicose
  async fetchGlucoseData(patientId, startDate) {
    const query = `
      SELECT 
        TO_CHAR(data_registro, 'DD/MM') as date,
        concentracao_glicose as glucose
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND data_registro >= $2
        AND concentracao_glicose IS NOT NULL
        AND sintomas is null
      ORDER BY data_registro ASC
    `;
    const result = await db.query(query, [patientId, startDate]);
    return result.rows;
  },

  // Buscar frequência de sessões
  async fetchSessionFrequency(patientId, startDate) {
    const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE data_registro >= CURRENT_DATE - INTERVAL '7 days') as last_week,
        COUNT(*) FILTER (WHERE sintomas IS NOT NULL AND sintomas != '') as with_symptoms
      FROM registros_dialise
      WHERE paciente_id = $1 AND data_registro >= $2 AND sintomas is null
    `;
    const result = await db.query(query, [patientId, startDate]);
    return result.rows[0];
  },

  // Buscar distribuição de sintomas
  async fetchSymptomsDistribution(patientId, startDate) {
    const query = `
      SELECT 
        sintomas,
        COUNT(*) as count
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND data_registro >= $2
        AND sintomas IS NOT NULL 
        AND sintomas != ''
      GROUP BY sintomas
      ORDER BY count DESC
      LIMIT 5
    `;
    const result = await db.query(query, [patientId, startDate]);
    
    const symptomColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
    return result.rows.map((symptom, index) => ({
      name: symptom.sintomas.substring(0, 30) + (symptom.sintomas.length > 30 ? '...' : ''),
      value: Number.parseInt(symptom.count),
      color: symptomColors[index] || '#6b7280'
    }));
  },

  // Calcular mudança percentual entre duas médias
  calculatePercentageChange(firstHalf, secondHalf) {
    if (firstHalf === 0) return 0;
    return ((secondHalf - firstHalf) / firstHalf * 100).toFixed(1);
  },

  // Determinar direção da tendência
  getTrendDirection(change) {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'stable';
  },

  // Calcular média de um array
  calculateAverage(values) {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  },

  // Analisar tendência de pressão
  analyzePressureTrend(pressureData) {
    if (pressureData.length === 0) {
      return {
        status: 'Sem dados',
        average: { systolic: 0, diastolic: 0 },
        direction: 'stable',
        change: 0,
        insight: 'Dados insuficientes para análise',
        score: 0
      };
    }

    const avgSystolic = this.calculateAverage(pressureData.map(p => p.systolic));
    const avgDiastolic = this.calculateAverage(pressureData.map(p => p.diastolic));
    
    const midPoint = Math.floor(pressureData.length / 2);
    const firstHalf = this.calculateAverage(
      pressureData.slice(0, midPoint).map(p => p.systolic)
    );
    const secondHalf = this.calculateAverage(
      pressureData.slice(midPoint).map(p => p.systolic)
    );
    
    const change = this.calculatePercentageChange(firstHalf, secondHalf);
    const direction = this.getTrendDirection(change);
    const score = Math.max(0, 100 - Math.abs(130 - avgSystolic) - Math.abs(80 - avgDiastolic));

    let status, insight;
    if (avgSystolic < 90 || avgDiastolic < 60) {
      status = 'Baixa';
      insight = 'Pressão arterial abaixo do ideal. Considere revisar medicações hipotensoras.';
    } else if (avgSystolic > 140 || avgDiastolic > 90) {
      status = 'Alta';
      insight = 'Pressão arterial elevada. Recomenda-se ajuste no tratamento anti-hipertensivo.';
    } else {
      status = 'Controlada';
      insight = 'Pressão arterial dentro dos parâmetros ideais. Manter tratamento atual.';
    }

    return {
      status,
      average: {
        systolic: Math.round(avgSystolic),
        diastolic: Math.round(avgDiastolic)
      },
      direction,
      change,
      insight,
      score: Math.round(score)
    };
  },

  // Analisar tendência de UF
  analyzeUFTrend(ufData) {
    if (ufData.length === 0) {
      return {
        average: 0,
        max: 0,
        min: 0,
        direction: 'stable',
        change: 0,
        score: 0
      };
    }

    const ufValues = ufData.map(r => r.uf);
    const ufAvg = this.calculateAverage(ufValues);
    const ufMax = Math.max(...ufValues);
    const ufMin = Math.min(...ufValues);
    
    const midPoint = Math.floor(ufValues.length / 2);
    const firstHalf = this.calculateAverage(ufValues.slice(0, midPoint));
    const secondHalf = this.calculateAverage(ufValues.slice(midPoint));
    
    const change = this.calculatePercentageChange(firstHalf, secondHalf);
    const direction = this.getTrendDirection(change);
    const score = Math.min(100, (ufAvg / 3000) * 100);

    return {
      average: Math.round(ufAvg),
      max: Math.round(ufMax),
      min: Math.round(ufMin),
      direction,
      change,
      score: Math.round(score)
    };
  },

  // Analisar tendência de glicose
  analyzeGlucoseTrend(glucoseData) {
    if (glucoseData.length === 0) {
      return {
        status: 'Sem dados',
        average: 0,
        score: 0
      };
    }

    const glucoseValues = glucoseData.map(r => r.glucose);
    const glucoseAvg = this.calculateAverage(glucoseValues);
    
    let status;
    if (glucoseAvg < 70) {
      status = 'Baixa';
    } else if (glucoseAvg > 180) {
      status = 'Alta';
    } else {
      status = 'Controlada';
    }
    
    const score = Math.max(0, 100 - Math.abs(100 - glucoseAvg) * 0.5);

    return {
      status,
      average: Math.round(glucoseAvg),
      score: Math.round(score)
    };
  },

  // Processar distribuição de sintomas
  processSymptomsDistribution(symptomsData, totalSessions, sessionsWithSymptoms) {
    const distribution = [...symptomsData];
    
    const sessionsWithoutSymptoms = totalSessions - sessionsWithSymptoms;
    if (sessionsWithoutSymptoms > 0) {
      distribution.push({
        name: 'Sem sintomas',
        value: sessionsWithoutSymptoms,
        color: '#d1d5db'
      });
    }

    return distribution;
  },

  // Gerar recomendações baseadas nos dados
  generateRecommendations(pressureTrend, ufTrend, glucoseTrend, complianceScore, symptomsRatio) {
    const recommendations = [];

    // Recomendação sobre pressão
    if (pressureTrend.average.systolic > 140 || pressureTrend.average.diastolic > 90) {
      recommendations.push({
        priority: 'high',
        title: 'Ajuste na Medicação Anti-Hipertensiva',
        description: 'A pressão arterial está consistentemente elevada. Considere aumentar a dose ou adicionar um novo anti-hipertensivo.'
      });
    }

    // Recomendação sobre UF
    if (ufTrend.average < 2000) {
      recommendations.push({
        priority: 'medium',
        title: 'Volume de Ultrafiltração Baixo',
        description: 'O volume de UF está abaixo do esperado. Verifique se há retenção hídrica ou ajuste o peso seco.'
      });
    } else if (ufTrend.average > 3500) {
      recommendations.push({
        priority: 'medium',
        title: 'Volume de Ultrafiltração Alto',
        description: 'UF elevado pode indicar excesso de ganho de peso interdialítico. Reforçar orientações sobre controle hídrico.'
      });
    }

    // Recomendação sobre glicose
    if (glucoseTrend.average > 180) {
      recommendations.push({
        priority: 'high',
        title: 'Controle Glicêmico Inadequado',
        description: 'Glicemia acima da meta. Revisar medicação hipoglicemiante e reforçar orientação nutricional.'
      });
    }

    // Recomendação sobre aderência
    if (complianceScore < 80) {
      recommendations.push({
        priority: 'high',
        title: 'Baixa Aderência ao Tratamento',
        description: 'Paciente faltando a sessões programadas. Investigar barreiras e reforçar importância da regularidade.'
      });
    }

    // Recomendação sobre sintomas
    if (symptomsRatio > 0.3) {
      recommendations.push({
        priority: 'medium',
        title: 'Sintomas Frequentes Durante Diálise',
        description: 'Paciente relatando sintomas em mais de 30% das sessões. Avaliar parâmetros da diálise e condições clínicas.'
      });
    }

    // Recomendações positivas
    if (complianceScore >= 90 && pressureTrend.status === 'Controlada') {
      recommendations.push({
        priority: 'low',
        title: 'Excelente Evolução',
        description: 'Paciente com ótima aderência e controle adequado dos parâmetros. Manter acompanhamento regular.'
      });
    }

    return recommendations;
  },

  // Calcular status geral do paciente
  calculateOverallStatus(avgScore) {
    if (avgScore >= 80) {
      return 'Paciente com excelente evolução e controle adequado dos parâmetros. Manter tratamento atual.';
    } else if (avgScore >= 60) {
      return 'Paciente com evolução satisfatória, mas alguns parâmetros necessitam atenção.';
    } else {
      return 'Paciente necessita ajustes no tratamento. Considere reavaliação clínica completa.';
    }
  }
};

// ===============================
// HELPERS GERAIS
// ===============================

const helpers = {
  // Buscar ID do médico
  async getDoctorId(userId) {
    const result = await db.query(
      'SELECT id FROM medicos WHERE usuario_id = $1',
      [userId]
    );
    return result.rows[0]?.id || null;
  },

  // Verificar acesso do médico ao paciente
  async verifyDoctorAccess(patientId, medicoId) {
    const result = await db.query(
      'SELECT id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [patientId, medicoId]
    );
    return result.rows.length > 0;
  }
};

// ===============================
// CONTROLLERS
// ===============================

// Perfil do médico
const getProfile = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.*, u.nome, u.email
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.usuario_id = $1
    `, [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    res.json({ doctor: result.rows[0] });
  } catch (error) {
    console.error('Erro ao buscar perfil do médico:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Atualizar perfil do médico
const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { crm, telefone, endereco, especialidade } = req.body;

    console.log('📝 Atualizando perfil do médico:', userId);
    console.log('📦 Dados recebidos:', req.body);

    // Verificar se o médico existe
    const doctorCheck = await db.query(
      'SELECT id FROM medicos WHERE usuario_id = $1',
      [userId]
    );

    if (doctorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Montar query de atualização dinamicamente
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (crm !== undefined) {
      updateFields.push(`crm = $${paramIndex++}`);
      updateValues.push(crm);
    }
    if (telefone !== undefined) {
      updateFields.push(`telefone = $${paramIndex++}`);
      updateValues.push(telefone);
    }
    if (endereco !== undefined) {
      updateFields.push(`endereco = $${paramIndex++}`);
      updateValues.push(endereco);
    }
    if (especialidade !== undefined) {
      updateFields.push(`especialidade = $${paramIndex++}`);
      updateValues.push(especialidade);
    }

    // Se não houver campos para atualizar
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    // Adicionar o userId como último parâmetro
    updateValues.push(userId);
    
    const query = `UPDATE medicos SET ${updateFields.join(', ')} WHERE usuario_id = $${paramIndex} RETURNING *`;
    
    console.log('🔄 Query de atualização:', query);
    console.log('🔄 Valores:', updateValues);

    await db.query(query, updateValues);

    // Buscar perfil completo atualizado
    const updatedProfile = await db.query(`
      SELECT m.*, u.nome, u.email
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.usuario_id = $1
    `, [userId]);

    console.log('✅ Perfil do médico atualizado com sucesso');

    res.json({
      message: 'Perfil atualizado com sucesso',
      doctor: updatedProfile.rows[0]
    });
  } catch (error) {
    console.error('❌ Erro ao atualizar perfil do médico:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil', details: error.message });
  }
};

// Alterar senha do médico
const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    console.log('🔐 Alterando senha para médico:', userId);

    // Validações
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres' });
    }

    // Buscar senha atual do usuário
    const user = await db.query(
      'SELECT senha_hash FROM usuarios WHERE id = $1',
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se a senha atual está correta
    const match = await bcrypt.compare(currentPassword, user.rows[0].senha_hash);
    if (!match) {
      return res.status(400).json({ error: 'Senha atual incorreta' });
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Atualizar senha
    await db.query(
      'UPDATE usuarios SET senha_hash = $1, data_atualizacao = CURRENT_TIMESTAMP WHERE id = $2',
      [hashedPassword, userId]
    );

    console.log('✅ Senha alterada com sucesso');

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
};

// Lista de pacientes vinculados
const getPatients = async (req, res) => {
  try {
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const result = await db.query(`
      SELECT 
        p.id as paciente_id,
        u.nome,
        u.email,
        p.cpf,
        p.data_nascimento,
        p.telefone,
        p.data_inicio_tratamento,
        EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade,
        (SELECT COUNT(*) FROM registros_dialise WHERE paciente_id = p.id) as total_registros,
        (SELECT MAX(data_registro) FROM registros_dialise WHERE paciente_id = p.id) as ultimo_registro,
        (SELECT COUNT(*) FROM notificacoes n 
         WHERE n.tipo = 'alerta_medico' 
         AND n.usuario_destinatario_id = $1 
         AND n.lida = false
         AND n.mensagem LIKE '%' || u.nome || '%') as alertas_nao_lidos
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $2 AND u.ativo = true
      ORDER BY u.nome
    `, [req.user.id, medico_id]);

    res.json({ patients: result.rows });
  } catch (error) {
    console.error('Erro ao buscar pacientes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Detalhes completos de um paciente
const getPatientDetails = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    console.log('=== DEBUG getPatientDetails ===');
    console.log('Patient ID:', patientId);
    console.log('User ID:', req.user.id);
    
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      console.error('Médico não encontrado para usuario_id:', req.user.id);
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    console.log('Medico ID:', medico_id);

    // Buscar dados do paciente
    const patientQuery = `
      SELECT 
        p.*,
        u.nome,
        u.email,
        EXTRACT(YEAR FROM AGE(p.data_nascimento)) as idade
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `;
    
    console.log('Executando query de paciente...');
    const patientResult = await db.query(patientQuery, [patientId, medico_id]);

    if (patientResult.rows.length === 0) {
      console.error('Paciente não encontrado ou não pertence ao médico');
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    console.log('Paciente encontrado:', patientResult.rows[0].nome);

    // Últimos 10 registros de diálise
    const dialysisQuery = `
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1  AND sintomas is null
      ORDER BY data_registro DESC, horario_inicio DESC 
      LIMIT 10
    `;
    
    console.log('Buscando registros de diálise...');
    const dialysisResult = await db.query(dialysisQuery, [patientId]);
    console.log('Registros de diálise encontrados:', dialysisResult.rows.length);

    // Medicamentos ativos
    const medicationsQuery = `
      SELECT * FROM medicamentos 
      WHERE paciente_id = $1 AND ativo = true 
      ORDER BY nome
    `;
    
    console.log('Buscando medicamentos...');
    const medicationsResult = await db.query(medicationsQuery, [patientId]);
    console.log('Medicamentos encontrados:', medicationsResult.rows.length);

    // Estatísticas do último mês
    const statsQuery = `
      SELECT 
        COUNT(*) as total_sessoes,
        AVG(pressao_arterial_sistolica) as media_sistolica,
        AVG(pressao_arterial_diastolica) as media_diastolica,
        AVG(uf_total) as media_uf,
        AVG(concentracao_glicose) as media_glicose
      FROM registros_dialise
      WHERE paciente_id = $1  AND sintomas is null
        AND data_registro >= CURRENT_DATE - INTERVAL '30 days'
    `;
    
    console.log('Buscando estatísticas...');
    const statsResult = await db.query(statsQuery, [patientId]);
    console.log('Estatísticas calculadas');

    const response = {
      patient: patientResult.rows[0],
      recentDialysis: dialysisResult.rows,
      medications: medicationsResult.rows,
      stats: statsResult.rows[0]
    };

    console.log('=== Resposta final ===');
    console.log('Patient:', response.patient.nome);
    console.log('Recent dialysis records:', response.recentDialysis.length);
    console.log('Medications:', response.medications.length);
    console.log('Stats:', response.stats);

    res.json(response);
  } catch (error) {
    console.error('=== ERRO em getPatientDetails ===');
    console.error('Erro completo:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Histórico completo de diálise de um paciente
const getPatientDialysisHistory = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;
    
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar se o paciente pertence ao médico
    const hasAccess = await helpers.verifyDoctorAccess(patientId, medico_id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    let query = `
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 AND sintomas is null
    `;
    const params = [patientId];

    if (startDate && endDate) {
      query += ` AND data_registro BETWEEN $${params.length + 1} AND $${params.length + 2}`;
      params.push(startDate, endDate);
    }

    query += ` ORDER BY data_registro DESC, horario_inicio DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({ records: result.rows });
  } catch (error) {
    console.error('Erro ao buscar histórico de diálise:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Documentos do paciente
const getPatientDocuments = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const hasAccess = await helpers.verifyDoctorAccess(patientId, medico_id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    const result = await db.query(
      'SELECT * FROM documentos WHERE paciente_id = $1  ORDER BY data_upload DESC',
      [patientId]
    );

    res.json({ documents: result.rows });
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Enviar recomendação para paciente
const sendRecommendation = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { titulo, mensagem, prioridade } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }
    
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const patientResult = await db.query(
      'SELECT usuario_id FROM pacientes WHERE id = $1 AND medico_responsavel_id = $2',
      [patientId, medico_id]
    );

    if (patientResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    // Criar notificação
    const result = await db.query(`
      INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida
      ) VALUES ($1, $2, $3, $4, false)
      RETURNING *
    `, [
      patientResult.rows[0].usuario_id,
      'recomendacao_medica',
      titulo,
      mensagem
    ]);

    res.status(201).json({
      message: 'Recomendação enviada com sucesso',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Erro ao enviar recomendação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Enviar alerta para paciente
const sendAlert = async (req, res) => {
  try {
    const { patientId } = req.params;
    
    // Aceita ambos os formatos (inglês e português)
    const {
      title, titulo,
      message, mensagem,
      priority, prioridade,
      sessionInfo
    } = req.body;
    
    const doctorId = req.user.id;

    // Usar o que vier (prioriza português)
    const alertTitle = titulo || title;
    const alertMessage = mensagem || message;
    const alertPriority = prioridade || priority;

    console.log('=== ENVIANDO ALERTA ===');
    console.log('Patient ID:', patientId);
    console.log('Doctor ID:', doctorId);
    console.log('Dados:', { alertTitle, alertMessage, alertPriority });

    // Validações
    if (!alertTitle || !alertMessage || !alertPriority) {
      return res.status(400).json({ 
        error: 'Título, mensagem e prioridade são obrigatórios' 
      });
    }

    // Buscar médico
    const doctorResult = await db.query(`
      SELECT m.id as medico_id, u.nome, u.email
      FROM medicos m
      JOIN usuarios u ON m.usuario_id = u.id
      WHERE m.usuario_id = $1
    `, [doctorId]);

    if (doctorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    const doctor = doctorResult.rows[0];
    console.log('Médico encontrado:', doctor.nome);

    // Buscar paciente e verificar acesso
    const patientResult = await db.query(`
      SELECT p.*, u.nome, u.email, u.id as usuario_id
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `, [patientId, doctor.medico_id]);

    if (patientResult.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Paciente não encontrado ou sem acesso' 
      });
    }

    const patient = patientResult.rows[0];
    console.log('Paciente encontrado:', patient.nome);

    // Criar notificação no banco de dados
    const notificationResult = await db.query(`
      INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida,
        prioridade
      ) VALUES ($1, $2, $3, $4, false, $5)
      RETURNING *
    `, [
      patient.usuario_id,
      'alerta_medico',
      alertTitle,
      alertMessage,
      alertPriority
    ]);

    console.log('✅ Notificação criada no banco:', notificationResult.rows[0].id);

    // Enviar email usando o emailService
    let emailSent = false;
    try {
      await emailService.sendAlertEmail({
        to: patient.email,
        patientName: patient.nome,
        doctorName: doctor.nome,
        title: alertTitle,
        message: alertMessage,
        priority: alertPriority,
        sessionInfo
      });

      emailSent = true;
      console.log('✅ Email enviado com sucesso para:', patient.email);
    } catch (emailError) {
      console.error('❌ Erro ao enviar email:', emailError);
    }

    res.json({ 
      success: true, 
      message: emailSent 
        ? 'Alerta enviado com sucesso! O paciente receberá um email.'
        : 'Alerta enviado com sucesso! (Email não enviado)',
      notification: notificationResult.rows[0],
      emailSent
    });

  } catch (error) {
    console.error('❌ Erro ao enviar alerta:', error);
    res.status(500).json({ 
      error: 'Erro ao enviar alerta',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Enviar alerta para paciente (com opção de email)
const sendAlertToPatient = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { 
      titulo, 
      mensagem, 
      prioridade = 'media',
      tipo_alerta = 'geral',
      enviar_email = false
    } = req.body;

    console.log('=== ENVIANDO ALERTA ===');
    console.log('Patient ID:', patientId);
    console.log('Dados:', { titulo, mensagem, prioridade, tipo_alerta, enviar_email });

    // Validações
    if (!titulo || !mensagem) {
      return res.status(400).json({ error: 'Título e mensagem são obrigatórios' });
    }

    // Buscar médico
    const medico_id = await helpers.getDoctorId(req.user.id);

    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Buscar dados do médico (para o email)
    const doctorUserResult = await db.query(
      'SELECT nome, email FROM usuarios WHERE id = $1',
      [req.user.id]
    );

    const doctorName = doctorUserResult.rows[0]?.nome || 'Seu médico';

    // Verificar acesso ao paciente e buscar dados
    const patientResult = await db.query(`
      SELECT p.usuario_id, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `, [patientId, medico_id]);

    if (patientResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    const patient = patientResult.rows[0];
    console.log('Paciente encontrado:', patient.nome);

    // Criar notificação no banco
    const notificationResult = await db.query(`
      INSERT INTO notificacoes (
        usuario_destinatario_id,
        tipo,
        titulo,
        mensagem,
        lida,
        prioridade
      ) VALUES ($1, $2, $3, $4, false, $5)
      RETURNING *
    `, [
      patient.usuario_id,
      'alerta_medico',
      titulo,
      mensagem,
      prioridade
    ]);

    console.log('Notificação criada:', notificationResult.rows[0].id);

    // Enviar email se solicitado
    let emailSent = false;
    if (enviar_email && patient.email) {
      try {
        await emailService.sendAlertEmail({
          to: patient.email,
          patientName: patient.nome,
          doctorName: doctorName,
          titulo,
          mensagem,
          prioridade,
          tipo_alerta
        });

        emailSent = true;
        console.log('Email enviado com sucesso para:', patient.email);
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        // Não falhar a requisição se o email falhar
      }
    }

    res.status(201).json({
      success: true,
      message: emailSent 
        ? 'Alerta enviado com sucesso! O paciente receberá um email.'
        : 'Alerta enviado com sucesso!',
      notification: notificationResult.rows[0],
      emailSent
    });
  } catch (error) {
    console.error('Erro ao enviar alerta:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
};

// Notificações e alertas do médico
const getNotifications = async (req, res) => {
  try {
    const { limit = 50, offset = 0, lida } = req.query;

    let query = `
      SELECT * FROM notificacoes 
      WHERE usuario_destinatario_id = $1
    `;
    const params = [req.user.id];

    if (lida !== undefined) {
      query += ` AND lida = $${params.length + 1}`;
      params.push(lida === 'true');
    }

    query += ` ORDER BY data_criacao DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);

    res.json({ notifications: result.rows });
  } catch (error) {
    console.error('Erro ao buscar notificações:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Marcar notificação como lida
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(`
      UPDATE notificacoes 
      SET lida = true, data_leitura = CURRENT_TIMESTAMP
      WHERE id = $1 AND usuario_destinatario_id = $2
      RETURNING *
    `, [id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    res.json({ notification: result.rows[0] });
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Estatísticas do dashboard
const getDashboardStats = async (req, res) => {
  try {
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Total de pacientes
    const totalPatients = await db.query(
      'SELECT COUNT(*) as total FROM pacientes WHERE medico_responsavel_id = $1',
      [medico_id]
    );

    // Alertas não lidos
    const unreadAlerts = await db.query(`
      SELECT COUNT(*) as total FROM notificacoes 
      WHERE usuario_destinatario_id = $1 
        AND tipo = 'alerta_medico' 
        AND lida = false
    `, [req.user.id]);

    // Sessões de diálise hoje
    const sessionsToday = await db.query(`
      SELECT COUNT(*) as total FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE p.medico_responsavel_id = $1  AND rd.sintomas is null
        AND rd.data_registro = CURRENT_DATE
    `, [medico_id]);

    // Pacientes com valores fora do padrão (últimos 7 dias)
    const patientsAtRisk = await db.query(`
      SELECT COUNT(DISTINCT rd.paciente_id) as total
      FROM registros_dialise rd
      JOIN pacientes p ON rd.paciente_id = p.id
      WHERE p.medico_responsavel_id = $1 AND rd.sintomas is null
        AND rd.data_registro >= CURRENT_DATE - INTERVAL '7 days'
        AND (
          rd.pressao_arterial_sistolica > 140 
          OR rd.pressao_arterial_sistolica < 90
          OR rd.pressao_arterial_diastolica > 90
          OR rd.pressao_arterial_diastolica < 60
          OR rd.concentracao_glicose > 200
        )
    `, [medico_id]);

    res.json({
      totalPatients: Number.parseInt(totalPatients.rows[0].total),
      unreadAlerts: Number.parseInt(unreadAlerts.rows[0].total),
      sessionsToday: Number.parseInt(sessionsToday.rows[0].total),
      patientsAtRisk: Number.parseInt(patientsAtRisk.rows[0].total)
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas do dashboard:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Relatório individual de paciente
const getPatientReport = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { startDate, endDate } = req.query;

    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Verificar acesso
    const patientResult = await db.query(`
      SELECT p.*, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.id = $1 AND p.medico_responsavel_id = $2
    `, [patientId, medico_id]);

    if (patientResult.rows.length === 0) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    // Registros de diálise no período
    const dialysisRecords = await db.query(`
      SELECT * FROM registros_dialise 
      WHERE paciente_id = $1 AND sintomas is null
        AND data_registro BETWEEN $2 AND $3
      ORDER BY data_registro DESC
    `, [patientId, startDate, endDate]);

    // Estatísticas do período
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_sessoes,
        AVG(pressao_arterial_sistolica) as media_sistolica,
        AVG(pressao_arterial_diastolica) as media_diastolica,
        AVG(uf_total) as media_uf,
        AVG(concentracao_glicose) as media_glicose,
        COUNT(CASE WHEN sintomas IS NOT NULL AND sintomas != '' THEN 1 END) as sessoes_com_sintomas
      FROM registros_dialise
      WHERE paciente_id = $1 
        AND sintomas is null
        AND data_registro BETWEEN $2 AND $3
    `, [patientId, startDate, endDate]);

    // Medicamentos
    const medications = await db.query(
      'SELECT * FROM medicamentos WHERE paciente_id = $1 AND ativo = true',
      [patientId]
    );

    res.json({
      patient: patientResult.rows[0],
      period: { startDate, endDate },
      statistics: {
        totalSessions: Number.parseInt(stats.rows[0].total_sessoes) || 0,
        averageSystolic: stats.rows[0].media_sistolica ? Math.round(stats.rows[0].media_sistolica) : null,
        averageDiastolic: stats.rows[0].media_diastolica ? Math.round(stats.rows[0].media_diastolica) : null,
        averageUF: stats.rows[0].media_uf ? (stats.rows[0].media_uf / 1000).toFixed(1) : null,
        averageGlucose: stats.rows[0].media_glicose ? Math.round(stats.rows[0].media_glicose) : null,
        sessionsWithSymptoms: Number.parseInt(stats.rows[0].sessoes_com_sintomas) || 0
      },
      dialysisRecords: dialysisRecords.rows,
      medications: medications.rows,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar relatório do paciente:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// ===============================
// Analytics estratégicos do paciente (SIMPLIFICADO)
// ===============================
const getPatientAnalytics = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { days = 30 } = req.query;
    
    console.log('=== GERANDO ANALYTICS ===');
    console.log('Patient ID:', patientId);
    console.log('Período:', days, 'dias');
    
    // Verificar acesso do médico ao paciente
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }
    
    // Verificar se o paciente pertence ao médico
    const hasAccess = await helpers.verifyDoctorAccess(patientId, medico_id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Acesso negado a este paciente' });
    }

    // Data de início baseada no período
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number.parseInt(days));

    // Buscar todos os dados necessários
    const [
      pressureData,
      ufData,
      glucoseData,
      sessionFrequency,
      symptomsData
    ] = await Promise.all([
      analyticsHelpers.fetchPressureData(patientId, startDate),
      analyticsHelpers.fetchUFData(patientId, startDate),
      analyticsHelpers.fetchGlucoseData(patientId, startDate),
      analyticsHelpers.fetchSessionFrequency(patientId, startDate),
      analyticsHelpers.fetchSymptomsDistribution(patientId, startDate)
    ]);

    // Calcular métricas
    const totalSessions = Number.parseInt(sessionFrequency.total);
    const sessionsWithSymptoms = Number.parseInt(sessionFrequency.with_symptoms);
    const expectedSessions = Math.floor(Number.parseInt(days) / 7) * 3;
    const complianceScore = Math.min(100, (totalSessions / expectedSessions) * 100);
    const symptomsScore = Math.max(0, 100 - (sessionsWithSymptoms / totalSessions * 100));
    const symptomsRatio = sessionsWithSymptoms / totalSessions;

    // Analisar tendências
    const pressureTrend = analyticsHelpers.analyzePressureTrend(pressureData);
    const ufTrend = analyticsHelpers.analyzeUFTrend(ufData);
    const glucoseTrend = analyticsHelpers.analyzeGlucoseTrend(glucoseData);

    // Processar sintomas
    const symptomsDistribution = analyticsHelpers.processSymptomsDistribution(
      symptomsData,
      totalSessions,
      sessionsWithSymptoms
    );

    // Gerar recomendações
    const recommendations = analyticsHelpers.generateRecommendations(
      pressureTrend,
      ufTrend,
      glucoseTrend,
      complianceScore,
      symptomsRatio
    );

    // Calcular score geral
    const avgScore = (
      complianceScore + 
      pressureTrend.score + 
      ufTrend.score + 
      glucoseTrend.score + 
      symptomsScore
    ) / 5;

    const overallStatus = analyticsHelpers.calculateOverallStatus(avgScore);

    // Montar resposta
    const analyticsData = {
      pressureData,
      ufData,
      glucoseData,
      sessionFrequency: {
        total: totalSessions,
        expected: expectedSessions,
        lastWeek: Number.parseInt(sessionFrequency.last_week),
        withSymptoms: sessionsWithSymptoms
      },
      symptomsDistribution,
      complianceScore: Number.parseInt(complianceScore),
      trends: {
        pressure: pressureTrend,
        uf: ufTrend,
        glucose: glucoseTrend,
        symptoms: {
          total: sessionsWithSymptoms,
          percentage: (symptomsRatio * 100).toFixed(1),
          score: Math.round(symptomsScore)
        }
      },
      predictions: {
        overallStatus,
        recommendations
      }
    };

    console.log('✅ Analytics gerados com sucesso');
    
    res.json(analyticsData);
    
  } catch (error) {
    console.error('❌ Erro ao gerar analytics:', error);
    res.status(500).json({ 
      error: 'Erro ao gerar análises',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Relatório geral de todos os pacientes
const getGeneralReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const medico_id = await helpers.getDoctorId(req.user.id);
    
    if (!medico_id) {
      return res.status(404).json({ error: 'Médico não encontrado' });
    }

    // Lista de pacientes
    const patients = await db.query(`
      SELECT p.id, u.nome, u.email
      FROM pacientes p
      JOIN usuarios u ON p.usuario_id = u.id
      WHERE p.medico_responsavel_id = $1
      ORDER BY u.nome
    `, [medico_id]);

    // Estatísticas gerais
    const generalStats = {
      totalPatients: patients.rows.length,
      totalSessions: 0,
      totalAlerts: 0,
      averageSessionsPerPatient: 0
    };

    const patientReports = [];

    for (const patient of patients.rows) {
      // Sessões do paciente no período
      const sessions = await db.query(`
        SELECT 
          COUNT(*) as count, 
          AVG(uf_total) as avg_uf,
          AVG(pressao_arterial_sistolica) as avg_systolic,
          AVG(pressao_arterial_diastolica) as avg_diastolic
        FROM registros_dialise 
        WHERE paciente_id = $1  AND sintomas is null
          AND data_registro BETWEEN $2 AND $3
      `, [patient.id, startDate, endDate]);

      // Alertas do paciente no período
      const alerts = await db.query(`
        SELECT COUNT(*) as count
        FROM registros_dialise
        WHERE paciente_id = $1  AND sintomas is null
          AND data_registro BETWEEN $2 AND $3
          AND (
            pressao_arterial_sistolica > 140 
            OR pressao_arterial_sistolica < 90
            OR pressao_arterial_diastolica > 90
            OR pressao_arterial_diastolica < 60
          )
      `, [patient.id, startDate, endDate]);

      const sessionCount = Number.parseInt(sessions.rows[0].count) || 0;
      const alertCount = Number.parseInt(alerts.rows[0].count) || 0;

      generalStats.totalSessions += sessionCount;
      generalStats.totalAlerts += alertCount;

      patientReports.push({
        patient: {
          id: patient.id,
          nome: patient.nome,
          email: patient.email
        },
        sessionsInPeriod: sessionCount,
        averageUF: sessions.rows[0].avg_uf ? (sessions.rows[0].avg_uf / 1000).toFixed(1) : null,
        averageSystolic: sessions.rows[0].avg_systolic ? Math.round(sessions.rows[0].avg_systolic) : null,
        averageDiastolic: sessions.rows[0].avg_diastolic ? Math.round(sessions.rows[0].avg_diastolic) : null,
        alertsInPeriod: alertCount
      });
    }

    generalStats.averageSessionsPerPatient = generalStats.totalPatients > 0
      ? Math.round(generalStats.totalSessions / generalStats.totalPatients)
      : 0;

    res.json({
      period: { startDate, endDate },
      statistics: generalStats,
      patientReports,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Erro ao gerar relatório geral:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  getPatients,
  getPatientDetails,
  getPatientDialysisHistory,
  getPatientDocuments,
  sendRecommendation,
  sendAlert,
  sendAlertToPatient,
  getNotifications,
  markNotificationAsRead,
  getDashboardStats,
  getPatientReport,
  getGeneralReport,
  getPatientAnalytics
};