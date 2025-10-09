// models/registroDialise.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Paciente = require('./paciente');

const RegistroDialise = sequelize.define('RegistroDialise', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paciente_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'pacientes',
      key: 'id'
    }
  },
  data_registro: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  horario_inicio: {
    type: DataTypes.TIME,
    allowNull: true
  },
  horario_fim: {
    type: DataTypes.TIME,
    allowNull: true
  },
  // Parâmetros vitais
  pressao_arterial_sistolica: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  pressao_arterial_diastolica: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  peso_pre_dialise: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  peso_pos_dialise: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true
  },
  // Parâmetros da diálise
  drenagem_inicial: {
    type: DataTypes.INTEGER, // em mL
    allowNull: true
  },
  uf_total: {
    type: DataTypes.INTEGER, // em mL
    allowNull: true
  },
  tempo_permanencia: {
    type: DataTypes.INTEGER, // em minutos
    allowNull: true
  },
  concentracao_glicose: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  concentracao_dextrose: {
    type: DataTypes.DECIMAL(4, 2),
    allowNull: true
  },
  // Observações e sintomas
  sintomas: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  observacoes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  data_criacao: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'registros_dialise',
  timestamps: false
});

// Relacionamento
RegistroDialise.belongsTo(Paciente, {
  foreignKey: 'paciente_id',
  as: 'paciente'
});

module.exports = RegistroDialise;