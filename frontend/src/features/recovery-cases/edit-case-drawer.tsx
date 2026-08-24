'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase } from '@/types/api';
import { Button } from '@/components/ui/button';
import { X, Pencil, AlertTriangle, CheckCircle } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'recovered', label: 'Recovered' },
  { value: 'unrecoverable', label: 'Unrecoverable' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed' },
];

interface EditCaseDrawerProps {
  caseData: RecoveryCase;
  onClose: () => void;
  onUpdated: (updated: RecoveryCase) => void;
}

const inputClass =
  'w-full bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-3 py-2 focus:outline-none focus:border-[#B89A62]/60 font-mono placeholder:text-[#817A70] transition-colors duration-150';

const readonlyClass =
  'w-full bg-[#0F0E0D] border border-[rgba(242,237,227,0.06)] text-[#817A70] text-xs rounded-md px-3 py-2 font-mono cursor-not-allowed';

const labelClass = 'block text-[10px] font-mono font-medium text-[#817A70] uppercase tracking-wider mb-1.5';

export function EditCaseDrawer({ caseData, onClose, onUpdated }: EditCaseDrawerProps) {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    status: caseData.status,
    risk_score: caseData.risk_score,
    recovery_probability: caseData.recovery_probability,
    recovery_reason: caseData.recovery_reason ?? '',
    recovered_amount_inr: caseData.recovered_amount ? (caseData.recovered_amount / 100).toFixed(2) : '',
    customer_name: caseData.customer_name ?? '',
    customer_email: caseData.customer_email ?? '',
  });

  useEffect(() => {
    setForm({
      status: caseData.status,
      risk_score: caseData.risk_score,
      recovery_probability: caseData.recovery_probability,
      recovery_reason: caseData.recovery_reason ?? '',
      recovered_amount_inr: caseData.recovered_amount ? (caseData.recovered_amount / 100).toFixed(2) : '',
      customer_name: caseData.customer_name ?? '',
      customer_email: caseData.customer_email ?? '',
    });
    setSuccess(false);
    setError(null);
  }, [caseData.case_id]);

  const set = (field: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const payload: Parameters<typeof apiClient.updateCase>[1] = {
        status: form.status,
        risk_score: Number(form.risk_score),
        recovery_probability: Number(form.recovery_probability),
        recovery_reason: form.recovery_reason || null,
        recovered_amount: form.recovered_amount_inr ? Math.round(Number(form.recovered_amount_inr) * 100) : null,
        resolved_at: form.status === 'recovered' || form.status === 'closed'
          ? new Date().toISOString()
          : null,
        customer_name: form.customer_name || undefined,
        customer_email: form.customer_email || undefined,
      };

      const updated = await apiClient.updateCase(caseData.case_id, payload);
      setSuccess(true);
      onUpdated(updated);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to update case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-[#151513] border-l border-[rgba(242,237,227,0.12)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-[rgba(242,237,227,0.08)] flex items-center justify-between bg-[#1C1B18] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#B89A62]/10 border border-[#B89A62]/25 flex items-center justify-center text-[#B89A62]">
              <Pencil className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F2EDE3]">Edit Case</h3>
              <p className="text-[11px] text-[#817A70] font-mono">{caseData.case_id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#817A70] hover:text-[#F2EDE3] p-1.5 rounded-md hover:bg-[#24221E] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Read-only identifiers */}
          <div>
            <p className="text-[10px] font-mono font-semibold text-[#817A70] uppercase tracking-wider mb-3 border-b border-[rgba(242,237,227,0.06)] pb-1.5">
              Immutable Identifiers
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Case ID</label>
                <div className={readonlyClass}>{caseData.case_id}</div>
              </div>
              <div>
                <label className={labelClass}>Failure Category</label>
                <div className={readonlyClass}>{caseData.failure_category}</div>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Merchant ID</label>
                <div className={readonlyClass}>{(caseData as RecoveryCase & { merchant_id?: string }).merchant_id ?? '—'}</div>
              </div>
            </div>
          </div>

          {/* Mutable fields */}
          <div>
            <p className="text-[10px] font-mono font-semibold text-[#B89A62] uppercase tracking-wider mb-3 border-b border-[rgba(242,237,227,0.06)] pb-1.5">
              Editable Fields
            </p>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Customer Name</label>
                  <input type="text" className={inputClass} placeholder="Name" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
                </div>
                <div>
                  <label className={labelClass}>Customer Email</label>
                  <input type="email" className={inputClass} placeholder="email@example.com" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
                </div>
              </div>

              <div>
                <label className={labelClass}>Recovered Amount (₹)</label>
                <input type="number" min={0} step="0.01" className={inputClass} placeholder="Leave blank if not yet recovered" value={form.recovered_amount_inr} onChange={(e) => set('recovered_amount_inr', e.target.value)} />
              </div>

              <div>
                <label className={labelClass}>
                  Risk Score <span className="text-[#D1B982] normal-case font-normal">({form.risk_score}/100)</span>
                </label>
                <input type="range" min={0} max={100} value={form.risk_score} onChange={(e) => set('risk_score', Number(e.target.value))} className="w-full accent-[#B89A62] mt-1" />
                <div className="flex justify-between text-[10px] text-[#817A70] font-mono mt-1"><span>Low</span><span>High</span></div>
              </div>

              <div>
                <label className={labelClass}>
                  Recovery Probability <span className="text-[#D1B982] normal-case font-normal">({(Number(form.recovery_probability) * 100).toFixed(0)}%)</span>
                </label>
                <input type="range" min={0} max={100} value={Math.round(Number(form.recovery_probability) * 100)} onChange={(e) => set('recovery_probability', Number(e.target.value) / 100)} className="w-full accent-[#6F9B7A] mt-1" />
              </div>

              <div>
                <label className={labelClass}>Recovery Reason / Notes</label>
                <textarea rows={3} className={`${inputClass} resize-none`} placeholder="Describe what happened or what was resolved..." value={form.recovery_reason} onChange={(e) => set('recovery_reason', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Feedback */}
          {error && (
            <div className="p-3 rounded-md bg-[#B56F68]/10 border border-[#B56F68]/25 flex items-center gap-2 text-xs text-[#B56F68] font-mono">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
          {success && (
            <div className="p-3 rounded-md bg-[#6F9B7A]/10 border border-[#6F9B7A]/25 flex items-center gap-2 text-xs text-[#6F9B7A] font-mono">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />Case updated successfully. Audit trail recorded.
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="p-4 border-t border-[rgba(242,237,227,0.08)] flex items-center justify-end gap-3 bg-[#1C1B18] shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting} className="text-xs">Cancel</Button>
          <Button variant="primary" size="sm" isLoading={submitting} disabled={submitting} className="text-xs font-semibold" onClick={handleSubmit}>
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </>
  );
}
