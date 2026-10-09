# IlluminatED verification email setup

The hosted Supabase project is `wfcihsbgkbjfvphzuuyi`. Account email templates in `supabase/email-templates` are prepared for this project but do not configure hosted delivery by themselves.

1. Configure a verified sending domain with your chosen SMTP provider. Check SPF, DKIM and DMARC. Disable click tracking on account-security emails.
2. In Supabase Authentication → Emails → SMTP Settings, enable custom SMTP, use the provider's host, port, username and password, and set the sender name to **IlluminatED**. Use a sender address the provider has verified for your domain.
3. In Authentication → URL Configuration, use `https://www.illumed.co.uk` as Site URL (the apex domain redirects here). Allow `https://illumed.co.uk/auth/callback` and `https://www.illumed.co.uk/auth/callback`, plus the localhost callback only for development.
4. In Authentication → Emails → Templates, copy each matching HTML file and its subject from `subjects.json`: Confirm signup → `confirmation`; Magic link → `magic-link`; Reset password → `recovery`; Change email → `email-change`; Invite user → `invite`.
5. Once SMTP delivery works, enable **Confirm email** in Authentication → Sign In / Providers. Keep secure email change enabled.
6. Test a new signup using an inbox you control. Before clicking the link, sign-in must be refused; after clicking, complete onboarding and the tutorial. Verify a password reset and a magic link on the same browser/device that requested them. Check expiry/reuse errors and spam placement.
7. Google and SMS sign-in require their own provider configuration; neither is enabled in this project as of the launch audit.

Account notifications sent directly by the application require separate `RESEND_API_KEY` and `EMAIL_FROM` deployment variables. Supabase SMTP settings do not populate those application variables.

Never commit SMTP passwords, API keys or live verification links. Prepared templates intentionally contain no learner names, school information or promotional campaigns.
