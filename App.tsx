
import { useState, useEffect } from 'react';
import { Home, PlusCircle, Settings as SettingsIcon, MapPin, FileText } from 'lucide-react';
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
    setIsLoading(true);
    try {
        // Pobierz lokalizacje z chmury
        const locations = await ApiService.fetchLocations();
        if (locations && locations.length > 0) {
            StorageService.saveLocations(locations, false);
        }

        // Pobierz dni pracy kierowcy
        const days = await ApiService.fetchDriverData(driverId);
        if (days && days.length > 0) {
            StorageService.saveWorkDays(days);
            setRefreshTrigger(prev => prev + 1);
        }
    } catch (e) {
        console.warn("Błąd inicjalizacji danych z chmury. Używam danych lokalnych.");
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
        StorageService.saveSettings(settings);
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

      {isLoading && (
        <div className="absolute inset-0 z-[60] bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-xs font-bold text-slate-500 animate-pulse uppercase tracking-widest">Synchronizacja z Firebase...</p>
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
