import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import axios from 'axios';
import i18n from '../constants/i18n';
import { useAuth } from '../context/AuthContext';

// --- KLUCZOWE USTAWIENIE: ADRES BACKENDU ---
const API_URL = 'http://192.168.1.102:3000/api'; 
// --- KONIEC USTAWIEŃ ---

const LeaderboardScreen = ({ navigation }) => {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout } = useAuth(); // We need logout to be available

  // Function to fetch data from our API /api/leaderboard
  const fetchLeaderboard = useCallback(async () => {
    try {
        setLoading(true);
        // GET request to the public leaderboard endpoint
        const response = await axios.get(`${API_URL}/leaderboard`);
        
        // Add position (index + 1)
        const rankedList = response.data.leaderboard.map((item, index) => ({
            ...item,
            position: index + 1,
        }));
        setLeaderboard(rankedList);
    } catch (error) {
        console.error("Error fetching leaderboard:", error);
        // Alert.alert(i18n.t('error'), i18n.t('error'));
    } finally {
        setLoading(false);
        setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLeaderboard();
  };
  
  // Component to display a single player in the ranking
  const renderItem = ({ item }) => (
    <View style={styles.item}>
      <Text style={[styles.cell, styles.position]}>#{item.position}</Text>
      <Text style={styles.cell}>{item.bf_id}</Text>
      <Text style={styles.cellPlatform}>{item.platform}</Text>
      <Text style={[styles.cell, styles.kdRatio]}>K/D: {item.kd_ratio.toFixed(3)}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {loading && leaderboard.length === 0 ? (
        <ActivityIndicator size="large" color="#007AFF" style={styles.loading} />
      ) : (
        <View style={{flex: 1}}>
            <View style={styles.header}>
                <Text style={[styles.headerCell, styles.position]}>{i18n.t('position')}</Text>
                <Text style={styles.headerCell}>{i18n.t('bfId')}</Text>
                <Text style={styles.headerCellPlatform}>{i18n.t('platform')}</Text>
                <Text style={[styles.headerCell, styles.kdRatio]}>{i18n.t('kdRatio')}</Text>
            </View>

            <FlatList
                data={leaderboard}
                renderItem={renderItem}
                keyExtractor={(item, index) => index.toString()}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} />
                }
                style={styles.list}
            />
            {/* Przycisk do Logiki Wylogowania / Profilu (umieszczony na dole) */}
            <View style={styles.bottomBar}>
                <TouchableOpacity 
                    style={styles.profileLink} 
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Text style={styles.linkText}>{i18n.t('profileTitle')}</Text>
                </TouchableOpacity>
                 <TouchableOpacity 
                    style={[styles.profileLink, styles.logoutButton]} 
                    onPress={logout}
                >
                    <Text style={styles.linkText}>{i18n.locale.startsWith('pl') ? 'Wyloguj' : 'Logout'}</Text>
                </TouchableOpacity>
            </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f0f0' },
    loading: { marginTop: 50 },
    list: { paddingHorizontal: 10, flex: 1 },
    header: { flexDirection: 'row', backgroundColor: '#d0d0d0', padding: 10, borderBottomWidth: 1, borderColor: '#ccc', marginTop: 5, borderRadius: 5, marginHorizontal: 10 },
    headerCell: { fontWeight: 'bold', fontSize: 14, flex: 1, textAlign: 'center' },
    headerCellPlatform: { fontWeight: 'bold', fontSize: 14, flex: 0.7, textAlign: 'center' },
    item: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee', backgroundColor: '#fff', borderRadius: 5, marginTop: 4, marginHorizontal: 10, elevation: 1 },
    cell: { flex: 1, fontSize: 14, textAlign: 'center' },
    position: { flex: 0.5, fontWeight: 'bold' },
    cellPlatform: { flex: 0.7, fontSize: 14, textAlign: 'center', color: '#666' },
    kdRatio: { flex: 0.8, fontWeight: 'bold', color: '#007AFF' },
    bottomBar: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#ccc', backgroundColor: '#fff' },
    profileLink: { 
        padding: 10, 
        backgroundColor: '#007AFF', 
        borderRadius: 8, 
        flex: 1, 
        marginHorizontal: 5, 
        alignItems: 'center'
    },
    logoutButton: {
        backgroundColor: '#dc3545', // Red for logout
    },
    linkText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14
    }
});

export default LeaderboardScreen;
