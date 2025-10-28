// backend/db.js
const { Pool } = require('pg');
require('dotenv').config();

// Utworzenie puli połączeń na podstawie zmiennych z pliku .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Prosty test połączenia przy starcie
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Błąd połączenia z bazą danych', err.stack);
  }
  client.query('SELECT NOW()', (err, result) => {
    release();
    if (err) {
      return console.error('Błąd zapytania testowego', err.stack);
    }
    console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${result.rows[0].now}`);
  });
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};