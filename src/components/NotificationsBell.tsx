import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { enablePush, pushPermission, syncPushIfGranted } from "@/lib/push-client";
import { PUSH_PROMPT } from "@/lib/notification-copy";

const PROMPT_KEY = "futquick-push-prompted";

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
    // Convite único por aparelho, depois que o cadastro já foi concluído.
    if (pushPermission() !== "default" || localStorage.getItem(PROMPT_KEY)) return;
    const t = window.setTimeout(() => {
      localStorage.setItem(PROMPT_KEY, "1");
      toast(PUSH_PROMPT.title, {
        description: PUSH_PROMPT.body,
        duration: 15000,
        action: { label: PUSH_PROMPT.action, onClick: () => void enablePush() },
      });
    }, 4000);
    return () => window.clearTimeout(t);
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
