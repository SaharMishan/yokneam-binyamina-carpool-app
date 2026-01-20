
import React, { useState, useEffect } from 'react';
import { X, Share, PlusSquare, Download, Bell, Smartphone } from 'lucide-react';
import { useLocalization } from '../context/LocalizationContext';

const InstallGuide: React.FC = () => {
    const { t } = useLocalization();
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        
        if (isStandalone) {
            setIsVisible(false);
            return;
        }

        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIOS = /iphone|ipad|ipod/.test(userAgent);
        const isAndroid = /android/.test(userAgent);

        if (isIOS) setPlatform('ios');
        else if (isAndroid) setPlatform('android');

        const handleBeforeInstallPrompt = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        if (isIOS) {
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleAndroidInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsVisible(false);
        }
        setDeferredPrompt(null);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-sm animate-slide-up">
            <div className="bg-slate-900 text-white rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
                <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Smartphone size={24} />
                            </div>
                            <div>
                                <h4 className="font-black text-sm leading-tight">{t('install_title')}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">לגישה מהירה וקבלת התראות</p>
                            </div>
                        </div>
                        <button onClick={() => setIsVisible(false)} className="p-1.5 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
                            <X size={16} />
                        </button>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 mb-4">
                        {platform === 'ios' ? (
                            <div className="space-y-3">
                                <p className="text-xs font-bold leading-relaxed">{t('install_subtitle')}</p>
                                <div className="flex items-center gap-3 text-xs">
                                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center shrink-0">
                                        <Share size={14} />
                                    </div>
                                    <span className="font-medium">{t('install_ios_step1')}</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <div className="w-6 h-6 bg-slate-700 rounded flex items-center justify-center shrink-0">
                                        <PlusSquare size={14} />
                                    </div>
                                    <span className="font-medium">{t('install_ios_step2')}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-xs font-bold leading-relaxed">{t('install_subtitle')}</p>
                                <button 
                                    onClick={handleAndroidInstall}
                                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    <Download size={18} /> {t('install_android_btn')}
                                </button>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-[9px] text-slate-500 font-black uppercase tracking-widest justify-center">
                        <Bell size={10} className="text-amber-500" />
                        <span>כולל תמיכה בהתראות Push בזמן אמת</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InstallGuide;
