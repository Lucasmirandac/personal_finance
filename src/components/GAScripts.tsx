"use client";

import { Suspense } from "react";
import Script from "next/script";
import { getMeasurementId, trackEvent } from "@/lib/analytics";
import { consumeConsentGrantPending, useConsent } from "@/lib/consent";
import { useGAPageView } from "@/lib/hooks/useGAPageView";

function GAPageViewTracker() {
  useGAPageView();
  return null;
}

export function GAScripts() {
  const measurementId = getMeasurementId();
  const consent = useConsent();
  const shouldLoad = consent === "granted" && !!measurementId;

  if (!shouldLoad) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
        onLoad={() => {
          if (consumeConsentGrantPending()) {
            trackEvent({ name: "consent_granted" });
          }
        }}
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
          });
          gtag('consent', 'update', { analytics_storage: 'granted' });
          gtag('config', '${measurementId}', {
            client_storage: 'none',
            anonymize_ip: true,
            allow_google_signals: false,
            allow_ad_personalization_signals: false
          });
        `}
      </Script>
      <Suspense fallback={null}>
        <GAPageViewTracker />
      </Suspense>
    </>
  );
}
