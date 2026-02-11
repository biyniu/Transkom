
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus, User, Users, Key, RefreshCw, AlertCircle } from 'lucide-react';
import { Driver } from '../types';
import * as StorageService from '../services/storage';
import * as ApiService from '../services/api';

const DriversManager: React.FC = () => {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverCode, setNewDriverCode] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // CRITICAL FIX: Always fetch latest drivers from cloud when opening manager.
    refreshDrivers();
  }, []);

  const refreshDrivers = async () => {
      setIsLoading(true);
      // 1. Load what we have locally instantly
      setDrivers(StorageService.getDrivers());

      // 2. Fetch from cloud
      try {
        const cloudDrivers = await ApiService.fetchDrivers();
        if (cloudDrivers && cloudDrivers.length > 0) {
            StorageService.saveDrivers(cloudDrivers, false); // Update local, don't sync back yet
            setDrivers(cloudDrivers);
        }
      } catch (e) {
          console.warn("Could not refresh drivers from cloud", e);
      } finally {
        setIsLoading(false);
      }
  };

  const handleAdd = async () => {
    if (!newDriverName.trim() || !newDriverCode.trim()) {
        setMessage('Wpisz imię i kod!');
        setTimeout(() => setMessage(''), 3000);
        return;
    }

    // Refresh one last time to be safe before writing
    const currentDrivers = drivers; 

    // Check if code exists
    if (currentDrivers.some(d => d.code === newDriverCode.trim())) {
        setMessage('Ten kod jest już zajęty!');
        setTimeout(() => setMessage(''), 3000);
        return;
    }

    // Create a safe ID from name
    const id = newDriverName.trim().toUpperCase().replace(/\s+/g, '_');
    
    // Check if ID exists
    if (currentDrivers.some(d => d.id === id)) {
        setMessage('Taki kierowca już istnieje!');
        setTimeout(() => setMessage(''), 3000);
        return;
    }

    const updated = [...currentDrivers, { 
        id, 
        name: newDriverName.trim(), 
        code: newDriverCode.trim() 
    }];
    
    // Optimistic UI update
    setDrivers(updated);
    setNewDriverName('');
    setNewDriverCode('');
    setMessage('Dodawanie...');
    setIsLoading(true);

    // Save and Sync
    StorageService.saveDrivers(updated); // Sync is true by default here
    
    // Small delay to simulate network feeling
    setTimeout(() => {
        setMessage('Dodano kierowcę i wysłano do bazy');
        setIsLoading(false);
        setTimeout(() => setMessage(''), 3000);
    }, 500);
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno usunąć kierowcę z listy dostępu? (Jego dane historii pozostaną w arkuszu Google)')) {
      const updated = drivers.filter(d => d.id !== id);
      StorageService.saveDrivers(updated);
      setDrivers(updated);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Header */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-none flex justify-between items-center">
        <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} className="text-primary"/> Baza Kierowców
            </h2>
            <p className="text-xs text-slate-500">Dodaj osoby i nadaj im kody logowania.</p>
        </div>
        <button 
            onClick={refreshDrivers} 
            disabled={isLoading}
            className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-blue-600 active:scale-95 transition"
        >
            <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Message Toast */}
      {message && (
        <div className="absolute top-20 left-4 right-4 z-50 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg text-center text-sm font-bold shadow-md animate-fade-in">
          {message}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Warning about empty list */}
        {!isLoading && drivers.length === 0 && (
            <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 text-orange-800 text-xs flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <div>
                    <strong>Lista jest pusta.</strong> Jeśli w bazie Google są kierowcy, spróbuj odświeżyć przyciskiem u góry przed dodaniem nowego, aby uniknąć nadpisania bazy.
                </div>
            </div>
        )}

        {/* Add Form */}
        <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-md space-y-3 relative">
            {isLoading && <div className="absolute inset-0 bg-white/50 z-10" />}
            <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Imię i Nazwisko</label>
                <input 
                  type="text" 
                  placeholder="Np. Jan Kowalski" 
                  value={newDriverName}
                  onChange={e => setNewDriverName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                />
            </div>
            
            <div className="flex gap-2 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Kod Logowania (PIN)</label>
                    <input 
                      type="text" 
                      placeholder="Np. 1234" 
                      value={newDriverCode}
                      onChange={e => setNewDriverCode(e.target.value)}
                      className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50 font-mono tracking-widest font-bold"
                    />
                </div>
                <button 
                  onClick={handleAdd}
                  disabled={isLoading}
                  className="bg-blue-600 text-white h-[50px] px-6 rounded-lg font-bold hover:bg-blue-700 transition flex items-center shadow-sm disabled:opacity-50"
                >
                  <Plus size={24} />
                </button>
            </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {drivers.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
                {isLoading ? 'Pobieranie listy...' : 'Brak kierowców.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {drivers.map(d => (
                <li key={d.id} className="p-3 pl-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-full text-slate-500">
                        <User size={18} />
                    </div>
                    <div>
                        <div className="font-semibold text-slate-800 text-sm">{d.name}</div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Key size={10} /> Kod: <span className="font-bold text-slate-600 bg-slate-100 px-1 rounded">{d.code}</span>
                        </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(d.id)} 
                    className="p-2 text-slate-300 hover:text-danger hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriversManager;
