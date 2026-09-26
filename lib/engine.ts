// Rule-based conversation engine for the SmileCare Dental AI receptionist demo.
// This is a CONCEPT DEMO: responses are scripted decision-tree logic, not a live AI model.

import { Booking, findBookingsByName } from "./crm";

export interface Draft {
  reason: string;
  name: string;
  phone: string;
  date: string;
  time: string;
  urgency: "normal" | "urgent";
}

export type Step =
  | "idle"
  | "book_reason"
  | "book_name"
  | "book_phone"
  | "book_date"
  | "book_time"
  | "book_confirm"
  | "resched_name"
  | "resched_pick"
  | "resched_date"
  | "resched_time"
  | "resched_confirm"
  | "emg_followup";

export interface EngineState {
  step: Step;
  draft: Partial<Draft>;
  candidates: Booking[];
  targetId: string | null;
  emergencySeen: boolean;
}

export const initialEngineState = (): EngineState => ({
  step: "idle",
  draft: { urgency: "normal" },
  candidates: [],
  targetId: null,
  emergencySeen: false,
});

export type Block =
  | { kind: "text"; text: string }
  | { kind: "chips"; options: { label: string; value: string }[] }
  | { kind: "dates" }
  | { kind: "times" }
  | {
      kind: "confirm";
      title: string;
      lines: string[];
      confirmLabel: string;
      confirmValue: string;
    }
  | { kind: "emergency" };

export type EngineEvent =
  | {
      type: "booking_created";
      booking: Omit<Booking, "id" | "createdAt" | "status" | "source">;
    }
  | { type: "booking_rescheduled"; id: string; date: string; time: string }
  | { type: "emergency" };

export interface EngineResult {
  blocks: Block[];
  state: EngineState;
  events: EngineEvent[];
}

// ---------- helpers ----------

const EMERGENCY_KEYWORDS = [
  "severe pain",
  "extreme pain",
  "terrible pain",
  "unbearable",
  "bleeding",
  "bleed",
  "swelling",
  "swollen",
  "knocked out",
  "tooth fell out",
  "lost a tooth",
  "broken tooth",
  "cracked tooth",
  "chipped tooth",
  "accident",
  "injury",
  "emergency",
  "urgent",
];

function isEmergency(text: string): boolean {
  const t = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some((k) => t.includes(k));
}

export const TIME_SLOTS = [
  "9:00 AM",
  "10:30 AM",
  "12:00 PM",
  "2:00 PM",
  "3:30 PM",
  "5:00 PM",
];

const DAY = 86400000;

export function nextAvailableDates(count = 5): string[] {
  const out: string[] = [];
  let d = new Date(Date.now() + DAY); // start tomorrow
  while (out.length < count) {
    if (d.getDay() !== 0) {
      // closed Sundays
      out.push(
        d.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      );
    }
    d = new Date(d.getTime() + DAY);
  }
  return out;
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

const mainMenuChips = (): Block => ({
  kind: "chips",
  options: [
    { label: "📅 Book appointment", value: "book" },
    { label: "🔁 Reschedule", value: "reschedule" },
    { label: "💲 Pricing & insurance", value: "pricing" },
    { label: "🕗 Hours & location", value: "hours" },
  ],
});

export function greetingBlocks(): Block[] {
  return [
    {
      kind: "text",
      text: "Hi, thanks for calling SmileCare Dental! I'm Nora, the AI receptionist. How can I help you today?",
    },
    mainMenuChips(),
  ];
}

function emergencyBlocks(state: EngineState): { blocks: Block[]; events: EngineEvent[] } {
  state.emergencySeen = true;
  state.draft.urgency = "urgent";
  return {
    blocks: [
      { kind: "emergency" },
      {
        kind: "text",
        text: "I've flagged this as URGENT in our system and the dentist has been notified. Would you like me to hold the next available urgent slot for you today?",
      },
      {
        kind: "chips",
        options: [
          { label: "Yes, book urgent slot", value: "emg_yes" },
          { label: "No, that's all", value: "emg_no" },
        ],
      },
    ],
    events: [{ type: "emergency" }],
  };
}

function startBooking(state: EngineState): Block[] {
  state.step = "book_reason";
  return [
    {
      kind: "text",
      text: state.emergencySeen
        ? "Let's get you that urgent slot. What seems to be the problem?"
        : "Absolutely — what brings you in?",
    },
    {
      kind: "chips",
      options: [
        { label: "Cleaning", value: "reason:Cleaning" },
        { label: "Checkup", value: "reason:Checkup" },
        { label: "Tooth pain", value: "reason:Tooth pain" },
        { label: "Whitening", value: "reason:Whitening" },
        { label: "Something else", value: "reason:General visit" },
      ],
    },
  ];
}

function askForDate(state: EngineState, intro: string): Block[] {
  return [{ kind: "text", text: intro }, { kind: "dates" }];
}

function askForTime(state: EngineState): Block[] {
  return [
    { kind: "text", text: `And what time on ${state.draft.date}?` },
    { kind: "times" },
  ];
}

function bookingConfirmCard(state: EngineState): Block {
  const d = state.draft;
  return {
    kind: "confirm",
    title: state.emergencySeen ? "Confirm urgent appointment" : "Confirm your appointment",
    lines: [
      `🦷 ${d.reason}`,
      `📅 ${d.date} at ${d.time}`,
      `👤 ${d.name}`,
      `📞 ${d.phone}`,
      ...(state.emergencySeen ? ["🚨 Flagged as URGENT"] : []),
    ],
    confirmLabel: "Confirm booking",
    confirmValue: "confirm_booking",
  };
}

// ---------- main ----------

export function processMessage(
  prev: EngineState,
  rawInput: string
): EngineResult {
  const state: EngineState = {
    ...prev,
    draft: { ...prev.draft },
    candidates: [...prev.candidates],
  };
  const events: EngineEvent[] = [];
  const input = rawInput.trim();
  const lower = input.toLowerCase();

  // Emergency always wins, unless we're already in the emergency follow-up.
  if (state.step !== "emg_followup" && isEmergency(input)) {
    state.step = "emg_followup";
    const e = emergencyBlocks(state);
    return { blocks: e.blocks, state, events: e.events };
  }

  // ----- chip / command values -----
  if (input === "book" || input === "book_another") {
    state.draft = { urgency: state.emergencySeen ? "urgent" : "normal" };
    state.targetId = null;
    return { blocks: startBooking(state), state, events };
  }
  if (input === "reschedule") {
    state.step = "resched_name";
    state.targetId = null;
    return {
      blocks: [
        { kind: "text", text: "No problem — what's the full name on the booking?" },
      ],
      state,
      events,
    };
  }
  if (input === "pricing") {
    return {
      blocks: [
        {
          kind: "text",
          text: "Here's a quick guide: cleanings from $89, checkups from $59, whitening from $249. We accept Delta Dental, Cigna, Aetna, and most PPO plans — and we verify your coverage before any treatment so there are no surprises. Want me to book you in?",
        },
        {
          kind: "chips",
          options: [
            { label: "📅 Book appointment", value: "book" },
            { label: "Something else", value: "menu" },
          ],
        },
      ],
      state,
      events,
    };
  }
  if (input === "hours") {
    return {
      blocks: [
        {
          kind: "text",
          text: "We're open Mon–Fri 8:00 AM–6:00 PM and Sat 9:00 AM–2:00 PM (closed Sundays). You'll find us at 1240 Maple Avenue, Springfield — free parking right out front. Can I book you a visit?",
        },
        {
          kind: "chips",
          options: [
            { label: "📅 Book appointment", value: "book" },
            { label: "Something else", value: "menu" },
          ],
        },
      ],
      state,
      events,
    };
  }
  if (input === "menu") {
    state.step = "idle";
    return {
      blocks: [
        { kind: "text", text: "Of course — what would you like to do?" },
        mainMenuChips(),
      ],
      state,
      events,
    };
  }
  if (input === "emg_yes") {
    state.step = "book_name";
    state.draft.reason = "Urgent — dental emergency";
    return {
      blocks: [
        {
          kind: "text",
          text: "Got it — urgent visit. What's your full name?",
        },
      ],
      state,
      events,
    };
  }
  if (input === "emg_no" || input === "done") {
    state.step = "idle";
    return {
      blocks: [
        {
          kind: "text",
          text: "Understood. The dentist has been notified and will reach out shortly. Take care — and call back anytime.",
        },
      ],
      state,
      events,
    };
  }
  if (input === "confirm_booking") {
    const d = state.draft;
    events.push({
      type: "booking_created",
      booking: {
        name: d.name || "—",
        phone: d.phone || "—",
        reason: d.reason || "General visit",
        date: d.date || "—",
        time: d.time || "—",
        urgency: d.urgency || "normal",
      },
    });
    state.step = "idle";
    const wasUrgent = d.urgency === "urgent";
    state.draft = { urgency: "normal" };
    state.emergencySeen = false;
    return {
      blocks: [
        {
          kind: "text",
          text: wasUrgent
            ? `You're booked for an URGENT visit on ${d.date} at ${d.time}. We've notified the dentist — please arrive 10 minutes early. Anything else I can do?`
            : `You're all booked, ${d.name?.split(" ")[0] || "friend"}! ${d.reason} on ${d.date} at ${d.time}. We'll text a confirmation to ${d.phone}. Anything else?`,
        },
        {
          kind: "chips",
          options: [
            { label: "📅 Book another", value: "book_another" },
            { label: "That's all, thanks", value: "done" },
          ],
        },
      ],
      state,
      events,
    };
  }
  if (input === "confirm_reschedule") {
    const target = state.candidates.find((b) => b.id === state.targetId);
    const newDate = state.draft.date || target?.date || "—";
    const newTime = state.draft.time || target?.time || "—";
    if (target) {
      events.push({
        type: "booking_rescheduled",
        id: target.id,
        date: newDate,
        time: newTime,
      });
    }
    state.step = "idle";
    state.draft = { urgency: "normal" };
    state.candidates = [];
    state.targetId = null;
    return {
      blocks: [
        {
          kind: "text",
          text: `Done — your appointment is now on ${newDate} at ${newTime}. We'll text you a confirmation. Anything else?`,
        },
        {
          kind: "chips",
          options: [
            { label: "📅 Book another", value: "book_another" },
            { label: "That's all, thanks", value: "done" },
          ],
        },
      ],
      state,
      events,
    };
  }
  if (input.startsWith("reason:")) {
    state.draft.reason = input.slice("reason:".length);
    state.step = "book_name";
    return {
      blocks: [
        { kind: "text", text: `Got it — ${state.draft.reason}. What's your full name?` },
      ],
      state,
      events,
    };
  }
  if (input.startsWith("date:")) {
    state.draft.date = input.slice("date:".length);
    state.step = state.step === "resched_date" ? "resched_time" : "book_time";
    return { blocks: askForTime(state), state, events };
  }
  if (input.startsWith("time:")) {
    state.draft.time = input.slice("time:".length);
    if (state.step === "resched_time") {
      state.step = "resched_confirm";
      const target = state.candidates.find((b) => b.id === state.targetId);
      return {
        blocks: [
          {
            kind: "confirm",
            title: "Confirm reschedule",
            lines: [
              `🦷 ${target?.reason || state.draft.reason}`,
              `📅 ${state.draft.date} at ${state.draft.time}`,
              `👤 ${target?.name}`,
            ],
            confirmLabel: "Confirm new time",
            confirmValue: "confirm_reschedule",
          },
        ],
        state,
        events,
      };
    }
    state.step = "book_confirm";
    return { blocks: [bookingConfirmCard(state)], state, events };
  }
  if (input.startsWith("pick:")) {
    const id = input.slice("pick:".length);
    state.targetId = id;
    state.step = "resched_date";
    const target = state.candidates.find((b) => b.id === id);
    return {
      blocks: askForDate(
        state,
        `I found your ${target?.reason} on ${target?.date} at ${target?.time}. Pick a new day:`
      ),
      state,
      events,
    };
  }
  if (input === "try_again") {
    state.step = "resched_name";
    return {
      blocks: [{ kind: "text", text: "Sure — what's the full name on the booking?" }],
      state,
      events,
    };
  }

  // ----- step-driven free text -----
  switch (state.step) {
    case "book_reason": {
      state.draft.reason = input;
      state.step = "book_name";
      return {
        blocks: [{ kind: "text", text: "What's your full name?" }],
        state,
        events,
      };
    }
    case "book_name": {
      state.draft.name = input;
      state.step = "book_phone";
      return {
        blocks: [
          {
            kind: "text",
            text: `Thanks, ${input.split(" ")[0]}. What's the best phone number to reach you?`,
          },
        ],
        state,
        events,
      };
    }
    case "book_phone": {
      const digits = digitsOnly(input);
      if (digits.length < 7) {
        return {
          blocks: [
            {
              kind: "text",
              text: "Hmm, that doesn't look like a complete phone number. Could you type it again?",
            },
          ],
          state,
          events,
        };
      }
      state.draft.phone = input;
      state.step = "book_date";
      return {
        blocks: askForDate(state, "Perfect. Which day works for you?"),
        state,
        events,
      };
    }
    case "resched_name": {
      const matches = findBookingsByName(input);
      if (matches.length === 0) {
        state.step = "idle";
        return {
          blocks: [
            {
              kind: "text",
              text: `I couldn't find a booking under "${input}". Want me to book a new appointment instead, or try another name?`,
            },
            {
              kind: "chips",
              options: [
                { label: "📅 Book new appointment", value: "book" },
                { label: "Try another name", value: "try_again" },
              ],
            },
          ],
          state,
          events,
        };
      }
      if (matches.length === 1) {
        state.candidates = matches;
        state.targetId = matches[0].id;
        state.step = "resched_date";
        return {
          blocks: askForDate(
            state,
            `I found your ${matches[0].reason} on ${matches[0].date} at ${matches[0].time}. Pick a new day:`
          ),
          state,
          events,
        };
      }
      state.candidates = matches;
      state.step = "resched_pick";
      return {
        blocks: [
          { kind: "text", text: "I found a few — which one would you like to move?" },
          {
            kind: "chips",
            options: matches.map((m) => ({
              label: `${m.reason} — ${m.date} ${m.time}`,
              value: `pick:${m.id}`,
            })),
          },
        ],
        state,
        events,
      };
    }
    default:
      break;
  }

  // ----- idle: intent detection on free text -----
  if (/(book|appointment|schedule|visit|see the dentist|slot)/.test(lower)) {
    state.draft = { urgency: state.emergencySeen ? "urgent" : "normal" };
    return { blocks: startBooking(state), state, events };
  }
  if (/(resched|change|move).*(appointment|booking|visit)|cancel/.test(lower)) {
    state.step = "resched_name";
    return {
      blocks: [
        { kind: "text", text: "No problem — what's the full name on the booking?" },
      ],
      state,
      events,
    };
  }
  if (/(price|cost|how much|insurance|accept|delta|cigna|aetna|payment|pay)/.test(lower)) {
    return processMessage(state, "pricing");
  }
  if (/(hour|open|close|when.*you|location|where|address|direction|parking|sunday)/.test(lower)) {
    return processMessage(state, "hours");
  }
  if (/^(hi|hey|hello|good (morning|afternoon|evening)|yo)\b/.test(lower)) {
    return {
      blocks: [
        { kind: "text", text: "Hello! How can I help you today?" },
        mainMenuChips(),
      ],
      state,
      events,
    };
  }
  if (/(thank|thanks|bye|that's all|that is all)/.test(lower)) {
    state.step = "idle";
    return {
      blocks: [{ kind: "text", text: "You're very welcome! Take care, and call us anytime. 😊" }],
      state,
      events,
    };
  }

  // fallback
  return {
    blocks: [
      {
        kind: "text",
        text: "I want to make sure I help you correctly — I can book or reschedule appointments, or answer questions about pricing, insurance, hours, and location. What would you like to do?",
      },
      mainMenuChips(),
    ],
    state,
    events,
  };
}
