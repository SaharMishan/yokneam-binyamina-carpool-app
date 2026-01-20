
import React, { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { X, Clock, Check } from 'lucide-react';

interface TimePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (time: string) => void;
    initialTime?: string;
}

const TimePickerModal: React.FC<TimePickerModalProps> = ({ isOpen, onClose, onSelect, initialTime = '08:00' }) => {
    const { t } = useLocalization();
    const ITEM_HEIGHT = 50; 
    const VISIBLE_ITEMS = 5;
    const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
    const CENTER_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;
    const LOOPS = 30; 
    const MIDDLE_LOOP_INDEX = Math.floor(LOOPS / 2);

    const [selectedH, setSelectedH] = useState(() => parseInt((initialTime || '08:00').split(':')[0], 10) || 0);
    const [selectedM, setSelectedM] = useState(() => parseInt((initialTime || '08:00').split(':')[1], 10) || 0);
    
    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);

    const hoursList = useMemo(() => {
        const arr = [];
        for (let i = 0; i < LOOPS; i++) for (let h = 0; h < 24; h++) arr.push(h);
        return arr;
    }, []);

    const minutesList = useMemo(() => {
        const arr = [];
        for (let i = 0; i < LOOPS; i++) for (let m = 0; m < 60; m++) arr.push(m);
        return arr;
    }, []);

    useLayoutEffect(() => {
        if (isOpen) {
            const hIndex = (MIDDLE_LOOP_INDEX * 24) + selectedH;
            const mIndex = (MIDDLE_LOOP_INDEX * 60) + selectedM;
            setTimeout(() => {
                if (hoursRef.current) hoursRef.current.scrollTop = hIndex * ITEM_HEIGHT;
                if (minutesRef.current) minutesRef.current.scrollTop = mIndex * ITEM_HEIGHT;
            }, 50);
        }
    }, [isOpen]); 

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'h' | 'm') => {
        const index = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT);
        if (type === 'h') { if (hoursList[index] !== undefined) setSelectedH(hoursList[index]); }
        else { if (minutesList[index] !== undefined) setSelectedM(minutesList[index]); }
    };

    const handleConfirm = () => {
        onSelect(`${selectedH.toString().padStart(2, '0')}:${selectedM.toString().padStart(2, '0')}`);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-[300px] rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border border-white/10" onClick={e => e.stopPropagation()}>
                 <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><Clock size={20} className="text-indigo-600"/>{t('select_time')}</h3>
                     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-400"><X size={20} /></button>
                 </div>
                 <div className="relative flex w-full bg-white dark:bg-slate-900" dir="ltr" style={{ height: CONTAINER_HEIGHT }}>
                     <div className="absolute left-0 right-0 pointer-events-none bg-indigo-50 dark:bg-indigo-500/10 border-y border-indigo-100 dark:border-indigo-500/30" style={{ top: CENTER_PADDING, height: ITEM_HEIGHT }}></div>
                     <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-30 pointer-events-none"></div>
                     <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-30 pointer-events-none"></div>
                     <div className="absolute top-2 left-0 w-1/2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest z-40">{t('hour')}</div>
                     <div className="absolute top-2 right-0 w-1/2 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest z-40">{t('minute')}</div>
                     <div className="flex-1 relative z-10">
                         <div ref={hoursRef} onScroll={e => handleScroll(e, 'h')} className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}>
                             {hoursList.map((h, i) => <div key={i} className="flex items-center justify-center snap-center h-[50px]"><span className={`text-2xl transition-all ${selectedH === h ? 'font-black text-indigo-600 scale-125' : 'font-medium text-slate-300 dark:text-slate-700'}`}>{h.toString().padStart(2, '0')}</span></div>)}
                         </div>
                     </div>
                     <div className="flex items-center justify-center z-10 w-4 font-black text-slate-300">:</div>
                     <div className="flex-1 relative z-10">
                         <div ref={minutesRef} onScroll={e => handleScroll(e, 'm')} className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}>
                             {minutesList.map((m, i) => <div key={i} className="flex items-center justify-center snap-center h-[50px]"><span className={`text-2xl transition-all ${selectedM === m ? 'font-black text-indigo-600 scale-125' : 'font-medium text-slate-300 dark:text-slate-700'}`}>{m.toString().padStart(2, '0')}</span></div>)}
                         </div>
                     </div>
                 </div>
                 <div className="p-4 bg-slate-50 dark:bg-slate-800/50">
                     <button onClick={handleConfirm} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all uppercase tracking-wide">{t('btn_select_time')}</button>
                 </div>
            </div>
        </div>
    );
};

export default TimePickerModal;
