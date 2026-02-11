
// Fix: Import React to resolve 'Cannot find namespace React' error
import React, { useState, useEffect } from 'react';
import { Home, PlusCircle, Settings as SettingsIcon, MapPin, FileText, CloudRain, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    const settings = StorageService.getSettings();
    if (settings.driverId) {
      setIsLoggedIn(true);
      initializeData(settings.driverId);
    }
  }, []);

  const initializeData = async (driverId: string) => {
    // 1. Zablokuj interfejs i zapisywanie do Firebase
    setIsLoading(true);
    StorageService.setInitialSyncing(true);
    
    console.log("App: Rozpoczęto inicjalizację danych dla:", driverId);
    
    try {
        // 2. Pobierz najnowsze lokalizacje
        const locations = await ApiService.fetchLocations();
        if (locations && locations.length > 0) {
            StorageService.saveLocations(locations, false);
        }

        // 3. Pobierz historię kursów kierowcy
        const days = await ApiService.fetchDriverData(driverId);
        
        // Zawsze zapisujemy to co przyszło z Firebase do localStorage
        // Nawet jeśli jest puste (sync=false zapobiega nadpisaniu chmury pustką)
        StorageService.saveWorkDays(days || [], false);
        
        console.log(`App: Pobrano ${days?.length || 0} dni z Firebase.`);
        
        // 4. Odśwież widok
        setRefreshTrigger(prev => prev + 1);
        
    } catch (e) {
        console.error("App: Błąd krytyczny podczas inicjalizacji danych:", e);
    } finally {
        // 5. Odblokuj wszystko
        StorageService.setInitialSyncing(false);
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
        StorageService.saveSettings(settings);
        // Czyścimy lokalne dni przy wylogowaniu
        StorageService.saveWorkDays([], false);
        setIsLoggedIn(false);
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

      {/* Overlay ładowania danych - blokuje interakcję dopóki historia nie spłynie */}
      {isLoading && (
        <div className="absolute inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 text-center">
            <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-slide-up">
                <Loader2 className="text-primary animate-spin" size={40} />
                <div>
                    <h3 className="font-bold text-lg">Pobieranie historii...</h3>
                    <p className="text-slate-500 text-sm">Synchronizuję dane z Twoim kontem</p>
                </div>
            </div>
        </div>
      )}

      {/* Pasek synchronizacji u góry */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 z-[60] bg-blue-600 text-white text-[10px] py-1 px-4 flex items-center justify-between animate-slide-down">
            <span className="font-bold uppercase tracking-widest flex items-center gap-2">
                <CloudRain size={12} className="animate-pulse"/> Ładowanie bazy danych...
            </span>
            <div className="h-1 w-24 bg-blue-800 rounded-full overflow-hidden">
                <div className="h-full bg-white animate-progress"></div>
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

      <style>{`
        @keyframes progress {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
        }
        .animate-progress {
            animation: progress 1.5s infinite linear;
        }
        @keyframes slide-down {
            from { transform: translateY(-100%); }
            to { transform: translateY(0); }
        }
        .animate-slide-down {
            animation: slide-down 0.3s ease-out;
        }
        @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
            animation: slide-up 0.4s ease-out;
        }
      `}</style>
    </div>
  );
};

export default App;
