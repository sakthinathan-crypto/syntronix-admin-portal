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

function normalizeParticipantObject(obj: any): ParticipantQRData {
  const findValue = (...keys: string[]): string => {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null && String(obj[k]).trim() !== '') {
        return String(obj[k]).trim();
      }
    }
    return '';
  };

  // Find unique ID
  const uniqueId =
    findValue(
      'uniqueId',
      'unique_id',
      'uniqueParticipantId',
      'unique_participant_id',
      'participantId',
      'participant_id',
      'id',
      'pid',
      'uid'
    ) || 'SYN26-UNKNOWN';

  // Find Name
  const name = findValue('name', 'participantName', 'participant_name', 'studentName', 'student_name') || 'Participant';

  // Registration Number
  const universityRegistrationNumber = findValue(
    'universityRegistrationNumber',
    'university_registration_number',
    'registrationNumber',
    'registration_number',
    'regNo',
    'reg_no',
    'registerNumber',
    'rollNo'
  );

  const email = findValue('email', 'emailId', 'email_id', 'mail');
  const mobileNumber = findValue('mobileNumber', 'mobile_number', 'mobile', 'phone', 'contact');
  const collegeName = findValue('collegeName', 'college_name', 'college', 'institution');
  const fieldOfStudy = findValue('fieldOfStudy', 'field_of_study', 'degree', 'course');
  const department = findValue('department', 'dept', 'branch') || 'CSE';
  const teamName = findValue('teamName', 'team_name', 'team');
  const leaderName = findValue('leaderName', 'leader_name', 'leader') || name;
  const membersName = findValue('membersName', 'members_name', 'members', 'teamMembers', 'team_members');

  // Registered Events
  let registeredEvents: string[] = [];
  const rawEvents =
    obj.registeredEvents ||
    obj.registered_events ||
    obj.events ||
    obj.registered ||
    obj.selectedEvents;

  if (Array.isArray(rawEvents)) {
    registeredEvents = rawEvents.map((e) => String(e).trim()).filter(Boolean);
  } else if (typeof rawEvents === 'string') {
    try {
      const parsed = JSON.parse(rawEvents);
      if (Array.isArray(parsed)) {
        registeredEvents = parsed.map((e) => String(e).trim()).filter(Boolean);
      } else {
        registeredEvents = rawEvents.split(',').map((e) => e.trim()).filter(Boolean);
      }
    } catch {
      registeredEvents = rawEvents.split(',').map((e) => e.trim()).filter(Boolean);
    }
  }

  // Default fallback if no events explicitly listed
  if (registeredEvents.length === 0) {
    registeredEvents = ['Paper Presentation'];
  }

  return {
    uniqueId,
    name,
    universityRegistrationNumber,
    email,
    mobileNumber,
    collegeName,
    fieldOfStudy,
    department,
    teamName,
    leaderName,
    membersName,
    registeredEvents,
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
