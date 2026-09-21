import type { ReactNode } from "react";
import { PrivacyStrip } from "@/components/privacy-strip";
import { SignOutButton } from "@/components/sign-out-button";
import { Wordmark } from "@/components/wordmark";

function StudioNav(props: { admin?: boolean }) {
  return (
    <nav>
      <a href="/app/characters">Characters</a>
      <a href="/app/create">Create</a>
      <a href="/app/library">Library</a>
      <a href="/app/jobs">Jobs</a>
      <a href="/app/settings">Settings</a>
      {props.admin ? <a href="/admin/invites">Invites</a> : null}
    </nav>
  );
}

export function StudioChrome(props: {
  email: string;
  admin?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="studio">
      <aside className="rail">
        <div className="kicker">Studio</div>
        <Wordmark href="/app/characters" size="sm" />
        <StudioNav admin={props.admin} />
        <p className="muted">{props.email}</p>
        <SignOutButton />
      </aside>
      <div>
        <header className="studio-narrow">
          <Wordmark href="/app/characters" size="sm" variant="w1" />
          <StudioNav admin={props.admin} />
          <SignOutButton />
        </header>
        <PrivacyStrip />
        <div className="canvas">{props.children}</div>
      </div>
    </div>
  );
}
