/**
 * SYNTRONIX '26 — Admin Portal
 * QR Code Data Parser & Normalizer
 * Designed & Developed by Aegis Academy
 */

import { ParticipantQRData } from '../types';

export function parseParticipantQR(rawData: string): ParticipantQRData | null {
  if (!rawData || typeof rawData !== 'string') return null;

  const trimmed = rawData.trim();
  if (!trimmed) return null;

  // 1. Try Direct JSON Parse
  try {
    const obj = JSON.parse(trimmed);
    if (obj && typeof obj === 'object') {
      return normalizeParticipantObject(obj);
    }
  } catch {
    // Not plain JSON, continue trying alternatives
  }

  // 2. Try Base64 Encoded JSON
  try {
    const decoded = atob(trimmed);
    const obj = JSON.parse(decoded);
    if (obj && typeof obj === 'object') {
      return normalizeParticipantObject(obj);
    }
  } catch {
    // Not base64, continue
  }

  // 3. Try URL-encoded JSON
  try {
    const decoded = decodeURIComponent(trimmed);
    const obj = JSON.parse(decoded);
    if (obj && typeof obj === 'object') {
      return normalizeParticipantObject(obj);
    }
  } catch {
    // Not url encoded JSON
  }

  // 4. Try URL or query string format (e.g. https://.../?uniqueId=SYN26-0012&name=...)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?')) {
    try {
      const urlStr = trimmed.startsWith('http') ? trimmed : 'http://portal.local/?' + trimmed;
      const url = new URL(urlStr);
      const dict: Record<string, string> = {};
      url.searchParams.forEach((val, key) => {
        dict[key] = val;
      });

      // Check if there is an embedded JSON payload inside a query parameter (e.g. ?data= or ?qr=)
      for (const paramKey of ['data', 'qr', 'payload', 'json', 'participant', 'p']) {
        if (dict[paramKey]) {
          const nested = parseParticipantQR(dict[paramKey]);
          if (nested) return nested;
        }
      }

      if (dict.uniqueId || dict.unique_id || dict.id || dict.participantId || dict.name) {
        return normalizeParticipantObject(dict);
      }
    } catch {
      // url parse failed
    }
  }

  // 5. Try Key-Value line based format
  // Example:
  // Unique ID: SYN26-0001
  // Name: Arun Kumar
  // Reg No: 810022104001
  // Events: Paper Presentation, Non-Technical Event 1
  try {
    const lines = trimmed.split(/\r?\n/);
    const dict: Record<string, string> = {};

    for (const line of lines) {
      const splitIdx = line.indexOf(':');
      if (splitIdx > 0) {
        const key = line.slice(0, splitIdx).trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const val = line.slice(splitIdx + 1).trim();
        dict[key] = val;
      }
    }

    if (dict.uniqueid || dict.participantid || dict.id || dict.name) {
      return normalizeParticipantObject(dict);
    }
  } catch {
    // line parsing failed
  }

  // 6. Try Pipe or Semicolon or Comma separated values
  if (trimmed.includes('|') || trimmed.includes(';')) {
    try {
      const parts = trimmed.split(/[|;]/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const idIdx = parts.findIndex((p) => /SYN|EVT|[0-9]{4,}/i.test(p));
        if (idIdx !== -1) {
          const uniqueId = parts[idIdx];
          const remaining = parts.filter((_, i) => i !== idIdx);
          return normalizeParticipantObject({
            uniqueId,
            name: remaining[0] || 'Participant',
            events: remaining.slice(1),
          });
        }
      }
    } catch {
      // delimited parse failed
    }
  }

  // 7. Check if the string itself is a direct Unique ID (e.g. SYN26-0012, SYN-001, etc.)
  const directIdMatch = trimmed.match(/^SYN(?:26)?[-_]?[0-9A-Za-z]+$/i);
  if (directIdMatch) {
    return normalizeParticipantObject({
      uniqueId: directIdMatch[0].toUpperCase(),
      name: `Participant (${directIdMatch[0].toUpperCase()})`,
    });
  }

  return null;
}

export function isParticipantRegisteredForEvent(
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

export function parseSelectedEvents(rawEvents: any): string[] {
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
    // Split on comma, semicolon, newline, or pipe
    return trimmed.split(/[,;\n\r|]+/).map((e) => e.trim()).filter(Boolean);
  }
  return [String(rawEvents).trim()];
}

export function normalizeParticipantObject(obj: any): ParticipantQRData {
  const findValue = (...keys: string[]): string => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
    }
    return '';
  };

  // 1. Find unique ID (Use unique_id as participant's unique identifier)
  const unique_id =
    findValue(
      'unique_id',
      'uniqueId',
      'uniqueParticipantId',
      'unique_participant_id',
      'participantId',
      'participant_id',
      'id',
      'pid',
      'uid'
    ) || 'SYN26-UNKNOWN';

  // 2. Name
  const name =
    findValue('name', 'participantName', 'participant_name', 'studentName', 'student_name') ||
    'Participant';

  // 3. Registration Number
  const registrationNo = findValue(
    'registrationNo',
    'registration_no',
    'registrationNumber',
    'registration_number',
    'universityRegistrationNumber',
    'university_registration_number',
    'regNo',
    'reg_no',
    'registerNumber',
    'rollNo'
  );

  // 4. Contact & Personal Info
  const email = findValue('email', 'emailId', 'email_id', 'mail');
  const mobile = findValue('mobile', 'mobileNumber', 'mobile_number', 'phone', 'contact');
  const college = findValue('college', 'collegeName', 'college_name', 'institution');
  const fieldOfStudy = findValue('fieldOfStudy', 'field_of_study', 'degree', 'course');
  const department = findValue('department', 'dept', 'branch');
  const teamName = findValue('teamName', 'team_name', 'team');
  const leaderName = findValue('leaderName', 'leader_name', 'leader') || name;
  const members = findValue('members', 'membersName', 'members_name', 'teamMembers', 'team_members');
  const degree = findValue('degree');
  const year = findValue('year');
  const collegeLocation = findValue('collegeLocation', 'college_location', 'location');
  const teamLeaderEmail = findValue('teamLeaderEmail', 'team_leader_email', 'leaderEmail', 'leader_email');
  const member1Mobile = findValue('member1Mobile', 'member1_mobile', 'member1Phone');
  const member2Mobile = findValue('member2Mobile', 'member2_mobile', 'member2Phone');

  // 5. Selected Events (may contain one or multiple events)
  const rawSelectedEvents =
    obj.selectedEvents ||
    obj.selected_events ||
    obj.registeredEvents ||
    obj.registered_events ||
    obj.events ||
    obj.registered;

  const selectedEventsStr =
    typeof rawSelectedEvents === 'string'
      ? rawSelectedEvents.trim()
      : Array.isArray(rawSelectedEvents)
      ? rawSelectedEvents.join(', ')
      : '';

  const registeredEvents = parseSelectedEvents(rawSelectedEvents);

  return {
    ...obj,
    unique_id,
    uniqueId: unique_id,
    name,
    registrationNo,
    universityRegistrationNumber: registrationNo,
    email,
    mobile,
    mobileNumber: mobile,
    college,
    collegeName: college,
    fieldOfStudy,
    department,
    teamName,
    leaderName,
    members,
    membersName: members,
    degree,
    year,
    collegeLocation,
    teamLeaderEmail,
    member1Mobile,
    member2Mobile,
    selectedEvents: selectedEventsStr,
    registeredEvents,
    event: obj.event || "SYNTRONIX '26",
    timestamp: obj.timestamp || new Date().toISOString(),
  };
}

// Sample QR generator for demonstration and stress-testing scanner states
export function generateSampleParticipantQR(scenario: 'paper_and_nontech' | 'poster_only' | 'all_events' | 'wrong_event'): string {
  switch (scenario) {
    case 'paper_and_nontech':
      return JSON.stringify(
        {
          uniqueId: 'SYN26-0012',
          name: 'Arun Kumar',
          universityRegistrationNumber: '810022104005',
          email: 'arun.kumar@gmail.com',
          mobileNumber: '+91 9876543210',
          collegeName: 'EGS Pillay Engineering College',
          fieldOfStudy: 'B.E. Computer Science and Engineering',
          department: 'CSE',
          teamName: 'CyberKnights',
          leaderName: 'Arun Kumar',
          membersName: 'Kavitha S, Rahul M',
          registeredEvents: ['Paper Presentation', 'Non-Technical Event 1'],
        },
        null,
        2
      );

    case 'poster_only':
      return JSON.stringify(
        {
          uniqueId: 'SYN26-0028',
          name: 'Pooja Varshini',
          universityRegistrationNumber: '810022104042',
          email: 'pooja.v@gmail.com',
          mobileNumber: '+91 9443218765',
          collegeName: 'Anjalai Ammal Mahalingam Engineering College',
          fieldOfStudy: 'B.Tech Information Technology',
          department: 'IT',
          teamName: 'TechVision',
          leaderName: 'Pooja Varshini',
          membersName: 'Archana R',
          registeredEvents: ['Poster Making'],
        },
        null,
        2
      );

    case 'wrong_event':
      return JSON.stringify(
        {
          uniqueId: 'SYN26-0035',
          name: 'Dinesh Karthik',
          universityRegistrationNumber: '810022104018',
          email: 'dinesh.k@gmail.com',
          mobileNumber: '+91 9842109876',
          collegeName: 'AVC College of Engineering',
          fieldOfStudy: 'B.E. Computer Science and Engineering',
          department: 'CSE',
          teamName: 'CodeBusters',
          leaderName: 'Dinesh Karthik',
          membersName: 'Surya P',
          registeredEvents: ['Poster Making', 'Non-Technical Event 2'],
        },
        null,
        2
      );

    case 'all_events':
      return JSON.stringify(
        {
          uniqueId: 'SYN26-0041',
          name: 'Naveen Raj',
          universityRegistrationNumber: '810022104060',
          email: 'naveen.raj@gmail.com',
          mobileNumber: '+91 9789012345',
          collegeName: 'EGS Pillay Engineering College',
          fieldOfStudy: 'B.E. Computer Science and Engineering',
          department: 'CSE',
          teamName: 'Quantum Coders',
          leaderName: 'Naveen Raj',
          membersName: 'Vignesh K, Madhan S',
          registeredEvents: ['Paper Presentation', 'Poster Making'],
        },
        null,
        2
      );
  }
}
