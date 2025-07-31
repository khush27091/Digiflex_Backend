const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'digiflex_db',
  password: 'postgres', // <-- match the one you just set
  port: 5432,
});

module.exports = pool;
