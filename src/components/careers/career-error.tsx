import Link from "next/link";

/** Plus+ Experience is the only plan that unlocks verified career sessions. */
export const needsExperiencePlan = (message: string) => message.startsWith("Plus+ Experience is required");

/** A career error message, with a way to upgrade when the plan is the problem. */
export function CareerError({ message, className }: { message: string; className?: string }) {
  return (
    <span className={className}>
      {message}
      {needsExperiencePlan(message) && (
        <Link href="/pricing#plans" className="jelly jelly-purple mt-3 flex min-h-11 w-fit items-center rounded-full bg-[#5b56c8] px-5 text-sm font-black text-white">
          See plans
        </Link>
      )}
    </span>
  );
}
