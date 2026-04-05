import { useState } from 'react';
import { Calculator } from 'lucide-react';

export function PositionSizeCalculator() {
  const [balance, setBalance] = useState('10000');
  const [riskPct, setRiskPct] = useState('1');
  const [slPips, setSlPips] = useState('25');
  const [pipValue, setPipValue] = useState('10'); // $10 per pip for standard lot EURUSD

  const balanceNum = parseFloat(balance) || 0;
  const riskNum = parseFloat(riskPct) || 0;
  const slNum = parseFloat(slPips) || 1;
  const pvNum = parseFloat(pipValue) || 10;

  const riskAmount = balanceNum * (riskNum / 100);
  const lotSize = riskAmount / (slNum * pvNum);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Calculator size={16} className="text-neon-cyan" />
        <h4 className="text-sm font-semibold text-white">Position Size Calculator</h4>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Account Balance ($)</label>
          <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)}
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Risk Per Trade (%)</label>
          <input type="number" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} step="0.5"
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Stop Loss (pips)</label>
          <input type="number" value={slPips} onChange={(e) => setSlPips(e.target.value)}
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
        <div>
          <label className="block text-[11px] text-terminal-muted mb-1">Pip Value ($)</label>
          <input type="number" value={pipValue} onChange={(e) => setPipValue(e.target.value)}
            className="w-full rounded-lg border border-terminal-border bg-terminal-bg px-3 py-2 font-mono-nums text-sm text-white focus:border-neon-cyan/40 focus:outline-none" />
        </div>
      </div>

      {/* Result */}
      <div className="rounded-xl border border-neon-cyan/20 bg-neon-cyan/[0.04] p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="font-mono-nums text-xl font-bold text-neon-cyan">{lotSize.toFixed(2)}</p>
            <p className="text-[10px] text-terminal-muted">Lot Size</p>
          </div>
          <div>
            <p className="font-mono-nums text-xl font-bold text-neon-green">${riskAmount.toFixed(2)}</p>
            <p className="text-[10px] text-terminal-muted">Risk Amount</p>
          </div>
          <div>
            <p className="font-mono-nums text-xl font-bold text-neon-amber">{riskNum}%</p>
            <p className="text-[10px] text-terminal-muted">of Account</p>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-terminal-muted">
        Formula: Lot Size = (Balance × Risk%) ÷ (Stop Loss Pips × Pip Value)
      </p>
    </div>
  );
}
