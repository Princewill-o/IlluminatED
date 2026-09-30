import { proxyGet } from "@/lib/server/proxy";

// Open Library search. Their guidance asks recurring apps to identify themselves
// with a User-Agent containing the app name and a contact. Set OPEN_LIBRARY_CONTACT
// (an email address) in your environment before deploying.
export async function GET(req: Request) {
  const contact = process.env.OPEN_LIBRARY_CONTACT;
  return proxyGet(
    req,
    "https://openlibrary.org/search.json",
    { q: 120, limit: 2, fields: 200 },
    {
      revalidate: 86400,
      headers: {
        "User-Agent": `IlluminatED/1.0${contact ? ` (${contact})` : ""}`,
      },
    },
  );
}
