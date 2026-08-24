'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { RecoveryCase } from '@/types/api';
import { Button } from '@/components/ui/button';
import { X, ShieldAlert, AlertTriangle } from 'lucide-react';

const FAILURE_CATEGORIES = [
  { value: 'insufficient_funds', label: 'Insufficient Funds' },
  { value: 'bank_decline', label: 'Bank Decline' },
  { value: 'network_error', label: 'Network Failure' },
  { value: 'card_expired', label: 'Card Expired' },
  { value: 'subscription_halt', label: 'Subscription Halted' },
  { value: 'authentication_failure', label: 'Customer Abandoned / Auth Failure' },
  { value: 'payment_failure', label: 'Generic Payment Failure' },
];

interface AddCaseModalProps {
  onClose: () => void;
  onCreated: (newCase: RecoveryCase) => void;
}

const inputClass =
  'w-full bg-[#181714] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-xs rounded-md px-3 py-2 focus:outline-none focus:border-[#B89A62]/60 font-mono placeholder:text-[#817A70] transition-colors duration-150';

const labelClass = 'block text-[10px] font-mono font-medium text-[#817A70] uppercase tracking-wider mb-1.5';

export function AddCaseModal({ onClose, onCreated }: AddCaseModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    customer_name: '',
    customer_email: '',
    customer_id: '',
    payment_id: '',
    subscription_id: '',
    amount_at_risk_inr: '',
    failure_category: '',
    risk_score: 50,
    recovery_probability: 0.70,
    recovery_reason: '',
  });

  const set = (field: keyof typeof form, value: string | number) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amountPaise = Math.round(Number(form.amount_at_risk_inr) * 100);
    if (!form.failure_category) { setError('Failure category is required.'); return; }
    if (!amountPaise || amountPaise <= 0) { setError('Amount at risk must be greater than zero.'); return; }

    setSubmitting(true);
    try {
      const created = await apiClient.createCase({
        customer_name: form.customer_name || undefined,
        customer_email: form.customer_email || undefined,
        customer_id: form.customer_id || undefined,
        payment_id: form.payment_id || undefined,
        subscription_id: form.subscription_id || undefined,
        amount_at_risk: amountPaise,
        failure_category: form.failure_category,
        risk_score: form.risk_score,
        recovery_probability: form.recovery_probability,
        recovery_reason: form.recovery_reason || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError((err as Error).message || 'Failed to create case');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl rounded-lg bg-[#151513] border border-[rgba(242,237,227,0.12)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 sm:p-5 border-b border-[rgba(242,237,227,0.08)] flex items-center justify-between bg-[#1C1B18] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#B56F68]/10 border border-[#B56F68]/25 flex items-center justify-center text-[#B56F68]">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[#F2EDE3]">Add New Recovery Case</h3>
              <p className="text-[11px] text-[#817A70] font-mono">Manually register a payment failure for tracking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#817A70] hover:text-[#F2EDE3] p-1.5 rounded-md hover:bg-[#24221E] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <p className="text-[10px] font-mono font-semibold text-[#B89A62] uppercase tracking-wider mb-3 border-b border-[rgba(242,237,227,0.06)] pb-1.5">Customer Information</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Customer Name</label>
                <input type="text" className={inputClass} placeholder="e.g. Rohit Sharma" value={form.customer_name} onChange={(e) => set('customer_name', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Customer Email</label>
                <input type="email" className={inputClass} placeholder="e.g. rohit@example.com" value={form.customer_email} onChange={(e) => set('customer_email', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Customer ID</label>
                <input type="text" className={inputClass} placeholder="e.g. cust_9xAbCd" value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Payment ID</label>
                <input type="text" className={inputClass} placeholder="e.g. pay_9xAbCd" value={form.payment_id} onChange={(e) => set('payment_id', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono font-semibold text-[#B89A62] uppercase tracking-wider mb-3 border-b border-[rgba(242,237,227,0.06)] pb-1.5">Failure Details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className={labelClass}>Failure Category <span className="text-[#B56F68]">*</span></label>
                <select required className={inputClass} value={form.failure_category} onChange={(e) => set('failure_category', e.target.value)}>
                  <option value="">Select a category</option>
                  {FAILURE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Amount At Risk (₹) <span className="text-[#B56F68]">*</span></label>
                <input type="number" required min={1} step="0.01" className={inputClass} placeholder="e.g. 5000.00" value={form.amount_at_risk_inr} onChange={(e) => set('amount_at_risk_inr', e.target.value)} />
                <p className="text-[10px] text-[#817A70] font-mono mt-1">Enter rupees — stored as paise internally</p>
              </div>
              <div>
                <label className={labelClass}>Subscription ID</label>
                <input type="text" className={inputClass} placeholder="e.g. sub_9xAbCd (optional)" value={form.subscription_id} onChange={(e) => set('subscription_id', e.target.value)} />
              </div>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-mono font-semibold text-[#B89A62] uppercase tracking-wider mb-3 border-b border-[rgba(242,237,227,0.06)] pb-1.5">Risk Scoring</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Risk Score <span className="text-[#D1B982] normal-case font-normal">({form.risk_score}/100)</span></label>
                <input type="range" min={0} max={100} value={form.risk_score} onChange={(e) => set('risk_score', Number(e.target.value))} className="w-full accent-[#B89A62] mt-1" />
                <div className="flex justify-between text-[10px] text-[#817A70] font-mono mt-1"><span>Low</span><span>High</span></div>
              </div>
              <div>
                <label className={labelClass}>Recovery Probability <span className="text-[#D1B982] normal-case font-normal">({(form.recovery_probability * 100).toFixed(0)}%)</span></label>
                <input type="range" min={0} max={100} value={Math.round(form.recovery_probability * 100)} onChange={(e) => set('recovery_probability', Number(e.target.value) / 100)} className="w-full accent-[#6F9B7A] mt-1" />
                <div className="flex justify-between text-[10px] text-[#817A70] font-mono mt-1"><span>0%</span><span>100%</span></div>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Notes / Context (optional)</label>
            <textarea rows={2} className={`${inputClass} resize-none`} placeholder="Any context about this failure..." value={form.recovery_reason} onChange={(e) => set('recovery_reason', e.target.value)} />
          </div>

          {error && (
            <div className="p-3 rounded-md bg-[#B56F68]/10 border border-[#B56F68]/25 flex items-center gap-2 text-xs text-[#B56F68] font-mono">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />{error}
            </div>
          )}
        </form>

        <div className="p-4 border-t border-[rgba(242,237,227,0.08)] flex items-center justify-end gap-3 bg-[#1C1B18] shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting} className="text-xs">Cancel</Button>
          <Button variant="primary" size="sm" isLoading={submitting} disabled={submitting} className="text-xs font-semibold" onClick={handleSubmit}>
            {submitting ? 'Creating...' : 'Create Case'}
          </Button>
        </div>
      </div>
    </div>
  );
}
