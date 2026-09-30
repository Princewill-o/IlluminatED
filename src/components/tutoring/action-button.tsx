import { changeRequest } from "@/lib/tutor-actions";
import { cn } from "@/lib/utils";

export function ActionButton({
  id,
  action,
  back,
  children,
  primary,
  danger,
}: {
  id: number;
  action: "claim" | "release" | "cancel" | "complete" | "confirm-guardian";
  back?: string;
  children: React.ReactNode;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <form action={changeRequest}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value={action} />
      {back && <input type="hidden" name="back" value={back} />}
      <button
        type="submit"
        className={cn(
          "rounded-md px-4 py-2 text-sm font-medium",
          primary
            ? "bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            : danger
              ? "border-destructive/40 text-destructive hover:bg-destructive/5 border"
              : "hover:bg-muted border",
        )}
      >
        {children}
      </button>
    </form>
  );
}
