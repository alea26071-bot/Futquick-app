import type { ReactNode } from "react";
import { CircleUserRound, Bike, Footprints, Volleyball, Dumbbell } from "lucide-react";

export function ProfileStat({ icon, value, label, tone }: { icon: ReactNode; value: string | number; label: string; tone: "primary" | "warning" | "success" }) {
  const toneClass = tone === "primary" ? "text-primary" : tone === "warning" ? "text-warning" : "text-success";
  return (
    <div className="profile-stat">
      <div className={`profile-stat-icon ${toneClass}`}>{icon}</div>
      <p className="profile-stat-value">{value}</p>
      <p className="profile-stat-label">{label}</p>
    </div>
  );
}

export function ProfileAbout({ title, bio, children }: { title: string; bio: string; children?: ReactNode }) {
  return (
    <article className="profile-about">
      <div className="profile-about-intro">
        <div className="profile-about-icon"><CircleUserRound aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2>{title}</h2>
          <p className="profile-bio">{bio}</p>
        </div>
      </div>
      {children}
    </article>
  );
}

export function ProfileSportIcon({ sport }: { sport: string }) {
  return (
    <span className="profile-sport-icon" aria-hidden="true">
      {sport === "pedal" ? <Bike /> : sport === "corrida" ? <Footprints /> : sport === "funcional" ? <Dumbbell /> : ["volei", "futvolei"].includes(sport) ? <Volleyball /> : sport === "basquete" ? (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="24" cy="24" r="20" fill="var(--sport-icon-surface)" />
          <path d="M4 24h40M24 4v40M10 10c18 7 18 21 0 28M38 10c-18 7-18 21 0 28" />
        </svg>
      ) : ["tenis", "beach_tenis"].includes(sport) ? (
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="29" cy="18" rx="11" ry="14" transform="rotate(35 29 18)" fill="var(--sport-icon-surface)" />
          {sport === "tenis" ? <path d="m24 8 13 9M20 14l15 10M19 20l12 9M31 6 18 24M37 10 23 29" strokeWidth="1.2" /> : <path d="M29 12h.01M25 18h.01M33 18h.01M29 24h.01" strokeWidth="3.5" />}
          <path d="m20 29-4 5m-1-2 3 3-8 10-4-4 9-9Z" />
          <circle cx="39" cy="37" r="5" fill="var(--sport-icon-surface)" />
        </svg>
      ) : (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="var(--sport-icon-surface)" stroke="currentColor" strokeWidth="2" />
          <path d="m24 15 9 7-3 11H18l-3-11 9-7Z" fill="currentColor" />
          <path d="m24 3-5 5 5 7 5-7-5-5ZM4 16l1 9 10-3-2-8-9 2ZM44 16l-9-2-2 8 10 3 1-9ZM11 40l9 4-2-11-8-1 1 8ZM37 40l1-8-8 1-2 11 9-4Z" fill="currentColor" />
          <path d="m19 8-6 6M29 8l6 6M5 25l5 7M43 25l-5 7M20 44h8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </span>
  );
}