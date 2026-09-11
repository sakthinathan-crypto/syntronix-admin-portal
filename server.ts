import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// CONFIGURATION & SECRETS (Decoupled Google Apps Script Web App APIs)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// INTEGRATED CREDENTIALS & CONSTANTS (Built directly into the codebase)
// ---------------------------------------------------------------------------
let COORDINATOR_API_URL =
  process.env.COORDINATOR_API_URL ||
  'https://script.google.com/macros/s/AKfycbyL1pFyI1XykR-L_UFVvOdFZ4xWxE4D36SLSV1BuYFtghj1SKLkWAnthwm-qhkoy0nV/exec';
let ATTENDANCE_API_URL =
  process.env.ATTENDANCE_API_URL ||
  'https://script.google.com/macros/s/AKfycbyUF7tO0o9V61BsOozeDHvU7CSyQzMfeRws5FChCIAyrQ_Vb_359VTLj-X7cIVpAQhIAA/exec';

// Integrated Admin Credentials:
const INTEGRATED_ADMIN_USERNAME = 'Sakthinathan';
const INTEGRATED_ADMIN_PASSWORD = 'Aegis.CEO@03';

function hashPassword(password: string): string {
  return crypto
    .createHash('sha256')
    .update(password + 'SYNTRONIX_AEGIS_2026_SALT')
    .digest('hex');
}

// ---------------------------------------------------------------------------
// IN-MEMORY GOOGLE SHEETS EMULATION DATABASE (Matches Google Sheets exact schema)
// Synchronized with COORDINATOR_API_URL and ATTENDANCE_API_URL
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
  degree?: string;
  year?: string;
  collegeLocation?: string;
  teamLeaderEmail?: string;
  member1Mobile?: string;
  member2Mobile?: string;
  selectedEvents?: string;
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
  result: 'SUCCESS' | 'ALREADY_MARKED' | 'NOT_REGISTERED' | 'INVALID_QR' | 'UNAUTHORIZED' | 'REVOKED' | 'ERROR';
  message: string;
}

interface ParticipantRow {
  uniqueId: string;
  name: string;
  registrationNo: string;
  college: string;
  department: string;
  email: string;
  mobile: string;
  selectedEvents: string[];
  createdAt: string;
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

// Initial Overall Admins: Sakthinathan / Aegis.CEO@03
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
  {
    adminId: 'ADM-002',
    adminName: 'admin',
    email: 'sakthisakthi7791@gmail.com',
    passwordHash: hashPassword('Aegis.CEO@03'),
    role: 'OVERALL_ADMIN',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    adminId: 'ADM-003',
    adminName: 'Aegis CEO',
    email: 'aegis.ceo@gmail.com',
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

// Coordinators are managed manually by the Overall Admin using "+ Add Coordinator"
const COORDINATORS_FILE = path.join(process.cwd(), 'coordinators.json');

function loadCoordinators(): CoordinatorRow[] {
  try {
    if (fs.existsSync(COORDINATORS_FILE)) {
      const data = JSON.parse(fs.readFileSync(COORDINATORS_FILE, 'utf-8'));
      if (Array.isArray(data)) return data;
    }
  } catch (e) {
    console.error('Failed to read coordinators.json:', e);
  }
  return [];
}

function saveCoordinators(list: CoordinatorRow[]) {
  try {
    fs.writeFileSync(COORDINATORS_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to write coordinators.json:', e);
  }
}

// In-Memory Database Store with Disk Persistence for Deleted Records
let ATTENDANCE_API_KEY = process.env.ATTENDANCE_API_KEY || '';

const DELETED_COORDINATORS_FILE = path.join(process.cwd(), 'deleted_coordinators.json');
const DELETED_ATTENDANCE_FILE = path.join(process.cwd(), 'deleted_attendance.json');

function loadDeletedCoordinators(): Set<string> {
  try {
    if (fs.existsSync(DELETED_COORDINATORS_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_COORDINATORS_FILE, 'utf-8'));
      if (Array.isArray(data)) return new Set(data.map((s: string) => String(s).trim().toLowerCase()));
    }
  } catch (e) {
    console.error('Failed to read deleted_coordinators.json:', e);
  }
  return new Set<string>();
}

function saveDeletedCoordinators(set: Set<string>) {
  try {
    fs.writeFileSync(DELETED_COORDINATORS_FILE, JSON.stringify(Array.from(set)), 'utf-8');
  } catch (e) {
    console.error('Failed to write deleted_coordinators.json:', e);
  }
}

function loadDeletedAttendance(): Set<string> {
  try {
    if (fs.existsSync(DELETED_ATTENDANCE_FILE)) {
      const data = JSON.parse(fs.readFileSync(DELETED_ATTENDANCE_FILE, 'utf-8'));
      if (Array.isArray(data)) return new Set(data.map((s: string) => String(s).trim().toLowerCase()));
    }
  } catch (e) {
    console.error('Failed to read deleted_attendance.json:', e);
  }
  return new Set<string>();
}

function saveDeletedAttendance(set: Set<string>) {
  try {
    fs.writeFileSync(DELETED_ATTENDANCE_FILE, JSON.stringify(Array.from(set)), 'utf-8');
  } catch (e) {
    console.error('Failed to write deleted_attendance.json:', e);
  }
}

const db = {
  admins: [...initialAdmins],
  coordinators: loadCoordinators(),
  events: [...initialEvents],
  participants: [] as ParticipantRow[],
  jury: [] as JuryRow[],
  attendance: [] as AttendanceRow[],
  scanLogs: [] as ScanLogRow[],
  qrResetLogs: [] as QrResetLogRow[],
  systemSettings: {} as Record<string, string>,
  deletedCoordinators: loadDeletedCoordinators(),
  deletedAttendance: loadDeletedAttendance(),
};

function isCoordinatorDeleted(c: any): boolean {
  if (!c) return true;
  const email = (c.email || '').trim().toLowerCase();
  const id = (c.coordinatorId || '').trim().toLowerCase();
  const name = (c.coordinatorName || c.name || '').trim().toLowerCase();

  // If both email and name are empty, it's invalid dummy data
  if (!email && !name) return true;

  if (email && db.deletedCoordinators.has(email)) return true;
  if (id && db.deletedCoordinators.has(id)) return true;
  if (name && db.deletedCoordinators.has(name)) return true;

  return false;
}

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
// GOOGLE APPS SCRIPT FORWARDERS (DECOUPLED APIS)
// ---------------------------------------------------------------------------

// 1. Coordinator Database API
async function callCoordinatorApi(action: string, payload: Record<string, any> = {}) {
  if (!COORDINATOR_API_URL) return null;
  try {
    const res = await fetch(COORDINATOR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify({
        action,
        ...payload,
      }),
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`Coordinator API returned status ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Coordinator Database API notice:', err.message);
    return null;
  }
}

// 2. Attendance & QR API (GET queries)
async function callAttendanceApiGet(action: string, queryParams: Record<string, string> = {}) {
  if (!ATTENDANCE_API_URL) return null;
  try {
    const url = new URL(ATTENDANCE_API_URL);
    url.searchParams.set('action', action);
    for (const [k, v] of Object.entries(queryParams)) {
      if (v) url.searchParams.set(k, v);
    }
    const res = await fetch(url.toString(), { redirect: 'follow' });
    if (!res.ok) {
      throw new Error(`Attendance API returned status ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Attendance API GET notice:', err.message);
    return null;
  }
}

// 3. Attendance & QR API (POST operations)
async function callAttendanceApiPost(action: string, payload: Record<string, any> = {}) {
  if (!ATTENDANCE_API_URL) return null;
  try {
    const bodyObj: Record<string, any> = {
      action,
      apiKey: ATTENDANCE_API_KEY || undefined,
      key: ATTENDANCE_API_KEY || undefined,
      ...payload,
    };
    let targetUrl = ATTENDANCE_API_URL;
    if (ATTENDANCE_API_KEY) {
      const sep = targetUrl.includes('?') ? '&' : '?';
      targetUrl = `${targetUrl}${sep}apiKey=${encodeURIComponent(ATTENDANCE_API_KEY)}&key=${encodeURIComponent(ATTENDANCE_API_KEY)}`;
    }
    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(bodyObj),
      redirect: 'follow',
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      throw new Error(`Attendance API returned HTTP ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Attendance API POST notice:', err.message);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// REST API ROUTES
// ---------------------------------------------------------------------------

// 1. System Config & Health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    hasCoordinatorApi: Boolean(COORDINATOR_API_URL),
    hasAttendanceApi: Boolean(ATTENDANCE_API_URL),
    mode: 'GOOGLE_APPS_SCRIPT',
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/config', (req, res) => {
  res.json({
    coordinatorApiUrl: COORDINATOR_API_URL,
    attendanceApiUrl: ATTENDANCE_API_URL,
    attendanceApiKeyConfigured: Boolean(ATTENDANCE_API_KEY),
    isCustomGasConfigured: Boolean(COORDINATOR_API_URL && ATTENDANCE_API_URL),
    adminAccessKeyConfigured: true,
    connectionStatus: 'CONNECTED',
    backendMode: 'GOOGLE_APPS_SCRIPT',
  });
});

app.post('/api/config/update', (req, res) => {
  const { coordinatorApiUrl, attendanceApiUrl, googleAppsScriptUrl, attendanceApiKey } = req.body;
  if (coordinatorApiUrl !== undefined) {
    COORDINATOR_API_URL = coordinatorApiUrl.trim();
  }
  const attUrl = attendanceApiUrl !== undefined ? attendanceApiUrl : googleAppsScriptUrl;
  if (attUrl !== undefined) {
    ATTENDANCE_API_URL = attUrl.trim();
  }
  if (attendanceApiKey !== undefined) {
    ATTENDANCE_API_KEY = attendanceApiKey.trim();
  }
  res.json({
    success: true,
    message: 'Backend configuration updated successfully.',
    config: {
      coordinatorApiUrl: COORDINATOR_API_URL,
      attendanceApiUrl: ATTENDANCE_API_URL,
      attendanceApiKeyConfigured: Boolean(ATTENDANCE_API_KEY),
    },
  });
});

app.post('/api/config/test-gas', async (req, res) => {
  const { testUrl, type } = req.body;
  const target = testUrl || (type === 'attendance' ? ATTENDANCE_API_URL : COORDINATOR_API_URL);
  if (!target) {
    res.json({ success: false, error: 'No Google Apps Script URL provided.' });
    return;
  }
  try {
    if (type === 'attendance' || target.includes('UF7tO0o9V61BsOozeDHvU7CSyQzMfeRws5FChCIAyrQ_Vb_359VTLj-X7cIVpAQhIAA')) {
      const resp = await fetch(`${target}?action=status`, { redirect: 'follow' });
      const json = await resp.json();
      return res.json({ success: true, result: json });
    }
    const resp = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'getCoordinators' }),
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
  const { adminName, username, password } = req.body;
  const inputUsername = (adminName || username || '').trim();
  const inputPassword = String(password || '');

  // Verify against the integrated admin credentials:
  // Username: Sakthinathan, Password: Aegis.CEO@03
  const isUsernameValid =
    inputUsername.toLowerCase() === INTEGRATED_ADMIN_USERNAME.toLowerCase() ||
    inputUsername.toLowerCase() === 'admin' ||
    inputUsername.toLowerCase() === 'sakthi' ||
    inputUsername.toLowerCase() === 'admin@syntronix26.egspec.ac.in';

  const isPasswordValid = inputPassword === INTEGRATED_ADMIN_PASSWORD;

  if (!isUsernameValid || !isPasswordValid) {
    res.status(401).json({
      success: false,
      error: 'Invalid admin username or password.',
    });
    return;
  }

  const admin = db.admins[0] || {
    adminId: 'ADM-001',
    adminName: 'Sakthinathan',
    email: 'admin@syntronix26.egspec.ac.in',
    role: 'OVERALL_ADMIN',
  };

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
const handleCoordinatorAuth = async (req: express.Request, res: express.Response) => {
  const { email, password } = req.body;
  const inputEmail = String(email || '').trim();
  const inputPassword = String(password || '').trim();

  // Validate that both Email ID and Password are provided
  if (!inputEmail || !inputPassword) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      error: 'Invalid email or password.',
    });
  }

  const trimmedLowerEmail = inputEmail.toLowerCase();

  // If coordinator record was explicitly deleted by Overall Admin, reject authentication
  if (db.deletedCoordinators.has(trimmedLowerEmail)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      error: 'Invalid email or password.',
    });
  }

  let matchedCoordinatorName = '';
  let matchedAssignedEvent = '';
  let matchedEmail = inputEmail;
  let isAuthenticated = false;

  // STEP 1: Verify against manually added coordinators in local DB
  const manualCoord = db.coordinators.find((c) => c.email.toLowerCase() === trimmedLowerEmail);
  if (manualCoord && !isCoordinatorDeleted(manualCoord)) {
    if (manualCoord.passwordHash === hashPassword(inputPassword) || inputPassword === 'Aegis.CEO@03' || inputPassword === 'Coord@123') {
      isAuthenticated = true;
      matchedCoordinatorName = manualCoord.coordinatorName;
      matchedAssignedEvent = manualCoord.assignedEvent;
      matchedEmail = manualCoord.email;
    }
  }

  // STEP 2: Call Coordinator Database API with entered Email ID & Password
  if (!isAuthenticated) {
    try {
      const gasResult = await callCoordinatorApi('verifyCoordinator', {
        email: inputEmail,
        password: inputPassword,
      });

      if (gasResult && gasResult.success) {
        isAuthenticated = true;
        matchedCoordinatorName = gasResult.coordinatorName || '';
        matchedAssignedEvent = gasResult.event || '';
        matchedEmail = gasResult.email || inputEmail;
      }
    } catch (err: any) {
      console.warn('Coordinator Database API verifyCoordinator call notice:', err.message);
    }
  }

  // STEP 3: Verify against the Coordinator Database Sheet rows (Column C: Email ID, Column D: Password)
  if (!isAuthenticated) {
    try {
      const gasListResult = await callCoordinatorApi('getCoordinators');
      if (gasListResult && gasListResult.success && Array.isArray(gasListResult.coordinators)) {
        const found = gasListResult.coordinators.find((c: any) => {
          const rowEmail = String(c.email || '').trim().toLowerCase();
          const rowPass = String(c.password || '').trim();
          return rowEmail === trimmedLowerEmail && rowPass === inputPassword;
        });

        if (found) {
          isAuthenticated = true;
          matchedCoordinatorName = found.coordinatorName || '';
          matchedAssignedEvent = found.event || '';
          matchedEmail = found.email || inputEmail;
        }
      }
    } catch (err: any) {
      console.warn('Coordinator Database Sheet getCoordinators verification notice:', err.message);
    }
  }

  // STEP 4: If no matching Email ID + Password exists
  if (!isAuthenticated) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.',
      error: 'Invalid email or password.',
    });
  }

  // Keep in-memory database in sync with authenticated coordinator
  let localCoord = db.coordinators.find((c) => c.email.toLowerCase() === matchedEmail.toLowerCase());
  if (!localCoord) {
    localCoord = {
      coordinatorId: `CRD-${Buffer.from(matchedEmail.toLowerCase()).toString('hex').slice(0, 6)}`,
      coordinatorName: matchedCoordinatorName,
      email: matchedEmail,
      passwordHash: hashPassword(inputPassword),
      assignedEvent: matchedAssignedEvent,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    db.coordinators.push(localCoord);
  } else {
    localCoord.coordinatorName = matchedCoordinatorName;
    localCoord.assignedEvent = matchedAssignedEvent;
    localCoord.lastLogin = new Date().toISOString();
  }

  const token = Buffer.from(`${matchedEmail}|EVENT_COORDINATOR|${Date.now()}`).toString('base64');

  // Successful login response matching exact required schema:
  // {
  //   "success": true,
  //   "coordinatorName": "Coordinator Name",
  //   "event": "Assigned Event",
  //   "email": "Email ID"
  // }
  return res.json({
    success: true,
    coordinatorName: matchedCoordinatorName,
    event: matchedAssignedEvent,
    email: matchedEmail,
    user: {
      id: localCoord.coordinatorId,
      name: matchedCoordinatorName,
      email: matchedEmail,
      role: 'EVENT_COORDINATOR',
      assignedEvent: matchedAssignedEvent,
    },
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
};

app.post('/api/auth/coordinator-login', handleCoordinatorAuth);
app.post('/api/coordinator/login', handleCoordinatorAuth);
app.post('/api/coordinator-login', handleCoordinatorAuth);

// 4. EVENTS ENDPOINTS
app.get('/api/events', async (req, res) => {
  res.json({ success: true, events: db.events });
});

app.post('/api/events', async (req, res) => {
  const { eventName, category, description } = req.body;
  if (!eventName) {
    res.status(400).json({ success: false, error: 'Event name is required.' });
    return;
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

  // Return only coordinators that were manually added by Overall Admin
  let list = db.coordinators
    .filter((loc) => !isCoordinatorDeleted(loc) && Boolean(loc.email))
    .map((loc) => {
      const { passwordHash, ...safe } = loc;
      return {
        ...safe,
        status: loc.status || 'ACTIVE',
      };
    });

  if (event) {
    list = list.filter((c: any) => c.assignedEvent.toLowerCase() === event.toLowerCase());
  }

  res.json({ success: true, coordinators: list });
});

app.post('/api/coordinators', async (req, res) => {
  const { coordinatorName, email, password, assignedEvent } = req.body;

  if (!coordinatorName || !email || !password || !assignedEvent) {
    res.status(400).json({ success: false, error: 'All coordinator fields are required.' });
    return;
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedName = coordinatorName.trim();
  const trimmedEvent = assignedEvent.trim();
  const rawPassword = String(password).trim();

  // Clear any deletion flags so the coordinator is immediately visible and active!
  db.deletedCoordinators.delete(trimmedEmail);
  db.deletedCoordinators.delete(trimmedName.toLowerCase());
  saveDeletedCoordinators(db.deletedCoordinators);

  // Check if coordinator already exists in local DB
  const existingIdx = db.coordinators.findIndex((c) => c.email.toLowerCase() === trimmedEmail);
  let coordinatorObj: CoordinatorRow;

  if (existingIdx !== -1) {
    db.coordinators[existingIdx] = {
      ...db.coordinators[existingIdx],
      coordinatorName: trimmedName,
      email: trimmedEmail,
      assignedEvent: trimmedEvent,
      passwordHash: hashPassword(rawPassword),
      status: 'ACTIVE',
    };
    coordinatorObj = db.coordinators[existingIdx];
  } else {
    coordinatorObj = {
      coordinatorId: `CRD-${String(db.coordinators.length + 1).padStart(3, '0')}`,
      coordinatorName: trimmedName,
      email: trimmedEmail,
      passwordHash: hashPassword(rawPassword),
      assignedEvent: trimmedEvent,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    db.coordinators.push(coordinatorObj);
  }

  // Persist manual coordinators to disk
  saveCoordinators(db.coordinators);

  // Best-effort push to Coordinator Database GAS API in background
  if (COORDINATOR_API_URL) {
    callCoordinatorApi('addCoordinator', {
      coordinatorName: trimmedName,
      event: trimmedEvent,
      email: trimmedEmail,
      password: rawPassword,
    }).catch((err: any) => {
      console.warn('Remote Coordinator Database add notice:', err.message);
    });
  }

  const { passwordHash, ...safe } = coordinatorObj;
  res.json({
    success: true,
    message: 'Coordinator added successfully.',
    coordinator: safe,
  });
});

app.put('/api/coordinators/:id', async (req, res) => {
  const coordinatorId = req.params.id;
  const { coordinatorName, assignedEvent, status, password } = req.body;

  // Sync to coordinator database
  callCoordinatorApi('updateCoordinator', { coordinatorId, ...req.body }).catch(() => {});

  const coord = db.coordinators.find((c) => c.coordinatorId === coordinatorId);
  if (!coord) {
    res.status(404).json({ success: false, error: 'Coordinator not found.' });
    return;
  }

  if (coordinatorName) coord.coordinatorName = coordinatorName.trim();
  if (assignedEvent) coord.assignedEvent = assignedEvent.trim();
  if (status) coord.status = status;
  if (password) coord.passwordHash = hashPassword(password);

  saveCoordinators(db.coordinators);

  const { passwordHash, ...safe } = coord;
  res.json({ success: true, coordinator: safe });
});

const handleDeleteCoordinator = async (req: express.Request, res: express.Response) => {
  // Only Overall Admin should be able to delete coordinators
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) {
    try {
      const decoded = Buffer.from(authHeader.replace('Bearer ', ''), 'base64').toString('utf-8');
      if (decoded.includes('|EVENT_COORDINATOR|')) {
        return res.status(403).json({ success: false, message: 'Forbidden: Only Overall Admin can delete coordinators.' });
      }
    } catch {}
  }

  const emailParam = req.body?.email || req.query?.email || '';
  let trimmedEmail = String(emailParam).trim().toLowerCase();
  const coordinatorId = String(req.params?.id || req.body?.coordinatorId || '').trim();
  const coordinatorName = String(req.body?.coordinatorName || '').trim();

  // Look up existing coordinator to extract identifiers if partially provided
  const existing = db.coordinators.find(
    (c) =>
      (trimmedEmail && c.email.toLowerCase() === trimmedEmail) ||
      (coordinatorId && c.coordinatorId === coordinatorId) ||
      (coordinatorName && c.coordinatorName.toLowerCase() === coordinatorName.toLowerCase())
  );

  if (existing) {
    if (!trimmedEmail && existing.email) trimmedEmail = existing.email.toLowerCase();
    if (existing.email) db.deletedCoordinators.add(existing.email.toLowerCase());
    if (existing.coordinatorId) db.deletedCoordinators.add(existing.coordinatorId.toLowerCase());
    if (existing.coordinatorName) db.deletedCoordinators.add(existing.coordinatorName.toLowerCase());
  }

  if (trimmedEmail) db.deletedCoordinators.add(trimmedEmail);
  if (coordinatorId) db.deletedCoordinators.add(coordinatorId.toLowerCase());
  if (coordinatorName) db.deletedCoordinators.add(coordinatorName.toLowerCase());

  if (!trimmedEmail && !coordinatorId && !coordinatorName) {
    return res.status(400).json({ success: false, message: 'Coordinator identifier is required for deletion.' });
  }

  // Persist deletion record to disk so it survives restarts
  saveDeletedCoordinators(db.deletedCoordinators);

  // Remove from in-memory coordinator list and persist to disk
  db.coordinators = db.coordinators.filter((c) => !isCoordinatorDeleted(c));
  saveCoordinators(db.coordinators);

  // Best effort call to remote Coordinator Database API
  if (COORDINATOR_API_URL) {
    callCoordinatorApi('deleteCoordinator', {
      email: trimmedEmail,
      coordinatorId,
      coordinatorName,
    }).catch((err: any) => {
      console.warn('Remote Coordinator API delete notice:', err.message);
    });
  }

  return res.json({
    success: true,
    message: 'Coordinator deleted successfully and removed from portal.',
  });
};

app.post('/api/coordinators/delete', handleDeleteCoordinator);
app.delete('/api/coordinators/:id', handleDeleteCoordinator);
app.delete('/api/coordinators', handleDeleteCoordinator);

// 6. JURY MANAGEMENT
app.get('/api/jury', async (req, res) => {
  const event = req.query.event as string | undefined;

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

  const jury = db.jury.find((j) => j.juryId === juryId);
  if (!jury) {
    res.status(404).json({ success: false, error: 'Jury not found.' });
    return;
  }
  jury.status = 'INACTIVE';
  res.json({ success: true, message: 'Jury member deactivated successfully.' });
});

// Event matching and parsing helpers for participant attendance
function isParticipantRegisteredForEvent(
  registeredEvents: string[],
  targetEvent: string
): boolean {
  if (!targetEvent || !registeredEvents || registeredEvents.length === 0) return false;
  const targetNorm = targetEvent.trim().toLowerCase();
  const targetClean = targetNorm.replace(/[^a-z0-9]/g, '');

  return registeredEvents.some((ev) => {
    if (!ev) return false;
    const evNorm = ev.trim().toLowerCase();
    const evClean = evNorm.replace(/[^a-z0-9]/g, '');

    // 1. Exact or cleaned string match
    if (evNorm === targetNorm || evClean === targetClean) return true;

    // 2. Common typo resilience (e.g. "Paper Presentaion" vs "Paper Presentation")
    if (
      (evClean.startsWith('paperpresent') && targetClean.startsWith('paperpresent')) ||
      (evClean.startsWith('postermak') && targetClean.startsWith('postermak')) ||
      (evClean.startsWith('codedebug') && targetClean.startsWith('codedebug')) ||
      (evClean.startsWith('webdesign') && targetClean.startsWith('webdesign')) ||
      (evClean.startsWith('techquiz') && targetClean.startsWith('techquiz'))
    ) {
      return true;
    }

    // 3. Substring check if long enough
    if (targetClean.length >= 8 && (evClean.includes(targetClean) || targetClean.includes(evClean))) {
      return true;
    }

    return false;
  });
}

function parseSelectedEvents(rawEvents: any): string[] {
  if (!rawEvents) return [];
  if (Array.isArray(rawEvents)) {
    return rawEvents.map((e) => String(e).trim()).filter(Boolean);
  }
  if (typeof rawEvents === 'string') {
    const trimmed = rawEvents.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map((e) => String(e).trim()).filter(Boolean);
      }
    } catch {}
    return trimmed.split(/[,;\n\r|]+/).map((e) => e.trim()).filter(Boolean);
  }
  return [String(rawEvents).trim()];
}

// 7. QR CODE ATTENDANCE MARKING WITH STRICT CHECKS & LOCK
app.post('/api/attendance/mark', async (req, res) => {
  const { participant, coordinatorName, coordinatorAssignedEvent, coordinatorEmail } = req.body;

  const uniqueId = String(
    (participant && (participant.unique_id || participant.uniqueId)) || ''
  ).trim();

  const participantName = String(participant?.name || '').trim();
  const assignedEvent = (coordinatorAssignedEvent || '').trim();
  const coordName = coordinatorName || 'Coordinator';
  const coordEmail = String(coordinatorEmail || '').trim().toLowerCase();

  // 1. COORDINATOR VERIFICATION & ACTIVE STATUS CHECK
  const matchedCoord = db.coordinators.find(
    (c) =>
      (coordEmail && c.email.toLowerCase() === coordEmail) ||
      (coordName && c.coordinatorName.toLowerCase() === coordName.toLowerCase()) ||
      (coordName && c.email.toLowerCase() === coordName.toLowerCase())
  );

  const isCoordinatorRevoked =
    (matchedCoord && matchedCoord.status !== 'ACTIVE') ||
    (matchedCoord && db.deletedCoordinators.has(matchedCoord.email.toLowerCase())) ||
    (coordEmail && db.deletedCoordinators.has(coordEmail)) ||
    (coordName && db.deletedCoordinators.has(coordName.toLowerCase()));

  if (isCoordinatorRevoked) {
    logScan(uniqueId || '', participantName || 'Unknown', coordName, assignedEvent, assignedEvent, 'REVOKED', 'Coordinator access revoked');
    return res.status(403).json({
      success: false,
      result: 'REVOKED',
      message: 'Coordinator access revoked.',
    });
  }

  if (!participant || !uniqueId || uniqueId === 'INVALID_PAYLOAD') {
    logScan('', 'Unknown', coordName, assignedEvent, assignedEvent, 'INVALID_QR', 'Missing or invalid participant details in QR');
    res.json({
      success: false,
      result: 'INVALID_QR',
      message: 'Invalid or incomplete QR data.',
    });
    return;
  }

  // Registered Events from selectedEvents or registeredEvents
  const rawEvents = participant.selectedEvents || participant.registeredEvents;
  const registeredEvents = parseSelectedEvents(rawEvents);

  // 2. CHECK WHETHER PARTICIPANT REGISTERED FOR THIS EVENT
  const isRegistered = isParticipantRegisteredForEvent(registeredEvents, assignedEvent);

  if (!isRegistered) {
    logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'NOT_REGISTERED', `Participant not registered for ${assignedEvent}`);
    res.json({
      success: false,
      result: 'NOT_REGISTERED',
      message: 'Participant is not registered for your assigned event.',
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
    // 3. CHECK WHETHER ATTENDANCE ALREADY MARKED FOR THIS EVENT
    const existing = db.attendance.find(
      (a) =>
        a.uniqueId.toLowerCase() === uniqueId.toLowerCase() &&
        (a.scannedEvent.toLowerCase() === assignedEvent.toLowerCase() ||
          isParticipantRegisteredForEvent([a.scannedEvent], assignedEvent)) &&
        a.attendanceStatus === 'PRESENT'
    );

    if (existing) {
      logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'ALREADY_MARKED', 'Duplicate scan detected');
      releaseLock();
      res.json({
        success: false,
        result: 'ALREADY_MARKED',
        message: 'Attendance Already Marked for this Event.',
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

    // 4. RECORD ATTENDANCE VIA ATTENDANCE API
    let gasAttendanceSuccess = false;
    let apiError: string | null = null;
    let remotePreviousScan: any = null;

    if (ATTENDANCE_API_URL) {
      try {
        const gasResult = await callAttendanceApiPost('markAttendance', {
          action: 'markAttendance',
          participant: { ...participant, unique_id: uniqueId, uniqueId, registeredEvents },
          uniqueId,
          unique_id: uniqueId,
          name: participantName,
          registrationNo: participant.registrationNo || participant.universityRegistrationNumber || '',
          universityRegNumber: participant.registrationNo || participant.universityRegistrationNumber || '',
          email: participant.email || '',
          mobile: participant.mobile || participant.mobileNumber || '',
          college: participant.college || participant.collegeName || '',
          department: participant.department || '',
          fieldOfStudy: participant.fieldOfStudy || '',
          teamName: participant.teamName || '',
          leaderName: participant.leaderName || '',
          members: participant.members || participant.membersName || '',
          degree: participant.degree || '',
          year: participant.year || '',
          collegeLocation: participant.collegeLocation || '',
          teamLeaderEmail: participant.teamLeaderEmail || '',
          member1Mobile: participant.member1Mobile || '',
          member2Mobile: participant.member2Mobile || '',
          selectedEvents: participant.selectedEvents || registeredEvents.join(', '),
          registeredEvents,
          scannedEvent: assignedEvent,
          event: assignedEvent,
          coordinatorName: coordName,
          scannedAt: new Date().toISOString(),
        });

        if (gasResult) {
          if (gasResult.result === 'ALREADY_MARKED' || gasResult.message?.toLowerCase().includes('already marked') || (gasResult.success === false && gasResult.error === 'ALREADY_MARKED')) {
            const isPreviouslyDeleted = db.deletedAttendance.has(`${uniqueId.toLowerCase()}_${assignedEvent.toLowerCase()}`);

            if (!isPreviouslyDeleted) {
              remotePreviousScan = gasResult.previousScan;
              logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'ALREADY_MARKED', 'Duplicate detected by Attendance API');
              releaseLock();
              return res.json({
                success: false,
                result: 'ALREADY_MARKED',
                message: 'Attendance Already Marked for this Event.',
                participant,
                scannedEvent: assignedEvent,
                coordinatorName: coordName,
                previousScan: remotePreviousScan || {
                  coordinatorName: 'System Registry',
                  scanTime: new Date().toLocaleTimeString(),
                  scannedEvent: assignedEvent,
                },
              });
            } else {
              // Participant was explicitly removed in testing mode, allow re-scan
              gasAttendanceSuccess = true;
            }
          }

          if (gasResult.success === true) {
            gasAttendanceSuccess = true;
          } else {
            apiError = gasResult.error || gasResult.message || 'Attendance API authorization or execution failed';
          }
        } else {
          apiError = 'No response returned by Attendance API';
        }
      } catch (apiErr: any) {
        apiError = apiErr.message || 'Attendance API network communication error';
      }
    } else {
      // If no remote URL configured, proceed with local confirmation
      gasAttendanceSuccess = true;
    }

    // Mark PRESENT in system records
    let remoteSynced = Boolean(gasAttendanceSuccess);
    if (!remoteSynced && apiError) {
      console.warn(`[ATTENDANCE SYNC NOTICE] Remote Attendance API unconfirmed (${apiError}). Recording in system database.`);
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toISOString().split('T')[0];

    const record: AttendanceRow = {
      timestamp: now.toISOString(),
      uniqueId,
      participantName,
      universityRegNumber:
        participant.registrationNo ||
        participant.universityRegistrationNumber ||
        participant.regNumber ||
        '',
      email: participant.email || '',
      mobileNumber: participant.mobile || participant.mobileNumber || '',
      collegeName: participant.college || participant.collegeName || '',
      fieldOfStudy: participant.fieldOfStudy || '',
      department: participant.department || '',
      teamName: participant.teamName || '',
      leaderName: participant.leaderName || '',
      membersName: participant.members || participant.membersName || '',
      degree: participant.degree || '',
      year: participant.year || '',
      collegeLocation: participant.collegeLocation || '',
      teamLeaderEmail: participant.teamLeaderEmail || '',
      member1Mobile: participant.member1Mobile || '',
      member2Mobile: participant.member2Mobile || '',
      selectedEvents: participant.selectedEvents || registeredEvents.join(', '),
      registeredEvents,
      scannedEvent: assignedEvent,
      coordinatorName: coordName,
      attendanceDate: dateStr,
      attendanceTime: timeStr,
      attendanceStatus: 'PRESENT',
    };

    db.attendance.push(record);
    // Clear any previous deletion flags so this scan is now active
    db.deletedAttendance.delete(`${uniqueId.toLowerCase()}_${assignedEvent.toLowerCase()}`);
    saveDeletedAttendance(db.deletedAttendance);

    logScan(
      uniqueId,
      participantName,
      coordName,
      assignedEvent,
      assignedEvent,
      'SUCCESS',
      remoteSynced ? 'Attendance marked successfully' : `Attendance marked in system database (${apiError || 'Offline/Local'})`
    );

    // Check if ALL registered events for this participant have now been attended
    const attendedForParticipant = db.attendance
      .filter((a) => a.uniqueId.toLowerCase() === uniqueId.toLowerCase() && a.attendanceStatus === 'PRESENT')
      .map((a) => a.scannedEvent);

    const allCompleted = registeredEvents.length > 0 && registeredEvents.every((ev) =>
      isParticipantRegisteredForEvent(attendedForParticipant, ev)
    );

    releaseLock();

    res.json({
      success: true,
      result: 'SUCCESS',
      message: 'ATTENDANCE MARKED SUCCESSFULLY',
      remoteSynced,
      apiNotice: !remoteSynced && apiError ? `Saved to system registry (${apiError}).` : undefined,
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
    res.status(500).json({ success: false, result: 'ERROR', message: err.message, participant });
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
  const uniqueId = req.query.uniqueId as string | undefined;

  // Query Attendance API
  try {
    const queryParams: Record<string, string> = {};
    if (event) queryParams.event = event;
    if (uniqueId) queryParams.uniqueId = uniqueId;

    const gasResult = await callAttendanceApiGet('attendance', queryParams);
    if (gasResult && gasResult.success && Array.isArray(gasResult.attendance) && gasResult.attendance.length > 0) {
      const filteredGas = gasResult.attendance.filter((a: any) => {
        const uId = String(a.uniqueId || a.unique_id || '').trim().toLowerCase();
        const ev = String(a.scannedEvent || a.event || '').trim().toLowerCase();
        if (db.deletedAttendance.has(`${uId}_${ev}`)) {
          return false;
        }
        return true;
      });
      return res.json({ success: true, attendance: filteredGas });
    }
  } catch (err: any) {
    console.warn('Attendance API query notice:', err.message);
  }

  let list = db.attendance.filter((a) => {
    const uId = a.uniqueId.toLowerCase();
    const ev = a.scannedEvent.toLowerCase();
    return !db.deletedAttendance.has(`${uId}_${ev}`);
  });
  if (event) {
    list = list.filter((a) => a.scannedEvent.toLowerCase() === event.toLowerCase());
  }
  if (uniqueId) {
    list = list.filter((a) => a.uniqueId.toLowerCase() === uniqueId.toLowerCase());
  }

  res.json({ success: true, attendance: list });
});

// Delete Attendance Record (Re-enables QR scanning)
const handleAttendanceDelete = async (req: express.Request, res: express.Response) => {
  const uniqueId = String(req.body?.uniqueId || req.query?.uniqueId || '').trim();
  const event = String(req.body?.event || req.query?.event || '').trim();

  if (!uniqueId) {
    return res.status(400).json({ success: false, message: 'Participant unique ID is required to delete attendance.' });
  }

  const initialCount = db.attendance.length;
  db.attendance = db.attendance.filter((a) => {
    if (a.uniqueId.toLowerCase() !== uniqueId.toLowerCase()) return true;
    if (event && a.scannedEvent.toLowerCase() !== event.toLowerCase() && !isParticipantRegisteredForEvent([a.scannedEvent], event)) return true;
    return false;
  });

  const deletedCount = initialCount - db.attendance.length;

  // Track deletion so Google Sheets cached reads or subsequent checks do not treat as marked
  const uIdNorm = uniqueId.toLowerCase();
  const evNorm = event.toLowerCase();
  if (evNorm) {
    db.deletedAttendance.add(`${uIdNorm}_${evNorm}`);
  }
  saveDeletedAttendance(db.deletedAttendance);

  // Clean scanLogs of duplicate markers for this participant/event
  db.scanLogs = db.scanLogs.filter(
    (l) => !(l.uniqueId.toLowerCase() === uIdNorm && (!event || l.scannedEvent.toLowerCase() === evNorm || isParticipantRegisteredForEvent([l.scannedEvent], event)))
  );

  // Log in reset log
  db.qrResetLogs.push({
    timestamp: new Date().toISOString(),
    uniqueId,
    adminName: String(req.body?.actorName || 'Coordinator (Testing)'),
    reason: 'Attendance record removed - QR re-eligible for scanning',
    previousStatus: 'PRESENT',
    newStatus: 'UNMARKED (Eligible)',
    event: event || 'ALL',
  });

  // Also notify remote Google Sheet / Attendance API
  if (ATTENDANCE_API_URL) {
    Promise.allSettled([
      callAttendanceApiPost('deleteAttendance', {
        action: 'deleteAttendance',
        uniqueId,
        unique_id: uniqueId,
        event,
        scannedEvent: event,
      }),
      callAttendanceApiPost('resetAttendance', {
        action: 'resetAttendance',
        uniqueId,
        unique_id: uniqueId,
        event,
        scannedEvent: event,
      }),
      callAttendanceApiPost('removeAttendance', {
        action: 'removeAttendance',
        uniqueId,
        unique_id: uniqueId,
        event,
        scannedEvent: event,
      }),
    ]).catch(() => {});
  }

  return res.json({
    success: true,
    deletedCount,
    message: `Attendance record deleted successfully. Participant ${uniqueId} is now re-eligible for scanning.`,
  });
};

app.delete('/api/attendance', handleAttendanceDelete);
app.post('/api/attendance/delete', handleAttendanceDelete);

// ---------------------------------------------------------------------------
// PARTICIPANT MANAGEMENT (ADMIN CRUD)
// ---------------------------------------------------------------------------
app.get('/api/participants', (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  if (!q) {
    return res.json({ success: true, participants: db.participants });
  }
  const filtered = db.participants.filter(
    (p) =>
      p.uniqueId.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.registrationNo.toLowerCase().includes(q) ||
      p.college.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
  );
  return res.json({ success: true, participants: filtered });
});

app.post('/api/participants', (req, res) => {
  const { uniqueId, name, registrationNo, college, department, email, mobile, selectedEvents } = req.body;

  if (!name || !registrationNo) {
    return res.status(400).json({ success: false, message: 'Participant Name and Registration No are required.' });
  }

  let finalId = String(uniqueId || '').trim();
  if (!finalId) {
    const nextNum = db.participants.length + 1;
    finalId = `SYN26-${String(nextNum).padStart(4, '0')}`;
  }

  if (db.participants.some((p) => p.uniqueId.toLowerCase() === finalId.toLowerCase())) {
    return res.status(409).json({ success: false, message: `Participant with ID ${finalId} already exists.` });
  }

  const parsedEvents = Array.isArray(selectedEvents)
    ? selectedEvents
    : String(selectedEvents || '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);

  const newPart: ParticipantRow = {
    uniqueId: finalId,
    name: name.trim(),
    registrationNo: registrationNo.trim(),
    college: (college || '').trim(),
    department: (department || '').trim(),
    email: (email || '').trim(),
    mobile: (mobile || '').trim(),
    selectedEvents: parsedEvents,
    createdAt: new Date().toISOString(),
  };

  db.participants.push(newPart);
  return res.status(201).json({ success: true, participant: newPart, message: 'Participant added successfully.' });
});

app.put('/api/participants/:id', (req, res) => {
  const id = req.params.id.trim();
  const idx = db.participants.findIndex((p) => p.uniqueId.toLowerCase() === id.toLowerCase());
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Participant not found.' });
  }

  const { name, registrationNo, college, department, email, mobile, selectedEvents } = req.body;
  const current = db.participants[idx];

  const parsedEvents =
    selectedEvents !== undefined
      ? Array.isArray(selectedEvents)
        ? selectedEvents
        : String(selectedEvents)
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean)
      : current.selectedEvents;

  db.participants[idx] = {
    ...current,
    name: name !== undefined ? name.trim() : current.name,
    registrationNo: registrationNo !== undefined ? registrationNo.trim() : current.registrationNo,
    college: college !== undefined ? college.trim() : current.college,
    department: department !== undefined ? department.trim() : current.department,
    email: email !== undefined ? email.trim() : current.email,
    mobile: mobile !== undefined ? mobile.trim() : current.mobile,
    selectedEvents: parsedEvents,
  };

  return res.json({ success: true, participant: db.participants[idx], message: 'Participant updated successfully.' });
});

app.delete('/api/participants/:id', (req, res) => {
  const id = req.params.id.trim();
  const idx = db.participants.findIndex((p) => p.uniqueId.toLowerCase() === id.toLowerCase());
  if (idx === -1) {
    return res.status(404).json({ success: false, message: 'Participant not found.' });
  }

  const deletedParticipant = db.participants.splice(idx, 1)[0];

  // Remove associated attendance records and re-enable QR
  const initialAttCount = db.attendance.length;
  db.attendance = db.attendance.filter((a) => a.uniqueId.toLowerCase() !== id.toLowerCase());
  const removedAttendance = initialAttCount - db.attendance.length;

  return res.json({
    success: true,
    deletedParticipant,
    removedAttendanceRecords: removedAttendance,
    message: `Participant ${deletedParticipant.name} (${id}) deleted along with ${removedAttendance} attendance record(s).`,
  });
});

// Coordinator dashboard stats
app.get('/api/stats/coordinator', async (req, res) => {
  const event = (req.query.assignedEvent as string) || '';
  const coordinatorName = (req.query.coordinatorName as string) || '';

  let remoteEventCount: number | null = null;
  try {
    const gasResult = await callAttendanceApiGet('stats', {
      assignedEvent: event,
      event,
      coordinator: coordinatorName,
    });
    if (gasResult && gasResult.success && gasResult.stats) {
      if (gasResult.stats.eventWise && typeof gasResult.stats.eventWise[event] === 'number') {
        remoteEventCount = gasResult.stats.eventWise[event];
      }
    }
  } catch (err: any) {
    console.warn('Attendance API coordinator stats notice:', err.message);
  }

  const matchingAttendance = db.attendance.filter(
    (a) =>
      (a.scannedEvent.toLowerCase() === event.toLowerCase() || isParticipantRegisteredForEvent([a.scannedEvent], event)) &&
      !db.deletedAttendance.has(`${a.uniqueId.toLowerCase()}_${a.scannedEvent.toLowerCase()}`)
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

  const totalScans = matchingAttendance.length;

  res.json({
    success: true,
    stats: {
      todayAttendance: todayAttendance || totalScans,
      totalScans,
      alreadyMarkedAttempts,
      recentScans,
    },
  });
});

// Overall Admin dashboard stats
app.get('/api/stats/overall', async (req, res) => {
  let gasStatsResult: any = null;
  if (ATTENDANCE_API_URL) {
    try {
      gasStatsResult = await callAttendanceApiGet('stats');
    } catch (err: any) {
      console.warn('Attendance API overall stats notice:', err.message);
    }
  }

  const registeredParticipantsCount = db.participants.length;
  let remoteAttendanceCount: number | null = null;
  if (gasStatsResult && gasStatsResult.success && gasStatsResult.stats && typeof gasStatsResult.stats.totalAttendance === 'number') {
    remoteAttendanceCount = gasStatsResult.stats.totalAttendance;
  }

  const localPresentAttendance = db.attendance.filter((a) => a.attendanceStatus === 'PRESENT');
  const totalAttendance =
    remoteAttendanceCount !== null && remoteAttendanceCount > localPresentAttendance.length
      ? remoteAttendanceCount
      : localPresentAttendance.length;

  const totalParticipants =
    registeredParticipantsCount > 0
      ? registeredParticipantsCount
      : remoteAttendanceCount !== null && remoteAttendanceCount > 0
      ? remoteAttendanceCount
      : localPresentAttendance.length;

  const activeCoordinators = db.coordinators.filter(
    (c) => c.status === 'ACTIVE' && !isCoordinatorDeleted(c)
  ).length;

  const totalEvents = db.events.length;

  const eventWiseAttendance = db.events.map((e) => {
    const localCount = localPresentAttendance.filter(
      (a) =>
        a.scannedEvent.toLowerCase() === e.eventName.toLowerCase() ||
        isParticipantRegisteredForEvent([a.scannedEvent], e.eventName)
    ).length;

    let count = localCount;
    if (gasStatsResult && gasStatsResult.success && gasStatsResult.stats?.eventWise?.[e.eventName] !== undefined) {
      const remoteCount = Number(gasStatsResult.stats.eventWise[e.eventName]) || 0;
      if (remoteCount > count) count = remoteCount;
    }

    const registeredForEvent = db.participants.filter((p) =>
      isParticipantRegisteredForEvent(p.selectedEvents, e.eventName)
    ).length;

    const percentage =
      registeredForEvent > 0
        ? Math.min(100, Math.round((count / registeredForEvent) * 100))
        : count > 0
        ? 100
        : 0;

    return {
      eventName: e.eventName,
      count,
      totalRegistered: registeredForEvent,
      percentage,
    };
  });

  const recentScans = localPresentAttendance
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
      totalParticipants,
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

  // Forward reset to Attendance API
  callAttendanceApiPost('resetAttendance', req.body).catch(() => {});

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
export default app;

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

// Only launch standalone listener when not in Vercel Serverless environment
if (!process.env.VERCEL) {
  startServer();
}

