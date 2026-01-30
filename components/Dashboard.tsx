import React, { useEffect, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Edit2, Trash2, TrendingUp, Calendar, Briefcase, Truck, Wrench, Hourglass } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

interface DashboardProps {
  onEditDay: (id: string) => void;
  refreshTrigger: number;
}

const Dashboard: React.FC<DashboardProps> = ({ onEditDay, refreshTrigger }) => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [monthStats, setMonthStats] = useState({ earned: 0, tons: 0, count: 0 });

  useEffect(() => {
    const data = StorageService.getWorkDays();
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
    
    setMonthStats({
      earned,
      tons,
      count: currentMonthDays.filter(d => d.type === DayType.WORK).length
    });

  }, [refreshTrigger]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Czy usunąć ten dzień?')) {
      StorageService.deleteDay(id);
      setDays(StorageService.getWorkDays());
    }
  };

  // Prepare chart data (Last 7 entries)
  const chartData = [...days].reverse().slice(-7).map(d => ({
    name: format(parseISO(d.date), 'dd.MM'),
    zarobek: Math.round(d.totalAmount + d.totalBonus + (d.totalHourlyBonus || 0) + (d.totalWorkshop || 0) + (d.totalWaiting || 0))
  }));

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-4 text-white shadow-lg shadow-blue-200">
          <div className="flex items-center gap-2 text-blue-100 mb-1 text-xs uppercase tracking-wide font-bold">
            <TrendingUp size={14} /> Ten miesiąc
          </div>
          <div className="text-2xl font-bold">{monthStats.earned.toFixed(0)} zł</div>
          <div className="text-xs text-blue-200 mt-1">Suma zarobków</div>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
           <div className="flex items-center gap-2 text-slate-400 mb-1 text-xs uppercase tracking-wide font-bold">
            <Truck size={14} /> Przewiezione
          </div>
          <div className="text-2xl font-bold text-slate-700">{monthStats.tons.toFixed(0)} t</div>
          <div className="text-xs text-slate-400 mt-1">{monthStats.count} dni pracy</div>
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
                />
                <Bar dataKey="zarobek" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20}>
                  <LabelList dataKey="zarobek" position="top" fill="#64748b" fontSize={12} formatter={(val: number) => `${val}`} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent List */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 mb-3">Historia</h3>
        <div className="space-y-3">
          {days.length === 0 ? (
            <div className="text-center p-8 text-slate-400">Brak wpisów. Dodaj pierwszy dzień!</div>
          ) : (
            days.map(day => (
              <div 
                key={day.id} 
                onClick={() => onEditDay(day.id)}
                className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.98] transition-transform cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${
                      day.type === DayType.WORK ? 'bg-blue-50 text-primary' : 
                      day.type === DayType.VACATION ? 'bg-yellow-50 text-yellow-600' : 
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {day.type === DayType.WORK ? <Briefcase size={18}/> : <Calendar size={18}/>}
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
                        {day.type}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Mini preview of trips + workshop if work day */}
                {day.type === DayType.WORK && (
                  <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-slate-500 truncate flex flex-wrap gap-2">
                    {day.totalWorkshop && day.totalWorkshop > 0 ? (
                        <span className="flex items-center gap-1 text-orange-500 font-semibold"><Wrench size={12}/> Warsztat</span>
                    ) : null}
                    {day.totalWaiting && day.totalWaiting > 0 ? (
                        <span className="flex items-center gap-1 text-yellow-500 font-semibold"><Hourglass size={12}/> Oczekiwanie</span>
                    ) : null}
                    <span>{day.trips.map(t => t.locationName).join(', ')}</span>
                  </div>
                )}
                
                <div className="mt-2 flex justify-end gap-3 opacity-0 hover:opacity-100 transition-opacity">
                   <button onClick={(e) => handleDelete(day.id, e)} className="text-danger p-1"><Trash2 size={16}/></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;