// auth.js - Moduł Express Router obsługujący Rejestrację, Logowanie i Aktywację Konta.
// Ten plik używa funkcji sendVerificationEmail z pliku ./email.js

const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
// Import funkcji do wysyłki e-maila
const { sendVerificationEmail } = require('./email'); 

const router = express.Router();

// --- Konfiguracja Bazy Danych ---
const pool = new Pool({
    // Używa zmiennych środowiskowych z Render, zdefiniowanych w pliku .env
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
    // Warunkowe SSL: Używane na Renderze, nie na lokalnej maszynie
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

// --- Middleware do weryfikacji JWT ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    // Oczekiwany format: Authorization: Bearer <TOKEN>
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // 401 Unauthorized - Brak tokena
        return res.status(401).json({ error: 'Brak tokena dostępu. Wymagane logowanie.' });
    }

    // Weryfikacja tokena przy użyciu tajnego klucza
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // 403 Forbidden - Token jest nieważny, wygasł lub jest sfałszowany
            return res.status(403).json({ error: 'Token nieważny lub wygasły.' });
        }
        req.user = user;
        next();
    });
};

// ===================================
// --- 1. REJESTRACJA UŻYTKOWNIKA ---
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

        // 2. Hashowanie hasła i generowanie tokena
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const verificationToken = crypto.randomBytes(32).toString('hex');
        
        await client.query('BEGIN'); // Rozpoczęcie transakcji

        // 3. Dodanie użytkownika do tabeli 'users'
        // ZMIENIONO: 'hashed_password' na 'password_hash'
        const userInsertQuery = `
            INSERT INTO users (username, password_hash, email, verification_token, is_verified)
            VALUES ($1, $2, $3, $4, FALSE) 
            RETURNING user_id;
        `;
        const userResult = await client.query(userInsertQuery, [username, hashedPassword, email, verificationToken]);
        const newUserId = userResult.rows[0].user_id;

        // 4. Dodanie rekordu gracza do tabeli 'players'
        const playerInsertQuery = `
            INSERT INTO players (user_id, player_name, platform, country_code, kd_ratio, total_kills, total_deaths)
            VALUES ($1, $2, $3, $4, 0.0, 0, 0);
        `;
        // WAŻNE: Rzutowanie newUserId na INTEGER w kodzie jest zbędne, jeśli używa się $1,
        // ale jawne rzutowanie na INTEGER jest kluczowe, jeśli user_id jest traktowane jako UUID (co naprawiamy).
        await client.query(playerInsertQuery, [newUserId, playerName, platform, countryCode]);

        await client.query('COMMIT'); // Zatwierdzenie transakcji

        // 5. Wysyłka e-maila weryfikacyjnego (asynchronicznie)
        const apiBaseUrl = process.env.API_BASE_URL || 'https://bf6-tracker-backend.onrender.com';
        await sendVerificationEmail(email, verificationToken, username, apiBaseUrl);
        
        res.status(201).json({ 
            message: 'Konto utworzone. Sprawdź e-mail, aby aktywować konto.',
            // Dodanie tokena do logów na wypadek problemów z wysyłką e-maila
            verificationLink: `${apiBaseUrl}/api/verify-email?token=${verificationToken}`
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
// --- 2. AKTYWACJA E-MAILA ---
// ===================================
router.get('/verify-email', async (req, res) => {
    const { token } = req.query;
    const client = await pool.connect();

    try {
        if (!token) {
            return res.status(400).send('Brak tokena weryfikacyjnego.');
        }

        // 1. Wyszukanie użytkownika po tokenie
        const result = await client.query('SELECT user_id FROM users WHERE verification_token = $1 AND is_verified = FALSE', [token]);
        
        if (result.rows.length === 0) {
            // Zrzut ekranu, który wklejałeś, pokazywał ten błąd.
            return res.status(400).send('<h1>Błąd aktywacji</h1><p>Nieprawidłowy lub wygasły token weryfikacyjny.</p>');
        }

        const userId = result.rows[0].user_id;

        // 2. Aktywacja konta i usunięcie tokena
        await client.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE user_id = $1', [userId]);

        // 3. Potwierdzenie sukcesu w przeglądarce
        res.status(200).send('<h1>Konto zostało pomyślnie aktywowane!</h1><p>Możesz teraz zalogować się do aplikacji.</p>');

    } catch (error) {
        console.error('[SERWER BŁĄD /api/verify-email]', error.message);
        res.status(500).send('Błąd serwera podczas aktywacji.');
    } finally {
        client.release();
    }
});


// ===================================
// --- 3. LOGOWANIE UŻYTKOWNIKA ---
// ===================================
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const client = await pool.connect();

    try {
        // 1. Pobranie danych użytkownika (w tym hasła hashowanego)
        // ZMIENIONO: 'hashed_password' na 'password_hash'
        const result = await client.query('SELECT user_id, username, password_hash, is_verified FROM users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(400).json({ message: 'Nieprawidłowa nazwa użytkownika lub hasło.' });
        }

        const user = result.rows[0];

        // 2. Weryfikacja aktywacji konta
        if (user.is_verified === false) {
            return res.status(403).json({ message: 'Konto nieaktywne. Sprawdź e-mail weryfikacyjny.' });
        }

        // 3. Porównanie hasła
        // ZMIENIONO: 'user.hashed_password' na 'user.password_hash'
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
//    Ten endpoint nadpisuje ewentualny stary kod i
//    jest zabezpieczony przed błędem "uuid = integer".
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
        // Błąd 500 jest oczekiwany, jeśli stary kod nadal się wczytuje
        res.status(500).json({ message: 'Błąd pobierania drabinki. Skontaktuj się z administratorem.' });
    } finally {
        client.release();
    }
});


module.exports = router;
```

---
## Krok do Wykonania

Ten plik **`auth.js`** jest teraz w 100% zsynchronizowany z nazwą kolumny **`password_hash`** w Twojej bazie danych. To powinien być ostatni błąd związany ze schematem bazy danych.

**Musisz teraz wykonać ostatni `git push` z tymi zmianami:**

1.  **Zapisz** zaktualizowany plik `auth.js` na swoim komputerze.
2.  **Wykonaj komendy Git w folderze backendu:**

    ```bash
    git add auth.js
    git commit -m "Fix: Finalna synchronizacja nazwy kolumny hasla na 'password_hash'"
    git push
    
