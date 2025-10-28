import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import i18n from '../constants/i18n';

// --- KLUCZOWE USTAWIENIE: ADRES BACKENDU ---
const API_URL = 'http://192.168.1.102:3000/api'; 
// UWAGA: Logika logowania jest w AuthContext, ale API_URL jest tu dla kontekstu
// --- KONIEC USTAWIEŃ ---

const LoginScreen = ({ navigation }) => {
  const { login, isLoading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(i18n.t('error'), i18n.t('required'));
      return;
    }
    
    // Sprawdź, czy serwer działa
    if (isLoading) return; 

    const result = await login(email, password);
    
    if (result.success) {
        // Logowanie powiodło się, App.js automatycznie przejdzie na Leaderboard
        // Alert.alert(i18n.t('success'), i18n.t('loginTitle'));
    } else {
        // Komunikat o błędzie z serwera (np. Nieprawidłowy login/hasło)
        Alert.alert(i18n.t('error'), result.message || i18n.t('error'));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{i18n.t('loginTitle')}</Text>

      {/* Pole Email */}
      <TextInput
        style={styles.input}
        placeholder={i18n.t('email')}
        placeholderTextColor="#666"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      {/* Pole Hasło */}
      <TextInput
        style={styles.input}
        placeholder={i18n.t('password')}
        placeholderTextColor="#666"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Przycisk Logowania */}
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={isLoading}>
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>{i18n.t('loginButton')}</Text>
        )}
      </TouchableOpacity>
      
      {/* Przycisk do Rejestracji */}
      <TouchableOpacity style={styles.link} onPress={() => navigation.navigate('Register')}>
        <Text style={styles.linkText}>{i18n.t('registerTitle')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0', justifyContent: 'center' },
    title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#007AFF' },
    input: { width: '100%', padding: 15, backgroundColor: '#fff', borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ccc' },
    button: { width: '100%', padding: 15, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center', marginTop: 10 },
    buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
    link: { marginTop: 20, alignItems: 'center' },
    linkText: { color: '#007AFF', fontSize: 16 },
});

export default LoginScreen;
