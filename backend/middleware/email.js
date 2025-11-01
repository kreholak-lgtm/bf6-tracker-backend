// email.js - Moduł odpowiedzialny za konfigurację i wysyłkę e-maili SMTP.
// Używa zmiennych środowiskowych ustawionych na Render (EMAIL_HOST, EMAIL_FROM, itp.).

const nodemailer = require('nodemailer');

/**
 * Wysyła e-mail weryfikacyjny do nowego użytkownika.
 * @param {string} toEmail - Adres e-mail odbiorcy.
 * @param {string} token - Unikalny token weryfikacyjny.
 * @param {string} username - Nazwa użytkownika.
 * @param {string} apiBaseUrl - Bazowy URL serwera (np. https://twojserwer.onrender.com).
 */
const sendVerificationEmail = async (toEmail, token, username, apiBaseUrl) => {
    // 1. Sprawdzenie, czy konfiguracja SMTP jest kompletna
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.EMAIL_FROM) {
        console.warn('[EMAIL SYMULACJA] BŁĄD: Brakuje konfiguracji EMAIL_HOST/USER/PASS/FROM. Symuluję wysłanie.');
        console.log(`[EMAIL SYMULACJA] Link do weryfikacji: ${apiBaseUrl}/api/verify-email?token=${token}`);
        return; // Przerywa i symuluje, jeśli brakuje kluczy
    }

    // 2. Tworzenie transportera SMTP (dla Resend)
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_PORT == 465, // Użyj true, jeśli port 465 (TLS/SSL)
        auth: {
            user: process.env.EMAIL_USER, // Dla Resend to zawsze 'resend'
            pass: process.env.EMAIL_PASSWORD, // Twój klucz API Resend
        },
    });

    // 3. Budowanie linku aktywacyjnego
    const verificationLink = `${apiBaseUrl}/api/verify-email?token=${token}`;

    // 4. Konfiguracja wiadomości
    const mailOptions = {
        from: `BF6 Tracker <${process.env.EMAIL_FROM}>`,
        to: toEmail,
        subject: 'BF6 Tracker: Aktywacja konta',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
                <h2 style="color: #333;">Witaj, ${username}!</h2>
                <p>Dziękujemy za rejestrację w BF6 Tracker. Aby aktywować swoje konto i rozpocząć śledzenie statystyk, kliknij w poniższy link:</p>
                <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; margin: 15px 0; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">
                    Aktywuj Konto
                </a>
                <p>Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:</p>
                <p style="font-size: 12px; color: #777;">${verificationLink}</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin-top: 20px;">
                <p style="font-size: 12px; color: #aaa;">Ten e-mail został wygenerowany automatycznie. Prosimy na niego nie odpowiadać.</p>
            </div>
        `,
        text: `Witaj ${username},\nAby aktywować swoje konto, użyj tego linku: ${verificationLink}`,
    };

    // 5. Wysyłka wiadomości
    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[EMAIL SUKCES] Wiadomość wysłana do ${toEmail}: ${info.messageId}`);
    } catch (error) {
        console.error(`[EMAIL BŁĄD] Nie udało się wysłać e-maila do ${toEmail}:`, error.message);
    }
};

module.exports = { sendVerificationEmail };
