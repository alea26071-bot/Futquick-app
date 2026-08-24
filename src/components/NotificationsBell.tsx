import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { syncPushIfGranted } from "@/lib/push-client";

export function NotificationsBell({ userId, className = "" }: { userId: string; className?: string }) {
  const qc = useQueryClient();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications-unread", userId],
    queryFn: async () => {
      const { count } = await supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .is("read_at", null);
      return count ?? 0;
    },
  });

  useEffect(() => {
    void syncPushIfGranted();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`notif-badge-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => qc.invalidateQueries({ queryKey: ["notifications-unread", userId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc, userId]);

  return (
    <Link
      to="/notificacoes"
      aria-label="Notificações"
      className={`size-10 rounded-full bg-navy-soft border border-white/10 grid place-items-center relative ${className}`}
    >
      <Bell className="size-4 text-white/70" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-cyan text-navy text-[10px] font-extrabold grid place-items-center">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
