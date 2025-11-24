const db = require('../config/database');

const severityToValue = {
    'leve': 1,
    'moderado': 2,
    'grave': 3
};

const symptomsController = {
  // Buscar sintomas pré-definidos - cadastrei os sintomas direto pelo banco
  getPredefinedSymptoms: async (req, res) => {
    try {
      const result = await db.query(
        `SELECT 
          id,
          nome,
          categoria,
          severidade_padrao
        FROM sintomas_predefinidos
        ORDER BY categoria, nome`
      );

      // Agrupar por categoria
      const grouped = result.rows.reduce((acc, symptom) => {
        const categoria = symptom.categoria || 'Outros';
        if (!acc[categoria]) {
          acc[categoria] = [];
        }
        acc[categoria].push(symptom);
        return acc;
      }, {});

      res.json({ 
        symptoms: result.rows,
        grouped: grouped
      });
    } catch (error) {
      console.error('Erro ao buscar sintomas:', error);
      res.status(500).json({ error: 'Erro ao buscar sintomas' });
    }
  },

  // Registrar sintomas com vínculo a registro de diálise
  registerSymptoms: async (req, res) => {
    try {
      const userId = req.user.id;
      const { registro_dialise_id, sintomas } = req.body;

      // Verifica se os dados obrigatórios foram enviados
      if (!registro_dialise_id || !sintomas || sintomas.length === 0) {
        return res.status(400).json({
          error: 'ID do registro de diálise e sintomas são obrigatórios'
        });
      }

      // Busca paciente
      const pacienteResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      // Caso paciente não encontrado
      if (!pacienteResult || pacienteResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = pacienteResult.rows[0].id;

      // Verifica se o registro de diálise pertence ao paciente
      const registroResult = await db.query(
        'SELECT id FROM registros_dialise WHERE id = $1 AND paciente_id = $2',
        [registro_dialise_id, pacienteId]
      );

      // Caso registro não pertença ao paciente
      if (!registroResult || registroResult.rows.length === 0) {
        return res
          .status(404)
          .json({ error: 'Registro de diálise não encontrado ou não pertence ao paciente' });
      }

      // Remove sintomas anteriores
      await db.query(
        'DELETE FROM registro_sintomas WHERE registro_dialise_id = $1',
        [registro_dialise_id]
      );

      // Insere novos sintomas
      const insertedSymptoms = [];

      for (const sintoma of sintomas) {
        const result = await db.query(
          `INSERT INTO registro_sintomas (
            registro_dialise_id,
            sintoma_id,
            severidade,
            observacoes
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [
            registro_dialise_id,
            sintoma.sintoma_id,
            sintoma.severidade || 'leve',
            sintoma.observacoes || null
          ]
        );

        insertedSymptoms.push(result.rows[0]);
      }

      return res.status(201).json({
        message: 'Sintomas registrados com sucesso',
        symptoms: insertedSymptoms
      });
    } catch (error) {
      console.error('Erro ao registrar sintomas:', error);
      return res.status(500).json({ error: 'Erro ao registrar sintomas' });
    }
  },

  // Registrar sintoma sem vínculo com registro de diálise (sintoma isolado)
  registerIsolatedSymptom: async (req, res) => {
    try {
      const userId = req.user.id;
      const { sintomas } = req.body;

      if (!sintomas || sintomas.length === 0) {
        return res.status(400).json({ error: 'Sintomas são obrigatórios' });
      }

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      // Criar um registro de diálise "sintoma isolado" apenas com sintomas -- isso declinou, agora tudo ue isso gera eu ignoro
      const dialysisRecord = await db.query(
        `INSERT INTO registros_dialise (
          paciente_id,
          data_registro,
          sintomas
        ) VALUES ($1, CURRENT_DATE, $2)
        RETURNING id`,
        [pacienteId, 'Registro de sintomas']
      );

      const registroDialiseId = dialysisRecord.rows[0].id;

      // Inserir sintomas
      const insertedSymptoms = [];
      for (const sintoma of sintomas) {
        const result = await db.query(
          `INSERT INTO registro_sintomas (
            registro_dialise_id,
            sintoma_id,
            severidade,
            observacoes
          ) VALUES ($1, $2, $3, $4)
          RETURNING *`,
          [
            registroDialiseId,
            sintoma.sintoma_id,
            sintoma.severidade || 'leve',
            sintoma.observacoes || null
          ]
        );
        insertedSymptoms.push(result.rows[0]);
      }

      res.status(201).json({
        message: 'Sintomas registrados com sucesso',
        registro_id: registroDialiseId,
        symptoms: insertedSymptoms
      });
    } catch (error) {
      console.error('Erro ao registrar sintoma isolado:', error);
      res.status(500).json({ error: 'Erro ao registrar sintoma isolado' });
    }
  },

  // Buscar sintomas de um registro específico (Usado por Paciente)
  getSymptomsByRecord: async (req, res) => {
    try {
      const userId = req.user.id;
      const registroId = req.params.registroId;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      const result = await db.query(
        `SELECT 
          rs.id,
          rs.severidade,
          rs.observacoes,
          sp.nome as sintoma_nome,
          sp.categoria,
          sp.severidade_padrao
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.id = $1 AND rd.paciente_id = $2`,
        [registroId, pacienteId]
      );

      res.json({ symptoms: result.rows });
    } catch (error) {
      console.error('Erro ao buscar sintomas do registro:', error);
      res.status(500).json({ error: 'Erro ao buscar sintomas' });
    }
  },

  //hisorico de sintomas
  getDoctorSymptomsHistory: async (req, res) => {
    try {
      const patientId = req.params.patientId; // ID do paciente
      const days = Number.parseInt(req.query.days || 30); // Dias de filtro


      if (!patientId) {
        return res.status(400).json({ error: 'ID do paciente é obrigatório' });
      }

      const result = await db.query(
        `SELECT 
          rd.data_registro,
          rs.severidade,
          sp.nome as sintoma_nome
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.paciente_id = $1
          AND rd.data_registro >= NOW() - INTERVAL '1 day' * $2
        ORDER BY rd.data_registro DESC`,
        [patientId, days]
      );

      if (result.rows.length === 0) {
        // Retornar 200 com array vazio se não houver dados
        return res.json([]); 
      }

      res.json(result.rows);
    } catch (error) {
      console.error('Erro ao buscar histórico de sintomas para Doutor:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  },

  // Função original de histórico de sintomas (Usado por Paciente)
  getSymptomsHistory: async (req, res) => {
    try {
      const userId = req.user.id;
      const { limit = 20, offset = 0 } = req.query;

      // Buscar paciente_id
      const patientResult = await db.query(
        'SELECT id FROM pacientes WHERE usuario_id = $1',
        [userId]
      );

      if (patientResult.rows.length === 0) {
        return res.status(404).json({ error: 'Paciente não encontrado' });
      }

      const pacienteId = patientResult.rows[0].id;

      const result = await db.query(
        `SELECT 
          rd.id as registro_id,
          rd.data_registro,
          rs.id as sintoma_registro_id,
          rs.severidade,
          rs.observacoes,
          sp.nome as sintoma_nome,
          sp.categoria
        FROM registro_sintomas rs
        JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
        JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
        WHERE rd.paciente_id = $1
        ORDER BY rd.data_registro DESC, rs.id DESC
        LIMIT $2 OFFSET $3`,
        [pacienteId, limit, offset]
      );

      res.json({ 
        symptoms: result.rows,
        total: result.rows.length
      });
    } catch (error) {
      console.error('Erro ao buscar histórico de sintomas:', error);
      res.status(500).json({ error: 'Erro ao buscar histórico' });
    }
  },

  getSymptomsDailyTrend: async (req, res) => {
        try {
            const patientId = req.params.patientId || req.user.paciente_id;
            const days = Number.parseInt(req.query.days || 30); 

            if (!patientId) {
                return res.status(400).json({ error: 'ID do paciente é obrigatório' });
            }

            // Busca os sintomas dos últimos dias
            const result = await db.query(
                `SELECT 
                    TO_CHAR(rd.data_registro, 'YYYY-MM-DD') as data_formatada,
                    rs.severidade,
                    sp.nome as sintoma_nome
                FROM registro_sintomas rs
                JOIN sintomas_predefinidos sp ON rs.sintoma_id = sp.id
                JOIN registros_dialise rd ON rs.registro_dialise_id = rd.id
                WHERE rd.paciente_id = $1
                  AND rd.data_registro >= NOW() - INTERVAL '1 day' * $2
                ORDER BY data_formatada ASC`,
                [patientId, days]
            );

            const dailyData = result.rows.reduce((acc, row) => {
                const date = row.data_formatada;

                if (!acc[date]) {
                    acc[date] = { 
                        symptomsCount: 0, 
                        totalSeverity: 0,
                        rawSeverities: []
                    };
                }

                acc[date].symptomsCount += 1;
                acc[date].totalSeverity += severityToValue[row.severidade] || 0;
                acc[date].rawSeverities.push(severityToValue[row.severidade] || 0);

                return acc;
            }, {});

            // Formatação para o Gráfico
            const formattedData = Object.keys(dailyData).map(date => {
                const data = dailyData[date];
                const avgSeverity = data.symptomsCount > 0 
                    ? (data.totalSeverity / data.symptomsCount) 
                    : 0;

                // Encontra a severidade máxima para a data
                const maxSeverityValue = data.rawSeverities.length > 0 
                    ? Math.max(...data.rawSeverities) 
                    : 0;
                
                // Converte o valor numérico de volta para a string para rótulos
                const maxSeverityLabel = Object.keys(severityToValue).find(
                    key => severityToValue[key] === maxSeverityValue
                ) || 'N/A';
                
                return {
                    date: date, // 'YYYY-MM-DD'
                    frequency: data.symptomsCount, // Número total de sintomas registrados no dia
                    averageSeverity: Number.parseFloat(avgSeverity.toFixed(2)), // Média da severidade
                    maxSeverity: maxSeverityValue, // O valor numérico máximo
                    maxSeverityLabel: maxSeverityLabel // O rótulo da severidade máxima
                };
            });
            
            // Preenche as datas que faltam com dados vazios 0
            const filledData = fillMissingDates(formattedData, days);


            res.json(filledData);

        } catch (error) {
            console.error('Erro ao buscar dados de tendência de sintomas:', error);
            res.status(500).json({ error: 'Erro ao buscar dados de tendência' });
        }
    },
    
    // Funções auxiliares dos sintomas
    fillMissingDates: (data, days) => {
        const currentDate = new Date();
        const filledData = {};

        for (let i = 0; i < days; i++) {
            const date = new Date(currentDate);
            date.setDate(currentDate.getDate() - i);
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD

            filledData[formattedDate] = {
                date: formattedDate,
                frequency: 0,
                averageSeverity: 0,
                maxSeverity: 0,
                maxSeverityLabel: 'N/A'
            };
        }

        for (const item of data) {
              if (filledData[item.date]) {
                  filledData[item.date] = item;
              }
          }


        // Ordenar por data
        return Object.values(filledData).sort((a, b) => new Date(a.date) - new Date(b.date));
    }
};

module.exports = symptomsController;