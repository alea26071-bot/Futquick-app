import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { supabase } from '@/integrations/supabase/client';
import { Star, Check, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { saveStars, savePosture, confirmAttendance } from '@/lib/reputation.functions';
import { toast } from 'sonner';

type Props = { peladaId: string; organizerId: string; userId: string; isOrganizer: boolean; hasFinished: boolean; wasAccepted: boolean };
export function PostMatchRating({ peladaId, organizerId, userId, isOrganizer, hasFinished }: Props) {
 const qc = useQueryClient();
 const starsFn = useServerFn(saveStars); const postureFn = useServerFn(savePosture); const attendanceFn = useServerFn(confirmAttendance);
 const [busy, setBusy] = useState<string | null>(null);
 const [draft, setDraft] = useState<Record<string, string>>({});
 const { data, isLoading, error } = useQuery({
  queryKey: ['game-reputation', peladaId, userId], enabled: hasFinished,
  queryFn: async () => {
   const [attendance, requests, stars, posture] = await Promise.all([
    supabase.from('pelada_attendance').select('user_id').eq('pelada_id',peladaId),
    supabase.from('pelada_requests').select('user_id').eq('pelada_id',peladaId).eq('status','accepted'),
    supabase.from('pelada_ratings').select('rated_id,score').eq('pelada_id',peladaId).eq('rater_id',userId).eq('presence_verified',true),
    supabase.from('pelada_posture_ratings').select('rated_id,score').eq('pelada_id',peladaId),
   ]);
   for (const result of [attendance,requests,stars,posture]) if(result.error) throw result.error;
   const ids = [...new Set([organizerId,...(requests.data??[]).map(r=>r.user_id),...(attendance.data??[]).map(r=>r.user_id)])];
   const profiles = await supabase.from('profiles').select('id,name,avatar_url').in('id',ids);
   if(profiles.error) throw profiles.error;
   return { players: profiles.data??[], present: (attendance.data??[]).map(r=>r.user_id), stars: stars.data??[], posture: posture.data??[] };
  },
 });
 const act = async (id: string, action: () => Promise<unknown>) => {
  setBusy(id);
  try { await action(); await Promise.all([qc.invalidateQueries({queryKey:['game-reputation',peladaId]}),qc.invalidateQueries({queryKey:['pending-ratings']}),qc.invalidateQueries({queryKey:['profile']}),qc.invalidateQueries({queryKey:['player-profile']})]); toast.success('Registrado!'); }
  catch(e) { toast.error(e instanceof Error?e.message:'Não foi possível salvar'); }
  finally { setBusy(null); }
 };
 if(!hasFinished) return null;
 if(isLoading) return <p className="text-sm text-muted-foreground">Carregando avaliações…</p>;
 if(error) return <p role="alert" className="text-sm text-destructive">Não foi possível carregar as avaliações.</p>;
 if(!data) return null;
 const canRate=data.present.includes(userId);
 if(!isOrganizer&&!canRate) return <p className="text-sm text-muted-foreground">Aguardando confirmação de presença pelo organizador.</p>;
 return <section id="avaliacoes" className="space-y-4 scroll-mt-6">
  <h2 className="font-bold text-foreground">{isOrganizer?'Presença e avaliações':'Avaliar jogadores'}</h2>
  {data.players.filter(p=>isOrganizer||data.present.includes(p.id)).map(player=>{
   const present=data.present.includes(player.id); const star=data.stars.find(r=>r.rated_id===player.id)?.score; const posture=data.posture.find(r=>r.rated_id===player.id)?.score;
   return <div key={player.id} className="border-b border-border py-3 space-y-3">
    <div className="flex items-center gap-3">
     <div className="size-10 shrink-0 rounded-full bg-muted overflow-hidden grid place-items-center">{player.avatar_url?<img src={player.avatar_url} alt="" className="size-full object-cover"/>:player.name.slice(0,1)}</div>
     <div className="flex-1 min-w-0"><p className="font-semibold text-sm break-words">{player.name}{player.id===userId?' (você)':''}</p><p className="text-xs text-muted-foreground">{present?'Presença confirmada':'Vaga reservada'}</p></div>
     {isOrganizer&&!present&&<Button variant="outline" size="sm" disabled={busy!==null} onClick={()=>void act(player.id,()=>attendanceFn({data:{peladaId,playerId:player.id}}))}><Check/> Presente</Button>}
    </div>
    {present&&canRate&&player.id!==userId&&<div className="flex items-center justify-between gap-2"><span className="text-xs text-muted-foreground">Nível</span><div className="flex shrink-0">{[1,2,3,4,5].map(n=><Button key={n} size="icon" variant="ghost" className="size-9" aria-label={`${n} estrelas para ${player.name}`} aria-pressed={star!=null&&n<=star} disabled={star!=null||busy!==null} onClick={()=>void act(player.id,()=>starsFn({data:{peladaId,playerId:player.id,score:n}}))}><Star className={star!=null&&n<=star?'fill-primary text-primary':'text-muted-foreground'}/></Button>)}</div></div>}
    {present&&isOrganizer&&player.id!==organizerId&&<div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary"/><span className="text-xs flex-1">Postura</span>{posture!=null?<span className="font-bold text-primary">{posture}%</span>:<><Input aria-label={`Postura de ${player.name}`} type="number" min={0} max={100} step={1} value={draft[player.id]??''} onChange={e=>setDraft(prev=>({...prev,[player.id]:e.target.value}))} className="w-20 h-9"/><span className="text-xs">%</span><Button size="icon" aria-label={`Salvar postura de ${player.name}`} disabled={busy!==null||!/^\d+$/.test(draft[player.id]??'')||Number(draft[player.id])>100} onClick={()=>void act(player.id,()=>postureFn({data:{peladaId,playerId:player.id,score:Number(draft[player.id])}}))}><Check/></Button></>}</div>}
   </div>;
  })}
 </section>;
}
