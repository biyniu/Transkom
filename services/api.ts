
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    enableIndexedDbPersistence 
} from "firebase/firestore";
import { LocationRate, WorkDay, Driver } from '../types';

/**
 * KONFIGURACJA FIREBASE
 */
const firebaseConfig = {
  apiKey: "AIzaSyDGgCcjDKqFX9QeiTi8t-DQkd01WWflDpg",
  authDomain: "transkom-86761.firebaseapp.com",
  projectId: "transkom-86761",
  storageBucket: "transkom-86761.firebasestorage.app",
  messagingSenderId: "510661919174",
  appId: "1:510661919174:web:1399549b7c95c7472732c7"
};

// Inicjalizacja Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Włączenie trybu offline
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Wykryto wiele otwartych kart - synchronizacja offline ograniczona.");
        } else if (err.code === 'unimplemented') {
            console.warn("Twoja przeglądarka nie obsługuje trybu offline Firebase.");
        }
    });
} catch (e) {}

/**
 * Sprawdza czy konfiguracja Firebase została wprowadzona
 */
export const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.apiKey !== "TWOJE_API_KEY";
};

// --- SYNCHRONIZACJA KURSÓW KIEROWCY ---
export const syncDriverData = async (driverId: string, days: WorkDay[]) => {
    if (!isFirebaseConfigured() || !driverId) return;
    try {
        const driverRef = doc(db, "driverData", driverId);
        await setDoc(driverRef, { 
            days: JSON.stringify(days),
            lastSync: new Date().toISOString(),
            driverId: driverId
        }, { merge: true });
    } catch (e) {
        console.error("Błąd zapisu kursów w Firebase:", e);
    }
};

export const fetchDriverData = async (driverId: string): Promise<WorkDay[]> => {
    if (!isFirebaseConfigured() || !driverId) return [];
    try {
        const driverRef = doc(db, "driverData", driverId);
        const docSnap = await getDoc(driverRef);
        if (docSnap.exists()) {
            return JSON.parse(docSnap.data().days);
        }
    } catch (e) {
        console.error("Błąd pobierania kursów z Firebase:", e);
    }
    return [];
};

// --- SYNCHRONIZACJA BAZY MIEJSCOWOŚCI ---
export const syncLocations = async (locations: LocationRate[]) => {
    if (!isFirebaseConfigured()) return;
    try {
        const locRef = doc(db, "config", "locations");
        await setDoc(locRef, { 
            data: JSON.stringify(locations),
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error("Błąd zapisu miejscowości w Firebase:", e);
    }
};

export const fetchLocations = async (): Promise<LocationRate[]> => {
    if (!isFirebaseConfigured()) return [];
    try {
        const locRef = doc(db, "config", "locations");
        const docSnap = await getDoc(locRef);
        if (docSnap.exists()) {
            return JSON.parse(docSnap.data().data);
        }
    } catch (e) {
        console.error("Błąd pobierania miejscowości z Firebase:", e);
    }
    return [];
};

// --- SYNCHRONIZACJA KIEROWCÓW ---
export const syncDrivers = async (drivers: Driver[]) => {
    if (!isFirebaseConfigured()) return;
    try {
        const driversRef = doc(db, "config", "drivers");
        await setDoc(driversRef, { 
            data: JSON.stringify(drivers),
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error("Błąd zapisu kierowców w Firebase:", e);
    }
};

export const fetchDrivers = async (): Promise<Driver[]> => {
    if (!isFirebaseConfigured()) return [];
    try {
        const driversRef = doc(db, "config", "drivers");
        const docSnap = await getDoc(driversRef);
        if (docSnap.exists()) {
            return JSON.parse(docSnap.data().data);
        }
    } catch (e) {
        console.error("Błąd pobierania kierowców z Firebase:", e);
    }
    return [];
};
