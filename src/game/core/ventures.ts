export const VENTURE_SECTORS = [
  {
    id: "cafe",
    name: "Neighbourhood café",
    description:
      "Serve the city. Learn about supplies, pricing and customer service.",
    unit: "lunch boxes",
    price: 8,
    cost: 3,
    colour: "#b86c42",
    customer: "Nia · community organiser",
  },
  {
    id: "studio",
    name: "Creative studio",
    description:
      "Build a small design team and deliver commissions for local clients.",
    unit: "poster designs",
    price: 18,
    cost: 6,
    colour: "#7662b0",
    customer: "Theo · music promoter",
  },
  {
    id: "workshop",
    name: "Repair workshop",
    description: "Repair bikes, manage parts and keep your customers moving.",
    unit: "bike repairs",
    price: 14,
    cost: 5,
    colour: "#387c74",
    customer: "Jules · cycle club captain",
  },
] as const;
export const VENTURE_STAFF = [
  {
    id: "amara",
    name: "Amara",
    role: "Operations",
    description: "Organises supplies and adds one order slot.",
    x: 7,
    y: 6,
  },
  {
    id: "kai",
    name: "Kai",
    role: "Customer care",
    description: "Handles the customer desk and adds one order slot.",
    x: 23,
    y: 6,
  },
  {
    id: "priya",
    name: "Priya",
    role: "Production",
    description: "Supports the workshop and adds one order slot.",
    x: 15,
    y: 16,
  },
] as const;
export interface Venture {
  user_id: string;
  name: string;
  sector: string;
  credits: number;
  revenue: number;
  costs: number;
  level: number;
  staff: string[];
  orders_completed: number;
  orders_today: number;
  revision: number;
}
export function ventureOrder(v: Venture) {
  const sector =
    VENTURE_SECTORS.find((s) => s.id === v.sector) ?? VENTURE_SECTORS[0];
  const quantity = 4 + (v.orders_completed % 4) + v.level + v.staff.length;
  return {
    sector,
    quantity,
    wages: v.staff.length * 4,
    revenue: quantity * sector.price,
    cost: quantity * sector.cost + v.staff.length * 4,
  };
}
