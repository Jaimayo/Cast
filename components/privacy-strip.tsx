"use client";

import { useEffect, useState } from "react";

export function PrivacyStrip() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(window.localStorage.getItem("cast_privacy_strip") !== "dismissed");
  }, []);

  if (!open) {
    return null;
  }

  return (
    <div className="banner privacy-strip">
      Generations stay private to your account. Stills are stored briefly so jobs can finish. Credits
      come later.{" "}
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
