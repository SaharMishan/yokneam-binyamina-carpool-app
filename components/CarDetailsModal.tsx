
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { X, Car, Save, Loader2, Palette, Hash } from 'lucide-react';
import Portal from './Portal';

interface CarDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const CarDetailsModal: React.FC<CarDetailsModalProps> = ({ isOpen, onClose }) => {
    const { user, updateProfile } = useAuth();
    const { t, dir } = useLocalization();
    const [model, setModel] = useState('');
    const [color, setColor] = useState('');
    const [plate, setPlate] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen && user?.carDetails) {
            setModel(user.carDetails.model || '');
            setColor(user.carDetails.color || '');
            setPlate(user.carDetails.plateNumber || '');
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateProfile({
                carDetails: {
                    model: model.trim(),
                    color: color.trim(),
                    plateNumber: plate.trim()
                }
            });
            onClose();
        } catch (error) {
            console.error(error);
            alert(t('error_generic'));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                        <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <Car size={20} className="text-indigo-600" />
                            {t('my_car_title')}
                        </h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all active:scale-90"><X size={20} /></button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('car_model')}</label>
                            <div className="relative">
                                <Car size={18} className={`absolute top-3.5 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                                <input 
                                    type="text" 
                                    value={model} 
                                    onChange={e => setModel(e.target.value)} 
                                    placeholder={t('car_model_placeholder')}
                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 dark:text-white`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('car_color')}</label>
                            <div className="relative">
                                <Palette size={18} className={`absolute top-3.5 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                                <input 
                                    type="text" 
                                    value={color} 
                                    onChange={e => setColor(e.target.value)} 
                                    placeholder={t('car_color_placeholder')}
                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 dark:text-white`}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">{t('car_plate')}</label>
                            <div className="relative">
                                <Hash size={18} className={`absolute top-3.5 ${dir === 'rtl' ? 'right-3.5' : 'left-3.5'} text-slate-400`} />
                                <input 
                                    type="text" 
                                    value={plate} 
                                    onChange={e => setPlate(e.target.value)} 
                                    placeholder={t('car_plate_placeholder')}
                                    className={`w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl py-3 ${dir === 'rtl' ? 'pr-10 pl-3' : 'pl-10 pr-3'} outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm text-slate-800 dark:text-white tracking-widest`}
                                    dir="ltr"
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button type="submit" disabled={isSaving} className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50">
                                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />} 
                                {t('profile_save')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </Portal>
    );
};

export default CarDetailsModal;
