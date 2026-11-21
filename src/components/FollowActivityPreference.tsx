import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { setFollowActivityPreference } from "@/lib/social.functions";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function FollowActivityPreference({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const save = useServerFn(setFollowActivityPreference);
  const preference = useQuery({ queryKey: ["follow-activity-preference", userId], queryFn: async () => {
    const { data, error } = await supabase.from("profiles").select("notify_follow_activity").eq("id", userId).single();
    if (error) throw error;
    return data.notify_follow_activity;
  } });
  const mutation = useMutation({ mutationFn: (enabled: boolean) => save({ data: { enabled } }), onSuccess: (result) => { qc.setQueryData(["follow-activity-preference", userId], result.enabled); }, onError: () => toast.error("Não foi possível salvar a preferência.") });
  return <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-foreground">
    <label htmlFor="follow-activity" className="text-sm font-semibold">Atividade de quem sigo</label>
    {preference.isError ? <Button variant="ghost" size="sm" onClick={() => preference.refetch()}>Tentar novamente</Button> : <Switch id="follow-activity" aria-label="Notificações de atividade de quem sigo" checked={preference.data ?? false} disabled={preference.isPending || mutation.isPending} onCheckedChange={(enabled) => mutation.mutate(enabled)} />}
  </div>;
}