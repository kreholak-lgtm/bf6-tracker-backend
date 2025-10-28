// mobile-app/App.js
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator, FlatList, Alert, ImageBackground, TouchableOpacity, ScrollView, Platform } from 'react-native'; // Dodano Platform
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select'; // Import biblioteki

// Ładujemy obraz tła LOKALNIE
const localBackgroundImage = require('./assets/battlefield_bg.jpg');

// Adres IP serwera backend
const API_BASE_URL = 'http://192.168.1.100:3000';

const api = axios.create({ baseURL: API_BASE_URL });
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  }, (error) => Promise.reject(error)
);

// --- Funkcja do konwersji kodu kraju na flagę emoji ---
const countryCodeToEmoji = (code) => {
  if (!code || typeof code !== 'string' || code.length !== 2) return '';
  const upperCode = code.toUpperCase();
  if (!/^[A-Z]{2}$/.test(upperCode)) return '';
  const codePoints = upperCode.split('').map(char => 127397 + char.charCodeAt());
  try { return String.fromCodePoint(...codePoints); }
  catch (e) { console.warn(`Nie można utworzyć flagi dla kodu: ${code}`, e); return ''; }
}

// Lista krajów dla Pickera (label: Nazwa, value: Kod)
const countryItems = [
    { label: '🇵🇱 Polska', value: 'PL' },
    { label: '🇬🇧 Wielka Brytania', value: 'GB' },
    { label: '🇺🇸 Stany Zjednoczone', value: 'US' },
    { label: '🇩🇪 Niemcy', value: 'DE' },
    { label: '🇫🇷 Francja', value: 'FR' },
    { label: '🇺🇦 Ukraina', value: 'UA' },
    { label: '🇸🇪 Szwecja', value: 'SE' },
    { label: '🇳🇴 Norwegia', value: 'NO' },
    // Możesz dodać więcej krajów
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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [countryCode, setCountryCode] = useState(null); // Zmieniono na null dla Pickera
  const [emailForReset, setEmailForReset] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    const checkAuth = async () => {
      const storedToken = await AsyncStorage.getItem('token');
      if (storedToken) { setToken(storedToken); await fetchLeaderboard(storedToken); }
      else { setIsLoading(false); }
    };
    checkAuth();
  }, []);

  const fetchLeaderboard = async (current_token = token) => {
    if (!current_token) { setIsLoading(false); setScreen('LOGIN'); return; }
    try {
      setIsLoading(true);
      const response = await api.get('/api/leaderboard');
      setLeaderboard(response.data); setScreen('LEADERBOARD');
    } catch (error) {
      console.error('Błąd pobierania drabinki:', error.response?.status || error.message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        Alert.alert('Sesja wygasła', 'Zaloguj się ponownie.'); handleLogout();
      } else { Alert.alert('Błąd', 'Nie udało się pobrać drabinki.'); }
    } finally { setIsLoading(false); }
  };

  const handleRegister = async () => {
    // Walidacja - sprawdź czy countryCode zostało wybrane
    if (!username || !password || !playerName || !countryCode) {
      Alert.alert('Błąd', 'Wszystkie pola (w tym wybór kraju) są wymagane.'); return;
    }
    // Dalsza walidacja (np. długość kodu) nie jest już potrzebna, bo wybieramy z listy
    try {
      setIsLoading(true);
      const platform = 'PC';
      const response = await api.post('/api/register', { username, password, playerName, platform, countryCode });
      Alert.alert('Sukces', 'Konto utworzone.'); setUsername(''); setPassword(''); setPlayerName(''); setCountryCode(null); setScreen('LOGIN');
    } catch (error) {
      console.error('Błąd rejestracji:', error.response?.data || error.message);
      const errorMessage = error.response?.data?.message || 'Rejestracja nie powiodła się.';
      Alert.alert('Błąd', errorMessage);
    } finally { setIsLoading(false); }
  };

  const handleLogin = async () => {
    if (!username || !password) { Alert.alert('Błąd', 'Nazwa użytkownika i hasło są wymagane.'); return; }
    try {
      setIsLoading(true);
      const response = await api.post('/api/login', { username, password });
      const { token: newToken } = response.data;
      await AsyncStorage.setItem('token', newToken); setToken(newToken); setUsername(''); setPassword('');
      await fetchLeaderboard(newToken);
    } catch (error) {
      console.error('Błąd logowania:', error.response?.data || error.message);
      Alert.alert('Błąd', 'Logowanie nie powiodło się.');
    } finally { setIsLoading(false); }
  };

  const handleForgotPassword = async () => {
    if (!emailForReset) { Alert.alert('Błąd', 'Nazwa użytkownika jest wymagana.'); return; }
    try {
      setIsLoading(true);
      const response = await api.post('/api/forgot-password', { username: emailForReset });
      Alert.alert('Gotowe', response.data.message); setScreen('LOGIN'); setEmailForReset('');
    } catch (error) {
      console.error('Błąd resetowania hasła:', error.response?.data || error.message);
      Alert.alert('Błąd', 'Wystąpił błąd.');
    } finally { setIsLoading(false); }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token'); setToken(null); setLeaderboard([]); setScreen('LOGIN');
  };

  if (isLoading && screen !== 'LEADERBOARD') {
    return (<View style={styles.loadingScreen}><ActivityIndicator size="large" color="#fff" /><Text style={styles.loadingText}>Ładowanie...</Text></View>);
  }

  if (screen === 'LOGIN') {
    return (
      <AuthBackground>
        <Text style={styles.title}>BF6 Tracker: Logowanie</Text>
        <TextInput key="login-username" style={styles.input} placeholder="Nazwa użytkownika" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#ddd"/>
        <TextInput key="login-password" style={styles.input} placeholder="Hasło" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#ddd"/>
        <Button title="Zaloguj" onPress={handleLogin} color="#007AFF" />
        <View style={styles.separator} />
        <Button title="Zapomniałem hasła" onPress={() => setScreen('FORGOT_PASSWORD')} color="#aaa" />
        <View style={styles.separator} />
        <Button title="Przejdź do Rejestracji" onPress={() => setScreen('REGISTER')} color="#4CAF50" />
      </AuthBackground>
    );
  }

  if (screen === 'REGISTER') {
    return (
      <AuthBackground>
        <Text style={styles.title}>Rejestracja</Text>
        <Text style={styles.subtitle}>Utwórz konto, podaj nazwę gracza i wybierz kraj.</Text>
        <TextInput key="register-username" style={styles.input} placeholder="Nazwa użytkownika" value={username} onChangeText={setUsername} autoCapitalize="none" placeholderTextColor="#ddd"/>
        <TextInput key="register-password" style={styles.input} placeholder="Hasło" value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#ddd"/>
        <TextInput key="register-playername" style={styles.input} placeholder="Nazwa gracza (np. n0sinner)" value={playerName} onChangeText={setPlayerName} autoCapitalize="none" placeholderTextColor="#ddd"/>

        {/* --- ZMIANA TUTAJ: Zamiast TextInput i ScrollView, używamy RNPickerSelect --- */}
        <View style={styles.pickerContainer}>
            <RNPickerSelect
                placeholder={{ label: "Wybierz kraj...", value: null, color: '#9EA0A4' }}
                items={countryItems}
                onValueChange={(value) => setCountryCode(value)}
                style={pickerSelectStyles}
                value={countryCode}
                useNativeAndroidPickerStyle={false} // Dla spójnego wyglądu na Androidzie
            />
        </View>
        {/* -------------------------------------------------------------------------- */}

        <Button title="Zarejestruj & Połącz Grę" onPress={handleRegister} color="#4CAF50" />
        <View style={styles.separator} />
        <Button title="Wróć do Logowania" onPress={() => setScreen('LOGIN')} color="#aaa" />
      </AuthBackground>
    );
  }

  if (screen === 'FORGOT_PASSWORD') {
      return (
        <AuthBackground>
          <Text style={styles.title}>Resetowanie hasła</Text>
          <Text style={styles.subtitle}>Podaj nazwę użytkownika (symulacja).</Text>
          <TextInput key="forgot-username" style={styles.input} placeholder="Nazwa użytkownika" value={emailForReset} onChangeText={setEmailForReset} autoCapitalize="none" placeholderTextColor="#ddd"/>
          <Button title="Wyślij link" onPress={handleForgotPassword} color="#FF9800" />
          <View style={styles.separator} />
          <Button title="Wróć do Logowania" onPress={() => setScreen('LOGIN')} color="#aaa" />
        </AuthBackground>
      );
  }

  if (screen === 'LEADERBOARD') {
    return (
      <ImageBackground source={localBackgroundImage} style={styles.background} resizeMode="cover">
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.leaderboardContainer}>
            <View style={styles.header}>
              <Text style={styles.title}>Drabinka K/D Zarejestrowanych Graczy</Text>
              <Button title="Wyloguj" onPress={handleLogout} color="#FF3B30" />
            </View>
            <LeaderboardList leaderboard={leaderboard} refreshing={isLoading} onRefresh={fetchLeaderboard}/>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Dane aktualizowane co 10 minut.</Text>
            </View>
            <Text style={styles.brandingTextBottom}>KREHA</Text>
          </View>
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (<View style={styles.loadingScreen}><Text style={{color: '#fff'}}>Błąd.</Text><Button title="Zaloguj" onPress={() => setScreen('LOGIN')} /></View>);
}

// Przywrócono wyświetlanie flagi emoji
const LeaderboardList = ({ leaderboard, refreshing, onRefresh }) => (
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
                    <Text style={styles.leaderboardStats}>Z: {item.total_kills} / Ś: {item.total_deaths}</Text>
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
  // ... (reszta stylów bez zmian, poza usunięciem sampleCodes*) ...
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
  // Usunięto sampleCodesLabel, sampleCodesScroll, codeButton, codeButtonText

  // Nowe style dla RNPickerSelect
  pickerContainer: {
    width: '90%',
    maxWidth: 300,
    marginBottom: 15,
  },
});

// Oddzielne style dla RNPickerSelect (wymagane przez bibliotekę)
const pickerSelectStyles = StyleSheet.create({
  inputIOS: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    color: 'white',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  inputAndroid: {
    fontSize: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    color: 'white',
    paddingRight: 30, // to ensure the text is never behind the icon
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  placeholder: {
    color: '#ddd',
  },
  iconContainer: { // Styl dla strzałki w dół
    top: Platform.OS === 'ios' ? 10 : 15,
    right: 15,
  },
});

