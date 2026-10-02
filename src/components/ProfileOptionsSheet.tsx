import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Share2, Flag, Ban } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ReportSheet } from "@/components/ReportSheet";

export function ProfileOptionsSheet({
  open,
  onOpenChange,
  isMe,
  meId,
  otherId,
  onShare,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isMe: boolean;
  meId: string;
  otherId: string;
  onShare: () => void;
}) {
  const qc = useQueryClient();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: blocked = false } = useQuery({
    queryKey: ["block", meId, otherId],
    enabled: !isMe,
    queryFn: async () => {
      const { data } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", meId).eq("blocked_id", otherId).maybeSingle();
      return !!data;
    },
  });

  const toggleBlock = async () => {
    if (!blocked && !window.confirm("Bloquear este usuário? Vocês não poderão trocar mensagens nem convites.")) return;
    const { error } = blocked
      ? await supabase.from("user_blocks").delete().eq("blocker_id", meId).eq("blocked_id", otherId)
      : await supabase.from("user_blocks").insert({ blocker_id: meId, blocked_id: otherId });
    if (error) return toast.error(error.message);
    if (!blocked) await supabase.from("user_follows").delete().eq("follower_id", meId).eq("following_id", otherId);
    toast.success(blocked ? "Usuário desbloqueado" : "Usuário bloqueado");
    qc.invalidateQueries({ queryKey: ["block", meId, otherId] });
    onOpenChange(false);
  };

  const row = "w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-navy-soft border border-white/10 text-sm font-bold";
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="bg-navy border-white/10 rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="text-white font-display font-extrabold italic uppercase">Opções</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 pb-4">
            <button className={`${row} text-white`} onClick={() => { onOpenChange(false); onShare(); }}>
              <Share2 className="size-5 text-cyan" /> Compartilhar perfil
            </button>
            {!isMe && (
              <>
                <button className={`${row} text-white`} onClick={() => { onOpenChange(false); setReportOpen(true); }}>
                  <Flag className="size-5 text-warning" /> Denunciar usuário
                </button>
                <button className={`${row} text-destructive`} onClick={toggleBlock}>
                  <Ban className="size-5" /> {blocked ? "Desbloquear usuário" : "Bloquear usuário"}
                </button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
      <ReportSheet open={reportOpen} onOpenChange={setReportOpen} target={{ type: "user", reportedUserId: otherId }} reporterId={meId} />
    </>
  );
}
