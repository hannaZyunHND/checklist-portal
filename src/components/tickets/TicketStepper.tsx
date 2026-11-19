import { Check } from 'lucide-react';
import type { Ticket } from '../../types/ticket';

interface StepDef {
  key: string;
  label: string;
}

function getSteps(ticket: Ticket): { steps: StepDef[]; activeIndex: number } {
  if (ticket.groupType === 'EDIT_OLD') {
    const steps: StepDef[] = [
      { key: 'WAITING_OM', label: 'OM Thực hiện' },
      { key: 'WAITING_GOLIVE', label: 'OM GoLive' },
      { key: 'CLOSED', label: 'Đóng Task' },
    ];
    const activeIndex = steps.findIndex((s) => s.key === ticket.status);
    return { steps, activeIndex: activeIndex === -1 ? 0 : activeIndex };
  }

  if (ticket.groupType === 'NEW_LISTING') {
    const steps: StepDef[] = [
      { key: 'WAITING_LISTING', label: 'OM Listing' },
      { key: 'PENDING_GOLIVE_APPROVAL', label: 'PD Check' },
      { key: 'WAITING_GOLIVE', label: 'OM GoLive' },
      { key: 'CLOSED', label: 'Đóng Task' },
    ];
    const activeIndex = steps.findIndex((s) => s.key === ticket.status);
    return { steps, activeIndex: activeIndex === -1 ? 2 : activeIndex };
  }

  // OFFICE
  const steps: StepDef[] = [
    { key: 'WAITING_OM', label: 'Thực hiện' },
    { key: 'PENDING_PD_CHECK', label: 'Kiểm tra' },
    { key: 'CLOSED', label: 'Đóng Task' },
  ];
  const activeIndex = steps.findIndex((s) => s.key === ticket.status);
  return { steps, activeIndex: activeIndex === -1 ? 0 : activeIndex };
}

export function TicketStepper({ ticket }: { ticket: Ticket }) {
  const { steps, activeIndex } = getSteps(ticket);
  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-2">
        {steps.map((step, idx) => {
          const done = isClosed || idx < activeIndex;
          const current = !isClosed && idx === activeIndex;
          return (
            <li key={step.key} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  done
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                    : current
                    ? 'border-teal-500 bg-teal-50 text-teal-900 ring-1 ring-teal-500'
                    : 'border-slate-200 bg-slate-50 text-slate-500'
                }`}
              >
                <span
                  className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                    done
                      ? 'bg-emerald-600 text-white'
                      : current
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {done ? <Check className="h-3 w-3" aria-hidden="true" /> : idx + 1}
                </span>
                <span className="whitespace-nowrap">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className="h-px w-4 bg-slate-300" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
