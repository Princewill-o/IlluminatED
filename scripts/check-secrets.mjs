// Prints filenames/rule names only, never a credential or matching source line.
import fs from "node:fs";
import { execFileSync } from "node:child_process";
const files = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8", maxBuffer: 20000000 },
)
  .split("\0")
  .filter(Boolean);
const rules = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  [
    "GitHub credential",
    /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/,
  ],
  ["Stripe secret", /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}/],
  ["Supabase secret", /\bsb_secret_[A-Za-z0-9_-]{20,}/],
  ["OpenAI secret", /\bsk-(?:proj-)?[A-Za-z0-9_-]{30,}/],
  ["AWS access key", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
];
let matches = 0,
  scanned = 0;
for (const file of new Set(files)) {
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  if (/(?:^|\/)\.env(?:\.|$)/.test(file) && file !== ".env.example") {
    console.error(`${file}: environment file must not be tracked`);
    matches++;
    continue;
  }
  if (/\.(?:pem|key|p12|pfx)$/i.test(file)) {
    console.error(`${file}: private-key container must not be tracked`);
    matches++;
    continue;
  }
  const bytes = fs.readFileSync(file);
  if (bytes.includes(0) || bytes.length > 5000000) continue;
  const text = bytes.toString("utf8");
  scanned++;
  for (const [name, pattern] of rules)
    if (pattern.test(text)) {
      console.error(`${file}: ${name}`);
      matches++;
    }
  for (const token of text.match(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ) ?? []) {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString(),
      );
      if (payload.role === "service_role") {
        console.error(`${file}: privileged Supabase JWT`);
        matches++;
      }
    } catch {
      /* Not a JWT. */
    }
  }
  if (
    /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE_KEY|OAK_API_KEY|REED_API_KEY|APPRENTICESHIPS_API_KEY)\s*=\s*[^\s#]/.test(
      text,
    )
  ) {
    console.error(
      `${file}: private credential configured for browser exposure`,
    );
    matches++;
  }
}
if (process.argv.includes("--history")) {
  const history = execFileSync(
    "git",
    ["log", "--all", "--format=commit %H%n%B", "--patch", "--no-ext-diff"],
    { encoding: "utf8", maxBuffer: 100000000 },
  );
  for (const [name, pattern] of rules)
    if (pattern.test(history)) {
      console.error(`Git history: ${name}`);
      matches++;
    }
  let privileged = false;
  for (const token of history.match(
    /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
  ) ?? []) {
    try {
      if (
        JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString())
          .role === "service_role"
      )
        privileged = true;
    } catch {
      /* Not a JWT. */
    }
  }
  if (privileged) {
    console.error("Git history: privileged Supabase JWT");
    matches++;
  }
  console.log(
    "Git history checked for the same credential formats and privileged JWTs.",
  );
}
console.log(
  `Credential scan: ${scanned} text files; ${matches} findings. Public Supabase/Stripe publishable identifiers are deliberately not treated as private credentials.`,
);
if (matches) process.exitCode = 1;
