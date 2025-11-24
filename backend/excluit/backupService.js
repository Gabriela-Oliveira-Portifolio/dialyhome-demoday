const { exec } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const cron = require('node-cron');
require('dotenv').config();

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.ensureBackupDirectory();
    this.scheduleBackups();
  }

  ensureBackupDirectory() {
    try {
      if (!fs.existsSync(this.backupDir)) {
        fs.mkdirSync(this.backupDir, { recursive: true });
      }
    } catch (error) {
      console.error('Erro ao criar diretório de backups:', error);
      throw error;
    }
  }

  async createDatabaseBackup() {
    // Sonar: replace → replaceAll
    const timestamp = new Date()
      .toISOString()
      .replaceAll(':', '-')
      .replaceAll('.', '-');

    const filename = `dialyhome_backup_${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const command = `pg_dump "${process.env.DATABASE_URL}" > "${filepath}"`;

    return new Promise((resolve, reject) => {
      exec(command, (error) => {
        if (error) {
          console.error('Erro no backup:', error);
          return reject(error);
        }

        console.log(`Backup criado: ${filename}`);
        resolve(filepath);
      });
    });
  }

  async cleanOldBackups(daysToKeep = 7) {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();
      const maxAge = daysToKeep * 24 * 60 * 60 * 1000;

      files.forEach((file) => {
        if (file.startsWith('dialyhome_backup_')) {
          const filepath = path.join(this.backupDir, file);
          const stats = fs.statSync(filepath);

          if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filepath);
            console.log(`Backup antigo removido: ${file}`);
          }
        }
      });
    } catch (error) {
      console.error('Erro ao limpar backups antigos:', error);
      throw error; // Sonar: não engolir exceções
    }
  }

  scheduleBackups() {
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Iniciando backup automático...');
        await this.createDatabaseBackup();
        await this.cleanOldBackups(7);
        console.log('Backup automático concluído');
      } catch (error) {
        console.error('Erro no backup automático:', error);
      }
    });

    console.log('Backup automático agendado para 2:00 AM diariamente');
  }

  async manualBackup() {
    try {
      const filepath = await this.createDatabaseBackup();
      return { success: true, filepath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = BackupService;
