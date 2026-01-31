import { AppSettings, LocationRate, WorkDay, Driver } from '../types';
import * as StorageService from './storage';

// --- KONFIGURACJA ---
// TUTAJ WKLEJ SWÓJ URL Z GOOGLE APPS SCRIPT (Web App URL)
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwrMswAZj6zD5aY8D8RaVip3pSgizyFk42cU0g-lezwsASz6iAKHhbjg617J2ksAZwC/exec'; 
// --------------------

const getScriptUrl = () => {
    // Priorytet ma hardcodowany URL, ale jako fallback sprawdzamy settings (dla wstecznej kompatybilności)
    return GOOGLE_SCRIPT_URL || StorageService.getSettings().googleScriptUrl || '';
};

// Nowa funkcja sprawdzająca czy URL jest poprawny (dla UI ustawień)
export const hasValidUrl = () => {
    const url = getScriptUrl();
    return url && url.length > 20 && !url.includes('...');
};

interface ApiResponse {
    status: 'success' | 'error';
    data?: any;
    message?: string;
}

export const syncDriverData = async (driverId: string, days: WorkDay[]) => {
    const url = getScriptUrl();
    if (!url || !driverId || url.includes('...')) return;

    const payload = {
        action: 'SAVE_DRIVER_DATA',
        driverId: driverId,
        days: JSON.stringify(days)
    };

    try {
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Sync error", e);
    }
};

export const fetchDriverData = async (driverId: string): Promise<WorkDay[] | null> => {
    const url = getScriptUrl();
    if (!url || url.includes('...')) return null;

    try {
        const response = await fetch(`${url}?action=GET_DRIVER_DATA&driverId=${driverId}`);
        const json = await response.json();
        if (json.status === 'success' && json.data) {
            return JSON.parse(json.data);
        }
    } catch (e) {
        console.error("Fetch error", e);
    }
    return null;
};

export const syncLocations = async (locations: LocationRate[]) => {
    const url = getScriptUrl();
    if (!url || url.includes('...')) return;

    const payload = {
        action: 'UPDATE_LOCATIONS',
        locations: JSON.stringify(locations)
    };

    try {
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Locations sync error", e);
    }
};

export const fetchLocations = async (): Promise<LocationRate[] | null> => {
    const url = getScriptUrl();
    if (!url || url.includes('...')) return null;

    try {
        const response = await fetch(`${url}?action=GET_LOCATIONS`);
        const json = await response.json();
        if (json.status === 'success' && json.data) {
            return JSON.parse(json.data);
        }
    } catch (e) {
        console.error("Fetch locations error", e);
    }
    return null;
};

export const syncDrivers = async (drivers: Driver[]) => {
    const url = getScriptUrl();
    if (!url || url.includes('...')) return;

    const payload = {
        action: 'UPDATE_DRIVERS',
        drivers: JSON.stringify(drivers)
    };

    try {
        await fetch(url, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error("Drivers sync error", e);
    }
};

export const fetchDrivers = async (): Promise<Driver[] | null> => {
    const url = getScriptUrl();
    if (!url || url.includes('...')) return null;

    try {
        const response = await fetch(`${url}?action=GET_DRIVERS`);
        const json = await response.json();
        if (json.status === 'success' && json.data) {
            return JSON.parse(json.data);
        }
    } catch (e) {
        console.error("Fetch drivers error", e);
    }
    return null;
};