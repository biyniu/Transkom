import React, { useState } from 'react';
import { Home, PlusCircle, Settings, MapPin, FileText } from 'lucide-react';
import Dashboard from './components/Dashboard';
import DayEditor from './components/DayEditor';
import LocationsManager from './components/LocationsManager';
import MonthlySummary from './components/MonthlySummary';

enum View {
  DASHBOARD = 'DASHBOARD',
  EDITOR = 'EDITOR',
  LOCATIONS = 'LOCATIONS',
  SUMMARY = 'SUMMARY'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
  const [editingDayId, setEditingDayId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleOpenEditor = (dayId?: string) => {
    setEditingDayId(dayId || null);
    setCurrentView(View.EDITOR);
  };

  const handleCloseEditor = () => {
    setCurrentView(View.DASHBOARD);
    setEditingDayId(null);
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-50 text-slate-900 font-sans overflow-hidden">
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
          <LocationsManager />
        )}
        {currentView === View.SUMMARY && (
          <MonthlySummary />
        )}
      </main>

      {/* Bottom Navigation */}
      {currentView !== View.EDITOR && (
        <nav className="h-20 bg-white border-t border-slate-200 flex justify-around items-center px-2 pb-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 flex-none">
          <button 
            onClick={() => setCurrentView(View.DASHBOARD)}
            className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.DASHBOARD ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <Home size={24} />
            <span className="text-xs font-medium mt-1">Start</span>
          </button>
          
          <button 
             onClick={() => setCurrentView(View.SUMMARY)}
             className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.SUMMARY ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <FileText size={24} />
            <span className="text-xs font-medium mt-1">Raport</span>
          </button>

          <button 
            onClick={() => handleOpenEditor()}
            className="flex flex-col items-center justify-center -mt-8 bg-primary text-white rounded-full w-14 h-14 shadow-lg shadow-blue-300 active:scale-95 transition-transform"
          >
            <PlusCircle size={32} />
          </button>

          <button 
            onClick={() => setCurrentView(View.LOCATIONS)}
            className={`flex flex-col items-center p-2 rounded-xl transition ${currentView === View.LOCATIONS ? 'text-primary bg-blue-50' : 'text-slate-400'}`}
          >
            <MapPin size={24} />
            <span className="text-xs font-medium mt-1">Baza</span>
          </button>
        </nav>
      )}
    </div>
  );
};

export default App;