/** Configuration checks are not evidence that a provider works in production. */
export function launchReadiness(env: Record<string,string|undefined>) {
  const present = (key:string) => Boolean(env[key]?.trim());
  return [
    {id:"account",label:"Account service configured",ready:present("NEXT_PUBLIC_SUPABASE_URL") && (present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || present("NEXT_PUBLIC_SUPABASE_ANON_KEY")),action:"Verify production sign-in, invitation activation, recovery and persistence with a fresh account."},
    {id:"identity",label:"Operator and safeguarding contact configured",ready:present("NEXT_PUBLIC_OPERATOR_NAME") && present("NEXT_PUBLIC_CONTACT_EMAIL") && present("NEXT_PUBLIC_DSL_NAME"),action:"Publish the responsible operator and safeguarding lead; confirm the support inbox is monitored."},
    {id:"signing",label:"Server signing secret configured",ready:(env.BILLING_CALLBACK_SECRET?.trim().length ?? 0)>=32,action:"Configure the server secret and matching private database setting. Apply and test verified-career migration before enabling rewards."},
    {id:"email",label:"Transactional email configured",ready:present("RESEND_API_KEY") && present("EMAIL_FROM"),action:"Deliver a real support notification. Separately test authentication email delivery and password recovery."},
    {id:"billing",label:"Live Premium configuration present",ready:/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY ?? "") && present("STRIPE_PREMIUM_PRICE_ID") && present("STRIPE_WEBHOOK_SECRET") && present("HF_TOKEN") && (env.BILLING_CALLBACK_SECRET?.trim().length ?? 0)>=32,action:"Optional for a free beta. Before charging, verify checkout, webhook entitlements, cancellation and refund handling."},
  ];
}
export const MANUAL_RELEASE_GATES = [
  "Verify the deployed commit and apply/test the verified-career migration. Confirm old score-taking RPCs are unavailable to learners and a repeated completion cannot pay twice.",
  "Test a fresh invited learner from activation through setup, first practice, saved progress, sign-out, return and password recovery.",
  "Test two separate accounts in the same multiplayer server, disconnect/reconnect and capacity limits.",
  "Record loading time and frame rate on Windows integrated graphics, a standard laptop and mobile. Test Auto, Low and 2D graphics.",
  "Complete applicable child-safety/privacy assessments and approve age/access controls, report handling, escalation and staffing before learner access.",
  "Audit database permissions and cross-account access; test account deletion and database recovery. Review provider data locations and policy promises.",
  "Assign launch support coverage, error monitoring and rollback responsibility. Record links to evidence and the release decision.",
] as const;
