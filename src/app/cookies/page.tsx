import Link from "next/link";

import type { Metadata } from "next";

import { HowToContact, LegalPage } from "@/components/legal";

export const metadata: Metadata = {
  title: "Cookies",
  description:
    "The cookies and browser storage IlluminatED uses. No analytics or advertising cookies.",
};

const ROWS: {
  name: string;
  where: string;
  what: string;
  kind: string;
  lasts: string;
}[] = [
  {
    name: "sb-…-auth-token",
    where: "Cookie",
    what: "Keeps you signed in. Set by Supabase, our sign-in provider. Large sessions may be split into parts ending .0, .1 and so on.",
    kind: "Strictly necessary",
    lasts: "Until you sign out, or up to 400 days",
  },
  {
    name: "theme",
    where: "Local storage",
    what: "Remembers whether you picked light or dark mode.",
    kind: "Functional",
    lasts: "Until you clear it",
  },
  {
    name: "illuminated:splash-seen",
    where: "Session storage",
    what: "Stops the welcome animation playing on every page.",
    kind: "Functional",
    lasts: "Until you close the tab",
  },
  {
    name: "illuminated:tour-seen:…",
    where: "Local storage",
    what: "Remembers you've seen the guided tour, so it doesn't show again.",
    kind: "Functional",
    lasts: "Until you clear it",
  },
  {
    name: "illuminated:quiz-progress, flashcards, planner, exam-date, alevel-year, recent",
    where: "Local storage",
    what: "Things you save while you study: quiz answers, flashcard marks, your revision plan, exam countdown, A level year and recently viewed pages.",
    kind: "Functional",
    lasts: "Until you clear it",
  },
  {
    name: "illuminated:progress-imported",
    where: "Local storage",
    what: "Remembers which accounts this device's quiz history has already been added to, so it isn't counted twice.",
    kind: "Functional",
    lasts: "Until you clear it",
  },
  {
    name: "illuminated:api-cache",
    where: "Local storage",
    what: "Short-lived copies of search results (qualifications, statistics, books) so pages load faster.",
    kind: "Functional",
    lasts:
      "Each result is refreshed after 6 to 24 hours. Older ones are cleared out automatically",
  },
];

export default function CookiesPage() {
  return (
    <LegalPage
      title="Cookies and storage"
      intro="What IlluminatED saves on your device, and why. There are no analytics or advertising cookies."
      crumb="Cookies"
    >
      <p>
        Cookies are small files a website saves in your browser. Websites can
        also save things in your browser's "local storage" and "session
        storage". The law on this (the Privacy and Electronic Communications
        Regulations, or PECR) treats them all the same way, so we list them all
        here.
      </p>

      <h2 id="list">What we use</h2>
      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>What it does</th>
              <th>Category</th>
              <th>How long</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.name}>
                <td className="font-mono text-xs break-words">{r.name}</td>
                <td>{r.where}</td>
                <td>{r.what}</td>
                <td>{r.kind}</td>
                <td>{r.lasts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="consent">Why there's no cookie banner</h2>
      <p>
        PECR says a website must ask before saving anything on your device,
        unless it's <strong>strictly necessary</strong> for a service you've
        asked for. Everything above is either needed to keep you signed in, or
        only saved because you did something (like choosing dark mode or
        answering a quiz) and is only used to give you that feature. None of it
        is used to track you, and it never leaves your device except the sign-in
        cookie, which only goes to us.
      </p>
      <p>
        We don't use any <strong>analytics</strong> or{" "}
        <strong>advertising</strong> cookies, and there are no third-party
        trackers, social media buttons or adverts. So there's nothing to ask
        your permission for, and no banner. If that ever changes, we'll ask you
        first.
      </p>

      <h2 id="control">Clearing or blocking them</h2>
      <p>
        You can clear everything IlluminatED has saved in this browser on the{" "}
        <Link href="/your-data">Your data</Link> page, or through your browser
        settings. If you block cookies, you won't be able to stay signed in.
      </p>
      <p>
        If you have questions, <HowToContact topic="privacy" />. Our{" "}
        <Link href="/privacy">privacy policy</Link> explains how we use personal
        data more generally.
      </p>
    </LegalPage>
  );
}
