import Script from "next/script";

// GA4: solo medición de visitas. Si NEXT_PUBLIC_GA_ID no está seteada, no renderiza nada.
const GA_ID = process.env.NEXT_PUBLIC_GA_ID?.trim();
const GA_ID_PATTERN = /^G-[A-Z0-9]+$/;

export function GoogleAnalytics() {
  if (!GA_ID || !GA_ID_PATTERN.test(GA_ID)) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
      </Script>
    </>
  );
}
