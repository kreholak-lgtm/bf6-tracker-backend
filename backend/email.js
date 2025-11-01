// Ten moduł zawiera funkcję do wysyłania e-maila weryfikacyjnego.
// Wykorzystuje konfigurację SMTP (EMAIL_HOST, EMAIL_PORT, itp.) ustawioną w Render.
const nodemailer = require('nodemailer');

// --- Konfiguracja Emaila (SMTP Resend - Wartości z Render) ---
// Ta konfiguracja jest kluczowa dla działania wysyłki!
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,     // smtp.resend.com
    port: process.env.EMAIL_PORT,    // 587
    secure: process.env.EMAIL_PORT == 465, // True dla 465 (SSL), false dla 587 (TLS)
    auth: {
        user: process.env.EMAIL_USER, // resend
        pass: process.env.EMAIL_PASSWORD // Twój Klucz API Resend
    }
});

// Funkcja wysyłająca e-mail weryfikacyjny
const sendVerificationEmail = async (email, token, username, apiBaseUrl) => {
    const verificationLink = `${apiBaseUrl}/api/verify-email?token=${token}`;
    
    // Walidacja sprawdzająca, czy konfiguracja jest dostępna w zmiennych środowiskowych Render
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_FROM) {
        console.error("[EMAIL SYMULACJA] BŁĄD: Brakuje konfiguracji SMTP (np. EMAIL_HOST lub EMAIL_FROM). Symuluję wysłanie.");
        console.log(`[EMAIL SYMULACJA] Link do weryfikacji: ${verificationLink}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM, // Adres nadawcy: onboarding@resend.dev
            to: email,
            subject: 'BF6 Tracker: Aktywacja konta',
            html: `
                <h2>Witaj ${username},</h2>
                <p>Dziękujemy za rejestrację w BF6 Tracker. Aby aktywować konto, kliknij w link poniżej:</p>
                <p><a href="${verificationLink}">Aktywuj swoje konto</a></p>
                <p>Jeśli link nie działa, skopiuj go i wklej do przeglądarki: ${verificationLink}</p>
            `,
        });
        console.log(`[EMAIL SUKCES] Wyslano e-mail aktywacyjny do: ${email}`);
    } catch (error) {
        // Logowanie błędu SMTP w Render w celu diagnozy
        console.error(`[EMAIL BŁĄD] Nie udalo sie wyslac e-maila do ${email}:`, error.message);
        console.log(`[EMAIL BŁĄD LINK] Ręczna weryfikacja: ${verificationLink}`);
        
        // Nie rzucamy wyjątku, aby rejestracja w bazie danych mogła się zakończyć
    }
};

module.exports = { sendVerificationEmail };
