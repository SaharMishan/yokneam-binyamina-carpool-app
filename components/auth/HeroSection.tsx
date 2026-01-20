
import React from 'react';
import { useLocalization } from '../../context/LocalizationContext';
import { CarFront, MapPin, Clock, Leaf, Shield, MessageCircle, Users } from 'lucide-react';

const HeroSection: React.FC = () => {
    const { t, language } = useLocalization();

    return (
        <div className="hidden md:flex flex-col justify-center items-center h-full relative overflow-hidden bg-slate-900 w-full px-8">
            
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-slate-900 to-blue-950 z-0"></div>
            
            <div className="absolute inset-0 opacity-10" 
                 style={{ 
                     backgroundImage: 'radial-gradient(#6366f1 1px, transparent 1px)', 
                     backgroundSize: '30px 30px' 
                 }}>
            </div>

            <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

            <div className="relative z-10 w-full max-w-lg aspect-square flex items-center justify-center">
                
                <div className="absolute z-20 animate-pop-in">
                    <div className="w-48 h-48 bg-gradient-to-tr from-indigo-600 to-blue-500 rounded-[2rem] shadow-2xl shadow-indigo-500/40 flex items-center justify-center transform hover:scale-105 transition-transform duration-300 border-4 border-white/10 backdrop-blur-sm animate-float">
                        <CarFront size={96} className="text-white drop-shadow-md" />
                    </div>
                </div>

                {/* Top Right: Location (Destination) */}
                <div className="absolute top-0 right-10 animate-pop-in-delay-1 z-10">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-xl animate-float-delayed">
                        <div className="w-10 h-10 bg-rose-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-rose-500/30">
                            <MapPin size={20} className="text-white" />
                        </div>
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider opacity-80">{t('city_binyamina')}</span>
                    </div>
                </div>

                {/* Bottom Left: Location (Origin) */}
                <div className="absolute bottom-10 left-10 animate-pop-in-delay-2 z-10">
                    <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center border border-white/20 shadow-xl animate-float">
                        <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-amber-500/30">
                            <MapPin size={20} className="text-white" />
                        </div>
                        <span className="text-white text-[10px] font-bold uppercase tracking-wider opacity-80">{t('city_yokneam')}</span>
                    </div>
                </div>

                {/* Top Left: Eco Friendly */}
                <div className="absolute top-10 left-0 animate-pop-in-delay-3 z-0">
                    <div className="w-20 h-20 bg-emerald-900/40 backdrop-blur-md rounded-full flex items-center justify-center border border-emerald-500/30 shadow-lg animate-float-slow">
                        <Leaf size={32} className="text-emerald-400" />
                    </div>
                </div>

                {/* Bottom Right: Time/Schedule */}
                <div className="absolute bottom-20 right-0 animate-pop-in-delay-1 z-0">
                    <div className="w-16 h-16 bg-blue-900/40 backdrop-blur-md rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-lg animate-float-delayed">
                        <Clock size={28} className="text-blue-300" />
                    </div>
                </div>

                {/* Far Left: Community */}
                <div className="absolute top-1/2 left-[-20px] -translate-y-1/2 animate-pop-in-delay-2 z-10">
                    <div className="bg-white text-indigo-900 px-4 py-2 rounded-xl shadow-xl flex items-center gap-2 font-bold text-sm transform -rotate-6 hover:rotate-0 transition-transform cursor-default animate-float">
                        <Users size={16} className="text-indigo-600" />
                        <span>{t('community')}</span>
                    </div>
                </div>

                {/* Far Right: Safety */}
                <div className="absolute top-1/3 right-[-10px] animate-pop-in-delay-3 z-10">
                    <div className="w-14 h-14 bg-indigo-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30 animate-float-slow border-2 border-white/20">
                        <Shield size={24} className="text-white" />
                    </div>
                </div>

                 <div className="absolute bottom-0 left-1/2 animate-pop-in-delay-1 z-30">
                    <div className="bg-white text-slate-800 p-2 rounded-t-xl rounded-br-xl rounded-bl-none shadow-lg transform translate-y-8 -translate-x-12 animate-bounce-slow">
                        <MessageCircle size={20} className="fill-indigo-100 text-indigo-600" />
                    </div>
                </div>

            </div>

            <div className="relative z-40 text-center mt-8 max-w-lg">
                <h1 className="text-4xl lg:text-5xl font-black text-white mb-4 drop-shadow-xl animate-slide-up">
                    {t('app_title')}
                </h1>
                <p className="text-lg text-indigo-100 font-medium leading-relaxed drop-shadow-md animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    {t('hero_subtitle')}
                </p>
                <div className="mt-8 flex justify-center gap-2 animate-slide-up" style={{ animationDelay: '0.4s' }}>
                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" style={{ animationDelay: '0.3s'}}></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" style={{ animationDelay: '0.6s'}}></div>
                </div>
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-15px); }
                }
                @keyframes float-delayed {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                @keyframes float-slow {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes pop-in {
                    0% { transform: scale(0); opacity: 0; }
                    70% { transform: scale(1.1); }
                    100% { transform: scale(1); opacity: 1; }
                }
                @keyframes bounce-slow {
                    0%, 100% { transform: translateY(0) translateX(-3rem); }
                    50% { transform: translateY(-5px) translateX(-3rem); }
                }
                .animate-float { animation: float 6s ease-in-out infinite; }
                .animate-float-delayed { animation: float-delayed 5s ease-in-out infinite 1s; }
                .animate-float-slow { animation: float-slow 8s ease-in-out infinite 0.5s; }
                .animate-bounce-slow { animation: bounce-slow 3s ease-in-out infinite; }
                .animate-pop-in { animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
                .animate-pop-in-delay-1 { opacity: 0; animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s forwards; }
                .animate-pop-in-delay-2 { opacity: 0; animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.4s forwards; }
                .animate-pop-in-delay-3 { opacity: 0; animation: pop-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.6s forwards; }
            `}</style>
        </div>
    );
};

export default HeroSection;
