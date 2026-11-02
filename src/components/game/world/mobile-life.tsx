"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import Link from "next/link";

import {
  ArrowUpRight,
  Award,
  BookOpen,
  BriefcaseBusiness,
  CarFront,
  Check,
  ChevronRight,
  Coffee,
  Compass,
  Droplets,
  GraduationCap,
  Heart,
  House,
  Moon,
  Music2,
  Search,
  Settings2,
  Sparkles,
  Users,
  Utensils,
  Wallet,
} from "lucide-react";

import type { Quest } from "./life-hud";
import styles from "./mobile-life.module.css";
import { doActivity } from "./use-needs";
import type { Me } from "./use-world";

import type { ActiveJob } from "@/components/careers/work";
import { AvatarFigure } from "@/components/game/avatar";
import { WORKPLACES, roleOf, workplaceById } from "@/game/core/careers";
import { HOMES, homeById } from "@/game/core/homes";
import type { LifeEntry } from "@/game/core/mobile-life";
import {
  ACTIVITIES,
  NEEDS,
  moodWord,
  type Needs,
  type Activity,
} from "@/game/core/needs";
import { levelProgress } from "@/game/core/progression";

type Tab = "life" | "study" | "work" | "assets" | "more";
const TABS = [
  { id: "life", label: "My life", Icon: Heart },
  { id: "study", label: "Study", Icon: BookOpen },
  { id: "work", label: "Work", Icon: BriefcaseBusiness },
  { id: "assets", label: "Assets", Icon: Wallet },
  { id: "more", label: "More", Icon: Sparkles },
] as const;
const SELF_CARE: {
  activity: Activity;
  label: string;
  Icon: typeof Moon;
  color: string;
}[] = [
  { activity: "sleep", label: "Take a nap", Icon: Moon, color: "#7660d7" },
  { activity: "relax", label: "Take a break", Icon: Coffee, color: "#c47f3a" },
  {
    activity: "music",
    label: "Listen to music",
    Icon: Music2,
    color: "#d85a89",
  },
  { activity: "eat", label: "Have a snack", Icon: Utensils, color: "#c28a24" },
  { activity: "shower", label: "Freshen up", Icon: Droplets, color: "#329eb1" },
];

function Row({
  title,
  detail,
  icon,
  color = "#0766ed",
  onClick,
  href,
}: {
  title: string;
  detail?: string;
  icon: ReactNode;
  color?: string;
  onClick?: () => void;
  href?: string;
}) {
  const body = (
    <>
      <span className={styles.icon} style={{ color, background: `${color}12` }}>
        {icon}
      </span>
      <span className={styles.rowText}>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <ChevronRight size={16} aria-hidden />
    </>
  );
  return href ? (
    <Link prefetch={false} href={href} className={styles.row}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={styles.row}>
      {body}
    </button>
  );
}

/** Touch-first access to the real city systems, with no WebGL needed to play. */
export function MobileLife({
  me,
  job,
  clout,
  xp,
  needs,
  currentHome,
  ownedHomes,
  quests,
  courses,
  entries,
  time,
  onExplore,
  onStudy,
  onWork,
  onHouses,
  onHome,
  onAwards,
  onArcade,
  onGarage,
  onRecord,
  onLeave,
}: {
  me: Me;
  job: ActiveJob | null;
  clout: number;
  xp: number;
  needs: Needs | null;
  currentHome: string;
  ownedHomes: string[];
  quests: Quest[];
  courses: { id: string; title: string; level: string }[];
  entries: LifeEntry[];
  time: Date;
  onExplore: () => void;
  onStudy: () => void;
  onWork: (workplace: string) => void;
  onHouses: () => void;
  onHome: () => void;
  onAwards: () => void;
  onArcade: () => void;
  onGarage: () => void;
  onRecord: (text: string) => void;
  onLeave: () => void;
}) {
  const [tab, setTab] = useState<Tab>("life");
  const [search, setSearch] = useState("");
  const [sector, setSector] = useState<"all" | "current">("all");
  const [resting, setResting] = useState<string | null>(null);
  const restTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restLock = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({ top: 0 });
    setSearch("");
  }, [tab]);
  useEffect(
    () => () => {
      if (restTimer.current) clearTimeout(restTimer.current);
    },
    [],
  );
  const level = levelProgress(xp);
  const workplace = job ? workplaceById(job.workplace) : null;
  const role = job ? roleOf(job.workplace, job.role) : null;
  const home = homeById(currentHome);
  const availableWorkplaces = WORKPLACES.filter(
    (item) =>
      (!job || sector !== "current" || item.id === job.workplace) &&
      `${item.name} ${item.sector}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const occupation = job ? (role?.title ?? "Working") : "Studying · Unemployed";
  const iconSize = 19;
  const rest = (activity: Activity, label: string) => {
    if (restLock.current) return;
    restLock.current = true;
    setResting(`${label}…`);
    restTimer.current = setTimeout(() => {
      doActivity(activity);
      onRecord(ACTIVITIES[activity].label + ".");
      setResting(null);
      restLock.current = false;
    }, 6000);
  };
  const studyRows = quests.filter((quest) => quest.tag === "Homework");

  return (
    <section
      className={styles.shell}
      aria-label="Mobile life dashboard"
      data-mobile-life=""
    >
      <header className={styles.topBar}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => setTab("life")}
          aria-label="IlluminatED · My life"
        >
          <Sparkles size={19} aria-hidden /> Illuminat<span>ED</span>
        </button>
        <button
          type="button"
          className={styles.cityButton}
          onClick={onExplore}
          aria-label="Explore the 3D city"
        >
          <Compass size={18} aria-hidden />
          <span>City</span>
        </button>
      </header>
      <div className={styles.identity}>
        <span className={styles.miniPortrait}>
          <AvatarFigure avatar={me.avatar} size={54} />
        </span>
        <div className={styles.identityText}>
          <h1>@{me.username}</h1>
          <p>{occupation}</p>
        </div>
        <button
          type="button"
          className={styles.balance}
          onClick={() => setTab("assets")}
          aria-label={`Your balance: ${clout.toLocaleString("en-GB")} Clout. View assets`}
        >
          <strong>{clout.toLocaleString("en-GB")}</strong>
          <span>
            Clout <ChevronRight size={11} aria-hidden />
          </span>
        </button>
      </div>
      <div
        ref={scroll}
        className={styles.scroll}
        tabIndex={0}
        aria-label={`${TABS.find((item) => item.id === tab)?.label} content`}
      >
        <div key={tab} className={styles.content}>
          {tab !== "life" && (
            <h2 className={styles.pageTitle}>
              {TABS.find((item) => item.id === tab)?.label}
            </h2>
          )}

          {tab === "life" && (
            <>
              <div className={styles.chapterBar}>
                <span>YOUR STORY</span>
                <span>
                  {home?.area ?? "London"} · Level {level.level}
                </span>
              </div>
              <div className={styles.journalHeading}>
                <h2>My life</h2>
                <time dateTime={time.toISOString()}>
                  {time.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                  })}
                </time>
              </div>
              <div className={styles.chapterNote}>
                <span className={styles.chapterIcon}>
                  <GraduationCap size={22} aria-hidden />
                </span>
                <div>
                  <strong>Your next chapter is yours.</strong>
                  <p>Learn something. Try a role. Make a little progress.</p>
                </div>
              </div>
              <div className={styles.timeline}>
                <div className={styles.entry}>
                  <div className={styles.track}>
                    <span
                      className={styles.dot}
                      style={{ background: "#2977eb" }}
                    />
                  </div>
                  <div className={styles.entryText}>
                    <p>
                      {job
                        ? `You’re ${role?.title ?? "working"} at ${workplace?.name ?? "your workplace"}.`
                        : "You’re studying and exploring what comes next. Your next opportunity starts with a choice."}
                    </p>
                    <time>
                      Current chapter ·{" "}
                      {time.toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "long",
                      })}
                    </time>
                  </div>
                </div>
                {entries.slice(0, 12).map((entry) => (
                  <div key={entry.id} className={styles.entry}>
                    <div className={styles.track}>
                      <span className={styles.dot} />
                    </div>
                    <div className={styles.entryText}>
                      <p>{entry.text}</p>
                      <time dateTime={new Date(entry.at).toISOString()}>
                        {new Date(entry.at).toLocaleString("en-GB", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </time>
                    </div>
                  </div>
                ))}
                {!entries.length && (
                  <p className={styles.tip}>
                    Completed study sessions, house purchases and little moments
                    will appear here. Your diary stays on this device.
                  </p>
                )}
              </div>
              <div className={styles.lifeChoices}>
                <button
                  type="button"
                  onClick={() => (job ? onWork(job.workplace) : setTab("work"))}
                >
                  <BriefcaseBusiness size={18} aria-hidden />
                  <span>{job ? "Work a shift" : "Find a role"}</span>
                  <ChevronRight size={14} aria-hidden />
                </button>
                <button type="button" onClick={() => setTab("assets")}>
                  <House size={18} aria-hidden />
                  <span>{home?.name ?? "Find a home"}</span>
                  <ChevronRight size={14} aria-hidden />
                </button>
              </div>
            </>
          )}

          {tab === "study" && (
            <>
              <button type="button" className={styles.hero} onClick={onStudy}>
                <span className={styles.heroLabel}>
                  <BookOpen size={17} />
                  YOUR STUDY SPACE
                </span>
                <strong>Small steps. Real learning.</strong>
                <p>
                  Choose a quest from your subjects, learn the topic, and
                  complete practice rounds to unlock your exam checkpoint.
                </p>
              </button>
              <h2 className={styles.sectionTitle}>Ready when you are</h2>
              <div className={styles.group}>
                <Row
                  title="Choose a study quest"
                  detail={
                    courses.length
                      ? "Your selected subjects · saved quest progress"
                      : "Pick your subjects to build your quest board"
                  }
                  icon={<GraduationCap size={iconSize} />}
                  onClick={onStudy}
                />
                <Row
                  title="Your learning awards"
                  detail="See what you’ve achieved"
                  icon={<Award size={iconSize} />}
                  color="#bd8431"
                  onClick={onAwards}
                />
              </div>
              <h2 className={styles.sectionTitle}>Homework</h2>
              <div className={styles.group}>
                {studyRows.length ? (
                  studyRows.map((quest) => (
                    <Row
                      key={quest.id}
                      title={quest.title}
                      detail={quest.due}
                      icon={
                        quest.done ? (
                          <Check size={iconSize} />
                        ) : (
                          <BookOpen size={iconSize} />
                        )
                      }
                      color={quest.done ? "#228d71" : "#0766ed"}
                      href={quest.href}
                    />
                  ))
                ) : (
                  <p className={styles.empty}>
                    No homework on your list. Pick a subject and practise
                    something new.
                  </p>
                )}
              </div>
              <p className={styles.tip}>
                Your study rewards and learning progress use the same account as
                the desktop platform.
              </p>
            </>
          )}

          {tab === "work" && (
            <>
              {job && (
                <>
                  <div className={styles.profile}>
                    <span
                      className={styles.icon}
                      style={{ background: "#eee8ff", color: "#8460cc" }}
                    >
                      <BriefcaseBusiness size={24} />
                    </span>
                    <div>
                      <h2>{role?.title ?? "Your current job"}</h2>
                      <p className={styles.sub}>
                        {workplace?.name} · {job.shifts} shifts completed
                      </p>
                    </div>
                  </div>
                  <div className={`${styles.group} mt-3`}>
                    <Row
                      title="Clock in"
                      detail="Practise tasks and build your experience"
                      icon={<BriefcaseBusiness size={iconSize} />}
                      onClick={() => onWork(job.workplace)}
                    />
                  </div>
                </>
              )}
              {!job && (
                <p className={styles.sub}>
                  Currently unemployed. Choose a workplace, explore its roles,
                  and try an interview.
                </p>
              )}
              <h2 className={styles.sectionTitle}>
                Find your next opportunity
              </h2>
              <label className={styles.search}>
                <Search size={18} aria-hidden />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search workplaces or sectors"
                  aria-label="Search jobs"
                />
              </label>
              {job && (
                <div className={styles.chips}>
                  <button
                    type="button"
                    aria-pressed={sector === "all"}
                    onClick={() => setSector("all")}
                  >
                    All workplaces
                  </button>
                  <button
                    type="button"
                    aria-pressed={sector === "current"}
                    onClick={() => setSector("current")}
                  >
                    My workplace
                  </button>
                </div>
              )}
              <div className={styles.group}>
                {availableWorkplaces.map((item) => (
                  <Row
                    key={item.id}
                    title={item.name}
                    detail={`${item.sector} · ${item.id === job?.workplace ? "Your workplace" : item.roles[0].title}`}
                    icon={<BriefcaseBusiness size={iconSize} />}
                    color={item.accent}
                    onClick={() => onWork(item.id)}
                  />
                ))}
                {!availableWorkplaces.length && (
                  <p className={styles.empty}>
                    No workplaces match. Try a different search.
                  </p>
                )}
              </div>
              <p className={styles.tip}>
                These are educational work simulations. Interviews, shifts and
                promotions are scored by the platform.
              </p>
            </>
          )}

          {tab === "assets" && (
            <>
              <div className={styles.stat}>
                <span className={styles.statLabel}>
                  <Wallet size={16} />
                  Available balance
                </span>
                <span className={styles.statValue}>
                  {clout.toLocaleString("en-GB")}{" "}
                  <span className="text-base font-medium">Clout</span>
                </span>
                <p className={styles.tip}>
                  Earn through study and simulated work.
                </p>
              </div>
              <h2 className={styles.sectionTitle}>A place of your own</h2>
              <div className={styles.group}>
                <Row
                  title={home?.name ?? "Your home"}
                  detail={`${home?.area ?? "London"} · Visit and decorate`}
                  icon={<House size={iconSize} />}
                  color="#d08936"
                  onClick={onHome}
                />
                <Row
                  title="Buy a house"
                  detail={`${HOMES.length} homes · move between owned homes free`}
                  icon={<House size={iconSize} />}
                  color="#269679"
                  onClick={onHouses}
                />
              </div>
              <h2 className={styles.sectionTitle}>Your collection</h2>
              <div className={styles.group}>
                {HOMES.filter((item) => ownedHomes.includes(item.id)).map(
                  (item) => (
                    <Row
                      key={item.id}
                      title={item.name}
                      detail={`${item.area} · ${item.id === currentHome ? "Current home" : "Owned"}`}
                      icon={<Check size={iconSize} />}
                      color="#249471"
                      onClick={onHouses}
                    />
                  ),
                )}
                <Row
                  title="Garage & vehicles"
                  detail="Browse the dealership"
                  icon={<CarFront size={iconSize} />}
                  color="#6776c3"
                  onClick={onGarage}
                />
                <Row
                  title="Assets & wealth"
                  detail="View your holdings and wallet"
                  icon={<Wallet size={iconSize} />}
                  color="#bd8431"
                  href="/games/wealth"
                />
              </div>
            </>
          )}

          {tab === "more" && (
            <>
              <button type="button" className={styles.hero} onClick={onExplore}>
                <span className={styles.heroLabel}>
                  <Compass size={17} />
                  SAME WORLD. ANOTHER WAY TO PLAY.
                </span>
                <strong>Step into the city.</strong>
                <p>
                  Explore in 3D with a touch joystick. Return to My life
                  whenever you like.
                </p>
              </button>
              <h2 className={styles.sectionTitle}>A moment for yourself</h2>
              <div className={styles.actionGrid}>
                {SELF_CARE.map(({ activity, label, Icon, color }) => (
                  <button
                    type="button"
                    key={activity}
                    disabled={Boolean(resting)}
                    onClick={() => rest(activity, label)}
                  >
                    <Icon size={21} color={color} />
                    <strong>{label}</strong>
                  </button>
                ))}
              </div>
              <p className={styles.tip} role="status" aria-live="polite">
                {resting ??
                  "Take a short pause to replenish your in-game needs."}
              </p>
              <h2 className={styles.sectionTitle}>Your platform</h2>
              <div className={styles.group}>
                <Row
                  title="Arcade"
                  detail="Play a quick game"
                  icon={<Sparkles size={iconSize} />}
                  color="#9a65db"
                  onClick={onArcade}
                />
                <Row
                  title="Friends"
                  detail="Your in-game connections"
                  icon={<Users size={iconSize} />}
                  color="#339b81"
                  href="/games/friends"
                />
                <Row
                  title="Character & outfits"
                  detail="Make your character your own"
                  icon={<Settings2 size={iconSize} />}
                  href="/games/locker"
                />
                <Row
                  title="What If?"
                  detail="Live a different life, one year at a time"
                  icon={<Heart size={iconSize} />}
                  color="#d85a89"
                  href="/games/what-if"
                />
                <Row
                  title="Back to the games menu"
                  detail="Leave this play session"
                  icon={<ChevronRight size={iconSize} />}
                  color="#6e7382"
                  onClick={onLeave}
                />
              </div>
            </>
          )}
        </div>
      </div>
      <footer className={styles.dock}>
        {tab === "life" && (
          <>
            <div className={styles.nextStep}>
              <button
                type="button"
                className={styles.continueButton}
                onClick={onStudy}
              >
                <span className={styles.continueIcon}>
                  <BookOpen size={23} aria-hidden />
                </span>
                <span>
                  <strong>Continue learning</strong>
                  <small>Your subjects. Your next study quest.</small>
                </span>
                <ArrowUpRight size={21} aria-hidden />
              </button>
            </div>
            <div
              className={styles.vitals}
              aria-label={`How you’re doing${needs ? ` · ${moodWord(needs)}` : ""}`}
            >
              {NEEDS.map((need) => (
                <div key={need.id}>
                  <div className={styles.vitalLabel}>
                    <span>{need.label}</span>
                    <span>
                      {needs ? `${Math.round(needs[need.id])}%` : "…"}
                    </span>
                  </div>
                  <div
                    className={styles.vitalMeter}
                    role="progressbar"
                    aria-label={need.label}
                    aria-valuenow={
                      needs ? Math.round(needs[need.id]) : undefined
                    }
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      style={{
                        width: `${needs?.[need.id] ?? 0}%`,
                        background: need.colour,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        <nav className={styles.nav} aria-label="Life navigation">
          {TABS.map(({ id, label, Icon }) => (
            <button
              type="button"
              key={id}
              aria-current={id === tab ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <Icon aria-hidden />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </footer>
    </section>
  );
}
