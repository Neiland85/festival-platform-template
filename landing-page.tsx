"use client";

import { useState, useEffect, useRef, type ReactNode } from "react";

/* ================================================================
   Festival Platform — Sales Landing Page (PRO)
   ================================================================
   Drop into /app/landing/page.tsx

   Checkout: calls POST /api/checkout with { tier } → Stripe redirect.
   Enterprise: redirects to #contact form.
   ================================================================ */

// ─── Checkout handler ───────────────────────────────────────────

async function handleCheckout(tier: "indie" | "business") {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    }
  } catch (err) {
    console.error("Checkout failed:", err);
  }
}

// ─── Animations (CSS-only, no Framer Motion dep) ────────────────

function FadeIn({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(24px)",
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

// ─── Data ───────────────────────────────────────────────────────

const STATS = [
  { value: "128", label: "Production files" },
  { value: "354+", label: "Tests" },
  { value: "29", label: "API endpoints" },
  { value: "30s", label: "Setup time" },
];

const PAIN_POINTS = [
  {
    title: "Building payments from scratch",
    desc: "Stripe docs, webhook signatures, idempotency, order states. A week disappears. It still has edge cases.",
  },
  {
    title: "Reinventing admin dashboards",
    desc: "Leads, orders, capacity. You wire up CRUD, tables, filters. Two more weeks. It looks terrible.",
  },
  {
    title: "Duct-taping security",
    desc: 'CSRF, rate limiting, CORS, cookie consent, GDPR. Each feels like "just a few hours." Multiply by twelve.',
  },
  {
    title: "Fighting infrastructure",
    desc: "Migrations, connection pools, monitoring, CI/CD. None of this sells a single ticket, but skip it and production breaks at 2 AM.",
  },
];

const FEATURES = [
  {
    title: "Ticket sales that work",
    desc: "Stripe Checkout with webhook verification, order tracking, capacity validation, sold-out detection. Or fall back to Ticketmaster / Universe links automatically.",
    icon: "🎟️",
  },
  {
    title: "Admin dashboard",
    desc: "Leads, orders, system health, capacity — behind auth, with real-time data. Not a TODO in the codebase. A working panel from day one.",
    icon: "📊",
  },
  {
    title: "11 security modules",
    desc: "CSRF, rate limiting (Redis + in-memory fallback), IP hashing, burst queue, idempotency on payments, overload protection, chaos testing.",
    icon: "🔒",
  },
  {
    title: "GDPR compliance",
    desc: "Cookie consent (accept/reject), soft deletes, full audit trail on every admin action, IP hashing, consent tracking per lead.",
    icon: "🛡️",
  },
  {
    title: "9 observability modules",
    desc: "Request tracing, audit logs, pool monitoring, queue alerts, SEO tracking, surge prediction, safety scorecard across 8 dimensions.",
    icon: "📡",
  },
  {
    title: "i18n (ES/EN)",
    desc: "Full internationalization with next-intl. Routing middleware. Add languages by dropping a JSON file.",
    icon: "🌍",
  },
  {
    title: "Load-tested",
    desc: "7 k6 scripts: homepage, API, leads, checkout, concurrent users (1,000 VUs). SLO thresholds: p95 < 500ms, errors < 1%.",
    icon: "⚡",
  },
  {
    title: "CI/CD pipeline",
    desc: "GitHub Actions: security audit, lint, typecheck, unit tests, Playwright E2E, build — on every PR.",
    icon: "🔄",
  },
];

const TIME_ROWS = [
  ["Stripe checkout + webhooks + orders", "2 weeks", "Done"],
  ["Admin dashboard + auth + RBAC", "2 weeks", "Done"],
  ["CSRF, rate limiting, burst queue, overload", "1 week", "Done"],
  ["GDPR: consent, soft deletes, audit trail", "1 week", "Done"],
  ["i18n with locale routing", "3 days", "Done"],
  ["CI/CD + E2E tests", "3 days", "Done"],
  ["Observability: tracing, monitoring, prediction", "4 days", "Done"],
  ["Load testing + SLO thresholds", "2 days", "Done"],
  ["Docker, migrations, seed data", "1 day", "Done"],
];

const TESTIMONIALS = [
  {
    quote:
      "I was quoting clients 6 weeks for a festival site. Now I deliver in 3 days and keep the margin.",
    name: "Marcos R.",
    role: "Freelance developer, Madrid",
  },
  {
    quote:
      "The load testing scripts caught a connection pool issue before launch that would have killed us on ticket drop day.",
    name: "Laura & Team",
    role: "Event production, Barcelona",
  },
  {
    quote:
      "We replaced Eventbrite in 3 days and saved ~€3K on our first event. Zero to accepting payments in an afternoon.",
    name: "Daniela K.",
    role: "Community organizer",
  },
];

const TIERS = [
  {
    name: "Indie",
    price: "$2,900",
    desc: "1 developer. 1 festival.",
    features: [
      "Full source code (128 files)",
      "Stripe Checkout + admin dashboard",
      "i18n (ES/EN)",
      "Docker Compose + one-command setup",
      "Complete documentation",
      "12 months of updates",
    ],
    cta: "Get Indie",
    tier: "indie" as const,
    highlighted: false,
  },
  {
    name: "Business",
    price: "$7,900",
    desc: "Teams & agencies. Unlimited festivals.",
    badge: "Most Popular",
    features: [
      "Everything in Indie, plus:",
      "354+ tests + 7 E2E (Playwright)",
      "11 security modules",
      "9 observability modules",
      "7 load testing scripts (k6)",
      "CI/CD (GitHub Actions)",
      "Full GDPR compliance kit",
      "Up to 5 devs, unlimited projects",
      "Client work included",
    ],
    cta: "Get Business",
    tier: "business" as const,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "$18,000",
    desc: "Support + onboarding included.",
    features: [
      "Everything in Business, plus:",
      "Unlimited developers",
      "60-min onboarding call",
      "Priority email support (72h SLA)",
      "2 code reviews included",
      "Private roadmap access",
      "Custom license agreement",
    ],
    cta: "Contact Us",
    tier: "enterprise" as const,
    highlighted: false,
  },
];

const FAQ_DATA = [
  {
    q: "Do I need backend experience?",
    a: "No. If you can run pnpm install and edit a .env file, you can get this running. The setup script handles Docker, database, schema, and seed data. You do need to be comfortable reading React and TypeScript to customize content.",
  },
  {
    q: "Can I use it without Stripe?",
    a: 'Yes. Without Stripe keys, ticket buttons link to Ticketmaster or Universe. If neither is configured, it shows "Coming soon." Add Stripe later — checkout activates automatically, no code changes.',
  },
  {
    q: "What if I don't want to run PostgreSQL?",
    a: "Docker Compose starts Postgres with one command. For production, any managed Postgres works: Supabase, Neon, Railway, RDS. Without a database, the site runs with static event data — but leads, orders, and the dashboard need Postgres.",
  },
  {
    q: "Can I modify the code?",
    a: "It's your code. 155 TypeScript files, standard patterns (repository, Zod, Drizzle ORM). The 354+ tests let you refactor with confidence.",
  },
  {
    q: "Is this production-ready or just a starter kit?",
    a: "11 security modules, GDPR compliance, 9 observability modules, load testing with SLO thresholds (p95 < 500ms), CI/CD on every PR. Not a TODO list with nice folder names.",
  },
  {
    q: "Can I use it for client projects?",
    a: "Business and Enterprise licenses: unlimited client projects. Charge whatever you want. You can't redistribute the template as a template, but you can ship it as part of any finished product.",
  },
  {
    q: "What about hosting?",
    a: "Optimized for Vercel (push = deploy). Works on Railway, Fly.io, AWS, or any VPS with Docker. Database: any managed Postgres.",
  },
  {
    q: "Do you offer support?",
    a: "Docs + troubleshooting + GitHub Discussions. Enterprise adds priority email with 72h SLA. The 354+ tests catch most issues before they reach you.",
  },
  {
    q: "What if it doesn't work for me?",
    a: "14-day guarantee: if it doesn't run as described, full refund. No forms, no justification.",
  },
  {
    q: "What happens after I buy?",
    a: "Immediate access. You receive a GitHub repo invite within 5 minutes. Clone, run pnpm setup (30 seconds), and you have the full platform running locally. The success page walks you through setup, branding, and deployment step by step.",
  },
];

// ─── Shared components ──────────────────────────────────────────

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-full px-3 py-1">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block text-sm font-semibold tracking-[0.2em] uppercase text-orange-500 mb-4">
      {children}
    </span>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-800/60">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-5 text-left group"
      >
        <span className="text-lg font-medium text-gray-100 group-hover:text-orange-400 transition-colors pr-6">
          {q}
        </span>
        <span
          className="text-xl text-gray-600 flex-shrink-0 transition-transform duration-300"
          style={{ transform: open ? "rotate(45deg)" : "none" }}
        >
          +
        </span>
      </button>
      <div
        className="overflow-hidden transition-all duration-300"
        style={{ maxHeight: open ? "300px" : "0", opacity: open ? 1 : 0 }}
      >
        <p className="pb-5 text-gray-400 leading-relaxed max-w-3xl">{a}</p>
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#09090b] text-gray-100 min-h-screen antialiased">
      {/* ── NAV ── */}
      <nav className="fixed top-0 w-full z-50 bg-[#09090b]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            Festival<span className="text-orange-500">Platform</span>
          </span>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </div>
          <button
            onClick={() => handleCheckout("business")}
            className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-all shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30"
          >
            Get the Platform
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="pt-36 pb-20 px-6 relative overflow-hidden">
        {/* Gradient orb */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-orange-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative">
          <FadeIn>
            <Badge>White-label ticketing platform</Badge>
          </FadeIn>

          <FadeIn delay={100}>
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold tracking-tight leading-[1.05] mt-8 mb-6">
              Sell tickets this week.
              <br />
              <span className="bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                Keep 100% of your revenue.
              </span>
            </h1>
          </FadeIn>

          <FadeIn delay={200}>
            <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-3 leading-relaxed font-light">
              Ticketing, admin dashboard, payments, security, GDPR, observability — everything you&apos;d
              spend 6-8 weeks building from scratch.
            </p>
            <p className="text-base text-gray-600 mb-10">
              Own the code. No subscriptions. No per-ticket commissions.
            </p>
          </FadeIn>

          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => handleCheckout("business")}
                className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-8 py-4 rounded-xl transition-all shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5"
              >
                Get the Platform →
              </button>
              <a
                href="#demo"
                className="bg-white/5 hover:bg-white/10 text-white font-semibold text-lg px-8 py-4 rounded-xl border border-white/10 transition-all hover:-translate-y-0.5"
              >
                Live Demo
              </a>
            </div>
          </FadeIn>

          {/* Terminal */}
          <FadeIn delay={400}>
            <div className="mt-16 max-w-lg mx-auto bg-[#0c0c0e] rounded-2xl border border-white/5 p-6 text-left font-mono text-sm shadow-2xl">
              <div className="flex gap-2 mb-4">
                <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
                <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
                <span className="w-3 h-3 rounded-full bg-[#28c840]" />
              </div>
              <code className="text-gray-400 leading-7">
                <span className="text-gray-600">$</span> pnpm install{"\n"}
                <span className="text-gray-600">$</span> pnpm setup{" "}
                <span className="text-gray-700"># 30 seconds</span>
                {"\n"}
                <span className="text-gray-600">$</span> pnpm dev{"\n"}
                {"\n"}
                <span className="text-green-500">✓</span> PostgreSQL running{"\n"}
                <span className="text-green-500">✓</span> Schema deployed{"\n"}
                <span className="text-green-500">✓</span> 7 demo events seeded{"\n"}
                <span className="text-green-500">✓</span> Admin dashboard ready{"\n"}
                <span className="text-green-500">✓</span>{" "}
                <span className="text-orange-400">http://localhost:3000</span>
              </code>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {STATS.map((s, i) => (
            <FadeIn key={s.label} delay={i * 100} className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-white tracking-tight">{s.value}</p>
              <p className="text-sm text-gray-500 mt-1 tracking-wide">{s.label}</p>
            </FadeIn>
          ))}
        </div>
      </section>

      {/* ── PROBLEM ── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <SectionLabel>The reality</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              You already know how this goes
            </h2>
            <p className="text-gray-500 text-lg mb-16 max-w-2xl">
              You have a festival to promote. Tickets to sell. An audience waiting. But instead of
              launching, you&apos;re stuck in the weeds.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {PAIN_POINTS.map((p, i) => (
              <FadeIn key={p.title} delay={i * 100}>
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-7 hover:border-red-500/20 transition-colors">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">{p.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{p.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
          <FadeIn delay={400}>
            <p className="text-center text-gray-600 mt-14 text-lg">
              The hard part isn&apos;t making a festival website. It&apos;s managing payments without
              duplicates, surviving traffic spikes, complying with GDPR, and not breaking
              everything in production.{" "}
              <span className="text-white font-medium">That&apos;s what&apos;s already solved here.</span>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <FadeIn>
            <SectionLabel>What you get</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16">
              Production code. Not a starter kit.
            </h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <FadeIn key={f.title} delay={i * 80}>
                <div className="bg-[#09090b] border border-white/5 rounded-2xl p-7 hover:border-orange-500/20 transition-all group">
                  <span className="text-2xl block mb-4 group-hover:scale-110 transition-transform origin-left">
                    {f.icon}
                  </span>
                  <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
                  <p className="text-gray-500 leading-relaxed text-[15px]">{f.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── BUILD vs BUY ── */}
      <section id="compare" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <SectionLabel>Build vs. Buy</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-16">
              6-8 weeks. Or 30 seconds.
            </h2>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="overflow-x-auto mb-16 rounded-2xl border border-white/5">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/[0.02] text-gray-500 text-xs uppercase tracking-widest">
                    <th className="py-4 px-6">Component</th>
                    <th className="py-4 px-4 text-center">From scratch</th>
                    <th className="py-4 px-4 text-center">Template</th>
                  </tr>
                </thead>
                <tbody>
                  {TIME_ROWS.map(([task, scratch, tmpl]) => (
                    <tr key={task} className="border-t border-white/5">
                      <td className="py-3.5 px-6 text-gray-400 text-[15px]">{task}</td>
                      <td className="py-3.5 px-4 text-center text-red-400 font-mono text-sm">{scratch}</td>
                      <td className="py-3.5 px-4 text-center text-green-400 font-mono text-sm font-semibold">{tmpl}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-white/10 font-bold text-lg">
                    <td className="py-5 px-6">Total</td>
                    <td className="py-5 px-4 text-center text-red-400">6–8 weeks</td>
                    <td className="py-5 px-4 text-center text-green-400">30 seconds</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FadeIn>

          {/* Cost cards */}
          <div className="grid md:grid-cols-2 gap-5">
            <FadeIn delay={200}>
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-8">
                <p className="text-sm uppercase tracking-widest text-red-400/70 mb-3">Build from scratch</p>
                <p className="text-4xl font-bold mb-2">$18,000–$24,000</p>
                <p className="text-gray-500">240–320 hours at $75/hr</p>
                <p className="text-gray-600 text-sm mt-4">
                  Without tests, load testing, GDPR, or observability. Add $5K–$8K for those.
                </p>
              </div>
            </FadeIn>
            <FadeIn delay={300}>
              <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-8">
                <p className="text-sm uppercase tracking-widest text-green-400/70 mb-3">Use the platform</p>
                <p className="text-4xl font-bold mb-2">
                  From $2,900 <span className="text-lg font-normal text-gray-500">one-time</span>
                </p>
                <p className="text-gray-500">0 developer hours. Everything included.</p>
                <p className="text-gray-600 text-sm mt-4">
                  354+ tests. 11 security modules. 9 observability. GDPR. CI/CD. Done.
                </p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={400}>
            <p className="text-center text-gray-600 text-sm mt-10">
              And that&apos;s assuming everything works the first time. It never does.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <SectionLabel>From builders</SectionLabel>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5 mt-8">
            {TESTIMONIALS.map((t, i) => (
              <FadeIn key={t.name} delay={i * 100}>
                <div className="bg-[#09090b] border border-white/5 rounded-2xl p-7 flex flex-col justify-between h-full">
                  <p className="text-gray-300 leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-gray-600">{t.role}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROI MATH ── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <SectionLabel>The math</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Stop renting your ticketing.
            </h2>
            <p className="text-lg text-gray-500 mb-12">
              A festival with 2,000 attendees at €40/ticket → €80,000 revenue.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 gap-5 mb-8">
            <FadeIn delay={100}>
              <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-500 mb-3">Eventbrite (~5% fee)</p>
                <p className="text-4xl font-bold text-red-400">−€4,000</p>
                <p className="text-xs text-gray-600 mt-2">per event, every time</p>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-8 text-center">
                <p className="text-sm text-gray-500 mb-3">Template + Stripe (2.9%)</p>
                <p className="text-4xl font-bold text-green-400">−€2,320</p>
                <p className="text-xs text-gray-600 mt-2">processing only, no platform fee</p>
              </div>
            </FadeIn>
          </div>

          <FadeIn delay={300}>
            <div className="bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/20 rounded-2xl p-10 text-center">
              <p className="text-gray-300 mb-2">Difference per event</p>
              <p className="text-5xl font-bold text-orange-400">+€1,680</p>
              <p className="text-gray-500 mt-4">
                3 events → paid for itself.
                <span className="mx-2 text-gray-700">·</span>
                10 events → saved more than building from scratch.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={400}>
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 mt-8">
              <p className="text-gray-400 leading-relaxed">
                At scale: <strong className="text-white">10,000 attendees at €85/ticket</strong> = €850,000 revenue.
                Eventbrite&apos;s 5% is <strong className="text-red-400">€42,500 gone. Every year.</strong>{" "}
                With this template, that money stays in your account.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={500}>
            <p className="text-center text-sm text-gray-600 mt-8">
              Most teams lose this every single event. You only notice it after it&apos;s gone.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <SectionLabel>Pricing</SectionLabel>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
              One-time payment. Own it forever.
            </h2>
            <p className="text-gray-500 text-lg mb-2">
              No subscriptions. No commissions. Year two costs $0.
            </p>
            <p className="text-sm text-gray-600">
              Equivalent build cost: $18,000+ · 14-day money-back guarantee
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5 items-start">
            {TIERS.map((tier, i) => (
              <FadeIn key={tier.name} delay={i * 100}>
                <div
                  className={`rounded-2xl p-8 relative ${
                    tier.highlighted
                      ? "bg-gradient-to-b from-orange-500/5 to-transparent border-2 border-orange-500/40 shadow-2xl shadow-orange-500/5"
                      : "bg-white/[0.02] border border-white/5"
                  }`}
                >
                  {tier.badge && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[11px] font-bold tracking-widest uppercase px-4 py-1 rounded-full">
                      {tier.badge}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  <p className="text-gray-500 text-sm mb-5">{tier.desc}</p>
                  <p className="text-4xl font-bold mb-1">
                    {tier.price}
                  </p>
                  <p className="text-xs text-gray-600 mb-7">one-time payment</p>
                  <ul className="space-y-3 mb-8">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <span className="text-orange-500 mt-0.5 flex-shrink-0">✓</span>
                        <span className="text-gray-400">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() =>
                      tier.tier === "enterprise"
                        ? (window.location.href = "#contact")
                        : handleCheckout(tier.tier)
                    }
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all text-sm ${
                      tier.highlighted
                        ? "bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20 hover:-translate-y-0.5"
                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                    }`}
                  >
                    {tier.cta} →
                  </button>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={300}>
            <p className="text-center text-gray-600 text-sm mt-10 max-w-xl mx-auto">
              Eventbrite: $3,600–$50,000/year + commissions. Eventcube: $3,600–$12,000/year.
              InEvent: $15,000–$50,000/year. <span className="text-gray-400">Every year.</span>
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeIn>
            <SectionLabel>FAQ</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-10">Common questions</h2>
          </FadeIn>
          <div>
            {FAQ_DATA.map((item) => (
              <FAQItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      </section>

      {/* ── IS THIS FOR YOU ── */}
      <section className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <SectionLabel>Fit check</SectionLabel>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-14">Is this for you?</h2>
          </FadeIn>
          <div className="grid md:grid-cols-2 gap-10">
            <FadeIn delay={100}>
              <div>
                <h3 className="text-lg font-semibold text-green-400 mb-5">Yes, if:</h3>
                <ul className="space-y-4">
                  {[
                    "Developer who wants a festival platform running this week",
                    "Agency delivering event websites — want to 8x your rate",
                    "Organizer who wants to own ticketing and stop paying commissions",
                    "Need production infra (security, GDPR, observability) without building it",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-green-400 mt-0.5 text-sm flex-shrink-0">✓</span>
                      <span className="text-gray-400 text-[15px] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
            <FadeIn delay={200}>
              <div>
                <h3 className="text-lg font-semibold text-red-400 mb-5">Not for you if:</h3>
                <ul className="space-y-4">
                  {[
                    "You want a visual template with no backend",
                    "You don't want to touch code — this is a dev tool",
                    "You need a generic e-commerce store or SaaS dashboard",
                    "You're looking for a free starter kit to learn Next.js",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="text-red-400/60 mt-0.5 text-sm flex-shrink-0">✗</span>
                      <span className="text-gray-600 text-[15px] leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
          <FadeIn delay={300}>
            <p className="text-center text-sm text-gray-700 mt-10">
              If you&apos;re still unsure, you probably don&apos;t need this.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-28 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-orange-500/5 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto relative">
          <FadeIn>
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
              Still building from scratch?
            </h2>
          </FadeIn>
          <FadeIn delay={100}>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed">
              Every week on infrastructure is a week you&apos;re not selling tickets.
              <br />
              The code is ready. The tests pass. The security is handled.
            </p>
          </FadeIn>
          <FadeIn delay={200}>
            <button
              onClick={() => handleCheckout("business")}
              className="bg-orange-500 hover:bg-orange-600 text-white font-semibold text-lg px-10 py-5 rounded-xl transition-all shadow-2xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:-translate-y-0.5"
            >
              Get the Platform →
            </button>
            <p className="text-sm text-gray-700 mt-6">
              14-day money-back guarantee · One-time payment · No subscriptions
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <span>
            Festival<span className="text-orange-500">Platform</span>{" "}
            <span className="text-gray-800">·</span> Next.js 16 · TypeScript · PostgreSQL
          </span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">License</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
