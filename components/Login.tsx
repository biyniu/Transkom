
// Fix: Added React import to resolve missing 'React' namespace
import React, { useState, useEffect } from 'react';
import { Truck, LogIn, Lock, AlertCircle, RefreshCw, Database } from 'lucide-react';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';

interface LoginProps {
    onLogin: () => void;
    onOpenAdmin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onOpenAdmin }) => {
    const [accessCode, setAccessCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        syncDrivers();
    }, []);

    const syncDrivers = async () => {
        if (!ApiService.isFirebaseConfigured()) {
            setError('Błąd konfiguracji Firebase w pliku services/api.ts');
            return;
        }

        setIsLoading(true);
        setError('');
        
        try {
            const fetchedDrivers = await ApiService.fetchDrivers();
            if (fetchedDrivers && fetchedDrivers.length > 0) {
                StorageService.saveDrivers(fetchedDrivers, false);
            } else {
                const localDrivers = StorageService.getDrivers();
                if (localDrivers.length === 0) {
                     setError('Baza kierowców w chmurze jest pusta.');
                }
            }
        } catch (e: any) {
            setError(e.message || 'Błąd połączenia z Firebase.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = () => {
        if (!accessCode) return;

        const drivers = StorageService.getDrivers();
        const foundDriver = drivers.find(d => d.code === accessCode.trim());

        if (foundDriver) {
            const settings = StorageService.getSettings();
            settings.driverId = foundDriver.id;
            StorageService.saveSettings(settings);
            onLogin();
        } else {
            setError('Nieprawidłowy kod kierowcy');
            setAccessCode('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLogin();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-slate-50 relative">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm space-y-6">
                <div className="text-center space-y-2">
                    <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-primary mb-4 shadow-lg shadow-blue-100">
                        <Truck size={32} />
                    </div>
                    <h1 className="text-2xl font-black text-slate-800">Transkom</h1>
                    <p className="text-slate-500 text-sm">Wprowadź kod kierowcy</p>
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
                            placeholder="KOD PIN"
                            className="w-full p-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xl text-center focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 tracking-widest"
                        />
                    </div>
                    
                    {error && (
                        <div className="flex flex-col items-center gap-2 text-red-600 text-[10px] font-bold bg-red-50 p-3 rounded-lg animate-fade-in border border-red-100 leading-tight">
                            <div className="flex items-center gap-2">
                                <AlertCircle size={14} className="shrink-0"/>
                                <span>WYSTĄPIŁ PROBLEM</span>
                            </div>
                            <p className="text-center opacity-80">{error}</p>
                        </div>
                    )}

                    <button 
                        onClick={handleLogin}
                        disabled={isLoading}
                        className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-70 disabled:scale-100"
                    >
                       <LogIn size={20} /> 
                       {isLoading ? 'Łączenie...' : 'Zaloguj się'}
                    </button>
                    
                    <button 
                        onClick={syncDrivers}
                        disabled={isLoading}
                        className="w-full py-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold flex items-center justify-center gap-1 transition uppercase tracking-wider"
                    >
                         <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /> 
                         {isLoading ? 'Pobieranie...' : 'Odśwież kody z chmury'}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 text-center opacity-30 flex items-center gap-2">
                <Database size={12} />
                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Firebase Cloud Storage</p>
            </div>

            <button 
                onClick={onOpenAdmin}
                className="fixed bottom-6 right-6 p-3 bg-white text-slate-300 hover:text-slate-800 rounded-full shadow-md border border-slate-100 transition-all active:scale-90"
                title="Panel Administratora"
            >
                <Lock size={20} />
            </button>
        </div>
    );
};

export default Login;
