"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { AccountButton } from "@/components/account/account-button";
import { Logo } from "@/components/brand";
import { ProductBrand, ProductMark } from "@/components/products/product-brand";
import { ProductSwitcher } from "@/components/products/product-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Navbar1, type Navbar1Group } from "@/components/ui/navbar-1";
import { PRODUCTS, productForHost, productForPath, umbrellaHref, type ProductId } from "@/lib/learning/products";
import { LEGAL_LINKS } from "@/lib/site";
import { useSignedIn } from "@/lib/use-signed-in";

const LEARN: Navbar1Group = { label: "Learn", items: [
  { title: "IllumED Slides", href: "/curriculum", description: "Primary and secondary lesson library" },
  { title: "Revision library", href: "/learn", description: "Find your subjects and existing study resources" },
  { title: "GCSE", href: "/gcse", description: "Explore your GCSE subject routes" },
  { title: "A level & sixth form", href: "/a-level", description: "Year 12–13 subjects and resources" },
  { title: "BTEC", href: "/btec", description: "Level 2 and 3 by sector" },
  { title: "T Levels", href: "/t-levels", description: "Technical study and placement routes" },
  { title: "Level 2 & 3", href: "/level-2-3", description: "Functional Skills, Core Maths, EPQ and more" },
  { title: "All courses", href: "/courses", description: "Search and filter the wider course library" },
  { title: "Quiz centre", href: "/quizzes", description: "Topic, mixed and timed practice" },
  { title: "Flashcards", href: "/flashcards", description: "Key terms and retrieval questions" },
  { title: "Ask Tiggy", href: "/tiggy", description: "Explanations and study hints" },
  { title: "Revision planner", href: "/revision", description: "Plan your next study session" },
] };
const SCHOOLS: Navbar1Group = { label: "Schools", items: [
  { title: "School dashboard", href: "/school", description: "Join a class, assign work and see feedback" },
  { title: "Pilot lesson", href: "/world/pilot", description: "A complete Tech Repair Trainee lesson" },
  { title: "For schools & colleges", href: "/schools", description: "School access, pilots and support" },
  { title: "My Work", href: "/world/my-work", description: "Projects, teacher feedback and certificates" },
] };
const HELP: Navbar1Group = { label: "Help", items: [
  { title: "Questions & answers", href: "/faq", description: "Accounts, subjects and getting started" },
  { title: "Plans & pricing", href: "/pricing", description: "Explore account and school options" },
  { title: "About IlluminatED", href: "/about", description: "Our story and what we are building" },
  { title: "Contact", href: "/contact", description: "Ask for help or report a problem" },
  { title: "Safeguarding", href: "/safeguarding", description: "Safety, privacy and responsible learning" },
  { title: "Accessibility", href: "/accessibility", description: "Help using the platform" },
] };
const TOPIC_LINKS: Record<Exclude<ProductId,"world">, Navbar1Group["items"]> = {
  maths: [
    {title:"Percentages",href:"/maths/percentages",description:"Percentages, multipliers and change"},
    {title:"Ratio & proportion",href:"/maths/ratio-proportion",description:"Share quantities and scale recipes"},
    {title:"Profit & financial maths",href:"/maths/profit-financial-maths",description:"Revenue, costs and everyday budgets"},
    {title:"Solo Maths Race",href:"/maths/percentages#practice",description:"Race your best, with accuracy first"},
  ],
  science: [
    {title:"Cells & microscopy",href:"/science/cells-microscopy",description:"Cell structures and magnification"},
    {title:"Particles & materials",href:"/science/particles-materials",description:"States of matter and fair comparisons"},
    {title:"Electricity & circuits",href:"/science/electricity-circuits",description:"Current, resistance and circuit rules"},
    {title:"Inspection evidence",href:"/science/inspection-evidence",description:"Observations, uncertainty and conclusions"},
  ],
  english: [
    {title:"Reading & evidence",href:"/english/reading-evidence",description:"Build an interpretation from the text"},
    {title:"Language analysis",href:"/english/language-analysis",description:"Explain the writer's choices"},
    {title:"Writing for an audience",href:"/english/writing-audience",description:"Draft, compare and revise"},
    {title:"Condition reports",href:"/english/condition-report",description:"Write a clear, useful workplace report"},
  ],
};

function useUmbrellaHref() {
  const [hub, setHub] = useState("/");
  useEffect(() => { setHub(umbrellaHref(window.location.hostname)); }, []);
  return hub;
}

export function LearningHeader({ initialProduct }: { initialProduct?: ProductId }) {
  const path = usePathname();
  const signedIn = useSignedIn();
  const hub = useUmbrellaHref();
  const [hostProduct, setHostProduct] = useState(initialProduct);
  useEffect(() => { setHostProduct(productForHost(window.location.host)?.id); }, []);
  const product = productForPath(path) ?? (path === "/" ? PRODUCTS.find(p => p.id === hostProduct) : undefined);
  const groups: Navbar1Group[] = [
    {label:"Products",items:PRODUCTS.map(p=>({title:p.name,href:p.path,description:p.label,icon:<ProductMark product={p.id} className="size-8" />}))},
    ...(product ? [{label:product.name,items:product.id === "world" ? [
      {title:"Explore IllumWorld",href:"/world",description:"Virtual work experience in a playable city"},
      {title:"Tech Repair Trainee",href:"/world/tech-repair-trainee",description:"Inspect, calculate and explain your decision"},
      {title:"My Work",href:"/world/my-work",description:"Your projects and teacher feedback"},
      {title:"Explore the city",href:"/games/world",description:"Return to the wider game world"},
    ] : TOPIC_LINKS[product.id]}] : []),
    LEARN,SCHOOLS,HELP,
  ];
  return <Navbar1
    logoHref={product?.path ?? hub}
    logoLabel={product ? `${product.name} home` : "IlluminatED Learning home"}
    logo={product ? <><span className="hidden min-[480px]:inline-flex"><ProductBrand product={product.id} /></span><span className="min-[480px]:hidden"><ProductBrand product={product.id} compact /></span></> : <Logo wordmarkClassName="max-[480px]:hidden" />}
    groups={groups}
    actions={<><div className="hidden md:block"><ProductSwitcher initialProduct={product?.id} compact align="right" /></div><ThemeToggle className="size-11 rounded-full" /></>}
    cta={signedIn === false ? <div className="flex items-center gap-2"><Link prefetch={false} href="/sign-in" className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold hover:bg-muted">Log in</Link><Link prefetch={false} href="/sign-in?mode=sign-up" className="inline-flex min-h-11 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Sign up free</Link></div> : <AccountButton className="min-h-11 rounded-full px-4" />}
    mobileCta={<div className="space-y-4"><Link href="/dashboard" className="flex min-h-11 items-center justify-center rounded-full border font-semibold">My learning</Link><AccountButton className="min-h-12 w-full justify-center rounded-full text-base" /></div>}
  />;
}

const FOOTER_GROUPS = [
  {label:"Learn",items:[{href:"/curriculum",title:"IllumED Slides"},{href:"/learn",title:"Revision library"},{href:"/courses",title:"All courses"},{href:"/flashcards",title:"Flashcards"},{href:"/quizzes",title:"Quiz centre"},{href:"/calculator",title:"Grade calculator"},{href:"/careers",title:"Careers"},{href:"/next-steps",title:"Your next steps"}]},
  {label:"Schools",items:[{href:"/school",title:"School dashboard"},{href:"/world/pilot",title:"Pilot lesson"},{href:"/world/my-work",title:"My Work & certificates"},{href:"/schools",title:"For schools & colleges"},{href:"/dashboard",title:"My learning"}]},
  {label:"Get to know us",items:[{href:"/about",title:"About IlluminatED"},{href:"/pricing",title:"Plans & pricing"},{href:"/employers",title:"Employers"},{href:"/creators",title:"Creators"},{href:"/faq",title:"FAQ"},{href:"/your-data",title:"Your data"},{href:"/accessibility",title:"Accessibility"}]},
];

export function LearningFooter() {
  const hub = useUmbrellaHref();
  return <footer className="mt-20 border-t border-border bg-background text-foreground">
    <div className="mx-auto grid max-w-7xl gap-12 px-5 py-12 sm:px-6 lg:grid-cols-[1fr_2.4fr] lg:py-16">
      <div><Link href={hub} aria-label="IlluminatED Learning home" className="inline-flex min-h-11 items-center rounded-xl"><Logo /></Link><p className="mt-5 max-w-xs text-lg font-semibold tracking-tight">One place to grow.</p><p className="mt-3 max-w-xs text-sm leading-7 text-muted-foreground">Four focused products. One pupil account. A world of practice, discovery and work worth keeping.</p><Link href="/school" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold hover:bg-muted">Learn with your class →</Link></div>
      <nav aria-label="Learning footer" className="grid grid-cols-2 gap-x-7 gap-y-10 md:grid-cols-[1.2fr_1fr_1fr_1fr] lg:grid-cols-2 xl:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div><h2 className="text-sm font-semibold">Our products</h2><ul className="mt-4 space-y-4">{PRODUCTS.map(p=><li key={p.id}><Link href={p.path} className="inline-flex min-h-11 items-center rounded-lg hover:text-primary"><ProductBrand product={p.id} className="gap-2 text-sm [&_svg]:size-7" /></Link></li>)}</ul></div>
        {FOOTER_GROUPS.map(group=><div key={group.label}><h2 className="text-sm font-semibold">{group.label}</h2><ul className="mt-4 space-y-2">{group.items.map(item=><li key={item.href}><Link prefetch={false} href={item.href} className="inline-flex min-h-8 items-center text-sm leading-6 text-muted-foreground hover:text-foreground hover:underline underline-offset-4">{item.title}</Link></li>)}</ul></div>)}
      </nav>
    </div>
    <div className="border-t border-border"><div className="mx-auto max-w-7xl px-5 py-7 sm:px-6"><nav aria-label="Legal"><ul className="flex flex-wrap gap-x-6 gap-y-2">{LEGAL_LINKS.map(item=><li key={item.href}><Link prefetch={false} href={item.href} className="inline-flex min-h-8 items-center text-xs font-medium text-muted-foreground hover:text-foreground">{item.title}</Link></li>)}</ul></nav><p className="mt-5 max-w-4xl text-xs leading-6 text-muted-foreground">© {new Date().getFullYear()} IlluminatED Learning. Independent learning resources. Exam-board alignment is stated only where verified. Project certificates record teacher-approved work; they are not regulated qualifications.</p></div></div>
  </footer>;
}
