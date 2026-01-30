import { WorkDay, LocationRate, Trip, DayType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEYS = {
  DAYS: 'kierowcapro_days',
  LOCATIONS: 'kierowcapro_locations',
};

// --- Initial Data from Excel ---
const INITIAL_LOCATIONS: LocationRate[] = [
  { id: '1', name: 'Siemianowice DOMBUD', rate: 2.85 },
  { id: '2', name: 'Ruda Śląska DOMBUD', rate: 2.6 },
  { id: '3', name: 'Ruda Śląska STRABAG', rate: 2.45 },
  { id: '4', name: 'Bielsko Biała STRABAG', rate: 4 },
  { id: '5', name: 'Triniec - Górażdże', rate: 120 },
  { id: '6', name: 'Rogi OTACZARNIA', rate: 1.75 },
  { id: '7', name: 'Dąbrowa Górnicza - Górażdże ŻUŻEL', rate: 90 },
  { id: '8', name: 'Górażdże - D. Górnicza KLINKIER', rate: 4 },
  { id: '9', name: 'Kotlarnia - Sieroniowice', rate: 1.65 },
  { id: '10', name: 'Kobylice - Sieroniowice', rate: 1.75 },
  { id: '11', name: 'Katowice / Miedziana DROGOPOL', rate: 3 },
  { id: '12', name: 'Libiąż - Azoty', rate: 3 },
  { id: '13', name: 'Sieroniowice SETTLINE', rate: 1.1 },
  { id: '14', name: 'Lubojenka WMB', rate: 3.7 },
  { id: '15', name: 'Łękawica PRDM', rate: 4.8 },
  { id: '16', name: 'Wyry BUDIMEX', rate: 2.85 },
  { id: '17', name: 'Mysłowice EUROBUD', rate: 3.15 },
  { id: '18', name: 'Błotnica Strzelecka KREDPASZ', rate: 1.2 },
  { id: '19', name: 'Katowice / Krakowska GENERAL BETON', rate: 3 },
  { id: '20', name: 'Rybnik MAXBUD', rate: 2.75 },
  { id: '21', name: 'Racibórz TRAWIŃSKI', rate: 2.6 },
  { id: '22', name: 'Piekary Śląskie DROGOPOL', rate: 2.2 },
  { id: '23', name: 'Świętochłowice LAFARGE', rate: 2.1 },
  { id: '24', name: 'Żory HLS SYSTEM', rate: 2.4 },
  { id: '25', name: 'Zbrosławice GZK', rate: 2.05 },
  { id: '26', name: 'Siemianowice EKOBET', rate: 2.7 },
  { id: '27', name: 'Zabrze CEMEX', rate: 2.2 },
  { id: '28', name: 'Olesno WMB ASFALTY', rate: 2 },
  { id: '29', name: 'Wiśnicze MORYS', rate: 1.2 },
  { id: '30', name: 'Gliwice ZIB', rate: 2.1 },
  { id: '31', name: 'Wola DROGRÓD', rate: 3.85 },
  { id: '32', name: 'Kotulin TARTAK MOPDRZEW', rate: 1 },
  { id: '33', name: 'TMS - Górażdże ŻUŻEL', rate: 90 },
  { id: '34', name: 'Siedliska - Sieroniowice', rate: 2.2 },
  { id: '35', name: 'Roszowice - Sieroniowice', rate: 1.9 },
  { id: '36', name: 'Rybnik BUDIMEX', rate: 2.85 },
  { id: '37', name: 'Kobiór BUDIMEX', rate: 3.15 },
  { id: '38', name: 'Sośnicowice EUROVIA', rate: 1.8 },
  { id: '39', name: 'Mikołów STRABAG', rate: 2.6 },
  { id: '40', name: 'Borowa Wieś STRABAG', rate: 2.3 },
  { id: '41', name: 'Bujaków/ Paniowy STRABAG', rate: 2.75 },
  { id: '42', name: 'Stanowice STRABAG', rate: 2.75 },
  { id: '43', name: 'Orzesze STRABAG', rate: 2.85 },
  { id: '44', name: 'Ornontowice STRABAG', rate: 2.75 },
  { id: '45', name: 'Ciechowice STRABAG', rate: 2.75 },
  { id: '46', name: 'Pyskowice Wieszowa Zabrze STRABAG', rate: 1.65 },
  { id: '47', name: 'Gliwice Łabędy EUROVIA', rate: 2.05 },
  { id: '48', name: 'Pyskowice WYKOPIEMY', rate: 1.65 },
  { id: '49', name: 'Kopciowice STRABAG', rate: 3.2 },
  { id: '50', name: 'Jastrzębie Zdrój BANIMEX', rate: 3 },
  { id: '51', name: 'Gliwice TRANSWATER', rate: 1.6 },
  { id: '52', name: 'Gliwice MICHALIK AIUT', rate: 1.9 },
  { id: '53', name: 'Katowice / Siemianowicka DROGOPOL', rate: 3 },
  { id: '54', name: 'Ziemięcice SIKORA', rate: 1.6 },
  { id: '55', name: 'Kędzierzyn jokey TRANSPORT BUDOWLANY', rate: 1.3 },
  { id: '56', name: 'Częstochowa NDI', rate: 3.2 },
  { id: '57', name: 'Zabrze DROGOPOL', rate: 2.3 },
  { id: '58', name: 'Zabrze WŁODAR', rate: 2.3 },
  { id: '59', name: 'Tarnowskie Góry DROGOPOL', rate: 2.2 },
  { id: '60', name: 'Dąbrówka k. Toszka AWM', rate: 1.3 },
  { id: '61', name: 'Kędzierzyn Koźle PAWLISZYN', rate: 1.2 },
  { id: '62', name: 'Kędzierzyn Koźle NAFTOWA Transpol', rate: 1.5 },
  { id: '63', name: 'Korfantów TRANSKOM', rate: 2.1 },
  { id: '64', name: 'Krapkowice TRANSKOM DELFIN', rate: 1.65 },
  { id: '65', name: 'Pietrowice Wielkie TRANSKOM', rate: 2.3 },
  { id: '66', name: 'Ponięcice TRANSKOM', rate: 1.8 },
  { id: '67', name: 'Poborszów Piaskownia TRANSKOM', rate: 1.9 },
  { id: '68', name: 'Ligota Książęca TRANSKOM', rate: 2.1 },
  { id: '69', name: 'Rogi TRANSKOM', rate: 1.65 },
  { id: '70', name: 'Rudziniec TRANSKOM', rate: 1.65 },
  { id: '71', name: 'Sławików TRANSKOM', rate: 2.1 },
  { id: '72', name: 'Kędzierzyn Koźle / Spacerowa TRANSKOM', rate: 1.3 },
  { id: '73', name: 'Zakrzów k. Gogolina TRANSKOM', rate: 1.2 },
  { id: '74', name: 'Krupski Młyn TRANSKOM', rate: 1.5 },
  { id: '75', name: 'Dziergowice TRANSKOM', rate: 1.7 },
  { id: '76', name: 'Ujazd TRANSKOM', rate: 1.4 },
  { id: '77', name: 'Potępa/Żyłka TRANSKOM', rate: 1.5 },
  { id: '78', name: 'Lichynia TRANSKOM', rate: 1.2 },
  { id: '79', name: 'Zimnice Wielkie TRANSKOM', rate: 1.6 },
  { id: '80', name: 'Jaryszów RSP WAPNO', rate: 1.3 },
  { id: '81', name: 'Schodnia k.Ozimka', rate: 1.9 },
  { id: '82', name: 'Goszyce', rate: 2.2 },
  { id: '83', name: 'Rudnik TRANSKOM', rate: 2.2 },
  { id: '84', name: 'Kopice TRANSKOM', rate: 2.6 },
  { id: '85', name: 'Sieroniowice TRANSKOM', rate: 1.1 },
  { id: '86', name: 'Komorniki TRANSKOM', rate: 1.75 },
  { id: '87', name: 'Pokrzywnica / Pociękarb TRANSKOM', rate: 1.9 },
  { id: '88', name: 'Chrósty TRANSKOM', rate: 2.05 },
  { id: '89', name: 'Ujazd TRANSKOM (2)', rate: 1.5 },
  { id: '90', name: 'Ślemień STRABAG', rate: 3.8 },
  { id: '91', name: 'Suchodaniec FARMA', rate: 1 },
  { id: '92', name: 'Racibórz HYDROMAT', rate: 2.6 },
  { id: '93', name: 'Pilchowice COLAS', rate: 2.2 },
  { id: '94', name: 'Boroszów / Olesno ZABERD', rate: 2.3 },
  { id: '95', name: 'Bierawa TRANSKOM', rate: 1.75 },
  { id: '96', name: 'Roszowice - Poborszów', rate: 1.4 },
  { id: '97', name: 'Kobylice - Rogi', rate: 1.1 },
  { id: '98', name: 'Nasławice SOBÓTKA - Rogi', rate: 3.8 },
  { id: '99', name: 'Trzebina - Rogi', rate: 2.05 },
  { id: '100', name: 'Chrzanów - Azoty', rate: 2.6 },
  { id: '101', name: 'Chruszczobród - Azoty', rate: 3.15 },
  { id: '102', name: 'DINO Sieroniowice', rate: 1.2 },
  { id: '103', name: 'Sieroniowice - Skała POSPÓŁKA', rate: 1 },
  { id: '104', name: 'Rogi - Pociękarb', rate: 1.7 },
  { id: '105', name: 'Rogi - Rozmierka', rate: 2.7 },
  { id: '106', name: 'Rogi - Poborszów', rate: 1.7 },
  { id: '107', name: 'Rogi - Komorniki', rate: 2.35 },
  { id: '108', name: 'Rogi - Reńska Wieś', rate: 1.5 },
  { id: '109', name: 'Rogi - Dobieszowice', rate: 3.1 },
  { id: '110', name: 'Rogi - Potępa', rate: 2.7 },
  { id: '111', name: 'Rogi - Tarnów Opolski', rate: 2.4 },
  { id: '112', name: 'Rogi - Krupski Młyn', rate: 2.7 },
  { id: '113', name: 'Rogi - Poniszowice', rate: 2.15 },
  { id: '114', name: 'Rogi - Pławniowice', rate: 2.15 },
  { id: '115', name: 'Rogi - Strzelce Opolskie', rate: 1.95 },
  { id: '116', name: 'Rogi - Jaryszów', rate: 1.2 },
  { id: '117', name: 'Rogi - Zimnice Wielkie', rate: 2.45 },
  { id: '118', name: 'Rogi - Murów', rate: 3.3 },
  { id: '119', name: 'Niemodlin - Zimnice Wielkie', rate: 1.5 },
  { id: '120', name: 'Rogi - Korfantów', rate: 3.4 },
  { id: '121', name: 'Rogi - Ponięcice', rate: 2 },
  { id: '122', name: 'Rogi - KK Spacerowa', rate: 1.8 },
  { id: '123', name: 'Rogi - Kopice', rate: 3.3 },
  { id: '124', name: 'Rogi - Gamów', rate: 2.15 },
  { id: '125', name: 'Rogi - Łącznik', rate: 1.8 },
  { id: '126', name: 'Rogi - Rybnik MOSTOSTAL', rate: 2.5 },
  { id: '127', name: 'Sieroniowice - Żyrowa WIESIOLLEK', rate: 40 },
  { id: '128', name: 'Krapkowice - Rogi FREZY', rate: 46 },
  { id: '129', name: 'Rogi - Kopice (2)', rate: 50 },
  { id: '130', name: 'Kędzierzyn - Rogi FREZY', rate: 32 },
  { id: '131', name: 'Chruszczobród - Bytom SCHUETFLIX', rate: 1.75 },
  { id: '132', name: 'Kamienna Góra - Strzelce Op. SCHUETFLIX', rate: 3.6 },
  { id: '133', name: 'Chrzanów - Ruda Śląska SCHUETFLIX', rate: 1.9 },
  { id: '134', name: 'Kietrz Karłowiec WAPNO', rate: 3.3 },
  { id: '135', name: 'Kietrz Czerwonków WAPNO', rate: 2.1 },
  { id: '136', name: 'Kalinów WAPNO', rate: 1.2 },
  { id: '137', name: 'Częstochowa - Gołuszowice WAPNO', rate: 4.1 },
  { id: '138', name: 'Libiąż - Lisów WAPNO', rate: 3.7 },
  { id: '139', name: 'Rogi - Jaryszów (2)', rate: 1.3 },
  { id: '140', name: 'Kłobuck DREWBET', rate: 3 },
  { id: '141', name: 'Ujazd TRANSKOM (3)', rate: 1.5 },
  { id: '142', name: 'HALDEX Mikołów - Opole MIAŁ', rate: 3 },
  { id: '143', name: 'Wieluń WŁODAR', rate: 3.4 },
  { id: '144', name: 'Rogi - Łany TRANSKOM', rate: 1.4 },
  { id: '145', name: 'Racibórz - Mechnica', rate: 1.9 },
  { id: '146', name: 'Libiąż - Grzegorzowice STRABAG', rate: 3.4 },
  { id: '147', name: 'Łany k. Polska Cerkiew TRANSKOM', rate: 2.2 },
  { id: '148', name: 'Mysłowice - Opole MIAŁ', rate: 3.6 },
  { id: '149', name: 'Zabrze BRUK BETON', rate: 1.9 },
  { id: '150', name: 'Żyrowa WIESIOLLEK', rate: 1.3 },
  { id: '151', name: 'Poborszów - Settline', rate: 1.75 },
  { id: '152', name: 'Sosnowiec BALTIC', rate: 3.7 },
  { id: '153', name: 'Poborszów - Sławięcice GÓRAŻDŻE', rate: 1.4 },
  { id: '154', name: 'Kędzierzyn DOMOWSKIEGO', rate: 1.5 },
  { id: '155', name: 'Bieruń IFRAX', rate: 3.5 },
  { id: '156', name: 'Rogi - KK Dmowskiego 0-30', rate: 1 },
  { id: '157', name: 'Łubie WYKOPIEMY Pyskowice', rate: 1.65 },
  { id: '158', name: 'Opole DRUTEX', rate: 1.5 },
  { id: '159', name: 'Leśnica Krasowa TRANSKOM', rate: 1.4 },
  { id: '160', name: 'Knurów ACSON', rate: 2.2 },
  { id: '161', name: 'Trasa NS Ruda Śl EUROVIA', rate: 2.6 },
  { id: '162', name: 'Branice', rate: 3.3 },
  { id: '163', name: 'PRuda Śląska DOMBUD', rate: 2.75 },
  { id: '164', name: 'PSiemianowice DOMBUD', rate: 3 },
  { id: '165', name: 'PSettline', rate: 1.75 },
  { id: '166', name: 'Ścinawa Nyska WAPNO', rate: 2.6 },
  { id: '167', name: 'PSwietochłowice HOLCIM', rate: 2.75 },
  // --- Extras from bottom of list ---
  { id: 'extra1', name: 'DODATEK SOBOTA', rate: 70 },
  { id: 'extra2', name: 'MATERIAŁ MASA', rate: 9 },
  { id: 'extra3', name: 'MATERIAŁ FREZY', rate: 9 },
];

// --- Locations Logic ---

export const getLocations = (): LocationRate[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOCATIONS);
  if (data) {
    return JSON.parse(data);
  } else {
    // Seed initial data if empty
    saveLocations(INITIAL_LOCATIONS);
    return INITIAL_LOCATIONS;
  }
};

export const saveLocations = (locations: LocationRate[]) => {
  localStorage.setItem(STORAGE_KEYS.LOCATIONS, JSON.stringify(locations));
};

// --- Work Days Logic ---

export const getWorkDays = (): WorkDay[] => {
  const data = localStorage.getItem(STORAGE_KEYS.DAYS);
  return data ? JSON.parse(data) : [];
};

export const saveWorkDays = (days: WorkDay[]) => {
  localStorage.setItem(STORAGE_KEYS.DAYS, JSON.stringify(days));
};

export const getDayById = (id: string): WorkDay | undefined => {
  const days = getWorkDays();
  return days.find((d) => d.id === id);
};

export const saveDay = (day: WorkDay) => {
  const days = getWorkDays();
  const index = days.findIndex((d) => d.id === day.id);
  
  // Recalculate totals ensuring formatting is correct
  const updatedDay = calculateDayTotals(day);

  if (index >= 0) {
    days[index] = updatedDay;
  } else {
    days.push(updatedDay);
  }
  // Sort by date desc
  days.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  saveWorkDays(days);
};

export const deleteDay = (id: string) => {
  const days = getWorkDays().filter((d) => d.id !== id);
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
  // Logic based on user excel formulas/constants
  
  // 1. URLOP = 210 PLN Fixed
  if (day.type === DayType.VACATION) {
    return {
      ...day,
      totalAmount: 210,
      totalBonus: 0,
      totalHourlyBonus: 0,
      totalWeight: 0,
      workshopHours: 0,
      totalWorkshop: 0,
      waitingHours: 0,
      totalWaiting: 0,
      trips: []
    };
  }

  // 2. WORK - Calculate Trips AND Hourly Bonus AND Workshop
  let totalAmount = 0;
  let totalBonus = 0;
  let totalWeight = 0;
  let totalHourlyBonus = 0;

  // Hourly Bonus: Hours * 4.5 PLN
  if (day.startTime && day.endTime) {
     const hours = calculateDurationHours(day.startTime, day.endTime);
     totalHourlyBonus = hours * 4.5;
  }

  // Workshop Bonus: Hours * 10 PLN
  const workshopHours = day.workshopHours || 0;
  const totalWorkshop = workshopHours * 10;

  // Waiting Bonus: Hours * 8 PLN
  const waitingHours = day.waitingHours || 0;
  const totalWaiting = waitingHours * 8;

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
    if (data.locations && Array.isArray(data.locations)) {
      saveLocations(data.locations);
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