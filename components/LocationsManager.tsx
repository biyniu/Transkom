
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Trash2, Plus, Download, Upload, Save, X, Edit2, Database, Lock, Info, TableProperties, RefreshCw, FileSpreadsheet, FileJson } from 'lucide-react';
import { LocationRate } from '../types';
import * as StorageService from '../services/storage';
import * as XLSX from 'xlsx';

interface LocationsManagerProps {
    mode?: 'ADMIN' | 'DRIVER';
}

const RATE_TABLE_DATA = [
  { min: 6, max: 12, rate: '1,1' },
  { min: 12, max: 15, rate: '1,2' },
  { min: 16, max: 18, rate: '1,3' },
  { min: 22, max: 25, rate: '1,4' },
  { min: 26, max: 30, rate: '1,5' },
  { min: 32, max: 35, rate: '1,65' },
  { min: 36, max: 40, rate: '1,75' },
  { min: 42, max: 45, rate: '1,9' },
  { min: 48, max: 50, rate: '2,05' },
  { min: 51, max: 55, rate: '2,2' },
  { min: 57, max: 60, rate: '2,3' },
  { min: 64, max: 65, rate: '2,45' },
  { min: 64, max: 64, rate: '2,46' },
  { min: 65, max: 65, rate: '2,1' },
  { min: 67, max: 70, rate: '2,6' },
  { min: 71, max: 75, rate: '2,75' },
  { min: 76, max: 80, rate: '2,85' },
  { min: 85, max: 85, rate: '3' },
  { min: 89, max: 90, rate: '3,15' },
  { min: 92, max: 92, rate: '3,3' },
  { min: 105, max: 105, rate: '3,55' },
  { min: 110, max: 110, rate: '3,7' },
  { min: 115, max: 115, rate: '3,85' },
  { min: 122, max: 122, rate: '4' },
  { min: 130, max: 130, rate: '4,2' },
  { min: 160, max: 160, rate: '4,8' },
];

const LocationsManager: React.FC<LocationsManagerProps> = ({ mode = 'ADMIN' }) => {
  const [locations, setLocations] = useState<LocationRate[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', rate: '' });
  const [message, setMessage] = useState('');
  
  // State for tabs in the Add Form
  const [infoTab, setInfoTab] = useState<'RULES' | 'TABLE'>('RULES');

  useEffect(() => {
    setLocations(StorageService.getLocations());
  }, []);

  const openAddForm = () => {
    setEditingId(null);
    setFormData({ name: '', rate: '' });
    setInfoTab('RULES'); // Reset to rules by default
    setIsFormOpen(true);
  };

  const openEditForm = (loc: LocationRate) => {
    if (mode !== 'ADMIN') return;
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
      updatedLocations = locations.map(loc => 
        loc.id === editingId ? { ...loc, name: formData.name, rate } : loc
      );
      setMessage('Zaktualizowano miejscowość');
    } else {
      updatedLocations = [...locations, { id: uuidv4(), name: formData.name, rate }];
      setMessage('Dodano nową miejscowość');
    }

    StorageService.saveLocations(updatedLocations);
    setLocations(updatedLocations);
    closeForm();
    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (id: string) => {
    if (mode !== 'ADMIN') return;
    if (confirm('Czy na pewno usunąć tę miejscowość?')) {
      const updated = locations.filter(l => l.id !== id);
      StorageService.saveLocations(updated);
      setLocations(updated);
    }
  };

  const handleExport = () => {
    StorageService.exportData();
    setMessage('Baza zapisana do JSON!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await StorageService.importData(e.target.files[0]);
      if (success) {
        setLocations(StorageService.getLocations());
        setMessage('Baza wczytana pomyślnie!');
      } else {
        setMessage('Błąd importu pliku JSON!');
      }
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        if (data.length < 2) {
          setMessage('Plik Excel wydaje się pusty.');
          return;
        }

        // Find headers
        const headers = data[0].map(h => String(h).toLowerCase());
        const nameIdx = headers.findIndex(h => h.includes('miejscow') || h.includes('nazwa') || h.includes('cel') || h.includes('name'));
        const rateIdx = headers.findIndex(h => h.includes('stawk') || h.includes('cena') || h.includes('przelicz') || h.includes('rate'));

        if (nameIdx === -1 || rateIdx === -1) {
          setMessage('Nie znaleziono kolumn: "Nazwa" i "Stawka". Sprawdź nagłówki w Excelu.');
          return;
        }

        const newLocations: LocationRate[] = [];
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          const name = row[nameIdx];
          const rawRate = row[rateIdx];
          
          if (name && rawRate !== undefined) {
            const rate = typeof rawRate === 'string' ? parseFloat(rawRate.replace(',', '.')) : parseFloat(rawRate);
            if (!isNaN(rate)) {
              newLocations.push({
                id: uuidv4(),
                name: String(name).trim(),
                rate: rate
              });
            }
          }
        }

        if (newLocations.length > 0) {
            if (confirm(`Znaleziono ${newLocations.length} miejscowości. Czy chcesz je DOŁĄCZYĆ do obecnej bazy? (Anuluj aby zastąpić całą bazę)`)) {
                const combined = [...locations, ...newLocations];
                StorageService.saveLocations(combined);
                setLocations(combined);
            } else {
                StorageService.saveLocations(newLocations);
                setLocations(newLocations);
            }
            setMessage(`Zaimportowano ${newLocations.length} pozycji z Excela!`);
        } else {
          setMessage('Nie udało się zaimportować żadnych danych.');
        }

      } catch (error) {
        console.error(error);
        setMessage('Błąd podczas odczytu pliku Excel.');
      }
      setTimeout(() => setMessage(''), 3000);
      e.target.value = ''; // Reset input
    };

    reader.readAsBinaryString(file);
  };

  const handleGlobalRateRefresh = () => {
    if (confirm("Czy na pewno chcesz zaktualizować stawki i nazwy we WSZYSTKICH kursach z obecnego i poprzedniego miesiąca?")) {
        const count = StorageService.updateRecentHistoryRates();
        if (count > 0) {
            setMessage(`Zaktualizowano ${count} dni pracy!`);
        } else {
            setMessage('Wszystkie dni są już aktualne.');
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
          
          <div className="flex gap-2">
            {mode === 'ADMIN' && (
                <button 
                  onClick={handleGlobalRateRefresh}
                  className="bg-indigo-100 text-indigo-700 px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-indigo-200 transition active:scale-95 text-xs font-bold"
                  title="Odśwież stawki (Obecny i Poprzedni miesiąc)"
                >
                  <RefreshCw size={16} /> 
                  <span className="hidden sm:inline">Aktualizuj Kursy</span>
                </button>
            )}

            <button 
              onClick={openAddForm}
              className="bg-primary text-white px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm hover:bg-blue-700 transition active:scale-95 text-xs font-bold"
            >
              <Plus size={16} /> Dodaj Nowy
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className="absolute top-20 left-4 right-4 z-50 p-3 bg-blue-600 text-white rounded-lg text-center text-sm font-bold shadow-xl animate-fade-in ring-4 ring-blue-100">
          {message}
        </div>
      )}

      {/* 2. SCROLLABLE LIST AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        
        {isFormOpen && (
          <div className="bg-white p-4 rounded-xl border-2 border-blue-100 shadow-md animate-fade-in mb-4">
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-blue-800">
                {editingId ? 'Edytuj wpis' : 'Nowy wpis do bazy'}
              </h3>
              <button onClick={closeForm} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {!editingId && (
              <div className="bg-slate-50 border border-blue-200 rounded-lg p-3 mb-4 space-y-3">
                 <div className="flex gap-2 border-b border-blue-200 pb-0">
                    <button 
                        onClick={() => setInfoTab('RULES')}
                        className={`flex-1 py-2 text-xs font-bold transition-all rounded-t-lg border-b-2 ${infoTab === 'RULES' ? 'bg-blue-100 text-blue-800 border-blue-600' : 'text-blue-600 border-transparent hover:bg-blue-50'}`}
                    >
                        <span className="flex items-center justify-center gap-1"><Info size={14}/> Zasady</span>
                    </button>
                    <button 
                        onClick={() => setInfoTab('TABLE')}
                        className={`flex-1 py-2 text-xs font-bold transition-all rounded-t-lg border-b-2 ${infoTab === 'TABLE' ? 'bg-green-100 text-green-800 border-green-600' : 'text-green-600 border-transparent hover:bg-green-50'}`}
                    >
                         <span className="flex items-center justify-center gap-1"><TableProperties size={14}/> Stawki km</span>
                    </button>
                 </div>

                 {infoTab === 'RULES' && (
                    <div className="text-xs text-slate-700 animate-fade-in bg-blue-50/50 p-2 rounded-b-lg">
                        <ul className="space-y-2 mt-2">
                            <li className="flex flex-col">
                                <span className="font-semibold text-slate-900">1. Szymiszów:</span>
                                <span>Cel i Firma (Np: Wrocław DROGBUD)</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-semibold text-slate-900">2. Poborszów:</span>
                                <span>Poborszów - Cel FIRMA (Np: Poborszów - Opole SANDMIX)</span>
                            </li>
                            <li className="flex flex-col">
                                <span className="font-semibold text-slate-900">3. Inne:</span>
                                <span>Start - Cel FIRMA</span>
                            </li>
                        </ul>
                    </div>
                 )}

                 {infoTab === 'TABLE' && (
                     <div className="animate-fade-in bg-green-50/50 p-2 rounded-b-lg">
                        <div className="max-h-48 overflow-y-auto rounded border border-green-200">
                            <table className="w-full text-xs">
                                <thead className="bg-green-100 text-green-800 font-bold sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <th className="p-2 border-b border-green-200 text-center">Dystans</th>
                                        <th className="p-2 border-b border-green-200 text-center">Stawka</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-green-100 bg-white">
                                    {RATE_TABLE_DATA.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-green-50">
                                            <td className="p-2 text-center text-slate-600">{row.min} - {row.max} km</td>
                                            <td className="p-2 text-center font-bold text-green-700">{row.rate}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                     </div>
                 )}
              </div>
            )}
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nazwa miejscowości / Firmy</label>
                <input 
                  type="text" 
                  autoFocus={!editingId} 
                  placeholder="Np. Wrocław DROGBUD" 
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
              <button 
                onClick={handleSave} 
                className="bg-blue-600 text-white w-full py-3 rounded-lg flex items-center justify-center gap-2 font-bold hover:bg-blue-700 active:scale-95 transition-transform"
              >
                <Save size={18} /> Zapisz w Bazie
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          {locations.length === 0 ? (
            <div className="p-10 text-center text-slate-400">Brak danych. Skorzystaj z opcji Importu Excel poniżej.</div>
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
                  {mode === 'ADMIN' && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEditForm(loc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Edit2 size={18} /></button>
                        <button onClick={() => handleDelete(loc.id)} className="p-2 text-slate-400 hover:text-danger hover:bg-red-50 rounded-lg transition"><Trash2 size={18} /></button>
                      </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* 3. FIXED FOOTER (Excel / JSON Import) - ONLY FOR ADMIN */}
      {mode === 'ADMIN' && (
        <div className="bg-white p-3 border-t border-slate-200 z-10 flex-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-3 tracking-wider text-center">Narzędzia Importu i Kopii</h3>
            <div className="grid grid-cols-3 gap-2">
                
                {/* Excel Import */}
                <label className="flex flex-col items-center justify-center gap-1 p-2 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 active:bg-green-200 transition cursor-pointer text-green-700">
                    <FileSpreadsheet size={20} />
                    <span className="text-[10px] font-bold uppercase">Excel</span>
                    <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
                </label>

                {/* JSON Import */}
                <label className="flex flex-col items-center justify-center gap-1 p-2 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 active:bg-blue-200 transition cursor-pointer text-blue-700">
                    <FileJson size={20} />
                    <span className="text-[10px] font-bold uppercase">JSON</span>
                    <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>

                {/* Export JSON */}
                <button onClick={handleExport} className="flex flex-col items-center justify-center gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition text-slate-700">
                    <Download size={20} />
                    <span className="text-[10px] font-bold uppercase">Eksport</span>
                </button>

            </div>
            <div className="mt-2 text-[8px] text-center text-slate-400 italic">
                W Excelu wymagane nagłówki: "Nazwa" (lub Miejscowość) oraz "Stawka".
            </div>
        </div>
      )}

    </div>
  );
};

export default LocationsManager;
