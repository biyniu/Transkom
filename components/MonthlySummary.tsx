import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Truck, Clock, Calculator, Wallet, Calendar, ChevronDown, Wrench, Hourglass, FileDown } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

// Utility to replace Polish chars for PDF (since standard fonts don't support UTF-8 chars well without custom font files)
const removeDiacritics = (str: string) => {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, 'l').replace(/Ł/g, 'L');
};

const MonthlySummary: React.FC = () => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [stats, setStats] = useState({
    baseEarnings: 0,
    fuelBonus: 0,
    hourlyBonus: 0, // 4.5 zł/h
    
    workshopHours: 0,
    workshopMoney: 0,
    
    waitingHours: 0,
    waitingMoney: 0,

    totalEarnings: 0,
    totalTons: 0,
    totalTrips: 0,
    daysWorked: 0
  });
  const [locationStats, setLocationStats] = useState<any[]>([]);

  useEffect(() => {
    const allDays = StorageService.getWorkDays();
    setDays(allDays);
  }, []);

  useEffect(() => {
    if (days.length === 0) return;

    // Filter days for selected month
    const [year, month] = selectedMonth.split('-').map(Number);
    const filteredDays = days.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === month - 1 && date.getFullYear() === year;
    });

    // 1. Calculate Global Stats
    let baseEarnings = 0;
    let fuelBonus = 0;
    let hourlyBonus = 0;
    
    let workshopHours = 0;
    let workshopMoney = 0;
    
    let waitingHours = 0;
    let waitingMoney = 0;

    let totalTons = 0;
    let totalTrips = 0;
    let daysWorked = 0;

    filteredDays.forEach(day => {
      // Sum totals regardless of day type (Urlop adds to earnings too)
      baseEarnings += day.totalAmount; 
      fuelBonus += day.totalBonus;
      hourlyBonus += (day.totalHourlyBonus || 0);
      
      // Detailed extras
      workshopHours += (day.workshopHours || 0);
      workshopMoney += (day.totalWorkshop || 0);

      waitingHours += (day.waitingHours || 0);
      waitingMoney += (day.totalWaiting || 0);

      totalTons += day.totalWeight;
      
      if (day.type === DayType.WORK) {
        totalTrips += day.trips.length;
        daysWorked++;
      }
    });

    setStats({
      baseEarnings,
      fuelBonus,
      hourlyBonus,
      workshopHours,
      workshopMoney,
      waitingHours,
      waitingMoney,
      totalEarnings: baseEarnings + fuelBonus + hourlyBonus + workshopMoney + waitingMoney,
      totalTons,
      totalTrips,
      daysWorked
    });

    // 2. Group by Location (for printout comparison)
    const grouped: Record<string, { count: number, tons: number, amount: number, name: string }> = {};

    filteredDays.forEach(day => {
      if (day.type === DayType.WORK) {
        day.trips.forEach(trip => {
          const key = trip.locationName;
          if (!grouped[key]) {
            grouped[key] = { name: key, count: 0, tons: 0, amount: 0 };
          }
          grouped[key].count += 1;
          grouped[key].tons += trip.weight;
          grouped[key].amount += trip.amount;
        });
      }
    });

    // Convert to array and sort by name
    const groupedArray = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    setLocationStats(groupedArray);

  }, [days, selectedMonth]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const [year, month] = selectedMonth.split('-');
    
    // Header
    doc.setFontSize(18);
    doc.text(removeDiacritics("TRANSKOM ZAROBKI - RAPORT"), 14, 20);
    
    doc.setFontSize(12);
    doc.text(removeDiacritics(`Miesiac: ${month}/${year}`), 14, 30);
    doc.text(removeDiacritics(`Wygenerowano: ${new Date().toLocaleDateString()}`), 14, 36);

    // Summary Section
    doc.setFontSize(14);
    doc.text(removeDiacritics("Podsumowanie Finansowe"), 14, 50);
    
    const summaryData = [
      ["Podstawa (Kursy/Urlop)", `${stats.baseEarnings.toFixed(2)} zl`],
      ["Premia Paliwowa (20%)", `${stats.fuelBonus.toFixed(2)} zl`],
      ["Godziny (4.5 zl/h)", `${stats.hourlyBonus.toFixed(2)} zl`],
      [`Warsztat (${stats.workshopHours}h)`, `${stats.workshopMoney.toFixed(2)} zl`],
      [`Postoj (${stats.waitingHours}h)`, `${stats.waitingMoney.toFixed(2)} zl`],
      ["-----------------", "----------"],
      ["RAZEM", `${stats.totalEarnings.toFixed(2)} zl`]
    ];

    autoTable(doc, {
      startY: 55,
      head: [[removeDiacritics('Kategoria'), removeDiacritics('Kwota')]],
      body: summaryData.map(row => [removeDiacritics(row[0]), row[1]]),
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }, // Blue
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'right' } }
    });

    // Locations Table
    const finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(14);
    doc.text(removeDiacritics("Szczegoly Miejscowosci"), 14, finalY + 15);

    const tableRows = locationStats.map(loc => [
      removeDiacritics(loc.name),
      loc.count,
      loc.tons.toFixed(1),
      `${loc.amount.toFixed(2)} zl`
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [[removeDiacritics('Miejscowosc'), removeDiacritics('Ilosc'), removeDiacritics('Tony'), removeDiacritics('Kwota')]],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] }, // Slate
      columnStyles: { 
        0: { cellWidth: 'auto' }, 
        1: { halign: 'center' }, 
        2: { halign: 'right' },
        3: { halign: 'right' }
      }
    });

    // Footer Stats
    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text(removeDiacritics(`Lacznie kursow: ${stats.totalTrips}`), 14, finalY2 + 10);
    doc.text(removeDiacritics(`Przewiezione tony: ${stats.totalTons.toFixed(2)}`), 14, finalY2 + 16);
    doc.text(removeDiacritics(`Dni pracujace: ${stats.daysWorked}`), 14, finalY2 + 22);

    doc.save(`Raport_Transkom_${year}_${month}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* 1. COMPACT HEADER: Date + Total */}
      <div className="bg-white p-4 border-b border-slate-200 flex justify-between items-center shadow-sm z-10 flex-none">
        <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar size={12}/> Miesiąc
            </span>
            <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="font-bold text-slate-800 bg-transparent outline-none cursor-pointer text-lg"
            />
        </div>
        
        {/* Export PDF Button */}
        <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF} 
              className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-2 rounded-lg text-xs font-bold border border-red-100 active:scale-95 transition"
            >
              <FileDown size={16} /> PDF
            </button>
            <div className="text-right">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-end gap-1">
                    <Wallet size={12}/> Razem
                 </span>
                 <div className="text-3xl font-black text-green-600 leading-none mt-1">
                    {stats.totalEarnings.toFixed(0)} <span className="text-sm font-medium text-green-500">zł</span>
                 </div>
            </div>
        </div>
      </div>

      {/* 2. DETAILED BREAKDOWN (Replaces simple row) */}
      <div className="bg-white border-b border-slate-200 shadow-sm p-3 z-10 flex-none space-y-3">
         
         {/* Main Income */}
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kursy (Tony)</div>
                <div className="font-bold text-slate-700 text-lg">{stats.baseEarnings.toFixed(0)} zł</div>
             </div>
             <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Premia 20%</div>
                <div className="font-bold text-blue-700 text-lg">{stats.fuelBonus.toFixed(0)} zł</div>
             </div>
         </div>

         {/* Hourly & Extras */}
         <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100 text-center">
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1">Jazda 4.5</div>
                <div className="font-bold text-orange-700">{stats.hourlyBonus.toFixed(0)} zł</div>
            </div>
            
            <div className={`p-2 rounded-lg border text-center ${stats.workshopMoney > 0 ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${stats.workshopMoney > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                   <Wrench size={10}/> Warsztat
                </div>
                <div className={`font-bold ${stats.workshopMoney > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                    {stats.workshopMoney > 0 ? `${stats.workshopMoney.toFixed(0)} zł` : '-'}
                </div>
                {stats.workshopHours > 0 && <div className="text-[10px] text-purple-500 font-medium">{stats.workshopHours} h</div>}
            </div>

            <div className={`p-2 rounded-lg border text-center ${stats.waitingMoney > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${stats.waitingMoney > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                   <Hourglass size={10}/> Postój
                </div>
                <div className={`font-bold ${stats.waitingMoney > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>
                     {stats.waitingMoney > 0 ? `${stats.waitingMoney.toFixed(0)} zł` : '-'}
                </div>
                 {stats.waitingHours > 0 && <div className="text-[10px] text-yellow-600 font-medium">{stats.waitingHours} h</div>}
            </div>
         </div>

      </div>

      {/* 3. THE LIST (Fills rest of screen) */}
      <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
          {/* List Header */}
          <div className="grid grid-cols-12 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase py-2 px-4 border-b border-slate-200 sticky top-0 z-10">
             <div className="col-span-6">Miejscowość / Tony</div>
             <div className="col-span-2 text-center">Ilość</div>
             <div className="col-span-4 text-right">Zarobek</div>
          </div>
          
          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto pb-24"> 
            {locationStats.length === 0 ? (
                 <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center h-64">
                    <Truck size={48} className="mb-4 opacity-20" />
                    <p>Brak danych w tym miesiącu</p>
                 </div>
            ) : (
                <div className="divide-y divide-slate-100 bg-white">
                    {locationStats.map((loc, idx) => (
                        <div key={idx} className="grid grid-cols-12 py-3 px-4 items-center hover:bg-blue-50 transition-colors">
                            <div className="col-span-6 pr-2">
                                <div className="font-bold text-slate-800 text-sm leading-tight mb-1">{loc.name}</div>
                                <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                   {loc.tons.toFixed(1)} t
                                </div>
                            </div>
                            <div className="col-span-2 text-center">
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full">
                                    {loc.count}
                                </span>
                            </div>
                            <div className="col-span-4 text-right">
                                <div className="font-bold text-green-700 text-base">{loc.amount.toFixed(2)} zł</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            {/* Footer Summary in list */}
            {locationStats.length > 0 && (
                <div className="p-6 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
                    Łącznie wykonano: {stats.totalTrips} kursów
                </div>
            )}
          </div>
      </div>

    </div>
  );
};

export default MonthlySummary;