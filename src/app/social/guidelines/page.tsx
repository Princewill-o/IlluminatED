import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Community guidelines",
  description: "How to keep IlluminatEDSocial safe, kind and useful.",
};

const RULES = [
  {
    t: "Keep yourself anonymous",
    d: "Don't post your full name, school or college, address, phone number, email or social media handles, or anyone else's. Posts with emails or phone numbers are blocked automatically.",
  },
  {
    t: "Be kind",
    d: "Disagree with ideas, not people. No bullying, harassment, hate or threats.",
  },
  {
    t: "Be honest about what you know",
    d: "Say whether you're describing your own experience or something you've heard. Opinions about a university or college are fine; made-up claims about real people are not.",
  },
  {
    t: "Never arrange to meet or move chats elsewhere",
    d: "Don't ask people to message you privately on other apps. If someone asks you, report it.",
  },
  {
    t: "No spam or selling",
    d: "No adverts, paid essay services, referral links or repeated posts.",
  },
  {
    t: "Keep it suitable for everyone",
    d: "Members can be as young as 13. No sexual content, graphic violence, or anything about getting hold of drugs or weapons.",
  },
];

export default function GuidelinesPage() {
  return (
    <div className="container max-w-3xl py-10 lg:py-14">
      <h1 className="text-4xl tracking-tight">Community guidelines</h1>
      <p className="text-muted-foreground mt-3 text-lg leading-relaxed">
        IlluminatEDSocial is for sharing honest experiences of sixth form,
        college, university and apprenticeships. These rules keep it useful and
        safe.
      </p>

      <ol className="mt-10 border-t">
        {RULES.map((r, i) => (
          <li
            key={r.t}
            className="grid gap-1 border-b py-5 sm:grid-cols-[2rem_1fr]"
          >
            <span className="text-primary font-semibold tabular-nums">
              {i + 1}
            </span>
            <div>
              <h2 className="font-semibold">{r.t}</h2>
              <p className="text-muted-foreground mt-1 leading-relaxed">
                {r.d}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="mod" className="mt-12">
        <h2 id="mod" className="text-2xl tracking-tight">
          How moderation works
        </h2>
        <ul className="text-muted-foreground mt-4 list-disc space-y-2 pl-5 leading-relaxed">
          <li>
            Posts appear straight away. Anyone signed in can report a post.
          </li>
          <li>
            When three different people report something, it's hidden until a
            moderator reviews it.
          </li>
          <li>
            Moderators can hide or remove posts, lock threads, and stop accounts
            from posting.
          </li>
          <li>
            You can delete your own posts, or your whole account, at any time.
          </li>
        </ul>
      </section>

      <section aria-labelledby="help" id="help" className="mt-12 scroll-mt-8">
        <h2 id="help-h" className="text-2xl tracking-tight">
          Need to talk to someone?
        </h2>
        <p className="text-muted-foreground mt-3 leading-relaxed">
          If you or someone else is in immediate danger, call{" "}
          <strong className="text-foreground">999</strong>. These services are
          free and confidential:
        </p>
        <ul className="mt-5 border-t">
          {[
            {
              n: "Childline",
              d: "For anyone under 19. Call 0800 1111 or chat online.",
              u: "https://www.childline.org.uk/",
            },
            {
              n: "Samaritans",
              d: "Any time, day or night. Call 116 123.",
              u: "https://www.samaritans.org/",
            },
            {
              n: "Shout",
              d: "Text SHOUT to 85258 for text support.",
              u: "https://giveusashout.org/",
            },
            {
              n: "CEOP",
              d: "Report worries about online sexual abuse or grooming.",
              u: "https://www.ceop.police.uk/",
            },
            {
              n: "Report Harmful Content",
              d: "Help reporting harmful content you've seen online.",
              u: "https://reportharmfulcontent.com/",
            },
          ].map((s) => (
            <li key={s.n} className="border-b py-4">
              <a
                href={s.u}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-semibold underline underline-offset-4"
              >
                {s.n}
              </a>
              <p className="text-muted-foreground mt-1 text-sm">{s.d}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
