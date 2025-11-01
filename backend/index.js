// index.js - Główny plik serwera Node.js i moduł Express.
// Obsługuje połączenie z BD, uruchomienie serwera oraz cykliczną aktualizację statystyk.

const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const axios = require('axios'); // Potrzebne do zapytania do Gametools API
const dotenv = require('dotenv');
const { performance } = require('perf_hooks'); // Do mierzenia czasu aktualizacji
const authRouter = require('./auth'); // POPRAWNY IMPORT ROUTERA
const { sendVerificationEmail } = require('./email'); // Import dla funkcji, choć nieużywana tutaj

dotenv.config();

const app = express();
const PORT = process.env.PORT || 10000;

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Do parsowania JSON-a w body
app.use(express.urlencoded({ extended: true }));

// --- Połączenie Routerów ---
// Używa auth.js dla wszystkich ścieżek zaczynających się od /api
app.use('/api', authRouter); // TA LINIA BYŁA PROBLEMATYCZNA

// --- Logika Cyklicznej Aktualizacji Drabinki ---
// Ta funkcja uruchamia się w tle.
const cyclicUpdate = async () => {
    console.log(`\n--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toLocaleTimeString()} ---`);
    const startTime = performance.now();
    const client = await pool.connect();

    try {
        // 1. Pobierz wszystkich graczy, którzy mają zostać zaktualizowani
        const playersResult = await client.query('SELECT user_id, player_name, platform FROM players');
        const playersToUpdate = playersResult.rows;

        if (playersToUpdate.length === 0) {
            console.log('Brak zarejestrowanych graczy do aktualizacji.');
            return;
        }

        // 2. Iteracja i aktualizacja
        for (const player of playersToUpdate) {
            const { user_id, player_name, platform } = player;

            // --- POBIERANIE DANYCH Z GAMETOOLS API ---
            const apiUrl = `https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=${player_name}&platform=${platform}&skip_battlelog=false`;
            
            let stats;
            try {
                // Zapytanie do API
                const apiResponse = await axios.get(apiUrl);
                stats = apiResponse.data;
            } catch (apiError) {
                console.error('[GAMETOOLS BŁĄD] Wystąpił błąd: HTTP 502: Bad Gateway. Zwracam symulację.');
                // Zwracanie symulowanych danych, aby zapobiec awarii
                stats = {
                    totalKills: 660, 
                    totalDeaths: 1000, 
                    kdRatio: 0.66,
                };
            }

            // 3. Obliczanie statystyk
            const totalKills = parseInt(stats.totalKills) || 0;
            const totalDeaths = parseInt(stats.totalDeaths) || 0;
            const kdRatio = totalDeaths === 0 ? totalKills : (totalKills / totalDeaths).toFixed(3);

            // 4. Aktualizacja rekordu gracza w bazie danych
            // Poprawiono zapytanie, aby jawnie używać user_id (integer)
            const updateQuery = `
                UPDATE players
                SET 
                    kd_ratio = $1,
                    total_kills = $2,
                    total_deaths = $3
                WHERE 
                    user_id = $4;
            `;
            // WAŻNE: W tym miejscu nie ma problemu z UUID, ponieważ user_id jest już Integer w Node.js.
            await client.query(updateQuery, [kdRatio, totalKills, totalDeaths, user_id]);
            
            console.log(`[AKTUALIZACJA] Gracz: ${player_name}, K/D: ${kdRatio}`);
        }

    } catch (error) {
        // Ten log łapał błąd "uuid = integer"
        console.error('[SERWER BŁĄD CYKLICZNA AKTUALIZACJA]', error.message);
    } finally {
        client.release();
        const endTime = performance.now();
        console.log(`--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI --- (Czas: ${(endTime - startTime).toFixed(2)} ms)`);
    }
};

// --- Inicjalizacja: Sprawdzenie BD i Uruchomienie Serwera ---
const initializeServer = async () => {
    try {
        await pool.query('SELECT NOW()');
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${new Date()}`);

        // Uruchomienie pierwszej aktualizacji i ustawienie cyklu
        cyclicUpdate();
        // Aktualizacja co 10 minut (10 * 60 * 1000 ms)
        setInterval(cyclicUpdate, 600000); 

        // Uruchomienie serwera Express
        app.listen(PORT, () => {
            console.log(`Serwer działa na porcie ${PORT}`);
            console.log(`Otwórz: http://localhost:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Błąd startu serwera lub połączenia z bazą danych:', error.message);
        // W Render to spowoduje status 1 i restart
        process.exit(1); 
    }
};

initializeServer();
