
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { db } from '../services/firebase';
import { Direction, TripType, Trip } from '../types';
import { Timestamp } from 'firebase/firestore';
import { X, MapPin, ArrowLeft, ArrowRight, Car, UserCheck, AlertCircle, ChevronDown } from 'lucide-react';
import TimePickerModal from './TimePickerModal';
import DatePickerModal from './DatePickerModal';
import { motion, AnimatePresence } from 'motion/react';

interface PostTripSheetProps {
    isOpen: boolean;
    onClose: () => void;
    tripToEdit?: Trip | null;
}

const PostTripSheet: React.FC<PostTripSheetProps> = ({ isOpen, onClose, tripToEdit }) => {
    const { user } = useAuth();
    const { t, dir } = useLocalization();
    
    const getLocalDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const getCurrentTimeStr = () => {
        const now = new Date();
        const h = now.getHours().toString().padStart(2, '0');
        const m = now.getMinutes().toString().padStart(2, '0');
        return `${h}:${m}`;
    };

    const yokneamLocations = [
        'loc_big_yokneam', 'loc_g_center', 'loc_hitech_park', 'loc_megiddo_junction', 'loc_elyst_junction'
    ];
    const binyaminaLocations = [
        'loc_train_binyamina', 'loc_binyamina_carpool', 'loc_binyamina_ind'
    ];

    const [tripType, setTripType] = useState<TripType>(() => tripToEdit?.type || 'offer');
    const [direction, setDirection] = useState<Direction>(() => tripToEdit?.direction || Direction.YOKNEAM_TO_BINYAMINA);
    const [startDate, setStartDate] = useState(() => {
        if (tripToEdit?.departureTime) return getLocalDateStr(tripToEdit.departureTime.toDate());
        return getLocalDateStr(new Date());
    });
    const [departureTime, setDepartureTime] = useState(() => {
        if (tripToEdit?.departureTime) {
            const date = tripToEdit.departureTime.toDate();
            return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        }
        return getCurrentTimeStr();
    });
    const [availableSeats, setAvailableSeats] = useState(() => {
        if (tripToEdit) {
            const approved = tripToEdit.passengers?.filter(p => p.status === 'approved').length || 0;
            return tripToEdit.type === 'offer' ? tripToEdit.availableSeats + approved : tripToEdit.availableSeats;
        }
        return 3;
    });
    const [pickupLocation, setPickupLocation] = useState(() => tripToEdit?.pickupLocation || yokneamLocations[0]);
    const [isCustomMode, setIsCustomMode] = useState(() => {
        if (!tripToEdit?.pickupLocation) return false;
        const allLocs = [...yokneamLocations, ...binyaminaLocations];
        return !allLocs.includes(tripToEdit.pickupLocation);
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const isSubmittingRef = React.useRef(false);
    const [showErrors, setShowErrors] = useState(false);
    const [duplicateError, setDuplicateError] = useState<string | null>(null);

    useEffect(() => {
        setDuplicateError(null);
    }, [departureTime, startDate, direction, pickupLocation, tripType]);
    
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const displayDate = new Date(startDate).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });

    const commonLocations = direction === Direction.YOKNEAM_TO_BINYAMINA ? yokneamLocations : binyaminaLocations;
    
    const getApprovedCount = () => {
        if (!tripToEdit || !tripToEdit.passengers) return 0;
        return tripToEdit.passengers.filter(p => p.status === 'approved').length;
    };

    // Only handle direction changes when switching directions manually
    useEffect(() => {
        if (isOpen && !isCustomMode) {
            const locList = direction === Direction.YOKNEAM_TO_BINYAMINA ? yokneamLocations : binyaminaLocations;
            if (!locList.includes(pickupLocation)) {
                setPickupLocation(locList[0]);
            }
        }
    }, [direction]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingRef.current) return;
        setShowErrors(true);
        if (!user || !departureTime || !startDate || !pickupLocation.trim()) return;
        isSubmittingRef.current = true;
        setIsSubmitting(true);
        try {
            const [hours, minutes] = departureTime.split(':').map(Number);
            const tripDate = new Date(startDate);
            tripDate.setHours(hours, minutes, 0, 0);
            let finalAvailableSeats = availableSeats;
            if (tripType === 'offer' && tripToEdit && tripToEdit.id) finalAvailableSeats = availableSeats - getApprovedCount();
            
            const tripData = { 
                type: tripType, 
                driverId: user.uid, 
                driverName: user.displayName || t('guest'), 
                driverPhoto: user.photoURL || "", 
                direction, 
                departureTime: Timestamp.fromDate(tripDate), 
                availableSeats: Number(finalAvailableSeats), 
                pickupLocation: pickupLocation.trim(), 
                passengers: (tripToEdit && tripToEdit.id) ? tripToEdit.passengers : [] 
            };
            
            const isDuplicate = await db.checkDuplicateTrip(user.uid, tripType, direction, Timestamp.fromDate(tripDate), tripToEdit?.id);
            if (isDuplicate) {
                setDuplicateError(t('error_duplicate_trip'));
                setIsSubmitting(false);
                isSubmittingRef.current = false;
                return;
            }

            if (tripToEdit && tripToEdit.id) {
                await db.updateTrip(tripToEdit.id, tripData);
            } else {
                await db.addTrip(tripData as any);
            }
            onClose();
        } catch (error) { console.error(error); alert(t('error_generic')); } finally { setIsSubmitting(false); isSubmittingRef.current = false; }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-slate-900/40"
                    onClick={onClose}
                >
                    <TimePickerModal isOpen={isTimePickerOpen} onClose={() => setIsTimePickerOpen(false)} onSelect={setDepartureTime} initialTime={departureTime} />
                    <DatePickerModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onSelect={(d) => setStartDate(getLocalDateStr(d))} initialDate={new Date(startDate)} />

                    <motion.div 
                        initial={{ y: "100%", opacity: 0.5 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0.5 }}
                        transition={{ 
                            duration: 0.4,
                            ease: [0.32, 0.72, 0, 1]
                        }}
                        style={{ willChange: "transform" }}
                        className="w-full md:max-w-lg bg-white dark:bg-slate-900 rounded-t-[2rem] md:rounded-[2rem] shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.3)] h-[92dvh] md:h-auto md:max-h-[90dvh] flex flex-col overflow-hidden pb-safe relative z-10 transform-gpu" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle Indicator */}
                        <div className="w-full flex justify-center pt-3 pb-1 shrink-0">
                            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                        </div>

                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-50 dark:border-slate-800/50 shrink-0">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{tripToEdit?.id ? t('edit') : (tripType === 'offer' ? t('post_a_trip') : t('publish_request'))}</h2>
                            <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X size={20} /></button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 space-y-6 scrollbar-hide">
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                                <button type="button" onClick={() => setTripType('offer')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${tripType === 'offer' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500'}`}><Car size={18} /> {t('trip_type_offer')}</button>
                                <button type="button" onClick={() => setTripType('request')} className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-xs font-black uppercase transition-all ${tripType === 'request' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500'}`}><UserCheck size={18} /> {t('trip_type_request')}</button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setDirection(Direction.YOKNEAM_TO_BINYAMINA)} className={`p-4 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${direction === Direction.YOKNEAM_TO_BINYAMINA ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800'}`}><span className="text-[11px] font-black uppercase text-center leading-tight">{t('yokneam_to_binyamina')}</span></button>
                                <button type="button" onClick={() => setDirection(Direction.BINYAMINA_TO_YOKNEAM)} className={`p-4 rounded-[1.5rem] border-2 flex flex-col items-center justify-center gap-2 transition-all ${direction === Direction.BINYAMINA_TO_YOKNEAM ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600' : 'border-slate-100 dark:border-slate-800'}`}><span className="text-[11px] font-black uppercase text-center leading-tight">{t('binyamina_to_yokneam')}</span></button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('departure_time')}</label>
                                     <button type="button" onClick={() => setIsTimePickerOpen(true)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-2xl text-center text-slate-800 dark:text-white active:scale-95 transition-all">{departureTime}</button>
                                </div>
                                <div className="space-y-2">
                                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('departure_date')}</label>
                                     <button type="button" onClick={() => setIsDatePickerOpen(true)} className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-800 rounded-2xl font-black text-lg text-center text-slate-800 dark:text-white active:scale-95 transition-all tracking-tight">{displayDate}</button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tripType === 'offer' ? t('available_seats') : t('seats_needed')}</label>
                                <div className="flex gap-2">
                                    {[1,2,3,4].map(num => (
                                        <button key={num} type="button" onClick={() => setAvailableSeats(num)} className={`flex-1 py-4 rounded-2xl border-2 font-black text-xl transition-all ${availableSeats === num ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>{num}</button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tripType === 'offer' ? t('departure_point_offer') : t('departure_point_request')}</label>
                                 <div className="relative">
                                    <div className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} pointer-events-none z-10`}><MapPin className={`${pickupLocation || isCustomMode ? 'text-indigo-500' : 'text-slate-400'}`} size={20} /></div>
                                    <select value={isCustomMode ? 'loc_custom' : pickupLocation} onChange={(e) => { const val = e.target.value; if (val === 'loc_custom') { setIsCustomMode(true); setPickupLocation(''); } else { setIsCustomMode(false); setPickupLocation(val); } }} className={`w-full appearance-none p-4 ${dir === 'rtl' ? 'pr-11' : 'pl-11'} bg-slate-50 dark:bg-slate-800 border-2 ${showErrors && !pickupLocation ? 'border-red-500' : 'border-slate-100 dark:border-slate-800'} rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-colors cursor-pointer text-slate-800 dark:text-white`}>
                                        <option value="" disabled>{t('select_common_location')}</option>
                                        {commonLocations.map(loc => (<option key={loc} value={loc}>{t(loc)}</option>))}
                                        <option value="loc_custom">{t('loc_custom')}</option>
                                    </select>
                                    <div className={`absolute top-5 ${dir === 'rtl' ? 'left-4' : 'right-4'} pointer-events-none`}><ChevronDown size={18} className="text-slate-400" /></div>
                                    {isCustomMode && (
                                        <div className="relative animate-fade-in mt-3">
                                            <input type="text" value={pickupLocation} onChange={e => setPickupLocation(e.target.value)} placeholder={tripType === 'offer' ? t('pickup_placeholder_driver') : t('pickup_placeholder_passenger')} className={`w-full p-4 ${dir === 'rtl' ? 'pr-11' : 'pl-11'} bg-white dark:bg-slate-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl font-bold text-sm outline-none focus:border-indigo-600 transition-all shadow-md`} autoFocus />
                                            <MapPin className={`absolute top-4 ${dir === 'rtl' ? 'right-4' : 'left-4'} text-indigo-600`} size={20} />
                                        </div>
                                    )}
                                </div>
                                {showErrors && !pickupLocation && (<div className="flex items-center gap-1.5 mt-1 text-red-500 animate-fade-in"><AlertCircle size={12} /><span className="text-[10px] font-bold">{t('error_location_required')}</span></div>)}
                            </div>
                        </form>

                        {duplicateError && (
                            <div className="px-6 pb-4">
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 animate-fade-in">
                                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                    <p className="text-sm font-medium leading-tight">{duplicateError}</p>
                                </div>
                            </div>
                        )}

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                            <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full h-16 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50">
                                {isSubmitting ? <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : (
                                    <>{tripToEdit?.id ? t('save_changes') : (tripType === 'offer' ? t('publish_trip') : t('publish_request'))} {dir === 'rtl' ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}</>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default PostTripSheet;
