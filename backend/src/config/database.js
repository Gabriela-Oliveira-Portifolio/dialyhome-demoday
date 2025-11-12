const { Pool } = require('pg');
require('dotenv').config();

// Railway fornece uma única variável: DATABASE_URL
const connectionString = process.env.DATABASE_URL;

// Caso não esteja na Railway, usa as variáveis locais
const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false, // necessário para Railway
      },
    })
  : new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'dialyhome',
      password: process.env.DB_PASSWORD || 'admin',
      port: process.env.DB_PORT || 5432,
      ssl: false
    });



module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};


// const { Pool } = require('pg');
// require('dotenv').config();

// // Determinar qual banco usar baseado no ambiente
// const isTest = process.env.NODE_ENV === 'test';
// const dbName = isTest ? 'dialyhome_test' : (process.env.DB_NAME || 'dialyhome');

// const pool = new Pool({
//   user: process.env.DB_USER || 'postgres',
//   host: process.env.DB_HOST || 'localhost',
//   database: dbName,
//   password: process.env.DB_PASSWORD || 'admin',
//   port: process.env.DB_PORT || 5432,
// });

// // Log para confirmar qual banco está sendo usado
// if (isTest) {
//   console.log(`🧪 Usando banco de TESTE: ${dbName}`);
// } else {
//   console.log(`🚀 Usando banco: ${dbName}`);
// }

// module.exports = {
//   query: (text, params) => pool.query(text, params),
//   pool
// };



















// // const { Pool } = require('pg');
// // require('dotenv').config();

// // const pool = new Pool({
// //   user: process.env.DB_USER,
// //   host: process.env.DB_HOST,
// //   database: process.env.DB_NAME,
// //   password: process.env.DB_PASSWORD,
// //   port: process.env.DB_PORT,
// // });

// // module.exports = {
// //   query: (text, params) => pool.query(text, params),
// //   pool
// // };