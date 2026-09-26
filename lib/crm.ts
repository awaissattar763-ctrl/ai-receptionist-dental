// Mock CRM — in-memory + localStorage persistence. No backend, no network calls.

export type Urgency = "normal" | "urgent";

export interface Booking {
  id: string;
  name: string;
  phone: string;
  reason: string;
  date: string; // e.g. "Mon, Sep 28"
  time: string; // e.g. "10:30 AM"
  urgency: Urgency;
  status: "confirmed" | "rescheduled" | "cancelled";
  createdAt: string; // ISO
  source: "ai-receptionist";
}

export type CallOutcome = "booked" | "rescheduled" | "emergency-escalated" | "faq";

export interface CallLog {
  id: string;
  startedAt: string; // ISO
  callerSummary: string; // e.g. "Booking — Cleaning"
  outcome: CallOutcome;
  urgency: Urgency;
  transcript: { from: "caller" | "ai"; text: string }[];
}

const BOOKINGS_KEY = "smilecare-demo-bookings";
const CALLS_KEY = "smilecare-demo-calls";

function load<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function save<T>(key: string, items: T[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(items));
  } catch {
    /* storage full / unavailable — demo continues in memory only */
  }
}

export function getBookings(): Booking[] {
  return load<Booking>(BOOKINGS_KEY).sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1
  );
}

export function addBooking(b: Omit<Booking, "id" | "createdAt" | "status" | "source">): Booking {
  const booking: Booking = {
    ...b,
    id: `bk_${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
    status: "confirmed",
    source: "ai-receptionist",
    createdAt: new Date().toISOString(),
  };
  const all = load<Booking>(BOOKINGS_KEY);
  all.push(booking);
  save(BOOKINGS_KEY, all);
  return booking;
}

export function rescheduleBooking(id: string, date: string, time: string): Booking | null {
  const all = load<Booking>(BOOKINGS_KEY);
  const found = all.find((b) => b.id === id);
  if (!found) return null;
  found.date = date;
  found.time = time;
  found.status = "rescheduled";
  save(BOOKINGS_KEY, all);
  return found;
}

export function findBookingsByName(name: string): Booking[] {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  return load<Booking>(BOOKINGS_KEY).filter(
    (b) => b.status !== "cancelled" && b.name.toLowerCase().includes(q)
  );
}

export function getCallLogs(): CallLog[] {
  return load<CallLog>(CALLS_KEY).sort((a, b) =>
    a.startedAt < b.startedAt ? 1 : -1
  );
}

export function addCallLog(
  log: Omit<CallLog, "id" | "startedAt">
): CallLog {
  const entry: CallLog = {
    ...log,
    id: `call_${Date.now().toString(36)}${Math.floor(Math.random() * 999)}`,
    startedAt: new Date().toISOString(),
  };
  const all = load<CallLog>(CALLS_KEY);
  all.push(entry);
  save(CALLS_KEY, all);
  return entry;
}

export function clearDemoData() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(BOOKINGS_KEY);
  window.localStorage.removeItem(CALLS_KEY);
}

export function seedSampleData() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  const iso = (minsAgo: number) => new Date(now - minsAgo * 60000).toISOString();
  const bookings: Booking[] = [
    {
      id: "bk_sample1",
      name: "Sample — Priya N.",
      phone: "(555) 010-2233",
      reason: "Cleaning",
      date: "Sat, Sep 26",
      time: "10:00 AM",
      urgency: "normal",
      status: "confirmed",
      createdAt: iso(180),
      source: "ai-receptionist",
    },
    {
      id: "bk_sample2",
      name: "Sample — Marcus T.",
      phone: "(555) 010-8891",
      reason: "Tooth pain",
      date: "Sat, Sep 26",
      time: "11:30 AM",
      urgency: "urgent",
      status: "confirmed",
      createdAt: iso(95),
      source: "ai-receptionist",
    },
  ];
  const calls: CallLog[] = [
    {
      id: "call_sample1",
      startedAt: iso(180),
      callerSummary: "Booking — Cleaning",
      outcome: "booked",
      urgency: "normal",
      transcript: [
        { from: "ai", text: "Hi! Thanks for calling SmileCare Dental. How can I help you today?" },
        { from: "caller", text: "I'd like to book a cleaning" },
        { from: "ai", text: "Great — I've booked you for Sat, Sep 26 at 10:00 AM. You'll get a confirmation text shortly." },
      ],
    },
    {
      id: "call_sample2",
      startedAt: iso(95),
      callerSummary: "Emergency — severe tooth pain",
      outcome: "emergency-escalated",
      urgency: "urgent",
      transcript: [
        { from: "ai", text: "Hi! Thanks for calling SmileCare Dental. How can I help you today?" },
        { from: "caller", text: "I have severe tooth pain, it's swollen" },
        { from: "ai", text: "That sounds urgent — I'm connecting you to the dentist right now and flagging this as an emergency." },
      ],
    },
    {
      id: "call_sample3",
      startedAt: iso(40),
      callerSummary: "FAQ — insurance & pricing",
      outcome: "faq",
      urgency: "normal",
      transcript: [
        { from: "ai", text: "Hi! Thanks for calling SmileCare Dental. How can I help you today?" },
        { from: "caller", text: "Do you take Delta Dental insurance?" },
        { from: "ai", text: "Yes — we accept Delta Dental, Cigna, Aetna, and most PPO plans." },
      ],
    },
  ];
  save(BOOKINGS_KEY, bookings);
  save(CALLS_KEY, calls);
}
