import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- KLUCZOWE USTAWIENIE: ADRES BACKENDU ---
const API_URL = 'http://192.168.1.102:3000/api'; 
// --- KONIEC USTAWIEŃ ---

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [userToken, setUserToken] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // ----------------------------------------------------
    // 1. Logika Rejestracji
    // ----------------------------------------------------
    const register = async (email, password, bf_id, platform) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_URL}/register`, {
                email, password, bf_id, platform
            });
            
            setIsLoading(false);
            return { success: true, message: response.data.message };

        } catch (e) {
            const msg = e.response?.data?.error || 'Server registration error.';
            setError(msg);
            setIsLoading(false);
            return { success: false, message: msg };
        }
    };

    // ----------------------------------------------------
    // 2. Logika Logowania
    // ----------------------------------------------------
    const login = async (email, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const token = response.data.token;

            // Save token in local storage
            await AsyncStorage.setItem('userToken', token);
            setUserToken(token);
            
            setIsLoading(false);
            return { success: true };
            
        } catch (e) {
            const msg = e.response?.data?.error || 'Server login error.';
            setError(msg);
            setIsLoading(false);
            return { success: false, message: msg };
        }
    };

    // ----------------------------------------------------
    // 3. Logika Wylogowania
    // ----------------------------------------------------
    const logout = async () => {
        setIsLoading(true);
        await AsyncStorage.removeItem('userToken');
        setUserToken(null);
        setIsLoading(false);
    };

    // Check token on app start (Hydration)
    useEffect(() => {
        const checkLoginStatus = async () => {
            try {
                const token = await AsyncStorage.getItem('userToken');
                if (token) {
                    setUserToken(token);
                }
            } catch (e) {
                console.error("Error reading token:", e);
            } finally {
                setIsLoading(false);
            }
        };
        checkLoginStatus();
    }, []);

    return (
        <AuthContext.Provider value={{ userToken, isLoading, error, register, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
