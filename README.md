# Show Your Work — Math Photo Solver

Upload a photo of a math problem. If the photo has more than one main
numbered question (1, 2, 3 — not sub-parts like i/ii or a/b), each one is
solved on its own page that you can flip through.

Built with Next.js. The solving happens server-side via the **Gemini API**,
which has a genuinely free tier — no billing setup required to get an API key.

## 1. Get a free Gemini API key

1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Sign in with a Google account
3. Click **Create API key** and copy it

## 2. Run it locally (optional, to test first)

```bash
npm install
cp .env.example .env.local
# paste your key into .env.local as GEMINI_API_KEY=...
npm run dev
```

Open http://localhost:3000 and try uploading a photo.

## 3. Push this to your own GitHub repository

From inside this folder:

```bash
git init
git add .
git commit -m "Initial commit: math photo solver"
```

Then create a new, empty repository on GitHub (github.com/new — don't
initialize it with a README, since you already have one), and push:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

## 4. Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and sign in (you can use your GitHub account)
2. Import the repository you just pushed
3. Vercel will auto-detect it as a Next.js project — leave the build settings as-is
4. Before deploying, open **Environment Variables** and add:
   - `GEMINI_API_KEY` = the key you copied in step 1
5. Click **Deploy**

Once it finishes, Vercel gives you a live URL — that's your working tool.

## Notes

- The free Gemini tier is rate-limited (requests per minute/day). If you hit
  a rate limit, the tool will show a message asking you to wait — this isn't
  a bug, just Google's free-tier ceiling.
- You can change which Gemini model is used by setting an optional
  `GEMINI_MODEL` environment variable (defaults to `gemini-2.5-flash`).
- Your API key stays server-side (used only inside `app/api/solve/route.js`)
  — it's never sent to the browser.
- AI-generated solutions can occasionally make a mistake. Treat this as a
  study aid, not a final answer key.
