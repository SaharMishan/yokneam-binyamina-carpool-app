
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocalization } from '../../context/LocalizationContext';
import { Phone, User } from 'lucide-react';

const ProfileCompletionForm: React.FC = () => {
    const { t } = useLocalization();
    const { completeUserProfile, firebaseUser } = useAuth();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [englishName, setEnglishName] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (phoneNumber.trim()) {
            setIsSubmitting(true);
            try {
                // Pass optional English name if provided
                await completeUserProfile(phoneNumber.trim(), undefined, englishName.trim());
            } catch (error) {
                console.error(error);
                setIsSubmitting(false);
            }
        }
    };
    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800 p-4">
            <div className="w-full max-w-sm p-8 space-y-8 bg-white dark:bg-gray-900 rounded-2xl shadow-lg">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-semibold text-gray-800 dark:text-white">{t('complete_profile')}</h2>
                        <p className="text-sm text-gray-500 mt-1">Welcome, {firebaseUser?.displayName}!</p>
                    </div>
                    
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">{t('phone_number')}</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                                 <Phone className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="tel"
                                id="phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="block w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white ps-10 p-3 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                placeholder={t('phone_number') + ' (05X-XXXXXXX)'}
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="nameEn" className="block text-sm font-medium text-gray-700 dark:text-gray-300 sr-only">{t('full_name_en')}</label>
                        <div className="relative mt-1 rounded-md shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                                 <User className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                id="nameEn"
                                value={englishName}
                                onChange={(e) => setEnglishName(e.target.value)}
                                className="block w-full rounded-lg border-gray-300 bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white ps-10 p-3 focus:border-blue-500 focus:ring-blue-500 transition-colors"
                                placeholder={t('full_name_en')}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-green-400 flex justify-center transition-colors"
                    >
                         {isSubmitting ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <span>{t('save_profile')}</span>}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ProfileCompletionForm;
