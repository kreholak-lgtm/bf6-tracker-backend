// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
// Używamy dotenv, aby mieć dostęp do klucza JWT_SECRET z pliku .env
require('dotenv').config();

/**
 * Middleware do weryfikacji tokena JWT w nagłówku Authorization.
 * Sprawdza, czy token jest obecny, poprawnie sformatowany i ważny.
 */
const authenticateToken = (req, res, next) => {
    // Pobieramy wartość nagłówka 'Authorization'
    const authHeader = req.headers['authorization'];
    
    // Oczekiwany format: Authorization: Bearer <TOKEN>
    // Splitujemy na spacji, aby uzyskać sam token (element o indeksie 1)
    const token = authHeader && authHeader.split(' ')[1]; 

    if (token == null) {
        // 401 Unauthorized - Brak tokena
        return res.status(401).json({ error: 'Brak tokena dostępu. Wymagane logowanie.' }); 
    }

    // Weryfikacja tokena przy użyciu tajnego klucza z pliku .env
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // 403 Forbidden - Token jest nieważny, wygasł lub jest sfałszowany
            return res.status(403).json({ error: 'Token nieważny lub wygasły.' });
        }
        
        // Jeśli weryfikacja się powiedzie, dane (userId, bfId) są dołączane do obiektu req
        req.user = user; 
        
        // Przechodzimy do kolejnej funkcji (czyli do logiki ścieżki, np. /api/profile)
        next(); 
    });
};

module.exports = authenticateToken;