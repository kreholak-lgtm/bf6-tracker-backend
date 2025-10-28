// mobile-app/screens/ProfileScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import axios from 'axios';
import i18n from '../constants/i18n';
import { useAuth } from '../context/AuthContext';

// --- KLUCZOWE USTAWIENIE: ADRES BACKENDU ---
const API_URL = 'http://192.168.1.102:3000/api'; 
// --- KONIEC USTAWIEŃ ---

const ProfileScreen = ({ navigation }) => {
  const { userToken, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
        if (!userToken) {
            // Jeśli token zniknie, wyloguj i wróć do logowania
            logout();
            return;
        }

        try {
            const response = await axios.get(`${API_URL}/profile`, {
                headers: {
                    'Authorization': `Bearer ${userToken}` 
                }
            });
            setProfile(response.data.profile);
        } catch (error) {
            console.error("Błąd pobierania profilu:", error.message);
            // W przypadku błędu autoryzacji (401/403) wyloguj
            if (error.response?.status === 401 || error.response?.status === 403) {
                Alert.alert(i18n.t('error'), i18n.locale.startsWith('pl') ? 'Sesja wygasła. Zaloguj się ponownie.' : 'Session expired. Please log in again.');
                logout(); 
            } else {
                 Alert.alert(i18n.t('error'), i18n.t('error'));
            }
        } finally {
            setLoading(false);
        }
    };

    fetchProfile();
  }, [userToken, logout]);

  if (loading || !profile) {
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>{i18n.t('loading')}</Text>
        </View>
    );
  }

  // Bezpieczne formatowanie K/D: używamy 0.000 jeśli K/D jest null/undefined
  const formattedKdRatio = ((parseFloat(profile.kd_ratio) || 0)).toFixed(3);

  return (
    <View style={styles.container}>
      
      <Text style={styles.header}>{profile.bf_id || '---'}</Text>
      <Text style={styles.subHeader}>{i18n.t('profileTitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{i18n.t('email')}:</Text>
        <Text style={styles.value}>{profile.email}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{i18n.t('platform')}:</Text>
        <Text style={styles.value}>{profile.platform}</Text>
      </View>
      <View style={styles.cardPrimary}>
        <Text style={styles.labelPrimary}>{i18n.t('kdRatio')}:</Text>
        <Text style={styles.valuePrimary}>{formattedKdRatio}</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>
            {i18n.locale.startsWith('pl') ? 'Wyloguj się' : 'Logout'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate('Leaderboard')}>
        <Text style={styles.backText}>
            {i18n.locale.startsWith('pl') ? 'Powrót do drabinki' : 'Back to Leaderboard'}
        </Text>
      </TouchableOpacity>

    </View>
  );
};

const styles = StyleSheet.create({
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 16, color: '#007AFF' },
    container: { flex: 1, padding: 20, backgroundColor: '#f0f0f0' },
    header: { fontSize: 32, fontWeight: 'bold', marginBottom: 5, color: '#007AFF', textAlign: 'center' },
    subHeader: { fontSize: 18, color: '#666', marginBottom: 30, textAlign: 'center' },
    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, flexDirection: 'row', justifyContent: 'space-between' },
    cardPrimary: { backgroundColor: '#007AFF', padding: 20, borderRadius: 8, marginBottom: 20, elevation: 5, flexDirection: 'row', justifyContent: 'space-between' },
    label: { fontSize: 16, color: '#666' },
    value: { fontSize: 18, fontWeight: 'bold', color: '#000' },
    labelPrimary: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    valuePrimary: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
    logoutButton: { backgroundColor: '#dc3545', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30, elevation: 2 },
    logoutText: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    backButton: { backgroundColor: '#ccc', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    backText: { color: '#333', fontWeight: 'bold', fontSize: 14 }
});

export default ProfileScreen;
