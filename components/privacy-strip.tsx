"use client";

import { useEffect, useState } from "react";
import { PRIVACY_TOOLTIP_COPY } from "@/lib/privacy-copy";

export function PrivacyStrip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem("cast_privacy_strip") !== "dismissed");
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="banner privacy-strip" title={PRIVACY_TOOLTIP_COPY}>
      {PRIVACY_TOOLTIP_COPY}{" "}
      <button
        className="btn secondary"
        type="button"
        onClick={() => {
          window.localStorage.setItem("cast_privacy_strip", "dismissed");
          setOpen(false);
        }}
      >
        Got it
      </button>
    </div>
  );
}
