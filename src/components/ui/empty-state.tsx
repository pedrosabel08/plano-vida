import type { ReactNode } from "react";
import { Sprout } from "lucide-react";
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <span className="empty-icon">
        <Sprout size={32} strokeWidth={1.5} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </section>
  );
}
