"use client";

import { useEffect, useRef, useState } from "react";
import {
  Block,
  EngineState,
  initialEngineState,
  processMessage,
  greetingBlocks,
  nextAvailableDates,
  TIME_SLOTS,
} from "../lib/engine";
import { addBooking, addCallLog, rescheduleBooking } from "../lib/crm";

interface Msg {
  id: string;
  from: "caller" | "ai";
  blocks: Block[];
}

let msgCounter = 0;
const nextId = () => `m${++msgCounter}_${Date.now()}`;

function formatElapsed(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ChatWidget() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [engineState, setEngineState] = useState<EngineState>(initialEngineState());
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const engineRef = useRef<EngineState>(initialEngineState());
  const transcriptRef = useRef<{ from: "caller" | "ai"; text: string }[]>([]);
  const sessionLoggedRef = useRef(false);
  const emergencySeenRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // call timer
  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // greeting on mount
  useEffect(() => {
    pushAi(greetingBlocks());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function blockToText(b: Block): string {
    switch (b.kind) {
      case "text":
        return b.text;
      case "chips":
        return b.options.map((o) => o.label).join(" / ");
      case "dates":
        return "[date picker]";
      case "times":
        return "[time picker]";
      case "confirm":
        return `${b.title}: ${b.lines.join("; ")}`;
      case "emergency":
        return "[EMERGENCY ESCALATION — connecting to dentist]";
    }
  }

  function pushAi(blocks: Block[]) {
    const msg: Msg = { id: nextId(), from: "ai", blocks };
    setMessages((m) => [...m, msg]);
    blocks.forEach((b) =>
      transcriptRef.current.push({ from: "ai", text: blockToText(b) })
    );
  }

  function finalizePendingFaq() {
    if (sessionLoggedRef.current) return;
    if (transcriptRef.current.length <= 1) return; // greeting only
    const firstCaller = transcriptRef.current.find((t) => t.from === "caller");
    addCallLog({
      callerSummary: firstCaller
        ? `FAQ — ${firstCaller.text.slice(0, 48)}`
        : "General inquiry",
      outcome: "faq",
      urgency: emergencySeenRef.current ? "urgent" : "normal",
      transcript: [...transcriptRef.current],
    });
    sessionLoggedRef.current = true;
  }

  function handleNewCall() {
    finalizePendingFaq();
    engineRef.current = initialEngineState();
    setEngineState(initialEngineState());
    transcriptRef.current = [];
    sessionLoggedRef.current = false;
    emergencySeenRef.current = false;
    setElapsed(0);
    setMessages([]);
    setTyping(false);
    setTimeout(() => pushAi(greetingBlocks()), 400);
  }

  function send(raw: string, label?: string) {
    const text = raw.trim();
    if (!text || typing) return;
    const display = label ?? text;
    const callerMsg: Msg = { id: nextId(), from: "caller", blocks: [{ kind: "text", text: display }] };
    setMessages((m) => [...m, callerMsg]);
    transcriptRef.current.push({ from: "caller", text: display });
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const result = processMessage(engineRef.current, text);
      engineRef.current = result.state;
      setEngineState(result.state);
      if (result.state.emergencySeen) emergencySeenRef.current = true;

      // side effects → mock CRM + call log
      for (const ev of result.events) {
        if (ev.type === "booking_created") {
          addBooking(ev.booking);
          addCallLog({
            callerSummary: `Booking — ${ev.booking.reason}`,
            outcome: "booked",
            urgency: ev.booking.urgency,
            transcript: [
              ...transcriptRef.current,
              ...result.blocks.map((b) => ({ from: "ai" as const, text: blockToText(b) })),
            ],
          });
          sessionLoggedRef.current = true;
        } else if (ev.type === "booking_rescheduled") {
          rescheduleBooking(ev.id, ev.date, ev.time);
          addCallLog({
            callerSummary: "Reschedule request",
            outcome: "rescheduled",
            urgency: "normal",
            transcript: [
              ...transcriptRef.current,
              ...result.blocks.map((b) => ({ from: "ai" as const, text: blockToText(b) })),
            ],
          });
          sessionLoggedRef.current = true;
        } else if (ev.type === "emergency") {
          addCallLog({
            callerSummary: `Emergency — ${display.slice(0, 48)}`,
            outcome: "emergency-escalated",
            urgency: "urgent",
            transcript: [
              ...transcriptRef.current,
              ...result.blocks.map((b) => ({ from: "ai" as const, text: blockToText(b) })),
            ],
          });
          sessionLoggedRef.current = true;
        }
      }

      setTyping(false);
      pushAi(result.blocks);
    }, 700 + Math.random() * 500);
  }

  const lastAiId = [...messages].reverse().find((m) => m.from === "ai")?.id;

  return (
    <div className="w-full max-w-[400px] mx-auto">
      {/* phone frame */}
      <div className="rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-teal-900/10 overflow-hidden">
        {/* call header */}
        <div className="bg-teal-700 text-white px-5 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-white/15 flex items-center justify-center text-xl">
                  🦷
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-teal-700" />
              </div>
              <div>
                <p className="font-semibold leading-tight">SmileCare Dental</p>
                <p className="text-teal-100 text-xs">Nora · AI Receptionist</p>
              </div>
            </div>
            <button
              onClick={handleNewCall}
              className="text-xs bg-white/15 hover:bg-white/25 transition rounded-full px-3 py-1.5"
            >
              ↺ New call
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-teal-100">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-300" />
            </span>
            Call in progress · {formatElapsed(elapsed)}
          </div>
        </div>

        {/* messages */}
        <div ref={scrollRef} className="chat-scroll h-[430px] overflow-y-auto px-4 py-4 bg-slate-50 space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`msg-in flex ${m.from === "caller" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] ${m.from === "caller" ? "" : "w-full"}`}>
                {m.blocks.map((b, i) => (
                  <div key={i} className="mb-1.5 last:mb-0">
                    <BlockView
                      block={b}
                      from={m.from}
                      interactive={m.from === "ai" && m.id === lastAiId && !typing}
                      onSend={send}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm flex gap-1.5">
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-500" />
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-500" />
                <span className="typing-dot w-2 h-2 rounded-full bg-teal-500" />
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <form
          className="border-t border-slate-200 bg-white p-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type as the caller…"
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            disabled={!input.trim() || typing}
            className="rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white w-10 h-10 flex items-center justify-center transition shrink-0"
            aria-label="Send"
          >
            ➤
          </button>
        </form>
      </div>
      <p className="text-center text-xs text-slate-400 mt-3">
        Concept demo — simulated responses, no live AI or telephony
      </p>
    </div>
  );
}

function BlockView({
  block,
  from,
  interactive,
  onSend,
}: {
  block: Block;
  from: "caller" | "ai";
  interactive: boolean;
  onSend: (value: string, label?: string) => void;
}) {
  if (block.kind === "text") {
    return (
      <div
        className={
          from === "caller"
            ? "bg-teal-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm shadow-sm inline-block"
            : "bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-tl-md px-4 py-2.5 text-sm shadow-sm"
        }
      >
        {block.text}
      </div>
    );
  }
  if (block.kind === "chips") {
    return (
      <div className="flex flex-wrap gap-2 mt-1">
        {block.options.map((o) => (
          <button
            key={o.value}
            disabled={!interactive}
            onClick={() => onSend(o.value, o.label)}
            className="text-xs font-medium px-3 py-2 rounded-full border border-teal-600 text-teal-700 bg-teal-50 hover:bg-teal-600 hover:text-white transition disabled:opacity-50 disabled:cursor-default"
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }
  if (block.kind === "dates") {
    return (
      <div className="grid grid-cols-2 gap-2 mt-1">
        {nextAvailableDates(6).map((d) => (
          <button
            key={d}
            disabled={!interactive}
            onClick={() => onSend(`date:${d}`, d)}
            className="text-xs font-medium px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-700 transition disabled:opacity-50"
          >
            📅 {d}
          </button>
        ))}
      </div>
    );
  }
  if (block.kind === "times") {
    return (
      <div className="grid grid-cols-3 gap-2 mt-1">
        {TIME_SLOTS.map((t) => (
          <button
            key={t}
            disabled={!interactive}
            onClick={() => onSend(`time:${t}`, t)}
            className="text-xs font-medium px-2 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-teal-500 hover:text-teal-700 transition disabled:opacity-50"
          >
            {t}
          </button>
        ))}
      </div>
    );
  }
  if (block.kind === "confirm") {
    return (
      <div className="bg-white border-2 border-teal-600/30 rounded-2xl p-4 shadow-sm">
        <p className="font-semibold text-sm text-slate-900 mb-2">{block.title}</p>
        <ul className="text-sm text-slate-600 space-y-1 mb-3">
          {block.lines.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
        <div className="flex gap-2">
          <button
            disabled={!interactive}
            onClick={() => onSend(block.confirmValue, block.confirmLabel)}
            className="flex-1 text-sm font-semibold bg-teal-600 hover:bg-teal-700 text-white rounded-xl py-2.5 transition disabled:opacity-50"
          >
            {block.confirmLabel}
          </button>
          <button
            disabled={!interactive}
            onClick={() => onSend("menu", "Start over")}
            className="text-sm font-medium border border-slate-300 text-slate-600 rounded-xl px-4 py-2.5 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Start over
          </button>
        </div>
      </div>
    );
  }
  if (block.kind === "emergency") {
    return (
      <div className="emergency-ring bg-red-50 border-2 border-red-500 rounded-2xl p-4">
        <p className="font-bold text-red-700 text-sm mb-1">🚨 Emergency detected</p>
        <p className="text-sm text-red-900/80">
          Connecting you to Dr. Rivera now… please stay on the line.
        </p>
        <p className="text-xs text-red-800/60 mt-2">
          If this is life-threatening, please call 911 immediately.
        </p>
      </div>
    );
  }
  return null;
}
