// backend/index.js
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs'); // POPRAWIONO: Używamy bcryptjs (Czysty JS)
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer'); 
const { getKdRatio } = require('./utils/trackerScraper');

// --- KONFIGURACJA ---
const app = express();
const PORT = 3000;
// Zmieniono, aby nie mapować pierwszej linii pliku jako domyślnej wartości,
// co jest źródłem błędu SyntaxError
const JWT_SECRET = process.env.JWT_SECRET || 'TWOJ_BARDZO_TAJNY_KLUCZ_JWT'; 
const BASE_URL = process.env.BASE_URL || 'https://bf6-tracker-backend.onrender.com'; 

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- KONFIGURACJA BAZY DANYCH (Używa zmiennych środowiskowych) ---
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bf6_tracker',
  password: process.env.DB_PASSWORD || 'Talon1990',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});


// Sprawdzenie połączenia z bazą danych
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Błąd połączenia z PostgreSQL:', err.message);
  } else {
    console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${res.rows[0].now}`);
  }
});

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};


// --- Funkcja do wysyłania emaila (SYMULACJA/KONFIGURACJA) ---
const sendVerificationEmail = async (email, token) => {
  const currentBaseUrl = process.env.BASE_URL || BASE_URL;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log(`[EMAIL SYMULACJA] BŁĄD: Brakuje konfiguracji EMAIL_USER/PASS. Symuluję wysłanie.`);
      console.log(`[EMAIL SYMULACJA] Link do weryfikacji: ${currentBaseUrl}/api/verify-email?token=${token}`);
      return;
  }
  // W przypadku rzeczywistej wysyłki...
};


// --- LOGIKA CYKLICZNEJ AKTUALIZACJI ---
const cyclicUpdate = async () => {
  console.log(`--- START CYKLICZNEJ AKTUALIZACJI DRABINKI: ${new Date().toLocaleTimeString()} ---`);
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT player_id, player_name, platform FROM players');
    for (const player of res.rows) {
      try {
        const { kdRatio, kills, deaths } = await getKdRatio(player.player_name, player.platform);
        await client.query(
          'UPDATE players SET kd_ratio = $1, total_kills = $2, total_deaths = $3, last_updated = NOW() WHERE player_id = $4',
          [kdRatio, kills, deaths, player.player_id]
        );
        const currentKd = parseFloat(kdRatio || '0');
        console.log(`[AKTUALIZACJA] Gracz: ${player.player_name}, K/D: ${currentKd.toFixed(3)}`);
      } catch (playerError) {
        if (playerError instanceof Error) console.error(`Błąd aktualizacji gracza ${player.player_name}:`, playerError.message);
        else console.error(`Błąd aktualizacji gracza ${player.player_name}:`, playerError);
      }
    }
  } catch (error) {
    if (error instanceof Error) console.error('Błąd podczas cyklicznej aktualizacji (główny):', error.message);
    else console.error('Błąd podczas cyklicznej aktualizacji (główny):', error);
  } finally {
    client.release();
    console.log('--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI ---');
  }
};
setTimeout(cyclicUpdate, 5000);
setInterval(cyclicUpdate, 600000);


// --- ENDPOINTY API ---

// POST /api/register
app.post('/api/register', async (req, res) => {
  const { username, password, email, playerName, platform, countryCode } = req.body;
  if (!username || !password || !email || !playerName || !platform || !countryCode || countryCode.length !== 2) {
    return res.status(400).json({ message: "Wszystkie pola (w tym email i kod kraju) są wymagane." });
  }
  if (!/\S+@\S+\.\S+/.test(email)) return res.status(400).json({ message: "Nieprawidłowy format adresu email." });

  const client = await pool.connect();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    await client.query('BEGIN');
    const userInsertResult = await client.query(
      "INSERT INTO users (username, password_hash, email, is_verified, verification_token) VALUES ($1, $2, $3, false, $4) RETURNING user_id",
      [username, hashedPassword, email, verificationToken]
    );
    const userId = userInsertResult.rows[0].user_id;

    const { kdRatio, kills, deaths } = await getKdRatio(playerName, platform);
    await client.query(
      "INSERT INTO players (user_id, player_name, platform, kd_ratio, total_kills, total_deaths, country_code, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
      [userId, playerName, platform, kdRatio || 0, kills || 0, deaths || 0, countryCode.toUpperCase()]
    );
    await client.query('COMMIT');

    sendVerificationEmail(email, verificationToken);

    res.status(201).json({ message: "Rejestracja pomyślna. Sprawdź swój email, aby aktywować konto." });

  } catch (error) {
    await client.query('ROLLBACK');
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/register] ${errorMessage}`);
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
       if (errorMessage.includes('users_username_key')) return res.status(409).json({ message: "Nazwa użytkownika jest już zajęta." });
       if (errorMessage.includes('users_email_key')) return res.status(409).json({ message: "Adres email jest już zajęty." });
       if (errorMessage.includes('players_')) return res.status(409).json({ message: "Gracz jest już powiązany." });
    }
    res.status(500).json({ message: "Rejestracja nie powiodła się." });
  } finally {
    client.release();
  }
});


// GET /api/verify-email (Endpoint do aktywacji konta)
app.get('/api/verify-email', async (req, res) => {
    const { token } = req.query;
    if (!token || typeof token !== 'string') return res.status(400).send('Nieprawidłowy lub brakujący token.');
    try {
        const result = await pool.query(
            'UPDATE users SET is_verified = true, verification_token = NULL WHERE verification_token = $1 RETURNING user_id',
            [token]
        );
        if (result.rowCount === 1) {
            res.status(200).send('<h1>Konto zostało pomyślnie aktywowane!</h1><p>Możesz teraz zalogować się do aplikacji.</p>');
        } else {
            res.status(400).send('<h1>Błąd aktywacji</h1><p>Nieprawidłowy lub wygasły token weryfikacyjny.</p>');
        }
    } catch (error) {
        let errorMessage = 'Wystąpił błąd serwera';
        if (error instanceof Error) errorMessage = error.message;
        console.error(`[SERWER BŁĄD /api/verify-email] ${errorMessage}`);
        res.status(500).send('<h1>Błąd serwera</h1><p>Nie udało się aktywować konta. Spróbuj ponownie później.</p>');
    }
});


// POST /api/login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Nazwa użytkownika i hasło są wymagane." });

    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) return res.status(401).json({ message: "Błędne dane." });

    const user = userResult.rows[0];

    // Sprawdź, czy konto jest zweryfikowane
    if (!user.is_verified) {
      return res.status(403).json({ message: "Konto nie zostało aktywowane. Sprawdź swój email (również folder spam)." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) return res.status(401).json({ message: "Błędne dane." });

    const token = jwt.sign({ userId: user.user_id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.status(200).json({ message: "Logowanie pomyślne", token });
  } catch (error) {
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/login] ${errorMessage}`);
    res.status(500).json({ message: "Wystąpił błąd serwera." });
  }
});


// POST /api/forgot-password (Symulacja)
app.post('/api/forgot-password', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: "Nazwa użytkownika jest wymagana." });
    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length > 0) {
      console.log(`[RESET HASŁA] Żądanie dla: ${username}. SYMULACJA: Wysłano email.`);
    } else {
      console.log(`[RESET HASŁA] Żądanie dla nieistniejącego użytkownika: ${username}.`);
    }
    res.status(200).json({ message: "Jeśli konto istnieje, link został wysłany." });
  } catch (error) {
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/forgot-password] ${errorMessage}`);
    res.status(500).json({ message: "Wystąpił błąd serwera." });
  }
});


// GET /api/leaderboard
app.get('/api/leaderboard', authenticateToken, async (req, res) => {
  try {
    const leaderboardResult = await pool.query(
      `SELECT
          u.username, p.player_name, p.kd_ratio,
          p.total_kills, p.total_deaths, p.country_code
       FROM players p
       JOIN users u ON u.user_id = p.user_id
       ORDER BY p.kd_ratio DESC`
    );

    const formattedLeaderboard = leaderboardResult.rows.map(item => ({
      username: item.username,
      player_name: item.player_name,
      kd_ratio: parseFloat(item.kd_ratio || '0'),
      total_kills: parseInt(item.total_kills || '0'),
      total_deaths: parseInt(item.total_deaths || '0'),
      country_code: item.country_code,
    }));

    res.status(200).json(formattedLeaderboard);

  } catch (error) {
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/leaderboard] ${errorMessage}`);
    res.status(500).json({ message: "Nie udało się pobrać drabinki." });
  }
});


// --- URUCHOMIENIE SERWERA ---
app.listen(process.env.PORT || PORT, () => {
  console.log(`Serwer działa na porcie ${process.env.PORT || PORT}`);
  console.log(`Otwórz: http://localhost:${process.env.PORT || PORT}`);
});
```
---

### 🛠️ Krok 2: Wypchnięcie czystej wersji

Wykonaj te komendy, aby **ponownie** wysłać czystą wersję do Render i wymusić nową kompilację zależności.

1.  **Zrób commit i wypchnij zmiany:**
    ```bash
    git add .
    git commit -m "Final critical fix: Pushed clean index.js to resolve SyntaxError on Render"
    git push origin main
    
