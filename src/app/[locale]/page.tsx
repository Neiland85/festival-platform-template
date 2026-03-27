'use client'

const STACK = ["Next.js 15", "React 19", "TypeScript", "PostgreSQL", "Stripe", "Tailwind 4"]

const FEATURES = [
  { icon: "🛡️", title: "WAF · 70+ Patterns", desc: "SQL injection, XSS, path traversal, SSRF, Log4Shell, scanner detection" },
  { icon: "⚡", title: "DDoS Shield", desc: "Multi-layer rate limiting, IP auto-ban, request throttling per route" },
  { icon: "🔐", title: "AES-256-GCM", desc: "Data encryption at rest, TLS 1.3 in transit, 2FA TOTP authentication" },
  { icon: "🎫", title: "Stripe Checkout", desc: "Webhooks with dead-letter queue, idempotency guards, payment reconciliation" },
  { icon: "🏢", title: "Multi-Tenancy", desc: "Schema-level PostgreSQL isolation, tenant provisioner, AsyncLocalStorage" },
  { icon: "📊", title: "OpenTelemetry", desc: "Distributed tracing, structured logging, correlation engine, audit trail" },
  { icon: "🇪🇺", title: "GDPR/RGPD", desc: "Consent flows, IP hashing, soft-delete, ARCO rights, cookie compliance" },
  { icon: "🧪", title: "466+ Tests", desc: "Vitest + Playwright E2E, k6 load testing, 80% coverage thresholds" },
]

const STATS = [
  { value: "466+", label: "Tests", color: "#6C3AFF" },
  { value: "70+", label: "WAF Rules", color: "#FF3366" },
  { value: "99.9%", label: "Uptime SLA", color: "#00CC88" },
  { value: "<500ms", label: "p95 Latency", color: "#3A86FF" },
]

export default function LocalePage() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFDF7", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes hero-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        @keyframes float { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-8px); } }
        @keyframes slide-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .nb-card { transition: transform 0.2s, box-shadow 0.2s; }
        .nb-card:hover { transform: translate(-3px, -3px); box-shadow: 8px 8px 0px #000; }
        .nb-btn-primary { transition: transform 0.15s, box-shadow 0.15s; }
        .nb-btn-primary:hover { transform: translate(-2px, -2px); box-shadow: 6px 6px 0px #000; }
        .nb-btn-primary:active { transform: translate(0, 0); box-shadow: 0 0 0 #000; }
        .nb-btn-secondary { transition: all 0.15s; }
        .nb-btn-secondary:hover { background: #000 !important; color: #FFFDF7 !important; transform: translate(-1px, -1px); box-shadow: 4px 4px 0px #000; }
      `}</style>

      {/* ═══ HERO ═══ */}
      <header style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "2rem",
        borderBottom: "3px solid #000",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Background dots */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.04,
          backgroundImage: "radial-gradient(#000 1.5px, transparent 1.5px)",
          backgroundSize: "24px 24px",
        }} />

        {/* Gradient blob */}
        <div style={{
          position: "absolute", top: "-20%", right: "-10%", width: "600px", height: "600px",
          background: "linear-gradient(135deg, #6C3AFF33, #3A86FF22, #FF336622)",
          backgroundSize: "200% 200%",
          animation: "hero-gradient 8s ease infinite",
          borderRadius: "50%", filter: "blur(80px)", pointerEvents: "none",
        }} />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px", animation: "slide-in 0.8s ease-out" }}>
          {/* Badge */}
          <div style={{
            display: "inline-block", padding: "0.5rem 1.25rem", marginBottom: "2rem",
            background: "#000", color: "#FFFDF7", borderRadius: "999px",
            fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em",
          }}>
            CLARITY STRUCTURES DIGITAL S.L.
          </div>

          <h1 style={{
            fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 900, lineHeight: 0.95,
            margin: "0 0 1.5rem", color: "#000", letterSpacing: "-0.03em",
          }}>
            Ship Code
            <br />
            <span style={{
              background: "linear-gradient(135deg, #6C3AFF, #3A86FF, #6C3AFF)",
              backgroundSize: "200% 200%",
              animation: "hero-gradient 4s ease infinite",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>
              Not Excuses
            </span>
          </h1>

          <p style={{
            fontSize: "1.25rem", color: "#555", maxWidth: "520px",
            margin: "0 auto 2.5rem", lineHeight: 1.7, fontWeight: 500,
          }}>
            Production-grade templates for live music festivals.
            Enterprise security baked in. Fork, customize, deploy.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="#products" className="nb-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 2.5rem",
              background: "linear-gradient(135deg, #6C3AFF, #3A86FF)",
              color: "#fff", textDecoration: "none", borderRadius: "14px",
              fontSize: "1rem", fontWeight: 800, textTransform: "uppercase" as const,
              border: "2.5px solid #000", boxShadow: "4px 4px 0px #000",
              letterSpacing: "0.05em",
            }}>
              View Product ↓
            </a>
            <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" className="nb-btn-secondary" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 2rem", background: "#FFFDF7", color: "#000",
              textDecoration: "none", borderRadius: "14px",
              fontSize: "0.9375rem", fontWeight: 700,
              border: "2.5px solid #000", boxShadow: "3px 3px 0px #000",
            }}>
              ⭐ GitHub
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: "absolute", bottom: "2rem", left: "50%", transform: "translateX(-50%)",
          animation: "float 2s ease-in-out infinite",
        }}>
          <div style={{
            width: "28px", height: "44px", border: "2.5px solid #000", borderRadius: "14px",
            display: "flex", justifyContent: "center", paddingTop: "8px",
          }}>
            <div style={{ width: "4px", height: "10px", background: "#000", borderRadius: "2px" }} />
          </div>
        </div>
      </header>

      {/* ═══ STATS ═══ */}
      <section style={{ borderBottom: "3px solid #000", padding: "3rem 2rem", background: "#000" }}>
        <div style={{
          maxWidth: "900px", margin: "0 auto",
          display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem",
          textAlign: "center",
        }}>
          {STATS.map((stat) => (
            <div key={stat.label} style={{
              padding: "1.5rem 1rem",
              background: "#111", border: "2px solid #333", borderRadius: "16px",
            }}>
              <div style={{ fontSize: "2.5rem", fontWeight: 900, color: stat.color, letterSpacing: "-0.02em" }}>
                {stat.value}
              </div>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#888", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginTop: "0.25rem" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ PRODUCT ═══ */}
      <section id="products" style={{ padding: "6rem 2rem", borderBottom: "3px solid #000" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <span style={{
            display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem",
            background: "#E8FF3A", border: "2px solid #000", borderRadius: "999px",
            fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em",
          }}>
            PRODUCT
          </span>

          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 900, color: "#000", margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Festival Platform Template
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#666", margin: "0 0 2rem", maxWidth: "600px", lineHeight: 1.7 }}>
            Complete ticket sales pipeline, enterprise security, multi-tenancy, GDPR compliance.
            White-label ready. Fork, customize, deploy.
          </p>

          {/* Stack pills */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "3rem" }}>
            {STACK.map((tech) => (
              <span key={tech} style={{
                padding: "0.5rem 1rem",
                background: "#F0ECFF", color: "#6C3AFF",
                border: "2px solid #6C3AFF", borderRadius: "10px",
                fontSize: "0.8125rem", fontWeight: 700,
              }}>
                {tech}
              </span>
            ))}
          </div>

          {/* Status + Version */}
          <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" }}>
            <span style={{
              padding: "0.5rem 1.25rem",
              background: "#00CC88", color: "#000",
              border: "2.5px solid #000", borderRadius: "12px", boxShadow: "3px 3px 0px #000",
              fontSize: "0.875rem", fontWeight: 800,
            }}>
              ✓ Production Ready
            </span>
            <span style={{
              padding: "0.5rem 1.25rem",
              background: "#FFFDF7", color: "#000",
              border: "2.5px solid #000", borderRadius: "12px", boxShadow: "3px 3px 0px #000",
              fontSize: "0.875rem", fontWeight: 700,
            }}>
              v1.12
            </span>
          </div>

          {/* CTA */}
          <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" className="nb-btn-primary" style={{
            display: "inline-flex", alignItems: "center", gap: "0.625rem",
            padding: "1.125rem 2.5rem",
            background: "linear-gradient(135deg, #6C3AFF, #3A86FF)",
            color: "#fff", textDecoration: "none", borderRadius: "14px",
            fontSize: "1rem", fontWeight: 800, textTransform: "uppercase" as const,
            border: "2.5px solid #000", boxShadow: "4px 4px 0px #000",
          }}>
            Get the Code →
          </a>
        </div>
      </section>

      {/* ═══ FEATURES GRID ═══ */}
      <section style={{ padding: "6rem 2rem", borderBottom: "3px solid #000" }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <span style={{
            display: "inline-block", padding: "0.375rem 1rem", marginBottom: "1rem",
            background: "#FF3366", color: "#fff", border: "2px solid #000", borderRadius: "999px",
            fontSize: "0.75rem", fontWeight: 800, letterSpacing: "0.1em",
          }}>
            FEATURES
          </span>

          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, color: "#000", margin: "0 0 3rem", letterSpacing: "-0.02em" }}>
            Everything you need.
            <br />
            Nothing you don't.
          </h2>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}>
            {FEATURES.map((feature) => (
              <div key={feature.title} className="nb-card" style={{
                padding: "1.75rem",
                background: "#fff",
                border: "2.5px solid #000",
                borderRadius: "16px",
                boxShadow: "5px 5px 0px #000",
                cursor: "default",
              }}>
                <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 800, color: "#000", margin: "0 0 0.5rem" }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#666", margin: 0, lineHeight: 1.6 }}>
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA ═══ */}
      <section style={{
        padding: "6rem 2rem", borderBottom: "3px solid #000",
        background: "#000", color: "#FFFDF7",
      }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 900, margin: "0 0 1rem", letterSpacing: "-0.02em" }}>
            Ready to ship? 🚀
          </h2>
          <p style={{ fontSize: "1.125rem", color: "#999", margin: "0 0 2.5rem", lineHeight: 1.7 }}>
            Enterprise licensing, custom integrations, or technical consulting.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="mailto:admin@claritystructures.com" className="nb-btn-primary" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 2rem",
              background: "linear-gradient(135deg, #6C3AFF, #3A86FF)",
              color: "#fff", textDecoration: "none", borderRadius: "14px",
              fontSize: "0.9375rem", fontWeight: 800,
              border: "2.5px solid #FFFDF7", boxShadow: "4px 4px 0px #FFFDF7",
            }}>
              ✉ Contact Us
            </a>
            <a href="https://github.com/Neiland85/festival-platform-template" target="_blank" rel="noopener noreferrer" style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "1rem 2rem",
              background: "transparent", color: "#FFFDF7",
              textDecoration: "none", borderRadius: "14px",
              fontSize: "0.9375rem", fontWeight: 700,
              border: "2.5px solid #333",
              transition: "border-color 0.2s",
            }}>
              View Source ↗
            </a>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ padding: "2.5rem 2rem", textAlign: "center", background: "#FFFDF7" }}>
        <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "#000", marginBottom: "0.375rem" }}>
          Clarity Structures Digital S.L.
        </div>
        <div style={{ fontSize: "0.75rem", color: "#999" }}>
          © 2026 · Madrid, Spain · All rights reserved
        </div>
      </footer>
    </div>
  )
}
