import { useQuery } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Link } from '@tanstack/react-router';
import { Star, ChevronRight } from 'lucide-react';
import { pendingRatings } from '@/lib/reputation.functions';
export function PendingRatings({ userId }: { userId: string }) {
 const fetchPending = useServerFn(pendingRatings);
 const { data=[] }=useQuery({queryKey:['pending-ratings',userId],queryFn:()=>fetchPending(),refetchInterval:30000,refetchOnWindowFocus:'always'});
 return <>{data.map(game=><Link key={game.pelada_id} to="/pelada/$peladaId" params={{peladaId:game.pelada_id}} hash="avaliacoes" className="flex items-center gap-3 border border-primary/30 bg-primary/10 rounded-lg p-3 text-foreground"><Star className="size-5 text-primary shrink-0"/><span className="flex-1 min-w-0"><span className="block text-sm font-bold break-words">{game.name}</span><span className="block text-xs text-muted-foreground">{game.pending_count} avaliações pendentes</span></span><ChevronRight className="size-4 shrink-0"/></Link>)}</>;
}
