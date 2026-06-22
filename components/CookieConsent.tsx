"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

function loadGtm() {
  const gtmScript = document.createElement("script");
  gtmScript.textContent = `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NXGR8BPM');`;
  document.head.appendChild(gtmScript);

  document.body.insertAdjacentHTML(
    "beforeend",
    `<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NXGR8BPM" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
  );
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (consent === "true") {
      loadGtm();
    } else if (consent === null) {
      setShowBanner(true);
    }
  }, []);

  function acceptAll() {
    localStorage.setItem("cookie-consent", "true");
    setShowBanner(false);
    loadGtm();
  }

  function rejectAll() {
    localStorage.setItem("cookie-consent", "false");
    setShowBanner(false);
  }

  if (!showBanner) {
    return null;
  }

  return (
    <aside className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t p-4 sm:p-6 shadow-lg transform transition-transform duration-500 translate-y-0">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">We value your privacy</p>
          <p>
            We use cookies to enhance your experience and analyze site traffic. 
            By clicking &quot;Accept all&quot;, you consent to Google Tag Manager and analytics cookies.
            See our{" "}
            <Link href="/cookies" className="underline hover:text-primary">Cookie Policy</Link>
            {" "}and{" "}
            <Link href="/privacy" className="underline hover:text-primary">Privacy Policy</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={rejectAll} className="text-sm px-4 py-2 rounded border hover:bg-muted transition-colors">
            Essential only
          </button>
          <button onClick={acceptAll} className="text-sm px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            Accept all
          </button>
        </div>
      </div>
    </aside>
  );
}