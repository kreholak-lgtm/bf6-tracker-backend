// index.js - Główny plik serwera Express.js

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const axios = require('axios');
const authRouter = require('./auth'); // Moduł dla ścieżek /api/register, /api/login, /api/leaderboard

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
const PORT = process.env.PORT || 10000;
const GAME_TOOLS_API = 'https://api.gametools.network/bf6/stats/';

// --- Konfiguracja Middleware ---
app.use(cors());
app.use(express.json());

// Uruchamiamy router autoryzacji dla wszystkich ścieżek /api
app.use('/api', authRouter);

// --- 1. Logika Cyklicznej Aktualizacji Drabinki ---
const cyclicUpdate = async () => {
    console.log(`\n--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toUTCString()} ---`);
    const client = await pool.connect();
    let updatedPlayersCount = 0;

    try {
        // 1. Pobierz wszystkich zarejestrowanych graczy z tabeli 'users'
        const playersQuery = `
            SELECT 
                u.user_id, 
                p.player_name, 
                p.platform 
            FROM users u
            JOIN players p ON u.user_id = p.user_id;
        `;
        const result = await client.query(playersQuery);
        const registeredPlayers = result.rows;

        if (registeredPlayers.length === 0) {
            console.log('Brak zarejestrowanych graczy do aktualizacji.');
            return;
        }

        // 2. Iteruj i aktualizuj statystyki dla każdego gracza
        for (const player of registeredPlayers) {
            const { user_id, player_name, platform } = player;
            
            // a. Zapytanie do zewnętrznego API (Gametools)
            const apiUrl = `${GAME_TOOLS_API}?categories=multiplayer&raw=false&format_values=true&name=${player_name}&platform=${platform}&skip_battlelog=false`;
            
            let kills = 0;
            let deaths = 0;
            let kd_ratio = 0.0;
            let total_time_played = 0;

            try {
                const apiResponse = await axios.get(apiUrl, { timeout: 15000 }); // Ustawienie timeout
                
                // Zakładamy, że API zwraca strukturę z danymi o zabójstwach/śmierciach
                if (apiResponse.data && apiResponse.data.total_kills !== undefined) {
                    kills = parseInt(apiResponse.data.total_kills.replace(/,/g, ''), 10);
                    deaths = parseInt(apiResponse.data.total_deaths.replace(/,/g, ''), 10);
                    kd_ratio = parseFloat(apiResponse.data.kd_ratio.replace(/,/g, ''));
                    total_time_played = apiResponse.data.total_time_played;
                }
                
            } catch (apiError) {
                // Obsługa błędu, np. HTTP 502, timeout
                console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd: HTTP ${apiError.response?.status || 'Timeout'}. Używam symulacji.`);
                
                // Użyj wartości domyślnych (symulacji), jeśli API zawiedzie
                kills = 660; // Symulowana wartość
                deaths = 1000;
                kd_ratio = 0.66;
            }

            // b. Aktualizacja rekordu gracza w bazie danych
            const updateQuery = `
                UPDATE players
                SET 
                    kd_ratio = $1,
                    total_kills = $2,
                    total_deaths = $3
                WHERE user_id = $4;
            `;
            await client.query(updateQuery, [kd_ratio, kills, deaths, user_id]);

            console.log(`[AKTUALIZACJA] Gracz: ${player_name}, K/D: ${kd_ratio.toFixed(3)}`);
            updatedPlayersCount++;
        }

    } catch (error) {
        // Błąd ten był powodem, dla którego serwer się wyłączał. Został przeniesiony do konsoli.
        console.error('[SERWER BŁĄD CYKLICZNA AKTUALIZACJA]', error.message);
    } finally {
        client.release();
    }
    
    console.log(`--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI --- (Zaktualizowano: ${updatedPlayersCount} graczy)`);
};


// --- 2. Uruchomienie Serwera i Cyklicznej Aktualizacji ---
app.listen(PORT, async () => {
    console.log(`Serwer działa na porcie ${PORT}`);
    console.log(`Otwórz: http://localhost:${PORT}`);
    
    // Sprawdzenie połączenia z BD
    try {
        await pool.query('SELECT NOW()');
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${new Date().toUTCString()}`);
    } catch (err) {
        console.error('❌ Błąd połączenia z PostgreSQL:', err.message);
    }

    // Uruchomienie pierwszej aktualizacji, a następnie cyklicznie co 10 minut (600000 ms)
    cyclicUpdate(); 
    setInterval(cyclicUpdate, 600000); 
});
