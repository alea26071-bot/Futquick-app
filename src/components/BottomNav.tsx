import { Link, useLocation } from "@tanstack/react-router";
import { Compass, Map, Plus, MessageCircle, User } from "lucide-react";

const items = [
  { to: "/descobrir", label: "Descobrir", icon: Compass },
  { to: "/mapa", label: "Mapa", icon: Map },
  { to: "/perfil", label: "Perfil", icon: User },
] as const;

export function BottomNav() {
  const pathname = useLocation({ select: (l) => l.pathname });

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
      <div className="mx-auto max-w-[430px] bg-navy/90 backdrop-blur-xl border-t border-white/10 px-2 py-3 flex justify-around items-center relative">
        {items.slice(0, 2).map((item) => {
          const active = pathname === item.to;
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 flex-1 py-1 group"
            >
              <Icon
                className={`size-6 transition-colors ${active ? "text-cyan" : "text-white/40 group-active:text-white/70"}`}
                strokeWidth={active ? 2.5 : 2}
              />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? "text-cyan" : "text-white/40"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <Link
          to="/criar"
          className="size-14 -mt-8 bg-cyan rounded-2xl grid place-items-center shadow-lg shadow-cyan/30 border-4 border-navy active:scale-95 transition-transform"
          aria-label="Criar pelada"
        >
          <Plus className="size-6 text-navy" strokeWidth={3} />
        </Link>

        <Link to="/chat" className="flex flex-col items-center gap-1 flex-1 py-1 group">
          <MessageCircle
            className={`size-6 transition-colors ${pathname === "/chat" ? "text-cyan" : "text-white/40 group-active:text-white/70"}`}
            strokeWidth={pathname === "/chat" ? 2.5 : 2}
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${pathname === "/chat" ? "text-cyan" : "text-white/40"}`}>
            Chat
          </span>
        </Link>

        <Link to="/perfil" className="flex flex-col items-center gap-1 flex-1 py-1 group">
          <User
            className={`size-6 transition-colors ${pathname === "/perfil" ? "text-cyan" : "text-white/40 group-active:text-white/70"}`}
            strokeWidth={pathname === "/perfil" ? 2.5 : 2}
          />
          <span className={`text-[10px] font-bold uppercase tracking-wider ${pathname === "/perfil" ? "text-cyan" : "text-white/40"}`}>
            Perfil
          </span>
        </Link>
      </div>
    </nav>
  );
}
