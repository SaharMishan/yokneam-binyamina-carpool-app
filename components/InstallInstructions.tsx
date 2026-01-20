
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { X, Smartphone, Monitor, Share, PlusSquare, Download, BellRing, CheckCircle2, Chrome, Globe, Laptop, HelpCircle } from 'lucide-react';
import Portal from './Portal';

interface InstallInstructionsProps {
    isOpen: boolean;
    onClose: () => void;
    onInstall: () => void;
    canInstallProgrammatically: boolean;
}

const InstallInstructions: React.FC<InstallInstructionsProps> = ({ isOpen, onClose, onInstall, canInstallProgrammatically }) => {
    const { t } = useLocalization();
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop'>('desktop');
    const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

    useEffect(() => {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        setIsAlreadyInstalled(isStandalone);

        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
        else if (/android/.test(userAgent)) setPlatform('android');
        else setPlatform('desktop');
    }, [isOpen]);

    if (!isOpen) return null;

    const StepItem = ({ num, text }: { num: number, text: string }) => (
        <div className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shrink-0 shadow-md">
                {num}
            </div>
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 text-start leading-relaxed">
                {text}
            </p>
        </div>
    );

    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-scale-in border border-white/10 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                    
                    <div className="p-6 bg-indigo-600 text-white flex justify-between items-center shrink-0 shadow-lg">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl"><Download size={24}/></div>
                            <h3 className="font-black text-xl">{t('install_title')}</h3>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-all active:scale-90"><X size={20}/></button>
                    </div>

                    <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide">
                        {isAlreadyInstalled ? (
                            <div className="text-center py-10 space-y-4">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-lg">
                                    <CheckCircle2 size={48} />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 dark:text-white">האפליקציה כבר מותקנת!</h4>
                                <p className="text-sm text-slate-500 font-bold px-6 leading-relaxed">אתם גולשים כעת בגרסה המותקנת ונהנים מחוויה מלאה.</p>
                                <button onClick={onClose} className="w-full py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl">מעולה, סגור</button>
                            </div>
                        ) : (
                            <>
                                <div className="text-center space-y-3 px-2">
                                    <p className="text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{t('install_subtitle')}</p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100 dark:border-amber-800">
                                        <BellRing size={12} /> תמיכה מלאה בהתראות Push
                                    </div>
                                </div>

                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[1.8rem] shadow-inner shrink-0">
                                    <button onClick={() => setPlatform('ios')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${platform === 'ios' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}><Smartphone size={14}/> iPhone</button>
                                    <button onClick={() => setPlatform('android')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${platform === 'android' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}><Smartphone size={14}/> Android</button>
                                    <button onClick={() => setPlatform('desktop')} className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 transition-all ${platform === 'desktop' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-md ring-1 ring-black/5' : 'text-slate-400'}`}><Laptop size={14}/> מחשב</button>
                                </div>

                                <div className="space-y-6 animate-fade-in" key={platform}>
                                    {platform === 'ios' && (
                                        <div className="space-y-4">
                                            <h4 className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest px-1">{t('install_ios_header')}</h4>
                                            <StepItem num={1} text={t('install_ios_step1')} />
                                            <StepItem num={2} text={t('install_ios_step2')} />
                                            <StepItem num={3} text={t('install_ios_step3')} />
                                        </div>
                                    )}

                                    {platform === 'android' && (
                                        <div className="space-y-4">
                                            <h4 className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest px-1">{t('install_android_header')}</h4>
                                            {canInstallProgrammatically ? (
                                                <button onClick={onInstall} className="w-full h-20 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl shadow-2xl flex items-center justify-center gap-4 transition-all text-xl mb-4">
                                                    <Download size={32} /> {t('install_android_btn')}
                                                </button>
                                            ) : (
                                                <>
                                                    <StepItem num={1} text={t('install_android_step1')} />
                                                    <StepItem num={2} text={t('install_android_step2')} />
                                                    <StepItem num={3} text={t('install_android_step3')} />
                                                </>
                                            )}
                                        </div>
                                    )}

                                    {platform === 'desktop' && (
                                        <div className="space-y-8">
                                            <h4 className="text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest px-1">{t('install_pc_header')}</h4>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Chrome size={18} className="text-blue-500" />
                                                    <span className="font-black text-sm text-slate-800 dark:text-white">{t('install_pc_chrome_title')}</span>
                                                </div>
                                                <StepItem num={1} text={t('install_pc_chrome_step')} />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <Globe size={18} className="text-indigo-500" />
                                                    <span className="font-black text-sm text-slate-800 dark:text-white">{t('install_pc_edge_title')}</span>
                                                </div>
                                                <StepItem num={1} text={t('install_pc_edge_step')} />
                                            </div>

                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <HelpCircle size={18} className="text-orange-500" />
                                                    <span className="font-black text-sm text-slate-800 dark:text-white">{t('install_pc_firefox_title')}</span>
                                                </div>
                                                <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-800 rounded-2xl">
                                                    <p className="text-xs font-bold text-orange-600 dark:text-orange-400 leading-relaxed">{t('install_pc_firefox_step')}</p>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-3">
                                                <Monitor size={20} className="text-indigo-600 shrink-0" />
                                                <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-300 leading-tight">{t('install_pc_generic_step')}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <button onClick={onClose} className="w-full py-4 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black rounded-2xl hover:bg-slate-300 transition-all uppercase tracking-widest">{t('confirm')}</button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default InstallInstructions;
