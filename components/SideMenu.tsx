
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { X, Home, Calendar, User, Info, LogOut, ChevronRight, Settings, CarFront, ShieldCheck, Flag } from 'lucide-react';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: string;
    setView: (view: string) => void;
    isDesktop?: boolean;
    onOpenReport: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, currentView, setView, isDesktop = false, onOpenReport }) => {
    const { user, signOut } = useAuth();
    const { t, dir } = useLocalization();

    const handleNavigation = (view: string) => {
        setView(view);
        if (!isDesktop) onClose();
    };

    const handleReportClick = () => {
        onOpenReport();
        if (!isDesktop) onClose();
    };

    const menuItems = [
        { id: 'home', label: t('menu_home'), icon: Home },
        { id: 'schedule', label: t('menu_schedule'), icon: Calendar },
        { id: 'profile', label: t('menu_profile'), icon: User },
        { id: 'settings', label: t('menu_settings'), icon: Settings },
    ];

    if (user?.isAdmin) {
        menuItems.push({ id: 'admin', label: t('menu_admin'), icon: ShieldCheck });
    }

    if (isDesktop) {
        return (
             <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900">
                <div className="p-6 pb-2">
                     <div 
                        onClick={() => handleNavigation('home')}
                        className="flex items-center gap-3 mb-8 cursor-pointer group select-none"
                     >
                        <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-md group-hover:scale-105 transition-transform duration-300">
                             <CarFront size={24} className="text-white" />
                        </div>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {t('app_title')}
                        </h1>
                    </div>
                    {user && (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                             <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden flex items-center justify-center text-indigo-600 dark:text-indigo-200 font-bold shadow-md border-2 border-white dark:border-slate-700">
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                                ) : (
                                    user.displayName?.charAt(0).toUpperCase()
                                )}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.displayName}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.phoneNumber}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto px-4 space-y-2 mt-4 scrollbar-hide">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${
                                currentView === item.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                            }`}
                        >
                            <item.icon size={20} className={currentView === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                            <span className="text-base">{item.label}</span>
                            {dir === 'rtl' ? <ChevronRight size={16} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={16} className="ml-auto opacity-30" />}
                        </button>
                    ))}
                    
                    <button
                        onClick={handleReportClick}
                        className="w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 font-medium mt-4 border-t border-slate-100 dark:border-slate-800"
                    >
                        <Flag size={20} className="text-slate-400" />
                        <span className="text-base">{t('report_issue')}</span>
                    </button>

                    <button
                        onClick={() => handleNavigation('about')}
                        className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${
                            currentView === 'about'
                            ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                        }`}
                    >
                        <Info size={20} className={currentView === 'about' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                        <span className="text-base">{t('menu_about')}</span>
                        {dir === 'rtl' ? <ChevronRight size={16} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={16} className="ml-auto opacity-30" />}
                    </button>
                </div>

                 <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                    <button 
                        onClick={signOut}
                        className="w-full flex items-center justify-center gap-2 p-3 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    >
                        <LogOut size={20} />
                        <span>{t('logout')}</span>
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4">v1.5.0 • Yokneam-Binyamina</p>
                </div>
             </div>
        );
    }

    if (!isOpen) return null;

    // Custom cubic-bezier for a "cool" bouncy/smooth animation effect
    const drawerClasses = `relative w-4/5 max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${dir === 'rtl' ? 'animate-[slideRight_0.4s_cubic-bezier(0.32,0.72,0,1)]' : 'animate-[slideLeft_0.4s_cubic-bezier(0.32,0.72,0,1)]'}`;

    return (
        <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop: Darker, instant, with subtle blur to avoid white flash issues */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose}></div>
            
            <div dir={dir} className={drawerClasses}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <div className="flex justify-between items-center mb-6">
                        <div onClick={() => handleNavigation('home')} className="flex items-center gap-3 cursor-pointer active:opacity-80 transition-opacity">
                            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-md">
                                <CarFront size={18} className="text-white" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white leading-none">{t('app_title')}</h2>
                        </div>
                        <button onClick={onClose} className="p-2 bg-white dark:bg-slate-800 shadow-sm rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"><X size={20} /></button>
                    </div>
                    {user && (
                        <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                             <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden flex items-center justify-center text-indigo-600 dark:text-indigo-200 font-bold text-lg shadow-md border-2 border-white dark:border-slate-700">
                                {user.photoURL ? <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" /> : user.displayName?.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-sm font-bold text-slate-800 dark:text-white truncate">{user.displayName}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.phoneNumber}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${
                                currentView === item.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                            }`}
                        >
                            <item.icon size={22} className={currentView === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                            <span className="text-base">{item.label}</span>
                            {dir === 'rtl' ? <ChevronRight size={18} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={18} className="ml-auto opacity-30" />}
                        </button>
                    ))}

                    <button onClick={handleReportClick} className="w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 font-medium mt-4 border-t border-slate-100 dark:border-slate-800">
                        <Flag size={22} className="text-slate-400" />
                        <span className="text-base">{t('report_issue')}</span>
                    </button>

                    <button onClick={() => handleNavigation('about')} className={`w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 ${currentView === 'about' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'}`}>
                        <Info size={22} className={currentView === 'about' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                        <span className="text-base">{t('menu_about')}</span>
                        {dir === 'rtl' ? <ChevronRight size={18} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={18} className="ml-auto opacity-30" />}
                    </button>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 p-3.5 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                        <LogOut size={20} />
                        <span>{t('logout')}</span>
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4">v1.5.0 • Yokneam-Binyamina</p>
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
