/**
 * =========================================================================
 * SYNTRONIX '26 — ADMIN PORTAL BACKEND
 * Google Apps Script Web App for Google Sheets Database
 * Institution: EGS Pillay Engineering College
 * Department: Department of Computer Science and Engineering
 * Designed & Developed by Aegis Academy
 * =========================================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Drive and create a new Google Sheet named "SYNTRONIX 26 DATABASE".
 * 2. In Google Sheets, click "Extensions" > "Apps Script".
 * 3. Delete any default code in Code.gs and paste this entire file.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 *    - Description: "SYNTRONIX '26 Admin Portal API"
 *    - Execute as: "Me"
 *    - Who has access: "Anyone" (allows the Admin Portal frontend to call the API)
 * 6. Click "Deploy", authorize permissions, and copy the "Web app URL".
 * 7. In the SYNTRONIX Admin Portal, paste this URL into the Backend Configuration.
 * 
 * Note: Running 'initializeDatabase()' once or calling any initial API action
 * will automatically create all 8 required sheets with their exact headers and default records.
 */

var SHEETS = {
  ADMINS: "ADMINS",
  COORDINATORS: "COORDINATORS",
  EVENTS: "EVENTS",
  JURY: "JURY",
  ATTENDANCE: "ATTENDANCE",
  SCAN_LOGS: "SCAN LOGS",
  SYSTEM_SETTINGS: "SYSTEM SETTINGS",
  QR_RESET_LOGS: "QR RESET LOGS"
};

function doGet(e) {
  return handleRequest(e, "GET");
}

function doPost(e) {
  return handleRequest(e, "POST");
}

function handleRequest(e, method) {
  var output = { success: false, error: "Invalid request" };
  try {
    var params = {};
    if (e && e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      params = e.parameter;
    }

    var action = params.action || (e && e.parameter && e.parameter.action) || "ping";
    
    // Auto initialize sheets if not present
    ensureSheetsInitialized();

    switch (action) {
      case "ping":
      case "health":
        output = {
          success: true,
          status: "ONLINE",
          timestamp: new Date().toISOString(),
          event: "SYNTRONIX '26",
          institution: "EGS Pillay Engineering College",
          developer: "Designed & Developed by Aegis Academy"
        };
        break;

      case "adminAuth":
        output = handleAdminAuth(params);
        break;

      case "coordinatorAuth":
        output = handleCoordinatorAuth(params);
        break;

      case "getEvents":
        output = handleGetEvents();
        break;

      case "createEvent":
        output = handleCreateEvent(params);
        break;

      case "updateEvent":
        output = handleUpdateEvent(params);
        break;

      case "getCoordinators":
        output = handleGetCoordinators(params);
        break;

      case "addCoordinator":
        output = handleAddCoordinator(params);
        break;

      case "updateCoordinator":
        output = handleUpdateCoordinator(params);
        break;

      case "deactivateCoordinator":
        output = handleDeactivateCoordinator(params);
        break;

      case "deleteCoordinator":
        output = handleDeleteCoordinator(params);
        break;

      case "getJury":
        output = handleGetJury(params);
        break;

      case "addJury":
        output = handleAddJury(params);
        break;

      case "updateJury":
        output = handleUpdateJury(params);
        break;

      case "deactivateJury":
        output = handleDeactivateJury(params);
        break;

      case "markAttendance":
        output = handleMarkAttendance(params);
        break;

      case "getAttendance":
        output = handleGetAttendance(params);
        break;

      case "getParticipantAttendance":
        output = handleGetParticipantAttendance(params);
        break;

      case "getSystemStats":
        output = handleGetSystemStats();
        break;

      case "getCoordinatorStats":
        output = handleGetCoordinatorStats(params);
        break;

      case "getScanLogs":
        output = handleGetScanLogs(params);
        break;

      case "resetAttendance":
        output = handleResetAttendance(params);
        break;

      default:
        output = { success: false, error: "Action '" + action + "' not recognized." };
    }
  } catch (err) {
    output = { success: false, error: err.toString() };
  }

  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// INITIALIZATION & SCHEMA DEFINITION
// ---------------------------------------------------------------------------
function ensureSheetsInitialized() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. ADMINS
  var adminSheet = getOrCreateSheet(ss, SHEETS.ADMINS, [
    "Admin ID", "Admin Name", "Email", "Password Hash", "Role", "Status", "Created At"
  ]);
  if (adminSheet.getLastRow() <= 1) {
    // Initialize default Overall Admin: Sakthinathan / Aegis.CEO@03
    var defaultHash = hashPassword("Aegis.CEO@03");
    adminSheet.appendRow([
      "ADM-001",
      "Sakthinathan",
      "admin@syntronix26.egspec.ac.in",
      defaultHash,
      "OVERALL_ADMIN",
      "ACTIVE",
      new Date().toISOString()
    ]);
  }

  // 2. EVENTS
  var eventsSheet = getOrCreateSheet(ss, SHEETS.EVENTS, [
    "Event ID", "Event Name", "Category", "Status", "Created At", "Description"
  ]);
  if (eventsSheet.getLastRow() <= 1) {
    var initialEvents = [
      ["EVT-001", "Paper Presentation", "TECHNICAL", "ACTIVE", new Date().toISOString(), "Technical Paper Presentation on emerging technologies"],
      ["EVT-002", "Poster Making", "TECHNICAL", "ACTIVE", new Date().toISOString(), "Creative poster designing and technical exhibition"],
      ["EVT-003", "Non-Technical Event 1", "NON_TECHNICAL", "ACTIVE", new Date().toISOString(), "Temporary placeholder - Editable by Overall Admin"],
      ["EVT-004", "Non-Technical Event 2", "NON_TECHNICAL", "ACTIVE", new Date().toISOString(), "Temporary placeholder - Editable by Overall Admin"],
      ["EVT-005", "Non-Technical Event 3", "NON_TECHNICAL", "ACTIVE", new Date().toISOString(), "Temporary placeholder - Editable by Overall Admin"]
    ];
    for (var i = 0; i < initialEvents.length; i++) {
      eventsSheet.appendRow(initialEvents[i]);
    }
  }

  // 3. COORDINATORS
  var coordSheet = getOrCreateSheet(ss, SHEETS.COORDINATORS, [
    "Coordinator ID", "Coordinator Name", "Email", "Password Hash", "Assigned Event", "Status", "Created At", "Last Login"
  ]);
  if (coordSheet.getLastRow() <= 1) {
    var defaultCoordHash = hashPassword("Coord@123");
    var initialCoords = [
      ["CRD-001", "Dr. G. Pushpa (AP/CSE)", "pushpa.cse@egspec.ac.in", defaultCoordHash, "Paper Presentation", "ACTIVE", new Date().toISOString(), ""],
      ["CRD-002", "Mrs. L. Mohana Priya (AP/CSE)", "mohanapriya.cse@egspec.ac.in", defaultCoordHash, "Poster Making", "ACTIVE", new Date().toISOString(), ""],
      ["CRD-003", "Dr. K. Balasubramaniam (Head/CSE, Convenor)", "convenor.cse@egspec.ac.in", defaultCoordHash, "Paper Presentation", "ACTIVE", new Date().toISOString(), ""]
    ];
    for (var j = 0; j < initialCoords.length; j++) {
      coordSheet.appendRow(initialCoords[j]);
    }
  }

  // 4. JURY
  getOrCreateSheet(ss, SHEETS.JURY, [
    "Jury ID", "Jury Name", "Event", "Status", "Created At"
  ]);

  // 5. ATTENDANCE
  getOrCreateSheet(ss, SHEETS.ATTENDANCE, [
    "Timestamp", "Unique ID", "Participant Name", "University Registration Number",
    "Email", "Mobile Number", "College Name", "Field of Study", "Department",
    "Team Name", "Leader Name", "Members Name(s)", "Registered Events",
    "Scanned Event", "Coordinator Name", "Attendance Date", "Attendance Time", "Attendance Status"
  ]);

  // 6. SCAN LOGS
  getOrCreateSheet(ss, SHEETS.SCAN_LOGS, [
    "Timestamp", "Unique ID", "Participant Name", "Coordinator Name",
    "Coordinator Assigned Event", "Scanned Event", "Result", "Message"
  ]);

  // 7. SYSTEM SETTINGS
  getOrCreateSheet(ss, SHEETS.SYSTEM_SETTINGS, [
    "Key", "Value", "Updated At"
  ]);

  // 8. QR RESET LOGS
  getOrCreateSheet(ss, SHEETS.QR_RESET_LOGS, [
    "Timestamp", "Unique ID", "Admin Name", "Reason", "Previous Status", "New Status", "Event"
  ]);
}

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (headers && headers.length > 0) {
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
    }
  }
  return sheet;
}

// ---------------------------------------------------------------------------
// AUTHENTICATION
// ---------------------------------------------------------------------------
function handleAdminAuth(params) {
  var adminName = (params.adminName || "").trim();
  var password = params.password || "";
  
  if (!adminName || !password) {
    return { success: false, error: "Admin Name and Password are required." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.ADMINS);
  var data = sheet.getDataRange().getValues();

  var hashedInput = hashPassword(password);

  for (var i = 1; i < data.length; i++) {
    var rowAdminName = String(data[i][1]).trim();
    var rowHash = String(data[i][3]);
    var rowRole = String(data[i][4]);
    var rowStatus = String(data[i][5]);

    if (rowAdminName.toLowerCase() === adminName.toLowerCase()) {
      if (rowStatus !== "ACTIVE") {
        return { success: false, error: "Admin account is deactivated." };
      }
      if (rowHash === hashedInput) {
        return {
          success: true,
          user: {
            id: String(data[i][0]),
            name: rowAdminName,
            email: String(data[i][2]),
            role: rowRole
          },
          token: generateSessionToken(rowAdminName, rowRole)
        };
      }
    }
  }

  return { success: false, error: "Invalid admin credentials." };
}

function handleCoordinatorAuth(params) {
  var email = (params.email || "").trim().toLowerCase();
  var password = params.password || "";

  if (!email || !password) {
    return { success: false, error: "Invalid email or password." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var data = sheet.getDataRange().getValues();
  var hashedInput = hashPassword(password);

  for (var i = 1; i < data.length; i++) {
    var rowEmail = String(data[i][2]).trim().toLowerCase();
    var rowHash = String(data[i][3]);
    var rowStatus = String(data[i][5]);

    if (rowEmail === email) {
      if (rowStatus !== "ACTIVE") {
        return { success: false, error: "Coordinator account is inactive. Please contact Overall Admin." };
      }
      if (rowHash === hashedInput) {
        // Update last login
        sheet.getRange(i + 1, 8).setValue(new Date().toISOString());

        return {
          success: true,
          user: {
            id: String(data[i][0]),
            name: String(data[i][1]),
            email: rowEmail,
            role: "EVENT_COORDINATOR",
            assignedEvent: String(data[i][4])
          },
          token: generateSessionToken(email, "EVENT_COORDINATOR")
        };
      }
    }
  }

  // Exact prompt requirement: "Invalid email or password." Do not reveal which was wrong.
  return { success: false, error: "Invalid email or password." };
}

// ---------------------------------------------------------------------------
// ATTENDANCE MARKING WITH CONCURRENCY PROTECTION & STRICT VALIDATION
// ---------------------------------------------------------------------------
function handleMarkAttendance(params) {
  var participant = params.participant;
  var coordinatorName = params.coordinatorName || "Coordinator";
  var coordinatorEvent = (params.coordinatorAssignedEvent || "").trim();

  if (!participant || !participant.uniqueId) {
    logScan("", "Unknown", coordinatorName, coordinatorEvent, coordinatorEvent, "INVALID_QR", "Malformed QR data payload.");
    return { success: false, result: "INVALID_QR", message: "Invalid or incomplete QR data." };
  }

  var uniqueId = String(participant.uniqueId).trim();
  var participantName = String(participant.name || "").trim();
  var registeredEvents = participant.registeredEvents || [];
  if (typeof registeredEvents === "string") {
    try {
      registeredEvents = JSON.parse(registeredEvents);
    } catch (e) {
      registeredEvents = [registeredEvents];
    }
  }

  // STEP 4 & 5: Check whether participant registered for the coordinator's assigned event
  var isRegisteredForEvent = false;
  for (var k = 0; k < registeredEvents.length; k++) {
    if (String(registeredEvents[k]).trim().toLowerCase() === coordinatorEvent.toLowerCase()) {
      isRegisteredForEvent = true;
      break;
    }
  }

  if (!isRegisteredForEvent) {
    logScan(uniqueId, participantName, coordinatorName, coordinatorEvent, coordinatorEvent, "NOT_REGISTERED", "Participant not registered for " + coordinatorEvent);
    return {
      success: false,
      result: "NOT_REGISTERED",
      message: "NOT REGISTERED FOR THIS EVENT",
      participant: participant,
      scannedEvent: coordinatorEvent,
      coordinatorName: coordinatorName
    };
  }

  // STEP 6: Concurrency protection using Google Apps Script LockService
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Wait up to 10 seconds for concurrent scans
  } catch (e) {
    return { success: false, result: "ERROR", message: "Server busy, please scan again." };
  }

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var attSheet = ss.getSheetByName(SHEETS.ATTENDANCE);
    var data = attSheet.getDataRange().getValues();

    // Check UNIQUE ID + EVENT
    for (var i = 1; i < data.length; i++) {
      var rowUniqueId = String(data[i][1]).trim();
      var rowEvent = String(data[i][13]).trim();
      var rowStatus = String(data[i][17]).trim();

      if (rowUniqueId.toLowerCase() === uniqueId.toLowerCase() && 
          rowEvent.toLowerCase() === coordinatorEvent.toLowerCase() &&
          rowStatus === "PRESENT") {
        
        var prevCoord = String(data[i][14]);
        var prevTime = String(data[i][16]) || String(data[i][0]);

        logScan(uniqueId, participantName, coordinatorName, coordinatorEvent, coordinatorEvent, "ALREADY_MARKED", "Duplicate scan detected.");

        lock.releaseLock();
        return {
          success: false,
          result: "ALREADY_MARKED",
          message: "ALREADY MARKED",
          participant: participant,
          scannedEvent: coordinatorEvent,
          coordinatorName: coordinatorName,
          previousScan: {
            coordinatorName: prevCoord,
            scanTime: prevTime,
            scannedEvent: coordinatorEvent
          }
        };
      }
    }

    // Save Attendance record
    var now = new Date();
    var timeStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "hh:mm a");
    var dateStr = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyy-MM-dd");

    attSheet.appendRow([
      now.toISOString(),
      uniqueId,
      participantName,
      participant.universityRegistrationNumber || "",
      participant.email || "",
      participant.mobileNumber || "",
      participant.collegeName || "",
      participant.fieldOfStudy || "",
      participant.department || "",
      participant.teamName || "",
      participant.leaderName || "",
      participant.membersName || "",
      JSON.stringify(registeredEvents),
      coordinatorEvent,
      coordinatorName,
      dateStr,
      timeStr,
      "PRESENT"
    ]);

    logScan(uniqueId, participantName, coordinatorName, coordinatorEvent, coordinatorEvent, "SUCCESS", "Attendance marked successfully.");

    // Check if ALL registered events are completed
    var attendedEvents = [coordinatorEvent];
    for (var j = 1; j < data.length; j++) {
      if (String(data[j][1]).trim().toLowerCase() === uniqueId.toLowerCase() && String(data[j][17]) === "PRESENT") {
        var ev = String(data[j][13]).trim();
        if (attendedEvents.indexOf(ev) === -1) {
          attendedEvents.push(ev);
        }
      }
    }

    var allCompleted = true;
    for (var r = 0; r < registeredEvents.length; r++) {
      var target = String(registeredEvents[r]).trim().toLowerCase();
      var found = false;
      for (var a = 0; a < attendedEvents.length; a++) {
        if (attendedEvents[a].toLowerCase() === target) {
          found = true;
          break;
        }
      }
      if (!found) {
        allCompleted = false;
        break;
      }
    }

    lock.releaseLock();

    return {
      success: true,
      result: "SUCCESS",
      message: "ATTENDANCE MARKED",
      participant: participant,
      scannedEvent: coordinatorEvent,
      coordinatorName: coordinatorName,
      timestamp: now.toISOString(),
      attendanceTime: timeStr,
      allEventsCompleted: allCompleted,
      attendedEvents: attendedEvents
    };

  } catch (err) {
    lock.releaseLock();
    logScan(uniqueId, participantName, coordinatorName, coordinatorEvent, coordinatorEvent, "ERROR", err.toString());
    return { success: false, result: "ERROR", message: err.toString() };
  }
}

function logScan(uniqueId, participantName, coordinatorName, assignedEvent, scannedEvent, result, message) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(SHEETS.SCAN_LOGS);
    sheet.appendRow([
      new Date().toISOString(),
      uniqueId,
      participantName,
      coordinatorName,
      assignedEvent,
      scannedEvent,
      result,
      message
    ]);
  } catch (e) {
    // Ignore logging error
  }
}

// ---------------------------------------------------------------------------
// EVENTS MANAGEMENT
// ---------------------------------------------------------------------------
function handleGetEvents() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.EVENTS);
  var data = sheet.getDataRange().getValues();
  var list = [];

  for (var i = 1; i < data.length; i++) {
    list.push({
      eventId: String(data[i][0]),
      eventName: String(data[i][1]),
      category: String(data[i][2]),
      status: String(data[i][3]),
      createdAt: String(data[i][4]),
      description: String(data[i][5])
    });
  }

  return { success: true, events: list };
}

function handleCreateEvent(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.EVENTS);
  var eventId = "EVT-" + ("000" + sheet.getLastRow()).slice(-3);
  var now = new Date().toISOString();

  sheet.appendRow([
    eventId,
    params.eventName,
    params.category || "TECHNICAL",
    "ACTIVE",
    now,
    params.description || ""
  ]);

  return { success: true, eventId: eventId };
}

function handleUpdateEvent(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.EVENTS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === params.eventId) {
      if (params.eventName) sheet.getRange(i + 1, 2).setValue(params.eventName);
      if (params.category) sheet.getRange(i + 1, 3).setValue(params.category);
      if (params.status) sheet.getRange(i + 1, 4).setValue(params.status);
      if (params.description !== undefined) sheet.getRange(i + 1, 6).setValue(params.description);
      return { success: true };
    }
  }

  return { success: false, error: "Event not found" };
}

// ---------------------------------------------------------------------------
// COORDINATORS MANAGEMENT
// ---------------------------------------------------------------------------
function handleGetCoordinators(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  var eventFilter = params && params.event ? String(params.event).trim().toLowerCase() : null;

  for (var i = 1; i < data.length; i++) {
    var assignedEvent = String(data[i][4]);
    if (eventFilter && assignedEvent.toLowerCase() !== eventFilter) {
      continue;
    }
    list.push({
      coordinatorId: String(data[i][0]),
      coordinatorName: String(data[i][1]),
      email: String(data[i][2]),
      assignedEvent: assignedEvent,
      status: String(data[i][5]),
      createdAt: String(data[i][6]),
      lastLogin: String(data[i][7] || "")
    });
  }

  return { success: true, coordinators: list };
}

function handleAddCoordinator(params) {
  var name = (params.coordinatorName || "").trim();
  var email = (params.email || "").trim().toLowerCase();
  var password = params.password || "";
  var event = (params.assignedEvent || "").trim();

  if (!name || !email || !password || !event) {
    return { success: false, error: "All fields are required." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var data = sheet.getDataRange().getValues();

  // Check unique email
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2]).trim().toLowerCase() === email) {
      return { success: false, error: "A coordinator with this email already exists." };
    }
  }

  var coordId = "CRD-" + ("000" + sheet.getLastRow()).slice(-3);
  sheet.appendRow([
    coordId,
    name,
    email,
    hashPassword(password),
    event,
    "ACTIVE",
    new Date().toISOString(),
    ""
  ]);

  return { success: true, coordinatorId: coordId };
}

function handleUpdateCoordinator(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === params.coordinatorId) {
      if (params.coordinatorName) sheet.getRange(i + 1, 2).setValue(params.coordinatorName);
      if (params.assignedEvent) sheet.getRange(i + 1, 5).setValue(params.assignedEvent);
      if (params.status) sheet.getRange(i + 1, 6).setValue(params.status);
      if (params.password) sheet.getRange(i + 1, 4).setValue(hashPassword(params.password));
      return { success: true };
    }
  }

  return { success: false, error: "Coordinator not found." };
}

function handleDeactivateCoordinator(params) {
  return handleUpdateCoordinator({ coordinatorId: params.coordinatorId, status: "INACTIVE" });
}

function handleDeleteCoordinator(params) {
  var email = (params.email || "").trim().toLowerCase();
  var coordinatorId = (params.coordinatorId || "").trim();

  if (!email && !coordinatorId) {
    return { success: false, message: "Coordinator email is required." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    var rowCoordId = String(data[i][0]).trim();
    var rowEmail = String(data[i][2]).trim().toLowerCase();
    if ((email && rowEmail === email) || (coordinatorId && rowCoordId === coordinatorId)) {
      rowIndex = i + 1; // 1-indexed row in sheet
      break;
    }
  }

  if (rowIndex === -1) {
    return { success: false, message: "Coordinator not found." };
  }

  sheet.deleteRow(rowIndex);

  return {
    success: true,
    message: "Coordinator deleted successfully."
  };
}

// ---------------------------------------------------------------------------
// JURY MANAGEMENT
// ---------------------------------------------------------------------------
function handleGetJury(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.JURY);
  var data = sheet.getDataRange().getValues();
  var list = [];
  var eventFilter = params && params.event ? String(params.event).trim().toLowerCase() : null;

  for (var i = 1; i < data.length; i++) {
    var jEvent = String(data[i][2]);
    if (eventFilter && jEvent.toLowerCase() !== eventFilter) {
      continue;
    }
    list.push({
      juryId: String(data[i][0]),
      juryName: String(data[i][1]),
      event: jEvent,
      status: String(data[i][3]),
      createdAt: String(data[i][4])
    });
  }

  return { success: true, jury: list };
}

function handleAddJury(params) {
  var name = (params.juryName || "").trim();
  var event = (params.event || "").trim();

  if (!name || !event) {
    return { success: false, error: "Jury name and event are required." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.JURY);
  var juryId = "JRY-" + ("000" + sheet.getLastRow()).slice(-3);

  sheet.appendRow([
    juryId,
    name,
    event,
    "ACTIVE",
    new Date().toISOString()
  ]);

  return { success: true, juryId: juryId };
}

function handleUpdateJury(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.JURY);
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === params.juryId) {
      if (params.juryName) sheet.getRange(i + 1, 2).setValue(params.juryName);
      if (params.event) sheet.getRange(i + 1, 3).setValue(params.event);
      if (params.status) sheet.getRange(i + 1, 4).setValue(params.status);
      return { success: true };
    }
  }

  return { success: false, error: "Jury member not found." };
}

function handleDeactivateJury(params) {
  return handleUpdateJury({ juryId: params.juryId, status: "INACTIVE" });
}

// ---------------------------------------------------------------------------
// ATTENDANCE QUERIES & RESET
// ---------------------------------------------------------------------------
function handleGetAttendance(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var data = sheet.getDataRange().getValues();
  var list = [];
  var eventFilter = params && params.event ? String(params.event).trim().toLowerCase() : null;

  for (var i = 1; i < data.length; i++) {
    var rowEvent = String(data[i][13]);
    if (eventFilter && rowEvent.toLowerCase() !== eventFilter) {
      continue;
    }

    var registered = [];
    try {
      registered = JSON.parse(data[i][12]);
    } catch (e) {
      registered = [String(data[i][12])];
    }

    list.push({
      timestamp: String(data[i][0]),
      uniqueId: String(data[i][1]),
      participantName: String(data[i][2]),
      universityRegNumber: String(data[i][3]),
      email: String(data[i][4]),
      mobileNumber: String(data[i][5]),
      collegeName: String(data[i][6]),
      fieldOfStudy: String(data[i][7]),
      department: String(data[i][8]),
      teamName: String(data[i][9]),
      leaderName: String(data[i][10]),
      membersName: String(data[i][11]),
      registeredEvents: registered,
      scannedEvent: rowEvent,
      coordinatorName: String(data[i][14]),
      attendanceDate: String(data[i][15]),
      attendanceTime: String(data[i][16]),
      attendanceStatus: String(data[i][17])
    });
  }

  return { success: true, attendance: list };
}

function handleGetParticipantAttendance(params) {
  var uniqueId = (params.uniqueId || "").trim().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var data = sheet.getDataRange().getValues();
  var attended = [];

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim().toLowerCase() === uniqueId && String(data[i][17]) === "PRESENT") {
      attended.push({
        event: String(data[i][13]),
        time: String(data[i][16]),
        coordinator: String(data[i][14])
      });
    }
  }

  return { success: true, uniqueId: uniqueId, attendedEvents: attended };
}

function handleResetAttendance(params) {
  var uniqueId = (params.uniqueId || "").trim();
  var event = (params.event || "").trim();
  var adminName = (params.adminName || "").trim();
  var reason = (params.reason || "").trim();

  if (!uniqueId || !event || !adminName || !reason) {
    return { success: false, error: "Unique ID, Event, Admin Name, and Reason are all mandatory." };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var attSheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var data = attSheet.getDataRange().getValues();
  var found = false;

  for (var i = data.length - 1; i >= 1; i--) {
    var rowUniqueId = String(data[i][1]).trim();
    var rowEvent = String(data[i][13]).trim();

    if (rowUniqueId.toLowerCase() === uniqueId.toLowerCase() && rowEvent.toLowerCase() === event.toLowerCase()) {
      var prevStatus = String(data[i][17]);
      attSheet.deleteRow(i + 1);
      found = true;

      // Log to QR RESET LOGS
      var resetSheet = ss.getSheetByName(SHEETS.QR_RESET_LOGS);
      resetSheet.appendRow([
        new Date().toISOString(),
        uniqueId,
        adminName,
        reason,
        prevStatus,
        "RESET / REMOVED",
        event
      ]);
      break;
    }
  }

  if (!found) {
    return { success: false, error: "No attendance record found for " + uniqueId + " in " + event };
  }

  return { success: true, message: "Attendance state reset successfully for " + uniqueId + " in " + event };
}

// ---------------------------------------------------------------------------
// DASHBOARD & AUDIT STATS
// ---------------------------------------------------------------------------
function handleGetSystemStats() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Events
  var eventsSheet = ss.getSheetByName(SHEETS.EVENTS);
  var eventsData = eventsSheet.getDataRange().getValues();
  var totalEvents = Math.max(0, eventsData.length - 1);
  var eventNames = [];
  for (var e = 1; e < eventsData.length; e++) {
    eventNames.push(String(eventsData[e][1]));
  }

  // Attendance
  var attSheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var attData = attSheet.getDataRange().getValues();
  var totalAttendance = Math.max(0, attData.length - 1);
  var uniqueParticipantsMap = {};
  var eventCountMap = {};

  for (var n = 0; n < eventNames.length; n++) {
    eventCountMap[eventNames[n]] = 0;
  }

  var recentScans = [];
  for (var i = attData.length - 1; i >= 1; i--) {
    var uId = String(attData[i][1]);
    uniqueParticipantsMap[uId] = true;

    var ev = String(attData[i][13]);
    eventCountMap[ev] = (eventCountMap[ev] || 0) + 1;

    if (recentScans.length < 6) {
      recentScans.push({
        uniqueId: uId,
        participantName: String(attData[i][2]),
        scannedEvent: ev,
        coordinatorName: String(attData[i][14]),
        attendanceTime: String(attData[i][16]) || String(attData[i][0]),
        result: "SUCCESS"
      });
    }
  }

  // Active Coordinators
  var coordSheet = ss.getSheetByName(SHEETS.COORDINATORS);
  var coordData = coordSheet.getDataRange().getValues();
  var activeCoordinators = 0;
  for (var c = 1; c < coordData.length; c++) {
    if (String(coordData[c][5]) === "ACTIVE") activeCoordinators++;
  }

  var eventWise = [];
  for (var key in eventCountMap) {
    eventWise.push({ eventName: key, count: eventCountMap[key] });
  }

  return {
    success: true,
    stats: {
      totalParticipants: Object.keys(uniqueParticipantsMap).length,
      totalAttendance: totalAttendance,
      activeCoordinators: activeCoordinators,
      totalEvents: totalEvents,
      eventWiseAttendance: eventWise,
      recentScans: recentScans
    }
  };
}

function handleGetCoordinatorStats(params) {
  var event = (params.assignedEvent || "").trim().toLowerCase();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // Attendance for event
  var attSheet = ss.getSheetByName(SHEETS.ATTENDANCE);
  var attData = attSheet.getDataRange().getValues();
  var todayAttendance = 0;
  var totalScans = 0;
  var recent = [];

  for (var i = attData.length - 1; i >= 1; i--) {
    var rowEvent = String(attData[i][13]).trim().toLowerCase();
    if (rowEvent === event) {
      totalScans++;
      todayAttendance++;
      if (recent.length < 5) {
        recent.push({
          uniqueId: String(attData[i][1]),
          time: String(attData[i][16]),
          result: "SUCCESS"
        });
      }
    }
  }

  // Count already marked from logs
  var logsSheet = ss.getSheetByName(SHEETS.SCAN_LOGS);
  var logsData = logsSheet.getDataRange().getValues();
  var alreadyMarkedAttempts = 0;

  for (var l = 1; l < logsData.length; l++) {
    var lEvent = String(logsData[l][5]).trim().toLowerCase();
    var lResult = String(logsData[l][6]);
    if (lEvent === event && lResult === "ALREADY_MARKED") {
      alreadyMarkedAttempts++;
    }
  }

  return {
    success: true,
    stats: {
      todayAttendance: todayAttendance,
      totalScans: totalScans,
      alreadyMarkedAttempts: alreadyMarkedAttempts,
      recentScans: recent
    }
  };
}

function handleGetScanLogs(params) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEETS.SCAN_LOGS);
  var data = sheet.getDataRange().getValues();
  var list = [];
  var limit = (params && params.limit) || 100;

  for (var i = data.length - 1; i >= 1 && list.length < limit; i--) {
    list.push({
      timestamp: String(data[i][0]),
      uniqueId: String(data[i][1]),
      participantName: String(data[i][2]),
      coordinatorName: String(data[i][3]),
      coordinatorAssignedEvent: String(data[i][4]),
      scannedEvent: String(data[i][5]),
      result: String(data[i][6]),
      message: String(data[i][7])
    });
  }

  return { success: true, logs: list };
}

// ---------------------------------------------------------------------------
// UTILITIES: PASSWORD HASHING & TOKENS
// ---------------------------------------------------------------------------
function hashPassword(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password + "SYNTRONIX_AEGIS_2026_SALT");
  var hex = "";
  for (var i = 0; i < rawHash.length; i++) {
    var b = (rawHash[i] + 256) % 256;
    var str = b.toString(16);
    if (str.length === 1) str = "0" + str;
    hex += str;
  }
  return hex;
}

function generateSessionToken(username, role) {
  var payload = username + "|" + role + "|" + new Date().getTime();
  return Utilities.base64Encode(payload);
}
