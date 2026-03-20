import { setRequestLocale } from "next-intl/server"

export const metadata = {
  title: "Contact Sales | Festival Platform",
  description:
    "Tell us about your event. Get a personalized demo and custom Enterprise pricing for your festival platform.",
}

type Props = {
  params: Promise<{ locale: string }>
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <div className="min-h-screen bg-[#09090b] text-gray-100">
      <div className="max-w-5xl mx-auto px-6 py-24 grid md:grid-cols-2 gap-16">

        {/* ── Left: Value prop ── */}
        <div className="space-y-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
            Tell us about<br />your event
          </h1>

          <p className="text-lg text-gray-400 leading-relaxed">
            Enterprise includes white-glove onboarding, custom integrations,
            SLA-backed support, and pricing adapted to your scale.
          </p>

          <div className="space-y-6 pt-4">
            <Feature
              title="Custom domain & branding"
              desc="Full white-label with your domain, logo, and color palette."
            />
            <Feature
              title="Dedicated infrastructure"
              desc="Isolated deployment, custom CDN, and 99.9% SLA."
            />
            <Feature
              title="Priority support"
              desc="Dedicated Slack channel, &lt;4h response, onboarding sessions."
            />
            <Feature
              title="Advanced analytics"
              desc="Revenue dashboards, funnel tracking, and exportable reports."
            />
          </div>
        </div>

        {/* ── Right: Contact form ── */}
        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-8 md:p-10">
          <form
            action={`mailto:${process.env["NEXT_PUBLIC_CONTACT_EMAIL"] ?? "admin@claritystructures.com"}`}
            method="POST"
            encType="text/plain"
            className="space-y-5"
          >
            <InputField name="name" placeholder="Your name" required />
            <InputField name="email" placeholder="Work email" type="email" required />
            <InputField name="company" placeholder="Company / Festival name" />
            <InputField name="role" placeholder="Your role" />

            <div>
              <label htmlFor="expected_attendees" className="sr-only">
                Expected attendees
              </label>
              <select
                id="expected_attendees"
                name="expected_attendees"
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5
                  text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500/40
                  focus:border-orange-500/40 transition-colors appearance-none"
                defaultValue=""
              >
                <option value="" disabled>Expected attendees</option>
                <option value="1k-5k">1,000 – 5,000</option>
                <option value="5k-20k">5,000 – 20,000</option>
                <option value="20k-50k">20,000 – 50,000</option>
                <option value="50k+">50,000+</option>
              </select>
            </div>

            <div>
              <label htmlFor="message" className="sr-only">
                Tell us about your event
              </label>
              <textarea
                id="message"
                name="message"
                rows={4}
                placeholder="Tell us about your event — dates, venue, what you need..."
                className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5
                  text-sm text-gray-300 placeholder-gray-600
                  focus:outline-none focus:ring-2 focus:ring-orange-500/40
                  focus:border-orange-500/40 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold
                py-4 rounded-xl transition-colors duration-200 text-sm tracking-wide uppercase"
            >
              Book a demo
            </button>

            <p className="text-xs text-gray-600 text-center pt-1">
              We typically respond within 24 hours.
            </p>
          </form>
        </div>

      </div>
    </div>
  )
}

/* ── Sub-components ── */

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-orange-500/10 border border-orange-500/20
        flex items-center justify-center text-orange-400 text-xs font-bold">
        ✓
      </span>
      <div>
        <p className="font-semibold text-white text-sm">{title}</p>
        <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
      </div>
    </div>
  )
}

function InputField({
  name,
  placeholder,
  type = "text",
  required = false,
}: {
  name: string
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={name} className="sr-only">{placeholder}</label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3.5
          text-sm text-gray-300 placeholder-gray-600
          focus:outline-none focus:ring-2 focus:ring-orange-500/40
          focus:border-orange-500/40 transition-colors"
      />
    </div>
  )
}
