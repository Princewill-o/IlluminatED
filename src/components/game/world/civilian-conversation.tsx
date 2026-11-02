"use client";
import { useState } from "react";

export function CivilianConversation({
  person,
  onClose,
  onShove,
}: {
  person: { id: string; name: string };
  onClose: () => void;
  onShove: () => void;
}) {
  const [response, setResponse] = useState<string | null>(null);
  return (
    <div className="absolute inset-0 z-[100008] grid place-items-center bg-slate-950/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Talk to ${person.name}`}
        className="w-full max-w-md rounded-3xl bg-white p-6 text-[#18202d]"
      >
        <p className="text-xs font-bold text-blue-700">
          AMBIENT RESIDENT · FICTIONAL
        </p>
        <h2 className="mt-2 text-xl font-bold">{person.name}</h2>
        <p className="mt-3 text-sm">
          “It's busy here. Please give me a little room.”
        </p>
        {response ? (
          <p role="status" className="mt-4 rounded-xl bg-blue-50 p-4 text-sm">
            {response}
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() =>
                setResponse(
                  "“Thanks.” Listening and giving space can stop a disagreement escalating.",
                )
              }
              className="min-h-11 w-full rounded-xl bg-blue-600 p-3 text-left text-white"
            >
              Give space and listen
            </button>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(
                  new CustomEvent("illuminated:agitate", {
                    detail: { npcId: person.id },
                  }),
                );
                setResponse(
                  "“Leave me alone!” They are now agitated. You can walk away. Disagreeing is not an offence; threats and physical attacks have consequences.",
                );
              }}
              className="min-h-11 w-full rounded-xl border p-3 text-left"
            >
              Argue back
            </button>
            <button
              type="button"
              onClick={onShove}
              className="min-h-11 w-full rounded-xl border border-rose-200 p-3 text-left text-rose-700"
            >
              Shove · consequences apply
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className="mt-4 min-h-11 w-full rounded-xl border p-3 font-semibold"
        >
          Walk away
        </button>
      </section>
    </div>
  );
}
