"use client";
import { ErrorState } from "@/components/ui";
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorState message="Analysis result could not be loaded." retry={reset} />;
}
