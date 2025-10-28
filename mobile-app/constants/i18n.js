// mobile-app/constants/i18n.js

import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';

// Definicje tłumaczeń
const translations = {
  en: {
    welcome: 'Welcome to BF Tracker!',
    // ... (pozostałe tłumaczenia angielskie)
    loginTitle: 'Sign In',
    registerTitle: 'Create Account',
    leaderboardTitle: 'K/D Leaderboard',
    profileTitle: 'My Profile',
    email: 'Email',
    password: 'Password',
    loginButton: 'Login',
    registerButton: 'Register',
    bfId: 'BF Player ID',
    platform: 'Platform (PC/PSN/XBL)',
    kdRatio: 'K/D Ratio',
    required: 'This field is required.',
    loading: 'Loading data...',
    error: 'An error occurred. Please try again.',
    success: 'Operation successful!',
    position: 'Position',
    lastUpdated: 'Last Updated',
  },
  pl: {
    welcome: 'Witaj w BF Tracker!',
    // ... (pozostałe tłumaczenia polskie)
    loginTitle: 'Zaloguj się',
    registerTitle: 'Utwórz konto',
    leaderboardTitle: 'Drabinka K/D',
    profileTitle: 'Mój Profil',
    email: 'E-mail',
    password: 'Hasło',
    loginButton: 'Zaloguj',
    registerButton: 'Zarejestruj',
    bfId: 'ID Gracza BF',
    platform: 'Platforma (PC/PSN/XBL)',
    kdRatio: 'Współczynnik K/D',
    required: 'To pole jest wymagane.',
    loading: 'Ładowanie danych...',
    error: 'Wystąpił błąd. Spróbuj ponownie.',
    success: 'Operacja zakończona sukcesem!',
    position: 'Pozycja',
    lastUpdated: 'Ostatnia aktualizacja',
  },
};

const i18n = new I18n(translations);

// --- POPRAWKA: Zabezpieczenie przed undefined ---
// 1. Używamy 'locale' z Expo (np. 'en-US')
let locale = Localization.locale;

// 2. Jeśli locale jest undefined lub null, używamy domyślnego 'en'
if (!locale) {
    locale = 'en';
}

// 3. Ustawienie języka: używamy tylko pierwszych dwóch znaków (np. 'en' zamiast 'en-US')
i18n.locale = locale.substring(0, 2); 
i18n.defaultLocale = 'en';
i18n.fallbacks = true; 
// ------------------------------------------------

export default i18n;