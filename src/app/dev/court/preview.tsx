"use client";

import { useState } from "react";

import { CourtTrial } from "@/components/game/world/court-trial";
import { PoliceTransportCutscene } from "@/components/game/world/police-transport-cutscene";

export function CourtPreview() {
  const [view] = useState(() => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view")) || "court");
  return (
    <main className="min-h-screen bg-[#6d5a48]">
      {view === "van" ? <PoliceTransportCutscene destination="court" onArrive={() => {}} /> : <CourtTrial charge="Shoplifting from a corner shop" stars={2} cards={0} solicitor={false} onVerdict={() => {}} />}
    </main>
  );
}
