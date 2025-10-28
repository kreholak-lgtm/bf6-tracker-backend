// backend/index.ts
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg'; // PostgreSQL
import bcrypt from 'bcrypt'; // Password hashing
import jwt from 'jsonwebtoken'; // JWT tokens

// Importujemy nasz scraper (plik .js)
const { getKdRatio } = require('./utils/trackerScraper');

// --- KONFIGURACJA ---
const app = express();
const PORT = 3000;
const JWT_SECRET = 'WASZA_TAJNA_FRAZA_DO_JWT'; // WAŻNE: Zmień to

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- KONFIGURACJA BAZY DANYCH ---
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'bf6_tracker',
  password: 'Talon1990', // Hasło
  port: 5432,
});

// --- WAŻNE: STRUKTURA BAZY DANYCH (AKTUALIZACJA) ---
// Upewnij się, że uruchomiłeś ten SQL w pgAdmin:
/*
-- Dodaj kolumnę country_code JEŚLI TABELA players JUŻ ISTNIEJE i jej nie ma
ALTER TABLE players ADD COLUMN IF NOT EXISTS country_code VARCHAR(2);
*/

// Sprawdzenie połączenia z bazą danych
pool.query('SELECT NOW()', (err: Error, res: any) => {
  if (err) {
    console.error('Błąd połączenia z PostgreSQL:', err.message);
  } else {
    console.log(`✅ Połączenie z PostgreSQL nawiązane. Czas serwera: ${res.rows[0].now}`);
  }
});


// --- AUTH MIDDLEWARE ---
const authenticateToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  if (token == null) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    (req as any).user = user;
    next();
  });
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
        // Bezpieczne parsowanie dla logu
        const currentKd = parseFloat(kdRatio || '0');
        console.log(`[AKTUALIZACJA] Zaktualizowano gracza: ${player.player_name}, Nowe K/D: ${currentKd.toFixed(3)}`);
      } catch (playerError) {
        if (playerError instanceof Error) {
          console.error(`Błąd aktualizacji gracza ${player.player_name}:`, playerError.message);
        } else {
          console.error(`Błąd aktualizacji gracza ${player.player_name}:`, playerError);
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('Błąd podczas cyklicznej aktualizacji (główny):', error.message);
    } else {
      console.error('Błąd podczas cyklicznej aktualizacji (główny):', error);
    }
  } finally {
    client.release();
    console.log('--- KONIEC CYKLICZNEJ AKTUALIZACJI DRABINKI ---');
  }
};
setTimeout(cyclicUpdate, 5000);
setInterval(cyclicUpdate, 600000);


// --- ENDPOINTY API ---

// POST /api/register
app.post('/api/register', async (req: express.Request, res: express.Response) => {
  const { username, password, playerName, platform, countryCode } = req.body;
  if (!username || !password || !playerName || !platform || !countryCode || countryCode.length !== 2) {
    return res.status(400).json({ message: "Wszystkie pola (w tym kod kraju) są wymagane." });
  }
  const client = await pool.connect();
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query('BEGIN');
    const userInsertResult = await client.query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING user_id",
      [username, hashedPassword]
    );
    const userId = userInsertResult.rows[0].user_id;
    const { kdRatio, kills, deaths } = await getKdRatio(playerName, platform);
    await client.query(
      "INSERT INTO players (user_id, player_name, platform, kd_ratio, total_kills, total_deaths, country_code, last_updated) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())",
      [userId, playerName, platform, kdRatio || 0, kills || 0, deaths || 0, countryCode.toUpperCase()] // Dodano fallback dla K/D/K/D
    );
    await client.query('COMMIT');
    res.status(201).json({ message: "Użytkownik i gracz zostali pomyślnie zarejestrowani." });
  } catch (error) {
    await client.query('ROLLBACK');
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/register] ${errorMessage}`);
    if (errorMessage.includes('duplicate key value violates unique constraint')) {
       if (errorMessage.includes('users_username_key')) return res.status(409).json({ message: "Nazwa użytkownika jest już zajęta." });
       if (errorMessage.includes('players_')) return res.status(409).json({ message: "Gracz jest już powiązany." });
    }
    res.status(500).json({ message: "Rejestracja nie powiodła się." });
  } finally {
    client.release();
  }
});


// POST /api/login
app.post('/api/login', async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ message: "Nazwa użytkownika i hasło są wymagane." });
    const userResult = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (userResult.rows.length === 0) return res.status(401).json({ message: "Błędne dane." });
    const user = userResult.rows[0];
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
app.post('/api/forgot-password', async (req: express.Request, res: express.Response) => {
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


// GET /api/leaderboard (Dodano console.log)
app.get('/api/leaderboard', authenticateToken, async (req: express.Request, res: express.Response) => {
  try {
    const leaderboardResult = await pool.query(
      `SELECT
          u.username,
          p.player_name,
          p.kd_ratio,
          p.total_kills,
          p.total_deaths,
          p.country_code
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
      country_code: item.country_code, // Upewniamy się, że to jest tutaj
    }));

    // --- DODANO CONSOLE LOG TUTAJ ---
    console.log('[SERWER API /api/leaderboard] Wysyłane dane:', JSON.stringify(formattedLeaderboard, null, 2));
    // -------------------------------

    res.status(200).json(formattedLeaderboard);

  } catch (error) {
    let errorMessage = 'Wystąpił błąd serwera';
    if (error instanceof Error) errorMessage = error.message;
    console.error(`[SERWER BŁĄD /api/leaderboard] ${errorMessage}`);
    res.status(500).json({ message: "Nie udało się pobrać drabinki." });
  }
});


// --- URUCHOMIENIE SERWERA ---
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
  console.log(`Otwórz: http://localhost:${PORT}`);
});

