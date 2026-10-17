import "server-only";

/**
 * Real tech events for in-game adverts: hackathons and big-name tech meetups in
 * London, from Luma's public discover feed (no key needed). Optionally also
 * Eventbrite when EVENTBRITE_TOKEN is set. Cached for a few hours; if the feeds
 * can't be reached we show no event ads rather than inventing any.
 */
export interface TechEvent {
  id: string;
  name: string;
  url: string;
  start: string;
  where: string;
  host: string | null;
  free: boolean | null;
  hackathon: boolean;
  source: "Luma" | "Eventbrite";
}

const BIG = /\b(google|deepmind|microsoft|amazon|aws|meta|openai|anthropic|nvidia|apple|github|stripe|spotify|ibm|intel|salesforce|cloudflare|vercel|databricks|hugging ?face|bloomberg|monzo|revolut|deloitte|accenture|pwc|mckinsey)\b/i;
const TECH = /hack|ai\b|a\.i\.|machine learning|\bml\b|llm|developer|devs?\b|coding|code|engineer|startup|founder|tech|data|cyber|cloud|web3|product|design sprint|robot/i;

type LumaEntry = {
  event?: { api_id?: string; name?: string; url?: string; start_at?: string; location_type?: string; geo_address_info?: { city_state?: string; full_address?: string } | null };
  hosts?: { name?: string }[];
  calendar?: { name?: string };
  ticket_info?: { is_free?: boolean } | null;
};

async function luma(query: string): Promise<TechEvent[]> {
  const res = await fetch(`https://api.luma.com/discover/get-paginated-events?${query}&pagination_limit=50`, {
    headers: { accept: "application/json" },
    next: { revalidate: 60 * 60 * 3 },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { entries?: LumaEntry[] };
  return (data.entries ?? []).flatMap((e) => {
    const ev = e.event;
    if (!ev?.name || !ev.url || !ev.start_at) return [];
    const host = e.hosts?.[0]?.name ?? e.calendar?.name ?? null;
    return [
      {
        id: `luma-${ev.api_id ?? ev.url}`,
        name: ev.name,
        url: `https://luma.com/${ev.url}`,
        start: ev.start_at,
        where: ev.location_type === "online" ? "Online" : ev.geo_address_info?.city_state ?? "London",
        host,
        free: e.ticket_info?.is_free ?? null,
        hackathon: /hack/i.test(ev.name),
        source: "Luma" as const,
      },
    ];
  });
}

async function eventbrite(): Promise<TechEvent[]> {
  const token = process.env.EVENTBRITE_TOKEN;
  const org = process.env.EVENTBRITE_ORGANIZATION_IDS; // comma-separated organisers to feature
  if (!token || !org) return [];
  const lists = await Promise.all(
    org.split(",").map(async (id) => {
      const r = await fetch(`https://www.eventbriteapi.com/v3/organizations/${id.trim()}/events/?status=live&order_by=start_asc`, {
        headers: { Authorization: `Bearer ${token}` },
        next: { revalidate: 60 * 60 * 3 },
      });
      if (!r.ok) return [];
      const d = (await r.json()) as { events?: { id: string; name?: { text?: string }; url?: string; start?: { utc?: string }; online_event?: boolean; is_free?: boolean }[] };
      return (d.events ?? []).map((e) => ({
        id: `eb-${e.id}`,
        name: e.name?.text ?? "Event",
        url: e.url ?? "https://www.eventbrite.co.uk",
        start: e.start?.utc ?? new Date().toISOString(),
        where: e.online_event ? "Online" : "London",
        host: null,
        free: e.is_free ?? null,
        hackathon: /hack/i.test(e.name?.text ?? ""),
        source: "Eventbrite" as const,
      }));
    }),
  );
  return lists.flat();
}

export async function techEvents(): Promise<TechEvent[]> {
  try {
    const [london, tech, eb] = await Promise.all([
      luma("slug=london").catch(() => []),
      luma("slug=tech&latitude=51.5072&longitude=-0.1276").catch(() => []),
      eventbrite().catch(() => []),
    ]);
    const now = Date.now();
    const seen = new Set<string>();
    return [...london, ...tech, ...eb]
      .filter((e) => {
        if (seen.has(e.url)) return false;
        seen.add(e.url);
        const when = Date.parse(e.start);
        return when > now - 3 * 3600_000 && when < now + 45 * 86400_000 && (TECH.test(e.name) || BIG.test(`${e.name} ${e.host ?? ""}`));
      })
      // Hackathons first, then big-name hosts, then soonest.
      .sort((a, b) => Number(b.hackathon) - Number(a.hackathon) || Number(BIG.test(`${b.name} ${b.host}`)) - Number(BIG.test(`${a.name} ${a.host}`)) || Date.parse(a.start) - Date.parse(b.start))
      .slice(0, 24);
  } catch {
    return [];
  }
}
