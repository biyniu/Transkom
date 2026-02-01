import React, { useState } from 'react';
import { Lock, ArrowLeft, MapPin, Users } from 'lucide-react';
import LocationsManager from './LocationsManager';
import DriversManager from './DriversManager';

interface AdminPanelProps {
    onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState<'LOCATIONS' | 'DRIVERS'>('LOCATIONS');

    const handleLogin = () => {
        if (password === 'admin123') {
            setIsAuthenticated(true);
            setError('');
        } else {
            setError('Błędne hasło');
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="absolute inset-0 z-50 bg-slate-800/90 backdrop-blur-sm flex items-center justify-center p-6">
                <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <Lock size={24} className="text-slate-800"/> Panel Admina
                        </h2>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                            <ArrowLeft size={20} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hasło dostępu</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-xl text-lg text-center"
                                autoFocus
                            />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                        <button 
                            onClick={handleLogin}
                            className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900"
                        >
                            Odblokuj
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 z-50 bg-white flex flex-col">
            <div className="bg-slate-800 text-white p-4 shadow-md flex-none">
                <div className="flex items-center justify-between mb-4">
                     <h2 className="font-bold flex items-center gap-2">
                        <Lock size={18} /> Administrator
                    </h2>
                    <button onClick={onClose} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition">
                        Zamknij
                    </button>
                </div>
                
                {/* Tabs */}
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('LOCATIONS')}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'LOCATIONS' ? 'bg-white text-slate-800' : 'bg-slate-700 text-slate-300'}`}
                    >
                        <MapPin size={16} /> Miejscowości
                    </button>
                    <button 
                         onClick={() => setActiveTab('DRIVERS')}
                         className={`flex-1 py-2 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'DRIVERS' ? 'bg-white text-slate-800' : 'bg-slate-700 text-slate-300'}`}
                    >
                        <Users size={16} /> Kierowcy
                    </button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {activeTab === 'LOCATIONS' ? <LocationsManager mode="ADMIN" /> : <DriversManager />}
            </div>
        </div>
    );
};

export default AdminPanel;