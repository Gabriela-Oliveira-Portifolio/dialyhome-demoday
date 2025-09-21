const db = require('../config/database');
const multer = require('multer');
const path = require('path');

// Configuração do multer para upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Tipo de arquivo não permitido'));
    }
  }
});

const uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const { tipo_documento, observacoes } = req.body;
    
    const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const result = await db.query(
      `INSERT INTO documentos (paciente_id, nome_arquivo, tipo_documento, caminho_arquivo, tamanho_arquivo, observacoes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        patientResult.rows[0].id,
        req.file.originalname,
        tipo_documento,
        req.file.path,
        req.file.size,
        observacoes
      ]
    );

    res.status(201).json({ 
      message: 'Documento enviado com sucesso', 
      id: result.rows[0].id 
    });
  } catch (error) {
    console.error('Erro no upload:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const getDocuments = async (req, res) => {
  try {
    const patientResult = await db.query('SELECT id FROM pacientes WHERE usuario_id = $1', [req.user.id]);
    if (patientResult.rows.length === 0) {
      return res.status(404).json({ error: 'Paciente não encontrado' });
    }

    const result = await db.query(
      'SELECT id, nome_arquivo, tipo_documento, tamanho_arquivo, data_upload, observacoes FROM documentos WHERE paciente_id = $1 ORDER BY data_upload DESC',
      [patientResult.rows[0].id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Erro ao buscar documentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = { upload, uploadDocument, getDocuments };