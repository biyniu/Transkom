import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Plus, Trash2, Save, ArrowLeft, Clock, Search, X, Wrench, Hourglass, Thermometer, Moon } from 'lucide-react';
import { WorkDay, DayType, LocationRate, Trip, AppSettings } from '../types';
import * as StorageService from '../services/storage';

interface DayEditorProps {
  dayId?: string | null;
  onClose: () => void;
}

const DayEditor: React.FC<DayEditorProps> = ({ dayId, onClose }) => {
  const [locations, setLocations] = useState<LocationRate[]>([]);
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  
  // Local UI states to keep inputs visible even if value is 0 during typing
  const [showWorkshop, setShowWorkshop] = useState(false);
  const [showWaiting, setShowWaiting] = useState(false);
  
  // State for Daily Rest Calculation
  const [restInfo, setRestInfo] = useState<{ label: string; colorClass: string } | null>(null);

  const [day, setDay] = useState<WorkDay>({
    id: uuidv4(),
    date: new Date().toISOString().slice(0, 10),
    type: DayType.WORK,
    startTime: '04:00',
    endTime: '04:00',
    trips: [],
    workshopHours: 0,
    totalWorkshop: 0,
    waitingHours: 0,
    waitingNote: '',
    totalWaiting: 0,
    totalAmount: 0,
    totalBonus: 0,
    totalHourlyBonus: 0,
    totalWeight: 0,
    note: ''
  });

  useEffect(() => {
    setLocations(StorageService.getLocations());
    setSettings(StorageService.getSettings());
    if (dayId) {
      const existingDay = StorageService.getDayById(dayId);
      if (existingDay) {
        setDay(existingDay);
        // Initialize toggles based on existing data
        setShowWorkshop((existingDay.workshopHours || 0) > 0);
        setShowWaiting((existingDay.waitingHours || 0) > 0);
      }
    } else {
        // Reset toggles for new day
        setShowWorkshop(false);
        setShowWaiting(false);
    }
  }, [dayId]);

  // Effect to calculate rest time whenever relevant fields change
  useEffect(() => {
    calculateDailyRest();
  }, [day.date, day.startTime, day.type]);

  const calculateDailyRest = () => {
    if (day.type !== DayType.WORK) {
        setRestInfo(null);
        return;
    }

    const allDays = StorageService.getWorkDays();
    // Filter out current day (in case we are editing an existing one) to find the previous one correctly
    const otherDays = allDays.filter(d => d.id !== day.id && d.type === DayType.WORK);
    
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
    
    // Handle overnight shift (if End is before Start, assume it implies next day)
    // OR if duration logic implies it. Simple check: if End <= Start, it ends +1 day.
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

    // Determine Color based on legal limits (approx rules)
    // > 11h: Green (Standard daily rest)
    // 9h - 11h: Orange (Reduced daily rest)
    // < 9h: Red (Violation)
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
      
      // Auto-update rate if location changes
      if (field === 'locationId') {
        const loc = locations.find(l => l.id === value);
        if (loc) {
          newTrip.locationName = loc.name;
          newTrip.rate = loc.rate;

          // LOGIC CHANGE: If rate > 10, assume it's a fixed price per trip, not per ton.
          // Force weight/quantity to 1.
          if (loc.rate > 10) {
            newTrip.weight = 1;
          }
        }
      }

      // Recalculate amounts
      const { amount, bonus } = StorageService.calculateTrip(newTrip.weight, newTrip.rate);
      newTrip.amount = amount;
      newTrip.bonus = bonus;
      
      return newTrip;
    });

    setDay({ ...day, trips: updatedTrips });
  };

  const addTrip = () => {
    setDay({
      ...day,
      trips: [
        ...day.trips,
        {
          id: uuidv4(),
          locationId: '',
          locationName: '',
          weight: 0,
          rate: 0,
          amount: 0,
          bonus: 0
        }
      ]
    });
  };

  const removeTrip = (id: string) => {
    setDay({ ...day, trips: day.trips.filter(t => t.id !== id) });
  };

  const handleSave = () => {
    // Clean up values before saving if toggles are off
    const dayToSave = { ...day };
    if (!showWorkshop) {
        dayToSave.workshopHours = 0;
        dayToSave.totalWorkshop = 0;
    }
    if (!showWaiting) {
        dayToSave.waitingHours = 0;
        dayToSave.totalWaiting = 0;
        dayToSave.waitingNote = '';
    }

    StorageService.saveDay(dayToSave);
    onClose();
  };

  const toggleWorkshop = () => {
    const newState = !showWorkshop;
    setShowWorkshop(newState);
    if (newState) {
      setDay({ ...day, workshopHours: 1 }); // Default to 1h when enabled
    } else {
      setDay({ ...day, workshopHours: 0 });
    }
  };

  const toggleWaiting = () => {
    const newState = !showWaiting;
    setShowWaiting(newState);
    if (newState) {
      setDay({ ...day, waitingHours: 1 }); // Default to 1h when enabled
    } else {
      setDay({ ...day, waitingHours: 0, waitingNote: '' });
    }
  };

  // Live calculation for preview
  const totals = StorageService.calculateDayTotals(day);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header - Fixed Top */}
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

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Basic Info */}
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
                        onChange={e => setDay({...day, endTime: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg text-center bg-gray-50 text-lg"
                        />
                    </div>
                </div>

                {/* Daily Rest Display */}
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
            </div>
          )}
        </section>

        {/* Info Box for specific day types */}
        {day.type === DayType.VACATION && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-xl text-yellow-800 text-sm flex items-center gap-2">
            <Clock size={18} />
            Stawka za urlop zostanie przeliczona automatycznie wg puli (Stary/Nowy).
          </div>
        )}

        {day.type === DayType.SICK_LEAVE && (
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl text-purple-800 text-sm flex items-center gap-2">
            <Thermometer size={18} />
            Dla L4 naliczana jest stała stawka <strong>{settings.sickLeaveRate} PLN</strong>.
          </div>
        )}

        {/* Extra Options: Workshop & Waiting */}
        {day.type === DayType.WORK && (
          <section className="bg-white p-4 rounded-xl shadow-sm space-y-4">
             {/* Workshop Toggle */}
             <div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={showWorkshop}
                    onChange={toggleWorkshop}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Wrench size={18} className="text-slate-500" />
                    Warsztat / Naprawa ({settings.workshopRate} zł/h)
                    </div>
                </label>
                
                {showWorkshop && (
                    <div className="mt-2 pl-8 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <input 
                            type="number"
                            step="0.5"
                            value={day.workshopHours === 0 ? '' : day.workshopHours}
                            placeholder="0"
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                setDay({...day, workshopHours: isNaN(val) ? 0 : val});
                            }}
                            className="w-24 p-2 border border-slate-300 rounded-lg text-center font-bold"
                            />
                            <span className="text-slate-500 font-medium">h = </span>
                            <span className="text-green-600 font-bold">{((day.workshopHours || 0) * settings.workshopRate).toFixed(2)} zł</span>
                        </div>
                    </div>
                )}
             </div>
             
             <hr className="border-slate-100" />

             {/* Waiting Toggle */}
             <div>
                <label className="flex items-center gap-3 cursor-pointer">
                    <input 
                    type="checkbox" 
                    checked={showWaiting}
                    onChange={toggleWaiting}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2 text-slate-700 font-medium">
                    <Hourglass size={18} className="text-slate-500" />
                    Oczekiwanie na załad./rozład. ({settings.waitingRate} zł/h)
                    </div>
                </label>
                
                {showWaiting && (
                    <div className="mt-2 pl-8 space-y-2 animate-fade-in">
                        <div className="flex items-center gap-2">
                            <input 
                            type="number"
                            step="0.5"
                            value={day.waitingHours === 0 ? '' : day.waitingHours}
                            placeholder="0"
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                setDay({...day, waitingHours: isNaN(val) ? 0 : val});
                            }}
                            className="w-24 p-2 border border-slate-300 rounded-lg text-center font-bold"
                            />
                            <span className="text-slate-500 font-medium">h = </span>
                            <span className="text-green-600 font-bold">{((day.waitingHours || 0) * settings.waitingRate).toFixed(2)} zł</span>
                        </div>
                        <input 
                           type="text"
                           placeholder="Gdzie stałem?"
                           value={day.waitingNote || ''}
                           onChange={e => setDay({...day, waitingNote: e.target.value})}
                           className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-gray-50"
                        />
                    </div>
                )}
             </div>
          </section>
        )}

        {/* Trips Section */}
        {day.type === DayType.WORK && (
          <section className="space-y-4 animate-fade-in">
            <h3 className="text-sm font-semibold text-slate-700 px-1 uppercase tracking-wider">Lista Kursów</h3>
            
            {day.trips.map((trip) => (
              <TripCard 
                key={trip.id} 
                trip={trip} 
                locations={locations}
                onChange={(field, val) => handleTripChange(trip.id, field, val)}
                onRemove={() => removeTrip(trip.id)}
              />
            ))}

             {/* Big Add Button */}
             <button 
                onClick={addTrip}
                className="w-full py-4 rounded-xl bg-primary text-white text-lg font-bold shadow-md shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Plus size={24} /> Dodaj kurs
              </button>

             {/* Big Save Button */}
             <button 
                onClick={handleSave}
                className="w-full py-4 rounded-xl bg-green-600 text-white text-lg font-bold shadow-md shadow-green-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <Save size={24} /> Zapisz i zamknij
              </button>
          </section>
        )}
        
        {/* Note */}
        <div className="bg-white p-4 rounded-xl shadow-sm">
           <label className="block text-xs font-medium text-slate-500 mb-1">Notatki / Tankowanie</label>
           <textarea 
             className="w-full p-2 border border-slate-300 rounded-lg bg-gray-50"
             rows={3}
             value={day.note}
             onChange={e => setDay({...day, note: e.target.value})}
             placeholder="Wpisz dodatkowe informacje..."
           />
        </div>

      </div>

      {/* Live Summary Footer - Fixed Block at bottom (not floating) */}
      <div className="bg-slate-800 text-white p-4 shadow-lg space-y-2 flex-none z-20">
           {day.type === DayType.WORK && (
             <>
             <div className="flex justify-between text-sm text-slate-300">
                <span>Tony: {totals.totalWeight.toFixed(2)} t</span>
                <span>Premia Paliwo (20%): {totals.totalBonus.toFixed(2)} zł</span>
             </div>
             <div className="flex justify-between text-sm text-slate-300">
                <span>Godziny: {(totals.totalHourlyBonus / settings.hourlyRate).toFixed(1)} h (+ {totals.totalHourlyBonus.toFixed(2)} zł)</span>
                {/* Simplified Extras display */}
                <div className="text-right">
                    {showWorkshop && totals.totalWorkshop > 0 ? (
                        <span className="block text-orange-300 text-xs">Warsztat: {totals.totalWorkshop.toFixed(2)} zł</span>
                    ) : null}
                    {showWaiting && totals.totalWaiting > 0 ? (
                        <span className="block text-yellow-300 text-xs">Oczekiwanie: {totals.totalWaiting.toFixed(2)} zł</span>
                    ) : null}
                </div>
             </div>
             </>
           )}
           <div className="flex justify-between items-end border-t border-slate-600 pt-2">
              <span className="text-slate-300">Zarobek całkowity:</span>
              <span className="text-2xl font-bold text-green-400">
                {(totals.totalAmount + totals.totalBonus + (totals.totalHourlyBonus || 0) + (totals.totalWorkshop || 0) + (totals.totalWaiting || 0)).toFixed(2)} zł
              </span>
           </div>
      </div>
    </div>
  );
};

// Sub-component for Trip Card to handle Search State efficiently
const TripCard: React.FC<{
  trip: Trip;
  locations: LocationRate[];
  onChange: (field: keyof Trip, value: any) => void;
  onRemove: () => void;
}> = ({ trip, locations, onChange, onRemove }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize search term if trip has location
  useEffect(() => {
    if (trip.locationName && !isSearching) {
      setSearchTerm(trip.locationName);
    }
  }, [trip.locationName, isSearching]);

  const filteredLocations = locations.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectLocation = (loc: LocationRate) => {
    setSearchTerm(loc.name);
    setIsSearching(false);
    onChange('locationId', loc.id);
  };

  const handleSearchFocus = () => {
    setIsSearching(true);
    setSearchTerm(''); // Clear to show all or let user type
    onChange('locationId', ''); // Clear current selection
  };

  // Check if fixed rate (lump sum)
  const isFixedRate = trip.rate > 10;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative">
      <div className="grid grid-cols-12 gap-3">
        {/* Searchable Location Input */}
        <div className="col-span-12 relative">
          <label className="block text-xs font-medium text-slate-500 mb-1">Miejscowość</label>
          <div className="relative">
             <div className="absolute left-3 top-3 text-slate-400">
               <Search size={18} />
             </div>
             <input
              ref={inputRef}
              type="text"
              value={searchTerm}
              onFocus={() => setIsSearching(true)}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Szukaj miejscowości..."
              className="w-full p-2 pl-10 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
             />
             {isSearching && (
               <button 
                onClick={() => { setIsSearching(false); setSearchTerm(trip.locationName); }} 
                className="absolute right-2 top-2 p-1 text-slate-400"
               >
                 <X size={18}/>
               </button>
             )}
          </div>

          {/* Dropdown List */}
          {isSearching && (
            <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filteredLocations.length === 0 ? (
                 <div className="p-3 text-sm text-slate-400 text-center">Brak wyników</div>
              ) : (
                filteredLocations.map(loc => (
                  <button
                    key={loc.id}
                    onClick={() => handleSelectLocation(loc)}
                    className="w-full text-left p-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 flex justify-between items-center"
                  >
                    <span className="font-medium text-slate-700">{loc.name}</span>
                    <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{loc.rate} zł</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <div className="col-span-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">
             {isFixedRate ? 'Ryczałt' : 'Tony'}
          </label>
          <input 
            type="number" 
            step="0.1"
            value={trip.weight || ''}
            onChange={(e) => onChange('weight', parseFloat(e.target.value) || 0)}
            disabled={isFixedRate}
            className={`w-full p-2 border border-slate-300 rounded-lg font-mono ${isFixedRate ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-gray-50'}`}
            placeholder="0"
          />
        </div>
        <div className="col-span-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Stawka</label>
          <input 
            type="number" 
            disabled
            value={trip.rate}
            className="w-full p-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500"
          />
        </div>
        <div className="col-span-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Suma</label>
          <div className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 text-right">
            {trip.amount.toFixed(2)}
          </div>
        </div>
      </div>
      
      <button 
        onClick={onRemove}
        className="absolute -top-2 -right-2 bg-white text-danger border border-slate-200 p-1.5 rounded-full shadow-sm"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default DayEditor;