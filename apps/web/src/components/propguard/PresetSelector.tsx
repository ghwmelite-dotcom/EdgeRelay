import { PROP_FIRM_PRESETS, type PropRuleSet } from '@edgerelay/shared';

interface PresetSelectorProps {
  selected: string | null;
  onSelect: (presetName: string) => void;
}

const presetDisplayNames: Record<string, { name: string; description: string }> = {
  FTMO_Evaluation: { name: 'FTMO', description: 'Evaluation Phase' },
  FTMO_Verification: { name: 'FTMO', description: 'Verification Phase' },
  FundedNext_Evaluation: { name: 'FundedNext', description: 'Evaluation Phase' },
  The5ers_HighStakes: { name: 'The5%ers', description: 'High Stakes' },
  Apex_Evaluation: { name: 'Apex', description: 'Evaluation' },
  MyFundedFutures: { name: 'MyFundedFutures', description: 'Challenge' },
  TopStep_Combine: { name: 'TopStep', description: 'Trading Combine' },
};

export function PresetSelector({ selected, onSelect }: PresetSelectorProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {Object.entries(PROP_FIRM_PRESETS).map(([key, preset]) => {
        const display = presetDisplayNames[key] ?? { name: key, description: '' };
        const isSelected = selected === key;

        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={`p-4 rounded-xl border text-left transition-all ${
              isSelected
                ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/50'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 hover:bg-zinc-800'
            }`}
          >
            <div className="font-semibold text-sm text-zinc-100">{display.name}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{display.description}</div>
            <div className="mt-2 space-y-1 text-xs text-zinc-500">
              <div>Target: {preset.profit_target_percent}%</div>
              <div>Daily Loss: {preset.max_daily_loss_percent}%</div>
              <div>Max DD: {preset.max_total_drawdown_percent}%</div>
              <div className="capitalize">{preset.drawdown_type?.replace(/_/g, ' ')}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
