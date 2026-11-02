"use client";
import { useEffect, useRef, useState } from "react";

import { Character3DPreview } from "../character-3d-preview";
import { deleteClip, localClips, saveClip } from "./clip-store";
import { recordSceneCapture } from "./scene-continuity";

import type { Avatar } from "@/game/core/cosmetics";
import {
  animationShotAt,
  DEFAULT_SHOTS,
  MAX_CLIP_SECONDS,
  validClip,
  type AnimationShot,
  type CreatorChannel,
  type CreatorClip,
} from "@/game/core/creator-clips";

function ClipCard({
  clip,
  onLike,
  onDelete,
}: {
  clip: CreatorClip;
  onLike: () => void;
  onDelete: () => void;
}) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    const next = URL.createObjectURL(clip.blob);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [clip.blob]);
  return (
    <article className="overflow-hidden rounded-2xl bg-[#18243c] text-white">
      <video
        src={url}
        controls
        playsInline
        preload="metadata"
        className={
          clip.channel === "youtube"
            ? "aspect-video w-full bg-black"
            : "mx-auto aspect-[9/12] max-h-96 w-full bg-black object-contain"
        }
      />
      <div className="p-4">
        <p className="text-sm whitespace-pre-wrap">
          {clip.caption || "My next chapter"}
        </p>
        <p className="mt-2 text-[11px] text-slate-300">
          {new Date(clip.createdAt).toLocaleDateString("en-GB")} ·{" "}
          {clip.channel} layout
        </p>
        <div className="mt-3 flex gap-3">
          <button
            type="button"
            onClick={onLike}
            aria-pressed={clip.liked}
            className="min-h-11 rounded-xl bg-white/10 px-3"
          >
            {clip.liked ? "♥ Liked" : "♡ Like"}
          </button>
          <a
            href={url}
            download={`illuminated-${clip.id}.${clip.blob.type.includes("mp4") ? "mp4" : "webm"}`}
            className="grid min-h-11 place-items-center rounded-xl bg-white/10 px-3"
          >
            Export
          </a>
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto min-h-11 px-2 text-rose-200"
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
/** A device-local creator simulation: publishing never contacts real social networks. */
export function CreatorStudio({
  owner,
  avatar,
  channel = "tiktok",
  onClose,
  onMinimisedChange,
}: {
  onMinimisedChange?: (minimised: boolean) => void;
  owner: string;
  avatar: Avatar;
  channel?: CreatorChannel;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"channel" | "create">("channel"),
    [layout, setLayout] = useState(channel),
    [mode, setMode] = useState<"animation" | "camera" | "city">("animation"),
    [clips, setClips] = useState<CreatorClip[]>([]),
    [shots, setShots] = useState<AnimationShot[]>(DEFAULT_SHOTS),
    [shot, setShot] = useState(0),
    [caption, setCaption] = useState(""),
    [draft, setDraft] = useState<Blob | null>(null),
    [preview, setPreview] = useState(""),
    [recording, setRecording] = useState(false),
    [seconds, setSeconds] = useState(0),
    [message, setMessage] = useState(""),
    [cameraReady, setCameraReady] = useState(false),
    [working, setWorking] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const minimise = useRef(onMinimisedChange);
  minimise.current = onMinimisedChange;
  const cityCapture = useRef<ReturnType<typeof recordSceneCapture> | null>(
    null,
  );
  const stage = useRef<HTMLDivElement>(null),
    video = useRef<HTMLVideoElement>(null),
    stream = useRef<MediaStream | null>(null),
    recorder = useRef<MediaRecorder | null>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    alive = useRef(true),
    startAt = useRef(0),
    cameraRequest = useRef(0);
  const stop = () => {
    cameraRequest.current++;
    setWorking(false);
    if (recorder.current?.state === "recording") recorder.current.stop();
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    cityCapture.current?.dispose();
    cityCapture.current = null;
    setMinimised(false);
    minimise.current?.(false);
    setCameraReady(false);
  };
  useEffect(() => {
    alive.current = true;
    const requests=cameraRequest;
    let active = true;
    void localClips(owner)
      .then((rows) => {
        if (active) setClips(rows);
      })
      .catch(() =>
        setMessage(
          "Your browser could not open local video storage. You can still record and export a clip.",
        ),
      );
    return () => {
      active = false;
      alive.current = false;
      requests.current++;
      if (timer.current) clearTimeout(timer.current);
      if (recorder.current?.state === "recording") recorder.current.stop();
      stream.current?.getTracks().forEach((track) => track.stop());
      cityCapture.current?.dispose();
      cityCapture.current = null;
    };
  }, [owner]);
  useEffect(() => {
    if (!draft) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(draft);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [draft]);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => {
      setShot(animationShotAt(shots, (Date.now() - started) / 1000));
      if (recorder.current?.state === "recording")
        setSeconds(
          Math.min(
            MAX_CLIP_SECONDS,
            Math.floor((Date.now() - startAt.current) / 1000),
          ),
        );
    }, 200);
    return () => clearInterval(id);
  }, [shots]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => document.removeEventListener("visibilitychange", hide);
  }, []);
  const camera = async () => {
    const request = ++cameraRequest.current;
    setWorking(true);
    setMessage("");
    try {
      const next = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      });
      if (!alive.current || request !== cameraRequest.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = next;
      if (video.current) {
        video.current.srcObject = next;
        await video.current.play();
      }
      if (!alive.current || request !== cameraRequest.current) {
        next.getTracks().forEach((t) => t.stop());
        return;
      }
      setCameraReady(true);
    } catch {
      setMessage(
        "Camera access was unavailable. You can make a character animation instead.",
      );
    } finally {
      if (alive.current && request === cameraRequest.current) setWorking(false);
    }
  };
  const record = () => {
    setMessage("");
    setDraft(null);
    try {
      if (typeof MediaRecorder === "undefined")
        throw Error("Video recording is unavailable in this browser.");
      const canvas = stage.current?.querySelector("canvas");
      if (mode === "city") cityCapture.current = recordSceneCapture();
      const next =
        mode === "city"
          ? cityCapture.current?.stream
          : mode === "camera"
            ? stream.current
            : canvas?.captureStream(24);
      if (!next)
        throw Error("Wait for the character or enable your camera first.");
      stream.current = next;
      const type = [
        "video/webm;codecs=vp9",
        "video/webm;codecs=vp8",
        "video/mp4",
        "video/webm",
      ].find((t) => MediaRecorder.isTypeSupported(t));
      const capture = new MediaRecorder(
          next,
          type ? { mimeType: type } : undefined,
        ),
        chunks: Blob[] = [];
      let bytes = 0;
      capture.ondataavailable = (event) => {
        if (event.data.size) {
          chunks.push(event.data);
          bytes += event.data.size;
          if (bytes > 30 * 1024 * 1024 && capture.state === "recording")
            capture.stop();
        }
      };
      capture.onstop = () => {
        next.getTracks().forEach((t) => t.stop());
        cityCapture.current?.dispose();
        cityCapture.current = null;
        if (timer.current) clearTimeout(timer.current);
        if (!alive.current) return;
        setRecording(false);
        setMinimised(false);
        minimise.current?.(false);
        setCameraReady(false);
        const blob = new Blob(chunks, { type: capture.mimeType });
        if (validClip(blob)) setDraft(blob);
        else
          setMessage(
            "This clip was too large or empty. Try a shorter recording.",
          );
      };
      capture.onerror = () => {
        stop();
        setMessage("Recording stopped. Try another browser or a shorter clip.");
      };
      recorder.current = capture;
      startAt.current = Date.now();
      setSeconds(0);
      capture.start(250);
      setRecording(true);
      if (mode === "city") {
        setMinimised(true);
        minimise.current?.(true);
      }
      timer.current = setTimeout(() => {
        if (capture.state === "recording") capture.stop();
      }, MAX_CLIP_SECONDS * 1000);
    } catch (error) {
      cityCapture.current?.dispose();
      cityCapture.current = null;
      setMessage(
        error instanceof Error ? error.message : "Recording unavailable.",
      );
    }
  };
  const publish = async () => {
    if (!draft || working) return;
    setWorking(true);
    try {
      if (clips.length >= 12)
        throw Error(
          "Your channel has 12 clips. Export or delete one before adding another.",
        );
      const clip: CreatorClip = {
        id: crypto.randomUUID(),
        owner,
        channel: layout,
        caption: caption.trim().slice(0, 280),
        blob: draft,
        createdAt: Date.now(),
        liked: false,
        plays: 0,
      };
      await saveClip(clip);
      setClips((rows) => [clip, ...rows]);
      setDraft(null);
      setCaption("");
      setTab("channel");
      setMessage("Published to your in-game channel on this device.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "The clip could not be saved. Export it before closing.",
      );
    } finally {
      setWorking(false);
    }
  };
  if (minimised)
    return (
      <aside className="absolute inset-x-3 top-20 z-[100011] mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-[#18243c]/95 p-3 text-sm text-white shadow-xl">
        <span role="status" className="flex-1">
          <span className="mr-2 inline-block size-2 rounded-full bg-rose-400" />
          Recording city · {seconds}s / 30s
        </span>
        <button
          type="button"
          onClick={stop}
          className="min-h-11 rounded-xl bg-rose-600 px-4 font-bold"
        >
          Stop & review
        </button>
      </aside>
    );
  return (
    <div className="absolute inset-0 z-[100011] overflow-y-auto bg-[#edf1fa] text-[#18202d]">
      <section
        role="dialog"
        aria-modal="true"
        aria-label="Creator studio"
        className="mx-auto min-h-full max-w-3xl p-4 sm:p-6"
      >
        <header className="flex items-center gap-3">
          <h2 className="flex-1 text-xl font-bold">Creator studio</h2>
          <button
            type="button"
            onClick={() => {
              stop();
              onClose();
            }}
            className="min-h-11 rounded-full bg-white px-4"
          >
            Close
          </button>
        </header>
        <p className="mt-2 text-xs text-slate-600">
          Your in-game channel · saved on this device · separate from real
          social accounts
        </p>
        <nav
          className="my-4 flex flex-wrap gap-2"
          aria-label="Creator channels"
        >
          {(["tiktok", "instagram", "youtube"] as const).map((name) => (
            <button
              type="button"
              key={name}
              disabled={recording}
              onClick={() => setLayout(name)}
              aria-pressed={layout === name}
              className={`flex min-h-11 items-center gap-2 rounded-xl px-3 ${layout === name ? "bg-blue-600 text-white" : "bg-white"}`}
            >
              <span
                aria-hidden
                className="size-5 bg-current"
                style={{
                  mask: `url(/brand-marks/${name}.svg) center/contain no-repeat`,
                }}
              />
              {name === "tiktok"
                ? "TikTok"
                : name === "youtube"
                  ? "YouTube"
                  : "Instagram"}{" "}
              style
            </button>
          ))}
        </nav>
        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => {
              stop();
              setTab("channel");
            }}
            className="min-h-11 rounded-xl bg-white px-4"
          >
            My channel
          </button>
          <button
            type="button"
            onClick={() => setTab("create")}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-white"
          >
            Create a clip
          </button>
        </div>
        {message && (
          <p role="status" className="mb-4 rounded-xl bg-white p-3 text-sm">
            {message}
          </p>
        )}
        {tab === "channel" ? (
          <div className="space-y-5">
            {clips.filter((c) => c.channel === layout).length === 0 && (
              <div className="rounded-2xl bg-white p-7">
                <h3 className="font-bold">Your story starts with a clip.</h3>
                <p className="mt-2 text-sm text-slate-600">
                  Animate your character, share a revision reflection or record
                  a day-in-the-life video. Review it before publishing. Export
                  lets you keep a copy.
                </p>
                <p className="mt-3 text-xs">
                  Creator challenge: explain one thing you learned in 30 seconds
                  without showing personal details.
                </p>
              </div>
            )}
            {clips
              .filter((c) => c.channel === layout)
              .map((clip) => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onLike={() => {
                    const next = { ...clip, liked: !clip.liked };
                    void saveClip(next)
                      .then(() =>
                        setClips((rows) =>
                          rows.map((row) => (row.id === clip.id ? next : row)),
                        ),
                      )
                      .catch(() => setMessage("Could not save this like."));
                  }}
                  onDelete={() => {
                    void deleteClip(clip.id, owner)
                      .then(() =>
                        setClips((rows) =>
                          rows.filter((row) => row.id !== clip.id),
                        ),
                      )
                      .catch(() => setMessage("Could not remove the clip."));
                  }}
                />
              ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2">
              {(["animation", "camera", "city"] as const).map((name) => (
                <button
                  type="button"
                  key={name}
                  disabled={recording}
                  onClick={() => {
                    stop();
                    setMode(name);
                    setDraft(null);
                  }}
                  className={`min-h-11 rounded-xl px-4 ${mode === name ? "bg-[#18243c] text-white" : "bg-white"}`}
                >
                  {name === "animation"
                    ? "Animate character"
                    : name === "city"
                      ? "City camera"
                      : "Camera video"}
                </button>
              ))}
            </div>
            {mode === "animation" ? (
              <>
                <div
                  ref={stage}
                  className="h-80 overflow-hidden rounded-2xl bg-white"
                >
                  <Character3DPreview
                    avatar={avatar}
                    clip={shots[shot]?.clip ?? "idle"}
                    facing={shots[shot]?.facing ?? "S"}
                    className="h-full w-full"
                  />
                </div>
                <div className="rounded-2xl bg-white p-4">
                  <h3 className="font-bold">Animation timeline</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Choose moves, shot length and direction. The timeline loops
                    while recording.
                  </p>
                  {shots.map((item, index) => (
                    <div className="mt-3 flex flex-wrap gap-2" key={index}>
                      <label className="text-xs">
                        Shot {index + 1}
                        <select
                          aria-label={`Shot ${index + 1} animation`}
                          disabled={recording}
                          value={item.clip}
                          onChange={(e) =>
                            setShots((rows) =>
                              rows.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      clip: e.target
                                        .value as AnimationShot["clip"],
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="ml-2 min-h-11 rounded-lg border px-2"
                        >
                          {[
                            "idle",
                            "walk",
                            "run",
                            "jump",
                            "wave",
                            "dance",
                            "cheer",
                          ].map((c) => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </label>
                      <label className="text-xs">
                        Seconds
                        <input
                          type="number"
                          aria-label={`Shot ${index + 1} seconds`}
                          min={1}
                          max={10}
                          disabled={recording}
                          value={item.seconds}
                          onChange={(e) =>
                            setShots((rows) =>
                              rows.map((row, i) =>
                                i === index
                                  ? {
                                      ...row,
                                      seconds: Math.max(
                                        1,
                                        Math.min(
                                          10,
                                          Number(e.target.value) || 1,
                                        ),
                                      ),
                                    }
                                  : row,
                              ),
                            )
                          }
                          className="ml-2 min-h-11 w-14 rounded-lg border px-2"
                        />
                      </label>
                      <select
                        aria-label={`Shot ${index + 1} direction`}
                        disabled={recording}
                        value={item.facing}
                        onChange={(e) =>
                          setShots((rows) =>
                            rows.map((row, i) =>
                              i === index
                                ? {
                                    ...row,
                                    facing: e.target
                                      .value as AnimationShot["facing"],
                                  }
                                : row,
                            ),
                          )
                        }
                        className="min-h-11 rounded-lg border px-2"
                      >
                        {["S", "E", "N", "W"].map((d) => (
                          <option key={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </>
            ) : mode === "city" ? (
              <div className="rounded-2xl bg-white p-5">
                <h3 className="font-bold">Capture your day in the city</h3>
                <p className="mt-2 text-sm text-slate-600">
                  The recorder shrinks while you walk, drive, ride the train or
                  visit work. Switch camera views as you go, then stop and
                  review your clip. Only the game scene is recorded; camera and
                  microphone stay off.
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Up to 30 seconds. Doorways keep the last frame until the next
                  scene is ready.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl bg-[#18243c] p-4">
                <video
                  ref={video}
                  autoPlay
                  muted
                  playsInline
                  className="mx-auto aspect-[9/12] max-h-80 w-full rounded-xl object-cover"
                />
                {!cameraReady && (
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void camera()}
                    className="mt-3 min-h-11 w-full rounded-xl bg-white p-3"
                  >
                    Enable camera · no microphone
                  </button>
                )}
                <p className="mt-2 text-xs text-slate-300">
                  Check your background and avoid school names, addresses and
                  other people without their permission.
                </p>
              </div>
            )}
            <button
              type="button"
              disabled={
                working || (mode === "camera" && !cameraReady && !recording)
              }
              onClick={recording ? stop : record}
              className="min-h-12 w-full rounded-2xl bg-rose-600 p-3 font-bold text-white disabled:opacity-40"
            >
              {recording
                ? `Stop recording · ${seconds}s / 30s`
                : "Record up to 30 seconds"}
            </button>
            {preview && (
              <div className="rounded-2xl bg-white p-4">
                <h3 className="font-bold">Review before publishing</h3>
                <video
                  src={preview}
                  controls
                  playsInline
                  className="mt-3 max-h-80 w-full rounded-xl bg-black"
                />
                <label className="mt-3 block text-sm">
                  Caption
                  <textarea
                    value={caption}
                    maxLength={280}
                    onChange={(e) => setCaption(e.target.value)}
                    className="mt-2 min-h-20 w-full rounded-xl border p-3"
                    placeholder="What did you learn, create or try today?"
                  />
                </label>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={working}
                    onClick={() => void publish()}
                    className="min-h-11 flex-1 rounded-xl bg-blue-600 p-3 font-bold text-white"
                  >
                    Publish to my channel
                  </button>
                  <a
                    href={preview}
                    download={`illuminated-clip.${draft?.type.includes("mp4") ? "mp4" : "webm"}`}
                    className="grid min-h-11 place-items-center rounded-xl border px-4"
                  >
                    Export draft
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
