import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePropGuardStore } from '@/stores/propguard';
import { PresetSelector } from '@/components/propguard/PresetSelector';

export function PropGuardSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const accountId = searchParams.get('account');

  const [step, setStep] = useState(1);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [initialBalance, setInitialBalance] = useState('');

  const { applyPreset, fetchPresets, loading } = usePropGuardStore();

  useEffect(() => {
    fetchPresets();
  }, [fetchPresets]);

  if (!accountId) {
    return (
      <div className="p-6 text-center text-zinc-400">
        No account selected. Go to Accounts and select an account to set up PropGuard.
      </div>
    );
  }

  const handleApply = async () => {
    if (!selectedPreset || !initialBalance) return;
    await applyPreset(accountId, selectedPreset, parseFloat(initialBalance));
    navigate('/accounts');
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Set Up PropGuard</h1>
        <p className="text-zinc-400 mt-1">
          Protect your prop firm challenge account with real-time rule enforcement.
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full ${s <= step ? 'bg-indigo-500' : 'bg-zinc-700'}`}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Choose Your Prop Firm</h2>
          <PresetSelector
            selected={selectedPreset}
            onSelect={(name) => {
              setSelectedPreset(name);
              setStep(2);
            }}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Enter Initial Balance</h2>
          <p className="text-sm text-zinc-400">
            This is the starting balance of your challenge account.
          </p>
          <input
            type="number"
            value={initialBalance}
            onChange={(e) => setInitialBalance(e.target.value)}
            placeholder="e.g. 200000"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-zinc-100 text-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Back
            </button>
            <button
              onClick={() => initialBalance && setStep(3)}
              disabled={!initialBalance}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-200">Confirm Setup</h2>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Preset</span>
              <span className="text-zinc-200 font-medium">{selectedPreset}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Initial Balance</span>
              <span className="text-zinc-200 font-medium">
                ${parseFloat(initialBalance).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
            >
              Back
            </button>
            <button
              onClick={handleApply}
              disabled={loading}
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Activate PropGuard'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
