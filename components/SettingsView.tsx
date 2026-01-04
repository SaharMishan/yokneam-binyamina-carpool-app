
import React, { useState } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { useAuth } from '../context/AuthContext';
import { Bell, Shield, Moon, Globe, Car, FileText, LogOut, ChevronRight } from 'lucide-react';
import CarDetailsModal from './CarDetailsModal';
import TermsModal from './TermsModal';

const SettingsView: React.FC = () => {
    const { t, isDarkMode, toggleTheme, language, toggleLanguage, dir } = useLocalization();
    const { user, updateProfile, signOut } = useAuth();
    
    const [notifications, setNotifications] = useState(user?.privacySettings?.notificationsEnabled ?? true);
    const [isPublic, setIsPublic] = useState(user?.privacySettings?.profileVisibility === 'public');
    
    // Modal states
    const [isCarModalOpen, setIsCarModalOpen] = useState(false);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

    const handleNotificationToggle = async () => {
        const newVal = !notifications;
        setNotifications(newVal);
        try {
            await updateProfile({ 
                privacySettings: { 
                    profileVisibility: isPublic ? 'public' : 'private', 
                    notificationsEnabled: newVal 
                } 
            });
        } catch (e) {
            setNotifications(!newVal); // Revert on error
            console.error(e);
        }
    };

    const handlePrivacyToggle = async () => {
        const newVal = !isPublic;
        setIsPublic(newVal);
         try {
            await updateProfile({ 
                privacySettings: { 
                    profileVisibility: newVal ? 'public' : 'private', 
                    notificationsEnabled: notifications 
                } 
            });
        } catch (e) {
            setIsPublic(!newVal); 
            console.error(e);
        }
    };

    const SettingItem: React.FC<{ icon: React.ElementType, title: string, desc: string, action?: React.ReactNode, onClick?: () => void }> = ({ icon: Icon, title, desc, action, onClick }) => (
        <div 
            onClick={onClick}
            className={`flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 ${onClick ? 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-700/50' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-300">
                    <Icon size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-slate-800 dark:text-white text-sm">{title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{desc}</p>
                </div>
            </div>
            <div>
                {action ? action : (onClick && (
                    dir === 'rtl' ? <ChevronRight className="text-slate-300 rotate-180" size={20} /> : <ChevronRight className="text-slate-300" size={20} />
                ))}
            </div>
        </div>
    );

    const Toggle: React.FC<{ checked: boolean, onChange: () => void }> = ({ checked, onChange }) => (
        <button 
            onClick={(e) => { e.stopPropagation(); onChange(); }}
            className={`w-11 h-6 rounded-full relative transition-colors duration-300 ${checked ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-600'}`}
        >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${checked ? (dir === 'rtl' ? '-translate-x-6' : 'translate-x-6') : (dir === 'rtl' ? '-translate-x-1' : 'translate-x-1')}`}></div>
        </button>
    );

    return (
        <div className="animate-fade-in space-y-6 w-full pb-8">
             <CarDetailsModal isOpen={isCarModalOpen} onClose={() => setIsCarModalOpen(false)} />
             <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />

             <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2 px-1">{t('settings_title')}</h2>
             
             <div className="space-y-3 w-full">
                 <SettingItem 
                    icon={Bell} 
                    title={t('settings_notifications')} 
                    desc={t('settings_notifications_desc')} 
                    action={<Toggle checked={notifications} onChange={handleNotificationToggle} />} 
                 />
                 
                 <SettingItem 
                    icon={Shield} 
                    title={t('settings_privacy')} 
                    desc={isPublic ? 'פרופיל ציבורי' : 'פרופיל פרטי'} 
                    action={<Toggle checked={isPublic} onChange={handlePrivacyToggle} />} 
                 />

                <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50 my-2"></div>

                 <SettingItem 
                    icon={Moon} 
                    title={t('settings_theme')} 
                    desc={isDarkMode ? 'מצב כהה' : 'מצב בהיר'} 
                    action={<Toggle checked={isDarkMode} onChange={toggleTheme} />} 
                 />

                 <SettingItem 
                    icon={Globe} 
                    title={t('settings_language')} 
                    desc={language === 'he' ? 'עברית' : 'English'} 
                    action={<button onClick={toggleLanguage} className="text-indigo-600 font-bold text-xs bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800">{language.toUpperCase()}</button>} 
                 />

                <div className="w-full h-px bg-slate-200 dark:bg-slate-700/50 my-2"></div>

                <SettingItem 
                    icon={Car}
                    title={t('my_car_title')}
                    desc={user?.carDetails ? `${user.carDetails.model} (${user.carDetails.plateNumber})` : 'ניהול פרטי רכב'}
                    onClick={() => setIsCarModalOpen(true)}
                />

                <SettingItem 
                    icon={FileText}
                    title={t('terms_title')}
                    desc="משפטי ופרטיות"
                    onClick={() => setIsTermsModalOpen(true)}
                />

                <button 
                    onClick={signOut}
                    className="w-full flex items-center justify-center gap-2 p-4 mt-6 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                >
                    <LogOut size={20} />
                    <span>{t('logout')}</span>
                </button>
                
                <p className="text-center text-xs text-slate-400 pt-4">גרסה 1.5.5</p>
             </div>
        </div>
    );
};

export default SettingsView;
