import Image from "next/image";

import { cn } from "@/lib/utils";

/** Lion head + wordmark. Navy wordmark on light backgrounds, white on dark. */
export function Logo({
  className,
  wordmarkClassName,
}: {
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <Image
        src="/brand/lion-head.webp"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-full bg-[#173c78]"
        priority
      />
      <span
        className={cn("relative block h-[18px] w-[118px]", wordmarkClassName)}
      >
        <Image
          src="/brand/wordmark-navy.webp"
          alt="IlluminatED"
          fill
          sizes="118px"
          className="object-contain object-left dark:hidden"
          priority
        />
        <Image
          src="/brand/wordmark-white.webp"
          alt="IlluminatED"
          fill
          sizes="118px"
          className="hidden object-contain object-left dark:block"
          priority
        />
      </span>
    </span>
  );
}

/**
 * The IlluminatED lion. Light theme: white shirt with navy lettering.
 * Dark theme: navy shirt with white lettering. Both are separate artworks
 * (no CSS filters), aligned on the same canvas so the swap doesn't jump.
 */
export function Mascot({
  className,
  priority,
  sizes = "(min-width: 1024px) 420px, 70vw",
}: {
  className?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <span className={cn("relative block aspect-[797/960]", className)}>
      <Image
        src="/brand/mascot-light.webp"
        alt="Leo the IlluminatED lion mascot, smiling, wearing a white IlluminatED T-shirt"
        fill
        sizes={sizes}
        priority={priority}
        className="object-contain dark:hidden"
      />
      <Image
        src="/brand/mascot-dark.webp"
        alt="Leo the IlluminatED lion mascot, smiling, wearing a navy IlluminatED T-shirt"
        fill
        sizes={sizes}
        priority={priority}
        className="hidden object-contain dark:block"
      />
    </span>
  );
}
