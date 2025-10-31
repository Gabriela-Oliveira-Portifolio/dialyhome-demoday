// services/alertaMedicoService.js
// Service com a lógica de negócio para alertas médicos

const alertaMedicoModel = require('../models/alertaMedicoModel');
const usuarioModel = require('../models/usuarioModel');
const medicoModel = require('../models/medicoModel');
const emailService = require('./emailService');
const notificacaoService = require('./notificacaoService');

class AlertaMedicoService {
  /**
   * Processa o envio de um alerta por email
   */
  async enviarAlertaPorEmail({ medico_id, paciente_id, mensagem, email }) {
    try {
      // 1. Buscar informações do médico
      const medico = await medicoModel.buscarPorId(medico_id);
      if (!medico) {
        throw new Error('Médico não encontrado');
      }

      // 2. Buscar informações do paciente
      const paciente = await usuarioModel.buscarPorId(paciente_id);
      if (!paciente) {
        throw new Error('Paciente não encontrado');
      }

      // 3. Verificar se o médico tem permissão para acessar este paciente
      const temPermissao = await this.verificarPermissaoMedicoPaciente(medico_id, paciente_id);
      if (!temPermissao) {
        throw new Error('Médico não tem permissão para acessar este paciente');
      }

      // 4. Sanitizar a mensagem
      const mensagemSanitizada = this.sanitizarMensagem(mensagem);

      // 5. Registrar o alerta no banco de dados
      const alerta = await alertaMedicoModel.criar({
        medico_id,
        paciente_id,
        mensagem: mensagemSanitizada,
        enviado_por_email: true
      });

      // 6. Enviar o email
      try {
        await emailService.enviarEmailAlerta({
          destinatario: email,
          nomePaciente: paciente.nome,
          nomeMedico: medico.nome,
          especialidade: medico.especialidade,
          crm: medico.crm,
          mensagem: mensagemSanitizada,
          alertaId: alerta.id
        });

        // Atualizar status de envio
        await alertaMedicoModel.atualizarStatusEnvio(alerta.id, true);

      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
        await alertaMedicoModel.atualizarStatusEnvio(alerta.id, false);
        throw new Error('Email não pôde ser enviado: ' + emailError.message);
      }

      // 7. Criar notificação no sistema para o paciente
      await notificacaoService.criar({
        usuario_id: paciente_id,
        tipo: 'alerta_medico',
        titulo: 'Novo alerta do seu médico',
        mensagem: `Dr(a). ${medico.nome}: ${mensagemSanitizada.substring(0, 100)}...`,
        referencia_id: alerta.id,
        referencia_tipo: 'alerta_medico'
      });

      return {
        id: alerta.id,
        mensagem: 'Alerta enviado com sucesso',
        email_enviado: true,
        data_envio: alerta.data_envio
      };

    } catch (error) {
      console.error('Erro no service ao enviar alerta:', error);
      throw error;
    }
  }

  /**
   * Verifica se o médico tem permissão para acessar o paciente
   */
  async verificarPermissaoMedicoPaciente(medico_id, paciente_id) {
    try {
      // Verifica na tabela de relacionamento médico-paciente
      const relacao = await medicoModel.verificarRelacaoComPaciente(medico_id, paciente_id);
      return relacao !== null;
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Sanitiza a mensagem para prevenir XSS
   */
  sanitizarMensagem(mensagem) {
    if (!mensagem) return '';
    
    return mensagem
      .trim()
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Lista alertas enviados por um médico
   */
  async listarAlertasPorMedico({ medico_id, limite = 20, pagina = 1, paciente_id }) {
    try {
      const offset = (pagina - 1) * limite;

      const filtros = {
        medico_id,
        limite,
        offset,
        paciente_id
      };

      const alertas = await alertaMedicoModel.listarPorMedico(filtros);
      const total = await alertaMedicoModel.contarPorMedico(filtros);

      return {
        alertas,
        paginacao: {
          pagina_atual: pagina,
          total_paginas: Math.ceil(total / limite),
          total_registros: total,
          registros_por_pagina: limite
        }
      };

    } catch (error) {
      console.error('Erro ao listar alertas:', error);
      throw error;
    }
  }

  /**
   * Busca um alerta específico
   */
  async buscarAlertaPorId(alerta_id, medico_id) {
    try {
      const alerta = await alertaMedicoModel.buscarPorId(alerta_id);
      
      if (!alerta) {
        return null;
      }

      // Verificar se o alerta pertence ao médico
      if (alerta.medico_id !== medico_id) {
        throw new Error('Médico não tem permissão para acessar este alerta');
      }

      return alerta;

    } catch (error) {
      console.error('Erro ao buscar alerta:', error);
      throw error;
    }
  }

  /**
   * Marca um alerta como lido
   */
  async marcarComoLido(alerta_id) {
    try {
      await alertaMedicoModel.marcarComoLido(alerta_id);
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de alertas
   */
  async obterEstatisticas({ medico_id, data_inicio, data_fim }) {
    try {
      const stats = await alertaMedicoModel.obterEstatisticas({
        medico_id,
        data_inicio,
        data_fim
      });

      return {
        total_alertas_enviados: stats.total || 0,
        alertas_lidos: stats.lidos || 0,
        alertas_nao_lidos: stats.nao_lidos || 0,
        taxa_leitura: stats.total > 0 
          ? ((stats.lidos / stats.total) * 100).toFixed(2) + '%'
          : '0%',
        emails_enviados_sucesso: stats.emails_sucesso || 0,
        emails_com_erro: stats.emails_erro || 0
      };

    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      throw error;
    }
  }
}

module.exports = new AlertaMedicoService();