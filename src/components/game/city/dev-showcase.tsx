"use client";
import { useEffect, useState } from "react";

import Link from "next/link";

import {
  CityHeading,
  WealthPanel,
  WeeklyPanel,
  ExpansionPanel,
  IllumshipPanel,
} from "./city-panels";
import { FriendsPanel } from "./friends-panel";

import { Character3DPreview } from "@/components/game/character-3d-preview";
import { AffiliationBadge } from "@/components/game/world/affiliation-badge";
import { TUTORIAL_KEY } from "@/components/game/world/scene";
import { VoiceChat, localSignaller } from "@/components/game/world/voice-chat";
import { RacingHub } from "@/components/game/racing/racing-hub";
import { WhatIf } from "@/components/game/what-if/what-if";
import { WorldApp } from "@/components/game/world/world-app";
import { ConversationPreview } from "@/components/landing/conversation-preview";
import { affiliationFor } from "@/game/core/affiliation";
import { uniformFor, workplaceById } from "@/game/core/careers";
import { DEFAULT_AVATAR } from "@/game/core/cosmetics";
import { STARTER_LAYOUT } from "@/game/core/homes";
import type { CitySnapshot } from "@/lib/game/city-server";
const state: CitySnapshot = {
  ready: false,
  vip: true,
  clout: 1800,
  holdings: [
    { asset_id: "index-fund", units: 5, cost: 500 },
    { asset_id: "neon-pioneers", units: 1, cost: 400 },
    { asset_id: "moon-fox", units: 1, cost: 250 },
  ],
  quotes: { "index-fund": 108 },
  ledger: [],
};
export function DevShowcase({
  view,
  map,
  workplace,
  as,
  at,
}: {
  view: string;
  map: string;
  workplace?: string;
  /** Start position in tiles, for screenshots. */
  at?: { x: number; y: number };
  /** Voice test: which of the two test friends this tab is. */
  as?: string;
}) {
  const company = workplace ? workplaceById(workplace) : null;
  const job = company
    ? {
        workplace: company.id,
        role: company.roles[0].id,
        rank: 1,
        shifts: 2,
        rankShifts: 2,
        rankCorrect: 8,
        rankTotal: 10,
      }
    : null;
  const affiliation = affiliationFor(job, "Biology");
  const [mounted, setMounted] = useState(false);
  const [recording, setRecording] = useState(false);
  const [video, setVideo] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [clean, setClean] = useState(false);
  useEffect(() => {
    localStorage.setItem(TUTORIAL_KEY, "seen");
    setMounted(true);
  }, []);
  useEffect(
    () => () => {
      if (video) URL.revokeObjectURL(video);
    },
    [video],
  );
  function record() {
    const canvases = Array.from(document.querySelectorAll("canvas")).filter(
      (c) => c.getBoundingClientRect().height > 200,
    );
    const canvas =
      canvases.find((c) => c.hasAttribute("data-engine")) ?? canvases.at(-1);
    if (
      !canvas ||
      !canvas.captureStream ||
      typeof MediaRecorder === "undefined"
    )
      return setStatus("This browser cannot record the game canvas.");
    try {
      const mime = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const stream = canvas.captureStream(30);
      const recorder = new MediaRecorder(
        stream,
        mime ? { mimeType: mime } : undefined,
      );
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      recorder.onstop = () => {
        setVideo(URL.createObjectURL(new Blob(chunks, { type: "video/webm" })));
        setRecording(false);
        setStatus(
          "Gameplay clip ready. This capture contains the rendered game canvas, without audio.",
        );
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      setRecording(true);
      setStatus("Recording 12 seconds. Walk around to show the game.");
      setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, 12000);
    } catch {
      setStatus("Recording failed in this browser.");
    }
  }
  if (view === "voice") return <VoiceTest as={as === "b" ? "b" : "a"} />;
  if (view === "racing") return <div className="arcade mx-auto max-w-6xl p-4"><RacingHub /></div>;
  if (view === "what-if") return <div className="arcade mx-auto max-w-6xl p-4"><WhatIf userId="preview" /></div>;
  if (view === "world")
    return (
      <div className="fixed inset-0 z-[100005] bg-[#f7f1e6]">
        {mounted && (
          <WorldApp
            me={{
              id: "88888888-8888-4888-8888-000000000099",
              username: "Preview player",
              avatar: uniformFor(job, DEFAULT_AVATAR),
              org: null,
              badge: affiliation?.kind === "work" ? affiliation.logo : null,
              affiliation,
              pass: null,
              publicKey: null,
            }}
            offices={[]}
            staff={{}}
            initialMap={map}
            initialServer={new URLSearchParams(window.location.search).has("menu") ? null : "lse-1"}
            initialArrival={at ? { x: at.x * 32 + 16, y: at.y * 32 + 16 } : undefined}
            job={job}
            home={{
              claimed: true,
              current: "studio",
              owned: ["studio"],
              layout: STARTER_LAYOUT,
              furniture: {},
              style: 0,
            }}
            clout={1800}
            xp={1200}
            quests={[]}
            cars={["sedan"]}
          />
        )}
        <div className="absolute bottom-3 left-1/2 z-[100020] flex max-w-[90vw] -translate-x-1/2 flex-wrap items-center gap-3 rounded-xl bg-[#13203a]/95 px-4 py-2 text-xs text-white">
          <span>Actual game · offline preview · ambient residents</span>
          {!clean && (
            <button
              className="min-h-9 rounded-lg border px-3"
              onClick={() => setClean(true)}
            >
              Hide capture controls
            </button>
          )}
          <div className={clean ? "hidden" : "contents"}>
            <button
              onClick={record}
              disabled={recording}
              className="min-h-9 rounded-lg bg-white px-3 font-bold text-[#13203a]"
            >
              {recording ? "Recording…" : "Record gameplay"}
            </button>
            {video && (
              <a
                href={video}
                download="illuminated-gameplay.webm"
                className="font-bold underline"
              >
                Download gameplay clip
              </a>
            )}
            {status && <span role="status">{status}</span>}
          </div>
        </div>
      </div>
    );
  if (view === "uniform")
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <CityHeading
          eyebrow="Uniform fitting · local preview"
          title={company?.name ?? "Student identity"}
        >
          Actual 3D character with the same uniform and torso logo used in the
          city.
        </CityHeading>
        <div className="mx-auto max-w-lg rounded-3xl bg-[#e6edf4] p-6 text-center text-[#13203a]">
          <AffiliationBadge value={affiliation} />
          <p className="font-black">@Preview player</p>
          <Character3DPreview
            avatar={uniformFor(job, DEFAULT_AVATAR)}
            workplaceLogo={affiliation?.logo}
            clip="idle"
            facing="S"
            className="h-[500px] w-full"
          />
        </div>
      </main>
    );
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="bg-secondary mb-5 rounded-xl border p-3 text-sm">
        Local preview · illustrative data · no account or real purchases
      </p>
      <nav className="mb-6 flex flex-wrap gap-3 text-sm font-bold">
        {[
          "world",
          "wealth",
          "weekly",
          "expansions",
          "illumship",
          "friends",
          "communication",
        ].map((v) => (
          <Link
            key={v}
            href={`/games/city-showcase?view=${v}`}
            className="underline"
          >
            {v}
          </Link>
        ))}
      </nav>
      {view === "wealth" ? (
        <>
          <CityHeading
            eyebrow="Your city portfolio"
            title="Build a life. Learn about money."
          >
            Your fictional assets and investments.
          </CityHeading>
          <WealthPanel state={state} />
        </>
      ) : view === "weekly" ? (
        <>
          <CityHeading eyebrow="This week" title="Digital society">
            Study, explore and collect rewards.
          </CityHeading>
          <WeeklyPanel
            progress={{
              week: "2026-10-12",
              ends: "2026-10-19",
              sessions: 2,
              correct: 8,
              weekend: 1,
              claims: [],
            }}
          />
        </>
      ) : view === "expansions" ? (
        <>
          <CityHeading
            eyebrow="Adventure collection"
            title="New stories. Earned through learning."
          >
            Original cartoon explorers and question practice.
          </CityHeading>
          <ExpansionPanel state={state} />
        </>
      ) : view === "illumship" ? (
        <>
          <CityHeading eyebrow="Illumship" title="A little more personality.">
            Your Premium companions.
          </CityHeading>
          <IllumshipPanel state={state} />
        </>
      ) : view === "friends" ? (
        <>
          <CityHeading
            eyebrow="Your people"
            title="Meet. Study. Stay connected."
          >
            Private friends, requests and messages.
          </CityHeading>
          <FriendsPanel
            meId="demo"
            ready={false}
            friends={[
              {
                id: "demo",
                otherId: "sam",
                username: "Sam_demo",
                requestedBy: "demo",
                state: "accepted",
                blockedBy: null,
              },
            ]}
          />
        </>
      ) : (
        <div className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <CityHeading
              eyebrow="Your study circle"
              title="A shared world. Your own conversations."
            >
              Meet in the city, practise together and message mutual friends.
              This preview uses an illustrative conversation.
            </CityHeading>
          </div>
          <ConversationPreview />
        </div>
      )}
    </main>
  );
}

/** Two tabs (?view=voice&as=a / as=b) call each other over a local channel with real WebRTC. */
const VOICE_FRIENDS = { a: { id: "00000000-0000-4000-8000-00000000000a", username: "amara" }, b: { id: "00000000-0000-4000-8000-00000000000b", username: "ben" } };
function VoiceTest({ as }: { as: "a" | "b" }) {
  const me = VOICE_FRIENDS[as], friend = VOICE_FRIENDS[as === "a" ? "b" : "a"];
  const [signaller] = useState(() => localSignaller());
  const [near, setNear] = useState(false);
  return (
    <main className="min-h-dvh bg-[#1c2b3a] p-6 text-white">
      <h1 className="text-xl font-black">Voice test · you are @{me.username}</h1>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={near} onChange={e => setNear(e.target.checked)} /> Standing next to @{friend.username}</label>
      <div className="fixed right-4 bottom-4 flex flex-col items-end gap-2">
        <VoiceChat meId={me.id} nearby={near ? [friend.id] : []} signaller={signaller} friendList={[friend]} />
      </div>
    </main>
  );
}
