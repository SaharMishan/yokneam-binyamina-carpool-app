
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
    
    // Config Constants
    const ITEM_HEIGHT = 50; 
    const VISIBLE_ITEMS = 5;
    const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS; // 250px
    const CENTER_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2; // 100px
    
    // Reduced loops for better performance while maintaining "infinite" feel
    const LOOPS = 30; 
    const MIDDLE_LOOP_INDEX = Math.floor(LOOPS / 2);

    const [selectedH, setSelectedH] = useState(() => {
        const parts = (initialTime || '08:00').split(':');
        return parseInt(parts[0], 10) || 0;
    });
    const [selectedM, setSelectedM] = useState(() => {
        const parts = (initialTime || '08:00').split(':');
        return parseInt(parts[1], 10) || 0;
    });
    
    const hoursRef = useRef<HTMLDivElement>(null);
    const minutesRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);

    // Memoized Data Arrays
    const hoursList = useMemo(() => {
        const arr = [];
        for (let i = 0; i < LOOPS; i++) {
            for (let h = 0; h < 24; h++) arr.push(h);
        }
        return arr;
    }, []);

    const minutesList = useMemo(() => {
        const arr = [];
        for (let i = 0; i < LOOPS; i++) {
            for (let m = 0; m < 60; m++) arr.push(m);
        }
        return arr;
    }, []);

    useEffect(() => {
        if (isOpen && initialTime) {
            const parts = initialTime.split(':');
            setSelectedH(parseInt(parts[0], 10) || 0);
            setSelectedM(parseInt(parts[1], 10) || 0);
        }
    }, [isOpen, initialTime]);

    // Initial positioning
    useLayoutEffect(() => {
        if (isOpen) {
            const initialH = parseInt((initialTime || '08:00').split(':')[0], 10) || 0;
            const initialM = parseInt((initialTime || '08:00').split(':')[1], 10) || 0;

            const hIndex = (MIDDLE_LOOP_INDEX * 24) + initialH;
            const mIndex = (MIDDLE_LOOP_INDEX * 60) + initialM;

            // Use setTimeout 0 to push to next tick after render
            setTimeout(() => {
                if (hoursRef.current) hoursRef.current.scrollTop = hIndex * ITEM_HEIGHT;
                if (minutesRef.current) minutesRef.current.scrollTop = mIndex * ITEM_HEIGHT;
            }, 0);
        }
    }, [isOpen]); 

    // Optimized Scroll Handler
    const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'h' | 'm') => {
        if (!e.currentTarget) return;
        
        const scrollTop = e.currentTarget.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);
        
        if (type === 'h') {
            const val = hoursList[index];
            if (val !== undefined && val !== selectedH) {
                setSelectedH(val);
            }
        } else {
            const val = minutesList[index];
            if (val !== undefined && val !== selectedM) {
                setSelectedM(val);
            }
        }
    };

    const handleClickItem = (index: number, type: 'h' | 'm') => {
        const ref = type === 'h' ? hoursRef : minutesRef;
        if (ref.current) {
            ref.current.scrollTo({
                top: index * ITEM_HEIGHT,
                behavior: 'smooth'
            });
        }
    };

    const handleConfirm = () => {
        const timeStr = `${selectedH.toString().padStart(2, '0')}:${selectedM.toString().padStart(2, '0')}`;
        onSelect(timeStr);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-[300px] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-scale-in border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                 
                 {/* Header */}
                 <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-40 relative">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                         <Clock size={20} className="text-indigo-600 dark:text-indigo-400"/>
                         {t('select_time')}
                     </h3>
                     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400">
                         <X size={20} />
                     </button>
                 </div>
                 
                 {/* Picker Container */}
                 <div className="relative flex w-full bg-white dark:bg-slate-900" dir="ltr" style={{ height: CONTAINER_HEIGHT }}>
                     
                     {/* Highlight Bar */}
                     <div 
                        className="absolute left-0 right-0 z-0 pointer-events-none bg-indigo-50 dark:bg-indigo-500/10 border-y border-indigo-100 dark:border-indigo-500/30"
                        style={{ top: CENTER_PADDING, height: ITEM_HEIGHT }}
                     ></div>

                     {/* Masks */}
                     <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-transparent z-30 pointer-events-none"></div>
                     <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white via-white/95 to-transparent dark:from-slate-900 dark:via-slate-900/95 dark:to-transparent z-30 pointer-events-none"></div>

                     {/* Labels */}
                     <div className="absolute top-2 left-0 w-1/2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest z-40 pointer-events-none">{t('hour')}</div>
                     <div className="absolute top-2 right-0 w-1/2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest z-40 pointer-events-none">{t('minute')}</div>

                     {/* Hours */}
                     <div className="flex-1 relative z-10">
                         <div 
                            ref={hoursRef}
                            onScroll={(e) => handleScroll(e, 'h')}
                            className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
                            style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}
                         >
                             {hoursList.map((h, i) => (
                                 <div 
                                    key={i}
                                    onClick={() => handleClickItem(i, 'h')}
                                    className="flex items-center justify-center snap-center cursor-pointer select-none"
                                    style={{ height: ITEM_HEIGHT }}
                                 >
                                     <span className={`text-2xl transition-transform duration-200 ease-out ${selectedH === h ? 'font-black text-indigo-600 dark:text-indigo-400 scale-125' : 'font-medium text-slate-300 dark:text-slate-600 scale-90'}`}>
                                         {h.toString().padStart(2, '0')}
                                     </span>
                                 </div>
                             ))}
                         </div>
                     </div>

                     <div className="flex items-center justify-center z-10 pb-2 w-4 relative">
                        <span className="text-xl font-black text-slate-300 dark:text-slate-600 mb-1">:</span>
                     </div>

                     {/* Minutes */}
                     <div className="flex-1 relative z-10">
                         <div 
                            ref={minutesRef}
                            onScroll={(e) => handleScroll(e, 'm')}
                            className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory"
                            style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}
                         >
                             {minutesList.map((m, i) => (
                                 <div 
                                    key={i}
                                    onClick={() => handleClickItem(i, 'm')}
                                    className="flex items-center justify-center snap-center cursor-pointer select-none"
                                    style={{ height: ITEM_HEIGHT }}
                                 >
                                     <span className={`text-2xl transition-transform duration-200 ease-out ${selectedM === m ? 'font-black text-indigo-600 dark:text-indigo-400 scale-125' : 'font-medium text-slate-300 dark:text-slate-600 scale-90'}`}>
                                         {m.toString().padStart(2, '0')}
                                     </span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 </div>

                 {/* Footer */}
                 <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 z-40 relative">
                     <button onClick={handleConfirm} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                         <Check size={18} strokeWidth={3} /> {t('confirm')}
                     </button>
                 </div>
            </div>
        </div>
    );
};

export default TimePickerModal;
