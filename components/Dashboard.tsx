import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { TrendingUp, Calendar, Briefcase, Truck, Wrench, Hourglass, Plus, PlusCircle, Thermometer, Palmtree, Trash2, Edit } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Cell, LabelList } from 'recharts';

interface DashboardProps {
  onEditDay: (id: string) => void;
  refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onEditDay, refreshTrigger }) => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [monthStats, setMonthStats] = useState({ earned: 0, tons: 0, count: 0 });
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
      // Sum: Trips + Fuel Bonus + Hourly Bonus + Workshop + Waiting
      return acc + d.totalAmount + d.totalBonus + (d.totalHourlyBonus || 0) + (d.totalWorkshop || 0) + (d.totalWaiting || 0);
    }, 0);

    const tons = selectedMonthDays.reduce((acc, d) => acc + d.totalWeight, 0);
    
    // Vacation is usually calculated Annually, keeping it based on Current Year for "Remaining" logic
    const currentYear = new Date().getFullYear();
    const usedVacation = data.filter(d => 
        d.type === DayType.VACATION && 
        new Date(d.date).getFullYear() === currentYear
    ).length;

    setMonthStats({
      earned,
      tons,
      count: selectedMonthDays.filter(d => d.type === DayType.WORK).length
    });

    setVacationStats({
        used: usedVacation,
        remaining: settings.totalVacationDays - usedVacation
    });

  }, [refreshTrigger, historyOffset]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Czy usunąć ten dzień?')) {
      StorageService.deleteDay(id);
      setDays(StorageService.getWorkDays());
    }
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
        zarobek: day ? Math.round(day.totalAmount + day.totalBonus + (day.totalHourlyBonus || 0) + (day.totalWorkshop || 0) + (day.totalWaiting || 0)) : 0,
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

  // Filter History List based on toggle
  const getHistoryDays = () => {
    return days.filter(d => {
        const dDate = parseISO(d.date);
        return dDate.getMonth() === month && dDate.getFullYear() === year;
    });
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
         <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200 flex text-xs font-bold">
             <button
                onClick={() => setHistoryOffset(0)}
                className={`px-3 py-1.5 rounded-lg transition ${historyOffset === 0 ? 'bg-blue-100 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Bieżący
             </button>
             <button
                onClick={() => setHistoryOffset(1)}
                className={`px-3 py-1.5 rounded-lg transition ${historyOffset === 1 ? 'bg-blue-100 text-primary' : 'text-slate-400 hover:text-slate-600'}`}
             >
                Poprzedni
             </button>
        </div>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Money Tile */}
        <div className={`col-span-2 rounded-2xl p-4 text-white shadow-lg transition-colors ${isCurrentMonth ? 'bg-gradient-to-br from-blue-600 to-blue-700 shadow-blue-200' : 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-200'}`}>
          <div className={`flex items-center gap-2 mb-1 text-xs uppercase tracking-wide font-bold ${isCurrentMonth ? 'text-blue-100' : 'text-slate-200'}`}>
            <TrendingUp size={14} /> {isCurrentMonth ? 'Ten miesiąc' : 'Poprzedni miesiąc'}
          </div>
          <div className="text-3xl font-bold">{monthStats.earned.toFixed(0)} zł</div>
          <div className={`text-xs mt-1 ${isCurrentMonth ? 'text-blue-200' : 'text-slate-300'}`}>Suma zarobków</div>
        </div>

        {/* Tons Tile */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-[10px] uppercase tracking-wide font-bold">
            <Truck size={12} /> Przewiezione
          </div>
          <div className="text-xl font-bold text-slate-700">{monthStats.tons.toFixed(0)} t</div>
          <div className="text-[10px] text-slate-400 mt-1">{monthStats.count} dni pracy</div>
        </div>

        {/* Vacation Tile - Always Annual Remaining */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-[10px] uppercase tracking-wide font-bold">
            <Palmtree size={12} /> Urlop (Rok)
          </div>
          <div className={`text-xl font-bold ${vacationStats.remaining < 5 ? 'text-orange-500' : 'text-slate-700'}`}>
             {vacationStats.remaining} dni
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pozostało w tym roku</div>
        </div>
      </div>

      {/* Scrollable Chart */}
      <div className="bg-white p-4 pb-2 rounded-xl shadow-sm border border-slate-100 flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 mb-2 flex-none uppercase tracking-wide text-center">
            Wykres: {displayedMonthName}
          </h3>
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div style={{ width: `${chartWidth}px`, height: '280px' }}>
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
                    <Bar dataKey="zarobek" radius={[6, 6, 0, 0]} barSize={36}>
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
                      <div className="text-xs text-slate-400">
                        {day.type === DayType.WORK ? `${day.startTime} - ${day.endTime}` : day.type}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side: Money + Delete Button */}
                  <div className="flex flex-col items-end gap-1">
                    {day.type === DayType.WORK ? (
                      <>
                        <div className="font-bold text-green-600">
                          +{(day.totalAmount + day.totalBonus + (day.totalHourlyBonus || 0) + (day.totalWorkshop || 0) + (day.totalWaiting || 0)).toFixed(2)} zł
                        </div>
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
                
                {/* Mini preview of trips + workshop if work day */}
                {day.type === DayType.WORK && (
                  <>
                  <div className="mt-2 pt-2 border-t border-slate-50 text-xs text-slate-500 truncate flex flex-wrap gap-2">
                    {day.totalWorkshop && day.totalWorkshop > 0 ? (
                        <span className="flex items-center gap-1 text-orange-500 font-semibold"><Wrench size={12}/> Warsztat</span>
                    ) : null}
                    {day.totalWaiting && day.totalWaiting > 0 ? (
                        <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Hourglass size={12}/> Oczekiwanie</span>
                    ) : null}
                    <span>{day.trips.map(t => t.locationName).join(', ')}</span>
                  </div>

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