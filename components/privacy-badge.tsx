"use client";

import { useState } from "react";

export function PrivacyBadge() {
  const [open, setOpen] = useState(false);
  return (
    <span className="header-badge privacy-badge">
      <button
        type="button"
        className="header-badge-btn"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setOpen(false)}
        title="Generations stay private to your account. No public gallery."
      >
        Privacy: Private
      </button>
      {open ? (
        <span className="header-tooltip" role="tooltip">
          Generations stay private to your account. No public gallery.
        </span>
      ) : null}
    </span>
  );
}

export function CreditsLater() {
  return (
    <span className="header-badge credits-later" title="Billing comes later. This is not a balance.">
      Credits — later
    </span>
  );
}
