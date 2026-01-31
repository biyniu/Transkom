import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Edit2, Trash2, TrendingUp, Calendar, Briefcase, Truck, Wrench, Hourglass, Plus, PlusCircle, Thermometer, Palmtree } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell } from 'recharts';

interface DashboardProps {
  onEditDay: (id: string) => void;
  refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onEditDay, refreshTrigger }) => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [monthStats, setMonthStats] = useState({ earned: 0, tons: 0, count: 0 });
  const [vacationStats, setVacationStats] = useState({ used: 0, remaining: 0 });

  useEffect(() => {
    const data = StorageService.getWorkDays();
    const settings = StorageService.getSettings();
    setDays(data);

    // Calculate current month stats
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const currentMonthDays = data.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const earned = currentMonthDays.reduce((acc, d) => {
      // Sum: Trips + Fuel Bonus + Hourly Bonus + Workshop + Waiting
      return acc + d.totalAmount + d.totalBonus + (d.totalHourlyBonus || 0) + (d.totalWorkshop || 0) + (d.totalWaiting || 0);
    }, 0);

    const tons = currentMonthDays.reduce((acc, d) => acc + d.totalWeight, 0);
    
    // Calculate Vacation (Current Year)
    const usedVacation = data.filter(d => 
        d.type === DayType.VACATION && 
        new Date(d.date).getFullYear() === currentYear
    ).length;

    setMonthStats({
      earned,
      tons,
      count: currentMonthDays.filter(d => d.type === DayType.WORK).length
    });

    // Use totalVacationDays instead of just the limit
    setVacationStats({
        used: usedVacation,
        remaining: settings.totalVacationDays - usedVacation
    });

  }, [refreshTrigger]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Czy usunąć ten dzień?')) {
      StorageService.deleteDay(id);
      setDays(StorageService.getWorkDays());
    }
  };

  // Prepare chart data (Last 7 entries, Chronological Order Left->Right)
  const chartData = [...days]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort Ascending
    .slice(-7) // Take last 7
    .map(d => ({
      name: format(parseISO(d.date), 'dd.MM'),
      zarobek: Math.round(d.totalAmount + d.totalBonus + (d.totalHourlyBonus || 0) + (d.totalWorkshop || 0) + (d.totalWaiting || 0)),
      type: d.type
    }));

  const getBarColor = (type: DayType) => {
      if (type === DayType.VACATION) return '#16a34a'; // green-600
      if (type === DayType.SICK_LEAVE) return '#dc2626'; // red-600
      return '#2563eb'; // blue-600
  };

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-3">
        {/* Money Tile - Spans full width on very small screens or consistent logic */}
        <div className="col-span-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-2 text-blue-100 mb-1 text-xs uppercase tracking-wide font-bold">
            <TrendingUp size={14} /> Ten miesiąc
          </div>
          <div className="text-2xl font-bold">{monthStats.earned.toFixed(0)} zł</div>
          <div className="text-xs text-blue-200 mt-1">Suma zarobków</div>
        </div>

        {/* Tons Tile */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-[10px] uppercase tracking-wide font-bold">
            <Truck size={12} /> Przewiezione
          </div>
          <div className="text-xl font-bold text-slate-700">{monthStats.tons.toFixed(0)} t</div>
          <div className="text-[10px] text-slate-400 mt-1">{monthStats.count} dni pracy</div>
        </div>

        {/* Vacation Tile */}
        <div className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-[10px] uppercase tracking-wide font-bold">
            <Palmtree size={12} /> Urlop
          </div>
          <div className={`text-xl font-bold ${vacationStats.remaining < 5 ? 'text-orange-500' : 'text-slate-700'}`}>
             {vacationStats.remaining} dni
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Pozostało w tym roku</div>
        </div>
      </div>

      {/* Chart */}
      {days.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-72 flex flex-col">
          <h3 className="text-sm font-bold text-slate-500 mb-4 flex-none">Ostatnie dni</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value} zł`, 'Zarobek']}
                />
                <Bar dataKey="zarobek" radius={[4, 4, 0, 0]} barSize={20}>
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getBarColor(entry.type)} />
                    ))}
                  <LabelList 
                    dataKey="zarobek" 
                    position="top" 
                    fill="#64748b" 
                    fontSize={10} 
                    formatter={(val: number) => `${val} zł`} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* NEW DAY BUTTON - CENTERED */}
      <button 
        onClick={() => onEditDay('')}
        className="w-full py-4 bg-primary text-white rounded-xl shadow-lg shadow-blue-200 flex flex-col items-center justify-center active:scale-98 transition-transform group"
      >
        <div className="flex items-center gap-2 mb-1">
            <PlusCircle size={28} className="group-hover:scale-110 transition-transform"/>
            <span className="text-lg font-bold uppercase tracking-wide">Dodaj NOWY dzień</span>
        </div>
        <span className="text-xs text-blue-100 opacity-80">Rozpocznij nowy wpis pracy, urlopu lub L4</span>
      </button>

      {/* Recent List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">Historia</h3>
        <div className="space-y-3">
          {days.length === 0 ? (
            <div className="text-center p-8 text-slate-400">Brak wpisów. Kliknij przycisk powyżej, aby dodać!</div>
          ) : (
            days.map(day => (
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
                        {format(parseISO(day.date), 'd MMMM yyyy', { locale: pl })}
                      </div>
                      <div className="text-xs text-slate-400">
                        {day.type === DayType.WORK ? `${day.startTime} - ${day.endTime}` : day.type}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
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

                  {/* Add Another Trip Button */}
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
                  </>
                )}
                
                {/* Delete button (positioned absolute top right for better access) */}
                <button 
                  onClick={(e) => handleDelete(day.id, e)} 
                  className="absolute top-2 right-2 p-2 text-slate-300 hover:text-danger hover:bg-red-50 rounded-full transition-colors z-10"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;