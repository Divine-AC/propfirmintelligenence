"""Part 5 — Sections 9-12 and Appendices A-D."""

from __future__ import annotations

import csv
import json
from pathlib import Path

from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Spacer

from spec_pdf_lib import (CONTENT_W, P, bullets, callout, code_block, h2, kv_table, numbered, rule,
                          section_header, table)

CELL = "CellSm"
ROOT = Path(__file__).resolve().parent


def checklist(rows: list[list[str]], widths: list[float], header: list[str] | None = None):
    """First column is rendered as an empty box (the cell border is the checkbox)."""
    body = [[""] + r for r in rows]
    hdr = ([""] + header) if header else None
    w = [6 * mm] + widths
    t = table(hdr, body, w, cell_style=CELL)
    from reportlab.platypus import TableStyle
    t.setStyle(TableStyle([("BOX", (0, 1 if hdr else 0), (0, -1), 0.6, __import__("spec_pdf_lib").LINE)]))
    return t


def build(st: list, ctx: dict) -> None:
    # =============================================================== 9. assets
    st.append(section_header("9", "Asset checklist — what you must supply",
                             "Everything below is content the build cannot generate honestly. Collect these before "
                             "development starts; each item lists the exact specification."))

    st.append(table(["#", "Asset", "Specification", "Used in", "Priority"],
                    [
                        ["1", "Professional portrait", "Chest-up, plain dark/neutral background, natural light, looking at camera. Source ≥ 1200×1500 px JPG. Deliver WebP + AVIF at 900×1125 and 600×750. No filters, no sunglasses.", "S2 hero, OG image, /about", "<b>Blocking</b>"],
                        ["2", "CV PDF", "<font face='DJM'>Divine_Abba_Chimdirim_Resume.pdf</font> — final, link-checked version. Rename with no spaces if you prefer: <font face='DJM'>Divine-Abba-Chimdirim-CV.pdf</font>.", "S0/S2/S15 download", "<b>Blocking</b> (you have it)"],
                        ["3", "Project screenshots ×4", "1600×1000 px, real UI, dark theme where possible, cropped to the most informative view, no browser chrome. PropFirm Intelligence: matches page + history report.", "S7 cards", "<b>Blocking</b>"],
                        ["4", "Live demo URLs", "Recruitment Portal (front + back), Banking Web App, E-commerce store. Each must return 200 and load in under 5 s. If a demo is asleep on Render's free tier, note the cold start or remove the link.", "S7, S15, Appendix C", "<b>Blocking</b>"],
                        ["5", "GitHub repo links", "Public repos for each project you want shown. Pin them on your profile and add a README with a screenshot and one-paragraph description to each.", "S7, navbar", "<b>Blocking</b>"],
                        ["6", "Certificate verification", "Confirm whether Mercor and TS Academy issue a public verify URL or badge for <font face='DJM'>MRC-2026-HKHJULZA</font> and <font face='DJM'>TSWW5QW86KV4MJ</font>. If yes, link it; if no, keep the ID as plain text.", "S10", "High"],
                        ["7", "Desk / workspace photo (optional)", "1600×1000, real setup, tidy. Adds credibility for the remote-work section.", "S5 or S13", "Medium"],
                        ["8", "Monogram / logo", "\"DAC\" mark, SVG, accent cyan on transparent + a light variant. Or approve a simple typographic mark so no design work is needed.", "Navbar, favicon, OG", "Medium"],
                        ["9", "Favicon set", "<font face='DJM'>icon.svg</font>, 32×32 png, 180×180 apple-icon, favicon.ico.", "Global", "Medium"],
                        ["10", "OG image", "1200×630 PNG per the spec in Section 6.5. Can be generated with <font face='DJM'>@vercel/og</font> from your name and role line.", "Social sharing", "Medium"],
                        ["11", "Testimonials or referees", "Two written quotes with name, role, organisation and written permission — or two referee names to list as \"available on request\".", "S12", "Medium"],
                        ["12", "Domain name", "Purchase one of the options in Section 3.4, or tell the builder to ship on the Vercel subdomain first.", "Deployment", "Medium"],
                        ["13", "Availability wording", "Exact sentence: hours per week, contract vs full-time, notice period, earliest start date.", "S0, S5, S13, S15", "<b>Blocking</b>"],
                        ["14", "Trading export policy decision", "Confirm the Section 7.8 tier choice: which figures are public. Also confirm whether to publish <font face='DJM'>trades.csv</font> as a download.", "S8, /trading", "<b>Blocking</b>"],
                        ["15", "Analytics choice", "Plausible / Umami / GA4 / none.", "Section 8.8", "Low"],
                        ["16", "Form provider account", "Formspree / Web3Forms / Resend account and endpoint, plus the destination inbox.", "S15", "High"],
                    ],
                    widths=[7 * mm, 34 * mm, 74 * mm, 28 * mm, CONTENT_W - 143 * mm], cell_style=CELL))
    st.append(Spacer(1, 3 * mm))
    st.append(callout("warn",
        "<b>Six items are blocking.</b> The page can be built with placeholder boxes for the portrait and "
        "screenshots, but it must not launch with them. A personal landing page with a stock illustration where a "
        "face should be converts dramatically worse — and for AI-evaluation work, where identity verification is "
        "routine, a real photo is close to mandatory."))

    # =============================================================== 10. build plan
    st.append(PageBreak())
    st.append(section_header("10", "Build plan and milestones",
                             "Five phases. Estimated total: 14–22 focused hours for a developer, or roughly two "
                             "working days with an AI build agent plus your review time."))

    st.append(table(["Phase", "Deliverable", "Tasks", "Est."],
                    [
                        ["<b>0. Decisions</b><br/><i>you, before code</i>",
                         "Signed-off brief",
                         "Choose positioning (P1/P2/P3) · confirm the six blocking assets · decide the trading "
                         "publication tier · pick domain, form provider, analytics · confirm availability wording",
                         "1–2 h"],
                        ["<b>1. Foundation</b>",
                         "Tokens, layout shell, content module",
                         "Add <font face='DJM'>next/font</font> Inter + JetBrains Mono · replace Arial in "
                         "<font face='DJM'>globals.css</font> with the Section 5.2 token layer · create "
                         "<font face='DJM'>src/content/profile.ts</font>, <font face='DJM'>projects.ts</font>, "
                         "<font face='DJM'>trading.ts</font> · build the 11 UI components · root layout with "
                         "metadata and JSON-LD",
                         "3–5 h"],
                        ["<b>2. Sections</b>",
                         "S0–S15 rendering real content",
                         "Build in order S2 (hero) → S3 → S4 → S7 → S9 → S10 → S6 → S5 → S11 → S13 → S14 → S8 → "
                         "S15 → S1/S0. S8 comes late because it depends on the chart components. Wire scroll-spy and "
                         "the mobile menu last.",
                         "5–8 h"],
                        ["<b>3. Trading page</b>",
                         "<font face='DJM'>/trading</font> with all charts + ledger",
                         "Copy <font face='DJM'>trading-stats.json</font> and <font face='DJM'>equity-curve.json</font> "
                         "into typed modules · build Sparkline, DrawdownChart, BarRow, heatmap, monthly columns · "
                         "render the 100-row ledger table · disclaimer on both pages · copy <font face='DJM'>trades.csv</font> "
                         "and the CV into <font face='DJM'>public/</font>",
                         "3–4 h"],
                        ["<b>4. Form + SEO + a11y</b>",
                         "Working contact path and indexable page",
                         "Route Handler + client form with all six states · honeypot and timing check · sitemap.ts, "
                         "robots.ts · OG image · JSON-LD Person/WebSite/ItemList/FAQPage · print stylesheet · "
                         "keyboard and screen-reader pass · axe run",
                         "2–3 h"],
                        ["<b>5. QA + launch</b>",
                         "Live URL, scores recorded",
                         "Run Section 11 checklist · <font face='DJM'>tsc --noEmit</font>, lint, vitest · "
                         "<font face='DJM'>npm run build</font> · deploy to Vercel · domain + TLS · Search Console "
                         "and Bing · Lighthouse on production · add the link to GitHub profile and LinkedIn · "
                         "announce",
                         "2 h"],
                    ],
                    widths=[30 * mm, 36 * mm, CONTENT_W - 78 * mm, 16 * mm], cell_style=CELL))
    st.append(Spacer(1, 3 * mm))
    st.append(h2("10.1  Refresh routine (every new trading export)"))
    st.append(numbered([
        "Replace <font face='DJM'>docs/landing-page/raw-trades.txt</font> with the new export rows.",
        "Run <font face='DJM'>python docs/landing-page/analyse_trades.py</font> — it rewrites "
        "<font face='DJM'>trades.csv</font>, <font face='DJM'>trading-stats.json</font> and "
        "<font face='DJM'>equity-curve.json</font>.",
        "Run <font face='DJM'>npm test</font>. <font face='DJM'>tests/trading-stats.test.ts</font> will fail if the "
        "published figures in <font face='DJM'>src/content/trading.ts</font> no longer match the CSV — that failure "
        "is the feature.",
        "Update the figures and the \"last updated\" date, review the tier rules in Section 7.8 again (a new sample "
        "may change what is publishable), commit, deploy.",
    ]))

    # =============================================================== 11. QA
    st.append(PageBreak())
    st.append(section_header("11", "QA and launch checklist",
                             "Tick every box. Anything unticked is a known defect — record it or fix it before "
                             "sharing the URL."))

    for title, items in [
        ("11.1  Content integrity", [
            "Name, role line, city, email, phone match the CV exactly",
            "Both certificate IDs are character-perfect and selectable as text",
            "All dates (roles, education, certificates) match the CV",
            "Every trading figure matches trading-stats.json and carries its sample size and date range",
            "No banned word from Section 2.5 appears anywhere on the page",
            "No claim exists that you could not defend in a live interview",
            "Disclaimer text is present on every page showing trading numbers",
            "Spelling and grammar checked with the page rendered, not in the source",
            "\"Last updated\" date is current",
        ]),
        ("11.2  Links and downloads", [
            "GitHub, LinkedIn, every live demo and every repo link opens correctly in a new tab",
            "External links carry rel=\"noopener noreferrer\"",
            "CV PDF downloads with a sensible filename and opens correctly",
            "trades.csv downloads and opens in Excel/Sheets without mojibake",
            "mailto: and tel: links work on a phone",
            "No 404 anywhere, including /trading, /projects and the 404 page itself",
            "Anchor links land with 80 px clearance under the sticky navbar",
        ]),
        ("11.3  Form", [
            "A real submission arrives in the inbox with the right subject and reply-to",
            "Invalid email is blocked client-side with the exact copy from Section 6.4",
            "Short message (&lt; 20 chars) is blocked with a clear message",
            "Honeypot submission is silently discarded and does not reach the inbox",
            "Sub-3-second submission is rejected",
            "Success, error and rate-limited states all render and are announced to screen readers",
            "mailto fallback works when the provider endpoint is unreachable",
            "No secret keys are present in client-side JavaScript or the built bundle",
        ]),
        ("11.4  Responsive and visual", [
            "320 px: no horizontal scroll, no clipped text, no overlapping elements",
            "375 px: hero headline, sub-headline and both CTAs visible without scrolling",
            "768 px: grids collapse as specified in Section 5.8",
            "1024 px: full nav visible, hero splits 58/42",
            "1440 px and 1920 px: container capped at 1200 px and centred, no stretched text lines",
            "Landscape phone (667×375) renders correctly",
            "Dark surfaces show no banding; borders visible at 100% zoom",
            "Charts render correctly at every width and their hidden data tables are present",
            "Print view (Ctrl+P) is clean: light background, URLs shown, 1–2 pages",
        ]),
        ("11.5  Accessibility", [
            "Skip link is the first focusable element and works",
            "Tab order follows visual order through all 16 sections",
            "Every interactive element has a visible focus ring",
            "Mobile menu: focus trap, Escape closes, focus restored",
            "One h1 per page; no skipped heading levels",
            "All images have meaningful alt; decorative ones are hidden from AT",
            "Text contrast passes 4.5:1 (body) and 3:1 (large text and UI)",
            "Touch targets ≥ 44×44 px on mobile",
            "Signed numbers show +/− as text, not colour alone",
            "axe DevTools reports zero serious and zero critical issues",
            "VoiceOver or TalkBack reads hero, stat tiles, charts and form sensibly",
            "prefers-reduced-motion: reduce disables all animation and smooth scroll",
        ]),
        ("11.6  SEO and performance", [
            "Title ≤ 60 chars; description 150–158 chars; canonical set",
            "OG and Twitter cards validate in the official debuggers",
            "JSON-LD validates in the Rich Results Test with no errors",
            "sitemap.xml and robots.txt serve correctly in production",
            "Lighthouse mobile: Performance ≥ 95, Accessibility ≥ 98, Best Practices ≥ 95, SEO ≥ 98",
            "LCP ≤ 2.0 s, CLS ≤ 0.05, INP ≤ 200 ms on simulated 4G",
            "First-party JS ≤ 90 KB gzipped; total page ≤ 600 KB",
            "Fonts are self-hosted via next/font; no layout shift from font swap",
            "Submitted to Google Search Console and Bing Webmaster",
        ]),
        ("11.7  Engineering", [
            "npx tsc --noEmit passes with zero errors",
            "npm run lint passes with zero errors",
            "npm test passes, including the new content, stats and SEO tests",
            "npm run build succeeds and the production build was tested locally (npm start)",
            "/matches and /history still behave exactly as before",
            "No console errors or warnings on load or during interaction",
            "Env vars documented in the README; no secrets committed",
            "CI workflow runs lint, typecheck and tests on every pull request",
            "Branch merged; working tree clean; README updated with the new routes",
        ]),
    ]:
        st.append(h2(title))
        st.append(checklist([[i] for i in items], [CONTENT_W - 6 * mm]))
        st.append(Spacer(1, 2 * mm))

    st.append(h2("11.8  Device and browser matrix"))
    st.append(table(["Device / browser", "What to check specifically"],
                    [
                        ["iPhone SE-class (320–375 px), Safari iOS", "Hero fold, hamburger menu, form autofill and keyboard behaviour, tap targets, tel:/mailto: handoff"],
                        ["Mid-range Android (360–412 px), Chrome", "Font rendering, chart tooltips with touch, scroll-spy, image decode performance"],
                        ["iPad / tablet (768–1024 px), Safari and Chrome", "Grid collapse points, hover-only affordances still reachable by touch"],
                        ["Laptop 1440×900, Chrome + Firefox + Safari", "Full nav, three-column grids, focus rings, print view"],
                        ["Desktop 1920+, Edge or Chrome, 100% and 150% zoom", "Container cap, line lengths at zoom, no clipped stat tiles"],
                        ["Windows High Contrast / forced-colors mode", "Borders and focus indicators still visible"],
                        ["Slow 3G simulation", "Hero renders text first; images stream in; no layout shift"],
                    ],
                    widths=[64 * mm, CONTENT_W - 64 * mm], cell_style=CELL))

    # =============================================================== 12. risk
    st.append(PageBreak())
    st.append(section_header("12", "Risk, claims and compliance",
                             "The parts of this page that could hurt you if handled carelessly — and the exact "
                             "wording that keeps you safe."))

    st.append(h2("12.1  Prohibited claims"))
    st.append(callout("dont",
        "Do not state or imply any of the following anywhere on the site, in metadata, in OG images or in social "
        "posts linking to it:<br/><br/>"
        "• \"Guaranteed returns\", \"risk-free\", \"consistent profits\", \"profitable every month\"<br/>"
        "• Any return figure that mixes the $13k personal account and the $100k account<br/>"
        "• Any annualised, projected, extrapolated or \"on track to\" figure<br/>"
        "• That you manage, or will manage, other people's money<br/>"
        "• That you sell or provide signals, mentorship for profit, or copy-trading<br/>"
        "• That a specific prop firm has funded, endorsed or partnered with you, unless you can show the agreement<br/>"
        "• \"Passed every evaluation\" or any absolute count you cannot document — the CV says 7+ [CONFIRM the exact "
        "number and, ideally, keep the certificates or emails]<br/>"
        "• Any testimonial you did not receive, or received without permission to publish"))

    st.append(h2("12.2  Why the trading section still belongs on the page"))
    st.append(P("A sceptical reader may ask why a developer/evaluator page shows trading at all. Three reasons, and "
                "the page should make them explicit rather than defensive:"))
    st.append(numbered([
        "<b>It is the source of the transferable skill.</b> A trading journal and an evaluation rubric are the same "
        "artefact: a pre-committed standard, a recorded observation, and a written justification of the difference.",
        "<b>It produced a real software product.</b> PropFirm Intelligence exists because of this trading, and it is "
        "the strongest engineering artefact on the page.",
        "<b>Transparency is the differentiator.</b> Publishing the drawdown, the 12-loss streak and the EUR/USD leak "
        "alongside the profit is a demonstration of exactly the calibration an AI-evaluation client is buying.",
    ]))

    st.append(h2("12.3  Regulatory and jurisdiction notes"))
    st.append(table(["Topic", "Position to take"],
                    [
                        ["Investment advice", "You are not providing any. State it plainly in the footer disclaimer (Section 6.6) and on /trading."],
                        ["Fund management / solicitation", "Do not offer it, even informally. If someone asks in the form, reply that you trade your own and firm-allocated capital only."],
                        ["Prop-firm affiliation", "Describe firms factually (\"evaluations with FTMO-style programmes\") unless you have written permission to name a firm in a marketing context. The PropFirm Intelligence catalogue already cites public rule pages with dates — keep that pattern."],
                        ["Nigerian regulatory bodies (SEC/CBN)", "Not engaged by a personal portfolio site that offers no services to the public. Keep it that way: no client accounts, no pooled funds, no signal subscriptions."],
                        ["Tax and record-keeping", "Retain every export. The published ledger is a subset of records you should keep anyway."],
                        ["Data protection (NDPR/GDPR)", "You collect only what the form asks for. State the purpose, do not add advertising cookies, do not sell or share the data, and delete enquiries you do not act on. If you use GA4 or store submissions in a database, publish a /privacy page."],
                        ["Third-party content", "Firm names and rule text in the product are cited with source URLs and dates — continue that practice; do not copy firm logos onto your personal page without permission."],
                        ["Photo rights", "Your own portrait, taken by you or with the photographer's written transfer of usage rights."],
                    ],
                    widths=[46 * mm, CONTENT_W - 46 * mm], cell_style=CELL))

    st.append(h2("12.4  Personal-safety and privacy decisions"))
    st.append(bullets([
        "<b>Phone number:</b> publishing it increases contact rate and also spam. Recommended: publish it, but use a "
        "WhatsApp link (<font face='DJM'>https://wa.me/2349067492422</font>) and keep a separate business line if "
        "the volume becomes a problem. Never render it as <font face='DJM'>tel:</font> plus a mailto on the same "
        "line at mobile widths — it becomes an accidental-tap trap.",
        "<b>Home address:</b> never publish. \"Abuja, Nigeria\" is enough.",
        "<b>Email obfuscation:</b> plain text is fine and better for recruiters; a honeypot plus basic rate limiting "
        "handles the spam. Avoid JavaScript-encoded emails — they break copy-paste and screen readers.",
        "<b>Certificate IDs:</b> publish them. They are identifiers meant for verification, not secrets.",
        "<b>Exact account balances:</b> publishing a $100,000 account size is normal in prop trading, but decide "
        "consciously [CONFIRM]. Tier B in Section 7.8 assumes you publish per-segment balances; you may show P&L "
        "percentages instead if you prefer.",
    ]))

    # =============================================================== Appendix A
    st.append(PageBreak())
    st.append(section_header("Appendix A", "Full trade ledger — 100 closed positions",
                             "The complete evidence behind Section 7, chronological. Balance figures are USD as "
                             "exported. Segment 2 begins at trade #100 with a new $100,000 account."))

    with (ROOT / "trades.csv").open() as fh:
        rows = list(csv.DictReader(fh))

    def num(x: float, nd: int) -> str:
        return f"{x:,.{nd}f}".rstrip("0").rstrip(".")

    ledger = []
    for r in rows:
        pnl = float(r["pnl"])
        ledger.append([
            r["id"], r["date"], r["time"], r["symbol"], r["direction"][:1].upper(),
            num(float(r["units"]), 4), num(float(r["avg_price"]), 6), num(float(r["exit_price"]), 6),
            ("+" if pnl > 0 else ("\u2212" if pnl < 0 else "")) + f"{abs(pnl):,.2f}",
            f"{float(r['balance_after']):,.2f}", r["account"],
        ])
    st.append(table(
        ["#", "Date", "Time", "Instrument", "Dir", "Units", "Avg entry", "Exit", "P&L USD", "Balance after", "Seg"],
        ledger,
        widths=[7 * mm, 18 * mm, 12 * mm, 24 * mm, 8 * mm, 18 * mm, 18 * mm, 18 * mm, 20 * mm, 22 * mm,
                CONTENT_W - 165 * mm],
        aligns=["r", "l", "l", "l", "c", "r", "r", "r", "r", "r", "c"],
        cell_style="CellSm", pad=1.9))
    st.append(Spacer(1, 2 * mm))
    st.append(P("Machine-readable copies: <font face='DJM'>docs/landing-page/trades.csv</font> (same rows, all "
                "fields) and <font face='DJM'>docs/landing-page/equity-curve.json</font> (chart-ready series). "
                "Ship <font face='DJM'>trades.csv</font> to <font face='DJM'>public/</font> if you want the "
                "download link in S8.", "Small"))

    # =============================================================== Appendix B
    st.append(PageBreak())
    st.append(section_header("Appendix B", "Machine-readable content contract",
                             "The exact shape of <font face='DJM'>src/content/profile.ts</font>. Fill every "
                             "[CONFIRM] field, then build components against this contract."))
    st.append(code_block(
        "{\n"
        '  "identity": {\n'
        '    "name": "Divine Abba Chimdirim", "firstName": "Divine", "monogram": "DAC",\n'
        '    "roleLine": "AI Training & Evaluation · Software Developer (JavaScript, React, Node.js)",\n'
        '    "shortRole": "AI Evaluation & Full-Stack Developer",\n'
        '    "city": "Abuja", "region": "FCT", "country": "Nigeria", "timezone": "WAT (UTC+1)",\n'
        '    "email": "divineabbachimdirim1@gmail.com", "phone": "+234 906 749 2422",\n'
        '    "whatsapp": "https://wa.me/2349067492422",\n'
        '    "github": "https://github.com/Divine-AC",\n'
        '    "linkedin": "https://www.linkedin.com/in/divine-abba-883540311",\n'
        '    "cvUrl": "/Divine_Abba_Chimdirim_Resume.pdf", "ledgerUrl": "/trades.csv",\n'
        '    "availability": "[CONFIRM]", "responseTime": "[CONFIRM]", "languages": ["English"]\n'
        "  },\n"
        '  "hero": { "eyebrow": "...", "headline": "...", "headlineAlts": ["..."], "subheadline": "...",\n'
        '            "ctas": [{"label":"Work with me","href":"#contact","variant":"primary"},\n'
        '                     {"label":"View my projects","href":"#projects","variant":"secondary"}],\n'
        '            "chips": ["Mercor · Introduction to Agents ✓ certified", "..."],\n'
        '            "photo": {"src":"/images/hero-portrait.webp","alt":"..."} },\n'
        '  "proofStrip": [ {"value":"5+ yrs","label":"Trading proprietary capital","hint":"10,000+ hours logged [CV]"} ],\n'
        '  "pillars": [ {"icon":"ClipboardCheck","title":"AI training & evaluation","body":"...","bullets":["..."],"link":{"label":"...","href":"#credentials"}} ],\n'
        '  "about": { "paragraphs": ["...","...","..."], "quickFacts": [ {"label":"Based in","value":"Abuja, Nigeria"} ] },\n'
        '  "skills": [ {"heading":"Languages & frontend","core":["JavaScript (ES2022)","React"],"working":["TypeScript"]} ],\n'
        '  "projects": [ ProjectEntry ],\n'
        '  "experience": [ ExperienceEntry ],\n'
        '  "credentials": [ Credential ],\n'
        '  "leadership": [ {"bigNumber":"₦162,000+","title":"...","detail":"..."} ],\n'
        '  "references": { "mode": "available-on-request", "quotes": [] },\n'
        '  "remote": [ {"icon":"Wifi","heading":"Connectivity","body":"[CONFIRM]"} ],\n'
        '  "faq": [ {"q":"...","a":"..."} ],\n'
        '  "contact": { "heading":"...", "subline":"...", "interests": ["AI evaluation work","..."],\n'
        '               "formEndpointEnv": "FORM_ENDPOINT", "successTitle":"Message sent", "...": "..." },\n'
        '  "trading": {\n'
        '    "publicationTier": "B",\n'
        '    "sample": {"trades":100,"from":"2026-09-10","to":"2026-11-13","days":64,"currency":"USD"},\n'
        '    "segments": [ {"label":"Personal account","start":13194.05,"end":13680.48,"net":486.43,"trades":99},\n'
        '                  {"label":"New $100,000 account","start":100000,"end":102297.18,"net":2297.18,"trades":1} ],\n'
        '    "metrics": {"winRate":35.0,"profitFactor":1.14,"payoff":2.05,"avgWin":647.60,"avgLoss":-315.59,\n'
        '                "expectancy":27.84,"maxBalanceDrawdownPct":40.79,"worstLossStreak":12,"bestWinStreak":3},\n'
        '    "bySymbol": [ {"symbol":"Gold (XAU/USD)","trades":23,"net":2521.78,"winRate":43.5,"profitFactor":1.90} ],\n'
        '    "byDirection": [ {"direction":"short","trades":55,"net":7717.01,"profitFactor":1.81} ],\n'
        '    "monthly": [ {"month":"2026-09","trades":39,"net":-1137.23,"winRate":43.6} ],\n'
        '    "insights": ["Short-side and metals-biased edge","EUR/USD is the leak","No entries 00:00-06:00 UTC"],\n'
        '    "disclaimer": "See Section 6.6 — verbatim"\n'
        "  },\n"
        '  "seo": { "title":"...", "description":"...", "canonical":"...", "ogImage":"/images/og-image.png" },\n'
        '  "legal": { "tradingDisclaimer":"...", "certificateLine":"...", "footer":"...", "privacy":"..." }\n'
        "}",
        title="Content contract (JSON view of the typed module)"))

    # =============================================================== Appendix C
    st.append(PageBreak())
    st.append(section_header("Appendix C", "Links, IDs and verification references",
                             "Every external reference the page needs, in one table. Test each one before launch."))
    st.append(table(["Item", "Value", "Where it appears", "Status"],
                    [
                        ["GitHub profile", "https://github.com/Divine-AC", "S1 nav, S7, S15, footer, JSON-LD sameAs", "Verified in CV"],
                        ["LinkedIn profile", "https://www.linkedin.com/in/divine-abba-883540311", "S15, footer, JSON-LD sameAs", "Verified in CV"],
                        ["Email", "divineabbachimdirim1@gmail.com", "S15, footer, mailto fallback", "Verified in CV"],
                        ["Phone / WhatsApp", "+234 906 749 2422  →  https://wa.me/2349067492422", "S0, S15", "Verified in CV"],
                        ["Mercor certificate", "Introduction to Agents · Oct 2026 · ID MRC-2026-HKHJULZA", "S2 chip, S10, JSON-LD hasCredential", "ID from CV; verify URL [CONFIRM]"],
                        ["TS Academy certificate", "Software Development · certified 31 Oct 2026 · ID TSWW5QW86KV4MJ", "S2 chip, S10, JSON-LD hasCredential", "ID from CV; verify URL [CONFIRM]"],
                        ["Recruitment Portal — live demo", "[CONFIRM URL]", "S7 card 2", "Referenced in CV, URL needed"],
                        ["Recruitment Portal — repo", "[CONFIRM URL under github.com/Divine-AC]", "S7 card 2", "Referenced in CV, URL needed"],
                        ["Banking Web App — live demo", "[CONFIRM URL]", "S7 card 3", "Referenced in CV, URL needed"],
                        ["E-commerce Store — repo", "[CONFIRM URL]", "S7 card 4", "Referenced in CV, URL needed"],
                        ["PropFirm Intelligence — repo", "https://github.com/Divine-AC/propfirmintelligenence", "S7 featured card, S1 product link", "This repository"],
                        ["PropFirm Intelligence — live app", "[CONFIRM: deploy publicly or remove]", "S7 featured card, S1", "Local MVP today"],
                        ["CV download", "/Divine_Abba_Chimdirim_Resume.pdf", "S0, S2, S15, footer", "You have the file"],
                        ["Trade ledger download", "/trades.csv", "S8, S15, /trading", "Generated in docs/landing-page"],
                        ["Domain", "[CONFIRM: divinechimdirim.com or similar]", "Canonical, OG, JSON-LD url", "Not yet registered"],
                        ["Firm rule sources cited by the product", "ftmo.com · help.fundednext.com · the5ers.com · brightfunded.com (snapshot 2026-10-29, per README)", "Not on the landing page; belongs to /matches", "Already documented in README"],
                    ],
                    widths=[36 * mm, 62 * mm, 44 * mm, CONTENT_W - 142 * mm], cell_style=CELL))

    # =============================================================== Appendix D
    st.append(PageBreak())
    st.append(section_header("Appendix D", "Hand-off prompt",
                             "Copy everything inside the box into your AI build agent or paste it into a freelancer "
                             "brief. It assumes this PDF is attached."))
    st.append(code_block(
        "Build my personal landing page inside this repository (Divine-AC/propfirmintelligenence).\n"
        "The attached PDF is the complete specification: \"Landing Page Build Specification &\n"
        "Content Pack, v1.0\". Follow it exactly. Do not invent content.\n\n"
        "Ground rules\n"
        "1. Read AGENTS.md first, then the guides in node_modules/next/dist/docs/. This is\n"
        "   Next.js 16.4.3 with breaking changes - do not build from memory of older versions.\n"
        "2. Stack: Next.js App Router, React 19, Tailwind CSS v4 (@theme in CSS, no config js),\n"
        "   TypeScript strict, Vitest. Keep the existing /matches and /history routes working\n"
        "   exactly as they are.\n"
        "3. All copy comes from Section 6 (copy deck) and Section 4 (per-section copy). Put it in\n"
        "   src/content/profile.ts following the Appendix B contract. No hard-coded strings in JSX.\n"
        "4. All colours, fonts, spacing and components come from Section 5. Define the tokens once\n"
        "   in src/app/globals.css (replacing the Arial setup) and never hard-code a hex value.\n"
        "5. Build the sixteen blocks S0-S15 in the order given in Section 10, phase 2.\n"
        "6. Trading figures come only from docs/landing-page/trading-stats.json and\n"
        "   equity-curve.json. Use the Tier-B publication rules in Section 7.8. Show the drawdown\n"
        "   and the losing streak next to the profits, and always render the Section 6.6\n"
        "   disclaimer without requiring any user interaction.\n"
        "7. Charts are hand-rolled SVG. Do not add a chart library, animation library or icon\n"
        "   barrel import. Budget: <= 90 KB first-party JS gzipped.\n"
        "8. Contact form: Route Handler at src/app/api/contact following the reference\n"
        "   implementation in Section 8.7 - server-side validation, honeypot, 3-second timing\n"
        "   check, structured field errors, no secrets in client code, mailto fallback.\n"
        "9. SEO and structured data per Section 8.4: metadata, sitemap.ts, robots.ts, and JSON-LD\n"
        "   for Person, WebSite, ItemList and FAQPage.\n"
        "10. Accessibility per Section 8.6 (WCAG 2.2 AA) - semantic landmarks, skip link, one h1,\n"
        "    visible focus, hidden data tables behind every chart, +/− signs as text, and full\n"
        "    prefers-reduced-motion support.\n"
        "11. Add tests/content.test.ts, tests/trading-stats.test.ts and tests/seo.test.ts as\n"
        "    specified in Section 8.10.\n\n"
        "Placeholders: use a labelled grey box with the exact required dimensions for the portrait,\n"
        "the four project screenshots and the OG image, and put every [CONFIRM] item from\n"
        "Appendix C into a single CHECKLIST.md at the repo root. Do not fabricate URLs,\n"
        "testimonials, dates or numbers.\n\n"
        "Done means: npx tsc --noEmit, npm run lint and npm test all pass; npm run build succeeds;\n"
        "every box in the Section 11 checklist is ticked or recorded as a known defect; and the\n"
        "page runs as a live preview bound to 0.0.0.0 so I can review it before deploy.\n\n"
        "Work on the current branch only. Commit in small logical steps with clear messages, then\n"
        "open a pull request describing what was built and listing the CHECKLIST.md items I still\n"
        "owe you.",
        title="Hand-off prompt (plain text)", wrap=88))
    st.append(Spacer(1, 4 * mm))
    st.append(callout("note",
        "<b>End of specification.</b> Companion files in <font face='DJM'>docs/landing-page/</font>: "
        "<font face='DJM'>content.json</font> (the copy deck as data) · <font face='DJM'>trades.csv</font> · "
        "<font face='DJM'>trading-stats.json</font> · <font face='DJM'>equity-curve.json</font> · "
        "<font face='DJM'>raw-trades.txt</font> · <font face='DJM'>analyse_trades.py</font> (regenerates all "
        "trading figures from a new export)."))
