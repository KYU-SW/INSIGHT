import type { ReactNode } from "react";
import { AlertCircle, Info, LoaderCircle } from "lucide-react";

export const panelClass = "min-w-0 rounded bg-surface-container-lowest shadow-sm";
export const buttonClass = "inline-flex min-h-7 items-center justify-center gap-1 rounded bg-surface-container-low px-2 py-1 text-body-sm font-medium text-on-surface transition-colors hover:bg-surface-container";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div role="status" className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center"><Info size={22} className="text-secondary" aria-hidden="true" /><p className="font-semibold">{title}</p>{description && <p className="text-body-sm text-on-surface-variant">{description}</p>}{action}</div>;
}

export function LoadingState({ label = "Loading research workspace..." }: { label?: string }) {
  return <div className={`${panelClass} p-4`} role="status" aria-live="polite"><p className="flex items-center gap-2"><LoaderCircle size={16} className="animate-spin text-secondary" aria-hidden="true" />{label}</p></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className={`${panelClass} flex items-center gap-3 p-4`}><AlertCircle className="text-error" size={20} aria-hidden="true" /><p>{message}</p>{retry && <button className={buttonClass} onClick={retry}>Try again</button>}</div>;
}
