

// Fix: Import React to resolve 'Cannot find namespace React' error
import React, { useState } from 'react';
import { Save, Settings as SettingsIcon, Lock, Cloud, LogOut, RefreshCw, Info } from 'lucide-react';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';
import { AppSettings } from '../types';

interface SettingsProps {
    onOpenAdmin: () => void;
    onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onOpenAdmin, onLogout }) => {
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  const [message, setMessage] = useState('');

  const handleSave = () => {
    StorageService.saveSettings(settings);
    setMessage('Ustawienia zapisane!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChange = (key: keyof AppSettings, value: string) => {
    const numValue = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const handleGlobalRateRefresh = () => {
    if (confirm("Zaktualizować stawki w kursach z 2 ostatnich miesięcy?")) {
        const count = StorageService.updateRecentHistoryRates();
        setMessage(count > 0 ? `Zaktualizowano ${count} dni!` : 'Kursy są już aktualne.');
        setTimeout(() => setMessage(''), 3000);
    }
  };

  const isConnected = ApiService.isFirebaseConfigured();
  const oldVacationDays = Math.max(0, settings.totalVacationDays - settings.vacationDaysLimit);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-none flex justify-between items-center">
         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
           <SettingsIcon size={20} className="text-primary"/> Opcje i Stawki
         </h2>
         <button onClick={onOpenAdmin} className="p-2 text-slate-400 hover:text-slate-800 rounded-full transition">
            <Lock size={20} />
         </button>
      </div>

      {message && (
        <div className="absolute top-20 left-4 right-4 z-50 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg text-center text-sm font-bold shadow-md animate-fade-in">
          {message}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Connection Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Status połączenia</span>
                {isConnected ? (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Cloud size={10} /> Chmura Aktywna
                    </span>
                ) : (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Cloud size={10} /> Brak Konfiguracji
                    </span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="font-bold text-lg text-slate-800">Kierowca: {settings.driverId || 'Niezalogowany'}</div>
                <button onClick={onLogout} className="text-red-500 p-2 rounded-lg hover:bg-red-50 transition">
                    <LogOut size={20} />
                </button>
            </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Narzędzia</h3>
           <button onClick={handleGlobalRateRefresh} className="w-full flex items-center justify-between p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700 group">
               <div className="text-left">
                   <div className="font-bold text-sm">Synchronizuj Stawki</div>
                   <div className="text-[10px] opacity-70">Aktualizuje ceny w starych kursach</div>
               </div>
               <RefreshCw size={20} className="group-active:rotate-180 transition-transform duration-500" />
           </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Urlopy</h3>
           <div className="bg-blue-50 p-3 rounded-lg text-[11px] text-blue-800 flex flex-col gap-1 border border-blue-100">
              <div className="font-bold flex items-center gap-2 uppercase tracking-tighter"><Info size={14}/> Twoja pula urlopowa:</div>
              <div>Z {settings.totalVacationDays} dni: <strong>{oldVacationDays} dni</strong> (stara stawka) i <strong>{settings.vacationDaysLimit} dni</strong> (nowa stawka).</div>
           </div>
           <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Całkowite dni urlopu</label>
                    <input type="number" value={settings.totalVacationDays} onChange={(e) => handleChange('totalVacationDays', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50 font-bold" />
               </div>
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Stary Urlop (zł)</label>
                    <input type="number" value={settings.vacationRateOld} onChange={(e) => handleChange('vacationRateOld', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Nowy Urlop (zł)</label>
                    <input type="number" value={settings.vacationRateNew} onChange={(e) => handleChange('vacationRateNew', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Inne Stawki</h3>
           <div className="grid grid-cols-2 gap-4">
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">L4 (zł)</label>
                    <input type="number" value={settings.sickLeaveRate} onChange={(e) => handleChange('sickLeaveRate', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Godzinowa (zł/h)</label>
                    <input type="number" step="0.5" value={settings.hourlyRate} onChange={(e) => handleChange('hourlyRate', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Warsztat (zł/h)</label>
                    <input type="number" value={settings.workshopRate} onChange={(e) => handleChange('workshopRate', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
               <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Postój (zł/h)</label>
                    <input type="number" value={settings.waitingRate} onChange={(e) => handleChange('waitingRate', e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-50" />
               </div>
           </div>
        </div>

        <button onClick={handleSave} className="w-full bg-primary text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-100 active:scale-95 transition-transform">
            <Save size={20} /> Zapisz Ustawienia
        </button>

      </div>
    </div>
  );
};

export default Settings;
