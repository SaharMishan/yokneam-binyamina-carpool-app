
import React, { useState, useCallback, useEffect } from 'react';
import { LocalizationProvider, useLocalization } from './context/LocalizationContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AuthGate from './components/AuthGate';
import Header from './components/Header';
import TripList from './components/TripList';
import PostTripButton from './components/PostTripButton';
import PostTripSheet from './components/PostTripSheet';
import SideMenu from './components/SideMenu';
import ScheduleView from './components/ScheduleView';
import AboutView from './components/AboutView';
import ProfileView from './components/ProfileView';
import SettingsView from './components/SettingsView';
import AdminDashboard from './components/admin/AdminDashboard';
import NotFoundView from './components/NotFoundView';
import GlobalNotifier from './components/GlobalNotifier';
import ReportModal from './components/ReportModal';
import InstallInstructions from './components/InstallInstructions';
import InstallGuide from './components/InstallGuide';
import { Direction, Trip } from './types';
import { db } from './services/firebase';
import { CarFront, Cloud } from 'lucide-react';

const CoolLoader = ({ message }: { message: string }) => (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 overflow-hidden">
        {/* Background Clouds */}
        <div className="absolute top-20 left-0 w-full opacity-20 pointer-events-none">
            <div className="absolute left-[10%] animate-cloud-drift" style={{ animationDelay: '0s' }}><Cloud size={40} className="text-indigo-400" /></div>
            <div className="absolute left-[40%] animate-cloud-drift" style={{ animationDelay: '5s' }}><Cloud size={60} className="text-blue-400" /></div>
            <div className="absolute left-[70%] animate-cloud-drift" style={{ animationDelay: '2s' }}><Cloud size={30} className="text-indigo-300" /></div>
        </div>

        <div className="relative flex flex-col items-center">
            {/* Pulsing Light behind car */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl animate-pulse-soft"></div>
            
            {/* The Car */}
            <div className="relative z-10 animate-car-bounce">
                <div className="bg-gradient-to-tr from-indigo-600 to-blue-500 p-5 rounded-[1.8rem] shadow-2xl shadow-indigo-500/40 border-4 border-white dark:border-slate-800 text-white">
                    <CarFront size={64} strokeWidth={1.5} />
                </div>
            </div>

            {/* Scrolling Road */}
            <div className="mt-6 w-32 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 animate-road-scroll animate-road"></div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
                <p className="text-lg font-black text-slate-800 dark:text-white tracking-tight uppercase">{message}</p>
                <div className="flex gap-1.5">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                </div>
            </div>
        </div>

        <div className="absolute bottom-10 text-center opacity-30">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">קארפול יקנעם-בנימינה</p>
        </div>
    </div>
);

const GlobalBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-400/5 dark:bg-blue-900/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-400/5 dark:bg-indigo-900/10 rounded-full blur-[120px]"></div>
    </div>
);

const AppContent = () => {
    const { user, loading } = useAuth();
    const { dir, t } = useLocalization();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);
    const [isInstallInstructionsOpen, setInstallInstructionsOpen] = useState(false);
    const [direction, setDirection] = useState<Direction>(Direction.YOKNEAM_TO_BINYAMINA);
    const [currentView, setView] = useState('home');
    const [isCheckingDeepLink, setIsCheckingDeepLink] = useState(false);
    const [canInstall, setCanInstall] = useState(false);

    useEffect(() => {
        const checkInstall = () => setCanInstall(!!(window as any).deferredInstallPrompt);
        window.addEventListener('pwa-install-available', checkInstall);
        checkInstall();
        return () => window.removeEventListener('pwa-install-available', checkInstall);
    }, []);

    // Deep Linking Logic
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const tripId = searchParams.get('tripId');
        if (tripId && user && !loading) {
            setIsCheckingDeepLink(true);
            db.getTrip(tripId).then(trip => {
                if (trip) {
                    setDirection(trip.direction);
                    setView('home');
                }
            }).finally(() => {
                setIsCheckingDeepLink(false);
                const url = new URL(window.location.href);
                url.searchParams.delete('tripId');
                window.history.replaceState(null, '', url.toString());
            });
        }
    }, [user, loading]);

    const navigateToTrip = useCallback((tripId: string, tripDirection: Direction) => {
        setDirection(tripDirection);
        setView('home');
    }, []);

    const openSheet = useCallback((trip?: Trip) => {
        setTripToEdit(trip || null);
        setSheetOpen(true);
    }, []);

    if (loading || isCheckingDeepLink) {
        return <CoolLoader message={isCheckingDeepLink ? 'טוען נסיעה ששותפה...' : 'מתחבר למערכת...'} />;
    }

    if (!user) return <AuthGate />;

    const renderView = () => {
        switch (currentView) {
            case 'schedule': return <ScheduleView onEditTrip={openSheet} />;
            case 'about': return <AboutView />;
            case 'profile': return <ProfileView onEditTrip={openSheet} />;
            case 'settings': return <SettingsView />;
            case 'admin': return user.isAdmin ? <AdminDashboard /> : <NotFoundView onBack={() => setView('home')} />;
            case 'home': return <TripList direction={direction} setDirection={setDirection} onPostTrip={() => openSheet()} onEditTrip={openSheet} />;
            default: return <NotFoundView onBack={() => setView('home')} />;
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 transition-colors duration-300 flex flex-col md:flex-row overflow-hidden">
            <GlobalBackground />
            <InstallGuide />
            <InstallInstructions 
                isOpen={isInstallInstructionsOpen} 
                onClose={() => setInstallInstructionsOpen(false)} 
                onInstall={() => (window as any).deferredInstallPrompt?.prompt()}
                canInstallProgrammatically={canInstall}
            />
            <ReportModal isOpen={isReportOpen} onClose={() => setReportOpen(false)} />

            {/* Desktop Side Menu */}
            <div className="hidden md:flex w-72 h-screen sticky top-0 border-e border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl z-40">
                 <SideMenu 
                    isOpen={true} 
                    onClose={() => {}} 
                    currentView={currentView}
                    setView={setView}
                    isDesktop={true}
                    onOpenReport={() => setReportOpen(true)}
                    onOpenInstall={() => setInstallInstructionsOpen(true)}
                />
            </div>

            {/* Main Container */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <Header 
                    onMenuClick={() => setMenuOpen(true)} 
                    onLogoClick={() => setView('home')} 
                    onNavigateToTrip={navigateToTrip}
                />
                
                {/* Mobile Menu */}
                <SideMenu 
                    isOpen={isMenuOpen} 
                    onClose={() => setMenuOpen(false)} 
                    currentView={currentView}
                    setView={setView}
                    isDesktop={false}
                    onOpenReport={() => setReportOpen(true)}
                    onOpenInstall={() => setInstallInstructionsOpen(true)}
                />

                <main className="flex-1 overflow-y-auto scrollbar-hide pt-16 pb-20 md:pb-6">
                    <div className="max-w-4xl mx-auto w-full px-4 sm:px-6 py-4 animate-fade-in">
                        {renderView()}
                    </div>
                </main>
                
                {currentView === 'home' && <PostTripButton onClick={() => openSheet()} />}
                <PostTripSheet isOpen={isSheetOpen} onClose={() => setSheetOpen(false)} tripToEdit={tripToEdit} />
                
                {/* Mobile Tab Bar spacer if needed */}
                <div className="h-safe md:hidden bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800"></div>
            </div>
            
            <GlobalNotifier />
        </div>
    );
};

const App = () => (
    <LocalizationProvider>
        <AuthProvider>
            <NotificationProvider>
                <AppContent />
            </NotificationProvider>
        </AuthProvider>
    </LocalizationProvider>
);

export default App;
