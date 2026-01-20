
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { dbInstance } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Compass, Users, Car, Leaf, Search, UserPlus, MapPin, MessageCircle } from 'lucide-react';

const AboutView = () => {
    const { t } = useLocalization();
    const [stats, setStats] = useState({ users: 0, trips: 0 });

    useEffect(() => {
        const unsubUsers = onSnapshot(collection(dbInstance, 'users'), (snap) => {
            setStats(prev => ({ ...prev, users: snap.size }));
        });
        const unsubTrips = onSnapshot(collection(dbInstance, 'trips'), (snap) => {
            setStats(prev => ({ ...prev, trips: snap.size }));
        });
        return () => { unsubUsers(); unsubTrips(); };
    }, []);

    const StepCard: React.FC<{ icon: React.ElementType, title: string, desc: string, step: number }> = ({ icon: Icon, title, desc, step }) => (
        <div className="relative bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center group hover:shadow-md transition-all">
            <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-black text-sm shadow-md border-2 border-white dark:border-slate-800 z-10">
                {step}
            </div>
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 group-hover:scale-110 transition-transform duration-300">
                <Icon size={24} />
            </div>
            <h4 className="font-bold text-slate-800 dark:text-white mb-1">{title}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
        </div>
    );

    const StatCard: React.FC<{ icon: React.ElementType, value: string | number, label: string, colorClass: string }> = ({ icon: Icon, value, label, colorClass }) => (
        <div className="flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm text-center">
            <div className={`p-2 rounded-full mb-2 ${colorClass} bg-opacity-10`}>
                <Icon size={20} className={colorClass.replace('bg-', 'text-')} />
            </div>
            <span className="text-2xl font-black text-slate-800 dark:text-white leading-none mb-1">{value}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-tight text-center max-w-[80px]">{label}</span>
        </div>
    );

    return (
        <div className="animate-fade-in space-y-8 pb-10 px-2 w-full">
            <div className="text-center py-6 relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-lg">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <div className="relative z-10 px-4">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-[10px] font-black uppercase tracking-widest mb-4">
                        <Compass size={12} />
                        {t('menu_about')}
                    </div>
                    <h2 className="text-3xl font-black mb-2 tracking-tight">{t('about_title')}</h2>
                    <p className="text-indigo-100 text-sm font-medium max-w-xs mx-auto opacity-90">{t('about_mission_desc')}</p>
                </div>
            </div>

            <div className="space-y-3">
                 <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2 border-r-4 border-indigo-500">{t('about_stats_title')}</h3>
                 <div className="grid grid-cols-3 gap-3">
                    <StatCard icon={Users} value={stats.users} label={t('stat_members')} colorClass="bg-blue-500" />
                    <StatCard icon={Car} value={stats.trips} label={t('stat_rides')} colorClass="bg-indigo-500" />
                    <StatCard icon={Leaf} value={Math.floor(stats.trips * 0.4)} label={t('stat_co2')} colorClass="bg-emerald-500" />
                 </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white px-2 border-r-4 border-indigo-500">{t('about_how_it_works')}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <StepCard icon={UserPlus} title={t('about_step_1_title')} desc={t('about_step_1_desc')} step={1} />
                    <StepCard icon={Search} title={t('about_step_2_title')} desc={t('about_step_2_desc')} step={2} />
                    <StepCard icon={MapPin} title={t('about_step_3_title')} desc={t('about_step_3_desc')} step={3} />
                </div>
            </div>

            <div className="bg-slate-900 rounded-3xl p-8 shadow-xl relative overflow-hidden text-center flex flex-col items-center">
                <div className="relative z-10 w-full">
                    <div className="w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white mb-4 shadow-lg mx-auto">
                        <MessageCircle size={32} />
                    </div>
                    <h3 className="text-xl font-black text-white mb-2">{t('about_contact_title')}</h3>
                    <p className="text-slate-400 font-bold text-sm mb-6 max-w-xs mx-auto">{t('about_contact_desc')}</p>
                    <a href="https://wa.me/972544553097" target="_blank" rel="noreferrer" className="w-full sm:w-auto px-8 py-3 bg-white hover:bg-slate-100 text-slate-900 font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
                        <MessageCircle size={16} className="text-[#25D366]" />
                        {t('contact_via_whatsapp')}
                    </a>
                </div>
            </div>

            <div className="text-center pt-2 pb-12 space-y-1 opacity-50">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">קארפול יקנעם-בנימינה • 2026</p>
                 <p className="text-[9px] font-bold text-slate-400 italic">© כל הזכויות שמורות לסהר מישן</p>
            </div>
        </div>
    );
};

export default AboutView;
