# Deploying Keerthi Gem & Jewellery

Three steps: set up the database (Supabase), then put the code on GitHub,
then connect it to Netlify. About 15–20 minutes total.

---

## 1. Set up Supabase (the backend/database)

1. Go to https://supabase.com, sign up/log in, and click **New project**.
   Pick any name and a strong database password (save it somewhere safe —
   you likely won't need it again, but keep it anyway).
2. Once the project finishes setting up, open **SQL Editor** (left
   sidebar) → **New query**.
3. Open `supabase/schema.sql` from this folder, copy the whole file, paste
   it into the SQL editor, and click **Run**.
   - Before running, find this line near the top and change the email to
     the one you'll use to log into the admin dashboard:
     ```sql
     select auth.jwt() ->> 'email' = 'owner@keerthigem.lk'; -- TODO: replace with your real admin email
     ```
   - This creates all the tables, locks them down with Row Level Security
     (RLS) so only that one signed-in email can add/edit/delete anything,
     and loads some starter content (sample products/banners) you can
     replace from the dashboard later.
4. Create the actual admin login: **Authentication** → **Users** → **Add
   user** → **Create new user**. Use the *same email* you put in the SQL
   above, and set a strong password. Tick "Auto Confirm User" if asked.
5. Turn off public sign-ups so nobody else can create an account:
   **Authentication** → **Providers** → **Email** → turn off **Allow new
   users to sign up**.
6. Get your keys — Supabase recently split this into two separate pages,
   which is probably what tripped you up:
   - **Project URL**: click the gear icon (⚙, bottom-left) → **Project
     Settings** → **Data API**. The URL is at the top of that page,
     looks like `https://abcdefgh.supabase.co`.
     Shortcut: with your project open, just go to
     `https://supabase.com/dashboard/project/_/settings/api` — Supabase
     fills in your current project automatically.
   - **API key**: same Settings menu → **API Keys**. You'll see two
     tabs:
     - If there's an **API Keys** tab showing a **Publishable key**
       (starts with `sb_publishable_...`), copy that.
     - Otherwise click the **Legacy API Keys** tab and copy the **anon
       / public** key (a long string starting with `eyJ...`).
     - Either one works fine with this site — don't use the
       **service_role** or **secret** key, that one bypasses all the
       security we just set up and must never appear in this front-end
       code.
7. Open `assets/config.js` in this folder and paste both values in:
   ```js
   const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
   const SUPABASE_ANON_KEY = "eyJ..."; // or sb_publishable_...
   ```

That's the entire backend — no server to run, no hosting to pay for
beyond Supabase's free tier (which comfortably covers a small business
site like this).

---

## 2. Push the code to GitHub

1. Create a new repository on GitHub (public or private, either is fine).
2. Upload this whole folder to it — either drag-and-drop everything on
   the GitHub website ("uploading an existing file"), or via git:
   ```bash
   git init
   git add .
   git commit -m "Keerthi Gem & Jewellery site"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
   git push -u origin main
   ```
   Make sure `assets/config.js` with your real Supabase keys is included
   in the push — the anon key is meant to be public, that's normal (see
   the note inside `config.js` for why).

---

## 3. Deploy on Netlify

1. Go to https://app.netlify.com → **Add new site** → **Import an
   existing project** → connect GitHub → pick your repository.
2. Build settings: leave **Build command** empty and set **Publish
   directory** to `.` (this is a static site, nothing to build).
3. Click **Deploy**. Netlify gives you a `*.netlify.app` URL immediately;
   you can add your own domain later under **Domain settings** if you
   have one.

Once deployed, any future change just needs `git push` (or a re-upload on
GitHub) — Netlify redeploys automatically.

---

## Using the site day-to-day

- **Adding products, banners, hours, closed dates, viewing appointment
  requests:** click "Staff login" in the footer, sign in with the admin
  email/password you created in step 1.4. Everything you save there goes
  straight into Supabase and is live for every visitor immediately.
- **Appointment requests** submitted by customers land in the
  Appointments tab of the dashboard *and* trigger an instant WhatsApp
  message to the shop's WhatsApp number — so nothing gets missed even if
  the WhatsApp message is buried later.
- If you ever need a second staff account, repeat step 1.4 with a
  different email, then add that email to `is_admin()` in the database
  (SQL Editor → you can re-run a small `create or replace function...`
  snippet with an `in (...)` list instead of a single `=` check — ask if
  you'd like this set up).
