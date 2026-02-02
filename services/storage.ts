import { WorkDay, LocationRate, Trip, DayType, AppSettings, Driver } from '../types';
import * as ApiService from './api'; // Import API service
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  DAYS: 'kierowcapro_days',
  LOCATIONS: 'kierowcapro_locations',
  DRIVERS: 'kierowcapro_drivers',
  SETTINGS: 'kierowcapro_settings',
};

// --- Initial Data from Excel ---
const INITIAL_LOCATIONS: LocationRate[] = [
  { id: '1', name: 'Siemianowice DOMBUD', rate: 2.85 },
  // ... (reszta skrócona dla czytelności kodu, ale w produkcji powinna zostać zachowana lub pobrana z chmury)
  { id: 'extra3', name: 'MATERIAŁ FREZY', rate: 9 },
];

const DEFAULT_SETTINGS: AppSettings = {
  vacationRateOld: 210,
  vacationRateNew: 230,
  sickLeaveRate: 150,
  hourlyRate: 4.5,
  workshopRate: 10,
  waitingRate: 8,
  
  totalVacationDays: 30, // Łącznie z zaległym
  vacationDaysLimit: 26  // Limit bieżącego roku
};

// --- Settings Logic ---

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
};

// --- Locations Logic ---

export const getLocations = (): LocationRate[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
  if (data) {
    return JSON.parse(data);
  } else {
    // Seed initial data if empty
    saveLocations(INITIAL_LOCATIONS, false); // Don't sync init seed to avoid overwrite cloud empty state
    return INITIAL_LOCATIONS;
  }
};

export const saveLocations = (locations: LocationRate[], sync = true) => {
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  if (sync) {
      ApiService.syncLocations(locations);
  }
};

// --- Drivers Logic ---

export const getDrivers = (): Driver[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DRIVERS);
  return data ? JSON.parse(data) : [];
};

export const saveDrivers = (drivers: Driver[], sync = true) => {
  localStorage.setItem(STORAGE_KEYS.DRIVERS, JSON.stringify(drivers));
  if (sync) {
    ApiService.syncDrivers(drivers);
  }
};


// --- Work Days Logic ---

export const getWorkDays = (): WorkDay[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DAYS);
  return data ? JSON.parse(data) : [];
};

export const saveWorkDays = (days: WorkDay[]) => {
  localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
  // Trigger Sync
  const settings = getSettings();
  if (settings.driverId) {
    ApiService.syncDriverData(settings.driverId, days);
  }
};

export const getDayById = (id: string): WorkDay | undefined => {
  const days = getWorkDays();
  return days.find((d) => d.id === id);
};

// Helper: Recalculate vacation rates based on pool usage
const recalculateVacations = (allDays: WorkDay[]): WorkDay[] => {
    const settings = getSettings();
    const oldVacationPool = Math.max(0, settings.totalVacationDays - settings.vacationDaysLimit);
    
    // Process each year separately to be safe, although usually user cares about current year
    const years = Array.from(new Set(allDays.map(d => new Date(d.date).getFullYear())));
    
    let updatedDays = [...allDays];

    years.forEach(year => {
        // Filter vacation days for this year
        const vacationDays = updatedDays
            .filter(d => d.type === DayType.VACATION && new Date(d.date).getFullYear() === year)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        // Apply rates: First X days get OLD rate, rest get NEW rate
        vacationDays.forEach((day, index) => {
            const isOldRate = index < oldVacationPool;
            day.totalAmount = isOldRate ? settings.vacationRateOld : settings.vacationRateNew;
        });

        // Update the main array
        updatedDays = updatedDays.map(d => {
            const updatedVacation = vacationDays.find(vd => vd.id === d.id);
            return updatedVacation || d;
        });
    });

    return updatedDays;
};

export const saveDay = (day: WorkDay) => {
  let days = getWorkDays();
  const index = days.findIndex((d) => d.id === day.id);
  
  // Calculate specific day totals first (standard calculation)
  const calculatedDay = calculateDayTotals(day);

  if (index >= 0) {
    days[index] = calculatedDay;
  } else {
    days.push(calculatedDay);
  }

  // RECALCULATE VACATIONS GLOBALLY
  // This ensures that if we added a vacation day in the past, rates shift correctly
  if (calculatedDay.type === DayType.VACATION || days.some(d => d.type === DayType.VACATION)) {
      days = recalculateVacations(days);
  }

  // Sort by date desc
  days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveWorkDays(days);
};

export const deleteDay = (id: string) => {
  let days = getWorkDays().filter((d) => d.id !== id);
  
  // Recalculate vacations in case we deleted one, shifting the pool
  days = recalculateVacations(days);
  
  saveWorkDays(days);
};

// --- Calculation Logic ---

export const calculateTrip = (weight: number, rate: number): { amount: number; bonus: number } => {
  const amount = weight * rate;
  const bonus = amount * 0.20; // 20% fuel bonus
  return { amount, bonus };
};

const calculateDurationHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60; // Handle overnight
  
  return diff / 60;
};

export const calculateDayTotals = (day: WorkDay): WorkDay => {
  const settings = getSettings();
  const zeros = {
    totalBonus: 0,
    totalHourlyBonus: 0,
    totalWeight: 0,
    workshopHours: 0,
    totalWorkshop: 0,
    waitingHours: 0,
    totalWaiting: 0,
    trips: []
  };

  // 1. URLOP
  if (day.type === DayType.VACATION) {
    // Note: The specific rate (old vs new) is handled in saveDay -> recalculateVacations
    // For live preview, we fallback to New Rate or keep existing if editing
    return {
      ...day,
      totalAmount: day.totalAmount || settings.vacationRateNew, 
      ...zeros
    };
  }

  // 2. L4 (SICK LEAVE)
  if (day.type === DayType.SICK_LEAVE) {
    return {
      ...day,
      totalAmount: settings.sickLeaveRate,
      ...zeros
    };
  }

  // 3. WORK - Calculate Trips AND Hourly Bonus AND Workshop
  let totalAmount = 0;
  let totalBonus = 0;
  let totalWeight = 0;
  let totalHourlyBonus = 0;

  // Hourly Bonus: Hours * Rate
  // FIX: Only calculate if endTime is explicitly different than default "04:00"
  // This prevents calculation of ~23h if user changes Start to 04:40 but leaves End at 04:00.
  if (day.startTime && day.endTime && day.endTime !== '04:00') {
     const hours = calculateDurationHours(day.startTime, day.endTime);
     totalHourlyBonus = hours * settings.hourlyRate;
  }

  // Workshop Bonus
  const workshopHours = day.workshopHours || 0;
  const totalWorkshop = workshopHours * settings.workshopRate;

  // Waiting Bonus
  const waitingHours = day.waitingHours || 0;
  const totalWaiting = waitingHours * settings.waitingRate;

  const recalculatedTrips = day.trips.map(trip => {
    const { amount, bonus } = calculateTrip(trip.weight, trip.rate);
    totalAmount += amount;
    totalBonus += bonus;
    totalWeight += trip.weight;
    return { ...trip, amount, bonus };
  });

  return {
    ...day,
    trips: recalculatedTrips,
    totalAmount,
    totalBonus,
    totalHourlyBonus,
    totalWorkshop,
    totalWaiting,
    totalWeight
  };
};

// --- Import/Export ---

export const exportData = () => {
  const data = {
    settings: getSettings(),
    locations: getLocations(),
    days: getWorkDays(),
    exportDate: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kierowcapro_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const importData = async (file: File): Promise<boolean> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (data.settings) {
      saveSettings(data.settings);
    }
    if (data.locations && Array.isArray(data.locations)) {
      saveLocations(data.locations, true); // Sync after import
    }
    if (data.days && Array.isArray(data.days)) {
      saveWorkDays(data.days);
    }
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};