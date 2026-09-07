/**
 * SYNTRONIX '26 — Admin Portal
 * Type Definitions & System Schemas
 * Designed & Developed by Aegis Academy
 */

export type UserRole = 'OVERALL_ADMIN' | 'EVENT_COORDINATOR';

export type AccountStatus = 'ACTIVE' | 'INACTIVE';

export interface AdminUser {
  adminId: string;
  adminName: string;
  email: string;
  role: 'OVERALL_ADMIN';
  status: AccountStatus;
  createdAt: string;
}

export interface CoordinatorUser {
  coordinatorId: string;
  coordinatorName: string;
  email: string;
  assignedEvent: string;
  status: AccountStatus;
  createdAt: string;
  lastLogin?: string;
}

export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    assignedEvent?: string;
  };
  token: string;
  expiresAt: number;
}

export interface SymposiumEvent {
  eventId: string;
  eventName: string;
  isPlaceholder?: boolean;
  category: 'TECHNICAL' | 'NON_TECHNICAL';
  description?: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
}

export interface JuryMember {
  juryId: string;
  juryName: string;
  event: string;
  status: AccountStatus;
  createdAt: string;
}

export interface AttendanceRecord {
  id?: string;
  timestamp: string;
  uniqueId: string;
  participantName: string;
  universityRegNumber: string;
  email: string;
  mobileNumber: string;
  collegeName: string;
  fieldOfStudy: string;
  department: string;
  teamName: string;
  leaderName: string;
  membersName: string;
  registeredEvents: string[];
  scannedEvent: string;
  coordinatorName: string;
  attendanceDate: string;
  attendanceTime: string;
  attendanceStatus: 'PRESENT';
}

export type ScanResultCode =
  | 'SUCCESS'
  | 'ALREADY_MARKED'
  | 'NOT_REGISTERED'
  | 'INVALID_QR'
  | 'UNAUTHORIZED'
  | 'ERROR';

export interface ScanLog {
  timestamp: string;
  uniqueId: string;
  participantName: string;
  coordinatorName: string;
  coordinatorAssignedEvent: string;
  scannedEvent: string;
  result: ScanResultCode;
  message: string;
}

export interface QrResetLog {
  timestamp: string;
  uniqueId: string;
  adminName: string;
  reason: string;
  previousStatus: string;
  newStatus: string;
  event: string;
}

export interface ParticipantQRData {
  unique_id: string;
  uniqueId: string;
  name: string;
  registrationNo: string;
  universityRegistrationNumber: string;
  email: string;
  mobile: string;
  mobileNumber: string;
  college: string;
  collegeName: string;
  fieldOfStudy: string;
  department: string;
  teamName: string;
  leaderName: string;
  members: string;
  membersName: string;
  degree: string;
  year: string;
  collegeLocation: string;
  teamLeaderEmail: string;
  member1Mobile: string;
  member2Mobile: string;
  selectedEvents: string;
  registeredEvents: string[];
  event?: string;
  timestamp?: string;
  [key: string]: any;
}

export interface ScanResponse {
  result: ScanResultCode;
  message: string;
  participant?: ParticipantQRData;
  scannedEvent: string;
  coordinatorName: string;
  timestamp: string;
  previousScan?: {
    coordinatorName: string;
    scanTime: string;
    scannedEvent: string;
  };
  allEventsCompleted?: boolean;
  attendedEvents?: string[];
  attendanceRecord?: AttendanceRecord;
}

export interface SystemStats {
  totalParticipants: number;
  totalAttendance: number;
  activeCoordinators: number;
  totalEvents: number;
  eventWiseAttendance: {
    eventName: string;
    count: number;
  }[];
  recentScans: {
    uniqueId: string;
    participantName: string;
    scannedEvent: string;
    coordinatorName: string;
    attendanceTime: string;
    result: ScanResultCode;
  }[];
}

export interface CoordinatorStats {
  todayAttendance: number;
  totalScans: number;
  alreadyMarkedAttempts: number;
  recentScans: {
    uniqueId: string;
    time: string;
    result: ScanResultCode;
  }[];
}

export interface BackendConfig {
  googleAppsScriptUrl: string;
  isCustomGasConfigured: boolean;
  adminAccessKeyConfigured: boolean;
  connectionStatus: 'CONNECTED' | 'FALLBACK_READY' | 'DISCONNECTED';
  backendMode: 'GOOGLE_APPS_SCRIPT' | 'EMULATED_LOCAL';
  adminAccessKey?: string;
}

export type AdminStats = SystemStats;
export type ResetLog = QrResetLog;
