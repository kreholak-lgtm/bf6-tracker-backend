// index.js - Główny plik aplikacji backendowej (Server Core)

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRouter = require('./auth'); // Import routera autoryzacji
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// --- Użycie Middleware ---
app.use(cors()); // Zezwolenie na zapytania z różnych domen (dla aplikacji mobilnej)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- Routery Aplikacji ---
// Wszystkie ścieżki autoryzacji (register, login, leaderboard, verify-email)
// są obsługiwane przez auth.js i są dostępne pod ścieżką /api
app.use('/api', authRouter); 

// --- Konfiguracja Połączenia z Bazą Danych (dla zadań cyklicznych) ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// --- Funkcja Symulująca Pobieranie Statystyk Gry (Zastępuje Gametools API) ---
const fetchGameStats = async (playerName, platform) => {
    // Symulacja błędu 502, tak jak w logach
    console.log(`[GAMETOOLS API] Wysyłanie zapytania do: https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=${playerName}&platform=${platform}&skip_battlelog=false`);
    console.log('[GAMETOOLS BŁĄD] Wystąpił błąd: HTTP 502: Bad Gateway. Zwracam symulację.');
    
    // Zwracanie symulowanych danych
    return {
        total_kills: 100,
        total_deaths: 150,
        kd_ratio: 100 / 150, // 0.666
    };
};

// --- Funkcja Cyklicznej Aktualizacji Drabinki ---
const cyclicUpdate = async () => {
    try {
        console.log(`--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toLocaleTimeString()} ---`);

        // Pobierz wszystkich zweryfikowanych graczy
        const verifiedPlayersResult = await pool.query(
            'SELECT user_id, player_name, platform FROM players JOIN users ON players.user_id = users.user_id WHERE users.is_verified = TRUE'
        );
        const verifiedPlayers = verifiedPlayersResult.rows;

        for (const player of verifiedPlayers) {
            const stats = await fetchGameStats(player.player_name, player.platform);
            
            // Aktualizacja tabeli players
            const kdRatio = stats.total_deaths > 0 ? (stats.total_kills / stats.total_deaths) : stats.total_kills;

            await pool.query(
                `UPDATE players 
                 SET total_kills = $1, total_deaths = $2, kd_ratio = $3 
                 WHERE user_id = $4`,
                [stats.total_kills, stats.total_deaths, kdRatio, player.user_id]
            );

            console.log(`[AKTUALIZACJA] Gracz: ${player.player_name}, K/D: ${kdRatio.toFixed(3)}`);
        }

        console.log('--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI ---');
    } catch (error) {
        console.error('[SERWER BŁĄD CYKLICZNA AKTUALIZACJA]', error.message);
    }
};

// --- Inicjalizacja Serwera ---
const startServer = async () => {
    try {
        // Test połączenia z bazą danych
        const client = await pool.connect();
        const res = await client.query('SELECT NOW()');
        console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${res.rows[0].now}`);
        client.release();

        // Uruchomienie cyklicznej aktualizacji (co 10 minut = 600000ms)
        cyclicUpdate();
        setInterval(cyclicUpdate, 600000); 

        app.listen(PORT, () => {
            console.log(`Serwer działa na porcie ${PORT}`);
            console.log(`Otwórz: http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Błąd połączenia z PostgreSQL:', err.message);
        // Ważne: W Render serwis musi się uruchomić, nawet jeśli baza danych jest niedostępna
        app.listen(PORT, () => {
            console.warn(`Serwer działa na porcie ${PORT}, ale NIE MA połączenia z bazą danych.`);
        });
    }
};

startServer();
