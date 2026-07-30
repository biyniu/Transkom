
export interface LocationRate {
  id: string;
  name: string;
  rate: number; // Stawka za tonę (Przelicznik)
}

export interface Driver {
  id: string;
  name: string;
  code: string; // Unikalny kod logowania
}

export interface Trip {
  id: string;
  locationId: string;
  locationName: string; // Kopia nazwy na wypadek usunięcia z bazy
  weight: number; // Tony
  rate: number; // Przelicznik użyty w tym kursie
  amount: number; // Kwota (Tony * Przelicznik)
  bonus: number; // Premia 20%
}

export enum DayType {
  WORK = 'WORK',
  VACATION = 'URLOP',
  SICK_LEAVE = 'L4'
}

export interface AppSettings {
  vacationRateOld: number; // Stara stawka za urlop (np. 210)
  vacationRateNew: number; // Nowa stawka za urlop (np. 230)
  sickLeaveRate: number; // Stawka za L4 (domyślnie 150)
  hourlyRate: number; // Stawka godzinowa (domyślnie 4.5) - premia za czas
  extraHourlyRate: number; // NOWA: Stawka za konkretną pracę na godziny (np. 20)
  workshopRate: number; // Stawka za warsztat (domyślnie 10)
  waitingRate: number; // Stawka za postój (domyślnie 8)
  
  totalVacationDays: number; // Łączna pula dni urlopu (np. 30)
  vacationDaysLimit: number; // Limit nowego urlopu (domyślnie 26)
  
  googleScriptUrl?: string; // URL do Google Apps Script (opcjonalne w settings, bo teraz jest w kodzie)
  driverId?: string; // ID zalogowanego kierowcy
}

export interface WorkshopEntry {
  id: string;
  description: string;
  hours: number;
}

export interface WaitingEntry {
  id: string;
  description: string;
  hours: number;
}

export interface WorkDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: DayType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  // restTime removed
  trips: Trip[];
  
  workshopEntries?: WorkshopEntry[]; // NOWE: Lista prac warsztatowych
  workshopHours?: number; // Suma godzin na warsztacie
  totalWorkshop?: number; // Zarobek z warsztatu (h * 10)
  
  waitingEntries?: WaitingEntry[]; // NOWE: Lista postojów
  waitingHours?: number; // Suma godzin oczekiwania
  waitingNote?: string; // Miejsce postoju (zachowuję dla kompatybilności wstecznej)
  totalWaiting?: number; // Zarobek z oczekiwania (h * 8)
  
  totalAmount: number; // Suma kwot z kursów

  extraHourlyHours?: number; // NOWA: Ilość godzin pracy dodatkowej
  totalExtraHourly?: number; // NOWA: Zarobek z pracy dodatkowej (h * extraHourlyRate)

  saturdayBonus?: number; // NOWA: Dodatek za pracującą sobotę (70 zł)

  totalWeight: number; // Suma ton
  note: string;
  
  // Fuel / Mileage tracking
  odometer?: number; // Stan licznika
  fuelLiters?: number; // Ilość zatankowanych litrów
  avgConsumptionComputer?: number; // Średnie spalanie z komputera
  distanceFromLastRefuel?: number; // Wyliczone: Ilość km od tankowania
  avgConsumptionCalc?: number; // Wyliczone: Średnie spalanie (litry/100km)
  
  dailyDistance?: number; // NOWE: Przejechane kilometry danego dnia
  dailyAvgConsumption?: number; // NOWE: Średnie spalanie z komputera z danego dnia
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalEarned: number;
  totalTons: number;
  daysWorked: number;
}
