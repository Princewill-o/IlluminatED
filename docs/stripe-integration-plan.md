# illumed.co.uk — Stripe integration plan

Business: IlluminatED, UK education subscriptions and tutoring. Stack: Next.js, Stripe Node SDK, Supabase Auth/Postgres. Currency: GBP. Prepared 3 October 2026.

## Setup outcome

The official `stripe@openai-curated` plugin was installed. `https://mcp.stripe.com` was added and OAuth login succeeded. The running chat's separately exposed Stripe connector still returned `USER_NOT_LOGGED_IN`, so its implementation planner could not run. The user-authorised `npx skills add https://docs.stripe.com` fallback was installed and the plan below follows Stripe's Billing and security guidance. It is not a planner-generated result.

## Payment design

1. Use hosted Checkout Sessions for monthly Premium, backed by a recurring GBP Price of 599 pence. Existing one-off tutoring checkout stays separate.
2. Q4 Lock In grants one 30-day trial to a new Premium subscriber. The server determines eligibility and campaign timing, not form parameters. Collect a payment method now; charge £0 during the trial and £5.99/month afterwards unless cancelled. New trial checkout starts are accepted before 16 October 2026, 00:00 Europe/London. Each started checkout is valid for 30 minutes.
3. Use an account-bound Stripe Customer and stable checkout attempt/idempotency identifiers. Check existing subscriptions before creating another. Persist trial use independently of current paid status.
4. Verify webhook signatures against the raw body. Re-read the subscription from Stripe and check its expected price. Subscription events update access; paid invoices separately identify paying users. Zero-value trial invoices must not count as revenue or paying subscribers.
5. Stripe Billing generates subscription invoices automatically. The hosted Customer Portal handles cards, cancellation and invoice history. No custom card fields or stored card data. A return from Checkout alone never grants Premium.
6. Show Free/Premium in navigation, trial/renewal/cancellation dates in billing, and actual entitlements on pricing. Subscription renewal and collection retries are managed by Stripe.
7. Owner-only reporting uses a private database admin allowlist. Email is used to locate the existing verified account once; browser-supplied email or editable metadata never grants admin privileges. Report trials separately from paid subscriptions, aggregate quiz progress and feature visits, and show support messages.

## Existing integration review

The app already uses hosted Checkout, verified webhooks, a secret-checked database write function and the Customer Portal. Gaps: price label £4.99; no campaign eligibility/trial; no idempotency or checkout reservation; no trial/cancellation/paid-invoice details; no owner dashboard; no feature usage counters; no navbar plan label. AI still needs an HF token, so paid/trial checkout must not open until the advertised AI service is configured. Test checkout can be validated directly in Stripe's sandbox without granting production access.

## Environment and launch

Use sandbox keys only for local development. Store keys in ignored `.env.local`; production credentials belong in the deployment host's sensitive environment variables or vault. Prefer restricted keys with only the required permissions. Rotate the sandbox secret shared in chat. Never write secrets to tracked files or logs.

Configure `STRIPE_SECRET_KEY`, `STRIPE_PREMIUM_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `PAYMENT_CALLBACK_SECRET`, `STRIPE_PORTAL_CONFIGURATION_ID`, `NEXT_PUBLIC_SITE_URL` and the AI provider token. Keep sandbox webhook state separate from live billing state. Enable trial-ending reminders, invoice/receipt emails and failed-payment emails in Stripe; dashboard-level email settings cannot be assumed from Checkout creation.

The advertised £5.99 is the final monthly price. Confirm the business's VAT registration and treatment before launch. Do not enable automatic tax without an active tax registration. Review legal business identity and contact details on the site.

## Validation

Test campaign boundaries and repeated trial attempts; duplicate checkout clicks; verified and forged webhooks; duplicate/out-of-order events; £0 trial invoices vs paid invoices; cancellation; failed payments; customer ownership; normal-user denial of admin data; and no-secret browser bundles. Use sandbox subscriptions/test clocks for renewal tests. Never charge a live customer as a test.

Sources: [Checkout trials](https://docs.stripe.com/payments/checkout/free-trials), [Customer Portal](https://docs.stripe.com/customer-management/configure-portal), [webhooks](https://docs.stripe.com/webhooks), [subscription tax](https://docs.stripe.com/billing/taxes/collect-taxes), [Stripe MCP](https://docs.stripe.com/mcp).
