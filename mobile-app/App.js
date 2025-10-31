// mobile-app/App.js
import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator, FlatList, Alert, ImageBackground, TouchableOpacity, Platform } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';

// Ładujemy obraz tła LOKALNIE
const localBackgroundImage = require('./assets/battlefield_bg.jpg');

// Adres IP serwera backend
const API_BASE_URL = 'https://bf6-tracker-backend.onrender.com'; // Zmień na publiczny URL Render.com

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }, (error) => Promise.reject(error)
);

// --- 1. STRUKTURA TŁUMACZEŃ (I18N) ---
const translations = {
    PL: {
        TITLE_MAIN: "Drabinka K/D Zarejestrowanych Graczy",
        LOGIN_TITLE: "BF6 Tracker: Logowanie",
        LOGIN_BUTTON: "Zaloguj",
        LOGOUT_BUTTON: "Wyloguj",
        REGISTER_GO: "Przejdź do Rejestracji",
        FORGOT_PASS: "Zapomniałem hasła",
        LOADING: "Ładowanie...",
        PLACEHOLDER_USER: "Nazwa użytkownika",
        PLACEHOLDER_PASS: "Hasło",
        PLACEHOLDER_EMAIL: "Adres email",
        REGISTER_TITLE: "Rejestracja",
        REGISTER_SUBTITLE: "Utwórz konto, podaj email, nazwę gracza i wybierz kraj.",
        REGISTER_BUTTON: "Zarejestruj & Połącz Grę",
        PLACEHOLDER_PLAYER: "Nazwa gracza (np. n0sinner)",
        SELECT_COUNTRY: "Wybierz kraj...",
        STATS_KILLS: "Zabicia",
        STATS_DEATHS: "Śmierci",
        STATS_UPDATED: "Dane aktualizowane co 10 minut.",
        ALERT_SUCCESS: "Sukces",
        ALERT_REGISTER_SUCCESS: "Konto prawie gotowe! Sprawdź email, aby aktywować konto.",
        BUTTON_BACK: "Wróć do Logowania",
        LANG_SWITCH: "Zmień język",
    },
    EN: {
        TITLE_MAIN: "Registered Players K/D Leaderboard",
        LOGIN_TITLE: "BF6 Tracker: Login",
        LOGIN_BUTTON: "Login",
        LOGOUT_BUTTON: "Logout",
        REGISTER_GO: "Go to Registration",
        FORGOT_PASS: "Forgot password",
        LOADING: "Loading...",
        PLACEHOLDER_USER: "Username",
        PLACEHOLDER_PASS: "Password",
        PLACEHOLDER_EMAIL: "Email address",
        REGISTER_TITLE: "Registration",
        REGISTER_SUBTITLE: "Create account, provide email, player name, and select country.",
        REGISTER_BUTTON: "Register & Link Game",
        PLACEHOLDER_PLAYER: "Player Name (e.g., n0sinner)",
        SELECT_COUNTRY: "Select country...",
        STATS_KILLS: "Kills",
        STATS_DEATHS: "Deaths",
        STATS_UPDATED: "Data updated every 10 minutes.",
        ALERT_SUCCESS: "Success",
        ALERT_REGISTER_SUCCESS: "Account almost ready! Check your email to activate account.",
        BUTTON_BACK: "Back to Login",
        LANG_SWITCH: "Change Language",
    }
};


// --- Funkcja do konwersji kodu kraju na flagę emoji ---
const countryCodeToEmoji = (code) => {
  if (!code || typeof code !== 'string' || code.length !== 2) return '';
  const upperCode = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upperCode)) return '';
  const codePoints = upperCode.split('').map(char => 127397 + char.charCodeAt());
  try { return String.fromCodePoint(...codePoints); }
  catch (e) { console.warn(`Nie można utworzyć flagi dla kodu: ${code}`, e); return ''; }
}

// Lista krajów dla Pickera
const countryItems = [
    { label: '🇵🇱 Polska', value: 'PL' }, { label: '🇬🇧 Wielka Brytania', value: 'GB' },
    { label: '🇺🇸 Stany Zjednoczone', value: 'US' }, { label: '🇩🇪 Niemcy', value: 'DE' },
    { label: '🇫🇷 Francja', value: 'FR' }, { label: '🇺🇦 Ukraina', value: 'UA' },
    { label: '🇸🇪 Szwecja', value: 'SE' }, { label: '🇳🇴 Norwegia', value: 'NO' },
];


// --- Komponent tła ---
const AuthBackground = React.memo(({ children }) => (
  <ImageBackground source={localBackgroundImage} style={styles.background} resizeMode="cover">
    <View style={styles.overlay}>{children}<Text style={styles.brandingText}>KREHA</Text></View>
  </ImageBackground>
));

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [screen, setScreen] = useState('LOGIN'); 
  const [token, setToken] = useState(null);
  
  // --- STAN JĘZYKA ---
  const [language, setLanguage] = useState('PL'); 

  // Wybieramy tłumaczenia na podstawie aktywnego języka
  const t = useMemo(() => translations[language] || translations.PL, [language]);


  // Stany formularzy
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [countryCode, setCountryCode] = useState(null); 
  const [emailForReset, setEmailForReset] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);


  // Używamy tego useEffect do wczytywania języka z AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
        try {
            const savedLang = await AsyncStorage.getItem('appLanguage');
            if (savedLang) {
                setLanguage(savedLang);
            }
        } catch (e) {
            console.error("Failed to load language:", e);
        }
    };
    loadSettings();

    // Ładowanie stanu autoryzacji
    const checkAuth = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) { setToken(storedToken); await fetchLeaderboard(storedToken); }
      else { setIsLoading(false); }
    };
    checkAuth();
  }, []);
  
  // --- Ustawia i zapisuje język ---
  const setAppLanguage = async (langCode) => {
      setLanguage(langCode);
      await AsyncStorage.setItem('appLanguage', langCode);
  };


  const fetchLeaderboard = async (current_token = token) => {
    if (!current_token) { setIsLoading(false); setScreen('LOGIN'); return; }
    try {
      setIsLoading(true);
      const response = await api.get('/api/leaderboard');
      setLeaderboard(response.data); setScreen('LEADERBOARD');
    } catch (error) {
      console.error('Błąd pobierania drabinki:', error.response?.status || error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert(t.ALERT_SUCCESS, t.ALERT_SESSION_EXPIRED || "Sesja wygasła. Zaloguj się ponownie."); handleLogout();
      } else { Alert.alert(t.ALERT_SUCCESS, t.ALERT_FETCH_FAILED || "Nie udało się pobrać drabinki."); }
    } finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    if (!username || !password || !email || !playerName || !countryCode) {
      Alert.alert(t.ALERT_SUCCESS, "Wszystkie pola są wymagane."); return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) { Alert.alert(t.ALERT_SUCCESS, "Nieprawidłowy format emaila."); return; }

    try {
      setIsLoading(true);
      const platform = 'PC';
      const response = await api.post('/api/register', { username, password, email, playerName, platform, countryCode });
      Alert.alert(t.ALERT_SUCCESS, t.ALERT_REGISTER_SUCCESS); 
      setUsername(''); setEmail(''); setPassword(''); setPlayerName(''); setCountryCode(null); setScreen('LOGIN');
    } catch (error) {
      const errorMessage = error.response?.data?.message || t.ALERT_REGISTER_FAILED;
      Alert.alert(t.ALERT_SUCCESS, errorMessage);
    } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!username || !password) { Alert.alert(t.ALERT_SUCCESS, "Wszystkie pola są wymagane."); return; }
    try {
      setIsLoading(true);
      const response = await api.post('/api/login', { username, password });
      const { token: newToken } = response.data;
      await AsyncStorage.setItem('token', newToken); setToken(newToken); setUsername(''); setPassword('');
      await fetchLeaderboard(newToken);
    } catch (error) {
      if (error.response?.status === 403) { Alert.alert(t.ALERT_SUCCESS, "Konto nieaktywne. Sprawdź email."); }
      else { Alert.alert(t.ALERT_SUCCESS, "Logowanie nie powiodło się. Błędne dane."); }
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!emailForReset) { Alert.alert(t.ALERT_SUCCESS, "Nazwa użytkownika jest wymagana."); return; }
    try {
      setIsLoading(true);
      const response = await api.post('/api/forgot-password', { username: emailForReset });
      Alert.alert(t.ALERT_SUCCESS, response.data.message); setScreen('LOGIN'); setEmailForReset('');
    } catch (error) { Alert.alert(t.ALERT_SUCCESS, "Wystąpił błąd."); } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token'); setToken(null); setLeaderboard([]); setScreen('LOGIN');
  };


  // --- EKRANY RENDERUJĄCE ---

  if (isLoading && screen !== 'LEADERBOARD') {
    return (<View style={styles.loadingScreen}><ActivityIndicator size="large" color="#fff" /><Text style={styles.loadingText}>{t.LOADING}</Text></View>);
  }

  // --- KOMPONENT PRZEŁĄCZNIKA JĘZYKA (Umieszczony na stałe) ---
  const RenderLanguageSwitch = () => (
    <SafeAreaView style={styles.languageToggleContainer}>
        <TouchableOpacity onPress={() => setAppLanguage('PL')} style={styles.langButtonFlag}>
            <Text style={language === 'PL' ? styles.langButtonTextActive : styles.langButtonText}>🇵🇱</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAppLanguage('EN')} style={styles.langButtonFlag}>
            <Text style={language === 'EN' ? styles.langButtonTextActive : styles.langButtonText}>🇬🇧</Text>
        </TouchableOpacity>
    </SafeAreaView>
  );

  // Ekran Logowania
  if (screen === 'LOGIN') {
    return (
      <AuthBackground>
        <Text style={styles.title}>{t.LOGIN_TITLE}</Text>
        <TextInput key="login-username" style={styles.input} placeholder={t.PLACEHOLDER_USER} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#ddd"/>
        <TextInput key="login-password" style={styles.input} placeholder={t.PLACEHOLDER_PASS} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#ddd"/>
        <Button title={t.LOGIN_BUTTON} onPress={handleLogin} color="#007AFF" />
        <View style={styles.separator} />
        <Button title={t.FORGOT_PASS} onPress={() => setScreen('FORGOT_PASSWORD')} color="#aaa" />
        <View style={styles.separator} />
        <Button title={t.REGISTER_GO} onPress={() => setScreen('REGISTER')} color="#4CAF50" />
      </AuthBackground>
    );
  }

  // Ekran Rejestracji
  if (screen === 'REGISTER') {
    return (
      <AuthBackground>
        <Text style={styles.title}>{t.REGISTER_TITLE}</Text>
        <Text style={styles.subtitle}>{t.REGISTER_SUBTITLE}</Text>
        <TextInput key="register-username" style={styles.input} placeholder={t.PLACEHOLDER_USER} value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#ddd"/>
        <TextInput key="register-email" style={styles.input} placeholder={t.PLACEHOLDER_EMAIL} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholderTextColor="#ddd"/>
        <TextInput key="register-password" style={styles.input} placeholder={t.PLACEHOLDER_PASS} value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#ddd"/>
        <TextInput key="register-playername" style={styles.input} placeholder={t.PLACEHOLDER_PLAYER} value={playerName} onChangeText={setPlayerName} autoCapitalize="none" placeholderTextColor="#ddd"/>

        <View style={styles.pickerContainer}>
            <RNPickerSelect
                placeholder={{ label: t.SELECT_COUNTRY, value: null, color: '#9EA0A4' }}
                items={countryItems}
                onValueChange={(value) => setCountryCode(value)}
                style={pickerSelectStyles}
                value={countryCode}
                useNativeAndroidPickerStyle={false}
            />
        </View>

        <Button title={t.REGISTER_BUTTON} onPress={handleRegister} color="#4CAF50" />
        <View style={styles.separator} />
        <Button title={t.BUTTON_BACK} onPress={() => setScreen('LOGIN')} color="#aaa" />
      </AuthBackground>
    );
  }

  // Ekran Resetowania Hasła
  if (screen === 'FORGOT_PASSWORD') {
      return (
        <AuthBackground>
          <Text style={styles.title}>Resetowanie hasła</Text>
          <Text style={styles.subtitle}>Podaj nazwę użytkownika (symulacja).</Text>
          <TextInput key="forgot-username" style={styles.input} placeholder={t.PLACEHOLDER_USER} value={emailForReset} onChangeText={setEmailForReset} autoCapitalize="none" placeholderTextColor="#ddd"/>
          <Button title="Wyślij link" onPress={handleForgotPassword} color="#FF9800" />
          <View style={styles.separator} />
          <Button title={t.BUTTON_BACK} onPress={() => setScreen('LOGIN')} color="#aaa" />
        </AuthBackground>
      );
  }

  // Ekran Drabinki
  if (screen === 'LEADERBOARD') {
    return (
      <ImageBackground source={localBackgroundImage} style={styles.background} resizeMode="cover">
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.leaderboardContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>{t.TITLE_MAIN}</Text>
              <Button title={t.LOGOUT_BUTTON} onPress={handleLogout} color="#FF3B30" />
            </View>
            <LeaderboardList leaderboard={leaderboard} refreshing={isLoading} onRefresh={fetchLeaderboard} t={t} />
            <View style={styles.footer}>
              <Text style={styles.footerText}>{t.STATS_UPDATED}</Text>
            </View>
            <Text style={styles.brandingTextBottom}>KREHA</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (<View style={styles.loadingScreen}><Text style={{color: '#fff'}}>Błąd.</Text><Button title="Zaloguj" onPress={() => setScreen('LOGIN')} /></View>);
}

// Zaktualizowano komponent LeaderboardList
const LeaderboardList = ({ leaderboard, refreshing, onRefresh, t }) => (
    <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.username}
        renderItem={({ item, index }) => {
            let rankStyle = styles.leaderboardRank;
            if (index === 0) rankStyle = [styles.leaderboardRank, styles.goldRank];
            if (index === 1) rankStyle = [styles.leaderboardRank, styles.silverRank];
            if (index === 2) rankStyle = [styles.leaderboardRank, styles.bronzeRank];

            const flag = countryCodeToEmoji(item.country_code);

            return (
              <View style={styles.leaderboardItem}>
                <Text style={rankStyle}>{index + 1}.</Text>
                <Text style={styles.flagEmoji}>{flag || '❓'}</Text>
                <View style={styles.leaderboardNameBlock}>
                    <Text style={styles.leaderboardName}>{item.username}</Text>
                    <Text style={styles.leaderboardPlayerName}>({item.player_name})</Text>
                </View>
                <View style={styles.statsBlock}>
                    <Text style={styles.leaderboardKd}>{item.kd_ratio.toFixed(3)} K/D</Text>
                    <Text style={styles.leaderboardStats}>{t.STATS_KILLS}: {item.total_kills} / {t.STATS_DEATHS}: {item.total_deaths}</Text>
                </View>
              </View>
            );
        }}
        ListEmptyComponent={<View style={styles.emptyList}><Text style={styles.emptyText}>Brak graczy.</Text></View>}
        refreshing={refreshing}
        onRefresh={onRefresh}
        style={styles.list}
    />
);

// --- STYLE ---
const styles = StyleSheet.create({
  loadingScreen: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 10, color: '#fff' },
  background: { flex: 1, width: '100%', height: '100%' },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.65)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  safeArea: { flex: 1 },
  leaderboardContainer: { flex: 1, width: '100%', backgroundColor: 'rgba(0, 0, 0, 0.75)' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)', zIndex: 10, backgroundColor: 'rgba(10, 10, 10, 0.8)' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#E0E0E0', flexShrink: 1, marginRight: 10 },
  subtitle: { fontSize: 14, textAlign: 'center', marginBottom: 20, color: '#B0B0B0' },
  input: { width: '90%', maxWidth: 300, borderWidth: 1, borderColor: '#444', backgroundColor: 'rgba(50, 50, 50, 0.8)', padding: 12, borderRadius: 8, marginBottom: 15, fontSize: 16, color: '#fff' },
  separator: { marginVertical: 10, height: 1, backgroundColor: 'rgba(255, 255, 255, 0.1)', width: '80%' },
  brandingText: { position: 'absolute', bottom: 20, right: 20, fontSize: 14, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.5)' },
  brandingTextBottom: { position: 'absolute', bottom: 10, right: 15, fontSize: 12, fontWeight: 'bold', color: 'rgba(255, 255, 255, 0.3)' },
  list: { width: '100%', flex: 1 },
  leaderboardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, backgroundColor: 'rgba(10, 10, 10, 0.3)', borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.1)', marginBottom: 1 },
  leaderboardRank: { fontSize: 16, fontWeight: 'bold', color: '#E0E0E0', minWidth: 25, textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  goldRank: { color: '#FFD700', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  silverRank: { color: '#C0C0C0' },
  bronzeRank: { color: '#CD7F32' },
  flagEmoji: { fontSize: 18, marginLeft: 8 },
  leaderboardNameBlock: { flex: 1, paddingHorizontal: 8 },
  leaderboardName: { fontSize: 16, fontWeight: 'bold', color: '#fff', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  leaderboardPlayerName: { fontSize: 12, color: '#aaa', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  statsBlock: { alignItems: 'flex-end', minWidth: 110 },
  leaderboardKd: { fontSize: 16, fontWeight: 'bold', color: '#2ecc71', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  leaderboardStats: { fontSize: 10, color: '#B0B0B0', marginTop: 2, textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  emptyList: { alignItems: 'center', padding: 50, backgroundColor: 'rgba(0,0,0,0.5)' },
  emptyText: { color: '#aaa', textAlign: 'center' },
  footer: { padding: 10, borderTopWidth: 1, borderColor: 'rgba(255, 255, 255, 0.1)', alignItems: 'center', backgroundColor: 'transparent' },
  footerText: { fontSize: 12, color: '#aaa', textShadowColor: 'rgba(0, 0, 0, 0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  
  // Nowe style dla przełącznika języka
  langSwitchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      backgroundColor: 'rgba(10, 10, 10, 0.8)',
      padding: 5,
      borderRadius: 10,
  },
  langSwitchLabel: {
      color: '#fff',
      marginRight: 10,
      fontSize: 14,
  },
  langButton: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
      marginHorizontal: 5,
      backgroundColor: 'transparent',
  },
  langButtonActive: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 5,
      marginHorizontal: 5,
      backgroundColor: '#007AFF', // Aktywny kolor
      borderWidth: 1,
      borderColor: '#fff',
  },
  langButtonText: {
      color: '#fff',
      fontWeight: 'bold',
  },

  // Style dla RNPickerSelect
  pickerContainer: {
    width: '90%',
    maxWidth: 300,
    marginBottom: 15,
  },
});

// Oddzielne style dla RNPickerSelect
const pickerSelectStyles = StyleSheet.create({
  inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#444', borderRadius: 8, color: 'white', paddingRight: 30, backgroundColor: 'rgba(50, 50, 50, 0.8)' },
  inputAndroid: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#444', borderRadius: 8, color: 'white', paddingRight: 30, backgroundColor: 'rgba(50, 50, 50, 0.8)' },
  placeholder: { color: '#ddd' },
  iconContainer: { top: Platform.OS === 'ios' ? 10 : 15, right: 15 },
});
