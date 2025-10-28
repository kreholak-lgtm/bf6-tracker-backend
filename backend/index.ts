// backend/index.ts
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs'; // WAŻNA ZMIANA: Zastąpienie "bcrypt" na "bcryptjs"
import jwt from 'jsonwebtoken';
import 'dotenv/config';
import axios from 'axios';
import { scrapeStats, TrackerStats } from './utils/trackerScraper';
import { validateRegistration, validateLogin } from './utils/validation';
import { sendVerificationEmail, sendPasswordResetEmail } from './utils/mailer';

// --- Konfiguracja ---
const app = express();
const PORT = process.env.PORT || 5000;
const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Klucz do tokenów JWT
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:8081';

// Połączenie z PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json()); // Do parsowania JSON z body requestu

// --- Walidacja tokenu JWT ---
interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Brak tokenu

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.sendStatus(403); // Nieprawidłowy/wygaśnięty token
    req.user = user as { id: number; email: string };
    next();
  });
};

// --- Funkcje pomocnicze bazy danych ---

// Znajduje użytkownika po adresie email
async function findUserByEmail(email: string) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  } catch (error) {
    console.error('Błąd podczas szukania użytkownika:', error);
    throw new Error('Database query failed');
  }
}

// Znajduje użytkownika po ID
async function findUserById(id: number) {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0];
  } catch (error) {
    console.error('Błąd podczas szukania użytkownika:', error);
    throw new Error('Database query failed');
  }
}

// Zapisuje użytkownika w bazie danych
async function saveUser(email: string, hashedPassword: string, verificationToken: string) {
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, verification_token, is_verified, created_at) VALUES ($1, $2, $3, FALSE, NOW()) RETURNING id, email',
      [email, hashedPassword, verificationToken]
    );
    return result.rows[0];
  } catch (error) {
    console.error('Błąd podczas zapisywania użytkownika:', error);
    throw new Error('Database insert failed');
  }
}

// Aktualizuje pole is_verified
async function verifyUser(token: string) {
  try {
    const result = await pool.query('UPDATE users SET is_verified = TRUE, verification_token = NULL WHERE verification_token = $1 RETURNING id', [token]);
    return result.rows[0];
  } catch (error) {
    console.error('Błąd podczas weryfikacji użytkownika:', error);
    throw new Error('Database update failed');
  }
}

// --- Endpoints Publiczne ---

// Rejestracja użytkownika
app.post('/api/auth/register', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const validationError = validateRegistration(email, password);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    // 1. Sprawdź, czy użytkownik istnieje
    if (await findUserByEmail(email)) {
      return res.status(409).json({ message: 'Użytkownik z tym adresem email już istnieje.' });
    }

    // 2. Hashowanie hasła (używając bcryptjs)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Generowanie tokenu weryfikacyjnego
    const verificationToken = jwt.sign({ email }, SECRET_KEY, { expiresIn: '1d' });

    // 4. Zapisz użytkownika
    const newUser = await saveUser(email, hashedPassword, verificationToken);

    // 5. Wyślij email weryfikacyjny
    await sendVerificationEmail(email, verificationToken);

    res.status(201).json({ 
      message: 'Rejestracja pomyślna. Sprawdź swoją skrzynkę pocztową, aby zweryfikować konto.',
      userId: newUser.id,
      email: newUser.email
    });
  } catch (error) {
    console.error('Błąd rejestracji:', error);
    res.status(500).json({ message: 'Wystąpił błąd podczas rejestracji.' });
  }
});

// Weryfikacja emaila
app.get('/api/auth/verify/:token', async (req: Request, res: Response) => {
  const { token } = req.params;

  try {
    const verifiedUser = await verifyUser(token);
    
    if (verifiedUser) {
      // Jeśli weryfikacja pomyślna, przekieruj na stronę logowania/powodzenia w aplikacji front-end
      return res.redirect(`${CLIENT_URL}/verification-success`); 
    } else {
      // Jeśli token nie pasuje, przekieruj na stronę błędu
      return res.redirect(`${CLIENT_URL}/verification-failed`);
    }
  } catch (error) {
    console.error('Błąd weryfikacji tokenu:', error);
    res.status(500).send('Wystąpił błąd podczas weryfikacji tokenu.');
  }
});


// Logowanie użytkownika
app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  const validationError = validateLogin(email, password);
  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  try {
    const user = await findUserByEmail(email);

    // 1. Walidacja użytkownika
    if (!user) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
    }

    // 2. Walidacja hasła (używając bcryptjs)
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Nieprawidłowy email lub hasło.' });
    }
    
    // 3. Sprawdzenie weryfikacji
    if (!user.is_verified) {
      return res.status(403).json({ message: 'Konto nie zostało zweryfikowane. Sprawdź swoją skrzynkę pocztową.' });
    }

    // 4. Generowanie tokenu JWT
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

    res.json({ token, user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error('Błąd logowania:', error);
    res.status(500).json({ message: 'Wystąpił błąd podczas logowania.' });
  }
});

// Reset hasła - krok 1: Żądanie resetu
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email jest wymagany.' });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      // Dla bezpieczeństwa, zawsze zwracaj tę samą odpowiedź, nawet jeśli email nie istnieje
      return res.json({ message: 'Jeśli podany adres email istnieje w naszej bazie danych, link resetujący hasło został wysłany.' });
    }

    // 1. Generowanie tokenu resetu
    const resetToken = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '15m' });
    
    // 2. Zapisanie tokenu w bazie
    await pool.query('UPDATE users SET reset_password_token = $1, reset_password_expires = NOW() + INTERVAL \'15 minutes\' WHERE id = $2', [resetToken, user.id]);
    
    // 3. Wysyłanie emaila
    await sendPasswordResetEmail(email, resetToken);

    res.json({ message: 'Jeśli podany adres email istnieje w naszej bazie danych, link resetujący hasło został wysłany.' });

  } catch (error) {
    console.error('Błąd zapomnianego hasła:', error);
    res.status(500).json({ message: 'Wystąpił błąd serwera.' });
  }
});

// Reset hasła - krok 2: Ustawienie nowego hasła
app.post('/api/auth/reset-password/:token', async (req: Request, res: Response) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ message: 'Nowe hasło jest wymagane.' });
  }

  try {
    // 1. Weryfikacja tokenu i daty wygaśnięcia
    const result = await pool.query('SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()', [token]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Nieprawidłowy lub wygasły token resetu hasła.' });
    }

    // 2. Hashowanie nowego hasła (używając bcryptjs)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Aktualizacja hasła i usunięcie tokenu resetu
    await pool.query('UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2', [hashedPassword, user.id]);

    res.json({ message: 'Hasło zostało pomyślnie zresetowane.' });

  } catch (error) {
    console.error('Błąd resetowania hasła:', error);
    res.status(500).json({ message: 'Wystąpił błąd serwera.' });
  }
});

// --- Endpoints dla Tracker'a (Wymagane uwierzytelnienie) ---

// Zapisuje/aktualizuje Battlefield ID dla zalogowanego użytkownika
app.post('/api/profile/save-bf-id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { battlefieldId, platform } = req.body; // platform: np. 'pc', 'psn', 'xbox'

  if (!battlefieldId || !platform) {
    return res.status(400).json({ message: 'Battlefield ID i platforma są wymagane.' });
  }

  try {
    // Sprawdź, czy dane gracza są poprawne i pobierz podstawowe statystyki (np. nazwę)
    // UWAGA: Wywołanie scrapeStats tutaj może być zbyt czasochłonne, ale jest to proste sprawdzenie
    // W rzeczywistej aplikacji, to sprawdzenie może być asynchroniczne lub pobierać tylko podstawowe dane.
    const stats: TrackerStats | null = await scrapeStats(battlefieldId, platform);

    if (!stats) {
       return res.status(404).json({ message: 'Nie znaleziono gracza o podanym ID lub platformie.' });
    }

    // Aktualizacja w bazie
    await pool.query(
      'UPDATE users SET battlefield_id = $1, platform = $2 WHERE id = $3',
      [battlefieldId, platform, userId]
    );

    res.json({ message: 'Battlefield ID i platforma zapisane pomyślnie.', stats });

  } catch (error) {
    console.error('Błąd zapisywania BF ID:', error);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas zapisywania ID.' });
  }
});

// Pobiera zapisany Battlefield ID dla zalogowanego użytkownika
app.get('/api/profile/get-bf-id', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const user = await findUserById(userId);

    if (user && user.battlefield_id && user.platform) {
      res.json({ 
        battlefieldId: user.battlefield_id,
        platform: user.platform
      });
    } else {
      res.status(404).json({ message: 'Nie znaleziono zapisanych danych Battlefield ID.' });
    }
  } catch (error) {
    console.error('Błąd pobierania BF ID:', error);
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania ID.' });
  }
});

// Pobiera statystyki dla zapisanego Battlefield ID
app.get('/api/tracker/stats', authenticateToken, async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;

  try {
    const user = await findUserById(userId);

    if (!user || !user.battlefield_id || !user.platform) {
      return res.status(400).json({ message: 'Battlefield ID i platforma nie są zapisane dla tego użytkownika.' });
    }

    const { battlefield_id, platform } = user;
    
    // Skrob statystyki
    const stats: TrackerStats | null = await scrapeStats(battlefield_id, platform);

    if (stats) {
      res.json(stats);
    } else {
      res.status(404).json({ message: 'Nie można pobrać statystyk dla podanego Battlefield ID.' });
    }

  } catch (error) {
    // Logowanie błędu skrobania
    if (axios.isAxiosError(error)) {
        console.error('Błąd Axios podczas skrobania:', error.message);
    } else {
        console.error('Nieznany błąd podczas pobierania statystyk:', error);
    }
    res.status(500).json({ message: 'Wystąpił błąd serwera podczas pobierania statystyk.' });
  }
});


// Uruchomienie serwera
app.listen(PORT, () => {
  console.log(`Serwer backend działa na porcie ${PORT}`);
});
