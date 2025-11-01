// Główny Plik Serwera Express:index.js

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');
const authRouter = require('./auth'); // Moduł autoryzacji z Canvas

// --- Konfiguracja Bazy Danych ---
// Używa zmiennych środowiskowych z Render
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

const app = express();
const PORT = process.env.PORT || 10000;

// --- Middlewares ---
app.use(cors());
app.use(express.json());

// --- 1. ROUTER AUTORYZACJI ---
// Obsługuje /api/register, /api/login, /api/leaderboard
app.use('/api', authRouter);

// --- 2. CYKLICZNA AKTUALIZACJA DRABINKI ---
// To jest ta logika, która powodowała błąd "uuid = integer"
async function cyclicUpdate() {
    let client;
    console.log(`\n--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toLocaleTimeString()} ---`);

    try {
        client = await pool.connect();

        // 1. Pobierz listę graczy do aktualizacji
        const playersResult = await client.query(`
            SELECT 
                user_id, player_name, platform 
            FROM players
        `);

        if (playersResult.rows.length === 0) {
            console.log('Brak zarejestrowanych graczy do aktualizacji.');
            return;
        }

        // 2. Iteruj i aktualizuj każdego gracza
        for (const player of playersResult.rows) {
            const userName = player.player_name;
            const platform = player.platform;
            const userId = player.user_id;

            try {
                // Zapytanie do zewnętrznego API
                const apiUrl = `https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=${userName}&platform=${platform}&skip_battlelog=false`;
                const response = await axios.get(apiUrl, { timeout: 8000 });
                const stats = response.data;
                
                // Walidacja i pobranie danych
                const totalKills = parseInt(stats.total_kills) || 0;
                const totalDeaths = parseInt(stats.total_deaths) || 1; // Unikamy dzielenia przez zero
                const kdRatio = totalKills / totalDeaths;
                
                // Zapis do bazy danych
                // KLUCZOWA POPRAWKA: Jawne rzutowanie userId na INTEGER, jeśli to konieczne, aby uniknąć błędu
                const updateQuery = `
                    UPDATE players SET 
                        kd_ratio = $1, 
                        total_kills = $2, 
                        total_deaths = $3
                    WHERE user_id = $4::INTEGER;
                `;
                
                await client.query(updateQuery, [kdRatio, totalKills, totalDeaths, userId]);
                
                console.log(`[AKTUALIZACJA] Gracz: ${userName}, K/D: ${kdRatio.toFixed(3)}`);

            } catch (apiError) {
                if (apiError.response && apiError.response.status === 502) {
                    console.error('[GAMETOOLS BŁĄD] Wystąpił błąd: HTTP 502: Bad Gateway. Zwracam symulację.');
                } else {
                    console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd dla gracza ${userName}:`, apiError.message);
                }
            }
        }
    } catch (dbError) {
        // Ten błąd to ten, który widzimy w logach!
        console.error('[SERWER BŁĄD CYKLICZNA AKTUALIZACJA]', dbError.message);
    } finally {
        if (client) client.release();
        console.log('--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI ---');
    }
}

// Uruchomienie cyklicznej aktualizacji co 10 minut
const UPDATE_INTERVAL_MS = 600000; // 10 minut
let updateInterval;

// Uruchomienie serwera i pętli aktualizacyjnej
app.listen(PORT, async () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`Otwórz: http://localhost:${PORT}`);
    
    try {
        // Sprawdzenie połączenia z bazą danych
        const client = await pool.connect();
        const serverTimeResult = await client.query('SELECT now() as server_time');
        const serverTime = serverTimeResult.rows[0].server_time;
        client.release();
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${serverTime}`);
    } catch (err) {
        console.error('❌ BŁĄD POŁĄCZENIA Z POSTGRESQL:', err.message);
    }

    // Uruchom pierwszą aktualizację natychmiast, a potem cyklicznie
    cyclicUpdate();
    updateInterval = setInterval(cyclicUpdate, UPDATE_INTERVAL_MS);
});
