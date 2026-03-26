import { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useCommandCenterStore } from '@/stores/commandCenter';

interface FirmLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountId: string;
  accountAlias: string;
  onLinked: () => void;
}

export function FirmLinkModal({
  isOpen,
  onClose,
  accountId,
  accountAlias,
  onLinked,
}: FirmLinkModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [isLinking, setIsLinking] = useState(false);

  const { firms, firmTemplates, selectedFirm, isLoading, fetchFirms, fetchFirmTemplates, linkAccount } =
    useCommandCenterStore();

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setSelectedTemplate(null);
      setIsLinking(false);
      fetchFirms();
    }
  }, [isOpen, fetchFirms]);

  const handleFirmClick = async (firmName: string) => {
    await fetchFirmTemplates(firmName);
    setStep(2);
  };

  const handleTemplateClick = (template: any) => {
    setSelectedTemplate(template);
    setStep(3);
  };

  const handleConfirm = async () => {
    if (!selectedTemplate) return;
    setIsLinking(true);
    const success = await linkAccount(accountId, selectedTemplate.id);
    setIsLinking(false);
    if (success) {
      onLinked();
      onClose();
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setSelectedTemplate(null);
      setStep(2);
    } else if (step === 2) {
      setStep(1);
    }
  };

  return (
    <Modal open={isOpen} onClose={onClose} title={`Link Account — ${accountAlias}`}>
      {/* Back button */}
      {step > 1 && (
        <button
          onClick={handleBack}
          className="flex items-center gap-1.5 text-sm text-terminal-muted hover:text-neon-cyan transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      )}

      {/* Step 1: Select Firm */}
      {step === 1 && (
        <div className="space-y-3">
          <p className="text-sm text-terminal-muted mb-3">Select a firm</p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-xl skeleton" />
              ))}
            </div>
          ) : (
            firms.map((firm) => (
              <button
                key={firm.firm_name}
                onClick={() => handleFirmClick(firm.firm_name)}
                className="w-full text-left glass rounded-xl p-4 border border-terminal-border hover:border-neon-cyan/30 hover:shadow-[0_0_16px_#00e5ff08] transition-all duration-300"
              >
                <span className="text-sm font-medium text-slate-100">
                  {firm.firm_name}
                </span>
                <span className="ml-2 text-xs text-terminal-muted">
                  {firm.plan_count} {firm.plan_count === 1 ? 'plan' : 'plans'}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Step 2: Select Plan */}
      {step === 2 && (
        <div className="space-y-3">
          <p className="text-sm text-terminal-muted mb-3">
            Select a plan from <span className="text-neon-cyan">{selectedFirm}</span>
          </p>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl skeleton" />
              ))}
            </div>
          ) : (
            firmTemplates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => handleTemplateClick(tmpl)}
                className="w-full text-left glass rounded-xl p-4 border border-terminal-border hover:border-neon-cyan/30 hover:shadow-[0_0_16px_#00e5ff08] transition-all duration-300"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-slate-100">
                    {tmpl.plan_name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                    {tmpl.challenge_phase}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-terminal-muted">
                  {tmpl.daily_loss_percent != null && (
                    <span>Daily Loss: {tmpl.daily_loss_percent}%</span>
                  )}
                  <span>Max DD: {tmpl.max_drawdown_percent}%</span>
                  {tmpl.profit_target_percent != null && (
                    <span>Profit Target: {tmpl.profit_target_percent}%</span>
                  )}
                  <span className="capitalize">DD Type: {tmpl.drawdown_type}</span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 3 && selectedTemplate && (
        <div className="space-y-4">
          <p className="text-sm text-terminal-muted">Confirm linking details</p>

          <div className="glass rounded-xl p-4 border border-terminal-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-terminal-muted">Firm</span>
              <span className="text-slate-100">{selectedFirm}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-terminal-muted">Plan</span>
              <span className="text-slate-100">{selectedTemplate.plan_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-terminal-muted">Phase</span>
              <span className="text-slate-100">{selectedTemplate.challenge_phase}</span>
            </div>
            <div className="divider my-2" />
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-terminal-muted">
              {selectedTemplate.daily_loss_percent != null && (
                <span>Daily Loss: {selectedTemplate.daily_loss_percent}%</span>
              )}
              <span>Max DD: {selectedTemplate.max_drawdown_percent}%</span>
              {selectedTemplate.profit_target_percent != null && (
                <span>Profit Target: {selectedTemplate.profit_target_percent}%</span>
              )}
              <span className="capitalize">DD Type: {selectedTemplate.drawdown_type}</span>
            </div>
          </div>

          <Button
            onClick={handleConfirm}
            isLoading={isLinking}
            disabled={isLinking}
            className="w-full"
          >
            Link Account
          </Button>
        </div>
      )}
    </Modal>
  );
}
