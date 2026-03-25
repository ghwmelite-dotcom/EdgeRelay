import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { useJournalStore } from '@/stores/journal';

interface TradeFiltersProps {
  onFilterChange: () => void;
}

const directionOptions = [
  { value: '', label: 'All' },
  { value: 'Buy', label: 'Buy' },
  { value: 'Sell', label: 'Sell' },
];

const sessionOptions = [
  { value: '', label: 'All' },
  { value: 'Asian', label: 'Asian' },
  { value: 'London', label: 'London' },
  { value: 'New York', label: 'New York' },
  { value: 'Off Hours', label: 'Off Hours' },
];

const dateInputClass = [
  'w-full rounded-xl border bg-terminal-card/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-slate-200',
  'border-terminal-border',
  'focus:border-neon-cyan focus:shadow-[0_0_15px_#00e5ff20,0_0_30px_#00e5ff08] focus:outline-none',
  'transition-all duration-300 ease-out',
].join(' ');

export function TradeFilters({ onFilterChange }: TradeFiltersProps) {
  const { filters, setFilters } = useJournalStore();

  const handleSymbol = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ symbol: e.target.value || undefined });
    onFilterChange();
  };

  const handleDirection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ direction: e.target.value || undefined });
    onFilterChange();
  };

  const handleSession = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilters({ session_tag: e.target.value || undefined });
    onFilterChange();
  };

  const handleFrom = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = e.target.value ? new Date(e.target.value).getTime() / 1000 : undefined;
    setFilters({ from: ts });
    onFilterChange();
  };

  const handleTo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const ts = e.target.value ? new Date(e.target.value).getTime() / 1000 : undefined;
    setFilters({ to: ts });
    onFilterChange();
  };

  // Convert epoch seconds back to YYYY-MM-DD for input value
  const epochToDate = (epoch?: number) => {
    if (!epoch) return '';
    return new Date(epoch * 1000).toISOString().slice(0, 10);
  };

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="w-36">
        <Input
          placeholder="Symbol..."
          value={filters.symbol ?? ''}
          onChange={handleSymbol}
          label="Symbol"
        />
      </div>

      <div className="w-32">
        <Select
          label="Direction"
          options={directionOptions}
          value={filters.direction ?? ''}
          onChange={handleDirection}
        />
      </div>

      <div className="w-36">
        <Select
          label="Session"
          options={sessionOptions}
          value={filters.session_tag ?? ''}
          onChange={handleSession}
        />
      </div>

      <div className="space-y-2 w-36">
        <label className="block text-[11px] font-medium text-terminal-muted uppercase tracking-[0.1em]">
          From
        </label>
        <input
          type="date"
          className={dateInputClass}
          value={epochToDate(filters.from)}
          onChange={handleFrom}
        />
      </div>

      <div className="space-y-2 w-36">
        <label className="block text-[11px] font-medium text-terminal-muted uppercase tracking-[0.1em]">
          To
        </label>
        <input
          type="date"
          className={dateInputClass}
          value={epochToDate(filters.to)}
          onChange={handleTo}
        />
      </div>
    </div>
  );
}
