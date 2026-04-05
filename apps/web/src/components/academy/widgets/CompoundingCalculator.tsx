import { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';

export function CompoundingCalculator() {
  const [startBalance, setStartBalance] = useState('10000');
  const [monthlyReturn, setMonthlyReturn] = useState('5');
  const [months, setMonths] = useState('12');

  const data = useMemo(() => {
    const start = parseFloat(startBalance) || 10000;
    const rate = (parseFloat(monthlyReturn) || 5) / 100;
    const m = parseInt(months) || 12;

    const points: Array<{ month: number; balance: number }> = [{ month: 0, balance: start }];
    let balance = start;
    for (let i = 1; i <= m; i++) {
      balance *= (1 + rate);
      points.push({ month: i, balance });
    }
    return points;
  }, [startBalance, monthlyReturn, months]);

  const finalBalance = data[data.length - 1]?.balance || 0;
  const totalReturn = finalBalance - (parseFloat(startBalance) || 0);
  const maxBalance = Math.max(...data.map(d => d.balance));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp size={16} className="text-neon-green" />
        <h4 className="text-sm font-semibold text-white">Compound Growth Calculator</h4>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Starting Balance ($)</label>
          <input type="number" value={startBalance} onChange={(e) => setStartBalance(e.target.value)}
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Monthly Return (%)</label>
          <input type="number" value={monthlyReturn} onChange={(e) => setMonthlyReturn(e.target.value)} step="0.5"
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Months</label>
          <input type="number" value={months} onChange={(e) => setMonths(e.target.value)} min="1" max="60"
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-4">
        <div className="flex items-end gap-px h-28">
          {data.map((d, i) => {
            const h = maxBalance > 0 ? (d.balance / maxBalance) * 100 : 0;
            return (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" title={`Month ${d.month}: $${d.balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}`}>
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(h, 2)}%`,
                    background: `linear-gradient(to top, #00ff9d20, #00ff9d50)`,
                    borderTop: i === data.length - 1 ? '2px solid #00ff9d' : undefined,
                  }}
                />
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2 font-mono-nums text-[9px] text-terminal-muted">
          <span>Month 0</span>
          <span>Month {months}</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-terminal-border/20 bg-terminal-bg/50 p-3 text-center">
          <p className="font-mono-nums text-lg font-bold text-white">${(parseFloat(startBalance) || 0).toLocaleString()}</p>
          <p className="text-[9px] text-terminal-muted">Start</p>
        </div>
        <div className="rounded-xl border border-neon-green/20 bg-neon-green/[0.04] p-3 text-center">
          <p className="font-mono-nums text-lg font-bold text-neon-green">${finalBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-terminal-muted">Final Balance</p>
        </div>
        <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-3 text-center">
          <p className="font-mono-nums text-lg font-bold text-neon-cyan">+${totalReturn.toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
          <p className="text-[9px] text-terminal-muted">Total Profit</p>
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted">
        Compound growth is exponential — even small consistent returns grow dramatically over time. This is why discipline and consistency matter more than finding "the big trade."
      </p>
    </div>
  );
}
