import React, { useState, useEffect } from 'react';
import { Truck, Plus, Calendar, Edit2, Trash2, Check, FileCheck2, AlertCircle, Settings, X } from 'lucide-react';
import * as StorageService from '../services/storage';
import { VehicleDocument } from '../types';
import { v4 as uuidv4 } from 'uuid';

const DEFAULT_DOCUMENTS = ['Przegląd samochodu', 'Przegląd naczepy', 'Tachograf', 'Ubezpieczenie'];

const Vehicle: React.FC = () => {
  const [documents, setDocuments] = useState<VehicleDocument[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNote, setEditNote] = useState('');
  
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNote, setNewNote] = useState('');

  // Plates settings state
  const [truckPlate, setTruckPlate] = useState('');
  const [trailerPlate, setTrailerPlate] = useState('');
  const [showPlatesModal, setShowPlatesModal] = useState(false);
  const [tempTruckPlate, setTempTruckPlate] = useState('');
  const [tempTrailerPlate, setTempTrailerPlate] = useState('');

  useEffect(() => {
    setDocuments(StorageService.getDocuments());
    const settings = StorageService.getSettings();
    setTruckPlate(settings.truckPlate || '');
    setTrailerPlate(settings.trailerPlate || '');
  }, []);

  const handleSaveDoc = (docs: VehicleDocument[]) => {
    setDocuments(docs);
    StorageService.saveDocuments(docs);
  };

  const openPlatesModal = () => {
    setTempTruckPlate(truckPlate);
    setTempTrailerPlate(trailerPlate);
    setShowPlatesModal(true);
  };

  const savePlates = () => {
    const currentSettings = StorageService.getSettings();
    const updated = {
      ...currentSettings,
      truckPlate: tempTruckPlate.trim(),
      trailerPlate: tempTrailerPlate.trim()
    };
    StorageService.saveSettings(updated);
    setTruckPlate(tempTruckPlate.trim());
    setTrailerPlate(tempTrailerPlate.trim());
    setShowPlatesModal(false);
  };

  const startEdit = (doc: VehicleDocument) => {
    setEditingId(doc.id);
    setEditName(doc.name);
    setEditDate(doc.expiryDate);
    setEditNote(doc.note || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditDate('');
    setEditNote('');
  };

  const saveEdit = () => {
    if (!editName.trim()) return;
    const updated = documents.map(d => 
      d.id === editingId ? { ...d, name: editName.trim(), expiryDate: editDate, note: editNote.trim() } : d
    );
    handleSaveDoc(updated);
    cancelEdit();
  };

  const addDoc = () => {
    if (!newName.trim()) return;
    const newDoc: VehicleDocument = {
      id: uuidv4(),
      name: newName.trim(),
      expiryDate: newDate,
      note: newNote.trim()
    };
    handleSaveDoc([...documents, newDoc]);
    setNewName('');
    setNewDate('');
    setNewNote('');
    setShowAdd(false);
  };

  const removeDoc = (id: string) => {
    if (confirm('Czy na pewno chcesz usunąć ten dokument?')) {
      const updated = documents.filter(d => d.id !== id);
      handleSaveDoc(updated);
    }
  };

  const getStatusColor = (dateStr: string) => {
    if (!dateStr) return 'text-slate-400 bg-slate-100 border-slate-200';
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(dateStr);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'text-red-700 bg-red-100 border-red-200';
    if (diffDays <= 30) return 'text-amber-700 bg-amber-100 border-amber-200';
    return 'text-green-700 bg-green-100 border-green-200';
  };

  const getStatusIcon = (dateStr: string) => {
    if (!dateStr) return <Calendar size={16} />;
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(dateStr);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return <AlertCircle size={16} />;
    if (diffDays <= 30) return <AlertCircle size={16} />;
    return <FileCheck2 size={16} />;
  };

  const getDaysText = (dateStr: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0,0,0,0);
    const expDate = new Date(dateStr);
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      const absDays = Math.abs(diffDays);
      return `(po terminie: ${absDays} ${absDays === 1 ? 'dzień' : 'dni'})`;
    }
    if (diffDays === 0) {
      return `(dzisiaj)`;
    }
    if (diffDays === 1) {
      return `(został 1 dzień)`;
    }
    return `(zostały ${diffDays} dni)`;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* FIXED HEADER WITH VEHICLE REGISTRATION NUMBERS & SETTINGS BUTTON */}
      <div className="bg-white p-4 shadow-sm border-b border-slate-200 z-10 flex-none flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Truck size={20} className="text-primary"/> Pojazd
          </h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 font-medium mt-0.5">
            <span><strong className="text-slate-700">Samochód:</strong> {truckPlate || 'Brak'}</span>
            <span className="text-slate-300">|</span>
            <span><strong className="text-slate-700">Naczepa:</strong> {trailerPlate || 'Brak'}</span>
          </div>
        </div>

        <button 
          onClick={openPlatesModal}
          title="Ustawienia numerów rejestracyjnych"
          className="bg-slate-100 text-slate-700 hover:bg-slate-200 p-2.5 rounded-xl flex items-center justify-center shadow-sm transition active:scale-95 border border-slate-200"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* MODAL FOR EDITING TRUCK & TRAILER REGISTRATION PLATES */}
      {showPlatesModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4 relative">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Settings size={18} className="text-primary" /> Numery Rejestracyjne
              </h3>
              <button 
                onClick={() => setShowPlatesModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nr Rejestracyjny Samochodu
                </label>
                <input 
                  type="text"
                  value={tempTruckPlate}
                  onChange={e => setTempTruckPlate(e.target.value)}
                  placeholder="np. SK 12345"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Nr Rejestracyjny Naczepy
                </label>
                <input 
                  type="text"
                  value={tempTrailerPlate}
                  onChange={e => setTempTrailerPlate(e.target.value)}
                  placeholder="np. SK 67890"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-semibold uppercase text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button 
                onClick={() => setShowPlatesModal(false)}
                className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl text-xs transition"
              >
                Anuluj
              </button>
              <button 
                onClick={savePlates}
                className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition flex items-center gap-1.5 text-xs"
              >
                <Check size={16} /> Zapisz
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {documents.map(doc => {
            const isEditing = editingId === doc.id;
            const isDefault = DEFAULT_DOCUMENTS.includes(doc.name);

            if (isEditing) {
                return (
                    <div key={doc.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3 animate-fade-in">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwa</label>
                            <input 
                                type="text" 
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                placeholder="Nazwa dokumentu..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ważne do</label>
                            <input 
                                type="date" 
                                value={editDate}
                                onChange={e => setEditDate(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notatka (opcjonalnie)</label>
                            <input 
                                type="text" 
                                value={editNote}
                                onChange={e => setEditNote(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                                placeholder="Dodatkowe informacje..."
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button onClick={cancelEdit} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl text-xs transition">Anuluj</button>
                            <button onClick={saveEdit} className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition flex items-center gap-1.5 text-xs">
                                <Check size={16} /> Zapisz
                            </button>
                        </div>
                    </div>
                );
            }

            return (
                <div key={doc.id} className="bg-white px-4 pt-[5px] pb-[5px] mt-[10px] rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-blue-200 transition-all">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="font-bold text-slate-800 text-sm mb-1">{doc.name}</div>
                        {(doc.expiryDate || !doc.note) && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold ${getStatusColor(doc.expiryDate)}`}>
                                {getStatusIcon(doc.expiryDate)}
                                <span>{doc.expiryDate ? doc.expiryDate : 'Brak daty'}</span>
                                {doc.expiryDate && (
                                    <span className="font-semibold text-[11px] opacity-90 ml-0.5">
                                        {getDaysText(doc.expiryDate)}
                                    </span>
                                )}
                            </div>
                        )}
                        {doc.note && (
                            <div className="text-xs text-slate-600 font-normal mt-1.5 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                {doc.note}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(doc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                            <Edit2 size={18} />
                        </button>
                        {!isDefault && (
                            <button onClick={() => removeDoc(doc.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                <Trash2 size={18} />
                            </button>
                        )}
                    </div>
                </div>
            );
        })}

        {showAdd ? (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3 animate-fade-in">
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwa Nowej Kategorii</label>
                  <input 
                      type="text" 
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      placeholder="np. Gaśnica..."
                      autoFocus
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ważne do</label>
                  <input 
                      type="date" 
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  />
              </div>
              <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Notatka (opcjonalnie)</label>
                  <input 
                      type="text" 
                      value={newNote}
                      onChange={e => setNewNote(e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                      placeholder="np. Numer polisy, miejsce..."
                  />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                  <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl text-xs transition">Anuluj</button>
                  <button onClick={addDoc} className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition flex items-center gap-1.5 text-xs">
                      <Check size={16} /> Dodaj
                  </button>
              </div>
          </div>
        ) : (
            <button 
              onClick={() => setShowAdd(true)}
              className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 font-bold flex items-center justify-center gap-2 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all text-sm"
            >
                <Plus size={18} />
                Dodaj Nową Kategorię
            </button>
        )}
      </div>

    </div>
  );
};

export default Vehicle;
