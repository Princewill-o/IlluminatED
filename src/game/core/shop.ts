/**
 * MegaMart: the in-game online superstore. Order from the browser, a courier brings it to your
 * front door, and what you buy goes in your pantry to use later. Prices and effects are
 * mirrored server-side in private.shop_items (supabase shop_checkout sets the real total).
 */
import type { Activity } from "./needs";

export type Department = "Groceries" | "Snacks & drinks" | "Health & beauty" | "Books & study" | "Home" | "Pet shop";
export type ShopItem = { id: string; name: string; dept: Department; price: number; use: Activity; blurb: string; colour: string; label: string };

export const SHOP_ITEMS: ShopItem[] = [
  { id: "veg-box", name: "Fresh veg box", dept: "Groceries", price: 12, use: "meal", blurb: "Carrots, peppers, broccoli and potatoes for a proper dinner.", colour: "#4f9d47", label: "VEG" },
  { id: "pasta-kit", name: "Pasta night kit", dept: "Groceries", price: 9, use: "meal", blurb: "Pasta, tomato sauce and cheese. Dinner in 15 minutes.", colour: "#e4572e", label: "PASTA" },
  { id: "bread-eggs", name: "Bread and eggs", dept: "Groceries", price: 6, use: "eat", blurb: "Breakfast sorted: a loaf and six free-range eggs.", colour: "#d9a35b", label: "BKFST" },
  { id: "fruit-bowl", name: "Fruit bowl", dept: "Groceries", price: 7, use: "eat", blurb: "Apples, bananas and satsumas.", colour: "#f2a541", label: "FRUIT" },
  { id: "meal-deal", name: "Meal deal", dept: "Snacks & drinks", price: 5, use: "meal", blurb: "Sandwich, snack and a drink.", colour: "#7a5ce6", label: "DEAL" },
  { id: "flat-white", name: "Coffee pods", dept: "Snacks & drinks", price: 6, use: "coffee", blurb: "A flat white whenever you need to focus.", colour: "#6b4a2b", label: "COFFEE" },
  { id: "sports-drink", name: "Sports drink", dept: "Snacks & drinks", price: 3, use: "drink", blurb: "Isotonic, no added sugar. A quick lift.", colour: "#2b8fd9", label: "SPORT" },
  { id: "popcorn", name: "Movie-night popcorn", dept: "Snacks & drinks", price: 4, use: "watch", blurb: "Sweet and salty, for a film at home.", colour: "#ffd166", label: "POP" },
  { id: "shower-gel", name: "Shower gel and shampoo", dept: "Health & beauty", price: 5, use: "shower", blurb: "Fresh citrus. Feel brand new.", colour: "#4ec2c9", label: "FRESH" },
  { id: "plasters", name: "First-aid kit", dept: "Health & beauty", price: 8, use: "medicine", blurb: "Plasters, bandages and paracetamol for grown-ups.", colour: "#c8322d", label: "AID" },
  { id: "revision-guide", name: "Revision guide", dept: "Books & study", price: 10, use: "study", blurb: "Topic summaries, exam questions and answers.", colour: "#2b5fd9", label: "GUIDE" },
  { id: "novel", name: "Paperback novel", dept: "Books & study", price: 7, use: "relax", blurb: "A page-turner for a quiet evening.", colour: "#704c47", label: "BOOK" },
  { id: "headphones", name: "Headphones", dept: "Home", price: 25, use: "music", blurb: "Wireless, comfy, great for music.", colour: "#13203a", label: "AUDIO" },
  { id: "candles", name: "Scented candles", dept: "Home", price: 8, use: "relax", blurb: "Lavender and cedar. Instant calm.", colour: "#b58ad8", label: "CALM" },
  { id: "pet-food", name: "Pet food", dept: "Pet shop", price: 6, use: "eat", blurb: "Tasty and healthy for any pet. Use it to feed your pet.", colour: "#c8955c", label: "PET" },
  { id: "pet-toy", name: "Squeaky toy", dept: "Pet shop", price: 4, use: "arcade", blurb: "Your pet will love chasing it.", colour: "#ff5a7a", label: "TOY" },
];
export const DEPARTMENTS: Department[] = ["Groceries", "Snacks & drinks", "Health & beauty", "Books & study", "Home", "Pet shop"];
export const shopItem = (id: string) => SHOP_ITEMS.find((i) => i.id === id) ?? null;

export type Speed = "standard" | "express";
/** Standard delivery is free and takes about three minutes; express costs 5 Clout and takes under a minute. */
export const DELIVERY: Record<Speed, { label: string; fee: number; seconds: number }> = {
  standard: { label: "Standard · about 3 minutes", fee: 0, seconds: 180 },
  express: { label: "Express · under a minute", fee: 5, seconds: 45 },
};
export const MAX_QTY = 10;
export function basketTotal(lines: { id: string; qty: number }[], speed: Speed) {
  return lines.reduce((t, l) => t + (shopItem(l.id)?.price ?? 0) * Math.max(1, Math.min(MAX_QTY, l.qty)), 0) + DELIVERY[speed].fee;
}
