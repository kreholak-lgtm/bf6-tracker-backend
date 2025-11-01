// auth.js - Moduł Express Router obsługujący Rejestrację, Logowanie i Aktywację Konta.
// Ten plik został zaktualizowany, aby używać funkcji sendVerificationEmail z pliku ./email.js

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { sendVerificationEmail } = require('./email'); // !!! IMPORT NOWEJ FUNKCJI EMAIL !!!

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

// --- Middleware do weryfikacji JWT ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// --- 1. REJESTRACJA (/api/register) ---
router.post('/register', async (req, res) => {
    const { username, password, email, playerName, platform, countryCode } = req.body;

    // Prosta walidacja danych wejściowych
    if (!username || !password || !email || !playerName || !countryCode) {
        return res.status(400).json({ message: 'Wszystkie pola są wymagane.' });
    }

    try {
        // Sprawdzenie, czy użytkownik już istnieje
        const checkUser = await pool.query('SELECT user_id FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (checkUser.rows.length > 0) {
            return res.status(409).json({ message: 'Użytkownik z tą nazwą lub adresem e-mail już istnieje.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Rozpoczęcie transakcji
        await pool.query('BEGIN');

        // 1. Dodanie użytkownika do tabeli 'users'
        const newUserResult = await pool.query(
            `INSERT INTO users (username, password_hash, email, is_verified, verification_token) 
             VALUES ($1, $2, $3, FALSE, $4) RETURNING user_id`,
            [username, hashedPassword, email, verificationToken]
        );
        const userId = newUserResult.rows[0].user_id;

        // 2. Dodanie gracza do tabeli 'players'
        await pool.query(
            `INSERT INTO players (user_id, player_name, platform, country_code, total_kills, total_deaths, kd_ratio) 
             VALUES ($1, $2, $3, $4, 0, 0, 0.0)`,
            [userId, playerName, platform, countryCode]
        );

        // Zakończenie transakcji
        await pool.query('COMMIT');

        // 3. Wysyłka e-maila weryfikacyjnego (Używa zaimportowanej funkcji)
        // Sprawdza, czy API_BASE_URL jest ustawiony w Render (Twój adres URL Render)
        const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:10000';
        await sendVerificationEmail(email, verificationToken, username, apiBaseUrl);

        res.status(201).json({ 
            message: 'Rejestracja pomyślna. Sprawdź e-mail, aby aktywować konto.' 
        });

    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('[SERWER BŁĄD /api/register]', error.message);
        res.status(500).json({ message: 'Błąd rejestracji serwera.' });
    }
});


// --- 2. AKTYWACJA KONTA (/api/verify-email) ---
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.status(400).send('Brak tokena weryfikacyjnego.');
    }

    try {
        const result = await pool.query(
            'UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 AND is_verified = FALSE RETURNING user_id',
            [token]
        );

        if (result.rowCount === 0) {
            return res.status(400).send('Błąd aktywacji: Nieprawidłowy lub wygasły token weryfikacyjny.');
        }

        res.status(200).send('Konto zostało pomyślnie aktywowane. Możesz teraz zalogować się w aplikacji.');

    } catch (error) {
        console.error('[SERWER BŁĄD /api/verify-email]', error.message);
        res.status(500).send('Błąd serwera podczas weryfikacji.');
    }
});


// --- 3. LOGOWANIE (/api/login) ---
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        const user = userResult.rows[0];

        if (!user) {
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        // Sprawdzenie hasła
        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }
        
        // Sprawdzenie aktywacji
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Konto nie jest aktywne. Sprawdź swoją skrzynkę odbiorczą.' });
        }

        // Generowanie tokena JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' } // Token wygasa po 7 dniach
        );

        res.status(200).json({ token });

    } catch (error) {
        console.error('[SERWER BŁĄD /api/login]', error.message);
        res.status(500).json({ message: 'Błąd logowania serwera.' });
    }
});


// --- PRZYKŁAD ENDPOINTU CHRONIONEGO (Opcjonalnie) ---
// router.get('/profile', authenticateToken, async (req, res) => {
//     try {
//         const userProfile = await pool.query('SELECT user_id, username, email, created_at FROM users WHERE user_id = $1', [req.user.user_id]);
//         res.status(200).json(userProfile.rows[0]);
//     } catch (error) {
//         res.status(500).json({ message: 'Błąd pobierania profilu.' });
//     }
// });


module.exports = router;
