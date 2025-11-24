const db = require('../src/config/database');

class AuditLogger {
  static async log(userId, table, operation, oldData = null, newData = null, req = null) {
    try {
      const ipAddress = req ? req.ip || req.connection.remoteAddress : null;
      const userAgent = req ? req.get('User-Agent') : null;

      await db.query(
        `INSERT INTO logs_auditoria (usuario_id, tabela_afetada, operacao, dados_anteriores, dados_novos, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          table,
          operation,
          oldData ? JSON.stringify(oldData) : null,
          newData ? JSON.stringify(newData) : null,
          ipAddress,
          userAgent
        ]
      );
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
    }
  }

  static async logLogin(userId, req, success = true) {
    const operation = success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED';
    await this.log(userId, 'usuarios', operation, null, { success }, req);
  }

  static async logDataAccess(userId, table, recordId, req) {
    await this.log(userId, table, 'READ', null, { recordId }, req);
  }

  static async logDataModification(userId, table, operation, oldData, newData, req) {
    await this.log(userId, table, operation, oldData, newData, req);
  }
}

module.exports = AuditLogger;