# Vercel setup (owner, one time)

The playground deploys from GitHub. Every PR gets a preview URL, and `main` is production.

## 1. Choose a plan. This decides whether teammates get previews

Vercel **Hobby** does not deploy commits that other people author in a **private** repo. Their PRs show "Deployment Blocked: the Hobby Plan does not support collaboration for private repositories." Pick one option:

| Option | Teammate previews | Cost / tradeoff |
|---|---|---|
| **Pro** (trial, then paid per seat) | Yes, after you add them as team members | Simplest. Teammates also see the Vercel dashboard |
| **Make the repo public** | Yes | The code is public. The site stays behind the password gate |
| Hobby + private | Only your own commits | Teammates rely on CI and local `npm run dev` |

Never add AI co-author trailers to commits. On Hobby, they also count as "other contributors."

## 2. Import the project
1. Go to https://vercel.com/new → **Import Git Repository** → `Thomson-Lam/hw`. If the repo isn't listed, click "Adjust GitHub App Permissions" and grant access to `hw`.
2. **Root Directory → `playground`**. This step is required: the app is not at the repo root.
3. Framework Preset: Next.js (detected). Leave the Build and Install commands at their defaults (`npm run build` runs the registry generator first).
4. Environment Variables:
   - `PLAYGROUND_PASSWORD` = a password that you share with the team. Set it for **Production and Preview**. If it is unset, nobody can log in.
   - (optional) `NEXT_PUBLIC_SITE_URL` = your production URL, e.g. `https://hw-playground.vercel.app`, for clean share links.
5. Click **Deploy**.

## 3. Settings after the first deploy
- **Settings → Git**: make sure "Production Branch" is `main`. Preview deployments for all other branches are on by default.
- **Settings → Deployment Protection**: Vercel Authentication is on for previews by default. Your phone and teammates then see a Vercel login before our own password page. Either:
  - turn it off for previews (our password gate still protects every page), or
  - keep it, if everyone is a member of your Pro team.
- **Settings → Domains** (optional): rename the production domain, e.g. `hw-playground.vercel.app`.

## 4. Check that it works
1. Open the production URL. You must be redirected to `/login`.
2. Enter the password. The gallery shows Road Scroll with its thumbnail.
3. Open `<url>/p/road-scroll`. It must return **404** (the prototype is private), and must not redirect to login.
4. Open any PR. The Vercel bot comments a preview URL within ~1 minute.

## 5. Invite teammates on GitHub
```bash
gh api -X PUT repos/Thomson-Lam/hw/collaborators/<github-username> -f permission=push
```
