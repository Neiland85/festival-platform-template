"use client"

import Script from "next/script"
import { useEffect, useSyncExternalStore } from "react"

const PIXEL_ID = process.env["NEXT_PUBLIC_FB_PIXEL_ID"] ?? ""

const CONSENT_COOKIE = "sn_cookie_consent"

function getConsentSnapshot(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie
    .split("; ")
    .some((c) => c === `${CONSENT_COOKIE}=accepted`)
}

function getServerSnapshot(): boolean {
  return false
}

/**
 * Subscribe to cookie changes by polling every 1s.
 * Returns unsubscribe function as required by useSyncExternalStore.
 */
function subscribeToConsent(callback: () => void): () => void {
  const interval = setInterval(callback, 1000)
  return () => clearInterval(interval)
}

export default function MetaPixel() {
  const consented = useSyncExternalStore(
    subscribeToConsent,
    getConsentSnapshot,
    getServerSnapshot
  )

  useEffect(() => {
    if (!consented || !PIXEL_ID) return
    // PageView is tracked by the inline script on load.
    // Additional SPA navigations could fire PageView here if needed.
  }, [consented])

  if (!PIXEL_ID || !consented) return null

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
      >
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>

      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
        />
      </noscript>
    </>
  )
}
