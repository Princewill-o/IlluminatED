"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { ChevronDown, Grid2X2 } from "lucide-react";

import { PRODUCTS, productForHost, productForPath, umbrellaHref, type ProductId } from "@/lib/learning/products";

export function ProductSwitcher({ initialProduct, compact = false }: { initialProduct?: ProductId; compact?: boolean }) {
  const path = usePathname();
  const [subdomains, setSubdomains] = useState(false);
  const [hub, setHub] = useState("/");
  useEffect(() => {
    const host = window.location.hostname;
    setHub(umbrellaHref(host));
    setSubdomains((host === "illumed.co.uk" || host === "www.illumed.co.uk" || Boolean(productForHost(host))) && process.env.NEXT_PUBLIC_PRODUCT_SUBDOMAINS === "1");
  }, []);
  const current = productForPath(path) ?? PRODUCTS.find(p => p.id === initialProduct);
  return <details key={path} className="group relative">
    <summary className="flex min-h-11 cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-semibold text-foreground hover:bg-muted [&::-webkit-details-marker]:hidden" aria-label="Switch learning product">
      <Grid2X2 className="size-4 shrink-0" aria-hidden />
      {!compact && <span>{current?.name ?? "Products"}</span>}
      <ChevronDown className="size-3 shrink-0 transition group-open:rotate-180" aria-hidden />
    </summary>
    <nav aria-label="Learning products" className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-border bg-background p-2 text-foreground shadow-xl">
      <Link href={hub} className="block rounded-xl px-3 py-3 text-sm font-bold hover:bg-muted">IlluminatED Learning <span className="block text-xs font-normal text-muted-foreground">All four products</span></Link>
      {PRODUCTS.map(p => <Link key={p.id} prefetch={false} href={subdomains ? `https://${p.host}/` : p.path} aria-current={current?.id === p.id ? "page" : undefined} className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted aria-[current=page]:bg-muted">
        <span style={{ background: p.colour }} className="grid size-9 shrink-0 place-items-center rounded-xl font-bold text-white">{p.symbol}</span>
        <span><span className="block text-sm font-bold">{p.name}</span><span className="block text-xs text-muted-foreground">{p.label}</span></span>
      </Link>)}
      <Link href="/school" className="mt-1 block rounded-xl border-t px-3 py-3 text-sm font-semibold hover:bg-muted">School dashboard →</Link>
    </nav>
  </details>;
}
