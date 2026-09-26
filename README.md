# SmileCare Dental — AI Receptionist (Concept Demo)

A polished **concept demo** of an AI receptionist for a dental clinic, built to show
prospective clients what an AI front-desk could do for their business.

**Important: this is a concept demo — responses are simulated by a scripted,
rule-based conversation engine. No live AI model, no telephony (Twilio/Vapi), and no
real patient data are involved.** "SmileCare Dental" is a fictional clinic; it is not
a real client.

## What it demonstrates

**Public demo page (`/`)** — a phone-style chat widget where the visitor plays the
caller. The receptionist ("Nora") handles:

- 📅 **Booking** — reason → name → phone → day picker → time picker → confirm card
- 🔁 **Rescheduling** — finds the booking by name, picks a new day/time
- 💲 **Pricing & insurance** questions (cleanings from $89, Delta/Cigna/Aetna…)
- 🕗 **Hours & location** questions
- 🚨 **Emergency detection** — keywords like "severe pain", "bleeding", "swelling"
  trigger an escalation UI ("connecting you to the dentist now"), flag the booking as
  urgent, and advise calling 911 if life-threatening

**Admin dashboard (`/admin`)** — the clinic owner's view:

- Upcoming bookings with urgency badges (🚨 URGENT vs normal)
- Call log with outcome tags: booked / rescheduled / emergency escalated / FAQ handled
- Expandable transcripts per call
- Stats: calls handled, bookings created, emergencies escalated
- "Load sample data" / "Clear demo data" buttons

Bookings and call logs persist in the browser's `localStorage` (mock CRM — no backend).

## How to run

```bash
npm install
npm run dev
```

Then open:

- Public demo → http://localhost:3000
- Admin dashboard → http://localhost:3000/admin

To verify a production build:

```bash
npm run build
```

## Tech

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS v4
- Zero backend — conversation engine (`lib/engine.ts`) is a client-side state machine;
  storage (`lib/crm.ts`) is `localStorage`

## Turning this into a real product

The demo is deliberately structured so the simulated engine can be swapped for a
real one: replace `processMessage()` in `lib/engine.ts` with calls to an AI voice
agent provider (e.g. Vapi, Retell) or an LLM API, and replace the `localStorage`
CRM in `lib/crm.ts` with real API calls (booking system, SMS provider). The UI,
booking flow, and dashboard need no changes.

## File map

| Path | What |
|---|---|
| `app/page.tsx` | Public landing page + embedded demo widget |
| `app/admin/page.tsx` | Admin dashboard (bookings, call log, stats) |
| `components/ChatWidget.tsx` | Phone-style chat UI, renders engine blocks |
| `lib/engine.ts` | Rule-based conversation engine (intents, booking flow, emergency detection) |
| `lib/crm.ts` | Mock CRM: bookings + call logs in localStorage |
| `DEMO-SCRIPT.md` | 60-second walkthrough script for recording a demo video |
