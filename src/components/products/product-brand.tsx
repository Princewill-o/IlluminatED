import { PRODUCTS, type ProductId } from "@/lib/learning/products";
import { cn } from "@/lib/utils";

const INK = "#1d1a4a";

/** Original coordinated product marks, drawn on a shared 64px grid. */
function WorldMark() {
  return (
    <>
      <rect x="4" y="4" width="56" height="56" rx="17" fill="#7561e8" />
      <path d="M18 50V29a14 14 0 0 1 28 0v21" fill="#fff8e8" />
      <path d="M24 50V30a8 8 0 0 1 16 0v20" fill="#352663" />
      <path d="M25 49V40h5v-6h5v9h5v-5h4v11" fill="#ffd76a" strokeWidth="2" />
      <path d="M15 50h34v6H15z" fill="#fff8e8" />
      <path d="M12 18h4m-2-2v4m35-6h4m-2-2v4" stroke="#fff" strokeWidth="2.5" />
    </>
  );
}

function MathsMark() {
  return (
    <>
      <rect x="4" y="4" width="56" height="56" rx="17" fill="#159985" />
      <path d="M16 18v29h31" fill="none" stroke="#fff8e8" strokeWidth="3" />
      <path d="M21 41V23l19 18z" fill="#a2edcf" />
      <path d="M22 35h5v6" fill="none" strokeWidth="2" />
      <rect
        x="35"
        y="17"
        width="14"
        height="14"
        rx="2"
        transform="rotate(12 42 24)"
        fill="#fff8e8"
      />
      <circle cx="47" cy="46" r="5" fill="#ffd76a" />
    </>
  );
}

function ScienceMark() {
  return (
    <>
      <rect x="4" y="4" width="56" height="56" rx="17" fill="#3979d2" />
      <ellipse
        cx="32"
        cy="32"
        rx="25"
        ry="10"
        transform="rotate(-35 32 32)"
        fill="none"
        stroke="#fff8e8"
        strokeWidth="3"
      />
      <path d="m32 17 13 7v16l-13 7-13-7V24z" fill="#d7edff" />
      <path d="m25 28 7 4 7-4m-7 4v8" fill="none" strokeWidth="2" />
      <circle cx="32" cy="32" r="5" fill="#ffd76a" strokeWidth="2" />
      <path
        d="M45 23c5-1 9-1 10 1s-1 5-5 9"
        fill="none"
        stroke="#fff8e8"
        strokeWidth="3"
      />
      <circle cx="12" cy="43" r="3.5" fill="#fff8e8" strokeWidth="2" />
    </>
  );
}

function EnglishMark() {
  return (
    <>
      <rect x="4" y="4" width="56" height="56" rx="17" fill="#d46583" />
      <path
        d="M12 25c7-3 13-2 20 2 7-4 13-5 20-2v24c-7-3-13-2-20 2-7-4-13-5-20-2z"
        fill="#fff8e8"
      />
      <path
        d="M32 28v22m-14-17 8 2m-8 5 8 2m12-2 7-2"
        fill="none"
        strokeWidth="2"
      />
      <path d="M31 39c-1-10 5-22 17-26 0 12-5 21-14 24z" fill="#ffdc77" />
      <path d="m30 43 13-23m-5 9 6 1" fill="none" strokeWidth="2" />
    </>
  );
}

const MARKS = {
  world: WorldMark,
  maths: MathsMark,
  science: ScienceMark,
  english: EnglishMark,
};

/** Decorative mark. Pair it with a visible product name or an accessible label. */
export function ProductMark({
  product,
  className,
}: {
  product: ProductId;
  className?: string;
}) {
  const Mark = MARKS[product];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 64 64"
      width="64"
      height="64"
      fill="none"
      stroke={INK}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("size-10 shrink-0 overflow-visible", className)}
    >
      <Mark />
    </svg>
  );
}

/** A real text wordmark inherits the surrounding light/dark theme colour. */
export function ProductBrand({
  product,
  className,
  compact = false,
}: {
  product: ProductId;
  className?: string;
  compact?: boolean;
}) {
  const name = PRODUCTS.find((item) => item.id === product)!.name;
  return (
    <span
      className={cn("inline-flex items-center gap-2.5 text-current", className)}
      data-product-brand={product}
    >
      <ProductMark product={product} />
      <span
        className={
          compact
            ? "sr-only"
            : "text-[1.15em] font-black tracking-[-0.035em] whitespace-nowrap"
        }
      >
        {name}
      </span>
    </span>
  );
}
