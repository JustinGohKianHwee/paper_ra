# Deploying a private (single-user) instance

This runbook stands up a **private** cloud deployment only you can log into — a fresh cloud
Supabase project plus the app on Vercel, with self-service sign-up closed. It does **not**
touch your local Docker setup; the two are independent.

> Fresh start: the cloud database begins **empty** (schema from migrations, no data, no
> users). Your local notes stay local. See [§5](#5-optional-bring-your-local-library-along)
> to migrate them.

Prerequisites: a [Supabase](https://supabase.com) account, a
[Vercel](https://vercel.com) account, your `OPENAI_API_KEY`, and the Supabase CLI (already a
dev dependency — use `npx supabase`).

## 1. Create the cloud Supabase project

1. Supabase dashboard → **New project**. Pick a region near you; save the **database
   password**.
2. Project Settings → **API**: copy the **Project URL**, the **anon public** key, and the
   **service_role** key (secret — never ships to the browser).

## 2. Push the schema to the cloud

From the repo root:

```bash
npx supabase login                       # opens a browser to authorise the CLI
npx supabase link --project-ref <ref>    # <ref> is in the project's dashboard URL / settings
npx supabase db push                     # applies supabase/migrations/ to the cloud DB
```

The cloud database now has every table, RLS policy, and function — but no rows yet.

## 3. Close sign-ups (two layers)

Do **both** so the lockdown holds even if one layer is misconfigured:

- **App layer:** simply leave `ALLOW_SIGNUP` unset in Vercel (it defaults off). The sign-up
  UI disappears and the `signUp` server action refuses.
- **Auth layer:** Supabase dashboard → **Authentication → Sign In / Providers** (or
  **Settings**) → **disable new sign-ups** ("Allow new users to sign up" = off).

## 4. Create your account

Since sign-up is closed, create your single user directly:

- Supabase dashboard → **Authentication → Users → Add user** (set email + password, mark
  email confirmed), **or**
- run the seed against the cloud project (also loads the starter library):

  ```bash
  # point these at the CLOUD project for one command, then unset:
  NEXT_PUBLIC_SUPABASE_URL=<cloud-url> \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<cloud-anon-key> \
  SUPABASE_SERVICE_ROLE_KEY=<cloud-service-role-key> \
  npm run seed
  ```

## 5. (Optional) Bring your local library along

Only if you have local notes worth keeping. With the local stack running:

```bash
# dump just the app schema's data from local (adjust the connection string from
# `npx supabase status` if needed), then restore into the cloud DB.
npx supabase db dump --local --data-only -f local-data.sql
psql "<cloud-connection-string>" -f local-data.sql
```

Review `local-data.sql` first. If you skip this, just start fresh on the cloud instance.

## 6. Deploy the app to Vercel

1. Import the GitHub repo into Vercel (framework auto-detected as Next.js). The build runs
   `prebuild` → vendors the pdf.js worker automatically.
2. Set **Environment Variables** (Production):

   | Variable                                   | Value                           |
   | ------------------------------------------ | ------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`                 | cloud Project URL               |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY`            | cloud anon public key           |
   | `OPENAI_API_KEY`                           | your key (server-only)          |
   | `OPENAI_MODEL`                             | optional (default `gpt-5-mini`) |
   | `QA_MAX_PER_HOUR` / `AI_MAX_RUNS_PER_HOUR` | optional budget tuning          |

   Do **not** set `ALLOW_SIGNUP`. Do **not** add the `service_role` key to the app — the app
   never needs it; it's only for `seed`/migrations from your machine.

3. Deploy, then sign in at `https://<your-app>.vercel.app/login` with the account from step 4.

## 7. Verify the lockdown

- The login page shows **only** "Sign in" — no "Create an account" link.
- You can add and process a paper, read, and ask questions.
- Optional: confirm a raw `signUp` call is refused (the action returns "Sign-ups are
  disabled on this instance.").

## Notes & caveats

- **Serverless timeouts:** long-PDF processing can exceed the function limit; `maxDuration`
  is 300s on the processing route, and the Retry button resumes from the last completed
  stage. On Vercel Hobby (shorter limits) very long papers may need a couple of retries.
- **Cost:** with sign-ups closed only you can spend the OpenAI key; per-user hourly budgets
  (`AI_MAX_RUNS_PER_HOUR`, `QA_MAX_PER_HOUR`) still apply as a backstop.
- **Privacy on a work machine:** the same rule holds — public papers and personal learning
  only. Deployed, your data lives in Supabase's cloud and paper text goes to OpenAI.
- To re-enable multi-user later (e.g. a public demo), set `ALLOW_SIGNUP=true` **and**
  re-enable sign-ups in the Supabase dashboard — but review the abuse/cost tradeoffs first
  (see the README "Project status & direction" and the security discussion).
