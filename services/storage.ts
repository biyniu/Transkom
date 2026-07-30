
import { WorkDay, LocationRate, Trip, DayType, AppSettings, Driver } from '../types';
import * as ApiService from './api';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  DAYS: 'kierowcapro_days',
  LOCATIONS: 'kierowcapro_locations',
  DRIVERS: 'kierowcapro_drivers',
  SETTINGS: 'kierowcapro_settings',
};

const INITIAL_LOCATIONS: LocationRate[] = [
  { id: '1', name: 'Siemianowice DOMBUD', rate: 2.85 },
  { id: 'extra3', name: 'MATERIAŁ FREZY', rate: 9 },
];

const DEFAULT_SETTINGS: AppSettings = {
  vacationRateOld: 210,
  vacationRateNew: 210,
  sickLeaveRate: 150,
  hourlyRate: 4.5,
  extraHourlyRate: 30,
  workshopRate: 10,
  waitingRate: 8,
  totalVacationDays: 30,
  vacationDaysLimit: 26
};

export const getSettings = (): AppSettings => {
  const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
  return data ? JSON.parse(data) : DEFAULT_SETTINGS;
};

export const saveSettings = (settings: AppSettings, sync = true) => {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  if (sync && settings.driverId) {
    ApiService.syncSettings(settings.driverId, settings);
  }
};

export const getLocations = (): LocationRate[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
  return data ? JSON.parse(data) : INITIAL_LOCATIONS;
};

export const saveLocations = (locations: LocationRate[], sync = true) => {
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
  if (sync) {
      ApiService.syncLocations(locations);
  }
};

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

export const getWorkDays = (): WorkDay[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DAYS);
  const days: WorkDay[] = data ? JSON.parse(data) : [];
  // Zawsze zwracaj posortowane, aby Dashboard miał bazę do wyświetlania
  return days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const saveWorkDays = (days: WorkDay[], sync = true) => {
  const sortedDays = days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(sortedDays));
  if (sync) {
    const settings = getSettings();
    if (settings.driverId) {
        ApiService.syncAllDays(settings.driverId, sortedDays);
    }
  }
};

export const getDayById = (id: string): WorkDay | undefined => {
  const days = getWorkDays();
  return days.find((d) => d.id === id);
};

const recalculateVacations = (allDays: WorkDay[]): WorkDay[] => {
    const settings = getSettings();
    const oldVacationPool = Math.max(0, settings.totalVacationDays - settings.vacationDaysLimit);
    const years = Array.from(new Set(allDays.map(d => new Date(d.date).getFullYear())));
    let updatedDays = [...allDays];

    years.forEach(year => {
        const vacationDays = updatedDays
            .filter(d => d.type === DayType.VACATION && new Date(d.date).getFullYear() === year)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        vacationDays.forEach((day, index) => {
            const isOldRate = index < oldVacationPool;
            day.totalAmount = isOldRate ? settings.vacationRateOld : settings.vacationRateNew;
        });

        updatedDays = updatedDays.map(d => {
            const updatedVacation = vacationDays.find(vd => vd.id === d.id);
            return updatedVacation || d;
        });
    });

    return updatedDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const saveDay = (day: WorkDay) => {
  let days = getWorkDays();
  const index = days.findIndex((d) => d.id === day.id);
  const calculatedDay = calculateDayTotals(day);

  if (index >= 0) {
    days[index] = calculatedDay;
  } else {
    days.push(calculatedDay);
  }

  if (calculatedDay.type === DayType.VACATION || days.some(d => d.type === DayType.VACATION)) {
      days = recalculateVacations(days);
      saveWorkDays(days, true);
  } else {
      const sortedDays = days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(sortedDays));
      const settings = getSettings();
      if (settings.driverId) {
          ApiService.syncSingleDay(settings.driverId, calculatedDay);
      }
  }
};

export const deleteDay = (id: string) => {
  let days = getWorkDays();
  const filteredDays = days.filter((d) => d.id !== id);
  const updatedDays = recalculateVacations(filteredDays);
  
  localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(updatedDays));
  const settings = getSettings();
  if (settings.driverId) {
      ApiService.deleteSingleDay(settings.driverId, id);
      if (JSON.stringify(filteredDays) !== JSON.stringify(updatedDays)) {
          ApiService.syncAllDays(settings.driverId, updatedDays);
      }
  }
};

export const updateRecentHistoryRates = (): number => {
    const originalDays = getWorkDays();
    const locations = getLocations();
    const settings = getSettings();
    const now = new Date();
    
    // Zakres: 1. dzień POPRZEDNIEGO miesiąca.
    const cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    cutoffDate.setHours(0, 0, 0, 0);

    // 1. Przeliczamy urlopy dla WSZYSTKICH dni (aby zachować ciągłość limitów),
    // ale zapiszemy zmiany tylko dla dni z zakresu.
    const vacationCorrectedDays = recalculateVacations(originalDays);

    let modifiedDaysCount = 0;
    const modifiedDays: WorkDay[] = [];

    const updatedDays = vacationCorrectedDays.map(vDay => {
        // Znajdź oryginał, aby porównać zmiany
        const originalDay = originalDays.find(d => d.id === vDay.id) || vDay;
        
        const dayDate = new Date(vDay.date);
        dayDate.setHours(0,0,0,0);
        
        // Pomijamy dni spoza zakresu (obecny + poprzedni miesiąc)
        // Dla dni starszych zwracamy ORYGINAŁ (nie chcemy zmieniać historycznych rozliczeń urlopów)
        if (dayDate < cutoffDate) return originalDay;

        // Pracujemy na kopii dnia, który ma już potencjalnie poprawioną stawkę urlopową (z vacationCorrectedDays)
        let processedDay = { ...vDay };

        // A. Aktualizacja stawek "dniowych" (L4, Godziny, Warsztat, Postój)
        // calculateDayTotals pobiera aktualne settings i przelicza sumy
        if (processedDay.type === DayType.WORK || processedDay.type === DayType.SICK_LEAVE) {
             processedDay = calculateDayTotals(processedDay);
        }

        // B. Aktualizacja stawek za Miejscowości (tylko dla WORK)
        if (processedDay.type === DayType.WORK) {
            let tripsModified = false;
            
            const newTrips = processedDay.trips.map(trip => {
                // 1. Próba znalezienia po ID
                let loc = locations.find(l => l.id === trip.locationId);

                // 2. FALLBACK: Jeśli ID nie pasuje (lub go brak), szukamy po NAZWIE
                if (!loc && trip.locationName) {
                    const searchName = trip.locationName.trim().toLowerCase();
                    loc = locations.find(l => l.name.trim().toLowerCase() === searchName);
                }

                if (loc) {
                    // Sprawdzamy różnice (Stawka, Nazwa, ID, Kwoty)
                    const isRateDiff = Math.abs(loc.rate - (trip.rate || 0)) > 0.001;
                    const isNameDiff = loc.name !== trip.locationName;
                    const isIdDiff = loc.id !== trip.locationId; 
                    
                    const { amount, bonus } = calculateTrip(trip.weight, loc.rate);
                    
                    const isAmountDiff = Math.abs(amount - trip.amount) > 0.01;
                    const isBonusDiff = Math.abs(bonus - trip.bonus) > 0.01;

                    if (isRateDiff || isNameDiff || isAmountDiff || isBonusDiff || isIdDiff) {
                        tripsModified = true;
                        return { 
                            ...trip, 
                            locationId: loc.id,
                            locationName: loc.name,
                            rate: loc.rate,
                            amount,
                            bonus
                        };
                    }
                }
                return trip;
            });

            if (tripsModified) {
                // Ponowne przeliczenie sumy dnia po aktualizacji kursów
                processedDay = calculateDayTotals({ ...processedDay, trips: newTrips });
            }
        }

        // Sprawdzamy czy cokolwiek się zmieniło względem oryginału
        // Używamy JSON.stringify do głębokiego porównania
        if (JSON.stringify(processedDay) !== JSON.stringify(originalDay)) {
            modifiedDaysCount++;
            modifiedDays.push(processedDay);
            return processedDay;
        }

        return originalDay;
    });

    if (modifiedDaysCount > 0) {
        // 1. Zapisujemy lokalnie
        saveWorkDays(updatedDays, false);

        // 2. Synchronizujemy zmienione dni
        if (settings.driverId) {
            ApiService.syncAllDays(settings.driverId, modifiedDays);
        }
    }
    return modifiedDaysCount;
};

export const calculateTrip = (weight: number, rate: number): { amount: number; bonus: number } => {
  const amount = weight * rate;
  const bonus = amount * 0.20;
  return { amount, bonus };
};

const calculateDurationHours = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let diff = (endH * 60 + endM) - (startH * 60 + startM);
  if (diff < 0) diff += 24 * 60;
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
    extraHourlyHours: 0,
    totalExtraHourly: 0,
    trips: []
  };

  if (day.type === DayType.VACATION) {
    return { ...day, totalAmount: day.totalAmount || settings.vacationRateNew, ...zeros };
  }
  if (day.type === DayType.SICK_LEAVE) {
    return { ...day, totalAmount: settings.sickLeaveRate, ...zeros };
  }

  let totalAmount = 0;
  let totalBonus = 0;
  let totalWeight = 0;
  let totalHourlyBonus = 0;

  if (day.startTime && day.endTime && day.endTime !== '04:00') {
     const hours = calculateDurationHours(day.startTime, day.endTime);
     totalHourlyBonus = hours * settings.hourlyRate;
  }

  const workshopHours = (day.workshopEntries || []).reduce((acc, curr) => acc + (curr.hours || 0), 0) || day.workshopHours || 0;
  const totalWorkshop = workshopHours * settings.workshopRate;
  const waitingHours = (day.waitingEntries || []).reduce((acc, curr) => acc + (curr.hours || 0), 0) || day.waitingHours || 0;
  const totalWaiting = waitingHours * settings.waitingRate;
  const extraHourlyHours = day.extraHourlyHours || 0;
  const totalExtraHourly = extraHourlyHours * settings.extraHourlyRate;

  // Saturday Bonus: If WORK day and day of week is Saturday (6)
  let saturdayBonus = 0;
  if (day.type === DayType.WORK && day.date) {
    const [y, m, dPart] = day.date.split('-').map(Number);
    const d = new Date(y, m - 1, dPart);
    // getDay() returns 0 for Sunday, 6 for Saturday
    if (d.getDay() === 6) {
      saturdayBonus = 70;
    }
  }

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
    totalExtraHourly,
    saturdayBonus,
    totalWeight
  };
};

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
    if (data.settings) saveSettings(data.settings, true);
    if (data.locations && Array.isArray(data.locations)) saveLocations(data.locations, true);
    if (data.days && Array.isArray(data.days)) saveWorkDays(data.days, true);
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};
