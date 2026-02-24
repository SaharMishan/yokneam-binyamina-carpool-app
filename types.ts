
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    displayName: string | null;
    displayNameEn?: string | null;
    email: string | null;
    phoneNumber: string;
    photoURL?: string;
    isAdmin?: boolean;
    createdAt?: Timestamp;
    privacySettings: {
        profileVisibility: 'public' | 'private';
        notificationsEnabled: boolean;
    };
    carDetails?: {
        model: string;
        color: string;
        plateNumber: string;
    };
}

export enum Direction {
    YOKNEAM_TO_BINYAMINA = 'Yokneam -> Binyamina',
    BINYAMINA_TO_YOKNEAM = 'Binyamina -> Yokneam',
}

export type TripType = 'offer' | 'request';

export type PassengerStatus = 'pending' | 'approved';

export interface Passenger {
    uid: string;
    name: string;
    photo?: string;
    phoneNumber?: string;
    status: PassengerStatus;
    requestedPickupLocation?: string;
}

export interface Trip {
    id: string;
    type: TripType;
    driverId: string;
    driverName: string;
    driverNameEn?: string;
    driverPhoto?: string; 
    direction: Direction;
    departureTime: Timestamp;
    availableSeats: number;
    pickupLocation?: string;
    passengers: Passenger[];
    isClosed?: boolean;
    isRecurring?: boolean;
    recurringDays?: number[];
}

export type NotificationType = 'join' | 'cancel' | 'match' | 'info' | 'request' | 'approved' | 'invite' | 'invite_accepted' | 'invite_rejected' | 'report_status';

export interface AppNotification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    relatedTripId?: string;
    metadata?: any;
    isRead: boolean;
    createdAt: Timestamp;
}

export interface Report {
    id: string;
    userId: string;
    userName: string;
    userPhoto?: string;
    type: 'bug' | 'improvement';
    description: string;
    status: 'open' | 'resolved';
    createdAt: Timestamp;
    resolvedAt?: Timestamp;
}

export interface ChatMessage {
    id: string;
    tripId: string;
    senderId: string;
    senderName: string;
    text?: string;
    imageUrl?: string;
    audioUrl?: string;
    audioDuration?: number;
    location?: {
        lat: number;
        lng: number;
    };
    type: 'text' | 'image' | 'location' | 'audio';
    createdAt: Timestamp;
}

export type BadgeType = 'newcomer' | 'frequent_flyer' | 'driver_pro' | 'community_legend';

export interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}
