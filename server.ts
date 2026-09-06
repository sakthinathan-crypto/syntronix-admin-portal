import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// CONFIGURATION & SECRETS (Kept strictly on backend)
// ---------------------------------------------------------------------------
let GOOGLE_APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';
let ADMIN_ACCESS_KEY = process.env.ADMIN_ACCESS_KEY || 'aegis-syntronix-2026-key';

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + 'SYNTRONIX_AEGIS_2026_SALT')
    .digest('hex');
}

// ---------------------------------------------------------------------------
// IN-MEMORY GOOGLE SHEETS EMULATION DATABASE (Matches Google Sheets exact schema)
// Used when GOOGLE_APPS_SCRIPT_URL is not yet connected or during local dev
// ---------------------------------------------------------------------------
interface AdminRow {
  adminId: string;
  adminName: string;
  email: string;
  passwordHash: string;
  role: 'OVERALL_ADMIN';
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface CoordinatorRow {
  coordinatorId: string;
  coordinatorName: string;
  email: string;
  passwordHash: string;
  assignedEvent: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  lastLogin?: string;
}

interface EventRow {
  eventId: string;
  eventName: string;
  category: 'TECHNICAL' | 'NON_TECHNICAL';
  isPlaceholder?: boolean;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
  createdAt: string;
  description?: string;
}

interface JuryRow {
  juryId: string;
  juryName: string;
  event: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

interface AttendanceRow {
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

interface ScanLogRow {
  timestamp: string;
  uniqueId: string;
  participantName: string;
  coordinatorName: string;
  coordinatorAssignedEvent: string;
  scannedEvent: string;
  result: 'SUCCESS' | 'ALREADY_MARKED' | 'NOT_REGISTERED' | 'INVALID_QR' | 'UNAUTHORIZED' | 'ERROR';
  message: string;
}

interface QrResetLogRow {
  timestamp: string;
  uniqueId: string;
  adminName: string;
  reason: string;
  previousStatus: string;
  newStatus: string;
  event: string;
}

// Initial Overall Admin: Sakthinathan / Aegis.CEO@03
const initialAdmins: AdminRow[] = [
  {
    adminId: 'ADM-001',
    adminName: 'Sakthinathan',
    email: 'admin@syntronix26.egspec.ac.in',
    passwordHash: hashPassword('Aegis.CEO@03'),
    role: 'OVERALL_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

// Initial Events
const initialEvents: EventRow[] = [
  {
    eventId: 'EVT-001',
    eventName: 'Paper Presentation',
    category: 'TECHNICAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: 'Technical Paper Presentation on emerging engineering disciplines',
  },
  {
    eventId: 'EVT-002',
    eventName: 'Poster Making',
    category: 'TECHNICAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: 'Creative poster designing and technical exhibition',
  },
  {
    eventId: 'EVT-003',
    eventName: 'Non-Technical Event 1',
    category: 'NON_TECHNICAL',
    isPlaceholder: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: 'Temporary placeholder - editable by Overall Admin',
  },
  {
    eventId: 'EVT-004',
    eventName: 'Non-Technical Event 2',
    category: 'NON_TECHNICAL',
    isPlaceholder: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: 'Temporary placeholder - editable by Overall Admin',
  },
  {
    eventId: 'EVT-005',
    eventName: 'Non-Technical Event 3',
    category: 'NON_TECHNICAL',
    isPlaceholder: true,
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: 'Temporary placeholder - editable by Overall Admin',
  },
];

// Initial Coordinators:
// 1. Dr. G. Pushpa AP/CSE
// 2. Mrs. L. Mohana Priya AP/CSE
// 3. Convenor: Dr. K. Balasubramaniam Head/CSE
const initialCoordinators: CoordinatorRow[] = [
  {
    coordinatorId: 'CRD-001',
    coordinatorName: 'Dr. G. Pushpa (AP/CSE)',
    email: 'pushpa.cse@egspec.ac.in',
    passwordHash: hashPassword('Coord@123'),
    assignedEvent: 'Paper Presentation',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-002',
    coordinatorName: 'Mrs. L. Mohana Priya (AP/CSE)',
    email: 'mohanapriya.cse@egspec.ac.in',
    passwordHash: hashPassword('Coord@123'),
    assignedEvent: 'Poster Making',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-003',
    coordinatorName: 'Dr. K. Balasubramaniam (Head/CSE, Convenor)',
    email: 'convenor.cse@egspec.ac.in',
    passwordHash: hashPassword('Coord@123'),
    assignedEvent: 'Paper Presentation',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

// In-Memory Database Store
const db = {
  admins: [...initialAdmins],
  coordinators: [...initialCoordinators],
  events: [...initialEvents],
  jury: [] as JuryRow[],
  attendance: [] as AttendanceRow[],
  scanLogs: [] as ScanLogRow[],
  qrResetLogs: [] as QrResetLogRow[],
  systemSettings: {} as Record<string, string>,
};

// Global Mutex for LockService concurrency simulation
let isLocked = false;
async function acquireLock(timeoutMs = 10000): Promise<boolean> {
  const start = Date.now();
  while (isLocked) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  isLocked = true;
  return true;
}
function releaseLock() {
  isLocked = false;
}

// ---------------------------------------------------------------------------
// GOOGLE APPS SCRIPT FORWARDER
// ---------------------------------------------------------------------------
async function forwardToGoogleAppsScript(action: string, payload: any) {
  if (!GOOGLE_APPS_SCRIPT_URL) {
    return null;
  }
  try {
    const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`GAS returned status ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Failed to forward to GAS:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// REST API ROUTES
// ---------------------------------------------------------------------------

// 1. System Config & Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    hasGasUrl: Boolean(GOOGLE_APPS_SCRIPT_URL),
    mode: GOOGLE_APPS_SCRIPT_URL ? 'GOOGLE_APPS_SCRIPT' : 'EMULATED_LOCAL',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    googleAppsScriptUrl: GOOGLE_APPS_SCRIPT_URL,
    isCustomGasConfigured: Boolean(GOOGLE_APPS_SCRIPT_URL),
    adminAccessKeyConfigured: Boolean(ADMIN_ACCESS_KEY),
    connectionStatus: GOOGLE_APPS_SCRIPT_URL ? 'CONNECTED' : 'FALLBACK_READY',
    backendMode: GOOGLE_APPS_SCRIPT_URL ? 'GOOGLE_APPS_SCRIPT' : 'EMULATED_LOCAL',
  });
});

app.post('/api/config/update', (req, res) => {
  const { googleAppsScriptUrl, adminAccessKey, authKey } = req.body;
  // Can only update if admin access key matches
  if (authKey !== ADMIN_ACCESS_KEY && ADMIN_ACCESS_KEY) {
    res.status(403).json({ success: false, error: 'Unauthorized configuration update.' });
    return;
  }
  if (googleAppsScriptUrl !== undefined) {
    GOOGLE_APPS_SCRIPT_URL = googleAppsScriptUrl.trim();
  }
  if (adminAccessKey && adminAccessKey.trim()) {
    ADMIN_ACCESS_KEY = adminAccessKey.trim();
  }
  res.json({
    success: true,
    message: 'Backend configuration updated successfully.',
    config: {
      googleAppsScriptUrl: GOOGLE_APPS_SCRIPT_URL,
      isCustomGasConfigured: Boolean(GOOGLE_APPS_SCRIPT_URL),
    },
  });
});

app.post('/api/config/test-gas', async (req, res) => {
  const { testUrl } = req.body;
  const target = testUrl || GOOGLE_APPS_SCRIPT_URL;
  if (!target) {
    res.json({ success: false, error: 'No Google Apps Script URL provided.' });
    return;
  }
  try {
    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'ping' }),
      redirect: 'follow',
    });
    const json = await resp.json();
    res.json({ success: true, result: json });
  } catch (err: any) {
    res.json({ success: false, error: 'Connection failed: ' + err.message });
  }
});

// 2. OVERALL ADMIN AUTHENTICATION
app.post('/api/auth/admin-login', async (req, res) => {
  const { adminAccessKey, adminName, password } = req.body;

  // 1. Verify master access key
  if (adminAccessKey !== ADMIN_ACCESS_KEY) {
    res.status(401).json({ success: false, error: 'Invalid Admin Access Key.' });
    return;
  }

  // 2. Try forwarding to GAS if configured
  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('adminAuth', { adminName, password });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  // 3. Fallback verification
  const trimmedName = (adminName || '').trim();
  const inputHash = hashPassword(password || '');

  const admin = db.admins.find(
    (a) => a.adminName.toLowerCase() === trimmedName.toLowerCase()
  );

  if (!admin || admin.passwordHash !== inputHash) {
    res.status(401).json({ success: false, error: 'Invalid admin credentials.' });
    return;
  }

  if (admin.status !== 'ACTIVE') {
    res.status(403).json({ success: false, error: 'Admin account is deactivated.' });
    return;
  }

  const token = Buffer.from(`${admin.adminName}|OVERALL_ADMIN|${Date.now()}`).toString('base64');

  res.json({
    success: true,
    user: {
      id: admin.adminId,
      name: admin.adminName,
      email: admin.email,
      role: 'OVERALL_ADMIN',
    },
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
});

// 3. COORDINATOR AUTHENTICATION
app.post('/api/auth/coordinator-login', async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = (email || '').trim().toLowerCase();

  // Try GAS first if configured
  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('coordinatorAuth', { email: trimmedEmail, password });
    if (gasResult) {
      if (gasResult.success) {
        res.json(gasResult);
      } else {
        res.status(401).json({ success: false, error: gasResult.error || 'Invalid email or password.' });
      }
      return;
    }
  }

  // Fallback verification
  const inputHash = hashPassword(password || '');
  const coord = db.coordinators.find((c) => c.email.toLowerCase() === trimmedEmail);

  if (!coord || coord.passwordHash !== inputHash) {
    // Exact prompt specification: "Invalid email or password." Do not reveal which credential was incorrect.
    res.status(401).json({ success: false, error: 'Invalid email or password.' });
    return;
  }

  if (coord.status !== 'ACTIVE') {
    res.status(403).json({ success: false, error: 'Coordinator account is inactive. Please contact Overall Admin.' });
    return;
  }

  coord.lastLogin = new Date().toISOString();
  const token = Buffer.from(`${coord.email}|EVENT_COORDINATOR|${Date.now()}`).toString('base64');

  res.json({
    success: true,
    user: {
      id: coord.coordinatorId,
      name: coord.coordinatorName,
      email: coord.email,
      role: 'EVENT_COORDINATOR',
      assignedEvent: coord.assignedEvent,
    },
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
});

// 4. EVENTS ENDPOINTS
app.get('/api/events', async (req, res) => {
  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getEvents', {});
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }
  res.json({ success: true, events: db.events });
});

app.post('/api/events', async (req, res) => {
  const { eventName, category, description } = req.body;
  if (!eventName) {
    res.status(400).json({ success: false, error: 'Event name is required.' });
    return;
  }

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('createEvent', req.body);
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const newEvent: EventRow = {
    eventId: `EVT-${String(db.events.length + 1).padStart(3, '0')}`,
    eventName: eventName.trim(),
    category: category || 'TECHNICAL',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    description: description || '',
  };

  db.events.push(newEvent);
  res.json({ success: true, event: newEvent });
});

app.put('/api/events/:id', async (req, res) => {
  const eventId = req.params.id;
  const { eventName, category, status, description } = req.body;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('updateEvent', { eventId, ...req.body });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const evt = db.events.find((e) => e.eventId === eventId);
  if (!evt) {
    res.status(404).json({ success: false, error: 'Event not found.' });
    return;
  }

  if (eventName) {
    evt.eventName = eventName.trim();
    evt.isPlaceholder = false;
  }
  if (category) evt.category = category;
  if (status) evt.status = status;
  if (description !== undefined) evt.description = description;

  res.json({ success: true, event: evt });
});

// 5. COORDINATORS MANAGEMENT (Overall Admin)
app.get('/api/coordinators', async (req, res) => {
  const event = req.query.event as string | undefined;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getCoordinators', { event });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  let list = db.coordinators;
  if (event) {
    list = list.filter((c) => c.assignedEvent.toLowerCase() === event.toLowerCase());
  }

  // Hide password hash
  const safeList = list.map(({ passwordHash, ...rest }) => rest);
  res.json({ success: true, coordinators: safeList });
});

app.post('/api/coordinators', async (req, res) => {
  const { coordinatorName, email, password, assignedEvent } = req.body;

  if (!coordinatorName || !email || !password || !assignedEvent) {
    res.status(400).json({ success: false, error: 'All coordinator fields are required.' });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('addCoordinator', req.body);
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  if (db.coordinators.some((c) => c.email.toLowerCase() === trimmedEmail)) {
    res.status(400).json({ success: false, error: 'A coordinator with this email already exists.' });
    return;
  }

  const newCoordinator: CoordinatorRow = {
    coordinatorId: `CRD-${String(db.coordinators.length + 1).padStart(3, '0')}`,
    coordinatorName: coordinatorName.trim(),
    email: trimmedEmail,
    passwordHash: hashPassword(password),
    assignedEvent: assignedEvent.trim(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.coordinators.push(newCoordinator);
  const { passwordHash, ...safe } = newCoordinator;
  res.json({ success: true, coordinator: safe });
});

app.put('/api/coordinators/:id', async (req, res) => {
  const coordinatorId = req.params.id;
  const { coordinatorName, assignedEvent, status, password } = req.body;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('updateCoordinator', { coordinatorId, ...req.body });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const coord = db.coordinators.find((c) => c.coordinatorId === coordinatorId);
  if (!coord) {
    res.status(404).json({ success: false, error: 'Coordinator not found.' });
    return;
  }

  if (coordinatorName) coord.coordinatorName = coordinatorName.trim();
  if (assignedEvent) coord.assignedEvent = assignedEvent.trim();
  if (status) coord.status = status;
  if (password) coord.passwordHash = hashPassword(password);

  const { passwordHash, ...safe } = coord;
  res.json({ success: true, coordinator: safe });
});

app.delete('/api/coordinators/:id', async (req, res) => {
  const coordinatorId = req.params.id;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('deactivateCoordinator', { coordinatorId });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const coord = db.coordinators.find((c) => c.coordinatorId === coordinatorId);
  if (!coord) {
    res.status(404).json({ success: false, error: 'Coordinator not found.' });
    return;
  }
  coord.status = 'INACTIVE';
  res.json({ success: true, message: 'Coordinator deactivated successfully.' });
});

// 6. JURY MANAGEMENT
app.get('/api/jury', async (req, res) => {
  const event = req.query.event as string | undefined;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getJury', { event });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  let list = db.jury;
  if (event) {
    list = list.filter((j) => j.event.toLowerCase() === event.toLowerCase());
  }
  res.json({ success: true, jury: list });
});

app.post('/api/jury', async (req, res) => {
  const { juryName, event } = req.body;
  if (!juryName || !event) {
    res.status(400).json({ success: false, error: 'Jury name and event are required.' });
    return;
  }

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('addJury', req.body);
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const newJury: JuryRow = {
    juryId: `JRY-${String(db.jury.length + 1).padStart(3, '0')}`,
    juryName: juryName.trim(),
    event: event.trim(),
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  };

  db.jury.push(newJury);
  res.json({ success: true, jury: newJury });
});

app.put('/api/jury/:id', async (req, res) => {
  const juryId = req.params.id;
  const { juryName, event, status } = req.body;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('updateJury', { juryId, ...req.body });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const jury = db.jury.find((j) => j.juryId === juryId);
  if (!jury) {
    res.status(404).json({ success: false, error: 'Jury not found.' });
    return;
  }
  if (juryName) jury.juryName = juryName.trim();
  if (event) jury.event = event.trim();
  if (status) jury.status = status;

  res.json({ success: true, jury });
});

app.delete('/api/jury/:id', async (req, res) => {
  const juryId = req.params.id;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('deactivateJury', { juryId });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const jury = db.jury.find((j) => j.juryId === juryId);
  if (!jury) {
    res.status(404).json({ success: false, error: 'Jury not found.' });
    return;
  }
  jury.status = 'INACTIVE';
  res.json({ success: true, message: 'Jury member deactivated successfully.' });
});

// 7. QR CODE ATTENDANCE MARKING WITH STRICT CHECKS & LOCK
app.post('/api/attendance/mark', async (req, res) => {
  const { participant, coordinatorName, coordinatorAssignedEvent } = req.body;

  if (!participant || !participant.uniqueId) {
    logScan('', 'Unknown', coordinatorName || '', coordinatorAssignedEvent || '', coordinatorAssignedEvent || '', 'INVALID_QR', 'Missing participant details in QR');
    res.json({
      success: false,
      result: 'INVALID_QR',
      message: 'Invalid or incomplete QR data.',
    });
    return;
  }

  const uniqueId = String(participant.uniqueId).trim();
  const participantName = String(participant.name || '').trim();
  const assignedEvent = (coordinatorAssignedEvent || '').trim();
  const coordName = coordinatorName || 'Coordinator';

  // Registered Events
  const rawEvents = participant.registeredEvents;
  let registeredEvents: string[] = [];
  if (Array.isArray(rawEvents)) {
    registeredEvents = rawEvents.map(String);
  } else if (typeof rawEvents === 'string') {
    try {
      const parsed = JSON.parse(rawEvents);
      if (Array.isArray(parsed)) {
        registeredEvents = parsed.map(String);
      } else {
        registeredEvents = [String(rawEvents)];
      }
    } catch {
      registeredEvents = [rawEvents];
    }
  }

  // Forward to GAS if configured
  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('markAttendance', {
      participant: { ...participant, registeredEvents },
      coordinatorName: coordName,
      coordinatorAssignedEvent: assignedEvent,
    });
    if (gasResult) {
      res.json(gasResult);
      return;
    }
  }

  // STEP 4 & 5: Check whether the participant registered for that event
  const isRegistered = registeredEvents.some(
    (e) => e.trim().toLowerCase() === assignedEvent.toLowerCase()
  );

  if (!isRegistered) {
    logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'NOT_REGISTERED', `Participant not registered for ${assignedEvent}`);
    res.json({
      success: false,
      result: 'NOT_REGISTERED',
      message: 'NOT REGISTERED FOR THIS EVENT',
      participant,
      scannedEvent: assignedEvent,
      coordinatorName: coordName,
    });
    return;
  }

  // Concurrency Lock
  const acquired = await acquireLock(10000);
  if (!acquired) {
    res.json({
      success: false,
      result: 'ERROR',
      message: 'Server busy handling concurrent scan. Please scan again.',
    });
    return;
  }

  try {
    // Check UNIQUE ID + EVENT
    const existing = db.attendance.find(
      (a) =>
        a.uniqueId.toLowerCase() === uniqueId.toLowerCase() &&
        a.scannedEvent.toLowerCase() === assignedEvent.toLowerCase() &&
        a.attendanceStatus === 'PRESENT'
    );

    if (existing) {
      logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'ALREADY_MARKED', 'Duplicate scan detected');
      releaseLock();
      res.json({
        success: false,
        result: 'ALREADY_MARKED',
        message: 'ALREADY MARKED',
        participant,
        scannedEvent: assignedEvent,
        coordinatorName: coordName,
        previousScan: {
          coordinatorName: existing.coordinatorName,
          scanTime: existing.attendanceTime,
          scannedEvent: existing.scannedEvent,
        },
      });
      return;
    }

    // Mark PRESENT
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toISOString().split('T')[0];

    const record: AttendanceRow = {
      timestamp: now.toISOString(),
      uniqueId,
      participantName,
      universityRegNumber: participant.universityRegistrationNumber || '',
      email: participant.email || '',
      mobileNumber: participant.mobileNumber || '',
      collegeName: participant.collegeName || '',
      fieldOfStudy: participant.fieldOfStudy || '',
      department: participant.department || '',
      teamName: participant.teamName || '',
      leaderName: participant.leaderName || '',
      membersName: participant.membersName || '',
      registeredEvents,
      scannedEvent: assignedEvent,
      coordinatorName: coordName,
      attendanceDate: dateStr,
      attendanceTime: timeStr,
      attendanceStatus: 'PRESENT',
    };

    db.attendance.push(record);
    logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'SUCCESS', 'Attendance marked successfully');

    // Check if ALL registered events for this participant have now been attended
    const attendedForParticipant = db.attendance
      .filter((a) => a.uniqueId.toLowerCase() === uniqueId.toLowerCase() && a.attendanceStatus === 'PRESENT')
      .map((a) => a.scannedEvent.toLowerCase());

    const allCompleted = registeredEvents.every((ev) =>
      attendedForParticipant.includes(ev.trim().toLowerCase())
    );

    releaseLock();

    res.json({
      success: true,
      result: 'SUCCESS',
      message: 'ATTENDANCE MARKED',
      participant,
      scannedEvent: assignedEvent,
      coordinatorName: coordName,
      timestamp: now.toISOString(),
      attendanceTime: timeStr,
      allEventsCompleted: allCompleted,
      attendedEvents: attendedForParticipant,
      attendanceRecord: record,
    });
  } catch (err: any) {
    releaseLock();
    logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'ERROR', err.message);
    res.status(500).json({ success: false, result: 'ERROR', message: err.message });
  }
});

function logScan(
  uniqueId: string,
  participantName: string,
  coordinatorName: string,
  coordinatorAssignedEvent: string,
  scannedEvent: string,
  result: ScanLogRow['result'],
  message: string
) {
  db.scanLogs.unshift({
    timestamp: new Date().toISOString(),
    uniqueId,
    participantName,
    coordinatorName,
    coordinatorAssignedEvent,
    scannedEvent,
    result,
    message,
  });
}

// 8. ATTENDANCE QUERIES & STATS
app.get('/api/attendance', async (req, res) => {
  const event = req.query.event as string | undefined;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getAttendance', { event });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  let list = db.attendance;
  if (event) {
    list = list.filter((a) => a.scannedEvent.toLowerCase() === event.toLowerCase());
  }

  res.json({ success: true, attendance: list });
});

// Coordinator dashboard stats
app.get('/api/stats/coordinator', async (req, res) => {
  const event = (req.query.assignedEvent as string) || '';

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getCoordinatorStats', { assignedEvent: event });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const matchingAttendance = db.attendance.filter(
    (a) => a.scannedEvent.toLowerCase() === event.toLowerCase()
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayAttendance = matchingAttendance.filter((a) => a.attendanceDate === todayStr).length;

  const alreadyMarkedAttempts = db.scanLogs.filter(
    (l) => l.scannedEvent.toLowerCase() === event.toLowerCase() && l.result === 'ALREADY_MARKED'
  ).length;

  const recentScans = matchingAttendance
    .slice(-6)
    .reverse()
    .map((a) => ({
      uniqueId: a.uniqueId,
      time: a.attendanceTime,
      result: 'SUCCESS' as const,
    }));

  res.json({
    success: true,
    stats: {
      todayAttendance: todayAttendance || matchingAttendance.length,
      totalScans: matchingAttendance.length,
      alreadyMarkedAttempts,
      recentScans,
    },
  });
});

// Overall Admin dashboard stats
app.get('/api/stats/overall', async (req, res) => {
  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getSystemStats', {});
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const uniqueParticipants = new Set(db.attendance.map((a) => a.uniqueId.toLowerCase()));
  const totalAttendance = db.attendance.length;
  const activeCoordinators = db.coordinators.filter((c) => c.status === 'ACTIVE').length;
  const totalEvents = db.events.length;

  const eventCountMap: Record<string, number> = {};
  db.events.forEach((e) => {
    eventCountMap[e.eventName] = 0;
  });

  db.attendance.forEach((a) => {
    eventCountMap[a.scannedEvent] = (eventCountMap[a.scannedEvent] || 0) + 1;
  });

  const eventWiseAttendance = Object.entries(eventCountMap).map(([eventName, count]) => ({
    eventName,
    count,
  }));

  const recentScans = db.attendance
    .slice(-6)
    .reverse()
    .map((a) => ({
      uniqueId: a.uniqueId,
      participantName: a.participantName,
      scannedEvent: a.scannedEvent,
      coordinatorName: a.coordinatorName,
      attendanceTime: a.attendanceTime,
      result: 'SUCCESS' as const,
    }));

  res.json({
    success: true,
    stats: {
      totalParticipants: uniqueParticipants.size,
      totalAttendance,
      activeCoordinators,
      totalEvents,
      eventWiseAttendance,
      recentScans,
    },
  });
});

// Scan logs (Overall Admin)
app.get('/api/scan-logs', async (req, res) => {
  const limit = Number(req.query.limit) || 100;

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('getScanLogs', { limit });
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  res.json({ success: true, logs: db.scanLogs.slice(0, limit) });
});

// 9. OVERALL ADMIN QR RESET
app.post('/api/attendance/reset', async (req, res) => {
  const { uniqueId, event, adminName, reason } = req.body;

  if (!uniqueId || !event || !adminName || !reason) {
    res.status(400).json({
      success: false,
      error: 'Unique ID, Event, Admin Name, and Reason are all mandatory for QR attendance reset.',
    });
    return;
  }

  if (GOOGLE_APPS_SCRIPT_URL) {
    const gasResult = await forwardToGoogleAppsScript('resetAttendance', req.body);
    if (gasResult && gasResult.success) {
      res.json(gasResult);
      return;
    }
  }

  const index = db.attendance.findIndex(
    (a) =>
      a.uniqueId.toLowerCase() === uniqueId.trim().toLowerCase() &&
      a.scannedEvent.toLowerCase() === event.trim().toLowerCase()
  );

  if (index === -1) {
    res.status(404).json({
      success: false,
      error: `No attendance record found for ${uniqueId} in ${event}`,
    });
    return;
  }

  const prev = db.attendance[index];
  db.attendance.splice(index, 1);

  db.qrResetLogs.unshift({
    timestamp: new Date().toISOString(),
    uniqueId: prev.uniqueId,
    adminName: adminName.trim(),
    reason: reason.trim(),
    previousStatus: prev.attendanceStatus,
    newStatus: 'RESET / REMOVED',
    event: prev.scannedEvent,
  });

  res.json({
    success: true,
    message: `Attendance state reset successfully for ${uniqueId} in ${event}`,
  });
});

app.get('/api/reset-logs', (req, res) => {
  res.json({ success: true, logs: db.qrResetLogs });
});

// ---------------------------------------------------------------------------
// VITE MIDDLEWARE & SERVER STARTUP
// ---------------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SYNTRONIX '26 Admin Portal Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
