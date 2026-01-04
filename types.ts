
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    displayName: string | null;
    displayNameEn?: string | null; // Added English Name
    email: string | null;
    phoneNumber: string;
    photoURL?: string;
    isAdmin?: boolean; // Admin privilege flag
    createdAt?: Timestamp; // Added for sorting
    privacySettings?: {
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
    requestedPickupLocation?: string; // Where the passenger wants to be picked up
}

export interface Trip {
    id: string;
    type: TripType; // 'offer' = Driver offering, 'request' = Passenger seeking
    driverId: string;
    driverName: string;
    driverNameEn?: string; // Added English Name for the driver on the trip
    driverPhoto?: string; 
    direction: Direction;
    departureTime: Timestamp;
    availableSeats: number; // For offer: seats available. For request: seats needed.
    pickupLocation?: string;
    passengers: Passenger[];
    isClosed?: boolean; // Manual override to close a trip even if seats exist
    
    // Recurring features
    isRecurring?: boolean;
    recurringDays?: number[]; // 0=Sunday, 1=Monday...
}

export type NotificationType = 'join' | 'cancel' | 'match' | 'info' | 'request' | 'approved' | 'invite' | 'invite_accepted' | 'invite_rejected' | 'report_status';

export interface AppNotification {
    id: string;
    userId: string; // The recipient
    type: NotificationType;
    title: string;
    message: string;
    relatedTripId?: string; // The trip ID involved
    metadata?: any; // Extra data like inviter name, time, etc.
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
    text: string;
    createdAt: Timestamp;
}

export type BadgeType = 'newcomer' | 'frequent_flyer' | 'driver_pro' | 'community_legend';

export interface Translations {
    [key: string]: {
        [key: string]: string;
    };
}
