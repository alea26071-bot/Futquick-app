import { useEffect } from "react";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens for new chat notifications in real time and shows a 3s pop-up
 * at the top of the screen with the sender name and the message.
 */
export function ChatMessagePopup({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const channel = supabase
      .channel(`chat-popup-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const n = payload.new as {
            type: string;
            title: string;
            body: string | null;
            url: string | null;
          };
          if (n.type !== "chat_message") return;
          // Don't interrupt when the user is already inside that conversation.
          if (n.url && location.pathname.startsWith(n.url)) return;

          toast.custom(
            (id) => (
              <button
                onClick={() => {
                  toast.dismiss(id);
                  if (n.url) navigate({ href: n.url });
                }}
                className="w-full max-w-sm text-left flex items-start gap-3 rounded-2xl border border-cyan/30 bg-navy-soft px-4 py-3 shadow-2xl animate-in slide-in-from-top-4 fade-in duration-300"
              >
                <span className="size-9 rounded-full bg-cyan/20 grid place-items-center flex-none">
                  <MessageCircle className="size-4 text-cyan" strokeWidth={2.5} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white truncate">{n.title}</span>
                  <span className="block text-xs text-white/70 line-clamp-2">{n.body ?? "Nova mensagem"}</span>
                </span>
              </button>
            ),
            { duration: 3000, position: "top-center" },
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, navigate, location.pathname]);

  return null;
}
