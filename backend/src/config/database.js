const { Pool } = require('pg');
require('dotenv').config();

// Usar CONNECTION_STRING se disponível, senão usar variáveis individuais
const pool = process.env.CONNECTION_STRING
  ? new Pool({
      connectionString: process.env.CONNECTION_STRING,
      ssl: false
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 5432,
      ssl: false
    });

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};