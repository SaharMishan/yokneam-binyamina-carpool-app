
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocalization } from '../context/LocalizationContext';
import { db } from '../services/firebase';
import { Direction, TripType, Trip } from '../types';
import { Timestamp } from 'firebase/firestore';
import { X, MapPin, ArrowLeft, ArrowRight, Car, UserCheck, AlertCircle, ChevronDown } from 'lucide-react';
import TimePickerModal from './TimePickerModal';
import DatePickerModal from './DatePickerModal';

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

    const [tripType, setTripType] = useState<TripType>('offer');
    const [direction, setDirection] = useState<Direction>(Direction.YOKNEAM_TO_BINYAMINA);
    const [startDate, setStartDate] = useState(getLocalDateStr(new Date()));
    const [departureTime, setDepartureTime] = useState(getCurrentTimeStr());
    const [availableSeats, setAvailableSeats] = useState(3);
    const [pickupLocation, setPickupLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCustomMode, setIsCustomMode] = useState(false);
    const [showErrors, setShowErrors] = useState(false);
    const [seatError, setSeatError] = useState<string | null>(null);
    
    const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

    const commonLocations = direction === Direction.YOKNEAM_TO_BINYAMINA ? yokneamLocations : binyaminaLocations;
    
    const getApprovedCount = () => {
        if (!tripToEdit || !tripToEdit.passengers) return 0;
        return tripToEdit.passengers.filter(p => p.status === 'approved').length;
    };

    useEffect(() => {
        if (isOpen) {
            setShowErrors(false);
            setSeatError(null);
            
            if (tripToEdit) {
                const initialType = tripToEdit.type || 'offer';
                setTripType(initialType);
                
                if (tripToEdit.id) {
                    setDirection(tripToEdit.direction);
                    setPickupLocation(tripToEdit.pickupLocation || '');
                    
                    if (initialType === 'offer') {
                        setAvailableSeats(tripToEdit.availableSeats + getApprovedCount());
                    } else {
                        setAvailableSeats(tripToEdit.availableSeats);
                    }
                    
                    const allLocs = [...yokneamLocations, ...binyaminaLocations];
                    setIsCustomMode(!allLocs.includes(tripToEdit.pickupLocation || '') && tripToEdit.pickupLocation !== '');
                    
                    const date = tripToEdit.departureTime.toDate();
                    setStartDate(getLocalDateStr(date));
                    setDepartureTime(`${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`);
                } else {
                    setDirection(Direction.YOKNEAM_TO_BINYAMINA);
                    setAvailableSeats(3);
                    setPickupLocation(yokneamLocations[0]);
                    setIsCustomMode(false);
                    setDepartureTime(getCurrentTimeStr());
                    setStartDate(getLocalDateStr(new Date()));
                }
            } else {
                setTripType('offer');
                setDirection(Direction.YOKNEAM_TO_BINYAMINA);
                setAvailableSeats(3);
                setPickupLocation(yokneamLocations[0]);
                setIsCustomMode(false);
                setDepartureTime(getCurrentTimeStr());
                setStartDate(getLocalDateStr(new Date()));
            }
        }
    }, [isOpen, tripToEdit]);

    useEffect(() => {
        if (isOpen && (!tripToEdit || !tripToEdit.id) && !isCustomMode) {
            const locList = direction === Direction.YOKNEAM_TO_BINYAMINA ? yokneamLocations : binyaminaLocations;
            if (!locList.includes(pickupLocation)) {
                setPickupLocation(locList[0]);
            }
        }
    }, [direction, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setShowErrors(true);
        if (!user || !departureTime || !startDate || !pickupLocation.trim()) return;
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
            
            if (tripToEdit && tripToEdit.id) await db.updateTrip(tripToEdit.id, tripData);
            else await db.addTrip(tripData as any);
            onClose();
        } catch (error) { console.error(error); alert(t('error_generic')); } finally { setIsSubmitting(false); }
    };

    if (!isOpen) return null;
    
    const d = new Date(startDate);
    const displayDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[70] flex items-end md:items-center justify-center p-0 md:p-4" onClick={onClose}>
            <TimePickerModal isOpen={isTimePickerOpen} onClose={() => setIsTimePickerOpen(false)} onSelect={setDepartureTime} initialTime={departureTime} />
            <DatePickerModal isOpen={isDatePickerOpen} onClose={() => setIsDatePickerOpen(false)} onSelect={(d) => setStartDate(getLocalDateStr(d))} initialDate={new Date(startDate)} />

            <div className="w-full md:max-w-md bg-white dark:bg-slate-900 rounded-t-[2.5rem] md:rounded-[2.5rem] shadow-2xl h-[90dvh] md:h-auto md:max-h-[90dvh] flex flex-col overflow-hidden animate-slide-up pb-safe" onClick={(e) => e.stopPropagation()}>
                <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
                    <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{tripToEdit?.id ? t('edit') : (tripType === 'offer' ? t('post_a_trip') : t('publish_request'))}</h2>
                    <button onClick={onClose} className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-500 transition-transform active:scale-90"><X size={20} /></button>
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

                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                    <button type="button" onClick={handleSubmit} disabled={isSubmitting} className="w-full h-16 bg-indigo-600 text-white font-black text-lg rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50">
                        {isSubmitting ? <div className="w-7 h-7 border-3 border-white border-t-transparent rounded-full animate-spin"></div> : (
                            <>{tripToEdit?.id ? t('save_changes') : (tripType === 'offer' ? t('publish_trip') : t('publish_request'))} {dir === 'rtl' ? <ArrowLeft size={22} /> : <ArrowRight size={22} />}</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PostTripSheet;
