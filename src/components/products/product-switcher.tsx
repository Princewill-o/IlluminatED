"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDown, Grid2X2 } from "lucide-react";

import { ProductMark } from "@/components/products/product-brand";
import { PRODUCTS, productForHost, productForPath, umbrellaHref, type ProductId } from "@/lib/learning/products";
import { cn } from "@/lib/utils";

export function ProductSwitcher({ initialProduct, compact = false, align = "left" }: { initialProduct?: ProductId; compact?: boolean; align?: "left" | "right" }) {
  const path = usePathname();
  const [subdomains, setSubdomains] = useState(false);
  const [hub, setHub] = useState("/");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const host = window.location.hostname;
    setHub(umbrellaHref(host));
    setSubdomains((host === "illumed.co.uk" || host === "www.illumed.co.uk" || Boolean(productForHost(host))) && process.env.NEXT_PUBLIC_PRODUCT_SUBDOMAINS === "1");
  }, []);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      const details = detailsRef.current;
      if (!details?.open) return;
      if (event instanceof KeyboardEvent && event.key === "Escape") {
        details.open = false;
        details.querySelector("summary")?.focus();
      } else if (event instanceof MouseEvent && !details.contains(event.target as Node)) details.open = false;
    };
    window.addEventListener("keydown",close);window.addEventListener("mousedown",close);
    return () => {window.removeEventListener("keydown",close);window.removeEventListener("mousedown",close);};
  },[]);
  const current = productForPath(path) ?? PRODUCTS.find(p => p.id === initialProduct);
  return <details key={path} ref={detailsRef} className="group relative" onClick={(event)=>{if((event.target as HTMLElement).closest("a"))event.currentTarget.open=false;}}>
    <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center gap-2 rounded-full border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden" aria-label={`Switch learning product${current ? `, current product ${current.name}` : ""}`}>
      {current ? <ProductMark product={current.id} className="size-5 shrink-0" /> : <Grid2X2 className="size-4 shrink-0" aria-hidden />}
      {!compact && <span>{current?.name ?? "Products"}</span>}
      <ChevronDown className="size-3 shrink-0 transition group-open:rotate-180" aria-hidden />
    </summary>
    <nav aria-label="Learning products" className={cn("absolute top-full z-50 mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-xl",align === "right" ? "right-0" : "left-0")}>
      <Link href={hub} className="block rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted">IlluminatED Learning <span className="block text-xs font-normal text-muted-foreground">All four products</span></Link>
      {PRODUCTS.map(p => <Link key={p.id} prefetch={false} href={subdomains ? `https://${p.host}/` : p.path} aria-current={current?.id === p.id ? "page" : undefined} className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted aria-[current=page]:bg-muted">
        <ProductMark product={p.id} className="size-10 shrink-0" />
        <span><span className="block text-sm font-bold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.label}</span></span>
      </Link>)}
      <Link href="/school" className="mt-1 block rounded-xl border-t px-3 py-3 text-sm font-semibold hover:bg-muted">School dashboard →</Link>
    </nav>
  </details>;
}
