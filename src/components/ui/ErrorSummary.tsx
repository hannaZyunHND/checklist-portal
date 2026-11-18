import { useEffect, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorSummaryProps {
  errors: Record<string, string>;
  triggerCount: number;
}

export function ErrorSummary({ errors, triggerCount }: ErrorSummaryProps) {
  const ref = useRef<HTMLDivElement>(null);
  const entries = Object.entries(errors).filter(([, msg]) => Boolean(msg));

  useEffect(() => {
    if (triggerCount > 0 && entries.length > 0) {
      ref.current?.focus();
    }
  }, [triggerCount, entries.length]);

  if (entries.length === 0) return null;

  return (
    <div
      ref={ref}
      role="alert"
      tabIndex={-1}
      aria-labelledby="form-error-summary-title"
      className="rounded-xl border border-red-300 bg-red-50 p-3.5 text-sm text-red-900"
    >
      <div className="flex items-center gap-2 font-semibold" id="form-error-summary-title">
        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" aria-hidden="true" />
        <span>Vui lòng kiểm tra lại các thông tin sau:</span>
      </div>
      <ul className="mt-1.5 list-disc space-y-1 pl-6 text-xs text-red-800">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a
              href={`#field-${field}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(`field-${field}`);
                el?.focus();
              }}
              className="underline hover:text-red-950"
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
