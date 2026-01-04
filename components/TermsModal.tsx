
import React from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { X, FileText, Scale } from 'lucide-react';
import Portal from './Portal';

interface TermsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
    const { t } = useLocalization();

    if (!isOpen) return null;

    return (
        <Portal>
            <div className="fixed inset-0 z-[200] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
                <div className="bg-white dark:bg-slate-900 w-full max-w-md h-[80vh] rounded-[2rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-100 dark:border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                        <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <FileText size={20} className="text-indigo-600" />
                            {t('terms_title')}
                        </h3>
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-all active:scale-90"><X size={20} /></button>
                    </div>

                    <div className="p-6 overflow-y-auto text-sm leading-relaxed text-slate-600 dark:text-slate-300 space-y-6">
                        <p className="font-bold">{t('terms_content_intro')}</p>
                        
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                            <h4 className="font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Scale size={16} /> {t('internet_law_13')}</h4>
                            <p className="text-xs">{t('terms_law_note')}</p>
                        </div>

                        <div className="space-y-4 text-xs sm:text-sm">
                            <section>
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">1. שימוש באפליקציה</h5>
                                <p>השימוש באפליקציה נועד לקישור בין נהגים לנוסעים למטרת שיתוף נסיעות (Carpool) בלבד. אין לעשות שימוש באפליקציה למטרות רווח מסחרי או הסעות בתשלום מעבר להשתתפות בהוצאות.</p>
                            </section>
                            <section>
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">2. אחריות</h5>
                                <p>מפתחי האפליקציה אינם אחראים על טיב הנסיעה, בטיחות הרכב, התנהגות המשתמשים או כל נזק שייגרם כתוצאה מהשימוש באפליקציה. האחריות כולה חלה על המשתמשים.</p>
                            </section>
                            <section>
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">3. פרטיות</h5>
                                <p>מספר הטלפון של המשתמשים נחשף אך ורק למשתמשים שאושרו לנסיעה משותפת. אנו עושים מאמצים לשמור על פרטיות המידע אך לא מתחייבים להגנה הרמטית מפני פריצות.</p>
                            </section>
                            <section>
                                <h5 className="font-bold text-slate-900 dark:text-white mb-1">4. הודעות והתראות</h5>
                                <p>המשתמש מסכים לקבלת הודעות והתראות מערכת (Push Notifications) הקשורות לתפעול השוטף, כגון אישור נסיעות, ביטולים ועדכונים.</p>
                            </section>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 shrink-0">
                        <button onClick={onClose} className="w-full h-12 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 transition-all">{t('terms_close')}</button>
                    </div>
                </div>
            </div>
        </Portal>
    );
};

export default TermsModal;
