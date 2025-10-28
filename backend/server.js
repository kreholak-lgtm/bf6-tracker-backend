Gemini
Tło z Battlefield 6
Battlefield Tournament Organizer App
Engaging Conversation Starters Online
Flirty Replies For A Mystery
Tworzenie aplikacji Battlefield 6 z rankingiem
Poszukiwanie Piosenki "Chłopaki Nie Płaczą"
Prośba o doprecyzowanie stylu
GBP to USD Currency Conversion
Buying Real World Assets Crypto
Toilet Overfill Image Request
Federico Dadu Trial Outcome
Piddington Wood Walks Information
Battlefield 6 Drabinka Turniejowa JPG
Ready to Assist: Essay, Code, Game
Profitably Building Pi Network Apps
Pi Node Application Submitted Successfully
Natychmiastowe Działanie: Co Zrobić?
Mrożenie Grzybów: Porady i Zasady
Hyundai Tucson 2025 Lead Time Inquiry
Bolete Mushroom Identification and Caution
Mushroom Identification: Milkcap or Brittlegill?
C9: Grzyb czy program?
Spokojne lasy w okolicach Stokenchurch
Filmowe propozycje dla rodziny
The Babadook Streaming Availability
Leczenie tłuszczaków pod skórą
Kawa na siwe włosy: naturalne przyciemnianie
Nietypowy balsam do włosów: analiza składu
Tiger Balm Not For Hair
Liść laurowy na włosy: Korzyści i Stosowanie
Camille ARAM Build Guide
Herbata z swirrku - literówka?
Rozmowa z Gemini
Stworz background z battlefield 6

Jasne, oto tło z Battlefield 6:
Obraz: 

Stworz ekran powitalny do mojej aplikacji battlefield 6

Z pewnością, oto ekran powitalny dla Twojej aplikacji Battlefield 6:
Obraz: 

Usun te winter 2042 dodaj cos o kompetycji

Jasne, oto poprawiony ekran powitalny z usuniętym "COMING WINTER 2042" i dodatkowym tekstem o rywalizacji:
Obraz: 

Usun te press any button

Nie ma problemu! Oto ekran powitalny bez napisu "Press any button to start":
Obraz: 

To nie sa postacie z battlefield 6 tylko z 2042 zmien na bf6

Masz rację, przepraszam za pomyłkę. Zmieniłem postacie na bardziej zgodne z estetyką Battlefield 6, usuwając odniesienia do 2042.
Obraz: 

// backend/utils/trackerScraper.js

const axios = require('axios');



/**

 * Filtruje i wyciąga statystykę o danej nazwie z surowego formatu 'playerStats'.

 * Ten format jest używany przez niskopoziomowe API EA.

 * @param {Array} categories Tablica kategorii z JSON.

 * @param {string} statName Nazwa szukanej statystyki (np. 'human_kills_total').

 * @param {string} scope Zakres ('global' lub nazwa GameMode).

 * @returns {number | null} Znaleziona wartość lub null.

 */

function extractRawStat(categories, statName, scope = 'global') {

    if (!categories || !Array.isArray(categories)) return null;



    for (const cat of categories) {

        if (cat.catFields && Array.isArray(cat.catFields)) {

            const statEntry = cat.catFields.find(field =>

                field.name === statName &&

                field.fields &&

                field.fields.value === scope

            );

            if (statEntry && typeof statEntry.value === 'number') {

                return statEntry.value;

            }

        }

    }

    return null;

}



/**

 * Próbuje pobrać rzeczywiste K/D Ratio z API Gametools.network.

 *

 * Scenariusz 1 (Ustrukturyzowany): API zwraca ustrukturyzowane klucze (kdr, player_kd, killDeath).

 * Scenariusz 2 (Robustny): API zwraca surowe dane playerStats, które wymagają obliczeń.

 *

 * @param {string} bfId ID gracza (np. n0sinner)

 * @param {string} platform Platforma (ignorowane)

 * @returns {Promise<number | null>} Rzeczywiste K/D Ratio lub wartość symulowana w przypadku błędu.

 */

async function getKdRatio(bfId, platform) {

    // Awaryjna, znana wartość K/D (z danych Tracker.gg)

    const SIMULATED_KD = 0.66;

    // Używamy POPRAWNEGO formatu URL: 'bf2042' i tylko 'name'

    const API_URL = `https://api.gametools.network/bf2042/player/?name=${encodeURIComponent(bfId)}`;

   

    console.log(`[GAMETOOLS API] Pobieranie K/D z: ${API_URL}`);



    try {

        const response = await axios.get(API_URL, {

            timeout: 5000

        });



        let data = response.data;

        let kdRatio = null;

        let finalData = data; // Domyślnie używamy głównego obiektu



        // --- Obsługa zagnieżdżenia: Użycie 'results' ---

        if (data.results && Array.isArray(data.results) && data.results.length > 0) {

            finalData = data.results[0];

        }



        // --- Scenariusz 2: Niskopoziomowe dane surowe (obliczenia) ---

        if (data.playerStats && Array.isArray(data.playerStats) && data.playerStats.length > 0) {

           

            const playerStats = data.playerStats[0].categories;

            const kills = extractRawStat(playerStats, 'human_kills_total');

            const deaths = extractRawStat(playerStats, 'deaths_total');



            if (typeof kills === 'number' && typeof deaths === 'number' && deaths > 0) {

                 kdRatio = kills / deaths;

                 console.log(`[GAMETOOLS SUKCES] K/D obliczone z surowych statystyk: ${kills}/${deaths} = ${kdRatio.toFixed(3)}`);

                 return parseFloat(kdRatio.toFixed(3));

            }

        }





        // --- Scenariusz 1: Parsowanie K/D z kluczy ustrukturyzowanych ---

        const possibleKdKeys = ['player_kd', 'kdr', 'kd', 'killDeath'];

        let rawKdValue = null;



        for (const key of possibleKdKeys) {

             if (finalData.hasOwnProperty(key)) {

                rawKdValue = finalData[key];

                break;

            }

        }

       

        if (rawKdValue) {

            kdRatio = parseFloat(rawKdValue);

           

            if (!isNaN(kdRatio)) {

                 console.log(`[GAMETOOLS SUKCES] Znaleziono ustrukturyzowane K/D: ${kdRatio}`);

            }

        }

        // --- Koniec Parsowania ---



        if (isNaN(kdRatio) || kdRatio === null) {

            console.error(`[GAMETOOLS BŁĄD] Parsowanie K/D zawiodło. Powrót do symulacji ${SIMULATED_KD}.`);

            return SIMULATED_KD;

        }



        return parseFloat(kdRatio.toFixed(3));



    } catch (error) {

        // Obsługa błędów sieciowych i HTTP (np. 422, 500, timeout)

        let errorMessage = error.message;

        if (error.response) {

             errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;

        }

       

        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd podczas pobierania. Powrót do symulacji ${SIMULATED_KD}. Szczegóły: ${errorMessage}`);

        return SIMULATED_KD;

    }

}



module.exports = { getKdRatio };

Otrzymałem kod. Jest to solidny scraper dla API Gametools, który dobrze radzi sobie z dwoma różnymi formatami odpowiedzi (surowymi i ustrukturyzowanymi) oraz zawiera niezbędną obsługę błędów i timeout.

Zauważyłem jednak jeden kluczowy problem logiczny w funkcji getKdRatio oraz okazję do uproszczenia kodu.

Problem: Twój kod sprawdza surowe statystyki (data.playerStats) na oryginalnym obiekcie data, ale ustrukturyzowane klucze (jak kdr) sprawdza na obiekcie finalData (który może być zagnieżdżonym data.results[0]). Jeśli API zwróci surowe statystyki wewnątrz obiektu results, Twój kod ich nie znajdzie.

Oto poprawiona i uproszczona wersja funkcji getKdRatio, która rozwiązuje ten problem i nadaje priorytet dokładniejszym obliczeniom (surowe statystyki) przed ustrukturyzowanymi.

💡 Sugerowany Refaktoring
Poniższy kod zastępuje Twoją funkcję getKdRatio. Funkcja extractRawStat pozostaje bez zmian.

JavaScript
// backend/utils/trackerScraper.js
// ... (funkcja extractRawStat pozostaje bez zmian)

/**
 * Próbuje pobrać rzeczywiste K/D Ratio z API Gametools.network.
 *
 * Scenariusz 1 (Robustny/Preferowany): Oblicza K/D z surowych danych (kills / deaths).
 * Scenariusz 2 (Ustrukturyzowany): API zwraca gotową wartość (kdr, player_kd).
 *
 * @param {string} bfId ID gracza (np. n0sinner)
 * @param {string} platform Platforma (ignorowane)
 * @returns {Promise<number | null>} Rzeczywiste K/D Ratio lub wartość symulowana w przypadku błędu.
 */
async function getKdRatio(bfId, platform) {
    const SIMULATED_KD = 0.66;
    const API_URL = `https://api.gametools.network/bf2042/player/?name=${encodeURIComponent(bfId)}`;
    
    console.log(`[GAMETOOLS API] Pobieranie K/D z: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            timeout: 5000 
        });

        let data = response.data;
        let finalData = data; // Domyślnie używamy głównego obiektu

        // --- Obsługa zagnieżdżenia: Użycie 'results' ---
        // Jeśli odpowiedź jest zagnieżdżona (np. z wyszukiwania), bierzemy pierwszy wynik
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            finalData = data.results[0];
        }

        // --- Scenariusz 1: Niskopoziomowe dane surowe (obliczenia) ---
        // ZAWSZE sprawdzamy 'finalData'
        // Nadajemy temu priorytet, ponieważ obliczenie Kills/Deaths jest dokładniejsze.
        if (finalData.playerStats && Array.isArray(finalData.playerStats) && finalData.playerStats.length > 0) {
            
            const playerStats = finalData.playerStats[0].categories;
            const kills = extractRawStat(playerStats, 'human_kills_total');
            const deaths = extractRawStat(playerStats, 'deaths_total');

            if (typeof kills === 'number' && typeof deaths === 'number' && deaths > 0) {
                const kdRatio = kills / deaths;
                console.log(`[GAMETOOLS SUKCES] K/D obliczone z surowych statystyk: ${kills}/${deaths} = ${kdRatio.toFixed(3)}`);
                return parseFloat(kdRatio.toFixed(3));
            }
        }

        // --- Scenariusz 2: Parsowanie K/D z kluczy ustrukturyzowanych ---
        // Wykonywane tylko, jeśli Scenariusz 1 zawiódł.
        const possibleKdKeys = ['player_kd', 'kdr', 'kd', 'killDeath'];

        for (const key of possibleKdKeys) {
            // ZAWSZE sprawdzamy 'finalData'
            if (finalData.hasOwnProperty(key)) {
                const rawKdValue = finalData[key];
                const kdRatio = parseFloat(rawKdValue);
                
                if (!isNaN(kdRatio)) {
                    console.log(`[GAMETOOLS SUKCES] Znaleziono ustrukturyzowane K/D (klucz: ${key}): ${kdRatio}`);
                    return parseFloat(kdRatio.toFixed(3));
                }
            }
        }

        // --- Błąd: Nie znaleziono żadnych danych K/D ---
        console.error(`[GAMETOOLS BŁĄD] Parsowanie K/D zawiodło (nie znaleziono kluczy ani surowych statystyk). Powrót do symulacji ${SIMULATED_KD}.`);
        return SIMULATED_KD;

    } catch (error) {
        // Obsługa błędów sieciowych i HTTP (np. 422, 500, timeout)
        let errorMessage = error.message;
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        
        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd podczas pobierania. Powrót do symulacji ${SIMULATED_KD}. Szczegóły: ${errorMessage}`);
        return SIMULATED_KD;
    }
}

module.exports = { getKdRatio };
Kluczowe zmiany:
Poprawiona logika wyszukiwania: Obie próby (surowe statystyki i klucze ustrukturyzowane) są teraz wykonywane na tym samym obiekcie finalData. Gwarantuje to znalezienie statystyk, nawet jeśli są zagnieżdżone w tablicy results.

Priorytet dla surowych danych: Kod najpierw próbuje obliczyć K/D (Kills / Deaths), ponieważ jest to najbardziej precyzyjna wartość. Dopiero jeśli to się nie uda, szuka gotowych, ustrukturyzowanych kluczy (jak kdr).

Uproszczony przepływ: Funkcja używa teraz return natychmiast po znalezieniu prawidłowej wartości. Eliminuje to potrzebę dodatkowych zmiennych (jak rawKdValue) i końcowego sprawdzania isNaN(kdRatio) || kdRatio === null. Jeśli kod dotrze do końca bloku try, oznacza to, że nic nie znaleziono i zwraca symulację.

Czy chciałbyś przejrzeć lub zrefaktoryzować inną część swojego kodu?

tworzylismy aplikacje w visual studio code chce ja dokonczyc nie moglismy pobierac danych z tracker gg ale znalezlismy inne rozwiazanie

Rozumiem. Mamy gotowy i działający scraper (trackerScraper.js), który łączy się z gametools.network, aby pobrać K/D ratio dla Battlefield 2042.

Teraz musimy zintegrować ten scraper z główną logiką Twojej aplikacji. Zakładając, że Twój backend jest oparty na Express.js (co jest typowe dla folderu backend/), następnym krokiem jest stworzenie punktu końcowego API (endpointu), który frontend będzie mógł wywołać, aby uzyskać te dane.

🔌 Integracja Scrapera z Serwerem Express
Oto jak możesz użyć funkcji getKdRatio w głównym pliku serwera (np. backend/server.js lub backend/index.js).

Zaimportuj scraper: Musisz zaimportować funkcję getKdRatio z pliku, który stworzyliśmy.

Stwórz endpoint API: Stworzymy endpoint, np. /api/stats/:bfId, który przyjmie ID gracza z adresu URL.

Wywołaj funkcję: Wewnątrz endpointu wywołamy await getKdRatio() i odeślemy wynik w formacie JSON.

Oto przykładowy kod dla Twojego głównego pliku serwera:

JavaScript
// backend/server.js
const express = require('express');
const cors = require('cors'); // Ważne dla komunikacji frontend-backend
const { getKdRatio } = require('./utils/trackerScraper'); // Importujemy naszą funkcję

const app = express();
const PORT = process.env.PORT || 3001; // Użyj portu 3001

// Włącz CORS, aby Twoja aplikacja frontendowa (np. z portu 3000) mogła się komunikować
app.use(cors());
app.use(express.json());

/**
 * GŁÓWNY ENDPOINT API DO POBIERANIA STATYSTYK
 * * Przykład wywołania z frontendu:
 * fetch('http://localhost:3001/api/stats/n0sinner')
 */
app.get('/api/stats/:bfId', async (req, res) => {
    try {
        const { bfId } = req.params;
        console.log(`[SERWER] Otrzymano żądanie statystyk dla gracza: ${bfId}`);

        // Używamy naszej funkcji scrapera. 
        // Platforma jest ignorowana przez scraper, ale możemy ją przekazać dla spójności.
        const kd = await getKdRatio(bfId, 'pc'); 

        // Sprawdzamy, czy kd nie jest null (chociaż scraper zwraca SIMULATED_KD w razie błędu)
        if (kd === null) {
            throw new Error('Nie udało się pobrać K/D');
        }

        // Odpowiedź sukcesu: wysyłamy dane jako JSON
        res.status(200).json({
            playerId: bfId,
            kdRatio: kd
        });

    } catch (error) {
        console.error(`[SERWER BŁĄD] Nie udało się przetworzyć żądania dla ${req.params.bfId}: ${error.message}`);
        // Odpowiedź błędu
        res.status(500).json({
            message: "Wystąpił błąd podczas pobierania statystyk",
            error: error.message
        });
    }
});


// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`[SERWER] Uruchomiony na http://localhost:${PORT}`);
});
Co robi ten kod?
Tworzy serwer: Używa Express do uruchomienia serwera na porcie 3001.

Włącza CORS: app.use(cors()) jest kluczowe. Pozwala to Twojej aplikacji frontendowej (działającej na innym porcie, np. 3000) wysyłać żądania do tego serwera.

Definiuje trasę (Endpoint): app.get('/api/stats/:bfId', ...) nasłuchuje na żądania. :bfId to dynamiczny parametr – cokolwiek wpiszesz po /api/stats/, zostanie przechwycone jako req.params.bfId.

Pobiera dane: const kd = await getKdRatio(bfId, 'pc'); wywołuje kod z trackerScraper.js i czeka na wynik.

Zwraca JSON: res.status(200).json(...) wysyła z powrotem obiekt JSON, który Twój frontend może łatwo odczytać.

Aby to uruchomić w VS Code, otwórz terminal i wpisz:

Bash
# Jeśli nie masz zainstalowanych zależności
npm install express cors

# Uruchom serwer
node backend/server.js
Czy chcesz teraz zająć się stroną frontendową (np. w React lub czystym JS), aby pobrać i wyświetlić te dane z API?

{

"userId": 1004728639994, "avatar": "https://eaavatarservice.akamaized.net/production/avatar/prod/userAvatar/20946667/416x416.JPEG", "userName": "n0sinner", "id": 1844339774, "platform": "pc", "platformId": 0, "weapons": [ { "type": "Machine Guns", "weaponName": "L110", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_Minimi_PKG_Factory_MED-0e29fce7.webp", "id": "mg_l110", "kills": 249, "damage": 34239, "bodyKills": 216, "headshotKills": 33, "hipfireKills": 0, "multiKills": 34, "accuracy": "10.01%", "killsPerMinute": 0.9, "damagePerMinute": 123.24, "headshots": "13.25%", "hitVKills": 5.29, "shotsHit": 1318, "shotsFired": 13173, "scopedKills": 249, "spawns": 356, "timeEquipped": 16669 },

{ "type": "SMG-PDWs", "weaponName": "PW5A3", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_MP5MLI_PKG_Factory_MED-2d1944b7.webp", "id": "smg_pw5a3", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Assault Rifles", "weaponName": "M433", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_HK433_PKG_Factory_MED-b06f02f7.webp", "id": "ar_m433", "kills": 16, "damage": 2006, "bodyKills": 14, "headshotKills": 2, "hipfireKills": 0, "multiKills": 3, "accuracy": "15.77%", "killsPerMinute": 0.83, "damagePerMinute": 104.03, "headshots": "12.5%", "hitVKills": 5.31, "shotsHit": 85, "shotsFired": 539, "scopedKills": 16, "spawns": 22, "timeEquipped": 1157 },

{ "type": "Machine Guns", "weaponName": "RPKM", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_RPKM_PKG_Factory_MED-755b785f.webp", "id": "mg_rpkm", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Shotguns", "weaponName": "M87A1", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_590A1_PKG_Factory_MED-4b387330.webp", "id": "sg_m87a1", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Pistols", "weaponName": "P18", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_M18_PKG_Factory_MED-88261bf8.webp", "id": "pst_p18", "kills": 4, "damage": 230, "bodyKills": 4, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "20.75%", "killsPerMinute": 1.03, "damagePerMinute": 58.97, "headshots": "0.0%", "hitVKills": 2.75, "shotsHit": 11, "shotsFired": 53, "scopedKills": 4, "spawns": 473, "timeEquipped": 234 },

{ "type": "Carbines", "weaponName": "M277", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_XM7_PKG_Factory_MED-26271094.webp", "id": "crb_x277", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Assault Rifles", "weaponName": "B36A4", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_G36_PKG_Factory_MED-fb5466ec.webp", "id": "ar_b36a4", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Assault Rifles", "weaponName": "L85A3", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_L85A3_PKG_Factory_MED-9bd0deaa.webp", "id": "ar_l85a3", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Rifles", "weaponName": "M2010 ESR", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_M2010ESR_PKG_Factory_MED-f94fdae6.webp", "id": "snp_m2010", "kills": 6, "damage": 1195, "bodyKills": 5, "headshotKills": 1, "hipfireKills": 0, "multiKills": 0, "accuracy": "13.04%", "killsPerMinute": 0.34, "damagePerMinute": 68.61, "headshots": "16.67%", "hitVKills": 0.5, "shotsHit": 3, "shotsFired": 23, "scopedKills": 6, "spawns": 23, "timeEquipped": 1045 },

{ "type": "Shotguns", "weaponName": "M1014", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_M1014_PKG_Factory_MED-e011854a.webp", "id": "sg_m1014", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "Carbines", "weaponName": "AK-205", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_AK205_PKG_Factory_MED-6d376081.webp", "id": "crb_ak205", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "DMRs", "weaponName": "SVK-8.6", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_SVCh_PKG_Factory_MED-bb06d385.webp", "id": "dmr_svk86", "kills": 0, "damage": 0, "bodyKills": 0, "headshotKills": 0, "hipfireKills": 0, "multiKills": 0, "accuracy": "0.0%", "killsPerMinute": 0, "damagePerMinute": 0, "headshots": "0.0%", "hitVKills": 0, "shotsHit": 0, "shotsFired": 0, "scopedKills": 0, "spawns": 0, "timeEquipped": 0 },

{ "type": "SMG-PDWs", "weaponName": "SGX", "image": "https://cdn.gametools.network/weapons/bf6/T_UI_MPX_PKG_Factory_MED-e822f017.webp", "id": "smg_sgx", "kills": 31, "damage": 3823, "bodyKills": 29, "headshotKills": 2, "hipfireKills": 0, "multiKills": 3, "accuracy": "14.71%", "killsPerMinute": 0.87, "damagePerMinute": 107.39, "headshots": "6.45%", "hitVKills": 5.55, "shotsHit": 172, "shotsFired": 1169, "scopedKills": 31, "spawns": 43, "timeEquipped": 2136 }

], "maps": [ { "mapName": "Siege of Cairo", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Abbasid_Large_OPT-49a3761a.webp", "id": "mpabbasid", "wins": 3, "losses": 3, "matches": 6, "winPercent": "50.0%", "secondsPlayed": 7572 },

{ "mapName": "Empire State", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Aftermath_Large_OPT-bf883df1.webp", "id": "mpaftermath", "wins": 0, "losses": 1, "matches": 1, "winPercent": "0.0%", "secondsPlayed": 408 },

{ "mapName": "Iberian Offensive", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Battery_Large_OPT-034d4636.webp", "id": "mpbattery", "wins": 2, "losses": 2, "matches": 4, "winPercent": "50.0%", "secondsPlayed": 2060 },

{ "mapName": "Liberation Peak", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Capstone_Large_OPT-2ccae694.webp", "id": "mpcapstone", "wins": 1, "losses": 1, "matches": 2, "winPercent": "50.0%", "secondsPlayed": 4497 },

{ "mapName": "Manhattan Bridge", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Dumbo_Large_OPT-20de031f.webp", "id": "mpdumbo", "wins": 1, "losses": 2, "matches": 3, "winPercent": "33.33%", "secondsPlayed": 3145 },

{ "mapName": "Operation Firestorm", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Firestorm_Large_OPT-45d582ad.webp", "id": "mpfirestorm", "wins": 4, "losses": 4, "matches": 8, "winPercent": "50.0%", "secondsPlayed": 7421 },

{ "mapName": "Saints Quarter", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Limestone_Large_OPT-c9160897.webp", "id": "mplimestone", "wins": 0, "losses": 0, "matches": 0, "winPercent": "0.0%", "secondsPlayed": 0 },

{ "mapName": "New Sobek City", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Outskirts_Large_OPT-bf08f756.webp", "id": "mpoutskirts", "wins": 2, "losses": 4, "matches": 6, "winPercent": "33.33%", "secondsPlayed": 6748 },

{ "mapName": "Mirak Valley", "image": "https://cdn.gametools.network/maps/bf6/T_UI_Tungsten_Large_OPT-935da06b.webp", "id": "mptungsten", "wins": 3, "losses": 1, "matches": 4, "winPercent": "75.0%", "secondsPlayed": 5649 }

], "vehicles": [ { "type": "Air Combat", "vehicleName": "Panthera KHT", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_Eurocopter_VSD0001-8003028d.webp", "id": "air_panthera", "kills": 0, "killsPerMinute": 0, "damage": 0, "spawns": 0, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 0, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 0, "destroyed": 0, "timeIn": 0 },

{ "type": "Air Combat", "vehicleName": "M77E Falchion", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_AH64E_VSD0001-dd0a7df6.webp", "id": "air_m77efalchio", "kills": 0, "killsPerMinute": 0, "damage": 0, "spawns": 0, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 0, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 0, "destroyed": 0, "timeIn": 0 },

{ "type": "Ground Combat", "vehicleName": "Leo A4", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_Leopard_VSD0001-f8da51ee.webp", "id": "sur_leoa4", "kills": 0, "killsPerMinute": 0, "damage": 0, "spawns": 0, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 7, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 588, "destroyed": 0, "timeIn": 5 },

{ "type": "Ground Combat", "vehicleName": "Strf 09 A4", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_CV90_VSD0001-acd942b6.webp", "id": "sur_strf09a4", "kills": 4, "killsPerMinute": 0.87, "damage": 341, "spawns": 15, "roadKills": 0, "passengerAssists": 9, "multiKills": 0, "distanceTraveled": 446, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 9, "damageTo": 1976, "destroyed": 0, "timeIn": 275 },

{ "type": "Ground Combat", "vehicleName": "M1A2 SEPv3", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_Abrams_VSD0001-5412a78d.webp", "id": "sur_m1a2sepv3", "kills": 0, "killsPerMinute": 0, "damage": 37, "spawns": 3, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 18, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 6620, "destroyed": 1, "timeIn": 35 },

{ "type": "Ground Combat", "vehicleName": "Cheetah 1A2", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_Gepard_VSD0001-d796732f.webp", "id": "sur_cheetah1a2", "kills": 0, "killsPerMinute": 0, "damage": 0, "spawns": 0, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 0, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 0, "destroyed": 0, "timeIn": 0 },

{ "type": "Ground Combat", "vehicleName": "Glider 96", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_MDV_Flyer60_VSD0005-1569869f.webp", "id": "sur_glider96", "kills": 0, "killsPerMinute": 0, "damage": 92, "spawns": 1, "roadKills": 0, "passengerAssists": 0, "multiKills": 0, "distanceTraveled": 1732, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 0, "damageTo": 950, "destroyed": 0, "timeIn": 168 },

{ "type": "Ground Combat", "vehicleName": "M3A3 Bradley", "image": "https://cdn.gametools.network/vehicles/bf6/T_UI_OB_VEH_Tank_Bradley_VSD0001_Dressing-66f252ca.webp", "id": "sur_bradley", "kills": 4, "killsPerMinute": 0.86, "damage": 1007, "spawns": 14, "roadKills": 0, "passengerAssists": 1, "multiKills": 0, "distanceTraveled": 1269, "driverAssists": 0, "vehiclesDestroyedWith": 0, "assists": 1, "damageTo": 0, "destroyed": 0, "timeIn": 279 }

], "classes": [ { "className": "Assault", "image": "https://cdn.gametools.network/classes/bf6/white/Assault.svg", "altImage": "https://cdn.gametools.network/classes/bf6/black/Assault.svg", "id": "assault", "kills": 23, "deaths": 51, "kpm": 0.61, "killDeath": 0.45, "spawns": 54, "score": 4725, "assists": 14, "secondsPlayed": 2268 },

{ "className": "Engineer", "image": "https://cdn.gametools.network/classes/bf6/white/Engineer.svg", "altImage": "https://cdn.gametools.network/classes/bf6/black/Engineer.svg", "id": "engineer", "kills": 55, "deaths": 77, "kpm": 0.82, "killDeath": 0.71, "spawns": 83, "score": 21320, "assists": 52, "secondsPlayed": 4004 },

{ "className": "Support", "image": "https://cdn.gametools.network/classes/bf6/white/Support.svg", "altImage": "https://cdn.gametools.network/classes/bf6/black/Support.svg", "id": "support", "kills": 255, "deaths": 302, "kpm": 0.84, "killDeath": 0.84, "spawns": 325, "score": 88965, "assists": 202, "secondsPlayed": 18201 },

{ "className": "Recon", "image": "https://cdn.gametools.network/classes/bf6/white/Recon.svg", "altImage": "https://cdn.gametools.network/classes/bf6/black/Recon.svg", "id": "recon", "kills": 9, "deaths": 11, "kpm": 0.95, "killDeath": 0.82, "spawns": 11, "score": 2160, "assists": 7, "secondsPlayed": 570 }

], "bestClass": "Support", "humanPrecentage": "86.55%", "kills": 342, "deaths": 441, "wins": 16, "loses": 18, "killsPerMinute": 0.55, "damagePerMinute": 0, "killsPerMatch": 10.06, "damagePerMatch": 0, "headShots": 40, "winPercent": "47.06%", "headshots": "11.7%", "killDeath": 0.78, "infantryKillDeath": 0.67, "damage": 0, "timePlayed": "10:25:00", "accuracy": "11.21%", "revives": 114, "heals": 1507, "resupplies": 168, "repairs": 0, "squadmateRevive": 22, "thrownThrowables": 16, "inRound": { "revives": 33, "resupplies": 35, "spotAssists": 2, "thrownThrowables": 22, "playerTakeDowns": 0 }, "gadgetsDestoyed": 10, "playerTakeDowns": 0, "matchesPlayed": 34, "secondsPlayed": 37500, "dividedSecondsPlayed": { "flying": 0, "driving": 183 }, "saviorKills": 84, "shotsFired": 16398, "shotsHit": 1839, "killAssists": 285, "vehiclesDestroyed": 2, "enemiesSpotted": 18, "dividedKills": { "ads": 321, "grenades": 1, "hipfire": 0, "longDistance": 100, "melee": 0, "multiKills": 42, "passenger": 6, "vehicle": 10, "roadkills": 0, "human": 296, "weapons": { "SMG": 35, "LMG": 0, "DMR": 0, "Shotguns": 0, "Assault Rifles": 0 }, "inRound": { "total": 26, "grenade": 1, "headshots": 4, "melee": 0, "multiKills": 7, "weapons": { "SMG": 16, "AR": 7, "DMR": 0 }

}

}, "devidedDamage": { "passenger": 637, "vehicleDriver": 989, "toVehicle": 10434, "inRound": { "asVehicle": 907 }

}, "devidedAssists": { "driver": 0, "passenger": 10, "spot": 6, "pilot": 0, "inRound": { "total": 18 }

}, "distanceTraveled": { "foot": 44765, "passenger": 2723, "vehicle": 3952 }, "sector": { "captured": 14 }, "objective": { "time": { "total": 3850, "attacked": 515, "defended": 2906 }, "armed": 0, "captured": 25, "neutralized": 17, "defused": 0, "destroyed": 0, "inRound": { "armed": 0, "captured": 3, "neutralized": 6, "defused": 0, "destroyed": 0 }

}, "XP": [ { "total": 452695, "performance": 120145, "accolades": 15150 }

]

}

Ta odpowiedź została przez Ciebie zatrzymana
Curl



curl -X 'GET' \ 'https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=n0sinner&platform=pc&skip_battlelog=false' \ -H 'accept: application/json'

Request URL

https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=n0sinner&platform=pc&skip_battlelog=false

Ta odpowiedź została przez Ciebie zatrzymana
uzyjmy tego do pobierania kd

Świetnie, to bardzo dobra zmiana. Użycie tego endpointu (/bf6/stats/) jest znacznie lepsze, ponieważ:

Odpytuje bezpośrednio o "BF6" (co pasuje do Twojej aplikacji), a nie "BF2042".

Parametry raw=false i format_values=true oznaczają, że powinniśmy otrzymać czyste, ustrukturyzowane dane.

Pozwala nam to drastycznie uprościć nasz plik trackerScraper.js. Nie potrzebujemy już skomplikowanej funkcji extractRawStat, ponieważ nie będziemy ręcznie obliczać K/D z surowych danych.

♻️ Zaktualizowany kod: backend/utils/trackerScraper.js
Oto w pełni zaktualizowany plik trackerScraper.js, który wykorzystuje podany przez Ciebie adres URL. Zastąp całą zawartość tego pliku poniższym kodem.

JavaScript
// backend/utils/trackerScraper.js
const axios = require('axios');

/**
 * Próbuje pobrać rzeczywiste K/D Ratio z API Gametools.network
 * używając endpointu /bf6/stats/ ze sformatowanymi wartościami.
 *
 * @param {string} bfId ID gracza (np. n0sinner)
 * @param {string} platform Platforma (np. 'pc')
 * @returns {Promise<number | null>} Rzeczywiste K/D Ratio lub wartość symulowana w przypadku błędu.
 */
async function getKdRatio(bfId, platform) {
    // Awaryjna, znana wartość K/D
    const SIMULATED_KD = 0.66;
    
    // Budujemy URL na podstawie Twojego żądania, używając URLSearchParams
    const params = new URLSearchParams({
        categories: 'multiplayer',
        raw: 'false',
        format_values: 'true',
        name: bfId,
        platform: platform,
        skip_battlelog: 'false'
    });
    
    const API_URL = `https://api.gametools.network/bf6/stats/?${params.toString()}`;
    
    console.log(`[GAMETOOLS API] Pobieranie K/D (BF6) z: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            timeout: 5000,
            headers: {
                'accept': 'application/json' // Nagłówek z Twojego cURL
            }
        });

        // W tym trybie API, 'data' powinna być głównym obiektem statystyk
        let data = response.data;
        let kdRatio = null;

        // Na wszelki wypadek, gdyby API zwróciło listę (np. przy nieprecyzyjnym 'name')
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            data = data.results[0];
        }

        // --- Parsowanie K/D z kluczy ustrukturyzowanych ---
        // Szukamy kluczy w głównym obiekcie. 'killDeath' jest najbardziej prawdopodobny.
        const possibleKdKeys = ['killDeath', 'player_kd', 'kdr', 'kd'];
        let rawKdValue = null;

        for (const key of possibleKdKeys) {
            if (data.hasOwnProperty(key)) {
                rawKdValue = data[key];
                console.log(`[GAMETOOLS] Znaleziono klucz '${key}' o wartości: ${rawKdValue}`);
                break;
            }
        }
        
        if (rawKdValue !== null) {
            // API może zwrócić sformatowaną wartość jako string (np. "1.23")
            // lub jako liczbę (np. 1.23). parseFloat poradzi sobie z oboma.
            kdRatio = parseFloat(rawKdValue);
            
            if (!isNaN(kdRatio)) {
                console.log(`[GAMETOOLS SUKCES] Sparsowano K/D: ${kdRatio.toFixed(3)}`);
                return parseFloat(kdRatio.toFixed(3));
            } else {
                console.error(`[GAMETOOLS BŁĄD] Wartość K/D nie jest liczbą: ${rawKdValue}`);
            }
        } else {
             console.warn(`[GAMETOOLS OSTRZEŻENIE] Nie znaleziono żadnego ze znanych kluczy K/D w odpowiedzi.`);
             // Dziennikuj odpowiedź, aby zobaczyć, jakie klucze otrzymaliśmy
             console.log("[GAMETOOLS ODPOWIEDŹ] Otrzymane klucze:", Object.keys(data));
        }

        // --- Błąd: Nie znaleziono ---
        console.error(`[GAMETOOLS BŁĄD] Parsowanie K/D zawiodło. Powrót do symulacji ${SIMULATED_KD}.`);
        return SIMULATED_KD;

    } catch (error) {
        // Obsługa błędów sieciowych i HTTP
        let errorMessage = error.message;
        if (error.response) {
            // Błąd 404 (Not Found) jest powszechny, jeśli gracz nie istnieje
            if (error.response.status === 404) {
                errorMessage = `HTTP 404: Gracz '${bfId}' na platformie '${platform}' nie znaleziony.`;
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        }
        
        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd podczas pobierania. Powrót do symulacji ${SIMULATED_KD}. Szczegóły: ${errorMessage}`);
        return SIMULATED_KD;
    }
}

module.exports = { getKdRatio };
Co się zmieniło:
Usunięto extractRawStat: Ta funkcja nie jest już potrzebna, ponieważ raw=false załatwia sprawę.

Zaktualizowano getKdRatio:

Używa teraz nowego adresu URL .../bf6/stats/... ze wszystkimi parametrami, które podałeś.

Używa URLSearchParams do czystego budowania adresu URL.

Przekazuje teraz platform do API (wcześniej była ignorowana).

Logika została uproszczona i szuka tylko ustrukturyzowanych kluczy (jak killDeath), co jest znacznie szybsze i czystsze.

Dodałem lepszą obsługę błędów na wypadek, gdyby gracz nie został znaleziony (błąd 404).

Dobra wiadomość jest taka, że plik backend/server.js, który napisaliśmy wcześniej, nie wymaga żadnych zmian. Nadal wywołuje getKdRatio(bfId, 'pc'), a zaktualizowana funkcja zajmie się resztą.

Czy chcesz teraz przetestować ten endpoint i zająć się stroną frontendową (React/JS), aby wyświetlić te dane?

 ERROR  Error fetching leaderboard: [AxiosError: Network Error]

 ERROR  Error fetching leaderboard: [AxiosError: Network Error]

Ten błąd (AxiosError: Network Error) to klasyczny problem.

W 99% przypadków oznacza to, że próbujesz wywołać API api.gametools.network bezpośrednio z Twojej aplikacji frontendowej (np. z kodu React lub JavaScript działającego w przeglądarce).

Przeglądarki internetowe blokują takie żądania ze względów bezpieczeństwa (nazywa się to CORS - Cross-Origin Resource Sharing).

💡 Rozwiązanie (Architektura Proxy)
Nie możesz wywoływać api.gametools.network bezpośrednio z frontendu. Musisz użyć swojego serwera backendowego (pliku server.js, który stworzyliśmy) jako pośrednika (proxy).

Przepływ danych musi wyglądać tak:

Frontend (React/JS) wysyła żądanie do Twojego własnego serwera: fetch('http://localhost:3001/api/stats/n0sinner')

Twój Backend (server.js) odbiera to żądanie.

Twój Backend (server.js) wywołuje getKdRatio(), które łączy się z api.gametools.network.

api.gametools.network zwraca dane do Twojego backendu (to jest dozwolone, bo to komunikacja serwer-serwer).

Twój Backend (server.js) wysyła dane z powrotem do Twojego frontendu.

Jak powinien wyglądać Twój kod na frontendzie
Zakładając, że używasz Reacta lub podobnego frameworka, Twój kod do pobierania danych powinien wyglądać tak:

ŹLE ❌ (Powoduje błąd "Network Error")

JavaScript
// Prawdopodobnie robisz to teraz:
const bfId = 'n0sinner';
const platform = 'pc';
// BEZPOŚREDNIE wywołanie API Gametools z frontendu (ZABLOKOWANE)
const url = `https://api.gametools.network/bf6/stats/?name=${bfId}&platform=${platform}...`;
axios.get(url); 
DOBRZE ✅ (Używa Twojego backendu jako proxy)

JavaScript
// frontend/src/App.js (lub podobny)

async function fetchStats(playerName) {
    try {
        // 1. Użyj nazwy gracza w URL
        const bfId = encodeURIComponent(playerName);
        
        // 2. Wywołaj WŁASNY backend (na porcie 3001)
        const response = await axios.get(`http://localhost:3001/api/stats/${bfId}`);
        
        // 3. Odbierz dane z własnego backendu
        const stats = response.data; // np. { playerId: 'n0sinner', kdRatio: 0.66 }
        
        console.log('Otrzymane statystyki:', stats.kdRatio);
        // Tutaj ustawiasz state w React, np. setKd(stats.kdRatio)
        
    } catch (error) {
        console.error('Błąd podczas pobierania statystyk z własnego backendu:', error);
    }
}

// Przykład wywołania
fetchStats('n0sinner');
Upewnij się, że Twój serwer backend/server.js jest uruchomiony (node backend/server.js) w jednym terminalu, a aplikacja frontendowa w drugim (npm start).

daj mi nowe skrypty do wszystkiego w backend

Jasne, oto kompletne, gotowe do uruchomienia skrypty dla Twojego backendu.

Cały backend składa się z dwóch plików JavaScript oraz zależności, które musisz zainstalować.

📦 1. Zależności (Instalacja)
Zanim uruchomisz serwer, musisz zainstalować express, cors i axios. Otwórz terminal w folderze głównym projektu i wpisz:

Bash
npm install express cors axios
📜 2. Plik Scrapera (Logika API)
Ten plik łączy się z Gametools i wyciąga K/D ratio.

Ścieżka: backend/utils/trackerScraper.js

JavaScript
// backend/utils/trackerScraper.js
const axios = require('axios');

/**
 * Próbuje pobrać rzeczywiste K/D Ratio z API Gametools.network
 * używając endpointu /bf6/stats/ ze sformatowanymi wartościami.
 *
 * @param {string} bfId ID gracza (np. n0sinner)
 * @param {string} platform Platforma (np. 'pc')
 * @returns {Promise<number | null>} Rzeczywiste K/D Ratio lub wartość symulowana w przypadku błędu.
 */
async function getKdRatio(bfId, platform) {
    // Awaryjna, znana wartość K/D
    const SIMULATED_KD = 0.66;
    
    // Budujemy URL na podstawie Twojego żądania, używając URLSearchParams
    const params = new URLSearchParams({
        categories: 'multiplayer',
        raw: 'false',
        format_values: 'true',
        name: bfId,
        platform: platform,
        skip_battlelog: 'false'
    });
    
    const API_URL = `https://api.gametools.network/bf6/stats/?${params.toString()}`;
    
    console.log(`[GAMETOOLS API] Pobieranie K/D (BF6) z: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            timeout: 5000, // Czekaj maksymalnie 5 sekund
            headers: {
                'accept': 'application/json'
            }
        });

        // W tym trybie API, 'data' powinna być głównym obiektem statystyk
        let data = response.data;
        let kdRatio = null;

        // Na wszelki wypadek, gdyby API zwróciło listę
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            data = data.results[0];
        }

        // --- Parsowanie K/D z kluczy ustrukturyzowanych ---
        const possibleKdKeys = ['killDeath', 'player_kd', 'kdr', 'kd'];
        let rawKdValue = null;

        for (const key of possibleKdKeys) {
            if (data.hasOwnProperty(key)) {
                rawKdValue = data[key];
                console.log(`[GAMETOOLS] Znaleziono klucz '${key}' o wartości: ${rawKdValue}`);
                break;
            }
        }
        
        if (rawKdValue !== null) {
            kdRatio = parseFloat(rawKdValue);
            
            if (!isNaN(kdRatio)) {
                console.log(`[GAMETOOLS SUKCES] Sparsowano K/D: ${kdRatio.toFixed(3)}`);
                return parseFloat(kdRatio.toFixed(3));
            } else {
                console.error(`[GAMETOOLS BŁĄD] Wartość K/D nie jest liczbą: ${rawKdValue}`);
            }
        } else {
             console.warn(`[GAMETOOLS OSTRZEŻENIE] Nie znaleziono żadnego ze znanych kluczy K/D w odpowiedzi.`);
        }

        // --- Błąd: Nie znaleziono ---
        console.error(`[GAMETOOLS BŁĄD] Parsowanie K/D zawiodło. Powrót do symulacji ${SIMULATED_KD}.`);
        return SIMULATED_KD;

    } catch (error) {
        // Obsługa błędów sieciowych i HTTP
        let errorMessage = error.message;
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage = `HTTP 404: Gracz '${bfId}' na platformie '${platform}' nie znaleziony.`;
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        }
        
        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd podczas pobierania. Powrót do symulacji ${SIMULATED_KD}. Szczegóły: ${errorMessage}`);
        return SIMULATED_KD;
    }
}

module.exports = { getKdRatio };
🖥️ 3. Plik Serwera (Pośrednik/Proxy)
Ten plik uruchamia serwer, który nasłuchuje na żądania z Twojego frontendu, a następnie bezpiecznie wywołuje getKdRatio.

Ścieżka: backend/server.js

JavaScript
// backend/server.js
const express = require('express');
const cors = require('cors'); // Ważne dla komunikacji frontend-backend
const { getKdRatio } = require('./utils/trackerScraper'); // Importujemy naszą funkcję

const app = express();
const PORT = process.env.PORT || 3001; // Użyj portu 3001

// Włącz CORS, aby Twój frontend (np. z portu 3000) mógł się komunikować
app.use(cors());
app.use(express.json());

/**
 * GŁÓWNY ENDPOINT API DO POBIERANIA STATYSTYK
 * Twój frontend powinien wywoływać ten adres:
 * fetch('http://localhost:3001/api/stats/NAZWA_GRACZA')
 */
app.get('/api/stats/:bfId', async (req, res) => {
    try {
        const { bfId } = req.params;
        // Na razie domyślnie używamy platformy 'pc'
        const platform = 'pc'; 
        
        console.log(`[SERWER] Otrzymano żądanie statystyk dla gracza: ${bfId} (platforma: ${platform})`);

        // Używamy naszej funkcji scrapera
        const kd = await getKdRatio(bfId, platform); 

        // Odpowiedź sukcesu: wysyłamy dane jako JSON
        res.status(200).json({
            playerId: bfId,
            platform: platform,
            kdRatio: kd
        });

    } catch (error) {
        console.error(`[SERWER BŁĄD] Nie udało się przetworzyć żądania dla ${req.params.bfId}: ${error.message}`);
        // Odpowiedź błędu
        res.status(500).json({
            message: "Wystąpił błąd podczas pobierania statystyk",
            error: error.message
        });
    }
});


// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`[SERWER] Uruchomiony na http://localhost:${PORT}`);
    console.log(`[SERWER] Oczekuje na żądania pod adresem: http://localhost:${PORT}/api/stats/:bfId`);
});
🚀 Jak to uruchomić
Upewnij się, że masz strukturę folderów backend/server.js i backend/utils/trackerScraper.js.

Uruchom komendę npm install express cors axios w głównym folderze.

Uruchom serwer za pomocą komendy:

Bash
node backend/server.js
Twój backend jest teraz gotowy. Twój frontend powinien teraz wysyłać żądania do http://localhost:3001/api/stats/NAZWA_GRACZA, aby uniknąć błędu Network Error.

nie mam server.js w backend

Rozumiem. Ten plik nie pojawi się automatycznie. Musisz go stworzyć ręcznie.

Kod, który podałem w poprzedniej wiadomości pod nagłówkiem "🖥️ 3. Plik Serwera (Pośrednik/Proxy)", to jest właśnie zawartość, która ma się znaleźć w tym nowym pliku.

Oto jak to zrobić krok po kroku w VS Code:

🛠️ Jak stworzyć plik server.js
W panelu "Eksploratora" (drzewo plików po lewej stronie VS Code), znajdź swój folder backend.

Kliknij prawym przyciskiem myszy na nazwę folderu backend.

Wybierz opcję "Nowy plik" (New File).

Nazwij ten nowy plik: server.js i naciśnij Enter.

Otworzy Ci się pusty plik server.js.

Skopiuj cały kod, który podałem w poprzedniej odpowiedzi dla backend/server.js (ten, który zaczyna się od const express = require('express');).

Wklej ten kod do swojego (teraz już niepustego) pliku server.js.

Zapisz plik (Ctrl+S lub Cmd+S).

Musisz zrobić dokładnie to samo dla drugiego pliku:

Kliknij prawym przyciskiem na folder backend i wybierz "Nowy folder". Nazwij go utils.

Kliknij prawym przyciskiem na ten nowy folder utils i wybierz "Nowy plik".

Nazwij ten plik: trackerScraper.js.

Skopiuj kod spod nagłówka "📜 2. Plik Scrapera (Logika API)".

Wklej go do pliku backend/utils/trackerScraper.js i zapisz.

Gdy oba pliki będą na swoich miejscach i będziesz mieć zainstalowane zależności (npm install express cors axios), możesz uruchomić serwer komendą node backend/server.js.

OR  Error fetching leaderboard: [AxiosError: Network Error]

To jest ten sam błąd co wcześniej.

Ten błąd ([AxiosError: Network Error]) oznacza, że Twój frontend (kod w przeglądarce) nadal próbuje połączyć się bezpośrednio z api.gametools.network.

Nie możesz tego robić. Twój frontend musi łączyć się z Twoim własnym serwerem (http://localhost:3001), a Twój serwer połączy się z Gametools.

## 💡 Checklist (Co sprawdzić)
Sprawdźmy krok po kroku, co może być nie tak.

1. Czy Twój serwer backendowy jest URUCHOMIONY?
Zanim Twój frontend będzie mógł cokolwiek pobrać, serwer server.js musi być włączony.

Otwórz terminal w VS Code.

Wpisz komendę: node backend/server.js

Musisz zobaczyć w terminalu wiadomość potwierdzającą:

Bash
[SERWER] Uruchomiony na http://localhost:3001
[SERWER] Oczekuje na żądania pod adresem: http://localhost:3001/api/stats/:bfId
Jeśli ten serwer nie jest uruchomiony, Twój frontend nie ma się z czym połączyć.

2. Czy Twój frontend wywołuje PRAWIDŁOWY adres URL?
To jest najbardziej prawdopodobny błąd. Sprawdź kod na swoim frontendzie (np. w pliku App.js lub tam, gdzie używasz axios / fetch).

ŹLE ❌ (Powoduje "Network Error")

JavaScript
// BŁĘDNY KOD FRONTENDOWY
// Nie wolno łączyć się z gametools bezpośrednio z frontendu
const url = 'https://api.gametools.network/bf6/stats/?name=n0sinner...';
const response = await axios.get(url); 
DOBRZE ✅ (Używa Twojego serwera jako pośrednika)

JavaScript
// PRAWIDŁOWY KOD FRONTENDOWY
// Łączysz się ze swoim własnym serwerem na porcie 3001
const playerName = 'n0sinner';
const url = `http://localhost:3001/api/stats/${playerName}`;
const response = await axios.get(url); 

// 'response.data' będzie teraz zawierać { playerId: 'n0sinner', kdRatio: ... }
Upewnij się, że Twój serwer (krok 1) jest włączony, a Twój frontend (krok 2) łączy się z http://localhost:3001.

Czy możesz pokazać mi fragment kodu frontendowego, który próbuje pobrać te dane?

co musi byc uruchomione

Żeby wszystko działało, muszą być uruchomione DWA procesy jednocześnie, każdy w osobnym terminalu:

Backend (Twój serwer pośredniczący):

W jednym terminalu wpisujesz: node backend/server.js

Musi on cały czas działać i pokazywać, że nasłuchuje na porcie 3001.

Frontend (Twoja aplikacja React/JS):

W drugim terminalu wpisujesz: npm start (lub podobną komendę).

To uruchamia aplikację w przeglądarce (zazwyczaj na porcie 3000), którą możesz normalnie oglądać.

Twój frontend (z portu 3000) będzie wysyłał żądania do Twojego backendu (na port 3001), a błąd Network Error zniknie.

gdzie mam wkleic // PRAWIDŁOWY KOD FRONTENDOWY// Łączysz się ze swoim własnym serwerem na porcie 3001const playerName = 'n0sinner';const url = `http://localhost:3001/api/stats/${playerName}`;const response = await axios.get(url); // 'response.data' będzie teraz zawierać { playerId: 'n0sinner', kdRatio: ... }

Ten kod musisz wkleić w plikach Twojej aplikacji frontendowej (np. w folderze src/, jeśli używasz Reacta).

Nie możesz go wkleić "luzem". Musi on znaleźć się wewnątrz funkcji, która będzie odpowiedzialna za pobieranie danych. Najczęściej jest to:

Funkcja obsługi zdarzenia (np. po kliknięciu przycisku "Szukaj").

Hook useEffect (jeśli dane mają się załadować automatycznie po starcie komponentu).

## przykład 1: Wklejenie do funkcji (np. po kliknięciu)
To jest najbardziej typowy scenariusz. Masz jakiś przycisk "Szukaj" i po jego kliknięciu chcesz pobrać dane.

Załóżmy, że Twój plik frontendowy to src/App.js:

JavaScript
// src/App.js (lub inny plik komponentu)
import React, { useState } from 'react';
import axios from 'axios'; // Upewnij się, że masz 'axios' w frontendzie (npm install axios)

function App() {
    const [playerName, setPlayerName] = useState('n0sinner'); // Stan do trzymania nazwy z inputu
    const [kdRatio, setKdRatio] = useState(null); // Stan na wynik K/D

    /**
     * Tutaj wklejasz logikę.
     * Stworzyliśmy funkcję 'fetchStats' i oznaczyliśmy ją jako 'async'.
     */
    const handleSearch = async () => {
        try {
            console.log(`Wysyłanie zapytania do backendu po dane dla: ${playerName}`);
            
            // --- TUTAJ JEST TWÓJ KOD ---
            const url = `http://localhost:3001/api/stats/${playerName}`;
            const response = await axios.get(url); 
            // ---------------------------

            console.log('Otrzymano odpowiedź z backendu:', response.data);
            
            // Zapisujemy K/D w stanie komponentu, aby je wyświetlić
            setKdRatio(response.data.kdRatio);

        } catch (error) {
            console.error('Wystąpił błąd przy pobieraniu danych z backendu:', error);
            setKdRatio(null); // Wyczyść w razie błędu
        }
    };

    return (
        <div className="App">
            <h1>Sprawdzanie statystyk BF6</h1>
            <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)} 
                placeholder="Wpisz ID gracza"
            />
            {/* Ten przycisk wywołuje funkcję handleSearch */}
            <button onClick={handleSearch}>Szukaj</button>

            {/* Wyświetlanie wyniku */}
            {kdRatio !== null && (
                <h2>K/D Ratio dla {playerName}: {kdRatio}</h2>
            )}
        </div>
    );
}

export default App;
## przykład 2: Wklejenie do useEffect (ładowanie przy starcie)
Jeśli chcesz, aby statystyki dla gracza "n0sinner" załadowały się od razu po wejściu na stronę:

JavaScript
// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
    const [kdRatio, setKdRatio] = useState(null);

    // useEffect uruchomi się raz, gdy komponent się załaduje
    useEffect(() => {
        
        // Musimy stworzyć funkcję 'async' wewnątrz 'useEffect'
        const fetchInitialStats = async () => {
            try {
                // --- TUTAJ JEST TWÓJ KOD ---
                const playerName = 'n0sinner'; // Na sztywno wpisany gracz
                const url = `http://localhost:3001/api/stats/${playerName}`;
                const response = await axios.get(url);
                // ---------------------------

                console.log('Otrzymano odpowiedź z backendu:', response.data);
                setKdRatio(response.data.kdRatio);

            } catch (error) {
                console.error('Błąd przy ładowaniu danych startowych:', error);
            }
        };

        fetchInitialStats(); // Wywołujemy funkcję

    }, []); // Pusta tablica [] oznacza "uruchom tylko raz"

    return (
        <div className="App">
            <h1>Statystyki BF6</h1>
            {kdRatio ? (
                <h2>K/D dla 'n0sinner': {kdRatio}</h2>
            ) : (
                <p>Ładowanie statystyk...</p>
            )}
        </div>
    );
}

export default App;
podaj caly nowy server app

Ta odpowiedź została przez Ciebie zatrzymana
server.js podaj caly nowy skrypt

Jasne, oto cały nowy skrypt dla pliku server.js.

Ten plik działa jako pośrednik (proxy). Twój frontend będzie łączył się z tym serwerem, a ten serwer bezpiecznie połączy się z API Gametools, unikając błędu Network Error.

🖥️ Plik: backend/server.js
Skopiuj i wklej ten kod do pliku backend/server.js.

JavaScript
// backend/server.js
const express = require('express');
const cors = require('cors'); // Ważne dla komunikacji frontend-backend
const { getKdRatio } = require('./utils/trackerScraper'); // Importujemy naszą funkcję

const app = express();
const PORT = process.env.PORT || 3001; // Użyj portu 3001

// Włącz CORS, aby Twój frontend (np. z portu 3000) mógł się komunikować
app.use(cors());
app.use(express.json());

/**
 * GŁÓWNY ENDPOINT API DO POBIERANIA STATYSTYK
 * Twój frontend powinien wywoływać ten adres:
 * fetch('http://localhost:3001/api/stats/NAZWA_GRACZA')
 */
app.get('/api/stats/:bfId', async (req, res) => {
    try {
        const { bfId } = req.params;
        // Na razie domyślnie używamy platformy 'pc'
        const platform = 'pc'; 
        
        console.log(`[SERWER] Otrzymano żądanie statystyk dla gracza: ${bfId} (platforma: ${platform})`);

        // Używamy naszej funkcji scrapera
        const kd = await getKdRatio(bfId, platform); 

        // Odpowiedź sukcesu: wysyłamy dane jako JSON
        res.status(200).json({
            playerId: bfId,
            platform: platform,
            kdRatio: kd
        });

    } catch (error) {
        console.error(`[SERWER BŁĄD] Nie udało się przetworzyć żądania dla ${req.params.bfId}: ${error.message}`);
        // Odpowiedź błędu
        res.status(500).json({
            message: "Wystąpił błąd podczas pobierania statystyk",
            error: error.message
        });
    }
});


// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`[SERWER] Uruchomiony na http://localhost:${PORT}`);
    console.log(`[SERWER] Oczekuje na żądania pod adresem: http://localhost:${PORT}/api/stats/:bfId`);
});
📜 Plik powiązany: backend/utils/trackerScraper.js
Pamiętaj, że powyższy server.js do działania wymaga tego drugiego pliku. Upewnij się, że masz go w odpowiednim folderze.

JavaScript
// backend/utils/trackerScraper.js
const axios = require('axios');

/**
 * Próbuje pobrać rzeczywiste K/D Ratio z API Gametools.network
 * używając endpointu /bf6/stats/ ze sformatowanymi wartościami.
 *
 * @param {string} bfId ID gracza (np. n0sinner)
 * @param {string} platform Platforma (np. 'pc')
 * @returns {Promise<number | null>} Rzeczywiste K/D Ratio lub wartość symulowana w przypadku błędu.
 */
async function getKdRatio(bfId, platform) {
    const SIMULATED_KD = 0.66;
    
    const params = new URLSearchParams({
        categories: 'multiplayer',
        raw: 'false',
        format_values: 'true',
        name: bfId,
        platform: platform,
        skip_battlelog: 'false'
    });
    
    const API_URL = `https://api.gametools.network/bf6/stats/?${params.toString()}`;
    
    console.log(`[GAMETOOLS API] Pobieranie K/D (BF6) z: ${API_URL}`);

    try {
        const response = await axios.get(API_URL, {
            timeout: 5000, 
            headers: { 'accept': 'application/json' }
        });

        let data = response.data;
        let kdRatio = null;

        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            data = data.results[0];
        }

        const possibleKdKeys = ['killDeath', 'player_kd', 'kdr', 'kd'];
        let rawKdValue = null;

        for (const key of possibleKdKeys) {
            if (data.hasOwnProperty(key)) {
                rawKdValue = data[key];
                console.log(`[GAMETOOLS] Znaleziono klucz '${key}' o wartości: ${rawKdValue}`);
                break;
            }
        }
        
        if (rawKdValue !== null) {
            kdRatio = parseFloat(rawKdValue);
            
            if (!isNaN(kdRatio)) {
                console.log(`[GAMETOOLS SUKCES] Sparsowano K/D: ${kdRatio.toFixed(3)}`);
                return parseFloat(kdRatio.toFixed(3));
            } else {
                console.error(`[GAMETOOLS BŁĄD] Wartość K/D nie jest liczbą: ${rawKdValue}`);
            }
        } else {
             console.warn(`[GAMETOOLS OSTRZEŻENIE] Nie znaleziono żadnego ze znanych kluczy K/D w odpowiedzi.`);
        }

        console.error(`[GAMETOOLS BŁĄD] Parsowanie K/D zawiodło. Powrót do symulacji ${SIMULATED_KD}.`);
        return SIMULATED_KD;

    } catch (error) {
        let errorMessage = error.message;
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage = `HTTP 404: Gracz '${bfId}' na platformie '${platform}' nie znaleziony.`;
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        }
        
        console.error(`[GAMETOOLS BŁĄD] Wystąpił błąd podczas pobierania. Powrót do symulacji ${SIMULATED_KD}. Szczegóły: ${errorMessage}`);
        return SIMULATED_KD;
    }
}

module.exports = { getKdRatio };
🚀 Jak to uruchomić
Upewnij się, że masz zainstalowane zależności. W terminalu wpisz:

Bash
npm install express cors axios
Uruchom serwer. W terminalu wpisz:

Bash
node backend/server.js
Twój frontend powinien teraz wysyłać żądania do http://localhost:3001/api/stats/NAZWA_GRACZA.

PS C:\Users\dontb\battlefield-tracker-app\mobile-app> npm start -- --clear



> mobile-app@1.0.0 start

> expo start --clear



Starting project at C:\Users\dontb\battlefield-tracker-app\mobile-app

› Port 8081 is being used by another process

√ Use port 8082 instead? ... yes

Starting Metro Bundler

warning: Bundler cache is empty, rebuilding (this may take a minute)

▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄

█ ▄▄▄▄▄ █▀▀ ████ ▄█ ▄▄▄▄▄ █

█ █   █ █▄▀██▀██▀ █ █   █ █

█ █▄▄▄█ █ ▄ █  ▀ ██ █▄▄▄█ █

█▄▄▄▄▄▄▄█ █ ▀▄█▄█▄█▄▄▄▄▄▄▄█

█  ▀▄█▀▄▄▀▀█  ▄▀▄▄▀  ▄▀▄▄▀█

█▄▀  ▀▀▄█▄▀▀  ▀ ▀▄▄▀ ▀▀█▄▄█

█▄█▀ █ ▄ ██▄ █  █▀█ ▄█ ██▀█

█▄▀▄██▄▄▀▄▄▄ █▀██ ▄▄ ▀▀██▄█

█▄▄█▄█▄▄█▀ ▄█ ▀▄  ▄▄▄ █ ▄ █

█ ▄▄▄▄▄ █▄▄▄▄ █▄  █▄█  ▀ ▄█

█ █   █ █▀▀ ▀▄▄▀▀▄ ▄▄ █▀▄██

█ █▄▄▄█ █▀█ ▀▄  █  █▄  ▄█▄█

█▄▄▄▄▄▄▄█▄█▄██▄▄█▄███▄▄█▄▄█



› Metro waiting on exp://192.168.1.100:8082

› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)



› Using Expo Go

› Press s │ switch to development build



› Press a │ open Android

› Press w │ open web



› Press j │ open debugger

› Press r │ reload app

› Press m │ toggle menu

› shift+m │ more tools

› Press o │ open project code in your editor



› Press ? │ show all commands



Logs for your project will appear below. Press Ctrl+C to exit.

Android Bundled 9393ms index.ts (1174 modules)

 ERROR  Error fetching leaderboard: [AxiosError: Network Error]

OK, widzę logi z Twojej aplikacji mobilnej Expo.

To jest kluczowa informacja. Błąd [AxiosError: Network Error] w aplikacji mobilnej oznacza coś innego niż w przeglądarce.

## Dlaczego występuje ten błąd?
Problem polega na tym, że Twoja aplikacja mobilna (działająca na telefonie lub emulatorze) próbuje połączyć się z adresem http://localhost:3001.

W kontekście Twojego telefonu, localhost (lub 127.0.0.1) oznacza sam telefon, a nie Twój komputer, na którym uruchomiłeś serwer backend/server.js. Telefon nie może znaleźć serwera na porcie 3001 na samym sobie, więc zwraca błąd Network Error.

## 💡 Rozwiązanie
Musisz zastąpić localhost lokalnym adresem IP Twojego komputera w tej samej sieci Wi-Fi.

Dobra wiadomość: logi Expo już nam go podały! Twój komputer ma adres 192.168.1.100.

Musisz zaktualizować kod w swojej aplikacji frontendowej (mobilnej).

Zmiana w kodzie aplikacji mobilnej (Frontend)
Znajdź plik, w którym wywołujesz axios (np. src/App.js lub podobny) i zmień adres URL:

ŹLE ❌ (Działa tylko w przeglądarce na tym samym komputerze)

JavaScript
// const url = `http://localhost:3001/api/stats/${playerName}`;
DOBRZE ✅ (Działa z aplikacji mobilnej w tej samej sieci Wi-Fi)

JavaScript
// Użyj adresu IP komputera, na którym działa serwer backend/server.js
const url = `http://192.168.1.100:3001/api/stats/${playerName}`;
Checklista, aby wszystko działało:
Uruchom serwer backendowy: W pierwszym terminalu uruchom serwer (on nadal działa na localhost z punktu widzenia komputera):

Bash
node backend/server.js
Zmień kod frontendu: Wprowadź powyższą zmianę adresu IP (192.168.1.100:3001) w kodzie aplikacji mobilnej.

Uruchom aplikację mobilną: W drugim terminalu uruchom Expo (tak jak to zrobiłeś):

Bash
npm start
WAŻNE: Sprawdź Zaporę (Firewall): Jeśli po zmianie adresu IP błąd nadal występuje, prawdopodobnie zapora sieciowa (np. Windows Defender) na Twoim komputerze blokuje połączenia przychodzące na port 3001 z innych urządzeń (jak Twój telefon). Musisz zezwolić procesowi node.exe na komunikację przez port 3001 w zaporze.

podaj mi nowe skrypty do wszystkiego

Jasne, oto kompletny zestaw trzech skryptów, które są potrzebne, aby Twoja aplikacja działała poprawnie.

Problem (Network Error) nie leży w skryptach backendu, ale w tym, jak aplikacja mobilna (frontend) próbuje się z nimi połączyć. Musi używać adresu IP Twojego komputera, a nie localhost.

## 1. Backend: Plik serwera (Pośrednika)
Ten skrypt uruchamia serwer na Twoim komputerze na porcie 3001.

Ścieżka: backend/server.js

JavaScript
// backend/server.js
const express = require('express');
const cors = require('cors'); // Ważne dla komunikacji
const { getKdRatio } = require('./utils/trackerScraper'); 

const app = express();
const PORT = 3001; // Serwer działa na tym porcie

app.use(cors());
app.use(express.json());

/**
 * Endpoint API, który będzie wywoływany przez Twoją aplikację mobilną
 * Np.: http://192.168.1.100:3001/api/stats/n0sinner
 */
app.get('/api/stats/:bfId', async (req, res) => {
    try {
        const { bfId } = req.params;
        const platform = 'pc'; // Domyślna platforma
        
        console.log(`[SERWER] Otrzymano żądanie dla: ${bfId}`);

        // Wywołanie funkcji, która łączy się z Gametools
        const kd = await getKdRatio(bfId, platform); 

        // Odpowiedź sukcesu: wysyłamy dane z powrotem do aplikacji mobilnej
        res.status(200).json({
            playerId: bfId,
            platform: platform,
            kdRatio: kd
        });

    } catch (error) {
        console.error(`[SERWER BŁĄD] ${error.message}`);
        res.status(500).json({ message: "Wystąpił błąd serwera" });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`[SERWER] Uruchomiony na http://localhost:${PORT}`);
    console.log(`[SERWER] Oczekuje na żądania...`);
});
## 2. Backend: Plik Scrapera (Logika API)
Ten skrypt jest wywoływany przez server.js i to on łączy się z API Gametools.

Ścieżka: backend/utils/trackerScraper.js

JavaScript
// backend/utils/trackerScraper.js
const axios = require('axios');

async function getKdRatio(bfId, platform) {
    const SIMULATED_KD = 0.66; // Wartość awaryjna
    
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
            timeout: 5000, 
            headers: { 'accept': 'application/json' }
        });

        let data = response.data;
        if (data.results && Array.isArray(data.results) && data.results.length > 0) {
            data = data.results[0];
        }

        const possibleKdKeys = ['killDeath', 'player_kd', 'kdr', 'kd'];
        let rawKdValue = null;

        for (const key of possibleKdKeys) {
            if (data.hasOwnProperty(key)) {
                rawKdValue = data[key];
                break;
            }
        }
        
        if (rawKdValue !== null) {
            const kdRatio = parseFloat(rawKdValue);
            if (!isNaN(kdRatio)) {
                console.log(`[GAMETOOLS SUKCES] Znaleziono K/D: ${kdRatio}`);
                return parseFloat(kdRatio.toFixed(3));
            }
        }

        console.error(`[GAMETOOLS BŁĄD] Nie znaleziono klucza K/D. Zwracam symulację.`);
        return SIMULATED_KD;

    } catch (error) {
        let errorMessage = error.message;
        if (error.response) {
            errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
        }
        console.error(`[GAMETOOLS BŁĄD] ${errorMessage}. Zwracam symulację.`);
        return SIMULATED_KD;
    }
}

module.exports = { getKdRatio };
## 3. Frontend: Aplikacja Mobilna (NAJWAŻNIEJSZA ZMIANA)
To jest plik Twojej aplikacji Expo (prawdopodobnie App.js). To tutaj musisz wprowadzić zmianę adresu IP, aby naprawić błąd Network Error.

Ścieżka: mobile-app/App.js (lub główny plik Twojej aplikacji)

JavaScript
// mobile-app/App.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator } from 'react-native';
import axios from 'axios';

// UŻYJ ADRESU IP KOMPUTERA, KTÓRY POKAZAŁO CI EXPO (192.168.1.100)
// To jest kluczowa zmiana, która naprawi błąd "Network Error".
const API_BASE_URL = 'http://192.168.1.100:3001';

export default function App() {
  const [playerName, setPlayerName] = useState('n0sinner');
  const [kdRatio, setKdRatio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!playerName) return;

    setIsLoading(true);
    setKdRatio(null);
    setError(null);

    try {
      // 1. Budujemy URL do TWOJEGO backendu (używając IP komputera)
      const url = `${API_BASE_URL}/api/stats/${playerName}`;
      
      console.log('Wysyłanie zapytania do:', url);

      // 2. Aplikacja mobilna łączy się z Twoim serwerem node backend/server.js
      const response = await axios.get(url);

      // 3. Twój serwer łączy się z Gametools i zwraca dane
      console.log('Otrzymano odpowiedź:', response.data);
      setKdRatio(response.data.kdRatio);

    } catch (err) {
      console.error('Błąd podczas pobierania danych:', err.message);
      setError('Nie udało się pobrać statystyk. Sprawdź, czy serwer backend/server.js jest uruchomiony.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sprawdzanie statystyk BF6</Text>
      
      <TextInput
        style={styles.input}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Wpisz ID gracza"
      />
      
      <Button title="Szukaj" onPress={handleSearch} disabled={isLoading} />

      {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
      
      {kdRatio !== null && (
        <Text style={styles.result}>
          K/D Ratio dla {playerName}: {kdRatio}
        </Text>
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

// Proste style, aby aplikacja wyglądała czytelnie
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
  },
  loader: {
    marginTop: 20,
  },
  result: {
    fontSize: 20,
    marginTop: 20,
  },
  error: {
    fontSize: 16,
    color: 'red',
    marginTop: 20,
    textAlign: 'center',
  },
});
START CYKLICZNEJ AKTUALIZACJI: 22:06:12 ---

Serwer działa na porcie 3000

Otwórz: http://localhost:3000

✅ Połączenie z PostgreSQL nawiązane. Czas serwera: Mon Oct 27 2025 22:06:12 GMT+0000 (Greenwich Mean Time)

[GAMETOOLS API] Wysyłanie zapytania do: https://api.gametools.network/bf6/stats/?categories=multiplayer&raw=false&format_values=true&name=n0sinner&platform=PC&skip_battlelog=false

[GAMETOOLS SUKCES] Znaleziono K/D: 0.78

[SUKCES] n0sinner zaktualizowany. Nowe K/D: 0.78

--- KONIEC CYKLICZNEJ AKTUALIZACJI ---

Świetnie! Z tych logów wynika, że wszystko działa teraz doskonale.

Wygląda na to, że Twój serwer (działający na porcie 3000) poprawnie uruchomił cykliczną aktualizację:

Połączył się z bazą danych PostgreSQL.

Pomyślnie odpytał API Gametools o statystyki n0sinner.

Otrzymał poprawne K/D (0.78).

Zaktualizował te dane w Twojej bazie.

To jest dokładnie ten sukces, którego oczekiwaliśmy!

Logs for your project will appear below. Press Ctrl+C to exit.

Android Bundled 8217ms index.ts (689 modules)

 LOG  Wysyłanie zapytania do: http://192.168.1.100:3001/api/stats/n0sinner

 ERROR  Błąd podczas pobierania danych: Network Error

 LOG  Wysyłanie zapytania do: http://192.168.1.100:3001/api/stats/n0sinner

 ERROR  Błąd podczas pobierania danych: Network Error

 LOG  Wysyłanie zapytania do: http://192.168.1.100:3001/api/stats/n0sinner

 ERROR  Błąd podczas pobierania danych: Network Error

 LOG  Wysyłanie zapytania do: http://192.168.1.100:3001/api/stats/n0sinner

 ERROR  Błąd podczas pobierania danych: Network Error

 LOG  Wysyłanie zapytania do: http://192.168.1.100:3001/api/stats/n0sinner

 ERROR  Błąd podczas pobierania danych: Network Error

Rozumiem. Zmieniliśmy adres IP, ale błąd Network Error pozostał.

To jest klasyczny problem, który w 99% przypadków oznacza, że zapora sieciowa (firewall) na Twoim komputerze blokuje połączenie.

💡 Wyjaśnienie problemu
Twój serwer backend/server.js działa na Twoim komputerze (PC).

Twoja aplikacja mobilna (telefon) próbuje połączyć się z tym serwerem przez sieć Wi-Fi, wysyłając żądanie na adres 192.168.1.100 i port 3001.

Zapora Windows (lub inny firewall) na Twoim komputerze widzi to jako "nieznane" połączenie przychodzące z sieci i je blokuje.

✅ Jak to naprawić: Zezwól na połączenie w Zaporze Windows
Musisz ręcznie dodać regułę do zapory, aby zezwolić na połączenia przychodzące na porcie 3001.

Otwórz Zaporę Windows:

Naciśnij klawisz Windows i wpisz "Zapora" (lub "Firewall").

Wybierz "Zapora Windows Defender z zabezpieczeniami zaawansowanymi".

Utwórz nową regułę:

Po lewej stronie kliknij "Reguły przychodzące".

Po prawej stronie kliknij "Nowa reguła...".

Kreator nowej reguły:

Typ reguły: Wybierz "Port" i kliknij "Dalej".

Protokół i porty: Wybierz "TCP". W polu "Określone porty lokalne" wpisz: 3001. Kliknij "Dalej".

Akcja: Wybierz "Zezwalaj na połączenie". Kliknij "Dalej".

Profil: Zostaw zaznaczone wszystkie opcje (Prywatny, Publiczny, Domenowy). Kliknij "Dalej".

Nazwa: Wpisz nazwę, np. Moja Aplikacja BF6 (Port 3001) i kliknij "Zakończ".

Sprawdź również: Konflikt portów
Zauważyłem coś ważnego w Twoich poprzednich logach:

Twoje logi udanej aktualizacji pokazywały serwer działający na porcie 3000.

Twoja aplikacja mobilna próbuje łączyć się z portem 3001.

Upewnij się, że masz uruchomiony właściwy serwer!

W terminalu na swoim komputerze musisz mieć uruchomiony serwer, który stworzyliśmy:

Bash
node backend/server.js
A jego logi powinny pokazywać, że nasłuchuje na porcie 3001:

[SERWER] Uruchomiony na http://localhost:3001
[SERWER] Oczekuje na żądania...
Po dodaniu reguły zapory i upewnieniu się, że serwer na porcie 3001 jest uruchomiony, uruchom ponownie aplikację na telefonie. Błąd powinien zniknąć.

backend dziala na porcie 3000

Rozumiem, dziękuję za uściślenie!

To jest przyczyna problemu. Twój serwer działa na porcie 3000, ale Twoja aplikacja mobilna próbuje się połączyć z portem 3001.

Musisz zaktualizować kod swojej aplikacji mobilnej (frontend), aby łączyła się z portem 3000.

## 1. Poprawka kodu w aplikacji mobilnej
W pliku mobile-app/App.js (lub podobnym) zmień ten wiersz:

ŹLE ❌

JavaScript
const API_BASE_URL = 'http://192.168.1.100:3001';
DOBRZE ✅

JavaScript
const API_BASE_URL = 'http://192.168.1.100:3000';
## 2. Aktualizacja reguły zapory (Firewall)
Jeśli wcześniej utworzyłeś regułę zapory dla portu 3001, musisz ją zaktualizować lub utworzyć nową dla portu 3000.

Kroki są te same co wcześniej, ale w sekcji "Protokół i porty" musisz wpisać 3000.

Po tej zmianie wszystko powinno zacząć działać.

nowy app.js z portem 3000

Jasne, oto zaktualizowany kod dla App.js z portem 3000.

Plik: mobile-app/App.js
JavaScript
// mobile-app/App.js
import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Button, ActivityIndicator } from 'react-native';
import axios from 'axios';

//
// --- NAJWAŻNIEJSZA ZMIANA JEST TUTAJ ---
//
// Użyj adresu IP komputera (192.168.1.100)
// Oraz portu, na którym FAKTYCZNIE działa Twój backend (3000)
//
const API_BASE_URL = 'http://192.168.1.100:3000';

export default function App() {
  const [playerName, setPlayerName] = useState('n0sinner');
  const [kdRatio, setKdRatio] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    if (!playerName) return;

    setIsLoading(true);
    setKdRatio(null);
    setError(null);

    try {
      // Budujemy URL do TWOJEGO backendu (używając portu 3000)
      const url = `${API_BASE_URL}/api/stats/${playerName}`;
      
      console.log('Wysyłanie zapytania do:', url);

      // Aplikacja mobilna łączy się z Twoim serwerem node backend/server.js
      const response = await axios.get(url);

      // Twój serwer łączy się z Gametools i zwraca dane
      console.log('Otrzymano odpowiedź:', response.data);
      setKdRatio(response.data.kdRatio);

    } catch (err) {
      console.error('Błąd podczas pobierania danych:', err.message);
      setError('Nie udało się pobrać statystyk. Sprawdź, czy serwer backend działa i czy zapora (firewall) zezwala na połączenia na porcie 3000.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sprawdzanie statystyk BF6</Text>
      
      <TextInput
        style={styles.input}
        value={playerName}
        onChangeText={setPlayerName}
        placeholder="Wpisz ID gracza"
      />
      
      <Button title="Szukaj" onPress={handleSearch} disabled={isLoading} />

      {isLoading && <ActivityIndicator size="large" style={styles.loader} />}
      
      {kdRatio !== null && (
        <Text style={styles.result}>
          K/D Ratio dla {playerName}: {kdRatio}
        </Text>
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
    </View>
  );
}

// Style






