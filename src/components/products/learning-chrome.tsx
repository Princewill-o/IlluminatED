"use client";

import { useEffect, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/account/account-button";
import { ProductSwitcher } from "@/components/products/product-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { PRODUCTS, productForHost, productForPath, umbrellaHref, type ProductId } from "@/lib/learning/products";

function useUmbrellaHref() {
  const [hub, setHub] = useState("/");
  useEffect(() => { setHub(umbrellaHref(window.location.hostname)); }, []);
  return hub;
}

export function LearningHeader({ initialProduct }: { initialProduct?: ProductId }) {
  const path = usePathname();
  const hub = useUmbrellaHref();
  const [hostProduct, setHostProduct] = useState(initialProduct);
  useEffect(() => { setHostProduct(productForHost(window.location.host)?.id); }, []);
  const product = productForPath(path) ?? (path === "/" ? PRODUCTS.find(p => p.id === hostProduct) : undefined);
  return <header className="relative z-40 border-b border-border bg-background text-foreground">
    <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href={product?.path ?? hub} className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight">
        <Image src="/brand/lion-head.webp" width={36} height={36} alt="" className="size-9 rounded-xl" priority />
        <span className="leading-tight"><span className="block text-lg">{product?.name ?? "IlluminatED Learning"}</span><span className="block text-[11px] font-medium tracking-normal text-muted-foreground">{product ? "by IlluminatED Learning" : "Work experience. Skills for life."}</span></span>
      </Link>
      <div className="flex items-center gap-2"><div className="hidden sm:block"><ProductSwitcher initialProduct={product?.id} /></div><ThemeToggle /><AccountButton className="min-h-11 rounded-xl border px-3" /></div>
      <nav aria-label={product ? `${product.name} navigation` : "Learning navigation"} className="flex w-full flex-wrap items-center gap-x-6 gap-y-2 text-sm sm:gap-x-8">
        <div className="sm:hidden"><ProductSwitcher initialProduct={product?.id} /></div>
        {product?.id === "world" ? <><Link href="/world" className="py-2 font-semibold">Overview</Link><Link href="/world/tech-repair-trainee" className="py-2 font-semibold">Tech Repair Trainee</Link><Link href="/world/my-work" className="py-2 font-semibold">My Work</Link><Link href="/world/pilot" className="py-2 font-semibold">School pilot</Link></> : product ? <><Link href={product.path} className="py-2 font-semibold">Topic packs</Link><Link href="/dashboard" className="py-2 font-semibold">My learning</Link><Link href="/school" className="py-2 font-semibold">Class assignments</Link></> : <><Link href="/#products" className="py-2 font-semibold">Explore products</Link><Link href="/world/pilot" className="py-2 font-semibold">School pilot</Link><Link href="/curriculum" className="py-2 font-semibold">Resource library</Link><Link href="/school" className="py-2 font-semibold">School dashboard</Link></>}
      </nav>
    </div>
  </header>;
}

export function LearningFooter() {
  const hub = useUmbrellaHref();
  return <footer className="mt-16 border-t border-border bg-background text-foreground">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-[1fr_2fr] sm:px-6">
      <div><Link href={hub} className="text-lg font-bold">IlluminatED Learning</Link><p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">Four focused products. One account.<br />Learn independently or with your class.</p></div>
      <nav aria-label="Learning footer" className="flex flex-wrap content-start gap-x-6 gap-y-4 text-sm">
        {PRODUCTS.map(p => <Link key={p.id} href={p.path} className="font-semibold">{p.name}</Link>)}
        <Link href="/curriculum">Existing resource library</Link><Link href="/school">School dashboard</Link><Link href="/privacy">Privacy</Link><Link href="/safeguarding">Safeguarding</Link><Link href="/accessibility">Accessibility</Link><Link href="/contact">Contact</Link>
      </nav>
      <p className="text-xs leading-6 text-muted-foreground sm:col-span-2">© {new Date().getFullYear()} IlluminatED Learning. Independent learning resources. Exam-board alignment is stated only where verified. Project certificates record teacher-approved work; they are not regulated qualifications.</p>
    </div>
  </footer>;
}
