"use client"

import { useState } from "react"

const PRODUCTS = [
  {
    id: "festival-platform",
    name: "Festival Platform Template",
    tagline: "Production-grade infrastructure for live music events",
    description:
      "Complete ticket sales pipeline, enterprise security, multi-tenancy, GDPR compliance. White-label ready. Fork, customize, deploy.",
    stack: ["Next.js 15", "React 19", "TypeScript", "PostgreSQL", "Stripe", "Tailwind 4"],
    features: [
      "Stripe checkout with webhooks & dead-letter queue",
      "WAF with 70+ attack patterns",
      "Schema-level multi-tenancy",
      "OpenTelemetry distributed tracing",
      "465+ automated tests",
      "k6 load testing with SLO thresholds",
    ],
    status: "Production Ready",
    version: "v1.6.0",
    repo: "https://github.com/Neiland85/festival-platform-template",
    demo: "/es",
  },
]

const SECURITY_FEATURES = [
  { name: "Web Application Firewall", detail: "70+ attack pattern signatures" },
  { name: "DDoS Shield", detail: "Multi-layer connection & request throttling" },
  { name: "AES-256-GCM Encryption", detail: "Data at rest + TLS 1.3 in transit" },
  { name: "2FA TOTP", detail: "Time-based one-time passwords" },
  { name: "GDPR/RGPD Compliance", detail: "Consent flows, IP hashing, soft-delete" },
  { name: "Supply Chain Hardening", detail: "Integrity monitoring, frozen lockfile" },
]

const STATS = [
  { value: "465+", label: "Automated Tests" },
  { value: "70+", label: "WAF Patterns" },
  { value: "99.9%", label: "Uptime SLA" },
  { value: "<500ms", label: "p95 Latency" },
]

export default function ShowcasePage() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: "'Space Mono', 'SF Mono', monospace",
      }}
    >
      {/* ── HERO ── */}
      <header
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          padding: "2rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 50% 0%, rgba(65,65,198,0.15) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(255,51,0,0.08) 0%, transparent 50%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1, maxWidth: "800px" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#717171",
              marginBottom: "2rem",
            }}
          >
            Clarity Structures Digital S.L.
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 5rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "0 0 1.5rem",
              background: "linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Production-Grade
            <br />
            Code Templates
          </h1>

          <p
            style={{
              fontSize: "1.25rem",
              color: "#999",
              maxWidth: "600px",
              margin: "0 auto 3rem",
              lineHeight: 1.6,
            }}
          >
            Enterprise security. Battle-tested infrastructure.
            <br />
            Ready to deploy. Built for scale.
          </p>

          <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a
              href="#products"
              style={{
                display: "inline-block",
                padding: "0.875rem 2rem",
                background: "#4141C6",
                color: "#fff",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: 600,
                letterSpacing: "0.05em",
                transition: "background 0.2s",
              }}
            >
              View Products
            </a>
            <a
              href="mailto:admin@claritystructures.com"
              style={{
                display: "inline-block",
                padding: "0.875rem 2rem",
                border: "1px solid #333",
                color: "#ccc",
                textDecoration: "none",
                borderRadius: "6px",
                fontSize: "0.875rem",
                fontWeight: 500,
                letterSpacing: "0.05em",
              }}
            >
              Contact Us
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div
          style={{
            position: "absolute",
            bottom: "2rem",
            left: "50%",
            transform: "translateX(-50%)",
            color: "#555",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            animation: "pulse 2s infinite",
          }}
        >
          SCROLL
        </div>
      </header>

      {/* ── STATS ── */}
      <section
        style={{
          borderTop: "1px solid #1a1a1a",
          borderBottom: "1px solid #1a1a1a",
          padding: "3rem 2rem",
        }}
      >
        <div
          style={{
            maxWidth: "1000px",
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "2rem",
            textAlign: "center",
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff" }}>{stat.value}</div>
              <div style={{ fontSize: "0.75rem", color: "#717171", letterSpacing: "0.1em", marginTop: "0.25rem" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRODUCTS ── */}
      <section id="products" style={{ padding: "6rem 2rem" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#4141C6",
              marginBottom: "1rem",
            }}
          >
            Products
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", margin: "0 0 4rem" }}>
            Code You Can Ship Today
          </h2>

          {PRODUCTS.map((product) => (
            <div
              key={product.id}
              style={{
                border: "1px solid #1a1a1a",
                borderRadius: "12px",
                padding: "3rem",
                marginBottom: "2rem",
                background: "linear-gradient(135deg, #111 0%, #0d0d0d 100%)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
                <div>
                  <h3 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#fff", margin: "0 0 0.5rem" }}>
                    {product.name}
                  </h3>
                  <p style={{ color: "#999", margin: "0 0 1rem", fontSize: "1rem" }}>{product.tagline}</p>
                </div>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "0.25rem 0.75rem",
                      background: "#1a3a1a",
                      color: "#4ade80",
                      borderRadius: "999px",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                  >
                    {product.status}
                  </span>
                  <span style={{ color: "#555", fontSize: "0.875rem" }}>{product.version}</span>
                </div>
              </div>

              <p style={{ color: "#888", lineHeight: 1.6, margin: "0 0 2rem", maxWidth: "700px" }}>
                {product.description}
              </p>

              {/* Stack */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "2rem" }}>
                {product.stack.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      padding: "0.25rem 0.75rem",
                      background: "#1a1a2e",
                      color: "#8b8bf0",
                      borderRadius: "4px",
                      fontSize: "0.75rem",
                      fontWeight: 500,
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>

              {/* Features */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "2rem",
                }}
              >
                {product.features.map((feature) => (
                  <div key={feature} style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                    <span style={{ color: "#4141C6", flexShrink: 0 }}>+</span>
                    <span style={{ color: "#aaa", fontSize: "0.875rem" }}>{feature}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <a
                  href={product.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#4141C6",
                    color: "#fff",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                  }}
                >
                  View on GitHub
                </a>
                <a
                  href={product.demo}
                  style={{
                    padding: "0.75rem 1.5rem",
                    border: "1px solid #333",
                    color: "#ccc",
                    textDecoration: "none",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                >
                  Live Demo
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECURITY ── */}
      <section style={{ padding: "6rem 2rem", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: "1000px", margin: "0 auto" }}>
          <div
            style={{
              fontSize: "0.75rem",
              letterSpacing: "0.3em",
              textTransform: "uppercase",
              color: "#FF3300",
              marginBottom: "1rem",
            }}
          >
            Security
          </div>
          <h2 style={{ fontSize: "2.5rem", fontWeight: 700, color: "#fff", margin: "0 0 1rem" }}>
            Enterprise-Grade by Default
          </h2>
          <p style={{ color: "#888", margin: "0 0 3rem", maxWidth: "600px" }}>
            Every template ships with a comprehensive security stack. No bolt-ons, no afterthoughts.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "1px",
              background: "#1a1a1a",
              borderRadius: "12px",
              overflow: "hidden",
            }}
          >
            {SECURITY_FEATURES.map((feature, i) => (
              <div
                key={feature.name}
                onMouseEnter={() => setHoveredFeature(i)}
                onMouseLeave={() => setHoveredFeature(null)}
                style={{
                  padding: "2rem",
                  background: hoveredFeature === i ? "#151515" : "#111",
                  transition: "background 0.2s",
                  cursor: "default",
                }}
              >
                <h3 style={{ fontSize: "1rem", fontWeight: 600, color: "#fff", margin: "0 0 0.5rem" }}>
                  {feature.name}
                </h3>
                <p style={{ fontSize: "0.875rem", color: "#717171", margin: 0 }}>{feature.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section style={{ padding: "6rem 2rem", borderTop: "1px solid #1a1a1a" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#fff", margin: "0 0 1rem" }}>
            Ready to Ship?
          </h2>
          <p style={{ color: "#888", margin: "0 0 2rem", lineHeight: 1.6 }}>
            Custom integrations, enterprise licensing, or technical consulting. We build what you need.
          </p>
          <a
            href="mailto:admin@claritystructures.com"
            style={{
              display: "inline-block",
              padding: "1rem 2.5rem",
              background: "#4141C6",
              color: "#fff",
              textDecoration: "none",
              borderRadius: "6px",
              fontSize: "1rem",
              fontWeight: 600,
              letterSpacing: "0.05em",
            }}
          >
            admin@claritystructures.com
          </a>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer
        style={{
          padding: "3rem 2rem",
          borderTop: "1px solid #1a1a1a",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "0.75rem", color: "#555" }}>
          &copy; 2026 Clarity Structures Digital S.L. All rights reserved.
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
