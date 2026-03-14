/**
 * Secure Script Component with CSP Nonce Support
 *
 * This component wraps Next.js Script to properly handle CSP nonces
 * for external scripts loaded from trusted domains.
 *
 * For inline scripts in Server Components, use nonce attribute directly:
 *
 * Usage (External):
 * <SecureScript src="https://example.com/script.js" strategy="afterInteractive" />
 *
 * Usage (Inline in Server Component):
 * const nonce = await getNonce()
 * <script nonce={nonce}>{`// inline script`}</script>
 */

import Script, { type ScriptProps } from "next/script"

interface SecureScriptProps extends Omit<ScriptProps, "src"> {
  src: string
  strategy?: "afterInteractive" | "beforeInteractive" | "lazyOnload"
}

/**
 * Component for loading external scripts with CSP compliance
 * Supports trusted third-party domains like Ticketmaster, Google Tag Manager, Facebook
 *
 * The CSP policy includes these domains in script-src, so external scripts will load correctly.
 * For inline scripts, use the nonce attribute directly in Server Components.
 */
export function SecureScript({
  src,
  strategy = "afterInteractive",
  ...props
}: SecureScriptProps) {
  // External scripts from whitelisted domains are allowed by CSP
  return <Script {...props} src={src} strategy={strategy} />
}
