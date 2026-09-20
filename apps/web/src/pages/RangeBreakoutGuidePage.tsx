import { Link } from 'react-router-dom';
import { RangeBreakoutGuide } from '@/components/academy/RangeBreakoutGuide';
export function RangeBreakoutGuidePage() {
 return <div className="max-w-4xl mx-auto space-y-6 pb-12"><Link to="/academy?course=gold-range-utc" className="inline-block py-3 text-neon-cyan">Back to course</Link><header><p className="text-neon-amber text-sm">The Worlds Simpliest Strategy</p><h1 className="mt-2 text-3xl font-bold text-white">TMPro Range Breakout</h1><p className="mt-3 text-slate-300">Four candles. One box. Wait for the close.</p></header><RangeBreakoutGuide/><Link to="/academy/gr-v1-01" className="inline-flex min-h-11 items-center rounded-lg bg-neon-amber px-5 font-semibold text-terminal-bg">Start the six-lesson course</Link></div>;
}
