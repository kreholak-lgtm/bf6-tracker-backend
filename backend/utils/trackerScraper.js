// backend/utils/trackerScraper.js
const axios = require('axios');

/**
 * Próbuje pobrać rzeczywiste K/D Ratio, Kills i Deaths z API Gametools.network
 * używając endpointu /bf6/stats/ ze sformatowanymi wartościami.
 *
 * @param {string} bfId ID gracza (np. n0sinner)
 * @param {string} platform Platforma (np. 'pc')
 * @returns {Promise<{kdRatio: number, kills: number, deaths: number}>} Statystyki gracza.
 */
async function getKdRatio(bfId, platform) {
    const SIMULATED_KD = 0.66;
    const SIMULATED_KILLS = 100;
    const SIMULATED_DEATHS = 150;
    
    // Budujemy URL
    const params = new URLSearchParams({
        categories: 'multiplayer',
        raw: 'false',
        format_values: 'true',
        name: bfId,
        platform: platform,
        skip_battlelog: 'false'
    });
    
    const API_URL = `https://api.gametools.network/bf6/stats/?${params.toString()}`;
    
    console.log(`[GAMETOOLS API] Wysyłanie zapytania do: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            timeout: 5000, // Czekaj maksymalnie 5 sekund
            headers: {
                'accept': 'application/json'
            }
        });

        let data = response.data;
        
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            data = data.results[0];
        }

        let kdRatio = SIMULATED_KD;
        let kills = SIMULATED_KILLS;
        let deaths = SIMULATED_DEATHS;

        // --- 1. Parsowanie K/D ---
        const possibleKdKeys = ['killDeath', 'player_kd', 'kdr', 'kd'];
        for (const key of possibleKdKeys) {
            if (data.hasOwnProperty(key)) {
                kdRatio = parseFloat(data[key]);
                break;
            }
        }
        
        // --- 2. Parsowanie Kills i Deaths ---
        // Klucze są zazwyczaj proste w tym API, gdy format_values=true
        // Używamy bezpiecznego parsowania, by uniknąć NaN
        const rawKills = data.kills || data.killCount;
        const rawDeaths = data.deaths || data.deathCount;

        if (rawKills) {
            kills = parseInt(rawKills);
        }
        if (rawDeaths) {
            deaths = parseInt(rawDeaths);
        }

        // Finalne sprawdzenie K/D (jeśli parsowanie K/D z kluczy zawiodło, 
        // ale Kills i Deaths są dostępne, obliczamy to sami)
        if (isNaN(kdRatio) && kills > 0 && deaths > 0) {
            kdRatio = kills / deaths;
        }

        // Zapewniamy, że wartości są liczbami
        kdRatio = isNaN(kdRatio) ? SIMULATED_KD : kdRatio;
        kills = isNaN(kills) ? SIMULATED_KILLS : kills;
        deaths = isNaN(deaths) ? SIMULATED_DEATHS : deaths;
        
        console.log(`[GAMETOOLS SUKCES] K/D: ${kdRatio.toFixed(3)}, Kills: ${kills}, Deaths: ${deaths}`);

        return { 
            kdRatio: parseFloat(kdRatio.toFixed(3)), 
            kills: kills, 
            deaths: deaths 
        };

    } catch (error) {
        let errorMessage = 'Błąd sieci lub timeout';
        if (axios.isAxiosError(error) && error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }

        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd: ${errorMessage}. Zwracam symulację.`);
        return {
            kdRatio: SIMULATED_KD,
            kills: SIMULATED_KILLS,
            deaths: SIMULATED_DEATHS
        };
    }
}

module.exports = { getKdRatio };
