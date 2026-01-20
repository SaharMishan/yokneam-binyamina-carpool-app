
import React, { useRef, useEffect, useState, useLayoutEffect, useMemo } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { X, Calendar, Check } from 'lucide-react';

interface DatePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (date: Date) => void;
    initialDate?: Date;
}

const DatePickerModal: React.FC<DatePickerModalProps> = ({ isOpen, onClose, onSelect, initialDate }) => {
    const { t, language, dir } = useLocalization();
    const ITEM_HEIGHT = 50; 
    const VISIBLE_ITEMS = 5;
    const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
    const CENTER_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;
    const LOOPS = 30;
    const MIDDLE_LOOP_INDEX = Math.floor(LOOPS / 2);

    const today = new Date();
    const startYear = today.getFullYear();
    const endYear = startYear + 2;
    const yearRange = endYear - startYear + 1;

    const [selectedD, setSelectedD] = useState(() => initialDate ? initialDate.getDate() : today.getDate());
    const [selectedM, setSelectedM] = useState(() => initialDate ? initialDate.getMonth() : today.getMonth());
    const [selectedY, setSelectedY] = useState(() => initialDate ? initialDate.getFullYear() : today.getFullYear());

    const daysRef = useRef<HTMLDivElement>(null);
    const monthsRef = useRef<HTMLDivElement>(null);
    const yearsRef = useRef<HTMLDivElement>(null);

    const daysList = useMemo(() => {
        const arr = [];
        for(let i=0; i<LOOPS; i++) for(let d=1; d<=31; d++) arr.push(d);
        return arr;
    }, []);

    const monthsList = useMemo(() => {
        const arr = [];
        for(let i=0; i<LOOPS; i++) for(let m=0; m<12; m++) arr.push(m);
        return arr;
    }, []);

    const yearsList = useMemo(() => {
        const arr = [];
        for(let i=0; i<LOOPS; i++) for(let y=startYear; y<=endYear; y++) arr.push(y);
        return arr;
    }, [startYear, endYear]);

    const monthNames = language === 'he' 
        ? ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']
        : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    useLayoutEffect(() => {
        if (isOpen) {
            const d = initialDate || new Date();
            const dIndex = (MIDDLE_LOOP_INDEX * 31) + (d.getDate() - 1);
            const mIndex = (MIDDLE_LOOP_INDEX * 12) + d.getMonth();
            const yIndex = (MIDDLE_LOOP_INDEX * yearRange) + (d.getFullYear() - startYear);
            setTimeout(() => {
                if(daysRef.current) daysRef.current.scrollTop = dIndex * ITEM_HEIGHT;
                if(monthsRef.current) monthsRef.current.scrollTop = mIndex * ITEM_HEIGHT;
                if(yearsRef.current) yearsRef.current.scrollTop = yIndex * ITEM_HEIGHT;
            }, 0);
        }
    }, [isOpen]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>, type: 'd' | 'm' | 'y') => {
        const index = Math.round(e.currentTarget.scrollTop / ITEM_HEIGHT);
        if (type === 'd') { if (daysList[index] !== undefined) setSelectedD(daysList[index]); }
        else if (type === 'm') { if (monthsList[index] !== undefined) setSelectedM(monthsList[index]); }
        else { if (yearsList[index] !== undefined) setSelectedY(yearsList[index]); }
    };

    const handleConfirm = () => {
        const daysInMonth = new Date(selectedY, selectedM + 1, 0).getDate();
        const validDay = Math.min(selectedD, daysInMonth);
        onSelect(new Date(selectedY, selectedM, validDay));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-[340px] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-scale-in border border-slate-100 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                 <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-40 relative">
                     <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2"><Calendar size={20} className="text-indigo-600"/>{t('select_date')}</h3>
                     <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400"><X size={20} /></button>
                 </div>
                 <div className="relative flex w-full bg-white dark:bg-slate-900" dir="ltr" style={{ height: CONTAINER_HEIGHT }}>
                     <div className="absolute left-0 right-0 z-0 pointer-events-none bg-indigo-50 dark:bg-indigo-500/10 border-y border-indigo-100 dark:border-indigo-500/30" style={{ top: CENTER_PADDING, height: ITEM_HEIGHT }}></div>
                     <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-white dark:from-slate-900 to-transparent z-30 pointer-events-none"></div>
                     <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white dark:from-slate-900 to-transparent z-30 pointer-events-none"></div>
                     <div className="absolute top-2 left-0 w-[33%] text-center text-[10px] font-black text-slate-400 uppercase tracking-widest z-40">{t('day')}</div>
                     <div className="absolute top-2 left-[33%] w-[34%] text-center text-[10px] font-black text-slate-400 uppercase tracking-widest z-40">{t('month')}</div>
                     <div className="absolute top-2 right-0 w-[33%] text-center text-[10px] font-black text-slate-400 uppercase tracking-widest z-40">{t('year')}</div>
                     <div className="flex-1 relative z-10"><div ref={daysRef} onScroll={(e) => handleScroll(e, 'd')} className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}>{daysList.map((d, i) => <div key={i} className="flex items-center justify-center snap-center h-[50px]"><span className={`text-xl transition-all ${selectedD === d ? 'font-black text-indigo-600 scale-125' : 'font-medium text-slate-300 dark:text-slate-700'}`}>{d}</span></div>)}</div></div>
                     <div className="flex-1 relative z-10 border-x border-slate-50 dark:border-slate-800/50"><div ref={monthsRef} onScroll={(e) => handleScroll(e, 'm')} className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}>{monthsList.map((m, i) => <div key={i} className="flex items-center justify-center snap-center h-[50px]"><span className={`text-sm transition-all whitespace-nowrap ${selectedM === m ? 'font-black text-indigo-600 scale-125' : 'font-medium text-slate-300 dark:text-slate-700'}`}>{monthNames[m]}</span></div>)}</div></div>
                     <div className="flex-1 relative z-10"><div ref={yearsRef} onScroll={(e) => handleScroll(e, 'y')} className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory" style={{ paddingTop: CENTER_PADDING, paddingBottom: CENTER_PADDING }}>{yearsList.map((y, i) => <div key={i} className="flex items-center justify-center snap-center h-[50px]"><span className={`text-lg transition-all ${selectedY === y ? 'font-black text-indigo-600 scale-125' : 'font-medium text-slate-300 dark:text-slate-700'}`}>{y}</span></div>)}</div></div>
                 </div>
                 <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                     <button onClick={handleConfirm} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wide">{t('btn_select_date')}</button>
                 </div>
            </div>
        </div>
    );
};

export default DatePickerModal;
