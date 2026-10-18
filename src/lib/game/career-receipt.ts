import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

export interface CareerReceipt { id:string; user:string; workplace:string; role:string; mode:"shift"|"interview"; seed:number; started:number }
export function issueCareerReceipt(data: Omit<CareerReceipt,"id"|"started">, secret:string, now=Date.now()) {
  const receipt = {...data,id:randomUUID(),started:now};
  const body = Buffer.from(JSON.stringify(receipt)).toString("base64url");
  return `${body}.${createHmac("sha256",secret).update(body).digest("base64url")}`;
}
export function readCareerReceipt(token:string, user:string, secret:string, now=Date.now()): CareerReceipt | null {
  if (token.length > 2048 || secret.length < 32) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const expected = createHmac("sha256",secret).update(parts[0]).digest();
    const supplied = Buffer.from(parts[1],"base64url");
    if (expected.length !== supplied.length || !timingSafeEqual(expected,supplied)) return null;
    const value = JSON.parse(Buffer.from(parts[0],"base64url").toString()) as CareerReceipt;
    if (value.user !== user || !["shift","interview"].includes(value.mode) || !Number.isInteger(value.seed) || value.seed < 1 || !Number.isFinite(value.started) || value.started > now || now-value.started > 3_600_000) return null;
    return value;
  } catch { return null; }
}
