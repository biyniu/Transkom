export interface LocationRate {
  id: string;
  name: string;
  rate: number; // Stawka za tonę (Przelicznik)
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
  VACATION = 'URLOP'
}

export interface WorkDay {
  id: string;
  date: string; // YYYY-MM-DD
  type: DayType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  // restTime removed
  trips: Trip[];
  totalAmount: number; // Suma kwot z kursów
  totalBonus: number; // Suma premii paliwowej 20%
  totalHourlyBonus: number; // Premia godzinowa (4.5 zł/h)
  
  workshopHours?: number; // Ilość godzin na warsztacie
  totalWorkshop?: number; // Zarobek z warsztatu (h * 10)
  
  waitingHours?: number; // Ilość godzin oczekiwania
  waitingNote?: string; // Miejsce postoju
  totalWaiting?: number; // Zarobek z oczekiwania (h * 8)

  totalWeight: number; // Suma ton
  note: string;
}

export interface MonthlyStats {
  month: string; // YYYY-MM
  totalEarned: number;
  totalTons: number;
  daysWorked: number;
}