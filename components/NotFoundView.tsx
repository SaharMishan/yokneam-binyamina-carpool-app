
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { Map, NavigationOff, Home } from 'lucide-react';

interface NotFoundViewProps {
    onBack: () => void;
}

const NotFoundView: React.FC<NotFoundViewProps> = ({ onBack }) => {
    const { t } = useLocalization();

    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] p-6 text-center animate-fade-in">
            {/* Visual Container */}
            <div className="relative mb-8">
                {/* Floating Map Background */}
                <div className="absolute inset-0 bg-indigo-100 dark:bg-indigo-900/30 rounded-full blur-2xl animate-pulse"></div>
                
                {/* Main Icon Composition */}
                <div className="relative z-10 w-40 h-40 bg-white dark:bg-slate-800 rounded-3xl shadow-xl flex items-center justify-center border-4 border-slate-50 dark:border-slate-700 animate-float">
                    <div className="relative">
                        <Map size={80} className="text-slate-300 dark:text-slate-600" />
                        <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white p-3 rounded-xl shadow-lg border-4 border-white dark:border-slate-800 animate-bounce-slow">
                            <NavigationOff size={32} />
                        </div>
                    </div>
                </div>
                
                {/* Road Markings Decoration */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex gap-3">
                    <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="w-8 h-2 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                </div>
            </div>

            {/* Text Content */}
            <div className="space-y-3 max-w-md mx-auto relative z-10">
                <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-amber-500 tracking-tighter drop-shadow-sm">
                    404
                </h1>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {t('error_404_title')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {t('error_404_subtitle')}
                </p>
            </div>

            {/* Action Button */}
            <button 
                onClick={onBack}
                className="mt-10 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 group"
            >
                <Home size={20} className="group-hover:-translate-y-1 transition-transform" />
                <span>{t('back_home')}</span>
            </button>
        </div>
    );
};

export default NotFoundView;
