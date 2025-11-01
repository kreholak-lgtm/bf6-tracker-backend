// auth.js - Moduł Express Router obsługujący Rejestrację, Logowanie i Aktywację Konta.
// Wersja: Natychmiastowe logowanie po rejestracji (bez weryfikacji e-mail).

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Zmienna sendVerificationEmail nie jest już używana, ale zostawiamy import, aby nie łamać zależności.
const { sendVerificationEmail } = require('./email'); 

const router = express.Router();

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    // Używa zmiennych środowiskowych z Render
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

    if (token == null) {
        return res.status(401).json({ error: 'Brak tokena dostępu. Wymagane logowanie.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token nieważny lub wygasły.' });
        }
        req.user = user;
        next();
    });
};

// ===================================
// --- 1. REJESTRACJA UŻYTKOWNIKA ---
//    Natychmiast generuje token JWT i loguje.
// ===================================
router.post('/register', async (req, res) => {
    const { username, password, email, playerName, platform, countryCode } = req.body;
    const client = await pool.connect();

    try {
        // 1. Sprawdzanie, czy użytkownik lub email już istnieje
        const userCheck = await client.query('SELECT user_id, email FROM users WHERE username = $1 OR email = $2', [username, email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ message: 'Użytkownik lub adres e-mail już istnieje.' });
        }

        // 2. Hashowanie hasła (konieczne ze względów bezpieczeństwa)
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        // Usunięto generowanie verificationToken - nie jest już potrzebny.
        
        await client.query('BEGIN'); // Rozpoczęcie transakcji

        // 3. Dodanie użytkownika do tabeli 'users' z is_verified = TRUE
        // ZMIENIONO: is_verified = TRUE
        const userInsertQuery = `
            INSERT INTO users (username, password_hash, email, is_verified)
            VALUES ($1, $2, $3, TRUE) 
            RETURNING user_id;
        `;
        const userResult = await client.query(userInsertQuery, [username, hashedPassword, email]);
        const newUserId = userResult.rows[0].user_id;
        const newUser = { user_id: newUserId, username: username }; // Dane do JWT

        // 4. Dodanie rekordu gracza do tabeli 'players'
        const playerInsertQuery = `
            INSERT INTO players (user_id, player_name, platform, country_code, kd_ratio, total_kills, total_deaths)
            VALUES ($1, $2, $3, $4, 0.0, 0, 0);
        `;
        await client.query(playerInsertQuery, [newUserId, playerName, platform, countryCode]);

        await client.query('COMMIT'); // Zatwierdzenie transakcji

        // 5. Natychmiastowe generowanie tokena JWT (automatyczne logowanie)
        const token = jwt.sign(
            { user_id: newUser.user_id, username: newUser.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );
        
        // Zwraca token do klienta, logując go automatycznie
        res.status(201).json({ 
            message: 'Rejestracja pomyślna. Zalogowano automatycznie.',
            token: token
        });

    } catch (error) {
        await client.query('ROLLBACK'); // Wycofanie transakcji w przypadku błędu
        console.error('[SERWER BŁĄD /api/register]', error.message);
        res.status(500).json({ message: 'Błąd rejestracji. Spróbuj ponownie później.' });
    } finally {
        client.release();
    }
});

// ===================================
// --- 2. ENDPOINT AKTYWACJI E-MAILA ---
//    Zmieniono, aby zawsze zwracał komunikat o sukcesie (żeby nie łamać linków).
// ===================================
router.get('/verify-email', (req, res) => {
    // Ponieważ aktywacja jest automatyczna, ten endpoint zwraca sukces.
    res.status(200).send('<h1>Konto zostało pomyślnie aktywowane!</h1><p>Możesz teraz zalogować się do aplikacji.</p>');
});


// ===================================
// --- 3. LOGOWANIE UŻYTKOWNIKA ---
//    Logika pozostaje bez zmian.
// ===================================
router.post('/login', async (req, res) => {
// ... logika logowania pozostaje bez zmian ...
    const { username, password } = req.body;
    const client = await pool.connect();

    try {
        // 1. Pobranie danych użytkownika (w tym hasła hashowanego)
        const result = await client.query('SELECT user_id, username, password_hash, is_verified FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        const user = result.rows[0];

        // 2. Weryfikacja aktywacji konta (teraz zawsze TRUE, ale zachowujemy dla kompatybilności)
        if (user.is_verified === false) {
            return res.status(403).json({ message: 'Konto nieaktywne. Sprawdź e-mail weryfikacyjny.' });
        }

        // 3. Porównanie hasła
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(400).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        // 4. Generowanie tokena JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1h' }
        );

        res.status(200).json({ token });

    } catch (error) {
        console.error('[SERWER BŁĄD /api/login]', error.message);
        res.status(500).json({ message: 'Błąd serwera podczas logowania.' });
    } finally {
        client.release();
    }
});


// ===================================
// --- 4. TYMCZASOWY ENDPOINT DRABINKI ---
//    Logika pozostaje bez zmian.
// ===================================
router.get('/leaderboard', authenticateToken, async (req, res) => {
    const client = await pool.connect();
    
    try {
        // Zapytanie jest poprawne, ponieważ user_id w obu tabelach jest INTEGER (SERIAL).
        const query = `
            SELECT
                u.username,
                p.player_name,
                p.country_code,
                p.kd_ratio,
                p.total_kills,
                p.total_deaths
            FROM
                players p
            JOIN
                users u ON u.user_id = p.user_id
            ORDER BY
                p.kd_ratio DESC;
        `;
        const result = await client.query(query);

        res.status(200).json(result.rows);

    } catch (error) {
        console.error('[SERWER BŁĄD /api/leaderboard]', error.message);
        res.status(500).json({ message: 'Błąd pobierania drabinki. Skontaktuj się z administratorem.' });
    } finally {
        client.release();
    }
});


module.exports = router;
