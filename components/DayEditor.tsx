
import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, ArrowLeft, Clock, Search, X, Wrench, Hourglass, Fuel, Route, Moon, Briefcase, AlertTriangle, ChevronDown, ChevronUp, Edit, Check } from 'lucide-react';
import { WorkDay, DayType, LocationRate, Trip, AppSettings, WorkshopEntry, WaitingEntry } from '../types';
import * as StorageService from '../services/storage';

interface DayEditorProps {
  dayId?: string | null;
  onClose: () => void;
}

const DayEditor: React.FC<DayEditorProps> = ({ dayId, onClose }) => {
  const [locations, setLocations] = useState<LocationRate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  
  // Local UI states to keep inputs visible even if value is 0 during typing
  const [showExtraHourly, setShowExtraHourly] = useState(false);
  
  // State for Daily Rest Calculation
  const [restInfo, setRestInfo] = useState<{ label: string; colorClass: string } | null>(null);
  const [isExtrasExpanded, setIsExtrasExpanded] = useState(false);

  // State for Trip Modal
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);

  const [day, setDay] = useState<WorkDay>({
    id: new Date().toISOString().slice(0, 10), // Default ID is today's date
    date: new Date().toISOString().slice(0, 10),
    type: DayType.WORK,
    startTime: '04:00',
    endTime: '04:00',
    trips: [],
    workshopEntries: [],
    workshopHours: 0,
    totalWorkshop: 0,
    waitingEntries: [],
    waitingHours: 0,
    waitingNote: '',
    totalWaiting: 0,
    extraHourlyHours: 0,
    totalExtraHourly: 0,
    totalAmount: 0,
    totalBonus: 0,
    totalHourlyBonus: 0,
    totalWeight: 0,
    note: '',
    odometer: 0,
    fuelLiters: 0,
    avgConsumptionComputer: 0,
    distanceFromLastRefuel: 0,
    avgConsumptionCalc: 0
  });

  useEffect(() => {
    setLocations(StorageService.getLocations());
    setSettings(StorageService.getSettings());
    if (dayId) {
      const existingDay = StorageService.getDayById(dayId);
      if (existingDay) {
        setDay(existingDay);
        // Initialize toggles based on existing data
        setShowExtraHourly((existingDay.extraHourlyHours || 0) > 0);
        
        // Auto-expand if any extra is active
        if ((existingDay.workshopHours || 0) > 0 || (existingDay.waitingHours || 0) > 0 || (existingDay.extraHourlyHours || 0) > 0) {
            setIsExtrasExpanded(true);
        }
      }
    } else {
        // Reset toggles for new day
        setShowExtraHourly(false);
        setIsExtrasExpanded(false);
    }
  }, [dayId]);

  // Effect to calculate rest time whenever relevant fields change
  useEffect(() => {
    calculateDailyRest();
  }, [day.date, day.startTime, day.type]);

  useEffect(() => {
    calculateFuelStats();
  }, [day.odometer, day.fuelLiters]);

  const calculateFuelStats = () => {
    if (!day.odometer) return;

    const allDays = StorageService.getWorkDays();
    const otherDays = allDays.filter(d => d.id !== dayId && d.date < day.date && (d.odometer || 0) > 0);
    const sorted = otherDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    const prevDayWithOdo = sorted[0];
    
    let distance = 0;
    if (prevDayWithOdo && prevDayWithOdo.odometer) {
      distance = day.odometer - prevDayWithOdo.odometer;
    }

    let avgCalc = 0;
    if (distance > 0 && day.fuelLiters && day.fuelLiters > 0) {
      avgCalc = (day.fuelLiters / distance) * 100;
    }

    if (day.distanceFromLastRefuel !== distance || day.avgConsumptionCalc !== avgCalc) {
      setDay(prev => ({
        ...prev,
        distanceFromLastRefuel: distance,
        avgConsumptionCalc: avgCalc
      }));
    }
  };

  const addWorkshopEntry = () => {
    const newEntry: WorkshopEntry = { id: uuidv4(), description: '', hours: 1 };
    setDay(prev => ({
      ...prev,
      workshopEntries: [...(prev.workshopEntries || []), newEntry]
    }));
  };

  const updateWorkshopEntry = (id: string, field: keyof WorkshopEntry, value: string | number) => {
    setDay(prev => ({
      ...prev,
      workshopEntries: (prev.workshopEntries || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeWorkshopEntry = (id: string) => {
    setDay(prev => ({
      ...prev,
      workshopEntries: (prev.workshopEntries || []).filter(e => e.id !== id)
    }));
  };

  const addWaitingEntry = () => {
    const newEntry: WaitingEntry = { id: uuidv4(), description: '', hours: 1 };
    setDay(prev => ({
      ...prev,
      waitingEntries: [...(prev.waitingEntries || []), newEntry]
    }));
  };

  const updateWaitingEntry = (id: string, field: keyof WaitingEntry, value: string | number) => {
    setDay(prev => ({
      ...prev,
      waitingEntries: (prev.waitingEntries || []).map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  const removeWaitingEntry = (id: string) => {
    setDay(prev => ({
      ...prev,
      waitingEntries: (prev.waitingEntries || []).filter(e => e.id !== id)
    }));
  };

  const calculateDailyRest = () => {
    if (day.type !== DayType.WORK) {
        setRestInfo(null);
        return;
    }

    const allDays = StorageService.getWorkDays();
    // Filter out current day (in case we are editing an existing one) to find the previous one correctly
    // We filter by ID, but since we might be changing ID (migration), we also filter by strictly different date just in case
    const otherDays = allDays.filter(d => d.id !== dayId && d.date !== day.date && d.type === DayType.WORK);
    
    // Sort descending by date
    const sorted = otherDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentDayDate = new Date(day.date);
    
    // Find the most recent work day strictly BEFORE the current date
    const prevDay = sorted.find(d => new Date(d.date) < currentDayDate);

    if (!prevDay) {
        setRestInfo(null);
        return;
    }

    // Calculate Previous Shift END Timestamp
    let prevEndDate = new Date(`${prevDay.date}T${prevDay.endTime}`);
    const prevStartDate = new Date(`${prevDay.date}T${prevDay.startTime}`);
    
    // Handle overnight shift
    if (prevEndDate <= prevStartDate) {
        prevEndDate.setDate(prevEndDate.getDate() + 1);
    }

    // Calculate Current Shift START Timestamp
    const currentStart = new Date(`${day.date}T${day.startTime}`);

    // Difference in milliseconds
    const diffMs = currentStart.getTime() - prevEndDate.getTime();

    // If negative, it means overlap or data error
    if (diffMs < 0) {
        setRestInfo({
            label: "Błąd (nakładanie się zmian)",
            colorClass: "bg-red-50 text-red-600 border-red-200"
        });
        return;
    }

    const diffMins = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    let colorClass = "bg-green-50 text-green-700 border-green-200"; // Safe
    
    if (hours < 9) {
        colorClass = "bg-red-50 text-red-600 border-red-200";
    } else if (hours < 11) {
        colorClass = "bg-orange-50 text-orange-700 border-orange-200";
    }

    setRestInfo({
        label: `${hours}h ${mins}m`,
        colorClass
    });
  };

  const handleTripChange = (tripId: string, field: keyof Trip, value: any) => {
    const updatedTrips = day.trips.map(trip => {
      if (trip.id !== tripId) return trip;
      const newTrip = { ...trip, [field]: value };
      if (field === 'locationId') {
        const loc = locations.find(l => l.id === value);
        if (loc) {
          newTrip.locationName = loc.name;
          newTrip.rate = loc.rate;
          if (loc.rate > 10) {
            newTrip.weight = 1;
          }
        }
      }
      const { amount, bonus } = StorageService.calculateTrip(newTrip.weight, newTrip.rate);
      newTrip.amount = amount;
      newTrip.bonus = bonus;
      return newTrip;
    });
    setDay({ ...day, trips: updatedTrips });
  };

  const addTrip = () => {
    const newTrip: Trip = {
      id: uuidv4(),
      locationId: '',
      locationName: '',
      weight: 0,
      rate: 0,
      amount: 0,
      bonus: 0
    };
    setEditingTrip(newTrip);
    setIsTripModalOpen(true);
  };

  const openEditTrip = (trip: Trip) => {
    setEditingTrip({ ...trip });
    setIsTripModalOpen(true);
  };

  const handleSaveTrip = (updatedTrip: Trip) => {
    const tripExists = day.trips.find(t => t.id === updatedTrip.id);
    let updatedTrips;
    if (tripExists) {
      updatedTrips = day.trips.map(t => t.id === updatedTrip.id ? updatedTrip : t);
    } else {
      updatedTrips = [updatedTrip, ...day.trips];
    }
    setDay({ ...day, trips: updatedTrips });
    setIsTripModalOpen(false);
    setEditingTrip(null);
  };

  const removeTrip = (id: string) => {
    if (window.confirm('Czy na pewno chcesz usunąć ten kurs?')) {
      setDay({ ...day, trips: day.trips.filter(t => t.id !== id) });
    }
  };

  const handleSave = () => {
    // 1. Check for Overwrites
    // We are about to save with ID = day.date
    const targetId = day.date;
    const existingDay = StorageService.getDayById(targetId);

    // If a day with this date ALREADY exists...
    if (existingDay) {
        // AND we are NOT simply editing that same day (i.e., we are creating new, or changing date of another day)
        if (dayId !== targetId) {
            const confirmed = window.confirm(
                `UWAGA: Istnieje już zapisany dzień z datą ${targetId}!\n\nCzy chcesz go NADPISAĆ? Poprzednie dane z tego dnia zostaną utracone.`
            );
            if (!confirmed) return;
        }
    }

    const dayToSave = { ...day };
    
    // FORCE ID TO BE THE DATE
    // This ensures Firestore docs are named "YYYY-MM-DD"
    dayToSave.id = dayToSave.date;

    if (!showExtraHourly) {
        dayToSave.extraHourlyHours = 0;
        dayToSave.totalExtraHourly = 0;
    }

    // 2. Save the new/updated day
    StorageService.saveDay(dayToSave);

    // 3. MIGRATION LOGIC:
    // If we were editing an existing day (dayId is not null),
    // and the old ID (dayId) is different from the new ID (dayToSave.id aka the date),
    // it means either:
    // a) We changed the date of an entry
    // b) We are saving an old entry that had a UUID, and converting it to Date ID
    // In both cases, we must DELETE the old entry to avoid duplicates.
    if (dayId && dayId !== dayToSave.id) {
        StorageService.deleteDay(dayId);
    }

    onClose();
  };

  const toggleExtraHourly = () => {
    const newState = !showExtraHourly;
    setShowExtraHourly(newState);
    if (newState) {
      setDay({ ...day, extraHourlyHours: 1 });
    } else {
      setDay({ ...day, extraHourlyHours: 0 });
    }
  };

  const totals = StorageService.calculateDayTotals(day);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20 shadow-sm flex-none">
        <button onClick={onClose} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-lg font-bold text-slate-800">
          {dayId ? 'Edycja Dnia' : 'Nowy Dzień'}
        </h2>
        <button 
          onClick={handleSave} 
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium shadow hover:bg-green-700 transition"
        >
          <Save size={18} />
          <span>Zapisz</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        <section className="bg-white p-4 rounded-xl shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Data</label>
              <input 
                type="date" 
                value={day.date} 
                onChange={e => setDay({...day, date: e.target.value})}
                className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 text-lg"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Typ dnia</label>
              <select 
                value={day.type} 
                onChange={e => setDay({...day, type: e.target.value as DayType})}
                className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 font-medium text-slate-700"
              >
                <option value={DayType.WORK}>Praca (Kursy)</option>
                <option value={DayType.VACATION}>Urlop</option>
                <option value={DayType.SICK_LEAVE}>L4 ({settings.sickLeaveRate} zł)</option>
              </select>
            </div>
          </div>

          {(day.type === DayType.WORK) && (
            <div className="animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
                        <input 
                        type="time" 
                        value={day.startTime}
                        onChange={e => setDay({...day, startTime: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg text-center bg-gray-50 text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Koniec</label>
                        <input 
                        type="time" 
                        value={day.endTime}
                        onFocus={() => {
                          if (day.endTime === '04:00') {
                            const now = new Date();
                            const hh = String(now.getHours()).padStart(2, '0');
                            const mm = String(now.getMinutes()).padStart(2, '0');
                            setDay({...day, endTime: `${hh}:${mm}`});
                          }
                        }}
                        onChange={e => setDay({...day, endTime: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg text-center bg-gray-50 text-lg"
                        />
                    </div>
                </div>

                {restInfo && (
                    <div className={`mt-3 px-3 py-2 rounded-lg border flex items-center justify-between shadow-sm ${restInfo.colorClass}`}>
                        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide opacity-90">
                            <Moon size={14} /> Odpoczynek
                        </div>
                        <div className="font-bold text-sm">
                            {restInfo.label}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 mt-4">
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Dzienny przebieg (km)</label>
                        <div className="relative">
                            <Route size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" />
                            <input 
                                type="number"
                                value={day.dailyDistance === 0 ? '' : (day.dailyDistance || '')}
                                onChange={e => setDay({...day, dailyDistance: parseFloat(e.target.value) || 0})}
                                placeholder="0"
                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-300 outline-none text-sm font-bold transition-all"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Spalanie komp. (L/100)</label>
                        <div className="relative">
                            <Fuel size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400" />
                            <input 
                                type="number"
                                step="0.1"
                                value={day.dailyAvgConsumption === 0 ? '' : (day.dailyAvgConsumption || '')}
                                onChange={e => setDay({...day, dailyAvgConsumption: parseFloat(e.target.value) || 0})}
                                placeholder="0.0"
                                className="w-full pl-9 p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-orange-300 outline-none text-sm font-bold transition-all"
                            />
                        </div>
                    </div>
                </div>
            </div>
          )}
        </section>

        {day.type === DayType.WORK && (
          <section className="bg-white rounded-xl shadow-sm overflow-hidden">
             <button
                onClick={() => setIsExtrasExpanded(!isExtrasExpanded)}
                className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
             >
                <div className="flex items-center gap-2 font-medium text-slate-700">
                    <Wrench size={18} className="text-slate-500" />
                    <span>Warsztat, Oczekiwanie</span>
                </div>
                {isExtrasExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
             </button>

             {isExtrasExpanded && (
                 <div className="p-4 pt-0 space-y-6 border-t border-slate-100 animate-fade-in">
                     {/* Workshop Section */}
                     <div className="mt-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-tight">
                                <Wrench size={16} className="text-slate-500" />
                                Warsztat / Naprawa
                            </div>
                            <button 
                                onClick={addWorkshopEntry}
                                className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold border border-blue-200 flex items-center gap-1 hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={14} /> Dodaj wpis
                            </button>
                        </div>
                        
                        {(day.workshopEntries || []).map(entry => (
                            <div key={entry.id} className="flex gap-2 items-start animate-fade-in">
                                <div className="flex-1">
                                    <input 
                                        type="text"
                                        placeholder="Co było robione?"
                                        value={entry.description}
                                        onChange={e => updateWorkshopEntry(entry.id, 'description', e.target.value)}
                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-blue-300 outline-none transition-all"
                                    />
                                </div>
                                <div className="w-20">
                                    <input 
                                        type="number"
                                        step="0.5"
                                        value={entry.hours || ''}
                                        placeholder="Godz"
                                        onChange={e => updateWorkshopEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl text-center font-bold bg-slate-50 focus:bg-white focus:border-blue-300 outline-none transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={() => removeWorkshopEntry(entry.id)}
                                    className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        {(!day.workshopEntries || day.workshopEntries.length === 0) && (
                            <div className="text-[10px] text-slate-400 italic pl-1">Brak wpisów warsztatowych</div>
                        )}
                     </div>
                     
                     <hr className="border-slate-100" />

                     {/* Waiting Section */}
                     <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-tight">
                                <Hourglass size={16} className="text-slate-500" />
                                Oczekiwanie / Postój
                            </div>
                            <button 
                                onClick={addWaitingEntry}
                                className="text-xs bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg font-bold border border-yellow-200 flex items-center gap-1 hover:bg-yellow-100 transition-colors"
                            >
                                <Plus size={14} /> Dodaj wpis
                            </button>
                        </div>
                        
                        {(day.waitingEntries || []).map(entry => (
                            <div key={entry.id} className="flex gap-2 items-start animate-fade-in">
                                <div className="flex-1">
                                    <input 
                                        type="text"
                                        placeholder="Gdzie / Dlaczego?"
                                        value={entry.description}
                                        onChange={e => updateWaitingEntry(entry.id, 'description', e.target.value)}
                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:border-yellow-300 outline-none transition-all"
                                    />
                                </div>
                                <div className="w-20">
                                    <input 
                                        type="number"
                                        step="0.5"
                                        value={entry.hours || ''}
                                        placeholder="Godz"
                                        onChange={e => updateWaitingEntry(entry.id, 'hours', parseFloat(e.target.value) || 0)}
                                        className="w-full p-2.5 text-sm border border-slate-200 rounded-xl text-center font-bold bg-slate-50 focus:bg-white focus:border-yellow-300 outline-none transition-all"
                                    />
                                </div>
                                <button 
                                    onClick={() => removeWaitingEntry(entry.id)}
                                    className="p-2.5 text-red-400 hover:bg-red-50 rounded-xl transition-colors"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}

                        {(!day.waitingEntries || day.waitingEntries.length === 0) && (
                            <div className="text-[10px] text-slate-400 italic pl-1">Brak wpisów postojowych</div>
                        )}
                     </div>

                     <hr className="border-slate-100" />

                     {/* Extra Hourly Work Toggle */}
                     <div>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input 
                            type="checkbox" 
                            checked={showExtraHourly}
                            onChange={toggleExtraHourly}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <div className="flex items-center gap-2 text-slate-700 font-medium">
                            <Briefcase size={18} className="text-slate-500" />
                            Praca na Godziny ({settings.extraHourlyRate} zł/h)
                            </div>
                        </label>
                        
                        {showExtraHourly && (
                            <div className="mt-2 pl-8 animate-fade-in">
                                <div className="flex items-center gap-2">
                                    <input 
                                    type="number"
                                    step="0.5"
                                    value={day.extraHourlyHours === 0 ? '' : day.extraHourlyHours}
                                    placeholder="0"
                                    onChange={e => {
                                        const val = parseFloat(e.target.value);
                                        setDay({...day, extraHourlyHours: isNaN(val) ? 0 : val});
                                    }}
                                    className="w-24 p-2 border border-slate-300 rounded-lg text-center font-bold"
                                    />
                                    <span className="text-slate-500 font-medium">h = </span>
                                    <span className="text-green-600 font-bold">{((day.extraHourlyHours || 0) * settings.extraHourlyRate).toFixed(2)} zł</span>
                                </div>
                            </div>
                        )}
                     </div>
                 </div>
             )}
          </section>
        )}

        {day.type === DayType.WORK && (
          <section className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Lista Kursów</h3>
              <button 
                onClick={addTrip}
                className="text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors border border-blue-300 shadow-sm"
              >
                <Plus size={16} /> Dodaj kurs
              </button>
            </div>

            {day.trips.map((trip) => (
              <TripCard 
                key={trip.id} 
                trip={trip} 
                onEdit={() => openEditTrip(trip)}
                onRemove={() => removeTrip(trip.id)}
              />
            ))}

            {isTripModalOpen && editingTrip && (
              <TripModal 
                trip={editingTrip}
                locations={locations}
                onSave={handleSaveTrip}
                onClose={() => setIsTripModalOpen(false)}
              />
            )}
          </section>
        )}
        
        {day.type === DayType.WORK && day.trips.length > 0 && (
          <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-2 animate-fade-in">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Stawka Dnia (suma stawek):</span>
              <span className="font-bold text-blue-700">
                {day.trips.reduce((acc, t) => acc + (t.rate > 10 ? t.rate / 27 : (t.rate || 0)), 0).toFixed(2)} zł
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Szacunkowy zarobek (27 t + 20%):</span>
              <div className="text-right">
                <span className="text-xl font-black text-blue-800">
                  {(day.trips.reduce((acc, t) => acc + (t.rate > 10 ? t.rate / 27 : (t.rate || 0)), 0) * 27 * 1.20).toFixed(2)} zł
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-5">
           <div className="flex items-center gap-2 mb-2">
             <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
               <Fuel size={18} />
             </div>
             <h3 className="font-bold text-slate-800">Spalanie i Licznik</h3>
           </div>
           
           <div className="flex flex-col gap-4">
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Stan licznika (km)</label>
                <input 
                  type="number"
                  className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-lg focus:border-blue-500 focus:bg-white outline-none transition-all"
                  value={day.odometer || ''}
                  onChange={e => setDay({...day, odometer: parseFloat(e.target.value) || 0})}
                  placeholder="0"
                />
             </div>

             <div className="flex gap-4">
               <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Km od tankowania</label>
                  <div className="w-full p-3.5 border-2 border-transparent bg-slate-100 rounded-xl font-bold text-slate-600 text-center">
                    {day.distanceFromLastRefuel || 0} <span className="text-[10px] font-normal">km</span>
                  </div>
               </div>

               <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Ilość litrów (L)</label>
                  <input 
                    type="number"
                    step="0.01"
                    className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-blue-600 text-center focus:border-blue-500 focus:bg-white outline-none transition-all"
                    value={day.fuelLiters || ''}
                    onChange={e => setDay({...day, fuelLiters: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
               </div>
             </div>

             <div className="flex gap-3">
               <div className="flex-1 bg-blue-600 rounded-2xl p-4 flex flex-col justify-center items-center text-white shadow-lg shadow-blue-100">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 text-center">Średnie (Obliczone)</div>
                  <div className="text-2xl font-black">
                    {(day.avgConsumptionCalc || 0).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold">L/100km</div>
               </div>

               <div className="flex-1 bg-slate-800 rounded-2xl p-4 flex flex-col justify-center items-center text-white shadow-lg shadow-slate-200">
                  <div className="text-[10px] font-bold uppercase tracking-widest opacity-80 mb-1 text-center">Średnie (Komputer)</div>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      step="0.1"
                      className="w-full bg-transparent text-center text-2xl font-black outline-none border-b-2 border-slate-600 focus:border-blue-400"
                      value={day.avgConsumptionComputer || ''}
                      onChange={e => setDay({...day, avgConsumptionComputer: parseFloat(e.target.value) || 0})}
                      placeholder="0.0"
                    />
                  </div>
                  <div className="text-[10px] font-bold mt-1">L/100km</div>
               </div>
             </div>
           </div>

           <div className="pt-2">
             <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 ml-1">Notatki dodatkowe</label>
             <textarea 
               className="w-full p-3 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm focus:border-blue-500 focus:bg-white outline-none transition-all"
               rows={2}
               value={day.note}
               onChange={e => setDay({...day, note: e.target.value})}
               placeholder="Inne uwagi..."
             />
           </div>
        </div>

      </div>

      <div className="bg-slate-800 text-white p-4 shadow-lg space-y-2 flex-none z-20">
           {day.type === DayType.WORK && (
             <>
             <div className="flex justify-between text-sm text-slate-300">
                <span>Premia Paliwo (20%): {totals.totalBonus.toFixed(2)} zł</span>
             </div>
             <div className="flex justify-between text-sm text-slate-300">
                <span>Godziny: {(totals.totalHourlyBonus / settings.hourlyRate).toFixed(1)} h (+ {totals.totalHourlyBonus.toFixed(2)} zł)</span>
                <div className="text-right">
                    {totals.totalExtraHourly > 0 ? (
                        <span className="block text-blue-300 text-xs">Dodatkowe: {totals.totalExtraHourly.toFixed(2)} zł</span>
                    ) : null}
                    {totals.totalWorkshop > 0 ? (
                        <span className="block text-orange-300 text-xs">Warsztat: {totals.totalWorkshop.toFixed(2)} zł</span>
                    ) : null}
                    {totals.totalWaiting > 0 ? (
                        <span className="block text-yellow-300 text-xs">Oczekiwanie: {totals.totalWaiting.toFixed(2)} zł</span>
                    ) : null}
                    {totals.saturdayBonus > 0 ? (
                        <span className="block text-orange-400 text-xs font-bold uppercase">Sobota: +{totals.saturdayBonus.toFixed(2)} zł</span>
                    ) : null}
                </div>
             </div>
             </>
           )}
           <div className="flex justify-between items-center border-t border-slate-600 pt-2 mt-2">
              <div>
                <div className="text-slate-300 text-xs mb-0.5">Zarobek całkowity:</div>
                <div className="text-2xl font-bold text-green-400 leading-none">
                  {(totals.totalAmount + totals.totalBonus + (totals.totalHourlyBonus || 0) + (totals.totalExtraHourly || 0) + (totals.saturdayBonus || 0)).toFixed(2)} zł
                </div>
              </div>
              <button 
                onClick={handleSave} 
                className="flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-green-700 transition active:scale-95"
              >
                <Save size={20} />
                <span>Zapisz</span>
              </button>
           </div>
      </div>
    </div>
  );
};

// Sub-component for Trip Card (Summary View)
const TripCard: React.FC<{
  trip: Trip;
  onEdit: () => void;
  onRemove: () => void;
}> = ({ trip, onEdit, onRemove }) => {
  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group active:bg-slate-50 transition-colors" onClick={onEdit}>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-slate-700 truncate">{trip.locationName || 'Nowy kurs...'}</div>
        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
          <span className="font-medium bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">
            {trip.rate > 10 ? 'Ryczałt' : `${trip.weight} t`}
          </span>
          <span className="font-bold text-green-600">{trip.amount.toFixed(2)} zł</span>
        </div>
      </div>
      <div className="flex items-center gap-1 ml-2">
        <button 
          onClick={(e) => { e.stopPropagation(); onEdit(); }} 
          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
        >
          <Edit size={18} />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(); }} 
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

// New Modal Component for Trip Editing
const TripModal: React.FC<{
  trip: Trip;
  locations: LocationRate[];
  onSave: (updatedTrip: Trip) => void;
  onClose: () => void;
}> = ({ trip, locations, onSave, onClose }) => {
  const [localTrip, setLocalTrip] = useState<Trip>({ ...trip });
  const [searchTerm, setSearchTerm] = useState(trip.locationName || '');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectLocation = (loc: LocationRate) => {
    setSearchTerm(loc.name);
    setIsSearching(false);
    
    const updatedTrip = { ...localTrip };
    updatedTrip.locationId = loc.id;
    updatedTrip.locationName = loc.name;
    updatedTrip.rate = loc.rate;
    if (loc.rate > 10) {
      updatedTrip.weight = 1;
    }
    
    const { amount, bonus } = StorageService.calculateTrip(updatedTrip.weight, updatedTrip.rate);
    updatedTrip.amount = amount;
    updatedTrip.bonus = bonus;
    
    setLocalTrip(updatedTrip);
  };

  const handleWeightChange = (val: number) => {
    const updatedTrip = { ...localTrip, weight: val };
    const { amount, bonus } = StorageService.calculateTrip(updatedTrip.weight, updatedTrip.rate);
    updatedTrip.amount = amount;
    updatedTrip.bonus = bonus;
    setLocalTrip(updatedTrip);
  };

  const isFixedRate = localTrip.rate > 10;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-slide-up">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 uppercase tracking-tight">Dane Kursu</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div className="relative">
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Miejscowość docelowa</label>
            <div className="relative">
              <div className="absolute left-3 top-3.5 text-slate-400">
                <Search size={18} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onFocus={() => setIsSearching(true)}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Gdzie jedziesz?"
                className="w-full p-3.5 pl-10 border-2 border-slate-100 rounded-xl bg-slate-50 focus:border-blue-500 focus:bg-white outline-none transition-all font-medium"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-3 top-3.5 p-1 text-slate-300">
                  <X size={16} />
                </button>
              )}
            </div>

            {isSearching && (
              <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden ring-1 ring-black/5">
                {filteredLocations.length === 0 ? (
                  <div className="p-4 text-sm text-slate-400 text-center italic">Nie znaleziono miejscowości</div>
                ) : (
                  filteredLocations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelectLocation(loc)}
                      className="w-full text-left p-4 hover:bg-blue-50 border-b border-slate-50 last:border-0 flex justify-between items-center transition-colors group"
                    >
                      <span className="font-bold text-slate-700 group-hover:text-blue-700">{loc.name}</span>
                      <span className="text-xs font-mono font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded group-hover:bg-blue-100 group-hover:text-blue-600">{loc.rate} zł</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={isFixedRate ? 'opacity-50' : ''}>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">
                {isFixedRate ? 'Ryczałt' : 'Waga (Tony)'}
              </label>
              <input 
                type="number" 
                step="0.1"
                value={localTrip.weight || ''}
                onChange={(e) => handleWeightChange(parseFloat(e.target.value) || 0)}
                disabled={isFixedRate}
                className="w-full p-3.5 border-2 border-slate-100 rounded-xl bg-slate-50 font-bold text-lg focus:border-blue-500 focus:bg-white outline-none"
                placeholder="0.0"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5 ml-1">Stawka kursu</label>
              <div className="w-full p-3.5 bg-slate-100 rounded-xl font-bold text-lg text-slate-500 border-2 border-transparent">
                {localTrip.rate} <span className="text-xs font-normal">zł</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl flex items-center justify-between">
            <span className="text-blue-700 font-bold uppercase text-xs tracking-wider">Zarobek za ten kurs:</span>
            <span className="text-2xl font-black text-blue-800">{localTrip.amount.toFixed(2)} <span className="text-sm font-bold">zł</span></span>
          </div>
        </div>

        <div className="p-4 bg-slate-50 rounded-b-3xl sm:rounded-b-2xl border-t border-slate-100">
          <button 
            onClick={() => onSave(localTrip)}
            disabled={!localTrip.locationId}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2"
          >
            <Check size={20} strokeWidth={3} />
            Zatwierdź Kurs
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayEditor;
