/***************************************************************
 * SYNTRONIX '26 — ADMIN ATTENDANCE DATABASE
 * Google Apps Script Web App for Google Sheets Database
 * Institution: EGS Pillay Engineering College
 * Department: Department of Computer Science and Engineering
 * Designed & Developed by Aegis Academy
 ***************************************************************/

/* ============================================================
   CONFIGURATION
   ============================================================ */

const CONFIG = {
  EVENT_NAME: "SYNTRONIX '26",
  INSTITUTION: "EGS Pillay Engineering College",
  DEPARTMENT: "Department of Computer Science and Engineering",
  API_KEY: "SYN26_ADMIN_7xK92pLm4Q8vZ3",

  // Sheet Names
  ATTENDANCE_SHEET: "Syntronx'26 Attendance database",
  SCAN_LOG_SHEET: "Scan Logs",
  RESET_LOG_SHEET: "QR Reset Logs",

  // Allowed Symposium Events List
  EVENTS: [
    "Paper Presentation",
    "Prompt Fest",
    "VIBE VISTA",
    "FRENZY 2K26",
    "MEMORY HUNT",
    "THE IMPOSTER GAME",
    "Online Article Presentation",
    "Poster Making",
    "Non-Technical Event 1",
    "Non-Technical Event 2",
    "Non-Technical Event 3"
  ]
};

/* ============================================================
   SHEET SETUP
   ============================================================ */

function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createAttendanceSheet_(ss);
  createScanLogSheet_(ss);
  createResetLogSheet_(ss);
  return "SYNTRONIX '26 Admin Database Ready";
}

function createAttendanceSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET) || ss.getSheetByName("ATTENDANCE");
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.ATTENDANCE_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Unique ID",
      "Participant Name",
      "University Registration Number",
      "Email",
      "Mobile Number",
      "College Name",
      "Field of Study",
      "Department",
      "Team Name",
      "Leader Name",
      "Members Name(s)",
      "Event",
      "Coordinator Name",
      "Attendance Date",
      "Attendance Time",
      "Attendance Status",
      "QR Status"
    ]);
  }
  formatHeader_(sheet);
}

function createScanLogSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.SCAN_LOG_SHEET) || ss.getSheetByName("SCAN LOGS");
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SCAN_LOG_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Unique ID",
      "Participant Name",
      "Coordinator Name",
      "Event",
      "Result",
      "Message"
    ]);
  }
  formatHeader_(sheet);
}

function createResetLogSheet_(ss) {
  let sheet = ss.getSheetByName(CONFIG.RESET_LOG_SHEET) || ss.getSheetByName("QR RESET LOGS");
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.RESET_LOG_SHEET);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      "Timestamp",
      "Unique ID",
      "Admin Name",
      "Reason",
      "Previous QR Status",
      "New QR Status"
    ]);
  }
  formatHeader_(sheet);
}

function formatHeader_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) return;
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight("bold");
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, lastColumn);
}

/* ============================================================
   WEB APP — GET
   ============================================================ */

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const action = params.action || "status";

    switch (action) {
      case "status":
      case "ping":
      case "health":
        return jsonResponse_({
          success: true,
          system: "SYNTRONIX '26 Admin Database",
          status: "ONLINE",
          version: "1.0.0"
        });

      case "stats":
        return getStats_();

      case "attendance":
      case "getAttendance":
      case "getAllAttendance":
        return getAttendanceRecords_(params.uniqueId, params.event || params.scannedEvent);

      default:
        return jsonResponse_({
          success: false,
          error: "Unknown GET action"
        });
    }
  } catch (error) {
    return jsonResponse_({
      success: false,
      error: error.message
    });
  }
}

/* ============================================================
   WEB APP — POST
   ============================================================ */

function doPost(e) {
  try {
    if (!e || !e.postData) {
      return jsonResponse_({
        success: false,
        error: "No POST data received"
      });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (jsonError) {
      data = e.parameter || {};
    }

    /*
     * API KEY CHECK
     */
    if (String(data.apiKey || "") !== CONFIG.API_KEY) {
      return jsonResponse_({
        success: false,
        code: "UNAUTHORIZED",
        error: "Invalid API key"
      });
    }

    const action = String(data.action || "");

    switch (action) {
      case "markAttendance":
        return markAttendance_(data);

      case "checkQR":
        return checkQR_(data);

      case "deleteAttendance":
      case "removeAttendance":
      case "deleteAttendanceRecord":
        return deleteAttendance_(data);

      case "resetQR":
      case "resetAttendance":
        return resetQR_(data);

      default:
        return jsonResponse_({
          success: false,
          error: "Unknown action"
        });
    }
  } catch (error) {
    return jsonResponse_({
      success: false,
      error: error.message
    });
  }
}

/* ============================================================
   CHECK QR
   ============================================================ */

function checkQR_(data) {
  const uniqueId = normalizeUniqueId_(data.uniqueId);
  const eventName = clean_(data.eventName || data.event || data.scannedEvent);

  if (!uniqueId) {
    return jsonResponse_({
      success: false,
      code: "INVALID_QR",
      error: "Unique ID is missing"
    });
  }

  const sheet = getAttendanceSheet_();
  const existing = findParticipantRecord_(sheet, uniqueId, eventName);

  if (existing) {
    return jsonResponse_({
      success: true,
      code: "QR_ALREADY_USED",
      qrStatus: "USED",
      message: "This QR code has already been used for this event.",
      previousRecord: existing
    });
  }

  return jsonResponse_({
    success: true,
    code: "QR_UNUSED",
    qrStatus: "UNUSED",
    message: "QR code is valid and unused for this event."
  });
}

/* ============================================================
   MARK ATTENDANCE
   ============================================================ */

function markAttendance_(data) {
  const participant = {
    name: clean_(data.name || data.participantName),
    regNo: clean_(data.regNo || data.registrationNo || data.universityRegistrationNumber),
    email: clean_(data.email),
    mobile: clean_(data.mobile || data.mobileNumber),
    college: clean_(data.college || data.collegeName),
    fieldOfStudy: clean_(data.fieldOfStudy),
    department: clean_(data.department),
    teamName: clean_(data.teamName),
    leaderName: clean_(data.leaderName),
    membersName: clean_(data.membersName || data.members),
    uniqueId: normalizeUniqueId_(data.uniqueId || data.unique_id)
  };

  const coordinatorName = clean_(data.coordinatorName || data.coordinator);
  const eventName = clean_(data.eventName || data.scannedEvent || data.event);

  if (!participant.uniqueId) {
    return jsonResponse_({
      success: false,
      code: "INVALID_QR",
      error: "Unique ID is missing from QR."
    });
  }

  if (!coordinatorName) {
    return jsonResponse_({
      success: false,
      code: "COORDINATOR_REQUIRED",
      error: "Coordinator name is required."
    });
  }

  if (!eventName) {
    return jsonResponse_({
      success: false,
      code: "EVENT_REQUIRED",
      error: "Event name is required."
    });
  }

  if (CONFIG.EVENTS.indexOf(eventName) === -1) {
    return jsonResponse_({
      success: false,
      code: "INVALID_EVENT",
      error: "Invalid event selected: " + eventName
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (error) {
    return jsonResponse_({
      success: false,
      code: "SERVER_BUSY",
      error: "Please try scanning again."
    });
  }

  try {
    const sheet = getAttendanceSheet_();

    /*
     * CHECK WHETHER ATTENDANCE HAS ALREADY BEEN MARKED FOR THIS SPECIFIC EVENT
     */
    const existing = findParticipantRecord_(sheet, participant.uniqueId, eventName);

    if (existing) {
      logScan_({
        uniqueId: participant.uniqueId,
        participantName: participant.name,
        coordinatorName: coordinatorName,
        eventName: eventName,
        result: "REJECTED",
        message: "QR ALREADY USED FOR THIS EVENT"
      });

      return jsonResponse_({
        success: false,
        code: "QR_ALREADY_USED",
        qrStatus: "USED",
        message: "QR ALREADY USED FOR THIS EVENT",
        previousRecord: existing
      });
    }

    const now = new Date();
    const timezone = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    const attendanceDate = Utilities.formatDate(now, timezone, "dd-MM-yyyy");
    const attendanceTime = Utilities.formatDate(now, timezone, "hh:mm:ss a");

    sheet.appendRow([
      now,
      participant.uniqueId,
      participant.name,
      participant.regNo,
      participant.email,
      participant.mobile,
      participant.college,
      participant.fieldOfStudy,
      participant.department,
      participant.teamName,
      participant.leaderName,
      participant.membersName,
      eventName,
      coordinatorName,
      attendanceDate,
      attendanceTime,
      "PRESENT",
      "USED"
    ]);

    SpreadsheetApp.flush();

    logScan_({
      uniqueId: participant.uniqueId,
      participantName: participant.name,
      coordinatorName: coordinatorName,
      eventName: eventName,
      result: "SUCCESS",
      message: "Attendance marked"
    });

    return jsonResponse_({
      success: true,
      code: "ATTENDANCE_MARKED",
      message: "Attendance marked successfully.",
      participant: participant,
      attendance: {
        event: eventName,
        coordinator: coordinatorName,
        date: attendanceDate,
        time: attendanceTime,
        status: "PRESENT",
        qrStatus: "USED"
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
   REAL ATTENDANCE DELETION (ROW DELETED FROM GOOGLE SHEET)
   ============================================================ */

function deleteAttendance_(data) {
  const uniqueId = normalizeUniqueId_(data.uniqueId || data.unique_id);
  const eventName = clean_(data.eventName || data.event || data.scannedEvent);
  const adminName = clean_(data.adminName || "Overall Admin");

  if (!uniqueId) {
    return jsonResponse_({
      success: false,
      code: "INVALID_PARAM",
      error: "Unique ID is required for deletion."
    });
  }

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    return jsonResponse_({
      success: false,
      code: "SERVER_BUSY",
      error: "Server busy, please try deletion again."
    });
  }

  try {
    const sheet = getAttendanceSheet_();
    const values = sheet.getDataRange().getValues();
    if (values.length < 2) {
      return jsonResponse_({
        success: false,
        code: "RECORD_NOT_FOUND",
        error: "No attendance records exist in database."
      });
    }

    const targetEventNorm = eventName ? eventName.toLowerCase() : null;
    let deletedCount = 0;
    let deletedRowDetails = null;

    for (let i = values.length - 1; i >= 1; i--) {
      const row = values[i];
      const rowUniqueId = normalizeUniqueId_(row[1]);
      const rowEventNorm = clean_(row[12]).toLowerCase();

      if (rowUniqueId === uniqueId && (!targetEventNorm || rowEventNorm === targetEventNorm)) {
        deletedRowDetails = {
          uniqueId: row[1],
          participantName: row[2],
          event: row[12],
          coordinator: row[13]
        };
        sheet.deleteRow(i + 1); // Delete actual row from Google Sheet
        deletedCount++;
        if (targetEventNorm) break; // Delete single matching event row
      }
    }

    SpreadsheetApp.flush();

    if (deletedCount > 0) {
      logScan_({
        uniqueId: uniqueId,
        participantName: deletedRowDetails ? deletedRowDetails.participantName : "Participant",
        coordinatorName: adminName,
        eventName: eventName || "ALL",
        result: "DELETED",
        message: "Attendance row deleted by Overall Admin. QR re-eligible for scanning."
      });

      return jsonResponse_({
        success: true,
        code: "ATTENDANCE_DELETED",
        message: "Attendance record deleted successfully from Google Sheet database.",
        deletedCount: deletedCount,
        uniqueId: uniqueId,
        event: eventName
      });
    }

    return jsonResponse_({
      success: false,
      code: "RECORD_NOT_FOUND",
      error: "No matching attendance record found for " + uniqueId + (eventName ? " in " + eventName : "")
    });
  } finally {
    lock.releaseLock();
  }
}

/* ============================================================
   FIND EXISTING QR RECORD BY UNIQUE ID & EVENT
   ============================================================ */

function findParticipantRecord_(sheet, uniqueId, eventName) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;

  const targetEventNorm = clean_(eventName).toLowerCase();

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowUniqueId = normalizeUniqueId_(row[1]);
    const rowEventNorm = clean_(row[12]).toLowerCase();

    if (rowUniqueId === uniqueId && (!eventName || rowEventNorm === targetEventNorm)) {
      return {
        timestamp: row[0],
        uniqueId: row[1],
        participantName: row[2],
        regNo: row[3],
        email: row[4],
        mobile: row[5],
        college: row[6],
        fieldOfStudy: row[7],
        department: row[8],
        teamName: row[9],
        leaderName: row[10],
        membersName: row[11],
        event: row[12],
        coordinator: row[13],
        date: row[14],
        time: row[15],
        status: row[16],
        qrStatus: row[17]
      };
    }
  }
  return null;
}

/* ============================================================
   GET ATTENDANCE RECORDS (ALL OR FILTERED BY UNIQUE ID / EVENT)
   ============================================================ */

function getAttendanceRecords_(uniqueId, eventFilter) {
  const sheet = getAttendanceSheet_();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) {
    return jsonResponse_({
      success: true,
      totalCount: 0,
      records: [],
      attendance: []
    });
  }

  const results = [];
  const targetId = uniqueId ? normalizeUniqueId_(uniqueId) : null;
  const targetEvent = eventFilter ? clean_(eventFilter).toLowerCase() : null;

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const rowId = normalizeUniqueId_(row[1]);
    const rowEvent = clean_(row[12]);

    if (targetId && rowId !== targetId) continue;
    if (targetEvent && rowEvent.toLowerCase() !== targetEvent) continue;

    results.push({
      timestamp: row[0],
      uniqueId: row[1],
      participantName: row[2],
      registrationNo: row[3],
      regNo: row[3],
      universityRegNumber: row[3],
      email: row[4],
      mobile: row[5],
      mobileNumber: row[5],
      college: row[6],
      collegeName: row[6],
      fieldOfStudy: row[7],
      department: row[8],
      teamName: row[9],
      leaderName: row[10],
      membersName: row[11],
      event: row[12],
      scannedEvent: row[12],
      eventName: row[12],
      coordinator: row[13],
      coordinatorName: row[13],
      date: row[14],
      attendanceDate: row[14],
      time: row[15],
      attendanceTime: row[15],
      status: row[16],
      attendanceStatus: row[16],
      qrStatus: row[17]
    });
  }

  return jsonResponse_({
    success: true,
    totalCount: results.length,
    records: results,
    attendance: results
  });
}

/* ============================================================
   PARTICIPANT ATTENDANCE HISTORY
   ============================================================ */

function getParticipantAttendance_(uniqueId) {
  return getAttendanceRecords_(uniqueId, null);
}

/* ============================================================
   DASHBOARD STATISTICS
   ============================================================ */

function getStats_() {
  const sheet = getAttendanceSheet_();
  const values = sheet.getDataRange().getValues();
  const totalAttendance = Math.max(0, values.length - 1);
  const eventCounts = {};

  CONFIG.EVENTS.forEach(event => {
    eventCounts[event] = 0;
  });

  const coordinatorCounts = {};

  for (let i = 1; i < values.length; i++) {
    const event = String(values[i][12] || "");
    const coordinator = String(values[i][13] || "");

    if (eventCounts[event] !== undefined) {
      eventCounts[event]++;
    }

    if (coordinator) {
      if (!coordinatorCounts[coordinator]) {
        coordinatorCounts[coordinator] = 0;
      }
      coordinatorCounts[coordinator]++;
    }
  }

  return jsonResponse_({
    success: true,
    stats: {
      totalAttendance: totalAttendance,
      eventWise: eventCounts,
      coordinatorWise: coordinatorCounts
    }
  });
}

/* ============================================================
   RESET QR LOGGING (ADMIN COMPATIBILITY)
   ============================================================ */

function resetQR_(data) {
  return deleteAttendance_(data);
}

/* ============================================================
   SCAN LOG
   ============================================================ */

function logScan_(data) {
  const sheet = getScanLogSheet_();
  sheet.appendRow([
    new Date(),
    data.uniqueId,
    data.participantName,
    data.coordinatorName,
    data.eventName,
    data.result,
    data.message
  ]);
}

/* ============================================================
   GET SHEETS
   ============================================================ */

function getAttendanceSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET) || ss.getSheetByName("ATTENDANCE");
  if (!sheet) {
    createAttendanceSheet_(ss);
    sheet = ss.getSheetByName(CONFIG.ATTENDANCE_SHEET) || ss.getSheetByName("ATTENDANCE");
  }
  return sheet;
}

function getScanLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SCAN_LOG_SHEET) || ss.getSheetByName("SCAN LOGS");
  if (!sheet) {
    createScanLogSheet_(ss);
    sheet = ss.getSheetByName(CONFIG.SCAN_LOG_SHEET) || ss.getSheetByName("SCAN LOGS");
  }
  return sheet;
}

function getResetLogSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.RESET_LOG_SHEET) || ss.getSheetByName("QR RESET LOGS");
  if (!sheet) {
    createResetLogSheet_(ss);
    sheet = ss.getSheetByName(CONFIG.RESET_LOG_SHEET) || ss.getSheetByName("QR RESET LOGS");
  }
  return sheet;
}

/* ============================================================
   UTILITIES
   ============================================================ */

function clean_(value) {
  return String(value || "").trim();
}

function normalizeUniqueId_(value) {
  return String(value || "").trim().toUpperCase();
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
