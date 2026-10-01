import { changeRequest, startCheckout } from "@/lib/tutor-actions";
import { cn } from "@/lib/utils";

const cls = (primary?: boolean) =>
  cn(
    "rounded-md px-4 py-2 text-sm font-medium",
    primary
      ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
      : "hover:bg-muted border",
  );

/** Moderator-only: records that a refund was made in the Stripe dashboard. */
export function MarkRefundedButton({ id, back }: { id: number; back: string }) {
  return (
    <form action={changeRequest}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="mark-refunded" />
      <input type="hidden" name="back" value={back} />
      <button type="submit" className={cls()}>
        Mark refunded
      </button>
    </form>
  );
}

export function PayButton({ id, label }: { id: number; label: string }) {
  return (
    <form action={startCheckout}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className={cls(true)}>
        {label}
      </button>
    </form>
  );
}
