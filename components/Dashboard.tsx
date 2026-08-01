
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingUp, Calendar, Briefcase, Truck, Wrench, Hourglass, Plus, PlusCircle, Route, Palmtree, Trash2, Edit, Moon, Clock, Fuel } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';
import React, { useEffect, useState } from 'react';

interface DashboardProps {
  onEditDay: (id: string) => void;
  refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onEditDay, refreshTrigger }) => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [monthStats, setMonthStats] = useState({ earned: 0, tons: 0, count: 0, vacationDays: 0, workedHours: 0, workedMinutes: 0 });
  const [vacationStats, setVacationStats] = useState({ used: 0, remaining: 0 });
  
  // 0 = Current Month, 1 = Previous Month
  const [historyOffset, setHistoryOffset] = useState(0); 

  useEffect(() => {
    const data = StorageService.getWorkDays();
    const settings = StorageService.getSettings();
    setDays(data);

    // Calculate stats based on Selected Month (via historyOffset)
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() - historyOffset);
    
    const targetMonth = targetDate.getMonth();
    const targetYear = targetDate.getFullYear();

    const selectedMonthDays = data.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === targetMonth && date.getFullYear() === targetYear;
    });

    const earned = selectedMonthDays.reduce((acc, d) => {
      // Sum: Trips + Fuel Bonus + Hourly Bonus + Extra Hourly Work
      return acc + (d.totalAmount || 0) + (d.totalBonus || 0) + (d.totalHourlyBonus || 0) + (d.totalExtraHourly || 0);
    }, 0);

    const tons = selectedMonthDays.reduce((acc, d) => acc + d.totalWeight, 0);
    const vacationInMonth = selectedMonthDays.filter(d => d.type === DayType.VACATION).length;
    
    let totalMinutes = 0;
    selectedMonthDays.forEach(day => {
        if (day.type === DayType.WORK && day.startTime && day.endTime) {
            const start = new Date(`1970-01-01T${day.startTime}`);
            let end = new Date(`1970-01-01T${day.endTime}`);
            if (end < start) {
                end.setDate(end.getDate() + 1);
            }
            const diffMs = end.getTime() - start.getTime();
            totalMinutes += Math.floor(diffMs / 60000);
        }
    });
    const workedHours = Math.floor(totalMinutes / 60);
    const workedMinutes = totalMinutes % 60;

    // Vacation is usually calculated Annually, keeping it based on Current Year for "Remaining" logic
    const currentYear = new Date().getFullYear();
    const usedVacation = data.filter(d => 
        d.type === DayType.VACATION && 
        new Date(d.date).getFullYear() === currentYear
    ).length;

    setMonthStats({
      earned,
      tons,
      count: selectedMonthDays.filter(d => d.type === DayType.WORK).length,
      vacationDays: vacationInMonth,
      workedHours,
      workedMinutes
    });

    setVacationStats({
        used: usedVacation,
        remaining: settings.totalVacationDays - usedVacation
    });

  }, [refreshTrigger, historyOffset]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Czy na pewno chcesz usunąć ten dzień?')) {
      StorageService.deleteDay(id);
      setDays(StorageService.getWorkDays());
    }
  };

  // Helper to calculate rest time relative to previous work day
  const getRestTimeBadge = (currentDay: WorkDay) => {
    if (currentDay.type !== DayType.WORK) return null;

    // Filter all work days except current, sort descending
    const otherWorkDays = days
        .filter(d => d.type === DayType.WORK && d.id !== currentDay.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentDayDate = new Date(currentDay.date);
    
    // Find previous day strictly before current
    const prevDay = otherWorkDays.find(d => new Date(d.date) < currentDayDate);
    if (!prevDay) return null;

    // Calculate timestamps
    let prevEndDate = new Date(`${prevDay.date}T${prevDay.endTime}`);
    const prevStartDate = new Date(`${prevDay.date}T${prevDay.startTime}`);
    
    // Handle overnight logic (if End <= Start, it means next day)
    if (prevEndDate <= prevStartDate) {
        prevEndDate.setDate(prevEndDate.getDate() + 1);
    }

    const currentStart = new Date(`${currentDay.date}T${currentDay.startTime}`);
    
    const diffMs = currentStart.getTime() - prevEndDate.getTime();
    if (diffMs < 0) return null; // Overlap or error

    const diffMins = Math.floor(diffMs / 1000 / 60);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    let colorClass = "bg-green-100 text-green-700"; // > 11h
    if (hours < 9) colorClass = "bg-red-100 text-red-700";
    else if (hours < 11) colorClass = "bg-orange-100 text-orange-700";

    return (
        <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${colorClass}`} title="Odpoczynek dobowy">
            <Moon size={10} /> {hours}h {mins}m
        </span>
    );
  };

  // --- PREPARE CHART DATA (Full Selected Month) ---
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() - historyOffset);
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth();
  
  // Get number of days in the selected month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const chartData = Array.from({ length: daysInMonth }, (_, i) => {
      const dayNum = i + 1;
      // Construct date string YYYY-MM-DD manually to avoid timezone issues
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      
      const day = days.find(d => d.date === dateStr);
      
      // Check if it's "Today" for highlighting
      const today = new Date();
      const isToday = today.getDate() === dayNum && today.getMonth() === month && today.getFullYear() === year;

      return {
        name: `${String(dayNum).padStart(2, '0')}.${String(month + 1).padStart(2, '0')}`, // dd.MM
        fullDate: dateStr,
        zarobek: day ? Math.round(day.totalAmount + day.totalBonus + (day.totalHourlyBonus || 0) + (day.totalWorkshop || 0) + (day.totalWaiting || 0) + (day.totalExtraHourly || 0)) : 0,
        type: day?.type,
        isToday
      };
  });

  const getBarColor = (type?: DayType, isToday?: boolean) => {
      if (isToday) return '#f59e0b'; // Amber for Today
      if (type === DayType.VACATION) return '#16a34a'; // green-600
      if (type === DayType.SICK_LEAVE) return '#dc2626'; // red-600
      if (type === DayType.WORK) return '#2563eb'; // blue-600
      return '#e2e8f0'; // slate-200 (empty days)
  };

  // Calculate Chart Width (e.g., 50px per day ensures it's scrollable)
  const chartWidth = Math.max(daysInMonth * 55, window.innerWidth - 40);

  // Filter History List based on toggle and SORT DESCENDING by date
  const getHistoryDays = () => {
    return days
      .filter(d => {
        const dDate = parseISO(d.date);
        return dDate.getMonth() === month && dDate.getFullYear() === year;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const filteredHistory = getHistoryDays();
  
  const displayedMonthName = format(targetDate, 'LLLL yyyy', { locale: pl });
  const isCurrentMonth = historyOffset === 0;

  // Logic for "Today's Shortcut"
  const todayDateStr = new Date().toISOString().slice(0, 10);
  const todayEntry = days.find(d => d.date === todayDateStr && d.type === DayType.WORK);

  return (
    <div className="p-4 space-y-6 pb-24">
      
      {/* Top Toggle */}
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-slate-800 capitalize">{displayedMonthName}</h2>
         <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex text-xs font-bold relative">
             <select
                value={historyOffset}
                onChange={(e) => setHistoryOffset(Number(e.target.value))}
                className="pl-3 pr-8 py-1.5 rounded-lg bg-slate-50 border-none outline-none text-slate-700 font-bold focus:ring-2 focus:ring-blue-100 appearance-none capitalize cursor-pointer h-full"
             >
                {Array.from({ length: 12 }).map((_, i) => {
                    const d = new Date();
                    d.setMonth(d.getMonth() - i);
                    return (
                        <option key={i} value={i}>
                            {format(d, 'LLLL yyyy', { locale: pl })}
                        </option>
                    );
                })}
             </select>
             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
             </div>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Money Tile */}
        <div className={`col-span-2 rounded-2xl p-4 text-white shadow-lg transition-colors ${isCurrentMonth ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-200' : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-200'}`}>
          <div className={`flex items-center justify-between mb-1 text-xs uppercase tracking-wide font-bold ${isCurrentMonth ? 'text-blue-100' : 'text-slate-200'}`}>
            <div className="flex items-center gap-2">
              <TrendingUp size={14} /> {isCurrentMonth ? 'Ten miesiąc' : 'Poprzedni miesiąc'}
            </div>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <div className="text-3xl font-bold">{monthStats.earned.toFixed(0)} zł</div>
              <div className={`text-xs mt-1 ${isCurrentMonth ? 'text-blue-200' : 'text-slate-300'}`}>Suma zarobków</div>
            </div>
            <div className={`text-right ${isCurrentMonth ? 'text-blue-100' : 'text-slate-300'}`}>
              <div className="text-xl font-bold flex items-center justify-end gap-1">
                <Clock size={16} /> {monthStats.workedHours}h {monthStats.workedMinutes.toString().padStart(2, '0')}m
              </div>
              <div className="text-[10px] uppercase tracking-wide opacity-80 mt-1">Czas pracy</div>
            </div>
          </div>
        </div>

        {/* Monthly Days Tile */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Briefcase size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800 leading-none">{monthStats.count} dni</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Przepracowane</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center shrink-0">
              <Palmtree size={20} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-800 leading-none">{monthStats.vacationDays} dni</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">Urlop (Miesiąc)</div>
            </div>
          </div>
        </div>

        {/* Annual Vacation Tile */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex flex-col justify-between">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-[10px] uppercase tracking-widest font-bold">
            <Palmtree size={12} /> Urlop (Pozostało)
          </div>
          <div className={`text-3xl font-black ${vacationStats.remaining < 5 ? 'text-orange-500' : 'text-slate-800'}`}>
             {vacationStats.remaining}
             <span className="text-sm font-bold text-slate-400 ml-1">dni</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium italic">Pozostało w tym roku</div>
        </div>
      </div>

      {/* Scrollable Chart */}
      <div className="bg-white p-4 pb-2 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-slate-500 flex-none uppercase tracking-wide">
              Wykres: {displayedMonthName}
            </h3>
          </div>
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div style={{ width: `${chartWidth}px`, height: '140px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 25, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        tickLine={false} 
                        axisLine={false} 
                        dy={10}
                        interval={0} // Show all ticks
                    />
                    <YAxis 
                        fontSize={10} 
                        axisLine={false} 
                        tickLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <Bar dataKey="zarobek" radius={[6, 6, 0, 0]} barSize={9}>
                        <LabelList 
                            dataKey="zarobek" 
                            position="top" 
                            fontSize={11} 
                            fontWeight="bold"
                            fill="#64748b"
                            formatter={(value: number) => value > 0 ? value : ''}
                        />
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.type, entry.isToday)} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>

      {/* SHORTCUT: Add Trip to TODAY (Only if today exists and is WORK) - LARGE GREEN BUTTON */}
      {isCurrentMonth && todayEntry && (
        <button
            onClick={() => onEditDay(todayEntry.id)}
            className="w-full py-5 bg-green-600 text-white rounded-2xl shadow-xl shadow-green-200/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all transform border border-green-500 relative overflow-hidden group"
        >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-2">
                <Plus size={32} strokeWidth={3} />
                <span className="text-xl font-black uppercase tracking-wide">Dodaj kolejny kurs</span>
            </div>
            <span className="text-sm font-medium text-green-100">
                Dzisiaj, {format(parseISO(todayEntry.date), 'd MMMM', { locale: pl })}
            </span>
        </button>
      )}

      {/* NEW DAY BUTTON (Smaller than the green one) */}
      {isCurrentMonth && (
          <button 
            onClick={() => onEditDay('')}
            className="w-full py-3 bg-white text-primary border-2 border-blue-100 rounded-xl shadow-sm flex flex-col items-center justify-center active:scale-98 transition-transform group"
          >
            <div className="flex items-center gap-2 mb-0.5">
                <PlusCircle size={24} className="group-hover:scale-110 transition-transform"/>
                <span className="text-base font-bold uppercase tracking-wide">Dodaj NOWY dzień</span>
            </div>
            <span className="text-[10px] text-slate-400">Rozpocznij nowy wpis pracy, urlopu lub L4</span>
          </button>
      )}

      {/* History List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">Historia: {displayedMonthName}</h3>

        <div className="space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="text-center p-8 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                Brak wpisów w wybranym miesiącu.
            </div>
          ) : (
            filteredHistory.map(day => (
              <div 
                key={day.id} 
                onClick={() => onEditDay(day.id)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer relative"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      day.type === DayType.WORK ? 'bg-blue-50 text-primary' : 
                      day.type === DayType.VACATION ? 'bg-yellow-50 text-yellow-600' :
                      day.type === DayType.SICK_LEAVE ? 'bg-purple-50 text-purple-600' : 
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {day.type === DayType.WORK && <Briefcase size={18}/>}
                      {day.type === DayType.VACATION && <Calendar size={18}/>}
                      {day.type === DayType.SICK_LEAVE && <Thermometer size={18}/>}
                    </div>
                    <div>
                      <div className="font-bold text-slate-700">
                        {format(parseISO(day.date), 'd MMMM', { locale: pl })}
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap gap-2 mt-0.5">
                        {day.type === DayType.WORK ? (
                            <>
                                <span>{day.startTime} - {day.endTime}</span>
                                {(() => {
                                  if (day.startTime && day.endTime) {
                                    const start = new Date(`1970-01-01T${day.startTime}`);
                                    let end = new Date(`1970-01-01T${day.endTime}`);
                                    if (end < start) end.setDate(end.getDate() + 1);
                                    const diffMins = Math.floor((end.getTime() - start.getTime()) / 60000);
                                    const h = Math.floor(diffMins / 60);
                                    const m = diffMins % 60;
                                    return <span className="font-bold text-slate-500">({h}h {m.toString().padStart(2, '0')}m)</span>;
                                  }
                                  return null;
                                })()}
                                {getRestTimeBadge(day)}
                            </>
                        ) : (
                            day.type
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side: Money + Delete Button */}
                  <div className="flex flex-col items-end gap-1">
                    {day.type === DayType.WORK ? (
                      <>
                        <div className="font-bold text-green-600">
                          +{(day.totalAmount + day.totalBonus + (day.totalHourlyBonus || 0) + (day.totalExtraHourly || 0) + (day.saturdayBonus || 0)).toFixed(2)} zł
                        </div>
                        {day.saturdayBonus ? (
                          <div className="text-[10px] text-orange-600 font-bold uppercase tracking-tight">+70 zł Sobota</div>
                        ) : null}
                        <div className="text-xs text-slate-400">{day.trips.length} kursy</div>
                      </>
                    ) : (
                      <div className="text-xs font-medium px-2 py-1 bg-slate-100 rounded text-slate-500">
                        {day.type} (+{day.totalAmount} zł)
                      </div>
                    )}

                    {/* Visible Delete Button under the amount */}
                    <button 
                      onClick={(e) => handleDelete(day.id, e)} 
                      className="mt-1 p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 active:scale-95 transition-all shadow-sm border border-red-100"
                      title="Usuń dzień"
                    >
                      <Trash2 size={16}/>
                    </button>
                  </div>
                </div>
                
                {/* Mini preview of trips + extra work */}
                {day.type === DayType.WORK && (
                  <>
                  {/* Estimated Stats Summary */}
                  {day.trips.length > 0 && (
                    <div className="mt-2 p-2 bg-blue-50/30 rounded-lg border border-blue-100 flex flex-col gap-1 animate-fade-in">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Szacowany zarobek:</span>
                        <span className="text-xs font-black text-blue-700">
                          {(day.trips.reduce((acc, t) => acc + (t.rate > 10 ? t.rate / 27 : (t.rate || 0)), 0) * 27 * 1.20).toFixed(2)} zł
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Stawka dnia:</span>
                        <span className="text-xs font-bold text-slate-600">
                          {day.trips.reduce((acc, t) => acc + (t.rate > 10 ? t.rate / 27 : (t.rate || 0)), 0).toFixed(2)} zł
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="mt-2 pt-2 border-t border-slate-50 space-y-1">
                    <div className="flex flex-wrap gap-2 mb-1">
                      {day.totalExtraHourly && day.totalExtraHourly > 0 ? (
                          <span className="flex items-center gap-1 text-indigo-500 font-semibold text-[10px] uppercase"><Briefcase size={12}/> Praca na godziny</span>
                      ) : null}
                      {day.totalWorkshop && day.totalWorkshop > 0 ? (
                          <span className="flex items-center gap-1 text-orange-500 font-semibold text-[10px] uppercase"><Wrench size={12}/> Warsztat</span>
                      ) : null}
                      {day.totalWaiting && day.totalWaiting > 0 ? (
                          <span className="flex items-center gap-1 text-yellow-500 font-semibold text-[10px] uppercase"><Hourglass size={12}/> Oczekiwanie</span>
                      ) : null}
                    </div>
                    {day.trips.map((t, idx) => (
                      <div key={`trip-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1 h-1 rounded-full bg-slate-300 flex-none" />
                        <span className="font-medium">{t.locationName}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{t.rate} zł</span>
                        <span className="text-[10px] text-green-600 ml-auto font-bold">{(t.amount + t.bonus).toFixed(2)} zł</span>
                      </div>
                    ))}
                    {(day.workshopEntries || []).map((w, idx) => (
                      <div key={`workshop-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1 h-1 rounded-full bg-orange-300 flex-none" />
                        <span className="font-medium">{w.description || 'Warsztat'}</span>
                        <span className="text-[10px] text-orange-600 ml-auto font-bold">{w.hours} h</span>
                      </div>
                    ))}
                    {(day.waitingEntries || []).map((w, idx) => (
                      <div key={`waiting-${idx}`} className="flex items-center gap-2 text-xs text-slate-600">
                        <div className="w-1 h-1 rounded-full bg-yellow-300 flex-none" />
                        <span className="font-medium">{w.description || 'Postój'}</span>
                        <span className="text-[10px] text-yellow-600 ml-auto font-bold">{w.hours} h</span>
                      </div>
                    ))}
                  </div>

                  {(day.dailyDistance > 0 || day.dailyAvgConsumption > 0 || day.dailyDrivingTime > 0) && (
                    <div className="flex items-center justify-center gap-4 mt-2 px-1 text-[10px] text-slate-500 font-bold uppercase tracking-widest border-t border-slate-50 pt-2 animate-fade-in">
                      {day.dailyDistance > 0 && (
                        <div className="flex items-center gap-1">
                          <Route size={12} className="text-blue-500" />
                          <span>{day.dailyDistance} km</span>
                        </div>
                      )}
                      {day.dailyAvgConsumption > 0 && (
                        <div className={`flex items-center gap-1 ${day.dailyDistance > 0 ? 'border-l pl-3 border-slate-100' : ''}`}>
                          <Fuel size={12} className="text-orange-500" />
                          <span>{day.dailyAvgConsumption.toFixed(2)} L/100</span>
                        </div>
                      )}
                      {day.dailyDrivingTime > 0 && (
                        <div className={`flex items-center gap-1 ${(day.dailyDistance > 0 || day.dailyAvgConsumption > 0) ? 'border-l pl-3 border-slate-100' : ''}`}>
                          <Clock size={12} className="text-purple-500" />
                          <span>{Math.floor(day.dailyDrivingTime)}:{Math.round((day.dailyDrivingTime - Math.floor(day.dailyDrivingTime)) * 60).toString().padStart(2, '0')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {((day.odometer || 0) > 0 || (day.avgConsumptionCalc || 0) > 0) && (() => {
                    const sortedAll = [...days].sort((a, b) => a.date.localeCompare(b.date));
                    const currentIdx = sortedAll.findIndex(d => d.date === day.date);
                    const prevRefuels = sortedAll.slice(0, currentIdx).filter(d => (d.odometer || 0) > 0);
                    const lastRefuel = prevRefuels.length > 0 ? prevRefuels[prevRefuels.length - 1] : null;
                    const distance = lastRefuel && day.odometer && (lastRefuel.odometer || 0) > 0 ? day.odometer - (lastRefuel.odometer || 0) : null;

                    return (
                      <div className="mt-2 p-2 bg-emerald-50/30 rounded-lg border border-emerald-100/50 animate-fade-in flex flex-col items-center">
                        <div className="text-[9px] font-black text-emerald-600/60 uppercase tracking-[0.2em] mb-1.5">Tankowanie</div>
                        <div className="flex items-center justify-center gap-4 text-[10px] text-emerald-700 font-bold uppercase tracking-tight italic">
                          {distance && (
                            <div className="flex items-center gap-1.5">
                              <Route size={11} className="text-emerald-500/70" />
                              <span>{distance} km</span>
                            </div>
                          )}
                          {(day.avgConsumptionCalc || 0) > 0 && (
                            <div className={`flex items-center gap-1.5 ${distance ? 'border-l pl-3 border-emerald-200/40' : ''}`}>
                              <TrendingUp size={11} className="text-emerald-500/70" />
                              <span>{day.avgConsumptionCalc?.toFixed(2)} L/100</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Add Another Trip Button - Only show if it's CURRENT month/recent for simplicity */}
                  {isCurrentMonth && (
                    <button 
                        onClick={(e) => {
                        e.stopPropagation();
                        onEditDay(day.id);
                        }}
                        className="w-full mt-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors border border-blue-100"
                    >
                        <Plus size={14} />
                        Dodaj KOLEJNY kurs
                    </button>
                  )}
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
