// index.js - Główny plik serwera Express.
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config();
const authRouter = require('./auth'); // Import routera autoryzacji
const { cyclicUpdate } = require('./auth'); // Import funkcji cyklicznej aktualizacji

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const app = express();
const port = process.env.PORT || 10000;

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Test Połączenia z Bazą Danych ---
pool.connect()
    .then(client => {
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${new Date(client.serverVersion).toUTCString()}`);
        client.release();
    })
    .catch(err => {
        console.error('Błąd połączenia z PostgreSQL:', err.message);
    });

// --- ROUTING ---
// Wszystkie ścieżki /api/* są obsługiwane przez authRouter
app.use('/api', authRouter);

// --- Cykliczne Uruchamianie Aktualizacji ---
// Funkcja przeniesiona do auth.js
const CYCLE_INTERVAL_MS = 10 * 60 * 1000; // 10 minut
setInterval(cyclicUpdate, CYCLE_INTERVAL_MS);


// --- Uruchomienie Serwera ---
app.listen(port, () => {
    console.log(`Serwer działa na porcie ${port}`);
    console.log(`Otwórz: http://localhost:${port}`);
    // Uruchomienie aktualizacji natychmiast po starcie
    cyclicUpdate();
});
