import type { ReactNode } from "react";
import { CalendarDays, CircleUserRound, Bike, Footprints, Volleyball } from "lucide-react";

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

export function ProfileAbout({ title, bio, memberSince, children }: { title: string; bio: string; memberSince: number | null; children?: ReactNode }) {
  return (
    <article className="profile-about">
      <div className="profile-about-intro">
        <div className="profile-about-icon"><CircleUserRound aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <h2>{title}</h2>
          <p className="profile-bio">{bio}</p>
        </div>
      </div>
      {memberSince && <p className="profile-member"><CalendarDays aria-hidden="true" /> Membro desde {memberSince}</p>}
      {children}
    </article>
  );
}

export function ProfileSportIcon({ sport }: { sport: string }) {
  return (
    <span className="profile-sport-icon" aria-hidden="true">
      {sport === "pedal" ? <Bike /> : sport === "corrida" ? <Footprints /> : ["volei", "futvolei", "basquete", "tenis", "beach_tenis"].includes(sport) ? <Volleyball /> : (
        <svg viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="21" fill="var(--card)" stroke="currentColor" strokeWidth="2" />
          <path d="m24 15 9 7-3 11H18l-3-11 9-7Z" fill="currentColor" />
          <path d="m24 3-5 5 5 7 5-7-5-5ZM4 16l1 9 10-3-2-8-9 2ZM44 16l-9-2-2 8 10 3 1-9ZM11 40l9 4-2-11-8-1 1 8ZM37 40l1-8-8 1-2 11 9-4Z" fill="currentColor" />
          <path d="m19 8-6 6M29 8l6 6M5 25l5 7M43 25l-5 7M20 44h8" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      )}
    </span>
  );
}