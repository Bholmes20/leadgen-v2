# LeadGen V2

## Deployment

**Production app**

- Next.js, port **3002**
- systemd **user** service: `leadgen-v2.service`
- public path: **Cloudflare → Caddy → Next.js**

### Normal deployment

```
npm run deploy
```

This command:

1. runs `next build`
2. **only if the build succeeds**, restarts `leadgen-v2.service`

**DO NOT use bare `npm run build` as a production deployment.** The running
`next-server` keeps serving its previously-loaded build until the service is
restarted, so `.next/` on disk drifts from the live process and the site
renders unstyled (stale CSS/JS chunk hashes return 404/500). This is what
caused the production CSS incident.

If you ever run a production build manually, you **must** restart the service
afterward:

```
systemctl --user restart leadgen-v2.service
```

### Verifying a deployment

Confirm the service is up:

```
systemctl --user is-active leadgen-v2.service
```

Verify these routes load:

- `/`
- `/leads/new`
- `/admin/intelligence`
- `/admin/leads`
- `/sitemap.xml`
- `/robots.txt`

Verify the CSS asset referenced by the homepage `<head>` returns `200` with
`Content-Type: text/css` through the **public** hostname (not just origin):

```
# extract the referenced stylesheet, then request it publicly
CSS=$(curl -s https://leads.eseeent.com/ | grep -oE '/_next/static/[^"]*\.css' | head -1)
curl -s -o /dev/null -w '%{http_code} %{content_type}\n' "https://leads.eseeent.com$CSS"
# expect: 200 text/css; charset=UTF-8
```

### ⚠️ Current limitation — not a true atomic deployment

`npm run deploy` prevents us from *forgetting* the restart, but it is **not** a
true atomic / zero-downtime deployment. `next build` writes into the same
`.next/` directory that the live Next.js process is still serving, so during a
build there is a window of:

```
RUNNING OLD PROCESS  +  MUTATING/NEW .next ASSETS
```

which is the same class of build/runtime mismatch that caused the incident.
The current command is an improvement, not the final architecture.

Future deployment hardening should replace this with a flow that never mutates
the build directory currently being served:

```
BUILD → VALIDATE → CONTROLLED CUTOVER → HEALTH CHECK → ROLLBACK
```

(e.g. build into a fresh directory / release slot, health-check it, then
atomically switch the running process over, with the previous release retained
for instant rollback).
