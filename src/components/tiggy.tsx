"use client";

import Image from "next/image";

import {
  BookOpen,
  GraduationCap,
  Hand,
  Lightbulb,
  type LucideIcon,
  PartyPopper,
  Search,
  Timer,
} from "lucide-react";
import {
  motion,
  type TargetAndTransition,
  useReducedMotion,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Tiggy, the IlluminatED lion.
 *
 * Each action can have its own artwork in /public/brand/tiggy/<action>.webp
 * (transparent background, same framing as the main mascot). Set `art: true`
 * once a file is added. Until then Tiggy uses the standard mascot with a prop
 * badge and a small animation for the action, so every placement works today.
 */
export const TIGGY_ACTIONS = {
  wave: {
    art: true,
    alt: "Tiggy the lion waving hello",
    icon: Hand,
    motion: { rotate: [0, -4, 4, -3, 0] },
  },
  read: {
    art: true,
    alt: "Tiggy the lion reading",
    icon: BookOpen,
    motion: { y: [0, -3, 0] },
  },
  graduate: {
    art: true,
    alt: "Tiggy the lion in a graduation cap",
    icon: GraduationCap,
    motion: { y: [0, -6, 0] },
  },
  celebrate: {
    art: false,
    alt: "Tiggy the lion celebrating",
    icon: PartyPopper,
    motion: { y: [0, -10, 0], rotate: [0, -3, 3, 0] },
  },
  time: {
    art: false,
    alt: "Tiggy the lion with a stopwatch",
    icon: Timer,
    motion: { rotate: [0, 2, -2, 0] },
  },
  search: {
    art: false,
    alt: "Tiggy the lion searching with a magnifying glass",
    icon: Search,
    motion: { x: [0, 3, -3, 0] },
  },
  think: {
    art: false,
    alt: "Tiggy the lion thinking",
    icon: Lightbulb,
    motion: { rotate: [0, -3, 0] },
  },
} satisfies Record<
  string,
  { art: boolean; alt: string; icon: LucideIcon; motion: TargetAndTransition }
>;

export type TiggyAction = keyof typeof TIGGY_ACTIONS;

export function Tiggy({
  action = "wave",
  say,
  sayClassName,
  className,
  priority,
  sizes = "(min-width: 1024px) 360px, 40vw",
  alt,
  label,
}: {
  action?: TiggyAction;
  /** Optional speech bubble. */
  say?: string;
  /** Position the bubble, e.g. "left-[80%] top-[10%]". */
  sayClassName?: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  /** Pass "" when the image is purely decorative. */
  alt?: string;
  /** Same as alt. */
  label?: string;
}) {
  const a = TIGGY_ACTIONS[action];
  const reduce = useReducedMotion();
  const text = alt ?? label ?? a.alt;
  const Icon = a.icon;
  return (
    <span className={cn("relative block", className)}>
      <motion.span
        className="relative block aspect-[797/960]"
        animate={reduce ? undefined : a.motion}
        transition={{
          duration: 2.6,
          repeat: Infinity,
          repeatDelay: 1.4,
          ease: "easeInOut",
        }}
      >
        {a.art ? (
          <Image
            src={`/brand/tiggy/${action}.webp`}
            alt={text}
            fill
            sizes={sizes}
            priority={priority}
            className="object-contain"
          />
        ) : (
          <>
            <Image
              src="/brand/mascot-light.webp"
              alt={text}
              fill
              sizes={sizes}
              priority={priority}
              className="object-contain dark:hidden"
            />
            <Image
              src="/brand/mascot-dark.webp"
              alt={text}
              fill
              sizes={sizes}
              priority={priority}
              className="hidden object-contain dark:block"
            />
            <motion.span
              aria-hidden
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 14,
                delay: 0.2,
              }}
              className="bg-primary text-primary-foreground ring-background absolute right-[4%] bottom-[18%] grid aspect-square w-[28%] place-items-center rounded-full shadow-lg ring-4"
            >
              <Icon className="size-[55%]" strokeWidth={2.2} />
            </motion.span>
          </>
        )}
      </motion.span>
      {say && (
        <motion.span
          initial={{ opacity: 0, scale: 0.8, y: 6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{
            delay: 0.35,
            type: "spring",
            stiffness: 240,
            damping: 16,
          }}
          className={cn(
            "bg-card text-foreground absolute top-0 left-full z-10 w-max max-w-[14rem] rounded-2xl rounded-bl-sm border px-3.5 py-2 text-sm leading-snug font-medium shadow-md",
            sayClassName,
          )}
        >
          {say}
        </motion.span>
      )}
    </span>
  );
}
