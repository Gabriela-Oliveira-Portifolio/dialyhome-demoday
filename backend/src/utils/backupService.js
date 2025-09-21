const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

class BackupService {
  constructor() {
    this.backupDir = process.env.BACKUP_DIR || './backups';
    this.ensureBackupDirectory();
    this.scheduleBackups();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  async createDatabaseBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dialyhome_backup_${timestamp}.sql`;
    const filepath = path.join(this.backupDir, filename);

    const command = `pg_dump ${process.env.DATABASE_URL} > ${filepath}`;

    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('Erro no backup:', error);
          reject(error);
        } else {
          console.log(`Backup criado: ${filename}`);
          resolve(filepath);
        }
      });
    });
  }

  async cleanOldBackups(daysToKeep = 7) {
    const files = fs.readdirSync(this.backupDir);
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000; // dias em milliseconds

    files.forEach(file => {
      if (file.startsWith('dialyhome_backup_')) {
        const filepath = path.join(this.backupDir, file);
        const stats = fs.statSync(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          fs.unlinkSync(filepath);
          console.log(`Backup antigo removido: ${file}`);
        }
      }
    });
  }

  scheduleBackups() {
    // Backup diário às 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        console.log('Iniciando backup automático...');
        await this.createDatabaseBackup();
        await this.cleanOldBackups(7); // manter backups dos últimos 7 dias
        console.log('Backup automático concluído');
      } catch (error) {
        console.error('Erro no backup automático:', error);
      }
    });

    console.log('Backup automático agendado para 2:00 AM diariamente');
  }

  // Método para backup manual
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