import type { ReactNode } from "react";

export function EmptyState(props: {
  kicker?: string;
  title: string;
  body: string;
  action?: { href: string; label: string };
  compact?: boolean;
  children?: ReactNode;
}) {
  return (
    <div className={props.compact ? "empty-state is-compact" : "empty-state"} role="status">
      <div className="empty-state-mark" aria-hidden="true" />
      {props.kicker ? <p className="kicker">{props.kicker}</p> : null}
      <h2>{props.title}</h2>
      <p className="muted">{props.body}</p>
      {props.action ? (
        <a className="btn" href={props.action.href}>
          {props.action.label}
        </a>
      ) : null}
      {props.children}
    </div>
  );
}
