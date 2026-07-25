# StayLens Authentication

Production auth built on **Supabase Auth** (password hashing, sessions, email
delivery, rate limiting) with app data in the **existing** `profiles` table.
No existing schema was replaced and no existing page was redesigned.

---

## 1. Files created

| File | Purpose |
|---|---|
| `supabase/migrations/0011_auth_profiles.sql` | Extends `profiles`, sync triggers, `get_user_stats()` |
| `web/src/proxy.ts` | Session refresh + protected-route gate (Next 16 `proxy` convention) |
| `web/src/lib/supabase/session.ts` | `updateSession()` used by the proxy |
| `web/src/lib/supabase/admin.ts` | Service-role client (server-only) |
| `web/src/lib/auth-validation.ts` | Shared validators (email, password, age ≥ 18) |
| `web/src/app/(auth)/actions.ts` | Server actions: signUp / signIn / signOut / forgot / reset |
| `web/src/app/(auth)/layout.tsx` | Branded auth shell |
| `web/src/app/(auth)/login/page.tsx` | `/login` |
| `web/src/app/(auth)/signup/page.tsx` | `/signup` |
| `web/src/app/(auth)/forgot-password/page.tsx` | `/forgot-password` |
| `web/src/app/(auth)/reset-password/page.tsx` | `/reset-password` |
| `web/src/app/auth/confirm/route.ts` | Verifies email / recovery links → session |
| `web/src/app/api/admin/stats/route.ts` | `GET /api/admin/stats` (admin only) |
| `web/src/components/auth/auth-field.tsx` | Labeled input matching the Stitch design |
| `web/src/components/auth/login-form.tsx` | "Welcome back" form |
| `web/src/components/auth/signup-form.tsx` | "Finish signing up" form |
| `web/src/components/auth/forgot-password-form.tsx` | Request reset link |
| `web/src/components/auth/reset-password-form.tsx` | Set new password |
| `web/src/components/auth/use-auth.ts` | Live client auth state for the navbar |

## 2. Files modified

| File | Change |
|---|---|
| `web/src/components/search/user-menu.tsx` | Real Supabase auth (removed the `localStorage` "staylens_authed" simulation + demo name); "Log in or sign up" → `/signup`; avatar + real logout |
| `web/src/lib/database.types.ts` | Added the new `profiles` columns |

## 3. Database schema (`profiles`, extended)

Authentication lives in `auth.users` (Supabase-managed: `id`, `email`,
`encrypted_password`, `email_confirmed_at`, …). `profiles` extends it 1-to-1:

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | FK → `auth.users(id)` ON DELETE CASCADE |
| `first_name` / `last_name` | text | from sign-up |
| `full_name`, `username`, `bio`, `home_currency` | text | pre-existing |
| `birthday` | date | 18+ enforced |
| `email` | text | mirrored from `auth.users` |
| `email_verified` | boolean | mirrored from `email_confirmed_at` |
| `avatar_url` | text | optional |
| `role` | text | `user` \| `host` \| `admin`, default `user` |
| `created_at` / `updated_at` | timestamptz | |
| `last_login` | timestamptz | stamped on sign-in |

> The password hash is **never** stored in `profiles` — it stays in
> `auth.users.encrypted_password` (bcrypt, managed by Supabase).

**Triggers:** `on_auth_user_created` → `handle_new_user()` (creates the profile
from sign-up metadata); `on_auth_user_updated` → `sync_auth_user_to_profile()`
(keeps email / verified in sync).

## 4. Authentication flow

```
Menu "Log in or sign up"
        │
        ▼
   /signup  ──"Log in"──►  /login ──"Forgot password?"──► /forgot-password
     │                       │                                  │
     │ signUpAction          │ signInAction                     │ forgotPasswordAction
     ▼                       ▼                                  ▼
 validate (server)      Supabase verifies hash            reset email sent
     │                       │                                  │
     ▼                       ▼                                  ▼
 supabase.auth.signUp   session cookie set             /auth/confirm?type=recovery
     │                  last_login stamped                      │
     ▼                       │                                  ▼
 trigger → profiles row      │                            /reset-password
     │                       │                                  │
     ├─ confirmation off ────┴──────────┐                       │
     │  (session issued)                │  resetPasswordAction ─┘
     ▼                                  ▼
 redirect "/" + router.refresh()   navbar shows user (useAuth)
                                        │
                                        ▼
                                  signOutAction → session cleared

Every request → proxy.ts → updateSession() → refresh cookie
                                           → /profile,/trips,/account require a user
```

## 5. Environment variables

Already present in `web/.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```
Add these:
```
# Absolute site URL — used for confirmation / reset redirect links
NEXT_PUBLIC_SITE_URL=http://localhost:3000        # prod: https://your-domain

# Service-role key — ONLY for /api/admin/stats. Never expose to the browser.
SUPABASE_SERVICE_ROLE_KEY=<service_role key from Supabase → Settings → API>
```
On Vercel, add both to Project → Settings → Environment Variables (set
`NEXT_PUBLIC_SITE_URL` to the production domain) and redeploy — `NEXT_PUBLIC_*`
values are inlined at build time.

## 6. Migration SQL

Apply `supabase/migrations/0011_auth_profiles.sql` — idempotent, safe to re-run.
Supabase Dashboard → SQL Editor → paste the file → Run.

## 7. Setup instructions

1. **Run the migration** (step 6).
2. **Add the env vars** (step 5), then rebuild: `cd web && npm run build && npm start`.
3. **Configure Supabase Auth** (Dashboard → Authentication):
   - *URL Configuration* → Site URL = your site; add
     `http://localhost:3000/auth/confirm` and `.../reset-password` to
     **Redirect URLs**.
   - *Providers → Email* → decide on "Confirm email":
     - **Off** → sign-up signs the user straight in (matches "automatically sign in").
     - **On** → user must click the emailed link first (the UI shows "Check your inbox").
4. **Test**: menu → "Log in or sign up" → register → you're signed in and the
   navbar shows your initial → log out → log back in at `/login`.

## 8. Security

| Control | Implementation |
|---|---|
| Password hashing | bcrypt via Supabase Auth (`auth.users`), never plain text |
| Server-side validation | `validateSignUp()` re-run inside the server actions |
| Password strength | 8+ chars, letter + number |
| Minimum age | 18, checked client + server |
| Duplicate email | Supabase unique constraint; enumeration-safe message |
| No info disclosure | Login always returns "Incorrect email or password"; forgot-password always reports success |
| Session handling | HTTP-only Supabase cookies, refreshed in `proxy.ts`; `getUser()` (not `getSession()`) revalidates server-side |
| Route protection | `/profile`, `/trips`, `/account` → redirect to `/login` |
| SQL injection | Supabase client uses parameterized queries; no string-built SQL |
| XSS | React escapes by default; no `dangerouslySetInnerHTML` in auth code |
| CSRF | Next.js Server Actions verify Origin/Host; cookies are SameSite=Lax |
| Rate limiting | Supabase Auth's built-in per-IP/email limits (tunable in Dashboard → Auth → Rate Limits) |
| Privilege separation | Service-role key is server-only (`import "server-only"`); `get_user_stats()` execute granted to `service_role` only |

## 9. Admin statistics

`GET /api/admin/stats` (requires `profiles.role = 'admin'`) returns:
```json
{ "total_users": 0, "active_users": 0, "today": 0, "this_week": 0, "this_month": 0 }
```
`active_users` = signed in within the last 30 days. Promote an admin with:
```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

## 10. Manual steps remaining

1. Run migration `0011` (not applied automatically).
2. Add `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SITE_URL`.
3. Set Supabase redirect URLs and choose the email-confirmation setting.
4. For branded emails, customize Dashboard → Auth → Email Templates (default
   Supabase SMTP is fine for testing; add a real SMTP provider for production).
5. Optional: regenerate `database.types.ts` from the live schema after the
   migration to type `get_user_stats()` (currently cast).
6. Optional: build the Admin Dashboard UI on top of `/api/admin/stats`.
