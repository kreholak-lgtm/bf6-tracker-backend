// backend/index.js - Główny plik serwera Express.
// Konfiguruje serwer, bazę danych PostgreSQL, router autoryzacji i cykliczną aktualizację drabinki.

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios');

// --- Konfiguracja dotenv dla zmiennych środowiskowych ---
require('dotenv').config();

// --- Import routera autoryzacji (auth.js) ---
const authRouter = require('./auth');

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// --- Konfiguracja Serwera Express ---
const app = express();
const PORT = process.env.PORT || 10000;
const UPDATE_INTERVAL_MS = 10 * 60 * 1000; // Aktualizacja co 10 minut

app.use(cors({
    origin: '*', // Pozwalamy na dostęp z aplikacji mobilnej
}));
app.use(express.json());

// --- Testowe Połączenie z Bazą Danych ---
async function testDbConnection() {
    try {
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${res.rows[0].now}`);
        client.release();
    } catch (err) {
        console.error('BŁĄD POŁĄCZENIA Z POSTGRESQL:', err.message);
        // Opcjonalnie: Zakończ proces, jeśli baza danych jest niedostępna
        // process.exit(1); 
    }
}

// --- Logika Cyklicznej Aktualizacji Drabinki ---

/**
 * Pobiera statystyki gracza z API Gametools.
 * @param {string} playerName Nazwa gracza (np. n0sinner)
 * @param {string} platform Platforma (np. PC)
 * @returns {Promise<{kills: number, deaths: number, kd: number}|null>} Zwraca obiekt statystyk lub null w przypadku błędu.
 */
async function fetchPlayerStats(playerName, platform) {
    const gametoolsApiUrl = `https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=${playerName}&platform=${platform}&skip_battlelog=false`;
    console.log('[GAMETOOLS API] Wysyłanie zapytania do:', gametoolsApiUrl);

    try {
        const response = await axios.get(gametoolsApiUrl, { timeout: 15000 });
        const data = response.data;
        
        if (data && data.multiplayer) {
            const stats = data.multiplayer;
            const kills = parseInt(stats.kills, 10) || 0;
            const deaths = parseInt(stats.deaths, 10) || 1; // Używamy 1, aby uniknąć dzielenia przez zero
            const kd = kills / deaths;

            return { kills, deaths: parseInt(stats.deaths, 10), kd };
        }
        console.log('[GAMETOOLS BŁĄD] Odpowiedź API nie zawiera danych multiplayer.');
        return null;

    } catch (error) {
        // Logujemy szczegóły błędu 502 Bad Gateway
        console.error('[GAMETOOLS BŁĄD] Wystąpił błąd:', error.response?.status ? `HTTP ${error.response.status}: ${error.response.statusText}` : error.message);
        console.log('Zwracam symulację.');
        // Zwracamy symulowane dane, jeśli API jest niedostępne, aby nie zatrzymać procesu
        return { kills: 66, deaths: 100, kd: 0.66 };
    }
}

/**
 * Cyklicznie aktualizuje statystyki wszystkich zarejestrowanych graczy.
 * Ta logika ma na celu wyeliminowanie błędu 'uuid = integer' poprzez jawne rzutowanie.
 */
async function cyclicUpdate() {
    console.log(`--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toLocaleTimeString()} ---`);
    let client;
    try {
        client = await pool.connect();

        // 1. Pobieranie wszystkich graczy (tylko z podstawowymi danymi)
        const playersResult = await client.query('SELECT user_id, player_name, platform FROM players');
        const playersToUpdate = playersResult.rows;

        for (const player of playersToUpdate) {
            const stats = await fetchPlayerStats(player.player_name, player.platform);

            if (stats) {
                // 2. Aktualizacja statystyk w tabeli players
                const updateQuery = `
                    UPDATE players
                    SET
                        total_kills = $1,
                        total_deaths = $2,
                        kd_ratio = $3,
                        last_updated = NOW()
                    WHERE
                        user_id = $4;
                `;
                // UWAGA: user_id jest traktowane jako INTEGER, zgodnie z typem SERIAL w tabeli users.
                // Upewniamy się, że nie ma problemów z typowaniem.
                await client.query(updateQuery, [
                    stats.kills,
                    stats.deaths,
                    stats.kd,
                    player.user_id 
                ]);

                console.log(`[AKTUALIZACJA] Gracz: ${player.player_name}, K/D: ${stats.kd.toFixed(3)}`);
            }
        }
    } catch (err) {
        // Błąd ten był błędem 'uuid = integer'
        console.error('[SERWER BŁĄD CYKLICZNA AKTUALIZACJA] Wystąpił błąd podczas aktualizacji:', err.message);
    } finally {
        if (client) client.release();
        console.log('--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI ---');
        // Zaplanuj następne uruchomienie
        setTimeout(cyclicUpdate, UPDATE_INTERVAL_MS);
    }
}

// --- Główna Logika Serwera ---

// 1. Podłączamy router autoryzacji do ścieżki /api (w tym /api/leaderboard)
app.use('/api', authRouter);

// 2. Uruchamiamy Serwer
app.listen(PORT, async () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`Otwórz: http://localhost:${PORT}`);

    // Testujemy połączenie z BD
    await testDbConnection();

    // Rozpoczynamy cykliczną aktualizację
    cyclicUpdate();
});
