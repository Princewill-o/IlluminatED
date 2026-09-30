import {
  HELP_TYPES,
  SPEEDS,
  type Price,
  formatPrice,
  hoursLabel,
} from "@/lib/tutoring";

export function PriceTable({ prices }: { prices: Price[] }) {
  const find = (h: string, s: string) =>
    prices.find((p) => p.helpType === h && p.speed === s);
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">
          Tutoring prices by type of help and how quickly you need a tutor
        </caption>
        <thead>
          <tr className="border-foreground/80 border-b align-bottom">
            <th scope="col" className="py-3 pr-4 font-medium">
              Type of help
            </th>
            {SPEEDS.map((s) => {
              const any = prices.find((p) => p.speed === s.id);
              return (
                <th key={s.id} scope="col" className="px-4 py-3 font-normal">
                  <span className="block font-semibold">{s.label}</span>
                  {any && (
                    <span className="text-muted-foreground block text-xs leading-relaxed">
                      Tutor within {hoursLabel(any.matchHours)}
                      <br />
                      Replies within {hoursLabel(any.replyHours)}
                    </span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y">
          {HELP_TYPES.map((h) => (
            <tr key={h.id}>
              <th scope="row" className="py-4 pr-4 align-top font-normal">
                <span className="block font-medium">{h.label}</span>
                <span className="text-muted-foreground block max-w-xs text-xs leading-relaxed">
                  {h.description}
                </span>
              </th>
              {SPEEDS.map((s) => {
                const p = find(h.id, s.id);
                return (
                  <td
                    key={s.id}
                    className="px-4 py-4 align-top text-base font-semibold tabular-nums"
                  >
                    {p ? formatPrice(p.pricePence) : "–"}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
