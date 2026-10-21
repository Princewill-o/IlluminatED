import {
  BookOpen,
  ClipboardList,
  Gamepad2,
  House,
  Sparkles,
  type LucideIcon,
  UserRound,
} from "lucide-react";

/**
 * IlluminatED has two faces:
 * - the **website** (landing, about, legal, sign-in, setup) with the classic
 *   navbar and footer, in the navy/cream brand;
 * - the **app** (everything you reach once signed in) in a native-style shell:
 *   top bar + bottom tabs on phones, a side rail on bigger screens, purple on
 *   black. It's laid out like the iOS app so the two feel identical.
 *
 * Every non-website path is already gated by middleware, so the path alone
 * decides which shell to use (no extra auth check, no flash).
 */
const WEBSITE_PATHS = new Set([
  "/",
  "/sign-in",
  "/auth/callback",
  "/about",
  "/faq",
  "/accessibility",
  "/privacy",
  "/terms",
  "/cookies",
  "/contact",
  "/safeguarding",
  "/guardian/confirm",
  "/onboarding",
  "/getting-started",
  "/personalising",
  "/social/guidelines",
  "/social/sign-in",
  "/social/welcome",
  "/social/auth/callback",
  "/employers",
  "/employers/join",
  "/guardian/messages",
  "/creators",
  "/book",
  "/schools",
  "/pricing",
  "/investors",
  "/revision-games",
  "/teacher",
  "/school-access",
]);

export function isAppPath(path: string) {
  const clean = path.length > 1 ? path.replace(/\/$/, "") : path;
  if (WEBSITE_PATHS.has(clean) || clean.startsWith("/homework/class/")) return false;
  // Shared challenge cards are a landing page for people who haven't joined yet.
  if (clean.startsWith("/games/challenge/")) return false;
  return true;
}

export interface AppTab {
  id: "home" | "learn" | "agent" | "play" | "homework" | "me";
  label: string;
  href: string;
  icon: LucideIcon;
  /** Path prefixes that light this tab up. */
  match: string[];
}

export const APP_TABS: AppTab[] = [
  { id: "home", label: "Home", href: "/dashboard", icon: House, match: ["/dashboard"] },
  {
    id: "learn",
    label: "Learn",
    href: "/learn",
    icon: BookOpen,
    match: [
      "/learn",
      "/courses",
      "/study",
      "/quizzes",
      "/flashcards",
      "/revision",
      "/exam-mode",
      "/tiggy",
      "/calculator",
      "/qualifications",
      "/careers",
      "/next-steps",
      "/gcse",
      "/a-level",
      "/btec",
      "/t-levels",
      "/level-2-3",
      "/companies",
    ],
  },
  { id: "agent", label: "Agent", href: "/agent", icon: Sparkles, match: ["/agent"] },
  { id: "play", label: "Play", href: "/games", icon: Gamepad2, match: ["/games"] },
  { id: "homework", label: "Homework", href: "/homework", icon: ClipboardList, match: ["/homework"] },
  {
    id: "me",
    label: "Me",
    href: "/me",
    icon: UserRound,
    match: ["/me", "/employers/office", "/dashboard/settings", "/billing", "/premium", "/your-data", "/account", "/admin"],
  },
];

/** The tab a path belongs to (longest matching prefix wins, so /dashboard/settings is "Me"). */
export function activeTab(path: string): AppTab["id"] | null {
  let best: { id: AppTab["id"]; len: number } | null = null;
  for (const tab of APP_TABS)
    for (const m of tab.match)
      if ((path === m || path.startsWith(`${m}/`)) && (!best || m.length > best.len)) best = { id: tab.id, len: m.length };
  return best?.id ?? null;
}

/** Screen titles for the phone top bar. */
export function screenTitle(path: string) {
  const tab = activeTab(path);
  if (path === "/dashboard") return null;
  if (path.startsWith("/games/locker")) return "Locker";
  if (path.startsWith("/games/careers")) return "Careers";
  if (path.startsWith("/games/arcade")) return "Arcade";
  if (path.startsWith("/creators")) return "Creators";
  if (path.startsWith("/games/home")) return "Your home";
  if (path.startsWith("/games/promotion-panic")) return "Promotion Panic";
  if (path.startsWith("/games/world")) return "Worlds";
  if (path.startsWith("/messages")) return "Messages";
  if (path.startsWith("/companies")) return "Companies";
  if (path.startsWith("/employers/office")) return "Your office";
  return APP_TABS.find((t) => t.id === tab)?.label ?? null;
}
