
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { X, Home, Calendar, User, Info, LogOut, ChevronRight, Settings, CarFront, ShieldCheck, Flag, Download } from 'lucide-react';
import BadgeDisplay from './BadgeDisplay';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    currentView: string;
    setView: (view: string) => void;
    isDesktop?: boolean;
    onOpenReport: () => void;
    onOpenInstall: () => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, currentView, setView, isDesktop = false, onOpenReport, onOpenInstall }) => {
    const { user, signOut } = useAuth();
    const { t, dir, language } = useLocalization();

    const handleNavigation = (view: string) => {
        setView(view);
        if (!isDesktop) onClose();
    };

    const handleReportClick = () => {
        onOpenReport();
        if (!isDesktop) onClose();
    };

    const handleInstallClick = () => {
        onOpenInstall();
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

    const InstallButton = () => (
        <button
            onClick={handleInstallClick}
            className="w-full flex items-center gap-4 p-3.5 rounded-xl transition-all duration-200 bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 active:scale-95 my-2"
        >
            <Download size={20} />
            <span className="text-sm uppercase tracking-wider">{t('menu_install')}</span>
        </button>
    );

    const UserProfileSection = () => {
        if (!user) return null;
        return (
            <button 
                onClick={() => handleNavigation('profile')}
                className="w-full flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 mt-4 hover:bg-indigo-50 dark:hover:bg-indigo-900/10 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all text-start group active:scale-[0.98] shadow-sm"
            >
                <div className="w-11 h-11 rounded-full bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden flex items-center justify-center text-indigo-600 dark:text-indigo-200 font-bold shadow-md border-2 border-white dark:border-slate-700 shrink-0 group-hover:scale-105 transition-transform">
                    {user.photoURL ? (
                        <img src={user.photoURL} alt={user.displayName || ''} className="w-full h-full object-cover" />
                    ) : (
                        user.displayName?.charAt(0).toUpperCase()
                    )}
                </div>
                <div className="flex flex-col overflow-hidden flex-1 min-w-0">
                    <span className="text-[13px] font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors leading-tight mb-1 break-words">
                        {language === 'en' && user.displayNameEn ? user.displayNameEn : user.displayName}
                    </span>
                    <div className="flex flex-col gap-1">
                        <BadgeDisplay userId={user.uid} size="sm" />
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tight">{user.phoneNumber}</span>
                    </div>
                </div>
                <div className="p-1.5 bg-slate-50 dark:bg-slate-700/50 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 transition-colors shrink-0">
                    {dir === 'rtl' ? <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600 rotate-180" /> : <ChevronRight size={14} className="text-slate-400 group-hover:text-indigo-600" />}
                </div>
            </button>
        );
    };

    if (isDesktop) {
        return (
             <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 pt-16">
                <div className="p-6 pb-2">
                    <InstallButton />
                    <UserProfileSection />
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
                    <div className="text-center mt-4 space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v1.8.5 • Yokneam-Binyamina</p>
                        <p className="text-[9px] font-bold text-slate-400 opacity-60">© All Rights Reserved to Sahar Mishan</p>
                    </div>
                </div>
             </div>
        );
    }

    if (!isOpen) return null;

    const drawerClasses = `relative w-[85%] max-w-xs bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${dir === 'rtl' ? 'animate-[slideRight_0.4s_cubic-bezier(0.32,0.72,0,1)]' : 'animate-[slideLeft_0.4s_cubic-bezier(0.32,0.72,0,1)]'}`;

    return (
        <div className="fixed inset-0 z-[100] flex md:hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] animate-fade-in" onClick={onClose}></div>
            
            <div dir={dir} className={drawerClasses}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 shrink-0">
                    <div className="flex items-center justify-between mb-8">
                        <div 
                            onClick={() => handleNavigation('home')} 
                            className="flex items-center gap-2.5 cursor-pointer active:opacity-80 transition-opacity min-w-0 flex-1"
                        >
                            <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-xl shadow-lg shrink-0">
                                <CarFront size={18} className="text-white" />
                            </div>
                            <h2 className="text-[15px] font-black text-slate-800 dark:text-white leading-tight tracking-tight whitespace-nowrap">
                                {t('app_title')}
                            </h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="p-2 bg-white dark:bg-slate-800 shadow-md rounded-full text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all border border-slate-100 dark:border-slate-700 shrink-0 active:scale-90 ml-2"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <InstallButton />

                    <UserProfileSection />
                </div>

                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 scrollbar-hide">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleNavigation(item.id)}
                            className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${
                                currentView === item.id
                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'
                            }`}
                        >
                            <item.icon size={22} className={currentView === item.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                            <span className="text base">{item.label}</span>
                            {dir === 'rtl' ? <ChevronRight size={18} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={18} className="ml-auto opacity-30" />}
                        </button>
                    ))}

                    <button onClick={handleReportClick} className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600 font-medium mt-4 border-t border-slate-100 dark:border-slate-800">
                        <Flag size={22} className="text-slate-400" />
                        <span className="text-base">{t('report_issue')}</span>
                    </button>

                    <button onClick={() => handleNavigation('about')} className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 ${currentView === 'about' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-medium'}`}>
                        <Info size={22} className={currentView === 'about' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"} />
                        <span className="text-base">{t('menu_about')}</span>
                        {dir === 'rtl' ? <ChevronRight size={18} className="mr-auto opacity-30 rotate-180" /> : <ChevronRight size={18} className="ml-auto opacity-30" />}
                    </button>
                </div>

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <button onClick={signOut} className="w-full flex items-center justify-center gap-2 p-3.5 text-red-600 dark:text-red-400 font-black bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-xl transition-all active:scale-95">
                        <LogOut size={20} />
                        <span>{t('logout')}</span>
                    </button>
                    <div className="text-center mt-4 space-y-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">v1.8.5 • Yokneam-Binyamina</p>
                        <p className="text-[9px] font-bold text-slate-400 opacity-60">© All Rights Reserved to Sahar Mishan</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SideMenu;
