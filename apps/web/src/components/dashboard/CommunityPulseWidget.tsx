import { useEffect, useState, useRef } from 'react';
import { Users } from 'lucide-react';
import { api } from '@/lib/api';
interface Pulse { enabled: boolean; symbols: {symbol:string; buy_percent:number}[] }
export function CommunityPulseWidget() {
 const [data,setData]=useState<Pulse|null>(null);
 const [error,setError]=useState('');
 const [saving,setSaving]=useState(false);
 const revision=useRef(0);
 const savingRef=useRef(false);
 useEffect(() => {
  let active = true;
  const refresh = async () => {
   if (savingRef.current) return;
   const requestRevision = ++revision.current;
   const result = await api.get<Pulse>('/community-pulse');
   if (!active || requestRevision !== revision.current) return;
   if (result.error || !result.data || typeof result.data.enabled !== 'boolean' || !Array.isArray(result.data.symbols)) {
    setError('Community data is unavailable.');
    return;
   }
   setData(result.data);
   setError('');
  };
  void refresh();
  const timer = window.setInterval(refresh, 30_000);
  return () => { active = false; window.clearInterval(timer); };
 }, []);
 const toggle = async () => {
  if (!data || savingRef.current) return;
  revision.current++;
  savingRef.current = true;
  setSaving(true);
  const result = await api.put<{enabled:boolean}>('/community-pulse/consent', {enabled: !data.enabled});
  if (result.error || !result.data || typeof result.data.enabled !== 'boolean') {
   setError('Unable to save your sharing preference.');
  } else {
   const enabled = result.data.enabled;
   setData((current) => current ? {...current, enabled} : current);
   setError('');
  }
  savingRef.current = false;
  setSaving(false);
 };
 return <section aria-label="Community trading pulse" className="glass-premium rounded-2xl p-5">
  <div className="flex items-center gap-2.5 mb-3"><Users size={16} className="text-neon-purple"/><h3 className="text-sm font-semibold text-terminal-text">Community Trading Pulse</h3></div>
  {error && <p role="alert" className="text-sm text-neon-amber">{error}</p>}
  {!data ? <p className="text-sm text-terminal-muted">{error ? 'Try again shortly.' : 'Loading community participation…'}</p> : <>
   <p className="text-xs text-terminal-muted mb-3">Optional sharing contributes your live position directions to community totals. Account identities, balances and trade sizes are not displayed. Withdraw at any time.</p>
   <button type="button" disabled={saving} aria-pressed={data.enabled} onClick={toggle} className="min-h-11 px-3 rounded-lg border border-terminal-border text-sm text-neon-cyan">{saving ? 'Saving…' : data.enabled ? 'Stop sharing position directions' : 'Opt in to share position directions'}</button>
   {!data.symbols.length ? <p className="text-sm text-terminal-muted mt-3">Insufficient opted-in activity. Results require at least 10 participants per symbol, including 5 on each side.</p> : <ul className="mt-3 space-y-2">{data.symbols.map(s=><li key={s.symbol} className="text-sm text-terminal-text">{s.symbol}: about {s.buy_percent}% buy / {100-s.buy_percent}% sell</li>)}</ul>}
   <p className="text-xs text-terminal-muted mt-3">Fresh snapshots only; one directional vote per participant and exact broker symbol. Percentages are rounded. This describes positioning, not a trading signal.</p>
  </>}
 </section>;
}
