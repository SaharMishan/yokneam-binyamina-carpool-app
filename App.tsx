
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
import { Direction, Trip } from './types';
import { useAuth as useAuthHook } from './context/AuthContext';
import { db } from './services/firebase';

// Extract Background to a separate component to ensure persistence across all states
const GlobalBackground = () => (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/10 dark:bg-blue-900/10 rounded-full blur-[120px] transform translate-z-0"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-400/10 dark:bg-indigo-900/10 rounded-full blur-[120px] transform translate-z-0"></div>
    </div>
);

// Common container for loading/auth/app to prevent layout thrashing
const Container: React.FC<React.PropsWithChildren<{}>> = ({ children }) => (
    <div className="min-h-[100dvh] font-sans text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 relative overflow-x-hidden transition-colors duration-300 flex flex-col md:flex-row">
        <GlobalBackground />
        {children}
    </div>
);

const AppContent = () => {
    const { user, loading } = useAuthHook();
    const { dir } = useLocalization();
    const [isSheetOpen, setSheetOpen] = useState(false);
    const [tripToEdit, setTripToEdit] = useState<Trip | null>(null);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [isReportOpen, setReportOpen] = useState(false);
    const [direction, setDirection] = useState<Direction>(Direction.YOKNEAM_TO_BINYAMINA);
    const [currentView, setView] = useState('home');
    const [isCheckingDeepLink, setIsCheckingDeepLink] = useState(false);
    
    const [adminInitialTab, setAdminInitialTab] = useState<'reports' | undefined>(undefined);

    useEffect(() => {
        let id: string | null = null;
        const searchParams = new URLSearchParams(window.location.search);
        id = searchParams.get('tripId');
        if (!id && window.location.hash.includes('tripId=')) {
            const parts = window.location.hash.split('tripId=');
            if (parts.length > 1) id = parts[1].split('&')[0];
        }
        if (id) {
            sessionStorage.setItem('pendingTripId', id);
            const url = new URL(window.location.href);
            url.searchParams.delete('tripId');
            url.hash = '';
            window.history.replaceState(null, '', url.toString());
        }
    }, []);

    useEffect(() => {
        const processDeepLink = async () => {
            const pendingId = sessionStorage.getItem('pendingTripId');
            if (pendingId && user && !loading) {
                setIsCheckingDeepLink(true);
                try {
                    const trip = await db.getTrip(pendingId);
                    if (trip) {
                        setDirection(trip.direction);
                        setView('home'); 
                    } else {
                        setView('notFound');
                    }
                } catch (error) {
                    console.error("Error processing link", error);
                    setView('notFound');
                } finally {
                    sessionStorage.removeItem('pendingTripId'); 
                    setIsCheckingDeepLink(false);
                }
            }
        };
        if (!loading) processDeepLink();
    }, [user, loading]);

    const navigateToTrip = useCallback((tripId: string, tripDirection: Direction) => {
        setDirection(tripDirection);
        setView('home');
    }, []);

    const handleNavigateToAdminReports = useCallback(() => {
        if (user?.isAdmin) {
            setAdminInitialTab('reports');
            setView('admin');
        }
    }, [user]);

    const openSheet = useCallback((trip?: Trip) => {
        if (trip) setTripToEdit(trip);
        else setTripToEdit(null);
        setSheetOpen(true);
    }, []);

    const closeSheet = useCallback(() => {
        setSheetOpen(false);
        setTripToEdit(null);
    }, []);

    const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);

    useEffect(() => {
        setMenuOpen(false);
    }, [user, currentView]);

    React.useEffect(() => {
        document.documentElement.dir = dir;
    }, [dir]);
    
    if (loading || isCheckingDeepLink) {
        return (
            <Container>
                <div className="flex flex-col items-center justify-center w-full h-[100dvh] gap-4 relative z-10 animate-fade-in">
                    <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-600 rounded-full animate-spin"></div>
                    {isCheckingDeepLink && <p className="text-sm font-bold text-indigo-600 animate-pulse px-6 text-center">טוען נסיעה ששותפה איתך...</p>}
                </div>
            </Container>
        );
    }
    
    if (!user) {
        return (
            <Container>
                <div className="w-full h-full relative z-10">
                    <AuthGate />
                </div>
            </Container>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case 'schedule': return <ScheduleView onEditTrip={openSheet} />;
            case 'about': return <AboutView />;
            case 'profile': return <ProfileView onEditTrip={openSheet} />;
            case 'settings': return <SettingsView />;
            case 'admin': return user.isAdmin ? <AdminDashboard initialTab={adminInitialTab} /> : <NotFoundView onBack={() => setView('home')} />;
            case 'home': return <TripList direction={direction} setDirection={setDirection} onPostTrip={() => openSheet()} onEditTrip={openSheet} />;
            default: return <NotFoundView onBack={() => setView('home')} />;
        }
    };

    return (
        <Container>
            <GlobalNotifier />
            <ReportModal isOpen={isReportOpen} onClose={() => setReportOpen(false)} />

            <div className="hidden md:flex w-72 h-screen fixed z-40 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none">
                 <SideMenu 
                    isOpen={true} 
                    onClose={() => {}} 
                    currentView={currentView}
                    setView={setView}
                    isDesktop={true}
                    onOpenReport={() => setReportOpen(true)}
                />
            </div>

            <div className="flex-1 flex flex-col min-h-[100dvh] relative z-10 md:rtl:mr-72 md:ltr:ml-72 transition-all duration-300">
                <Header 
                    onMenuClick={toggleMenu} 
                    onLogoClick={() => setView('home')} 
                    onNavigateToTrip={navigateToTrip}
                    onNavigateToAdminReports={handleNavigateToAdminReports}
                />
                
                <SideMenu 
                    isOpen={isMenuOpen} 
                    onClose={() => setMenuOpen(false)} 
                    currentView={currentView}
                    setView={setView}
                    isDesktop={false}
                    onOpenReport={() => setReportOpen(true)}
                />

                {/* Main Content Area - Added overflow-x-hidden to prevent scrollbars during animations */}
                <main className="pt-20 pb-safe sm:px-6 max-w-4xl mx-auto w-full px-3 flex-1 flex flex-col overflow-x-hidden">
                    {/* Key is crucial here! It forces React to unmount the previous view and mount the new one, triggering the animation */}
                    <div key={currentView} className="animate-fade-in w-full flex-1 flex flex-col">
                        {renderView()}
                    </div>
                </main>
                
                {currentView === 'home' && <PostTripButton onClick={() => openSheet()} />}
                
                <PostTripSheet isOpen={isSheetOpen} onClose={closeSheet} tripToEdit={tripToEdit} />
                
                {/* Visual Bottom Spacer for safe areas */}
                <div className="h-6 shrink-0 md:hidden"></div>
            </div>
        </Container>
    );
};

const App: React.FC = () => {
    return (
        <LocalizationProvider>
            <AuthProvider>
                <NotificationProvider>
                    <AppContent />
                </NotificationProvider>
            </AuthProvider>
        </LocalizationProvider>
    );
};

export default App;
