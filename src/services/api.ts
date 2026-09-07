/**
 * SYNTRONIX '26 — Admin Portal
 * Frontend API Service Layer
 * Designed & Developed by Aegis Academy
 */

import {
  AuthSession,
  SymposiumEvent,
  CoordinatorUser,
  JuryMember,
  AttendanceRecord,
  ScanLog,
  QrResetLog,
  SystemStats,
  CoordinatorStats,
  ScanResponse,
  ParticipantQRData,
  BackendConfig,
} from '../types';

const API_BASE = '/api';

export async function adminLogin(
  adminName: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/admin-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ adminName, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Authentication failed');
  }

  const session: AuthSession = {
    user: data.user,
    token: data.token,
    expiresAt: data.expiresAt,
  };
  setStoredSession(session);
  return session;
}

export async function coordinatorLogin(
  email: string,
  password: string
): Promise<AuthSession> {
  const res = await fetch(`${API_BASE}/auth/coordinator-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Invalid email or password.');
  }

  const session: AuthSession = {
    user: data.user,
    token: data.token,
    expiresAt: data.expiresAt,
  };
  setStoredSession(session);
  return session;
}

export async function getEvents(): Promise<SymposiumEvent[]> {
  const res = await fetch(`${API_BASE}/events`);
  const data = await res.json();
  return data.events || [];
}

export async function createEvent(eventData: Partial<SymposiumEvent>): Promise<SymposiumEvent> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to create event');
  }
  return data.event;
}

export async function updateEvent(
  eventId: string,
  eventData: Partial<SymposiumEvent>
): Promise<SymposiumEvent> {
  const res = await fetch(`${API_BASE}/events/${eventId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update event');
  }
  return data.event;
}

export async function getCoordinators(event?: string): Promise<CoordinatorUser[]> {
  const url = event ? `${API_BASE}/coordinators?event=${encodeURIComponent(event)}` : `${API_BASE}/coordinators`;
  const res = await fetch(url);
  const data = await res.json();
  return data.coordinators || [];
}

export async function addCoordinator(coordinatorData: {
  coordinatorName: string;
  email: string;
  password: string;
  assignedEvent: string;
}): Promise<CoordinatorUser> {
  const res = await fetch(`${API_BASE}/coordinators`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coordinatorData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to add coordinator');
  }
  return data.coordinator;
}

export async function updateCoordinator(
  coordinatorId: string,
  coordinatorData: Partial<CoordinatorUser> & { password?: string }
): Promise<CoordinatorUser> {
  const res = await fetch(`${API_BASE}/coordinators/${coordinatorId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(coordinatorData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update coordinator');
  }
  return data.coordinator;
}

export async function deactivateCoordinator(coordinatorId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/coordinators/${coordinatorId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to deactivate coordinator');
  }
}

export async function getJury(event?: string): Promise<JuryMember[]> {
  const url = event ? `${API_BASE}/jury?event=${encodeURIComponent(event)}` : `${API_BASE}/jury`;
  const res = await fetch(url);
  const data = await res.json();
  return data.jury || [];
}

export async function addJury(juryData: {
  juryName: string;
  event: string;
}): Promise<JuryMember> {
  const res = await fetch(`${API_BASE}/jury`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(juryData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to add jury member');
  }
  return data.jury;
}

export async function updateJury(
  juryId: string,
  juryData: Partial<JuryMember>
): Promise<JuryMember> {
  const res = await fetch(`${API_BASE}/jury/${juryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(juryData),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update jury member');
  }
  return data.jury;
}

export async function deactivateJury(juryId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/jury/${juryId}`, {
    method: 'DELETE',
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to deactivate jury member');
  }
}

export async function markAttendance(
  participant: ParticipantQRData,
  coordinatorName: string,
  coordinatorAssignedEvent: string
): Promise<ScanResponse> {
  const res = await fetch(`${API_BASE}/attendance/mark`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      participant,
      coordinatorName,
      coordinatorAssignedEvent,
    }),
  });
  const data = await res.json();
  return data;
}

export async function getAttendance(event?: string): Promise<AttendanceRecord[]> {
  const url = event ? `${API_BASE}/attendance?event=${encodeURIComponent(event)}` : `${API_BASE}/attendance`;
  const res = await fetch(url);
  const data = await res.json();
  return data.attendance || [];
}

export async function getCoordinatorStats(assignedEvent: string): Promise<CoordinatorStats> {
  const res = await fetch(`${API_BASE}/stats/coordinator?assignedEvent=${encodeURIComponent(assignedEvent)}`);
  const data = await res.json();
  return (
    data.stats || {
      todayAttendance: 0,
      totalScans: 0,
      alreadyMarkedAttempts: 0,
      recentScans: [],
    }
  );
}

export async function getSystemStats(): Promise<SystemStats> {
  const res = await fetch(`${API_BASE}/stats/overall`);
  const data = await res.json();
  return (
    data.stats || {
      totalParticipants: 0,
      totalAttendance: 0,
      activeCoordinators: 0,
      totalEvents: 0,
      eventWiseAttendance: [],
      recentScans: [],
    }
  );
}

export async function getScanLogs(limit = 100): Promise<ScanLog[]> {
  const res = await fetch(`${API_BASE}/scan-logs?limit=${limit}`);
  const data = await res.json();
  return data.logs || [];
}

export async function resetAttendance(
  uniqueId: string,
  event: string,
  adminName: string,
  reason: string
): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/attendance/reset`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uniqueId, event, adminName, reason }),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to reset attendance');
  }
  return data;
}

export async function getResetLogs(): Promise<QrResetLog[]> {
  const res = await fetch(`${API_BASE}/reset-logs`);
  const data = await res.json();
  return data.logs || [];
}

export async function getBackendConfig(): Promise<BackendConfig> {
  const res = await fetch(`${API_BASE}/config`);
  return res.json();
}

export async function updateBackendConfig(payload: {
  googleAppsScriptUrl?: string;
  adminAccessKey?: string;
  authKey?: string;
}): Promise<any> {
  const res = await fetch(`${API_BASE}/config/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Failed to update configuration');
  }
  return data;
}

export async function testGasConnection(testUrl: string): Promise<any> {
  const res = await fetch(`${API_BASE}/config/test-gas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ testUrl }),
  });
  return res.json();
}

// Session LocalStorage Helpers
const SESSION_STORAGE_KEY = 'syntronix_admin_session_v1';

export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Check expiration
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession): void {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch (e) {
    console.warn('Failed to save session to localStorage:', e);
  }
}

export function clearStoredSession(): void {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear session from localStorage:', e);
  }
}

// Aliases for component convenience
export const scanParticipantQR = markAttendance;
export const getSystemConfig = getBackendConfig;
export const updateSystemConfig = updateBackendConfig;
export const testGASConnection = testGasConnection;
export const getAdminStats = getSystemStats;
