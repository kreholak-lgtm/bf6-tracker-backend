// auth.js - Moduł Express Router obsługujący Rejestrację, Logowanie i Aktywację Konta.
// Ten plik używa funkcji sendVerificationEmail z pliku ./email.js

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// Używamy dotenv, aby mieć dostęp do klucza JWT_SECRET z pliku .env
require('dotenv').config();
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email'); // !!! IMPORT FUNKCJI EMAIL !!!

const router = express.Router();

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

/**
 * Middleware do weryfikacji tokena JWT w nagłówku Authorization.
 * Sprawdza, czy token jest obecny, poprawnie sformatowany i ważny.
 */
// --- Middleware do weryfikacji JWT ---
const authenticateToken = (req, res, next) => {
    // Pobieramy wartość nagłówka 'Authorization'
    const authHeader = req.headers['authorization'];
    
    // Oczekiwany format: Authorization: Bearer <TOKEN>
    // Splitujemy na spacji, aby uzyskać sam token (element o indeksie 1)
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // 401 Unauthorized - Brak tokena lub niepoprawny format
        return res.status(401).json({ error: 'Brak tokena dostępu. Wymagane logowanie.' }); 
    }

    // Weryfikacja tokena przy użyciu tajnego klucza
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // 403 Forbidden - Token jest nieważny, wygasł lub jest sfałszowany
            return res.status(403).json({ error: 'Token nieważny lub wygasły.' });
        }
        // Token jest poprawny, zapisujemy dane użytkownika w obiekcie żądania
        req.user = user;
        next(); // Przechodzimy do kolejnego middleware/handlera
    });
};

// --- Rejestracja Użytkownika ---
router.post('/register', async (req, res) => {
    const client = await pool.connect();
    try {
        const { username, password, email, playerName, platform, countryCode } = req.body;

        // Walidacja danych
        if (!username || !password || !email || !playerName || !countryCode) {
            return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
        }
        
        // Hashowanie hasła
        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        // Rozpoczęcie transakcji
        await client.query('BEGIN');

        // 1. Dodanie użytkownika do tabeli users
        const userInsertResult = await client.query(
            `INSERT INTO users (username, password, email, is_verified, verification_token) 
             VALUES ($1, $2, $3, FALSE, $4) RETURNING user_id`,
            [username, hashedPassword, email, verificationToken]
        );
        const userId = userInsertResult.rows[0].user_id;

        // 2. Dodanie gracza do tabeli players (powiązane z user_id)
        await client.query(
            `INSERT INTO players (user_id, player_name, platform, country_code, total_kills, total_deaths, kd_ratio) 
             VALUES ($1, $2, $3, $4, 0, 0, 0.000)`,
            [userId, playerName, platform, countryCode]
        );

        // 3. Wysłanie e-maila weryfikacyjnego
        const apiBaseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 10000}`;
        await sendVerificationEmail(email, verificationToken, username, apiBaseUrl);

        await client.query('COMMIT');

        res.status(201).json({ 
            message: 'Rejestracja pomyślna. Sprawdź e-mail, aby aktywować konto.',
            userId: userId
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('[SERWER BŁĄD /api/register]', error.message);
        
        // Obsługa błędu unikalności (np. użytkownik lub email już istnieje)
        if (error.code === '23505') { 
            return res.status(409).json({ message: 'Użytkownik lub e-mail już istnieje.' });
        }
        res.status(500).json({ message: 'Błąd rejestracji serwera.' });
    } finally {
        client.release();
    }
});

// --- Logowanie Użytkownika ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        const user = userResult.rows[0];

        // 1. Sprawdzenie, czy konto jest aktywne
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Konto nieaktywne. Sprawdź e-mail weryfikacyjny.' });
        }

        // 2. Porównanie hasła
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        // 3. Generowanie tokena JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' } // Token wygasa po 24 godzinach
        );

        res.json({ message: 'Logowanie pomyślne.', token });

    } catch (error) {
        console.error('[SERWER BŁĄD /api/login]', error.message);
        res.status(500).json({ message: 'Błąd logowania serwera.' });
    }
});

// --- Aktywacja Konta (Weryfikacja E-maila) ---
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('<h1>Błąd aktywacji</h1><p>Brak tokena weryfikacyjnego.</p>');
    }

    try {
        const result = await pool.query(
            `UPDATE users 
             SET is_verified = TRUE, verification_token = NULL, created_at = NOW()
             WHERE verification_token = $1 AND is_verified = FALSE 
             RETURNING user_id`,
            [token]
        );

        if (result.rowCount === 0) {
            // Może być nieważny token, lub konto już było aktywowane
            return res.status(400).send('<h1>Błąd aktywacji</h1><p>Nieprawidłowy lub wygasły token weryfikacyjny.</p>');
        }

        res.send('<h1>Konto zostało pomyślnie aktywowane!</h1><p>Możesz teraz zalogować się do aplikacji.</p>');

    } catch (error) {
        console.error('[SERWER BŁĄD /api/verify-email]', error.message);
        res.status(500).send('<h1>Błąd aktywacji</h1><p>Wystąpił błąd serwera podczas aktywacji.</p>');
    }
});


// --- Drabinka (Wymaga autoryzacji) ---
// TYMCZASOWY ENDPOINT! Zastępuje stary, błędny endpoint /api/leaderboard.
router.get('/leaderboard', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                u.username,
                p.player_name,
                p.country_code,
                p.total_kills,
                p.total_deaths,
                p.kd_ratio
            FROM
                players p
            JOIN
                users u ON u.user_id = p.user_id 
            WHERE 
                u.is_verified = TRUE
            ORDER BY
                p.kd_ratio DESC, p.total_kills DESC
            LIMIT 100`
        );
        // Drabinka jest poprawnie posortowana po K/D i Kills
        res.json(result.rows);

    } catch (error) {
        console.error('[SERWER BŁĄD /api/leaderboard]', error.message);
        // Upewniamy się, że błąd jest jawnie obsługiwany
        if (error.message.includes('uuid = integer')) {
            return res.status(500).json({ message: 'Błąd bazy danych: Niezgodność typów ID. Baza danych nie jest poprawnie zsynchronizowana z kodem.' });
        }
        res.status(500).json({ message: 'Nie udało się pobrać drabinki z serwera.' });
    }
});


module.exports = router;
