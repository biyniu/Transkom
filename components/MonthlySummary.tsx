
import React, { useState, useEffect } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Truck, Clock, Calculator, Wallet, Calendar, ChevronDown, Wrench, Hourglass, FileDown, Info, Percent, Briefcase } from 'lucide-react';
import { WorkDay, DayType } from '../types';
import * as StorageService from '../services/storage';
import { jsPDF } from "jspdf";
import autoTable from 'jspdf-autotable';

// Utility to replace Polish chars for PDF
const removeDiacritics = (str: string) => {
  return str
    .normalize('NFD').replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, 'l').replace(/Ł/g, 'L')
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ń/g, 'n').replace(/ó/g, 'o').replace(/ś/g, 's')
    .replace(/ź/g, 'z').replace(/ż/g, 'z')
    .replace(/Ą/g, 'A').replace(/Ć/g, 'C').replace(/Ę/g, 'E')
    .replace(/Ń/g, 'N').replace(/Ó/g, 'O').replace(/Ś/g, 'S')
    .replace(/Ź/g, 'Z').replace(/Ż/g, 'Z');
};

interface ExtraEvent {
  date: string;
  type: 'WARSZTAT' | 'POSTÓJ' | 'GODZINOWA';
  note: string;
  hours: number;
  amount: number;
}

interface LocationStat {
  name: string;
  rate: number;
  count: number;
  tons: number;
  amount: number;
}

const MonthlySummary: React.FC = () => {
  const [days, setDays] = useState<WorkDay[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [stats, setStats] = useState({
    baseEarnings: 0,
    fuelBonus: 0,
    hourlyBonus: 0, 
    
    workshopHours: 0,
    workshopMoney: 0,
    
    waitingHours: 0,
    waitingMoney: 0,

    extraHourlyHours: 0,
    extraHourlyMoney: 0,

    totalEarnings: 0,
    totalTons: 0,
    totalTrips: 0,
    daysWorked: 0
  });
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [extraEvents, setExtraEvents] = useState<ExtraEvent[]>([]);

  useEffect(() => {
    const allDays = StorageService.getWorkDays();
    setDays(allDays);
  }, []);

  useEffect(() => {
    if (days.length === 0) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const filteredDays = days.filter(d => {
      const date = new Date(d.date);
      return date.getMonth() === month - 1 && date.getFullYear() === year;
    });

    let baseEarnings = 0;
    let fuelBonus = 0;
    let hourlyBonus = 0;
    let workshopHours = 0;
    let workshopMoney = 0;
    let waitingHours = 0;
    let waitingMoney = 0;
    let extraHourlyHours = 0;
    let extraHourlyMoney = 0;
    let totalTons = 0;
    let totalTrips = 0;
    let daysWorked = 0;

    const extras: ExtraEvent[] = [];
    const grouped: Record<string, LocationStat> = {};

    filteredDays.forEach(day => {
      baseEarnings += day.totalAmount; 
      fuelBonus += day.totalBonus;
      hourlyBonus += (day.totalHourlyBonus || 0);
      
      if (day.workshopHours && day.workshopHours > 0) {
        workshopHours += day.workshopHours;
        const amount = day.totalWorkshop || 0;
        workshopMoney += amount;
        extras.push({
            date: day.date,
            type: 'WARSZTAT',
            note: 'Naprawa / Serwis',
            hours: day.workshopHours,
            amount: amount
        });
      }

      if (day.waitingHours && day.waitingHours > 0) {
        waitingHours += day.waitingHours;
        const amount = day.totalWaiting || 0;
        waitingMoney += amount;
        extras.push({
            date: day.date,
            type: 'POSTÓJ',
            note: day.waitingNote || 'Brak opisu',
            hours: day.waitingHours,
            amount: amount
        });
      }

      if (day.extraHourlyHours && day.extraHourlyHours > 0) {
        extraHourlyHours += day.extraHourlyHours;
        const amount = day.totalExtraHourly || 0;
        extraHourlyMoney += amount;
        extras.push({
            date: day.date,
            type: 'GODZINOWA',
            note: 'Praca na godziny',
            hours: day.extraHourlyHours,
            amount: amount
        });
      }

      totalTons += day.totalWeight;
      
      if (day.type === DayType.WORK) {
        totalTrips += day.trips.length;
        daysWorked++;

        day.trips.forEach(trip => {
          // Grupowanie po nazwie i stawce, aby rozróżnić kursy o innej cenie
          const key = `${trip.locationName}_${trip.rate}`;
          if (!grouped[key]) {
            grouped[key] = { 
                name: trip.locationName, 
                rate: trip.rate,
                count: 0, 
                tons: 0, 
                amount: 0 
            };
          }
          grouped[key].count += 1;
          grouped[key].tons += trip.weight;
          grouped[key].amount += trip.amount;
        });
      }
    });

    extras.sort((a, b) => b.date.localeCompare(a.date));
    setExtraEvents(extras);

    setStats({
      baseEarnings,
      fuelBonus,
      hourlyBonus,
      workshopHours,
      workshopMoney,
      waitingHours,
      waitingMoney,
      extraHourlyHours,
      extraHourlyMoney,
      totalEarnings: baseEarnings + fuelBonus + hourlyBonus + workshopMoney + waitingMoney + extraHourlyMoney,
      totalTons,
      totalTrips,
      daysWorked
    });

    const groupedArray = Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
    setLocationStats(groupedArray);

  }, [days, selectedMonth]);

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const [year, month] = selectedMonth.split('-');
    
    doc.setFontSize(18);
    doc.text(removeDiacritics("TRANSKOM ZAROBKI - RAPORT"), 14, 20);
    
    doc.setFontSize(12);
    doc.text(removeDiacritics(`Miesiac: ${month}/${year}`), 14, 30);
    doc.text(removeDiacritics(`Wygenerowano: ${new Date().toLocaleDateString()}`), 14, 36);

    doc.setFontSize(14);
    doc.text(removeDiacritics("Podsumowanie Finansowe"), 14, 50);
    
    const summaryData = [
      ["Podstawa (Kursy/Urlop)", `${stats.baseEarnings.toFixed(2)} zl`],
      ["Premia Paliwowa (Prognozowane 20%)", `${stats.fuelBonus.toFixed(2)} zl`],
      ["Premia Godzinowa (Czas Pracy)", `${stats.hourlyBonus.toFixed(2)} zl`],
      [`Praca na Godziny (${stats.extraHourlyHours}h)`, `${stats.extraHourlyMoney.toFixed(2)} zl`],
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
      headStyles: { fillColor: [37, 99, 235] },
      columnStyles: { 0: { cellWidth: 100 }, 1: { cellWidth: 50, halign: 'right' } }
    });

    let finalY = (doc as any).lastAutoTable.finalY || 100;
    
    doc.setFontSize(14);
    doc.text(removeDiacritics("Miejscowosci (Kursy)"), 14, finalY + 15);

    const tableRows = locationStats.map(loc => [
      removeDiacritics(loc.name),
      loc.count,
      loc.tons.toFixed(1),
      loc.rate.toFixed(2),
      `${loc.amount.toFixed(2)} zl`
    ]);

    autoTable(doc, {
      startY: finalY + 20,
      head: [[
          removeDiacritics('Miejscowosc'), 
          removeDiacritics('Ilosc'), 
          removeDiacritics('Tony'), 
          removeDiacritics('Stawka'), 
          removeDiacritics('Kwota')
      ]],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105] },
      columnStyles: { 
        0: { cellWidth: 'auto' }, 
        1: { halign: 'center', cellWidth: 15 }, 
        2: { halign: 'right', cellWidth: 20 },
        3: { halign: 'right', cellWidth: 20 },
        4: { halign: 'right', cellWidth: 35 }
      }
    });

    if (extraEvents.length > 0) {
        finalY = (doc as any).lastAutoTable.finalY || 100;
        doc.setFontSize(14);
        doc.text(removeDiacritics("Szczegoly: Praca dodatkowa"), 14, finalY + 15);

        const extraRows = extraEvents.map(ev => [
            ev.date,
            removeDiacritics(ev.type === 'GODZINOWA' ? 'GODZINY' : ev.type),
            removeDiacritics(ev.note),
            `${ev.hours}h`,
            `${ev.amount.toFixed(2)} zl`
        ]);

        autoTable(doc, {
            startY: finalY + 20,
            head: [[removeDiacritics('Data'), removeDiacritics('Typ'), removeDiacritics('Opis'), removeDiacritics('Czas'), removeDiacritics('Kwota')]],
            body: extraRows,
            theme: 'grid',
            headStyles: { fillColor: [234, 179, 8] },
            columnStyles: { 
                0: { cellWidth: 25 }, 
                1: { cellWidth: 25 }, 
                2: { cellWidth: 'auto' },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 30, halign: 'right' }
            }
        });
    }

    const finalY2 = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text(removeDiacritics(`Lacznie kursow: ${stats.totalTrips}`), 14, finalY2 + 10);
    doc.text(removeDiacritics(`Przewiezione tony: ${stats.totalTons.toFixed(2)}`), 14, finalY2 + 16);
    doc.text(removeDiacritics(`Dni pracujace: ${stats.daysWorked}`), 14, finalY2 + 22);

    doc.save(`Raport_Transkom_${year}_${month}.pdf`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Nagłówek i Filtr Miesiąca */}
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

      {/* Podsumowanie Stawkami */}
      <div className="bg-white border-b border-slate-200 shadow-sm p-3 z-10 flex-none space-y-3">
         <div className="grid grid-cols-2 gap-3">
             <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Kursy (Podstawa)</div>
                <div className="font-bold text-slate-700 text-lg">{stats.baseEarnings.toFixed(0)} zł</div>
             </div>
             <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <Percent size={10}/> Premia Paliwowa (20%)
                </div>
                <div className="font-bold text-blue-700 text-lg">{stats.fuelBonus.toFixed(0)} zł</div>
             </div>
         </div>

         <div className="grid grid-cols-4 gap-2">
            <div className="bg-orange-50 p-2 rounded-lg border border-orange-100 text-center">
                <div className="text-[10px] font-bold text-orange-400 uppercase tracking-wide mb-1">Premia h</div>
                <div className="font-bold text-orange-700 text-xs">{stats.hourlyBonus.toFixed(0)} zł</div>
            </div>

            <div className={`p-2 rounded-lg border text-center ${stats.extraHourlyMoney > 0 ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${stats.extraHourlyMoney > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
                   <Briefcase size={10}/> Godz.
                </div>
                <div className={`font-bold text-xs ${stats.extraHourlyMoney > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
                    {stats.extraHourlyMoney > 0 ? `${stats.extraHourlyMoney.toFixed(0)} zł` : '-'}
                </div>
            </div>
            
            <div className={`p-2 rounded-lg border text-center ${stats.workshopMoney > 0 ? 'bg-purple-50 border-purple-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${stats.workshopMoney > 0 ? 'text-purple-400' : 'text-slate-400'}`}>
                   <Wrench size={10}/> Warszt.
                </div>
                <div className={`font-bold text-xs ${stats.workshopMoney > 0 ? 'text-purple-700' : 'text-slate-400'}`}>
                    {stats.workshopMoney > 0 ? `${stats.workshopMoney.toFixed(0)} zł` : '-'}
                </div>
            </div>

            <div className={`p-2 rounded-lg border text-center ${stats.waitingMoney > 0 ? 'bg-yellow-50 border-yellow-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wide mb-1 flex items-center justify-center gap-1 ${stats.waitingMoney > 0 ? 'text-yellow-600' : 'text-slate-400'}`}>
                   <Hourglass size={10}/> Postój
                </div>
                <div className={`font-bold text-xs ${stats.waitingMoney > 0 ? 'text-yellow-700' : 'text-slate-400'}`}>
                     {stats.waitingMoney > 0 ? `${stats.waitingMoney.toFixed(0)} zł` : '-'}
                </div>
            </div>
         </div>
      </div>

      {/* Lista Miejscowości i Kursów */}
      <div className="flex-1 overflow-y-auto bg-slate-50 pb-24">
          <div>
            <div className="grid grid-cols-12 bg-slate-100 text-[10px] font-bold text-slate-500 uppercase py-2 px-4 border-b border-slate-200 sticky top-0 z-10">
                <div className="col-span-5">Miejscowość / Tony</div>
                <div className="col-span-1 text-center">Ilość</div>
                <div className="col-span-3 text-right">Stawka</div>
                <div className="col-span-3 text-right">Zarobek</div>
            </div>
            
            {locationStats.length === 0 && extraEvents.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 flex flex-col items-center justify-center h-64">
                        <Truck size={48} className="mb-4 opacity-20" />
                        <p>Brak danych w tym miesiącu</p>
                    </div>
            ) : (
                <div className="divide-y divide-slate-100 bg-white">
                    {locationStats.map((loc, idx) => (
                        <div key={idx} className="grid grid-cols-12 py-3 px-4 items-center hover:bg-blue-50 transition-colors">
                            <div className="col-span-5 pr-2">
                                <div className="font-bold text-slate-800 text-sm leading-tight mb-1">{loc.name}</div>
                                <div className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500">
                                   {loc.tons.toFixed(1)} t
                                </div>
                            </div>
                            <div className="col-span-1 text-center">
                                <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {loc.count}
                                </span>
                            </div>
                            <div className="col-span-3 text-right">
                                <div className="text-xs font-mono text-slate-400 font-bold">{loc.rate.toFixed(2)}</div>
                            </div>
                            <div className="col-span-3 text-right">
                                <div className="font-bold text-green-700 text-sm">{loc.amount.toFixed(2)} zł</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          {/* Cześć: Szczegóły godzinowe */}
          {extraEvents.length > 0 && (
            <div className="mt-6 border-t border-slate-200">
                 <div className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase py-2 px-4 border-b border-slate-100 sticky top-0 z-10 flex items-center gap-2">
                    <Info size={14}/> Szczegóły: Dodatki Godzinowe
                 </div>
                 <div className="divide-y divide-slate-100 bg-white">
                    {extraEvents.map((ev, idx) => (
                        <div key={idx} className="p-4 hover:bg-slate-50 transition-colors">
                             <div className="flex justify-between items-start mb-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-bold text-slate-400">{format(parseISO(ev.date), 'dd.MM')}</span>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                                        ev.type === 'WARSZTAT' ? 'bg-purple-100 text-purple-700' : 
                                        ev.type === 'POSTÓJ' ? 'bg-yellow-100 text-yellow-700' : 
                                        'bg-indigo-100 text-indigo-700'
                                    }`}>
                                        {ev.type === 'GODZINOWA' ? 'GODZINY' : ev.type}
                                    </span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-slate-700">{ev.amount.toFixed(2)} zł</span>
                                </div>
                             </div>
                             <div className="flex justify-between items-end">
                                <div className="text-sm text-slate-600 leading-snug max-w-[75%]">
                                    {ev.note}
                                </div>
                                <div className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">
                                    {ev.hours} h
                                </div>
                             </div>
                        </div>
                    ))}
                 </div>
            </div>
          )}
          
          {(locationStats.length > 0 || extraEvents.length > 0) && (
              <div className="p-6 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-200">
                  Łącznie wykonano: {stats.totalTrips} kursów
              </div>
          )}
      </div>

    </div>
  );
};

export default MonthlySummary;
