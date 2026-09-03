import Link from 'next/link';
import { ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';

export default function ForgotPasswordPage() {
  return (
    <div className="p-8 rounded-xl bg-[#1C1B18] border border-[rgba(242,237,227,0.10)] shadow-2xl space-y-6">
      <div className="w-10 h-10 rounded-lg bg-[#B68B4F]/10 border border-[#B68B4F]/30 flex items-center justify-center text-[#B68B4F] mx-auto">
        <KeyRound className="w-5 h-5" />
      </div>

      <div className="space-y-1 text-center">
        <h1 className="text-xl font-semibold text-[#F2EDE3] tracking-tight">Password Reset</h1>
        <p className="text-xs text-[#B7B0A3]">
          Self-service email reset is disabled in this environment
        </p>
      </div>

      <div className="p-4 rounded-lg bg-[#181714] border border-[rgba(242,237,227,0.06)] text-xs text-[#B7B0A3] space-y-2.5">
        <div className="flex items-center gap-2 text-[#B68B4F] font-semibold">
          <ShieldAlert className="w-4 h-4" />
          <span>Security Protocol Notice</span>
        </div>
        <p>
          RecoverIQ operates on financial recovery telemetry and enforced policy controls. To prevent account takeover and unauthorized recovery intervention:
        </p>
        <ul className="list-disc list-inside space-y-1 text-[#817A70] pl-1">
          <li>Automated email reset tokens are restricted.</li>
          <li>Password changes must be authorized by your system administrator.</li>
          <li>For demo accounts, use the credentials on the sign-in screen.</li>
        </ul>
      </div>

      <div className="pt-2">
        <Link
          href="/login"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#24221E] border border-[rgba(242,237,227,0.10)] text-[#F2EDE3] text-sm font-medium hover:bg-[#2A2823] transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sign In</span>
        </Link>
      </div>
    </div>
  );
}
