import { Apple, Check, Play } from "lucide-react";

/** A phone frame drawn in CSS. Children are the screen. */
function Phone({
  label,
  dark,
  children,
}: {
  label: string;
  dark?: boolean;
  children: React.ReactNode;
}) {
  return (
    <figure className="w-[248px] shrink-0 snap-center">
      <div className="rounded-[46px] bg-[#16181d] p-[9px] shadow-[0_30px_60px_-20px_rgb(15_23_42/0.45)] ring-1 ring-black/10">
        <div
          className={`relative h-[500px] overflow-hidden rounded-[38px] ${dark ? "bg-[#09080d] text-[#f1eef8]" : "bg-[#faf8f4] text-[#101828]"}`}
        >
          <div className="absolute top-2.5 left-1/2 z-10 h-[24px] w-[80px] -translate-x-1/2 rounded-full bg-black" />
          <div className="flex items-center justify-between px-6 pt-3.5 text-[10px] font-semibold">
            <span>9:41</span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-[7px] w-[14px] rounded-[2px] border border-current opacity-80" />
            </span>
          </div>
          <div className="px-4 pt-6">{children}</div>
          <div
            className={`absolute bottom-2 left-1/2 h-[4px] w-[96px] -translate-x-1/2 rounded-full ${dark ? "bg-white/70" : "bg-black/70"}`}
          />
        </div>
      </div>
      <figcaption className="text-muted-foreground mt-4 text-center text-sm">
        {label}
      </figcaption>
    </figure>
  );
}

const navy = "#1b3a6b";

function DashboardScreen() {
  return (
    <div className="text-[11px]">
      <p className="text-[10px] opacity-60">GCSE · Year 11</p>
      <p className="mt-0.5 text-[20px] font-semibold tracking-tight">
        Hi, Maya
      </p>
      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {[
          ["128", "answered"],
          ["74%", "correct"],
          ["226", "days left"],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-white p-2 ring-1 ring-black/5">
            <p className="text-[14px] font-semibold">{v}</p>
            <p className="text-[9px] opacity-60">{l}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-[12px] font-semibold">Revise next</p>
      <ul className="mt-1.5 space-y-1.5">
        {[
          ["Solving linear equations", "Maths · 50% correct"],
          ["Cell structure", "Biology · not tried yet"],
          ["Analysing language", "English · not tried yet"],
        ].map(([t, s]) => (
          <li
            key={t}
            className="flex items-center justify-between gap-2 rounded-xl bg-white px-2.5 py-2 ring-1 ring-black/5"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">{t}</span>
              <span className="block text-[9px] opacity-60">{s}</span>
            </span>
            <span
              className="shrink-0 rounded-md px-2 py-1 text-[9px] font-semibold text-white"
              style={{ background: navy }}
            >
              Quiz
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] font-semibold">Maths progress</p>
      {[
        ["Percentages", 80],
        ["Linear equations", 50],
      ].map(([t, v]) => (
        <div key={t} className="mt-1.5">
          <div className="flex justify-between text-[9px] opacity-70">
            <span>{t}</span>
            <span>{v}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-black/10">
            <div
              className="h-1.5 rounded-full"
              style={{ width: `${v}%`, background: navy }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function QuizScreen() {
  return (
    <div className="text-[11px]">
      <div className="flex items-center justify-between text-[10px] opacity-60">
        <span>Quick practice</span>
        <span>3 of 5</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-black/10">
        <div className="h-1 w-3/5 rounded-full" style={{ background: navy }} />
      </div>
      <p className="mt-5 text-[10px] opacity-60">
        GCSE Mathematics · Percentages
      </p>
      <p className="mt-1 text-[16px] leading-snug font-semibold">
        A coat costs £80. It is reduced by 15%. What is the new price?
      </p>
      <ul className="mt-4 space-y-1.5">
        {["£65", "£68", "£72", "£92"].map((o) => {
          const right = o === "£68";
          return (
            <li
              key={o}
              className={`flex items-center justify-between rounded-xl px-3 py-2.5 ring-1 ${right ? "bg-[#e3f5ec] font-semibold text-[#12704e] ring-[#12704e]/40" : "bg-white ring-black/10"}`}
            >
              {o}
              {right && <Check className="size-3.5" aria-hidden />}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 rounded-xl bg-white p-2.5 text-[10px] leading-relaxed ring-1 ring-black/5">
        <span className="font-semibold">Why:</span> 15% of £80 is £12, and £80 −
        £12 = £68. Or multiply by 0.85.
      </div>
      <div
        className="mt-3 rounded-xl py-2.5 text-center text-[11px] font-semibold text-white"
        style={{ background: navy }}
      >
        Next question
      </div>
    </div>
  );
}

function SocialScreen() {
  return (
    <div className="text-[11px]">
      <p className="text-[15px] font-bold tracking-tight">
        IlluminatED<span className="text-[#a67fff]">Social</span>
      </p>
      <div className="mt-3 flex gap-1.5 overflow-hidden text-[9px]">
        {["Universities", "Sixth form", "Applying"].map((c, i) => (
          <span
            key={c}
            className={`shrink-0 rounded-full px-2.5 py-1 ${i === 0 ? "bg-[#a67fff] font-semibold text-[#09080d]" : "border border-white/15"}`}
          >
            {c}
          </span>
        ))}
      </div>
      <ul className="mt-3 divide-y divide-white/10 border-y border-white/10">
        {[
          [
            "Anyone studying CS at Leeds? What's first year like?",
            "University of Leeds",
            "2 replies",
          ],
          [
            "How do you judge if a uni is good for your subject?",
            "Universities",
            "2 replies",
          ],
          [
            "Moving to a sixth form college. How different is it?",
            "Sixth form",
            "1 reply",
          ],
          [
            "Degree apprenticeship vs uni for software?",
            "Apprenticeships",
            "New",
          ],
        ].map(([t, c, r]) => (
          <li key={t} className="py-2.5">
            <p className="leading-snug font-medium">{t}</p>
            <p className="mt-1 text-[9px] text-[#b9b2c9]">
              {c} · {r}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-3 rounded-xl bg-[#a67fff] py-2.5 text-center text-[11px] font-semibold text-[#09080d]">
        Start a thread
      </div>
    </div>
  );
}

function StoreButton({
  icon,
  small,
  big,
}: {
  icon: React.ReactNode;
  small: string;
  big: string;
}) {
  return (
    <div
      className="text-foreground inline-flex h-14 items-center gap-3 rounded-xl border px-4"
      aria-label={`${big}, coming soon`}
    >
      {icon}
      <span className="leading-tight">
        <span className="text-muted-foreground block text-[11px]">{small}</span>
        <span className="block text-base font-semibold">{big}</span>
      </span>
      <span className="bg-muted text-muted-foreground ml-2 rounded-full px-2.5 py-1 text-xs font-medium">
        Coming soon
      </span>
    </div>
  );
}

export function AppPreview() {
  return (
    <section
      id="app"
      aria-labelledby="app-title"
      className="border-y bg-[#efe3cc]/50 dark:bg-[#151d2b]"
    >
      <div className="container grid items-center gap-12 py-16 lg:py-20 xl:grid-cols-[minmax(0,22rem)_1fr]">
        <div>
          <h2 id="app-title" className="text-3xl tracking-tight md:text-4xl">
            IlluminatED on your phone
          </h2>
          <p className="text-muted-foreground mt-4 max-w-md text-lg leading-relaxed">
            Quick quizzes on the bus, your revision list in your pocket, and
            IlluminatEDSocial wherever you are. Your account works on the web
            and in the app.
          </p>
          <div className="mt-8 flex flex-col items-start gap-3">
            <StoreButton
              icon={<Apple className="size-6" aria-hidden />}
              small="iPhone and iPad"
              big="App Store"
            />
            <StoreButton
              icon={<Play className="size-6" aria-hidden />}
              small="Android"
              big="Google Play"
            />
          </div>
          <p className="text-muted-foreground mt-5 text-sm">
            Not out yet. Until then, the website works on any phone.
          </p>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-4 md:mx-0 md:justify-center md:overflow-visible md:px-0 xl:justify-end">
          <Phone label="Your dashboard">
            <DashboardScreen />
          </Phone>
          <Phone label="Quick quizzes">
            <QuizScreen />
          </Phone>
          <Phone label="IlluminatEDSocial" dark>
            <SocialScreen />
          </Phone>
        </div>
      </div>
    </section>
  );
}
