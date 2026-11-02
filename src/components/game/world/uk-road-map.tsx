"use client";

import { useEffect, useRef, useState } from "react";

import {
  ArrowRight,
  CarFront,
  House,
  MapPinned,
  Minus,
  Plus,
  Route,
  X,
} from "lucide-react";

import {
  projectUK,
  UK_OUTLINE,
  UK_ROAD_GEOMETRY,
} from "@/game/core/uk-geography";
import {
  nextUKPortal,
  planUKJourney,
  ukRegionOf,
  ukSceneName,
} from "@/game/core/uk-navigation";
import { UK_PLACES, ukWorldMap } from "@/game/core/uk-world";
import type { WorldMap } from "@/game/core/world";

const labelOffsets: Record<string, [number, number]> = {
  city: [-50, -10],
  kent: [20, 22],
  nottingham: [14, -7],
  birmingham: [-80, 14],
  manchester: [-82, -8],
  edinburgh: [14, 1],
};
const highlightedRoads = new Set(["M25", "M1", "M6", "M56", "M2", "A2", "A1"]);

/** The road atlas plans a route; players still travel through its actual junctions. */
export function UKRoadMap({
  map,
  onClose,
  onGuide,
}: {
  map: WorldMap;
  onClose: () => void;
  onGuide: (destination: string) => void;
}) {
  const current = ukRegionOf(map.id) ?? "city";
  const [selected, setSelected] = useState(
    current === "city" ? "kent" : "city",
  );
  const [zoom, setZoom] = useState(1);
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    close.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
      }
      if (event.key === "Tab") {
        const dialog = close.current?.closest("section");
        const buttons = Array.from(
          dialog?.querySelectorAll<HTMLElement>(
            "button:not([disabled]), a[href]",
          ) ?? [],
        );
        const first = buttons[0],
          last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    window.addEventListener("keydown", key, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      previous?.focus();
    };
  }, [onClose]);
  const place = UK_PLACES.find((item) => item.id === selected);
  const plan = planUKJourney(map.id, selected);
  const next = nextUKPortal(map, selected);
  const scene = ukWorldMap(selected);
  const homes =
    scene?.portals.filter((portal) => portal.id.startsWith("uk-home-"))
      .length ?? 0;
  const active = selected === current && map.id === current;
  const focus = UK_PLACES.find((item) => item.id === selected) ?? UK_PLACES[0];
  const [focusX, focusY] = projectUK(focus.lon, focus.lat);
  const viewWidth = 520 / zoom,
    viewHeight = 570 / zoom;
  const viewX = Math.max(0, Math.min(520 - viewWidth, focusX - viewWidth / 2));
  const viewY = Math.max(
    0,
    Math.min(570 - viewHeight, focusY - viewHeight / 2),
  );

  return (
    <div
      className="absolute inset-0 z-[100015] flex items-center justify-center bg-[#091929]/75 p-2 backdrop-blur-md sm:p-6"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="uk-atlas-title"
        className="pixel-panel uk-atlas flex h-full max-h-[900px] w-full max-w-6xl flex-col overflow-hidden rounded-[2rem] border border-white/25 bg-[#f8f5ee] text-[#152d36] [color-scheme:light] shadow-2xl"
      >
        <header className="pixel-ribbon flex shrink-0 items-center gap-3 border-b border-[#d9dfd5] px-5 py-4 sm:px-7">
          <span className="grid size-11 place-items-center rounded-2xl bg-[#1a584c] text-[#e9f4da]">
            <MapPinned size={23} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-[.2em] text-[#567262] uppercase">
              IlluminatED · explore further
            </p>
            <h2 id="uk-atlas-title" className="text-xl font-black sm:text-2xl">
              UK ROAD ATLAS
            </h2>
          </div>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            aria-label="Close UK road atlas"
            className="grid size-11 place-items-center rounded-full border border-[#cbd6cc] bg-white hover:bg-[#e8eee4]"
          >
            <X size={20} />
          </button>
        </header>
        <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1fr_370px]">
          <div className="relative min-h-[400px] bg-[#dcebf0] md:min-h-0">
            <div className="absolute top-4 left-4 z-10 rounded-full border border-white/70 bg-white/90 px-3 py-2 text-[11px] font-bold shadow-sm">
              You’re in {ukSceneName(current)}
            </div>
            <div className="absolute right-3 bottom-3 z-10 flex items-center gap-1 bg-[#d9edf1] p-1">
              <button
                type="button"
                aria-label="Zoom UK map out"
                disabled={zoom === 1}
                onClick={() => setZoom((value) => Math.max(1, value - 1))}
                className="grid size-9 place-items-center bg-white disabled:opacity-40"
              >
                <Minus size={16} />
              </button>
              <span className="px-1 text-xs font-black">{zoom}×</span>
              <button
                type="button"
                aria-label="Zoom UK map in"
                disabled={zoom === 3}
                onClick={() => setZoom((value) => Math.min(3, value + 1))}
                className="grid size-9 place-items-center bg-white disabled:opacity-40"
              >
                <Plus size={16} />
              </button>
            </div>
            <svg
              viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
              role="img"
              aria-label="Geographic UK map with London, Canterbury in Kent, Nottingham, Birmingham, Manchester and Edinburgh at their correct coordinates"
              className="h-full max-h-[650px] min-h-[400px] w-full"
            >
              <defs>
                <pattern
                  id="uk-ocean-grid"
                  width="24"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M24 0H0V24"
                    fill="none"
                    stroke="#b6d1d5"
                    strokeWidth=".5"
                  />
                </pattern>
                <filter id="uk-island-shadow">
                  <feDropShadow
                    dx="0"
                    dy="4"
                    stdDeviation="4"
                    floodColor="#4a7a80"
                    floodOpacity=".22"
                  />
                </filter>
              </defs>
              <rect width="520" height="570" fill="url(#uk-ocean-grid)" />
              <path
                d={UK_OUTLINE}
                fill="#e7efdb"
                stroke="#8aa88e"
                strokeWidth="1.1"
                fillRule="evenodd"
                filter="url(#uk-island-shadow)"
              />
              <g
                fill="#678578"
                fontSize="10"
                fontWeight="700"
                letterSpacing="2"
              >
                <text
                  {...{
                    x: projectUK(-4.6, 57.1)[0],
                    y: projectUK(-4.6, 57.1)[1],
                  }}
                >
                  SCOTLAND
                </text>
                <text
                  {...{
                    x: projectUK(-3.6, 52.5)[0] - 25,
                    y: projectUK(-3.6, 52.5)[1],
                  }}
                >
                  WALES
                </text>
                <text
                  {...{
                    x: projectUK(-0.8, 54.4)[0] - 25,
                    y: projectUK(-0.8, 54.4)[1],
                  }}
                >
                  ENGLAND
                </text>
                <text
                  {...{
                    x: projectUK(-7, 54.9)[0] - 35,
                    y: projectUK(-7, 54.9)[1],
                  }}
                >
                  NORTHERN
                </text>
                <text
                  {...{
                    x: projectUK(-7, 54.9)[0] - 30,
                    y: projectUK(-7, 54.9)[1] + 12,
                  }}
                >
                  IRELAND
                </text>
              </g>
              <text
                x="65"
                y="412"
                fontSize="11"
                fill="#72939d"
                fontStyle="italic"
              >
                Irish Sea
              </text>
              <text
                x="386"
                y="270"
                fontSize="11"
                fill="#72939d"
                fontStyle="italic"
              >
                North Sea
              </text>
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {UK_ROAD_GEOMETRY.map((road, i) => (
                  <path
                    key={i}
                    d={road.path}
                    stroke={
                      highlightedRoads.has(road.ref) ? "#4e79ac" : "#9db5bb"
                    }
                    strokeWidth={highlightedRoads.has(road.ref) ? 2 : 1}
                    opacity={highlightedRoads.has(road.ref) ? 1 : 0.65}
                  />
                ))}
              </g>
              {[
                ["M1", -0.95, 52.3],
                ["M6", -2.55, 53],
                ["A1", -1.55, 54.8],
                ["M25", -0.6, 51.7],
                ["M2", 0.6, 51.35],
              ].map(([name, lon, lat]) => {
                const [x, y] = projectUK(Number(lon), Number(lat));
                return (
                  <g key={name}>
                    <rect
                      x={x - 12}
                      y={y - 7}
                      width="26"
                      height="13"
                      fill="#28578b"
                      stroke="#fff"
                      strokeWidth="1"
                    />
                    <text
                      x={x + 1}
                      y={y + 2}
                      textAnchor="middle"
                      fontSize="8"
                      fontWeight="800"
                      fill="white"
                    >
                      {name}
                    </text>
                  </g>
                );
              })}
              {UK_PLACES.map((item) => {
                const [x, y] = projectUK(item.lon, item.lat),
                  chosen = item.id === selected;
                const [dx, dy] = labelOffsets[item.id];
                return (
                  <g key={item.id}>
                    {chosen && (
                      <circle
                        cx={x}
                        cy={y}
                        r="13"
                        fill="#eeb84c"
                        opacity=".25"
                      />
                    )}
                    <circle
                      cx={x}
                      cy={y}
                      r={chosen ? 6.5 : 5}
                      fill={chosen ? "#f4be68" : "#fff"}
                      stroke={chosen ? "#7e511a" : item.accent}
                      strokeWidth="2.5"
                    />
                    <path
                      d={`M${x} ${y}L${x + dx * 0.7} ${y + dy * 0.7}`}
                      fill="none"
                      stroke="#526e67"
                      strokeWidth=".8"
                    />
                    <text
                      x={x + dx}
                      y={y + dy}
                      textAnchor={dx < 0 ? "end" : "start"}
                      fontSize="11"
                      fontWeight="800"
                      fill="#213e40"
                      stroke="#f1f5eb"
                      strokeWidth="3"
                      paintOrder="stroke"
                    >
                      {item.id === "kent" ? "Canterbury · Kent" : item.name}
                    </text>
                  </g>
                );
              })}
              <text x="22" y="545" fontSize="9" fill="#52737c">
                Natural Earth coastline & major roads · geographic placement
              </text>
              <text x="22" y="560" fontSize="9" fill="#52737c">
                Playable districts use shorter roads and journeys.
              </text>
            </svg>
          </div>
          <div className="flex flex-col gap-4 border-t border-[#d9dfd5] p-5 md:border-t-0 md:border-l md:p-6">
            <div className="grid grid-cols-2 gap-2">
              {[
                ...UK_PLACES.map((item) => ({
                  id: item.id,
                  name: item.id === "kent" ? "Kent" : item.name,
                })),
                { id: "m25", name: "M25 orbital" },
                { id: "rotherhithe", name: "A101 tunnel" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelected(item.id)}
                  aria-pressed={selected === item.id}
                  className={`min-h-10 rounded-xl border px-3 text-left text-xs font-bold transition ${selected === item.id ? "border-[#235c4d] bg-[#235c4d] text-white" : "border-[#d3ddcf] bg-white hover:bg-[#eaf0e4]"}`}
                >
                  {item.name}
                </button>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest text-[#68826a] uppercase">
                {place?.county ?? "London road network"}
              </p>
              <h3 className="mt-1 text-2xl font-black">
                {ukSceneName(selected)}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#56706c]">
                {place?.description ??
                  (selected === "m25"
                    ? "Keep driving around the orbital. Take a signed junction into a new district, or return to London."
                    : "Drive or walk the A101 crossing. The Limehouse and Rotherhithe exits return to opposite banks of your London map.")}
              </p>
            </div>
            {place && (
              <div className="rounded-2xl border border-[#d4dfcc] bg-[#edf2e6] p-4">
                <p className="flex items-center gap-2 text-xs font-black">
                  <House size={17} />
                  Neighbourhood homes
                </p>
                <p className="mt-2 text-sm text-[#56706c]">{place.housing}</p>
                {homes > 0 && (
                  <p className="mt-2 text-xs font-bold">
                    {homes} furnished homes to explore · study & rest inside
                  </p>
                )}
              </div>
            )}
            <div className="rounded-2xl bg-[#122f42] p-4 text-white">
              <p className="flex items-center gap-2 text-xs font-black">
                <Route size={16} />
                Your route
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-1.5 text-sm font-bold">
                {plan?.maps.map((id, i) => (
                  <span key={id} className="contents">
                    {i > 0 && (
                      <ArrowRight size={13} className="text-[#91b9cf]" />
                    )}
                    <span>{ukSceneName(id).split(" · ")[0]}</span>
                  </span>
                )) ?? "Return to London to join this route."}
              </p>
              <p className="mt-3 text-xs leading-relaxed text-[#b4d0e0]">
                {plan?.roads.join(" → ") || "You’re already in this district."}
              </p>
            </div>
            <button
              type="button"
              disabled={!next || active}
              onClick={() => onGuide(selected)}
              className="mt-auto flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#e9b45b] px-4 text-sm font-black text-[#3b301f] shadow-sm hover:bg-[#f1c678] disabled:opacity-50"
            >
              <CarFront size={18} />
              {active
                ? "You’re here"
                : next
                  ? "Guide me there"
                  : "Return to London first"}
            </button>
            <p className="text-[11px] leading-relaxed text-[#6a7d72]">
              Follow the marker to a signed exit and interact to continue. Roads
              loop back into the district. The places and routes are condensed
              for the game.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
