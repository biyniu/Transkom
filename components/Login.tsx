import React, { useState, useEffect } from 'react';
import { Truck, LogIn, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // On mount, ALWAYS try to sync drivers.
    // This fixes the iOS PWA issue where standalone app has empty storage 
    // and doesn't know about drivers added in Safari.
    useEffect(() => {
        syncDrivers();
    }, []);

    const syncDrivers = async () => {
        setIsLoading(true);
        setError('');
        
        // 1. Try to fetch from Cloud
        const fetchedDrivers = await ApiService.fetchDrivers();
        
        if (fetchedDrivers) {
            // Success: Update local storage
            StorageService.saveDrivers(fetchedDrivers, false);
        } else {
            // Failure: Check if we have anything locally
            const localDrivers = StorageService.getDrivers();
            if (localDrivers.length === 0) {
                 // Only show error if we have ABSOLUTELY no data to work with
                 // If we have local data (offline mode), we just stay silent
                 setError('Błąd połączenia z bazą Google. Sprawdź URL w services/api.ts');
            }
        }
        setIsLoading(false);
    };

    const handleLogin = () => {
        if (!accessCode) return;

        // Reload from storage to ensure we have latest after sync
        const drivers = StorageService.getDrivers();
        const foundDriver = drivers.find(d => d.code === accessCode.trim());

        if (foundDriver) {
            // Save current driver
            const settings = StorageService.getSettings();
            settings.driverId = foundDriver.id;
            StorageService.saveSettings(settings);
            
            onLogin();
        } else {
            setError('Nieprawidłowy kod');
            setAccessCode('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary mb-4 shadow-lg shadow-blue-100">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">KierowcaPRO</h1>
                    <p className="text-slate-500 text-sm">Wprowadź swój kod dostępu</p>
                </div>

                <div className="space-y-4">
                    <div className="relative">
                        <div className="absolute left-4 top-4 text-slate-400">
                            <Lock size={20} />
                        </div>
                        <input 
                            type="password" 
                            inputMode="numeric"
                            value={accessCode}
                            onChange={(e) => {
                                setAccessCode(e.target.value);
                                setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder="KOD KIEROWCY"
                            className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl text-center focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 tracking-widest"
                        />
                    </div>
                    
                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-600 text-xs font-bold bg-red-50 p-3 rounded-lg animate-fade-in border border-red-100">
                            <AlertCircle size={16} className="shrink-0"/> {error}
                        </div>
                    )}

                    <button 
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:scale-100"
                    >
                       <LogIn size={20} /> 
                       {isLoading ? 'Sprawdzanie...' : 'Zaloguj się'}
                    </button>
                    
                    {/* Manual Sync Button */}
                    <button 
                        onClick={syncDrivers}
                        disabled={isLoading}
                        className="w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-bold flex items-center justify-center gap-1 transition"
                    >
                         <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> 
                         {isLoading ? 'Pobieranie bazy...' : 'Odśwież kody kierowców'}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 text-center opacity-30">
                <p className="text-[10px] uppercase font-bold text-slate-500">Transkom System</p>
            </div>
        </div>
    );
};

export default Login;