
import { initializeApp } from "firebase/app";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    deleteDoc,
    collection,
    getDocs,
    writeBatch, // Importujemy obsługę paczek
    enableIndexedDbPersistence,
    FirestoreError
} from "firebase/firestore";
import { LocationRate, WorkDay, Driver, AppSettings } from '../types';

/**
 * REGUŁY BEZPIECZEŃSTWA (Firestore Rules):
 * 
 * rules_version = '2';
 * service cloud.firestore {
 *   match /databases/{database}/documents {
 *     match /{document=**} {
 *       allow read, write: if true;
 *     }
 *   }
 * }
 */

const firebaseConfig = {
  apiKey: "AIzaSyDGgCcjDKqFX9QeiTi8t-DQkd01WWflDpg",
  authDomain: "transkom-86761.firebaseapp.com",
  projectId: "transkom-86761",
  storageBucket: "transkom-86761.firebasestorage.app",
  messagingSenderId: "510661919174",
  appId: "1:510661919174:web:1399549b7c95c7472732c7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Włączenie persistencji offline
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Multiple tabs open - persistence limited.");
        }
    });
} catch (e) {}

const handleFirebaseError = (error: any, context: string): string => {
    const fError = error as FirestoreError;
    console.warn(`Firebase Issue [${context}]:`, fError.code);
    if (fError.code === 'permission-denied') {
        return "Błąd uprawnień Firebase. Sprawdź zakładkę Rules w konsoli.";
    }
    return fError.message || "Błąd połączenia z bazą.";
};

export const isFirebaseConfigured = () => {
    return firebaseConfig.apiKey && firebaseConfig.apiKey !== "TWOJE_API_KEY";
};

// Funkcja testowa do sprawdzania uprawnień
export const checkPermissions = async (): Promise<boolean> => {
    try {
        const testRef = doc(db, "config", "test");
        await getDoc(testRef);
        return true;
    } catch (e: any) {
        return false;
    }
};

export const syncSettings = async (driverId: string, settings: AppSettings) => {
    if (!isFirebaseConfigured() || !driverId) return;
    try {
        const driverRef = doc(db, "driverData", driverId);
        await setDoc(driverRef, { 
            settings: JSON.stringify(settings),
            lastSync: new Date().toISOString()
        }, { merge: true });
    } catch (e) {
        console.error(handleFirebaseError(e, "syncSettings"));
    }
};

export const syncSingleDay = async (driverId: string, day: WorkDay) => {
    if (!isFirebaseConfigured() || !driverId) return;
    try {
        const dayRef = doc(db, "driverData", driverId, "days", day.id);
        await setDoc(dayRef, {
            ...day,
            updatedAt: new Date().toISOString()
        });
    } catch (e) {
        console.error(handleFirebaseError(e, "syncSingleDay"));
    }
};

export const deleteSingleDay = async (driverId: string, dayId: string) => {
    if (!isFirebaseConfigured() || !driverId) return;
    try {
        const dayRef = doc(db, "driverData", driverId, "days", dayId);
        await deleteDoc(dayRef);
    } catch (e) {
        console.error(handleFirebaseError(e, "deleteSingleDay"));
    }
};

export const fetchDriverFullProfile = async (driverId: string): Promise<{days: WorkDay[], settings?: AppSettings}> => {
    if (!isFirebaseConfigured() || !driverId) return { days: [] };
    try {
        const driverRef = doc(db, "driverData", driverId);
        const docSnap = await getDoc(driverRef);
        
        let settings: AppSettings | undefined;
        let oldDaysRaw: string | undefined;

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.settings) settings = JSON.parse(data.settings);
            if (data.days && typeof data.days === 'string') {
                oldDaysRaw = data.days;
            }
        }

        const daysCol = collection(db, "driverData", driverId, "days");
        const daysSnap = await getDocs(daysCol);
        const days: WorkDay[] = [];
        
        daysSnap.forEach((d) => {
            days.push(d.data() as WorkDay);
        });

        if (days.length === 0 && oldDaysRaw) {
            try {
                const parsedOldDays: WorkDay[] = JSON.parse(oldDaysRaw);
                if (parsedOldDays.length > 0) {
                    await syncAllDays(driverId, parsedOldDays);
                    return { days: parsedOldDays, settings };
                }
            } catch (e) {
                console.error("Migration error:", e);
            }
        }

        return { days, settings };
    } catch (e: any) {
        const msg = handleFirebaseError(e, "fetchDriverFullProfile");
        throw new Error(msg);
    }
};

// NOWA WERSJA: Zapis grupowy (Batch)
// Zamiast wysyłać 100 zapytań, wysyłamy 1 paczkę.
export const syncAllDays = async (driverId: string, days: WorkDay[]) => {
    if (!driverId || !isFirebaseConfigured()) return;
    if (days.length === 0) return;

    try {
        // Firebase ma limit 500 operacji na jeden batch.
        // Dzielimy tablicę na kawałki po 450 (dla bezpieczeństwa).
        const chunkSize = 450; 
        
        for (let i = 0; i < days.length; i += chunkSize) {
            const chunk = days.slice(i, i + chunkSize);
            const batch = writeBatch(db);

            chunk.forEach(day => {
                const dayRef = doc(db, "driverData", driverId, "days", day.id);
                batch.set(dayRef, {
                    ...day,
                    updatedAt: new Date().toISOString()
                });
            });

            await batch.commit();
            console.log(`Zsynchonizowano paczkę ${chunk.length} dni.`);
        }
    } catch (e) {
        console.error(handleFirebaseError(e, "syncAllDays (Batch)"));
    }
};

export const syncLocations = async (locations: LocationRate[]) => {
    if (!isFirebaseConfigured()) return;
    try {
        const locRef = doc(db, "config", "locations");
        await setDoc(locRef, { data: JSON.stringify(locations), updatedAt: new Date().toISOString() });
    } catch (e) {
        handleFirebaseError(e, "syncLocations");
    }
};

export const fetchLocations = async (): Promise<LocationRate[]> => {
    if (!isFirebaseConfigured()) return [];
    try {
        const locRef = doc(db, "config", "locations");
        const docSnap = await getDoc(locRef);
        if (docSnap.exists()) return JSON.parse(docSnap.data().data);
    } catch (e) {
        handleFirebaseError(e, "fetchLocations");
    }
    return [];
};

export const syncDrivers = async (drivers: Driver[]) => {
    if (!isFirebaseConfigured()) return;
    try {
        const driversRef = doc(db, "config", "drivers");
        await setDoc(driversRef, { data: JSON.stringify(drivers), updatedAt: new Date().toISOString() });
    } catch (e) {
        handleFirebaseError(e, "syncDrivers");
    }
};

export const fetchDrivers = async (): Promise<Driver[]> => {
    if (!isFirebaseConfigured()) return [];
    try {
        const driversRef = doc(db, "config", "drivers");
        const docSnap = await getDoc(driversRef);
        if (docSnap.exists()) return JSON.parse(docSnap.data().data);
    } catch (e: any) {
        const msg = handleFirebaseError(e, "fetchDrivers");
        throw new Error(msg);
    }
    return [];
};
