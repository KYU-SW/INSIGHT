import Link from "next/link";
import { buttonClass, EmptyState, panelClass } from "@/components/ui";
export default function NotFound() {
  return <div className={panelClass}><EmptyState title="Page not found" description="This research prototype has no record at this address." action={<Link href="/analysis" className={buttonClass}>Voice Analysis</Link>} /></div>;
}
