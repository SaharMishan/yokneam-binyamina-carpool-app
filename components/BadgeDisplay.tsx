
import React, { useState, useEffect } from 'react';
import { useLocalization } from '../context/LocalizationContext';
import { BadgeType } from '../types';
import { Shield, Zap, Star, Crown, Loader2 } from 'lucide-react';
import { db } from '../services/firebase';

interface BadgeDisplayProps {
    userId?: string; // If provided, fetches stats internally.
    ridesGiven?: number; // Optional override
    ridesTaken?: number; // Optional override
    size?: 'sm' | 'md' | 'lg';
}

const BadgeDisplay: React.FC<BadgeDisplayProps> = ({ userId, ridesGiven, ridesTaken, size = 'md' }) => {
    const { t } = useLocalization();
    const [stats, setStats] = useState({ given: ridesGiven || 0, taken: ridesTaken || 0 });
    const [loading, setLoading] = useState(!ridesGiven && !ridesTaken && !!userId);

    useEffect(() => {
        // If IDs are provided but numbers aren't, fetch them
        if (userId && (ridesGiven === undefined || ridesTaken === undefined)) {
            const fetchStats = async () => {
                setLoading(true);
                const s = await db.getUserStats(userId);
                setStats(s);
                setLoading(false);
            };
            fetchStats();
        } else {
            setStats({ given: ridesGiven || 0, taken: ridesTaken || 0 });
            setLoading(false);
        }
    }, [userId, ridesGiven, ridesTaken]);

    const badges: { type: BadgeType, icon: any, color: string, label: string }[] = [];
    const totalRides = stats.given + stats.taken;

    // Logic for Badges
    if (totalRides < 3) {
        badges.push({ type: 'newcomer', icon: Shield, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'badge_newcomer' });
    }
    if (stats.taken >= 5) {
        badges.push({ type: 'frequent_flyer', icon: Zap, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', label: 'badge_frequent_flyer' });
    }
    if (stats.given >= 5) {
        badges.push({ type: 'driver_pro', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: 'badge_driver_pro' });
    }
    if (totalRides >= 20) {
        badges.push({ type: 'community_legend', icon: Crown, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20', label: 'badge_community_legend' });
    }

    if (loading) return <div className="w-6 h-6 animate-pulse bg-slate-200 dark:bg-slate-700 rounded-full"></div>;
    if (badges.length === 0) return null;

    const sizeClasses = size === 'sm' ? 'p-1' : (size === 'lg' ? 'p-2' : 'p-1.5');
    const iconSize = size === 'sm' ? 12 : (size === 'lg' ? 20 : 16);

    return (
        <div className="flex flex-wrap gap-2 animate-fade-in">
            {badges.map(b => (
                <div key={b.type} className={`flex items-center gap-1.5 rounded-lg border border-transparent ${b.color} ${sizeClasses}`} title={t(b.label)}>
                    <b.icon size={iconSize} className="shrink-0" fill={b.type === 'driver_pro' || b.type === 'community_legend' ? "currentColor" : "none"} />
                    {size !== 'sm' && <span className="text-[10px] font-bold uppercase tracking-wide opacity-90">{t(b.label)}</span>}
                </div>
            ))}
        </div>
    );
};

export default BadgeDisplay;
