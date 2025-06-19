export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'employee';
  department: string;
  notificationSettings?: {
    enabled: boolean;
    attendanceReminders: boolean;
    approvalAlerts: boolean;
    systemUpdates: boolean;
  };
  roleRequestStatus?: {
    lastRequested?: number; // timestamp of last request
    lastRejected?: number;  // timestamp when request was rejected
    status?: 'pending' | 'rejected' | 'approved';
  };
  assignedLocation?: {
    name: string;
    latitude: string;
    longitude: string;
    radius: string;
  };
}

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radius: number; // in meters
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  locationId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  status: 'checked-in' | 'checked-out';
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

export interface GeofenceRegion {
  identifier: string;
  latitude: number;
  longitude: number;
  radius: number;
  notifyOnEnter?: boolean;
  notifyOnExit?: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  type: 'attendance' | 'role_request' | 'system' | 'approval';
  actionLink?: string;
} 