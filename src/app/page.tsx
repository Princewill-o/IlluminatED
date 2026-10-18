import Image from "next/image";
import Link from "next/link";

import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  Check,
  Gamepad2,
  GraduationCap,
  Play,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";

import styles from "./home.module.css";

import { SiteStructuredData } from "@/components/seo/structured-data";

export const metadata: Metadata = {
  title: { absolute: "IlluminatED | Turn revision into a learning habit" },
  description:
    "A learning game for UK students aged 13+: practise subjects, apply knowledge in simulated workplaces and track progress. Request invited beta access or a school demo.",
  alternates: { canonical: "/" },
};

const steps = [
  {
    icon: BookOpen,
    title: "A little practice.",
    text: "Choose a subject. Try a short question session and understand the answers with clear feedback.",
    label: "Build your knowledge",
    colour: "#dce9dd",
  },
  {
    icon: BriefcaseBusiness,
    title: "A bigger picture.",
    text: "Step into a simulated workplace and apply your knowledge to practical, everyday decisions.",
    label: "Explore your possibilities",
    colour: "#f7dfd0",
  },
  {
    icon: ChartNoAxesCombined,
    title: "Your next step.",
    text: "See what you have practised and where to focus next. Teachers can review their classes’ homework.",
    label: "See your progress",
    colour: "#e4dff0",
  },
];

export default function Home() {
  return (
    <div className={styles.home}>
      <SiteStructuredData />
      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrow}>
              <span className={styles.dot} /> A learning game. A world of
              possibility.
            </div>
            <h1 id="hero-title">
              Make learning
              <br />
              part of your
              <br />
              <em>next adventure.</em>
            </h1>
            <p className={styles.intro}>
              Practise your subjects. Try a future career. Build a learning
              habit in a city that feels like your own.
            </p>
            <div className={styles.actions}>
              <Link href="/book?for=individual" className={styles.primary}>
                Request beta access <ArrowRight size={18} aria-hidden />
              </Link>
              <a href="#gameplay" className={styles.watch}>
                <span>
                  <Play size={13} fill="currentColor" aria-hidden />
                </span>{" "}
                See the game
              </a>
            </div>
            <p className={styles.accessNote}>
              Invited beta · Ages 13+ · Free core study
            </p>
          </div>
          <figure className={styles.heroVisual}>
            <div className={styles.imageFrame}>
              <div className={styles.frameBar}>
                <span>
                  <i /> IlluminatED City
                </span>
                <span>YOUR NEXT CHAPTER</span>
              </div>
              <Image
                src="/landing/game-city-life.webp"
                alt="Actual IlluminatED City gameplay with streets, characters and learning controls"
                width={1440}
                height={960}
                priority
                sizes="(max-width: 800px) 95vw, 55vw"
                className={styles.mainImage}
              />
            </div>
            <div className={styles.questCard}>
              <span className={styles.questIcon}>
                <BookOpen size={20} aria-hidden />
              </span>
              <div>
                <small>YOUR NEXT QUEST</small>
                <strong>A little progress, every day.</strong>
                <span>Study · Explore · Grow</span>
              </div>
              <Sparkles size={17} aria-hidden />
            </div>
            <div className={styles.studyInset}>
              <Image
                src="/landing/game-study-october.jpg"
                alt="The Study Quarter inside IlluminatED"
                width={1440}
                height={960}
                sizes="220px"
              />
              <span>
                <span className={styles.dot} /> Your study spot awaits.
              </span>
            </div>
            <figcaption>
              Actual game captures · ambient residents are computer controlled
            </figcaption>
          </figure>
        </div>
        <div className={styles.heroFoot}>
          <span>
            <Gamepad2 size={17} aria-hidden /> Made for curious minds.
          </span>
          <a href="#learning">
            Explore the possibilities <ArrowDown size={15} aria-hidden />
          </a>
        </div>
      </section>

      <div className={styles.subjectStrip} aria-label="What you can practise">
        <span>Small steps. Real practice.</span>
        {[
          "Subject knowledge",
          "Problem solving",
          "Workplace skills",
          "Independent learning",
        ].map((text) => (
          <span key={text}>
            <span aria-hidden>✦</span>
            {text}
          </span>
        ))}
      </div>

      <section
        id="learning"
        className={styles.section}
        aria-labelledby="learning-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>PLAY WITH PURPOSE</p>
            <h2 id="learning-title">
              More than a place to play.
              <br />
              <em>A reason to keep learning.</em>
            </h2>
          </div>
          <p>
            One connected journey from “let me try” to “now I understand”. Short
            practice, useful feedback and a clear next step.
          </p>
        </div>
        <div className={styles.steps}>
          {steps.map(({ icon: Icon, title, text, label, colour }, i) => (
            <article key={title} className={styles.step}>
              <div className={styles.stepTop}>
                <span style={{ background: colour }}>
                  <Icon size={24} strokeWidth={1.6} aria-hidden />
                </span>
                <small>0{i + 1}</small>
              </div>
              <h3>{title}</h3>
              <p>{text}</p>
              <div className={styles.stepLabel}>
                <span>{label}</span>
                <ArrowRight size={17} aria-hidden />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="gameplay"
        className={styles.gameSection}
        aria-labelledby="gameplay-title"
      >
        <div className={styles.gameGrid}>
          <div>
            <p className={styles.kicker}>WELCOME TO YOUR WORLD</p>
            <h2 id="gameplay-title">
              Your subjects.
              <br />
              Your ambitions.
              <br />
              <em>Your city.</em>
            </h2>
            <p>
              Take a seat in the Study Quarter. Walk into a workplace and use a
              computer to start a challenge. Make space for what comes next.
            </p>
            <ul>
              {[
                "Short question sessions with explanations",
                "Simulated roles that put knowledge into practice",
                "Earned Clout to personalise your character and home",
              ].map((text) => (
                <li key={text}>
                  <Check size={17} aria-hidden />
                  {text}
                </li>
              ))}
            </ul>
            <Link href="/revision-games" className={styles.textLink}>
              Get to know the game <ArrowRight size={17} aria-hidden />
            </Link>
          </div>
          <figure className={styles.videoFrame}>
            <div className={styles.videoHeading}>
              <span>
                <span className={styles.dot} /> A LOOK INSIDE
              </span>
              <span>00:12</span>
            </div>
            <video
              controls
              playsInline
              preload="none"
              poster="/landing/game-city-life.webp"
            >
              <source src="/landing/gameplay.webm" type="video/webm" />
              <a href="/landing/gameplay.webm">Download the gameplay clip</a>
            </video>
            <figcaption>
              Actual offline preview · silent clip · no real student
              conversations
            </figcaption>
          </figure>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="access-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.kicker}>FIND YOUR WAY IN</p>
            <h2 id="access-title">
              A place for learners.
              <br />
              <em>A partner for schools.</em>
            </h2>
          </div>
          <p>
            We are opening through an invited beta, with clear access options
            and a focused school pilot.
          </p>
        </div>
        <div className={styles.accessGrid}>
          <article className={styles.learnerCard}>
            <span className={styles.pill}>
              <Gamepad2 size={14} aria-hidden /> FOR LEARNERS
            </span>
            <h3>Start with curiosity.</h3>
            <p>
              Invited individual learners get free core study. Explore your
              subjects and track your progress, with optional Premium at
              £5.99/month when available.
            </p>
            <Link href="/book?for=individual" className={styles.primary}>
              Request beta access <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/pricing" className={styles.smallLink}>
              See access and pricing
            </Link>
          </article>
          <article className={styles.schoolCard}>
            <span className={styles.pill}>
              <GraduationCap size={16} aria-hidden /> FOR SCHOOLS & COLLEGES
            </span>
            <h3>Give practice a purpose.</h3>
            <p>
              Connect teacher-set homework with a world students can explore.
              Review class submissions and topic gaps. Licence seats, price and
              pilot scope are agreed in writing.
            </p>
            <Link href="/book?for=school" className={styles.lightButton}>
              Let’s talk about your learners{" "}
              <ArrowRight size={18} aria-hidden />
            </Link>
            <Link href="/schools" className={styles.smallLink}>
              Explore the school workspace
            </Link>
          </article>
        </div>
        <div className={styles.partnerLine}>
          <span>Interested in the business behind the world?</span>
          <Link href="/investors">
            Read the investor overview <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </section>

      <section className={styles.trust} aria-label="Beta information">
        <ShieldCheck size={25} strokeWidth={1.5} aria-hidden />
        <div>
          <h2>Built with care. Growing through feedback.</h2>
          <p>
            For ages 13+. Beta access is by invitation. We are testing
            reliability, engagement and learning outcomes; improved exam grades
            have not been independently demonstrated. Workplace activities are
            simulations, and Clout has no cash value.
          </p>
          <div>
            <Link href="/safeguarding">Safeguarding</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/contact">Get in touch</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
