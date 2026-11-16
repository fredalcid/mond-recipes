"use client";

import { useState } from "react";

const btn = "inline-flex min-h-11 items-center gap-2 rounded-full border border-sand-strong bg-white px-4 text-sm font-semibold text-forest-900 hover:border-forest-900";

/** Share links that don't load any third-party scripts. */
export function ShareButtons({ title }: { title: string }) {
  const [msg, setMsg] = useState("");
  const enc = (s: string) => encodeURIComponent(s);
  const url = () => (typeof window === "undefined" ? "" : window.location.href);
  return (
    <div className="flex flex-wrap items-center gap-2" data-print-hide>
      <span className="text-sm font-semibold text-ink">Share:</span>
      <button type="button" className={btn} onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url())}`, "_blank", "noopener")}>
        Facebook
      </button>
      <button type="button" className={btn} onClick={() => window.open(`https://pinterest.com/pin/create/button/?url=${enc(url())}&description=${enc(title)}`, "_blank", "noopener")}>
        Pinterest
      </button>
      <button type="button" className={btn} onClick={() => window.open(`https://wa.me/?text=${enc(`${title} ${url()}`)}`, "_blank", "noopener")}>
        WhatsApp
      </button>
      <button
        type="button"
        className={btn}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setMsg("Link copied.");
          } catch {
            setMsg("Copy the address from your browser bar.");
          }
        }}
      >
        Copy link
      </button>
      <span role="status" className="text-sm text-ink-muted">
        {msg}
      </span>
    </div>
  );
}
