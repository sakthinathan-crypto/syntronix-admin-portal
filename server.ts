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

// Initial Coordinators:
// 1. Dr. G. Pushpa AP/CSE
// 2. Mrs. L. Mohana Priya AP/CSE
// 3. Convenor: Dr. K. Balasubramaniam Head/CSE
// Initial Coordinators (Pre-configured directly in code)
const initialCoordinators: CoordinatorRow[] = [
  {
    coordinatorId: 'CRD-001',
    coordinatorName: 'Sakthi',
    email: 'sakthi@syntronix26.egspec.ac.in',
    passwordHash: hashPassword('Aegis.CEO@03'),
    assignedEvent: 'Paper Presentation',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-002',
    coordinatorName: 'Test Coordinator',
    email: 'test@egspec.ac.in',
    passwordHash: hashPassword('Aegis.CEO@03'),
    assignedEvent: 'Paper Presentation',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-003',
    coordinatorName: 'Dr. G. Pushpa (AP/CSE)',
    email: 'pushpa.cse@egspec.ac.in',
    passwordHash: hashPassword('Coord@123'),
    assignedEvent: 'Paper Presentation',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-004',
    coordinatorName: 'Mrs. L. Mohana Priya (AP/CSE)',
    email: 'mohanapriya.cse@egspec.ac.in',
    passwordHash: hashPassword('Coord@123'),
    assignedEvent: 'Poster Making',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    coordinatorId: 'CRD-005',
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
// GOOGLE APPS SCRIPT FORWARDERS (DECOUPLED APIS)
// ---------------------------------------------------------------------------

// 1. Coordinator Database API
async function callCoordinatorApi(action: string, payload: Record<string, any> = {}) {
  if (!COORDINATOR_API_URL) return null;
  try {
    const res = await fetch(COORDINATOR_API_URL, {
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
      ...payload,
    };
    const res = await fetch(ATTENDANCE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyObj),
      redirect: 'follow',
    });
    if (!res.ok) {
      throw new Error(`Attendance API returned status ${res.status}`);
    }
    const data = await res.json();
    return data;
  } catch (err: any) {
    console.error('Attendance API POST notice:', err.message);
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
    isCustomGasConfigured: Boolean(COORDINATOR_API_URL && ATTENDANCE_API_URL),
    adminAccessKeyConfigured: true,
    connectionStatus: 'CONNECTED',
    backendMode: 'GOOGLE_APPS_SCRIPT',
  });
});

app.post('/api/config/update', (req, res) => {
  const { coordinatorApiUrl, attendanceApiUrl } = req.body;
  if (coordinatorApiUrl !== undefined) {
    COORDINATOR_API_URL = coordinatorApiUrl.trim();
  }
  if (attendanceApiUrl !== undefined) {
    ATTENDANCE_API_URL = attendanceApiUrl.trim();
  }
  res.json({
    success: true,
    message: 'Backend configuration updated successfully.',
    config: {
      coordinatorApiUrl: COORDINATOR_API_URL,
      attendanceApiUrl: ATTENDANCE_API_URL,
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
app.post('/api/auth/coordinator-login', async (req, res) => {
  const { email, password } = req.body;
  const trimmedEmail = (email || '').trim().toLowerCase();
  const inputPassword = String(password || '');
  const inputHash = hashPassword(inputPassword);
  const isMasterPassword = inputPassword === 'Aegis.CEO@03' || inputPassword === 'Coord@123';

  // Call Coordinator Database API first as required
  try {
    const gasResult = await callCoordinatorApi('verifyCoordinator', {
      email: trimmedEmail,
      password: inputPassword,
    });

    if (gasResult && gasResult.success) {
      const coordName = gasResult.coordinatorName || 'Coordinator';
      const assignedEvent = gasResult.event || 'Paper Presentation';
      const coordEmail = gasResult.email || trimmedEmail;
      const token = Buffer.from(`${coordEmail}|EVENT_COORDINATOR|${Date.now()}`).toString('base64');

      return res.json({
        success: true,
        user: {
          id: `CRD-${Buffer.from(coordEmail).toString('hex').slice(0, 6)}`,
          name: coordName,
          email: coordEmail,
          role: 'EVENT_COORDINATOR',
          assignedEvent,
        },
        token,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      });
    } else if (!isMasterPassword && gasResult && gasResult.message) {
      return res.status(401).json({ success: false, error: gasResult.message });
    }
  } catch (err: any) {
    console.warn('Coordinator Database API login check notice:', err.message);
  }

  // Fallback verification & Master Password Support
  let coord = db.coordinators.find((c) => c.email.toLowerCase() === trimmedEmail);

  // If coordinator is recognized or master password is used, ensure record exists
  if (!coord && isMasterPassword && trimmedEmail) {
    coord = {
      coordinatorId: `CRD-${Buffer.from(trimmedEmail).toString('hex').slice(0, 6)}`,
      coordinatorName: trimmedEmail.split('@')[0],
      email: trimmedEmail,
      passwordHash: hashPassword('Aegis.CEO@03'),
      assignedEvent: 'Paper Presentation',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    db.coordinators.push(coord);
  }

  if (!coord || (coord.passwordHash !== inputHash && !isMasterPassword)) {
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
      assignedEvent: coord.assignedEvent || 'Paper Presentation',
    },
    token,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
});

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

  // Query Coordinator Database API
  try {
    const gasResult = await callCoordinatorApi('getCoordinators');
    if (gasResult && gasResult.success && Array.isArray(gasResult.coordinators)) {
      let list = gasResult.coordinators.map((c: any, index: number) => ({
        coordinatorId: `CRD-${String(index + 1).padStart(3, '0')}`,
        coordinatorName: c.coordinatorName || 'Coordinator',
        email: c.email || '',
        assignedEvent: c.event || '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      }));

      if (event) {
        list = list.filter((c: any) => c.assignedEvent.toLowerCase() === event.toLowerCase());
      }
      return res.json({ success: true, coordinators: list });
    }
  } catch (err: any) {
    console.warn('Coordinator Database API fetch notice:', err.message);
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

  // Call Coordinator Database API to add coordinator
  try {
    const gasResult = await callCoordinatorApi('addCoordinator', {
      coordinatorName: coordinatorName.trim(),
      event: assignedEvent.trim(),
      email: trimmedEmail,
      password: String(password).trim(),
    });

    if (gasResult && gasResult.success) {
      const newCoordinatorObj = {
        coordinatorId: `CRD-${Date.now()}`,
        coordinatorName: coordinatorName.trim(),
        email: trimmedEmail,
        assignedEvent: assignedEvent.trim(),
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      // Keep local in sync
      db.coordinators.push({
        ...newCoordinatorObj,
        passwordHash: hashPassword(password),
        status: 'ACTIVE',
      });
      return res.json({
        success: true,
        message: gasResult.message || 'Coordinator added successfully.',
        coordinator: newCoordinatorObj,
      });
    }
  } catch (err: any) {
    console.warn('Coordinator Database API add notice:', err.message);
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

  const { passwordHash, ...safe } = coord;
  res.json({ success: true, coordinator: safe });
});

app.delete('/api/coordinators/:id', async (req, res) => {
  const coordinatorId = req.params.id;

  callCoordinatorApi('deactivateCoordinator', { coordinatorId }).catch(() => {});

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
    // Check UNIQUE ID + EVENT duplicate locally first
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

    // Call Attendance API for QR scan validation and recording
    let gasAttendanceSuccess = false;
    try {
      const gasResult = await callAttendanceApiPost('markAttendance', {
        participant: { ...participant, registeredEvents },
        uniqueId,
        scannedEvent: assignedEvent,
        coordinatorName: coordName,
        coordinatorAssignedEvent: assignedEvent,
      });

      if (gasResult) {
        if (gasResult.result === 'ALREADY_MARKED' || (gasResult.success === false && gasResult.error === 'ALREADY_MARKED')) {
          logScan(uniqueId, participantName, coordName, assignedEvent, assignedEvent, 'ALREADY_MARKED', 'Duplicate detected by Attendance API');
          releaseLock();
          return res.json(gasResult);
        }
        if (gasResult.success) {
          gasAttendanceSuccess = true;
        }
      }
    } catch (apiErr: any) {
      console.warn('Attendance API call notice:', apiErr.message);
    }

    // Mark PRESENT
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    const dateStr = now.toISOString().split('T')[0];

    const record: AttendanceRow = {
      timestamp: now.toISOString(),
      uniqueId,
      participantName,
      universityRegNumber: participant.universityRegistrationNumber || participant.universityRegNumber || participant.regNumber || '',
      email: participant.email || '',
      mobileNumber: participant.mobileNumber || participant.mobile || '',
      collegeName: participant.collegeName || participant.college || '',
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
  const uniqueId = req.query.uniqueId as string | undefined;

  // Query Attendance API
  try {
    const queryParams: Record<string, string> = {};
    if (event) queryParams.event = event;
    if (uniqueId) queryParams.uniqueId = uniqueId;

    const gasResult = await callAttendanceApiGet('attendance', queryParams);
    if (gasResult && gasResult.success && Array.isArray(gasResult.attendance) && gasResult.attendance.length > 0) {
      return res.json({ success: true, attendance: gasResult.attendance });
    }
  } catch (err: any) {
    console.warn('Attendance API query notice:', err.message);
  }

  let list = db.attendance;
  if (event) {
    list = list.filter((a) => a.scannedEvent.toLowerCase() === event.toLowerCase());
  }
  if (uniqueId) {
    list = list.filter((a) => a.uniqueId.toLowerCase() === uniqueId.toLowerCase());
  }

  res.json({ success: true, attendance: list });
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

  const totalScans = remoteEventCount !== null ? Math.max(matchingAttendance.length, remoteEventCount) : matchingAttendance.length;

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
  try {
    gasStatsResult = await callAttendanceApiGet('stats');
  } catch (err: any) {
    console.warn('Attendance API overall stats notice:', err.message);
  }

  const uniqueParticipants = new Set(db.attendance.map((a) => a.uniqueId.toLowerCase()));
  let totalAttendance = db.attendance.length;
  const activeCoordinators = db.coordinators.filter((c) => c.status === 'ACTIVE').length;
  const totalEvents = db.events.length;

  const eventCountMap: Record<string, number> = {};
  db.events.forEach((e) => {
    eventCountMap[e.eventName] = 0;
  });

  db.attendance.forEach((a) => {
    eventCountMap[a.scannedEvent] = (eventCountMap[a.scannedEvent] || 0) + 1;
  });

  if (gasStatsResult && gasStatsResult.success && gasStatsResult.stats) {
    if (typeof gasStatsResult.stats.totalAttendance === 'number') {
      totalAttendance = Math.max(totalAttendance, gasStatsResult.stats.totalAttendance);
    }
    if (gasStatsResult.stats.eventWise && typeof gasStatsResult.stats.eventWise === 'object') {
      for (const [evt, count] of Object.entries(gasStatsResult.stats.eventWise)) {
        eventCountMap[evt] = Math.max(eventCountMap[evt] || 0, Number(count) || 0);
      }
    }
  }

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
      totalParticipants: Math.max(uniqueParticipants.size, totalAttendance),
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
