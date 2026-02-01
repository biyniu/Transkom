import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download, Phone } from 'lucide-react';

const InstallPrompt: React.FC = () => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // 1. Check if already installed (Standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) return;

    // 2. Check if user dismissed it previously
    const hasSeenPrompt = localStorage.getItem('kierowcapro_install_seen');
    if (hasSeenPrompt) return;

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // 4. Capture native install event (Android/Desktop)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    });

    // If iOS, show prompt immediately (since no beforeinstallprompt event exists there)
    if (isIosDevice) {
        // Slight delay for better UX
        setTimeout(() => setShowPrompt(true), 2000);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('kierowcapro_install_seen', 'true');
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    }
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative animate-slide-up sm:animate-none">
        
        {/* Header */}
        <div className="bg-primary p-4 text-white flex justify-between items-start">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                    <Download size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-lg">Zainstaluj aplikację</h3>
                    <p className="text-blue-100 text-xs">Działa offline i bez paska adresu</p>
                </div>
            </div>
            <button 
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white p-1"
            >
                <X size={24} />
            </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
            
            {isIOS ? (
                // iOS Instructions
                <div className="space-y-4">
                    <p className="text-slate-600 text-sm">
                        Aby zainstalować aplikację na iPhone/iPad, wykonaj te 2 proste kroki:
                    </p>
                    
                    <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-blue-500 mt-1">
                            <Share size={24} />
                        </div>
                        <div>
                            <span className="block font-bold text-slate-800 text-sm mb-1">Krok 1</span>
                            <p className="text-xs text-slate-500">
                                Kliknij ikonę <span className="font-bold">Udostępnij</span> na dolnym pasku przeglądarki Safari.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-slate-700 mt-1">
                            <PlusSquare size={24} />
                        </div>
                        <div>
                            <span className="block font-bold text-slate-800 text-sm mb-1">Krok 2</span>
                            <p className="text-xs text-slate-500">
                                Przewiń listę w dół i wybierz opcję <span className="font-bold">Do ekranu początkowego</span>.
                            </p>
                        </div>
                    </div>
                </div>
            ) : (
                // Android / Other Instructions
                <div className="text-center space-y-4">
                    <p className="text-slate-600 text-sm">
                        Zainstaluj aplikację, aby mieć do niej szybki dostęp prosto z pulpitu i korzystać z niej nawet bez internetu.
                    </p>
                    <button 
                        onClick={handleInstallClick}
                        className="w-full bg-primary text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2"
                    >
                        <Download size={20} /> Zainstaluj teraz
                    </button>
                </div>
            )}

            <button 
                onClick={handleDismiss}
                className="w-full text-slate-400 text-xs font-medium hover:text-slate-600 py-2"
            >
                Nie teraz, będę używać w przeglądarce
            </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;