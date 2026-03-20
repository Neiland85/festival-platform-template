"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

/**
 * /checkout/success — Post-purchase page.
 *
 * Displayed after successful Stripe Checkout.
 * Shows next steps: repo access, setup instructions, support.
 *
 * Receives: ?session_id={CHECKOUT_SESSION_ID} from Stripe redirect.
 */

function SuccessContent() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  return (
    <div className="bg-[#09090b] text-gray-100 min-h-screen flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center py-20">
        {/* Confirmation */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-8">
          <span className="text-4xl">✓</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
          You&apos;re in.
        </h1>
        <p className="text-xl text-gray-400 mb-12">
          Your Festival Platform license is confirmed. Here&apos;s what happens next.
        </p>

        {/* Steps */}
        <div className="text-left space-y-6 mb-12">
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="text-orange-500 font-bold text-lg mt-0.5">1</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Check your email</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  You&apos;ll receive an email within 5 minutes with your GitHub repository invite
                  and license key. Check spam if you don&apos;t see it.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="text-orange-500 font-bold text-lg mt-0.5">2</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Clone and setup</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Accept the GitHub invite, clone the repo, and run three commands:
                </p>
                <div className="bg-[#0c0c0e] rounded-xl p-4 mt-3 font-mono text-sm text-gray-400">
                  pnpm install<br />
                  pnpm setup<br />
                  pnpm dev
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <span className="text-orange-500 font-bold text-lg mt-0.5">3</span>
              <div>
                <h3 className="font-semibold text-white mb-1">Make it yours</h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Edit 6 environment variables to set your brand (name, logo, colors, social links).
                  Connect Stripe when ready. Deploy to Vercel or any Node.js host.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Support */}
        <div className="bg-orange-500/5 border border-orange-500/10 rounded-2xl p-6 mb-8">
          <p className="text-gray-300 text-sm">
            Need help?{" "}
            <a href="https://github.com" className="text-orange-400 hover:text-orange-300 underline underline-offset-2">
              GitHub Discussions
            </a>{" "}
            for questions.{" "}
            Enterprise customers: check your email for your dedicated support address.
          </p>
        </div>

        {/* Session reference */}
        {sessionId && (
          <p className="text-xs text-gray-700">
            Reference: {sessionId.slice(0, 20)}…
          </p>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="bg-[#09090b] text-gray-100 min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
