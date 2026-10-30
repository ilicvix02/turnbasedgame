# Build playbook (how Claude builds each client site)

**Stack:** hand-built static HTML/CSS (one file per page, minimal JS). It's fast, free to host, and nothing to update or get hacked.

**Starting point:** `samples/plumbing-sample.html` (layout and sections), restyled to the client's colors, logo and photos. Every client gets a distinct look: their colors, their photos, their words.

## Steps
1. Turn the questionnaire into `business/webdev/clients/<slug>/brief.md` (gitignored: client data).
2. Write the copy from their answers: their services ranked, their cities, their reasons customers choose them. No invented facts.
3. Build the pages in `clients/<slug>/site/`. Mobile first: click-to-call button pinned at the bottom on phones.
4. Quote form: a hosted form service the client owns (Netlify Forms on their Netlify account, or Formspree free tier) that emails the address from question 3.
5. Local SEO: unique `<title>`/meta description per page, `LocalBusiness`/`Plumber`/`Electrician` JSON-LD with real NAP (name, address, phone) data, city in H1 and title, alt text on every photo, sitemap.xml and robots.txt.
6. QA checklist: Lighthouse ≥ 90 on mobile (performance, accessibility, SEO), no horizontal scroll at 360px, every phone link is `tel:`, form submits to the right inbox, all photos compressed (< 200 KB), no placeholder text left.
7. Preview: a password-free unlisted link, shared by email.
8. Launch: client creates a free Netlify (or Cloudflare Pages) account. We send exact clicks to invite us as a collaborator, or they drag-and-drop the folder we send. DNS: step-by-step for their registrar (A/CNAME records), then verify HTTPS.

**Never:** buy anything on the client's behalf, hold their credentials, or launch on a domain they don't own.
