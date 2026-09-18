"use client";

import { useEffect, useState } from "react";

export function AuthNav() {
  const [href, setHref] = useState("/invite");
  const [label, setLabel] = useState("Enter");

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((res) => res.json())
      .then((data: { user?: { ageAttestedAt: string | null } | null }) => {
        if (data.user) {
          setHref(data.user.ageAttestedAt ? "/studio" : "/age");
          setLabel("Studio");
        }
      })
      .catch(() => undefined);
  }, []);

  return <a href={href}>{label}</a>;
}
