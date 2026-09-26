import Link from "next/link";
import ChatWidget from "../components/ChatWidget";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-white">
      {/* nav */}
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦷</span>
          <span className="font-bold text-lg tracking-tight">SmileCare Dental</span>
          <span className="ml-2 text-[11px] font-medium bg-amber-100 text-amber-800 rounded-full px-2.5 py-1">
            CONCEPT DEMO
          </span>
        </div>
        <Link
          href="/admin"
          className="text-sm font-medium text-teal-700 border border-teal-200 rounded-full px-4 py-2 hover:bg-teal-600 hover:text-white hover:border-teal-600 transition"
        >
          View admin dashboard →
        </Link>
      </nav>

      {/* hero */}
      <section className="max-w-6xl mx-auto px-6 pt-10 pb-16 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Never miss another patient call{" "}
            <span className="text-teal-600">after hours</span> again.
          </h1>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            Meet <strong>Nora</strong> — an AI receptionist for dental clinics. She
            answers every call instantly, books appointments, reschedules,
            answers pricing &amp; insurance questions, and escalates real
            emergencies to the dentist.
          </p>
          <ul className="mt-6 space-y-3 text-slate-700">
            {[
              ["📞", "Answers 24/7 — nights, weekends, holidays"],
              ["📅", "Books directly into your schedule with instant SMS confirmation"],
              ["🚨", "Detects emergencies (severe pain, bleeding, swelling) and escalates immediately"],
              ["📋", "Every call logged with outcomes in one dashboard"],
            ].map(([icon, text]) => (
              <li key={text} className="flex items-start gap-3">
                <span className="text-xl leading-none mt-0.5">{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#demo"
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-full px-7 py-3 transition shadow-lg shadow-teal-600/25"
            >
              Try the live demo ↓
            </a>
            <Link
              href="/admin"
              className="font-semibold rounded-full px-7 py-3 border border-slate-300 hover:border-teal-600 hover:text-teal-700 transition"
            >
              See the dashboard
            </Link>
          </div>
          <p className="mt-6 text-xs text-slate-400 max-w-md">
            This is a concept demo with simulated responses — no live AI model or
            telephony is connected. SmileCare Dental is a fictional clinic.
          </p>
        </div>

        {/* demo widget */}
        <div id="demo" className="scroll-mt-24">
          <ChatWidget />
        </div>
      </section>

      {/* how it works */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold tracking-tight mb-8 text-center">
          Try these in the demo call
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: "📅",
              title: "Book a cleaning",
              desc: 'Tap "Book appointment" and follow the flow — name, phone, day, time, confirm.',
            },
            {
              icon: "🔁",
              title: "Reschedule",
              desc: "Book first, then start a new call and ask to reschedule it.",
            },
            {
              icon: "💲",
              title: "Ask about pricing",
              desc: 'Try "Do you take Delta Dental?" or "How much is whitening?"',
            },
            {
              icon: "🚨",
              title: "Simulate an emergency",
              desc: 'Type "I have severe tooth pain and swelling" — watch the escalation.',
            },
          ].map((c) => (
            <div
              key={c.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
            >
              <div className="text-3xl mb-3">{c.icon}</div>
              <h3 className="font-semibold mb-1.5">{c.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-slate-500">
          <p>
            <strong className="text-slate-700">SmileCare Dental</strong> is a fictional
            clinic built for this demo.
          </p>
          <Link href="/admin" className="text-teal-700 font-medium hover:underline">
            Admin dashboard →
          </Link>
        </div>
      </footer>
    </main>
  );
}
