import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus, Download, Upload, Save, X, Edit2, Database } from 'lucide-react';
import { LocationRate } from '../types';
import * as StorageService from '../services/storage';

const LocationsManager: React.FC = () => {
  const [locations, setLocations] = useState<LocationRate[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', rate: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLocations(StorageService.getLocations());
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: '', rate: '' });
    setIsFormOpen(true);
  };

  const openEditForm = (loc: LocationRate) => {
    setEditingId(loc.id);
    setFormData({ name: loc.name, rate: loc.rate.toString() });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
    setFormData({ name: '', rate: '' });
  };

  const handleSave = () => {
    if (!formData.name || !formData.rate) return;
    const rate = parseFloat(formData.rate.replace(',', '.'));
    if (isNaN(rate)) return;

    let updatedLocations: LocationRate[];

    if (editingId) {
      // Update existing
      updatedLocations = locations.map(loc => 
        loc.id === editingId ? { ...loc, name: formData.name, rate } : loc
      );
      setMessage('Zaktualizowano miejscowość');
    } else {
      // Add new
      updatedLocations = [...locations, { id: uuidv4(), name: formData.name, rate }];
      setMessage('Dodano nową miejscowość');
    }

    StorageService.saveLocations(updatedLocations);
    setLocations(updatedLocations);
    closeForm();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (confirm('Czy na pewno usunąć tę miejscowość?')) {
      const updated = locations.filter(l => l.id !== id);
      StorageService.saveLocations(updated);
      setLocations(updated);
    }
  };

  const handleExport = () => {
    StorageService.exportData();
    setMessage('Baza została zapisana do pliku!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await StorageService.importData(e.target.files[0]);
      if (success) {
        setLocations(StorageService.getLocations());
        setMessage('Baza wczytana pomyślnie!');
      } else {
        setMessage('Błąd importu pliku!');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* 1. FIXED HEADER */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-none">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Database size={20} className="text-primary"/> Baza Miejscowości
            </h2>
            <p className="text-xs text-slate-500">Ilość pozycji: {locations.length}</p>
          </div>
          
          <button 
            onClick={openAddForm}
            className="bg-primary text-white px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition active:scale-95 text-sm font-medium"
          >
            <Plus size={16} /> Dodaj
          </button>
        </div>
      </div>

      {/* Message Toast */}
      {message && (
        <div className="absolute top-20 left-4 right-4 z-50 p-3 bg-green-100 text-green-800 border border-green-200 rounded-lg text-center text-sm font-bold shadow-md animate-fade-in">
          {message}
        </div>
      )}

      {/* 2. SCROLLABLE LIST AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        
        {/* Add/Edit Form (Inline in scroll area) */}
        {isFormOpen && (
          <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-md animate-fade-in mb-4">
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-blue-800">
                {editingId ? 'Edytuj wpis' : 'Nowy wpis'}
              </h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa miejscowości</label>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Np. Katowice Centrum" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none bg-slate-50"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Stawka (zł/t)</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="0.00" 
                  value={formData.rate}
                  onChange={e => setFormData({...formData, rate: e.target.value})}
                  className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none font-mono bg-slate-50"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button 
                  onClick={handleSave} 
                  className="bg-blue-600 text-white w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-blue-700 active:scale-95 transition-transform shadow-sm"
                >
                  <Save size={18} /> Zapisz zmiany
                </button>
              </div>
            </div>
          </div>
        )}

        {/* The List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {locations.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Brak dodanych miejscowości.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {locations.map(loc => (
                <li key={loc.id} className="p-3 pl-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex-1 pr-2">
                    <div className="font-semibold text-slate-800 text-sm leading-tight">{loc.name}</div>
                    <div className="text-xs text-slate-400 mt-1">
                      Stawka: <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{loc.rate.toFixed(2)} zł</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => openEditForm(loc)} 
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(loc.id)} 
                      className="p-2 text-slate-400 hover:text-danger hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. FIXED FOOTER (Import/Export) */}
      <div className="bg-white p-3 border-t border-slate-200 z-10 flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 tracking-wider text-center">Kopia Zapasowa (Import / Export)</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={handleExport} className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition text-slate-700">
            <Download size={18} className="text-slate-500" />
            <span className="text-sm font-bold">Zapisz Bazę</span>
          </button>
          
          <label className="flex items-center justify-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition cursor-pointer text-slate-700">
            <Upload size={18} className="text-slate-500" />
            <span className="text-sm font-bold">Wczytaj Bazę</span>
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

    </div>
  );
};

export default LocationsManager;