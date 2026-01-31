import React, { useState, useEffect } from 'react';
import { Save, Settings as SettingsIcon, RotateCcw, Info, Lock, Cloud, LogOut } from 'lucide-react';
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
    const allDays = StorageService.getWorkDays();
    if (allDays.length > 0) {
        StorageService.saveDay(allDays[0]);
    }
    setMessage('Ustawienia zapisane i przeliczone!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChange = (key: keyof AppSettings, value: string) => {
    const numValue = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [key]: isNaN(numValue) ? 0 : numValue
    }));
  };

  const oldVacationDays = Math.max(0, settings.totalVacationDays - settings.vacationDaysLimit);
  const isConnected = ApiService.hasValidUrl();

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-none flex justify-between items-center">
         <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
           <SettingsIcon size={20} className="text-primary"/> Ustawienia
         </h2>
         <button 
            onClick={onOpenAdmin}
            className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-full transition"
            title="Panel Administratora"
         >
            <Lock size={20} />
         </button>
      </div>

       {/* Message Toast */}
       {message && (
        <div className="absolute top-20 left-4 right-4 z-50 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg text-center text-sm font-bold shadow-md animate-fade-in">
          {message}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Connection Info */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase">Konto kierowcy</span>
                {isConnected ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Cloud size={10} /> Online
                    </span>
                ) : (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                        <Cloud size={10} /> Offline
                    </span>
                )}
            </div>
            <div className="flex items-center justify-between">
                <div className="font-bold text-lg text-slate-800">{settings.driverId}</div>
                <button onClick={onLogout} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition">
                    <LogOut size={18} />
                </button>
            </div>
            
            {/* Show error only if NOT connected */}
            {!isConnected && (
                <div className="text-[10px] text-red-400 mt-1">Brak konfiguracji URL Google Script</div>
            )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Zarządzanie Urlopem</h3>
           
           <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-sm text-blue-800 flex flex-col gap-1">
              <div className="font-bold flex items-center gap-2"><Info size={16}/> Informacja</div>
              <div>Z puli <strong>{settings.totalVacationDays}</strong> dni:</div>
              <ul className="list-disc list-inside pl-1">
                  <li><strong>{oldVacationDays}</strong> dni stary urlop ({settings.vacationRateOld} zł)</li>
                  <li><strong>{settings.vacationDaysLimit}</strong> dni nowy urlop ({settings.vacationRateNew} zł)</li>
              </ul>
           </div>

           <div className="grid grid-cols-2 gap-4">
               <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Całkowita pula dni urlopu</label>
                    <input 
                    type="number" 
                    value={settings.totalVacationDays}
                    onChange={(e) => handleChange('totalVacationDays', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg"
                    />
               </div>
               
               <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stary Urlop (zł)</label>
                    <input 
                    type="number" 
                    value={settings.vacationRateOld}
                    onChange={(e) => handleChange('vacationRateOld', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
               </div>

               <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nowy Urlop (zł)</label>
                    <input 
                    type="number" 
                    value={settings.vacationRateNew}
                    onChange={(e) => handleChange('vacationRateNew', e.target.value)}
                    className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
               </div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
           <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide border-b border-slate-100 pb-2">Pozostałe Stawki</h3>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Stawka za L4 (zł)</label>
             <input 
               type="number" 
               value={settings.sickLeaveRate}
               onChange={(e) => handleChange('sickLeaveRate', e.target.value)}
               className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
             />
           </div>
           
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Premia Godzinowa (zł/h)</label>
             <input 
               type="number" 
               step="0.5"
               value={settings.hourlyRate}
               onChange={(e) => handleChange('hourlyRate', e.target.value)}
               className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Stawka Warsztat (zł/h)</label>
             <input 
               type="number"
               step="1"
               value={settings.workshopRate}
               onChange={(e) => handleChange('workshopRate', e.target.value)}
               className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
             />
           </div>

           <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Stawka Postój (zł/h)</label>
             <input 
               type="number"
               step="1"
               value={settings.waitingRate}
               onChange={(e) => handleChange('waitingRate', e.target.value)}
               className="w-full p-3 border border-slate-300 rounded-lg bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none"
             />
           </div>
        </div>

        <button 
            onClick={handleSave} 
            className="w-full bg-primary text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform text-lg"
        >
            <Save size={24} /> Zapisz Ustawienia
        </button>

      </div>
    </div>
  );
};

export default Settings;