"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Booking,
  CallLog,
  getBookings,
  getCallLogs,
  clearDemoData,
  seedSampleData,
} from "../../lib/crm";

const OUTCOME_META: Record<CallLog["outcome"], { label: string; classes: string }> = {
  booked: { label: "Booked", classes: "bg-emerald-100 text-emerald-800" },
  rescheduled: { label: "Rescheduled", classes: "bg-blue-100 text-blue-800" },
  "emergency-escalated": { label: "Emergency escalated", classes: "bg-red-100 text-red-800" },
  faq: { label: "FAQ handled", classes: "bg-slate-200 text-slate-700" },
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [calls, setCalls] = useState<CallLog[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  function refresh() {
    setBookings(getBookings());
    setCalls(getCallLogs());
  }

  useEffect(() => {
    refresh();
  }, []);

  const emergencies = calls.filter((c) => c.outcome === "emergency-escalated").length;
  const booked = calls.filter((c) => c.outcome === "booked").length;

  return (
    <main className="min-h-screen bg-slate-100">
      {/* top bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦷</span>
            <div>
              <p className="font-bold leading-tight">SmileCare Dental</p>
              <p className="text-xs text-slate-500">AI Receptionist · Admin dashboard</p>
            </div>
            <span className="ml-2 text-[11px] font-medium bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">
              CONCEPT DEMO
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                seedSampleData();
                refresh();
              }}
              className="text-xs font-medium border border-slate-300 rounded-full px-3 py-2 hover:border-teal-600 hover:text-teal-700 transition"
            >
              Load sample data
            </button>
            <button
              onClick={() => {
                if (window.confirm("Clear all demo bookings and call logs?")) {
                  clearDemoData();
                  refresh();
                }
              }}
              className="text-xs font-medium border border-slate-300 rounded-full px-3 py-2 hover:border-red-500 hover:text-red-600 transition"
            >
              Clear demo data
            </button>
            <Link
              href="/"
              className="text-xs font-semibold bg-teal-600 text-white rounded-full px-4 py-2 hover:bg-teal-700 transition"
            >
              ← Live demo
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Calls handled", value: calls.length, icon: "📞" },
            { label: "Bookings created", value: booked, icon: "📅" },
            { label: "Emergencies escalated", value: emergencies, icon: "🚨" },
            {
              label: "Upcoming appointments",
              value: bookings.filter((b) => b.status !== "cancelled").length,
              icon: "🗓️",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="text-2xl mb-2">{s.icon}</div>
              <p className="text-3xl font-extrabold tracking-tight">{s.value}</p>
              <p className="text-sm text-slate-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* bookings */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold">Upcoming bookings</h2>
              <p className="text-xs text-slate-500">Written by the AI receptionist</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {bookings.length === 0 && (
                <p className="px-5 py-10 text-sm text-slate-400 text-center">
                  No bookings yet — try the live demo, or load sample data above.
                </p>
              )}
              {bookings.map((b) => (
                <div key={b.id} className="px-5 py-4 flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{b.name}</p>
                      {b.urgency === "urgent" ? (
                        <span className="text-[11px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                          🚨 URGENT
                        </span>
                      ) : (
                        <span className="text-[11px] font-medium bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">
                          normal
                        </span>
                      )}
                      {b.status === "rescheduled" && (
                        <span className="text-[11px] font-medium bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">
                          rescheduled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      🦷 {b.reason} · 📅 {b.date} at {b.time}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">📞 {b.phone}</p>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {timeAgo(b.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* call log */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold">Call log</h2>
              <p className="text-xs text-slate-500">Every handled conversation, with outcomes</p>
            </div>
            <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
              {calls.length === 0 && (
                <p className="px-5 py-10 text-sm text-slate-400 text-center">
                  No calls yet — try the live demo, or load sample data above.
                </p>
              )}
              {calls.map((c) => {
                const meta = OUTCOME_META[c.outcome];
                const isOpen = expanded === c.id;
                return (
                  <div key={c.id} className="px-5 py-4">
                    <button
                      className="w-full flex items-start justify-between gap-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : c.id)}
                    >
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{c.callerSummary}</p>
                          {c.urgency === "urgent" && (
                            <span className="text-[11px] font-bold bg-red-100 text-red-700 rounded-full px-2 py-0.5">
                              🚨
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(c.startedAt)}</p>
                      </div>
                      <span className={`text-[11px] font-bold rounded-full px-2.5 py-1 whitespace-nowrap ${meta.classes}`}>
                        {meta.label}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="mt-3 space-y-2 bg-slate-50 rounded-xl p-3">
                        {c.transcript.map((t, i) => (
                          <div
                            key={i}
                            className={`text-xs rounded-lg px-3 py-2 max-w-[90%] ${
                              t.from === "caller"
                                ? "bg-teal-600 text-white ml-auto"
                                : "bg-white border border-slate-200 text-slate-700"
                            }`}
                          >
                            {t.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          Concept demo — all data is simulated and stored only in this browser. No real
          patients, no live telephony.
        </p>
      </div>
    </main>
  );
}
