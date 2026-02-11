
// Fix: Added React import to resolve missing 'React' namespace
import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, Settings as SettingsIcon, MapPin, FileText, AlertTriangle, CloudOff } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DayEditor from './components/DayEditor';
import LocationsManager from './components/LocationsManager';
import MonthlySummary from './components/MonthlySummary';
import Settings from './components/Settings';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import InstallPrompt from './components/InstallPrompt';
import * as StorageService from './services/storage';
import * as ApiService from './services/api';
import { WorkDay } from './types';

enum View {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  LOCATIONS = 'LOCATIONS',
  SUMMARY = 'SUMMARY',
  SETTINGS = 'SETTINGS'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const settings = StorageService.getSettings();
    if (settings.driverId) {
      setIsLoggedIn(true);
      initializeData(settings.driverId);
    }
  }, []);

  const initializeData = async (driverId: string) => {
    setIsLoading(true);
    setInitError(null);
    try {
        // Pobierz lokalizacje z chmury (globalne)
        try {
            const locations = await ApiService.fetchLocations();
            if (locations && locations.length > 0) {
                StorageService.saveLocations(locations, false);
            }
        } catch (e) {
            console.warn("Could not fetch global locations, using local.");
        }

        // Pobierz PEŁNY profil kierowcy
        const profile = await ApiService.fetchDriverFullProfile(driverId);
        const localDays = StorageService.getWorkDays();
        
        if (profile.settings) {
            const mergedSettings = { ...profile.settings, driverId };
            StorageService.saveSettings(mergedSettings, false); 
        }

        let finalDays: WorkDay[] = [...(profile.days || [])];
        localDays.forEach(localDay => {
            if (!finalDays.find(cloudDay => cloudDay.id === localDay.id)) {
                finalDays.push(localDay);
            }
        });

        finalDays.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        if (finalDays.length > 0) {
            StorageService.saveWorkDays(finalDays, false);
            setRefreshTrigger(prev => prev + 1);
        }
    } catch (e: any) {
        console.error("Initialization error:", e);
        // Jeśli mamy dane lokalne, nie blokujemy aplikacji błędem
        const localDays = StorageService.getWorkDays();
        if (localDays.length > 0) {
            setInitError("Brak uprawnień do chmury. Pracujesz w trybie lokalnym.");
        } else {
            setInitError(e.message || "Błąd inicjalizacji danych.");
        }
    } finally {
        setIsLoading(false);
    }
  };

  const handleLogin = () => {
    const settings = StorageService.getSettings();
    setIsLoggedIn(true);
    if (settings.driverId) {
        initializeData(settings.driverId);
    }
  };

  const handleLogout = () => {
    if (confirm("Czy na pewno chcesz się wylogować?")) {
        const settings = StorageService.getSettings();
        settings.driverId = undefined;
        StorageService.saveSettings(settings, false);
        setIsLoggedIn(false);
        setCurrentView(View.DASHBOARD);
    }
  };

  const handleOpenEditor = (dayId?: string) => {
    setEditingDayId(dayId || null);
    setCurrentView(View.EDITOR);
  };

  const handleCloseEditor = () => {
    setCurrentView(View.DASHBOARD);
    setEditingDayId(null);
    setRefreshTrigger(prev => prev + 1);
  };

  if (!isLoggedIn) {
    return (
        <>
            {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} />}
            <Login onLogin={handleLogin} onOpenAdmin={() => setShowAdmin(true)} />
            <InstallPrompt />
        </>
    );
  }

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden relative">
      <InstallPrompt />

      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-xs font-bold text-slate-500 animate-pulse uppercase tracking-widest">Synchronizacja z chmurą...</p>
            </div>
        </div>
      )}

      {initError && (
        <div className="absolute inset-x-4 top-4 z-[70] bg-orange-600 text-white p-4 rounded-xl shadow-2xl animate-fade-in flex items-start gap-3">
            <CloudOff className="shrink-0" size={24} />
            <div className="flex-1">
                <h3 className="font-bold text-sm uppercase mb-1">Uwaga: Tryb Lokalny</h3>
                <p className="text-xs opacity-90 leading-tight">{initError}</p>
                <div className="flex gap-2 mt-3">
                    <button 
                        onClick={() => {
                            const sid = StorageService.getSettings().driverId;
                            if (sid) initializeData(sid);
                        }}
                        className="text-[10px] font-bold uppercase bg-white/20 px-3 py-1 rounded-lg"
                    >
                        Spróbuj ponownie
                    </button>
                    <button 
                        onClick={() => setInitError(null)}
                        className="text-[10px] font-bold uppercase bg-black/20 px-3 py-1 rounded-lg"
                    >
                        Ukryj
                    </button>
                </div>
            </div>
        </div>
      )}

      {showAdmin && (
          <AdminPanel onClose={() => setShowAdmin(false)} />
      )}

      <main className="flex-1 overflow-hidden relative flex flex-col min-h-0">
        {currentView === View.DASHBOARD && (
          <div className="flex-1 overflow-y-auto min-h-0">
            <Dashboard onEditDay={handleOpenEditor} refreshTrigger={refreshTrigger} />
          </div>
        )}
        {currentView === View.EDITOR && (
          <div className="absolute inset-0 z-50 bg-white">
            <DayEditor dayId={editingDayId} onClose={handleCloseEditor} />
          </div>
        )}
        {currentView === View.LOCATIONS && (
          <div className="flex-1 overflow-hidden">
             <LocationsManager mode="DRIVER" />
          </div>
        )}
        {currentView === View.SUMMARY && (
          <MonthlySummary />
        )}
        {currentView === View.SETTINGS && (
          <Settings onOpenAdmin={() => setShowAdmin(true)} onLogout={handleLogout} />
        )}
      </main>

      {currentView !== View.EDITOR && (
        <nav className="h-20 bg-white border-t border-slate-200 flex justify-around items-center px-2 pb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex-none">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.DASHBOARD ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <Home size={24} />
            <span className="text-[10px] font-medium mt-1">Start</span>
          </button>
          
          <button 
             onClick={() => setCurrentView(View.SUMMARY)}
             className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.SUMMARY ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <FileText size={24} />
            <span className="text-[10px] font-medium mt-1">Raport</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.LOCATIONS)}
            className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.LOCATIONS ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <MapPin size={24} />
            <span className="text-[10px] font-medium mt-1">Baza</span>
          </button>

          <button 
            onClick={() => setCurrentView(View.SETTINGS)}
            className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.SETTINGS ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <SettingsIcon size={24} />
            <span className="text-[10px] font-medium mt-1">Opcje</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;
