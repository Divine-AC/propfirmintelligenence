"""Part 2 — Section 4: the section-by-section build specification (S0–S15)."""

from __future__ import annotations

from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Spacer

from spec_pdf_lib import (CONTENT_W, P, bullets, callout, code_block, h2, h3, kv_table, numbered,
                          rule, section_header, stat_tiles, table)

CELL = "CellSm"


def spec(rows: list[tuple[str, str]]):
    """Standard spec block for one page section."""
    return kv_table(rows, label_w=30 * mm, style=CELL)


def copy_block(title: str, body: str):
    return callout("copy", body, title=title)


def build(st: list, ctx: dict) -> None:
    st.append(section_header("4", "Section-by-section build specification",
                             "Sixteen blocks. Each one lists its purpose, layout, components, data source, "
                             "interaction states, responsive rules, accessibility requirements and acceptance "
                             "criteria — followed by the final copy to paste. Copy is written in your voice "
                             "(Section 2.5) and uses only facts from the CV or the trade export."))

    # =============================================================== S0
    st.append(h2("S0 · Utility bar (optional)"))
    st.append(spec([
        ("Purpose", "Answer the two questions a recruiter has before reading anything: where are you, and are you "
                    "available? Also gives a permanent CV download entry point."),
        ("Layout", "Full-width strip, 36 px tall, centred content, max width 1200 px. Left: location + timezone. "
                   "Right: availability pill + \"Download CV\" link."),
        ("Style", "Background <font face='DJM'>#0B1526</font>, text 12 px <font face='DJM'>#94A3B8</font>, bottom "
                  "border 1 px <font face='DJM'>#1E293B</font>."),
        ("Data", "<font face='DJM'>profile.location</font>, <font face='DJM'>profile.availability</font>, "
                 "<font face='DJM'>profile.cvUrl</font>"),
        ("Behaviour", "Hides below 640 px (the same facts appear in the hero chips). \"Download CV\" is a real "
                      "<font face='DJM'>&lt;a download&gt;</font> to <font face='DJM'>/Divine_Abba_Chimdirim_Resume.pdf</font>."),
        ("Acceptance", "Strip is present at ≥ 640 px, CV file downloads with the correct filename, and the timezone "
                       "text is accurate for WAT (UTC+1, no daylight saving)."),
    ]))
    st.append(copy_block("S0 copy",
        "<b>Left:</b>  Abuja, Nigeria · WAT (UTC+1) · Open to remote work worldwide<br/>"
        "<b>Right:</b>  ● Available for AI-evaluation and full-stack contracts  |  Download CV ↓"))

    # =============================================================== S1
    st.append(h2("S1 · Navbar"))
    st.append(spec([
        ("Purpose", "Orientation and one persistent conversion path."),
        ("Layout", "Sticky top, 64 px (56 px mobile), max width 1200 px, padding 20 px horizontal. Left: monogram + "
                   "name. Centre/right: anchor links. Far right: primary button."),
        ("Components", "<font face='DJM'>Navbar.tsx</font> (extend the existing component so the product routes stay "
                       "reachable), <font face='DJM'>MobileMenu.tsx</font>, <font face='DJM'>Monogram.tsx</font>."),
        ("Copy", "Brand: <b>DAC</b> monogram + \"Divine Abba Chimdirim\" (name hidden below 480 px, monogram stays). "
                 "Links: About · Skills · Projects · Trading · Experience. Button: <b>Get in touch</b>. "
                 "Product link (secondary, right of the divider): <b>PropFirm Intelligence ↗</b>."),
        ("States", "default / hover (text → <font face='DJM'>#22D3EE</font>) / active section (accent + 2 px "
                   "underline) / focus-visible (2 px ring, 2 px offset) / scrolled (background opacity 0.6 → 0.95)."),
        ("Responsive", "≥ 1024 px full links; 640–1023 px hide \"Skills\" and \"Experience\"; &lt; 640 px hamburger."),
        ("Accessibility", "<font face='DJM'>&lt;nav aria-label=\"Primary\"&gt;</font>, current link gets "
                          "<font face='DJM'>aria-current=\"true\"</font>, menu button has "
                          "<font face='DJM'>aria-expanded</font> and <font face='DJM'>aria-controls</font>, "
                          "focus trap in the open sheet, Escape closes."),
        ("Acceptance", "Clicking every link lands on the right block with 80 px of clearance; the active link updates "
                       "while scrolling; the menu is fully operable with the keyboard alone."),
    ]))

    # =============================================================== S2
    st.append(h2("S2 · Hero"))
    st.append(spec([
        ("Purpose", "State who you are, for whom, and what to do next — in under 10 seconds."),
        ("Layout", "Two columns at ≥ 1024 px: text 58% / visual 42%, gap 48 px, vertical padding 96 px top and "
                   "80 px bottom. Single column below that, text first, image second (image may be hidden below "
                   "480 px if it slows the fold)."),
        ("Content stack", "eyebrow → h1 → sub-headline → CTA row → credibility chips → micro-note."),
        ("Visual", "Portrait photo in a rounded rectangle (radius 24 px) with a 1 px border "
                   "<font face='DJM'>#1E293B</font>, plus a floating \"stat card\" overlapping the bottom-left "
                   "corner showing live-ish trading data (see copy). Behind everything: a subtle radial gradient "
                   "from <font face='DJM'>#0E7490</font> at 12% opacity and a faint 40 px grid at 3% opacity."),
        ("Animation", "Headline and sub-headline fade up 12 px over 500 ms, 80 ms stagger. Stat card counts up once "
                      "on mount. All disabled under <font face='DJM'>prefers-reduced-motion</font>."),
        ("Accessibility", "One <font face='DJM'>&lt;h1&gt;</font> only, on the whole page. Photo has descriptive "
                          "alt text. CTAs are real links/buttons with accessible names ≥ 4 characters."),
        ("Acceptance", "Headline + sub-headline + both CTAs visible above the fold at 375×667 and 1440×900; LCP is "
                       "the headline text or the preloaded portrait, and LCP ≤ 2.0 s on simulated 4G."),
    ]))
    st.append(copy_block("S2 copy — eyebrow",
        "AI TRAINING &amp; EVALUATION  ·  SOFTWARE DEVELOPER  ·  ABUJA, NIGERIA"))
    st.append(copy_block("S2 copy — headline (h1, primary)",
        "I evaluate AI output the way I trade:<br/>rules first, evidence always."))
    st.append(copy_block("S2 copy — headline alternatives",
        "<b>A2:</b> Software developer and AI evaluation specialist — I check the work, then prove it.<br/>"
        "<b>A3:</b> Careful eyes for AI output. Shipping hands for React and Node.js.<br/>"
        "<b>A4 (developer-first, if you choose P2):</b> Full-stack developer building React and Node.js products "
        "from Abuja — and the tools I wish existed."))
    st.append(copy_block("S2 copy — sub-headline",
        "I'm Divine Abba Chimdirim. I review model and agent output against explicit rubrics, with calibrated "
        "scores and written justifications, and I build the JavaScript applications that make that work visible. "
        "Five years trading proprietary capital taught me the habit this job actually needs: record everything, "
        "claim nothing you cannot defend."))
    st.append(copy_block("S2 copy — CTAs",
        "<b>Primary button:</b> Work with me →   (scrolls to #contact)<br/>"
        "<b>Secondary button:</b> View my projects   (scrolls to #projects)<br/>"
        "<b>Tertiary text link:</b> Download CV (PDF, 2 pages) ↓"))
    st.append(copy_block("S2 copy — credibility chips (4, shown as small pills)",
        "Mercor · Introduction to Agents  ✓ certified<br/>"
        "TS Academy · Software Development  ✓ certified<br/>"
        "12-person team led · full-stack delivery<br/>"
        "5+ years trading · 10,000+ hours · 7+ evaluations passed"))
    st.append(copy_block("S2 copy — floating stat card on the photo",
        "<b>Card title:</b> Current sample · 100 closed trades<br/>"
        "<b>Big number:</b> +$2,783.61<br/>"
        "<b>Sub-line:</b> 10 Sep – 13 Nov 2026 · profit factor 1.14<br/>"
        "<b>Footnote (7 px, muted):</b> Past performance does not predict future results. Full method: /trading"))
    st.append(callout("warn",
        "<b>Only use the stat card if you accept Section 7.8's Tier-B conditions.</b> The safest alternative is a "
        "non-numerical card: <i>\"Building PropFirm Intelligence — evidence-based prop-firm matching\"</i> with a "
        "link to the tool. Decide before build starts [CONFIRM]."))

    # =============================================================== S3
    st.append(h2("S3 · Proof strip"))
    st.append(spec([
        ("Purpose", "Deliver the six hardest facts as numbers before any prose. This is the section recruiters "
                    "screenshot."),
        ("Layout", "Six tiles in a row at ≥ 1280 px, 3×2 at 768–1279 px, 2×3 below 768 px. Each tile: big number "
                   "(28 px bold, accent), label (11 px), source hint (9 px muted)."),
        ("Rule", "Every tile must be verifiable. Source hint text is shown, not hidden — it is the point."),
        ("Acceptance", "No tile states a figure that cannot be traced to the CV, the trade export, or a live URL."),
    ]))
    st.append(table(
        ["#", "Big number", "Label", "Source hint shown under it"],
        [
            ["1", "5+ yrs", "Trading proprietary capital", "10,000+ hours logged [CV]"],
            ["2", "7+", "Prop-firm evaluations passed", "1–2% risk per trade [CV]"],
            ["3", "12", "Developers led on a full-stack delivery", "Job Recruitment Portal, 2026 [CV]"],
            ["4", "~40%", "Inventory-tracking efficiency gain", "Dvine Block Industry [CV]"],
            ["5", "27", "Firm programmes researched and sourced", "PropFirm Intelligence, 4 firms [repo]"],
            ["6", "100", "Closed trades published with full method", "10 Sep – 13 Nov 2026 [DATA]"],
        ],
        widths=[8 * mm, 26 * mm, 62 * mm, CONTENT_W - 96 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "Alternative tiles if you prefer engineering-only proof: <b>3</b> full-stack projects shipped · "
        "<b>6</b>-month certified developer programme · <b>₦162,000+</b> raised by a 12-person team in 3 weeks · "
        "<b>HND Distinction</b>, Civil Engineering Technology · <b>2</b> verifiable certificate IDs."))

    # =============================================================== S4
    st.append(h2("S4 · What I do — three pillars"))
    st.append(spec([
        ("Purpose", "Let three different audiences each find themselves in one card."),
        ("Layout", "Three equal cards at ≥ 900 px, stacked below. Card: icon (24 px, accent) → title (18 px bold) → "
                   "3–4 line description → 3 bullet capabilities → text link."),
        ("Interaction", "Hover: border <font face='DJM'>#1E293B</font> → <font face='DJM'>#22D3EE</font>, "
                        "translateY(−2 px), 180 ms ease-out. Whole card is clickable (link wrapped around it), "
                        "with the inner link <font face='DJM'>aria-hidden</font> to avoid duplicate announcements."),
        ("Acceptance", "Card 1 speaks to AI-evaluation buyers, card 2 to engineering buyers, card 3 to trading "
                       "contacts — and none of them uses a banned word from Section 2.5."),
    ]))
    st.append(copy_block("S4 · Card 1",
        "<b>Icon:</b> checklist / magnifier<br/>"
        "<b>Title:</b> AI training &amp; evaluation<br/>"
        "<b>Body:</b> I review model and agent output against a rubric, calibrate my scores, and write "
        "justifications another reviewer could follow. Mercor's Introduction to Agents course trained exactly "
        "this: rigour, calibration and clarity.<br/>"
        "<b>Bullets:</b> Agent-output evaluation against rubrics · Score calibration and written justification · "
        "Code and technical-output review · Error categorisation and reporting<br/>"
        "<b>Link:</b> See my credentials → #credentials"))
    st.append(copy_block("S4 · Card 2",
        "<b>Icon:</b> code brackets<br/>"
        "<b>Title:</b> Software development<br/>"
        "<b>Body:</b> I build and debug full-stack JavaScript applications — React front ends, Node.js and Express "
        "APIs, MongoDB persistence — with JWT authentication and role-based access control, deployed on Vercel "
        "and Render.<br/>"
        "<b>Bullets:</b> React · Node.js · Express · MongoDB · REST APIs · JWT &amp; RBAC · Git/GitHub workflows · "
        "Vercel &amp; Render deployment<br/>"
        "<b>Link:</b> View projects → #projects"))
    st.append(copy_block("S4 · Card 3",
        "<b>Icon:</b> candlestick chart<br/>"
        "<b>Title:</b> Markets &amp; prop trading<br/>"
        "<b>Body:</b> Five years trading FX, metals, indices and crypto on proprietary capital, with 1–2% risk per "
        "trade and 7+ passed firm evaluations. I also build the tooling: PropFirm Intelligence analyses a closed-"
        "trade export and matches it to documented firm rules.<br/>"
        "<b>Bullets:</b> Gold, silver, EUR/USD, USD/JPY, BTC, WTI · Risk-first position sizing · Evaluation "
        "preparation · Trade-history analytics<br/>"
        "<b>Link:</b> Read the trading record → #trading"))

    # =============================================================== S5
    st.append(h2("S5 · About"))
    st.append(spec([
        ("Purpose", "The human paragraph. Explains the unusual combination — civil engineering quality control, "
                    "operations, teaching, trading, and now AI evaluation — as one coherent trait: verification."),
        ("Layout", "Two columns ≥ 900 px: prose 62% / \"quick facts\" panel 38%. Prose is 3 short paragraphs, "
                   "max 68 characters per line for readability."),
        ("Quick facts panel", "Bordered card, 8 rows of label/value, monospace values."),
        ("Acceptance", "A reader can retell what you do in one sentence after reading this section."),
    ]))
    st.append(copy_block("S5 · About copy (paste as three paragraphs)",
        "<b>P1:</b> I started in civil engineering, where the job was to inspect a structure and say whether it "
        "matched the drawing — and to prove it with a log. That habit never left. As an operations manager I built "
        "the Excel tracking system that gave a ₦5–6 million monthly business real visibility into inventory, "
        "wastage and performance.<br/><br/>"
        "<b>P2:</b> Then I learned to build software properly: a six-month certified programme at TS Academy, "
        "followed by leading a 12-person team through a full-stack recruitment platform — React front end, "
        "Node.js and Express APIs, MongoDB, JWT authentication and role-based access, deployed on Vercel and "
        "Render. I have shipped a banking app and an e-commerce store the same way.<br/><br/>"
        "<b>P3:</b> Today I combine both: I evaluate AI agent output for rigour, calibration and clarity — the "
        "skill Mercor's Introduction to Agents course tests — and I keep trading proprietary capital, five years "
        "and 10,000+ hours in. Trading is where I learned to write down what I expected, what happened, and why "
        "the difference occurred. It is the same discipline an evaluation rubric asks for."))
    st.append(table(["Label", "Value"],
                    [["Based in", "Abuja, Nigeria (WAT, UTC+1)"],
                     ["Working as", "AI training &amp; evaluation · Software development"],
                     ["Stack", "JavaScript, TypeScript, React, Node.js, Express, MongoDB"],
                     ["Trading", "FX, metals, crypto, energy — 5+ years, prop capital"],
                     ["Education", "HND Civil Engineering Technology (Distinction) · TS Academy"],
                     ["Certified", "Mercor Introduction to Agents · TS Academy Software Development"],
                     ["Languages", "English (professional) · [CONFIRM: add others, e.g. Hausa, Igbo]"],
                     ["Remote setup", "High-speed fibre, power backup, flexible hours across timezones"],
                     ["Availability", "[CONFIRM: e.g. 20–40 h/week, start within 1 week]"],
                     ["Time to reply", "[CONFIRM: e.g. within 24 hours on weekdays]"]],
                    widths=[36 * mm, CONTENT_W - 36 * mm], cell_style=CELL))

    # =============================================================== S6
    st.append(h2("S6 · Skills"))
    st.append(spec([
        ("Purpose", "Keyword coverage for recruiters and applicant-tracking scrapers, grouped so it reads as "
                    "judgement rather than a list."),
        ("Layout", "Five groups in a responsive grid (2 columns ≥ 768 px). Each group: heading (13 px, accent), "
                   "then chips. Chip: 12 px, padding 6×12, radius 999, border <font face='DJM'>#1E293B</font>, "
                   "background <font face='DJM'>#0B1526</font>."),
        ("Proficiency", "Two-level marking only: <b>core</b> (filled accent dot) and <b>working</b> (outline dot). "
                        "Do not use percentage bars — they are unverifiable and read as junior."),
        ("Acceptance", "All CV skills present; nothing claimed that you could not defend in a technical interview "
                       "today."),
    ]))
    st.append(table(["Group heading", "Core (filled dot)", "Working (outline dot)"],
                    [
                        ["Languages &amp; frontend", "JavaScript (ES2022), React, JSX, HTML5, CSS3, responsive design",
                         "TypeScript, React Router, Vite, Axios, Tailwind CSS"],
                        ["Backend &amp; data", "Node.js, Express.js, REST APIs, MongoDB, Mongoose",
                         "API design and error handling, data modelling"],
                        ["Auth &amp; security", "JWT authentication, bcrypt password hashing, role-based access control",
                         "Session strategy, input validation, environment-secret hygiene"],
                        ["Evaluation &amp; quality", "AI agent evaluation, rubric-based scoring, calibration, "
                         "debugging, quality control",
                         "Written justification and reviewer-facing reporting, tracking and reporting systems"],
                        ["Tools &amp; delivery", "Git, GitHub, VS Code, Vercel, Render",
                         "Vitest, ESLint, Microsoft Excel (modelling and tracking), Linux basics"],
                    ],
                    widths=[36 * mm, 66 * mm, CONTENT_W - 102 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "TypeScript is legitimately listed as \"working\" — this repository is written in TypeScript "
        "(<font face='DJM'>tsconfig.json</font>, typed modules in <font face='DJM'>src/lib</font>) and the TS "
        "Academy programme covers it [CV]. Move it to \"core\" only if you are comfortable being interviewed on "
        "generics, discriminated unions and <font face='DJM'>unknown</font> vs <font face='DJM'>any</font>."))

    # =============================================================== S7
    st.append(h2("S7 · Projects"))
    st.append(spec([
        ("Purpose", "Proof you ship. This is the section Segment B judges you on."),
        ("Layout", "Featured project (PropFirm Intelligence) as a wide 2-column card at the top: left = text, "
                   "right = screenshot. Then three cards in a row (stacked below 900 px). Card: screenshot "
                   "16:10 → title → one-line description → stack chips → 2 metric bullets → links."),
        ("Images", "Real screenshots, 1600×1000 source, exported as WebP/AVIF, served through "
                   "<font face='DJM'>next/image</font>, lazy-loaded except the featured one. Alt text describes "
                   "the UI, not the vibe."),
        ("States", "Hover: image scales 1.02, border → accent. Links have visible focus rings."),
        ("Acceptance", "Every \"Live demo\" and \"GitHub\" link opens a working page. If a demo is down, remove the "
                       "link rather than leaving a 404."),
    ]))
    st.append(copy_block("S7 · Featured — PropFirm Intelligence",
        "<b>Kicker:</b> Featured project · in active development<br/>"
        "<b>Title:</b> PropFirm Intelligence<br/>"
        "<b>One-liner:</b> Evidence-based prop-firm matching and trading-history analysis, built because I was "
        "tired of choosing firms on marketing copy.<br/>"
        "<b>Body:</b> A local-first Next.js application. Import a closed-trade CSV and it computes net P&amp;L, win "
        "rate, profit factor, expectancy, payoff ratio, streaks, per-instrument and per-weekday breakdowns and "
        "drawdown — then matches your style against 27 researched account programmes from FTMO, FundedNext, "
        "The5ers and BrightFunded. Every stored rule carries its own source URL and verification date, and "
        "unknowns are labelled unverified instead of guessed. Files are parsed in the browser tab; nothing is "
        "uploaded.<br/>"
        "<b>Stack chips:</b> Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Vitest<br/>"
        "<b>Metric bullets:</b> 27 firm programmes catalogued across 4 firms, each rule sourced and dated · "
        "CSV import validated for up to 10,000 trades with duplicate and invalid-row review · Unit-tested matching "
        "and analytics modules<br/>"
        "<b>Links:</b> Open the app → · View source on GitHub →"))
    st.append(copy_block("S7 · Card 2 — Job Recruitment Portal",
        "<b>Title:</b> Job Recruitment Portal<br/>"
        "<b>One-liner:</b> Full-stack platform connecting employers and job seekers, delivered by a 12-person team "
        "I led.<br/>"
        "<b>Stack chips:</b> React · Node.js · Express · MongoDB · JWT · RBAC · Vercel · Render<br/>"
        "<b>Metric bullets:</b> Led 12 developers through design, build, review and deployment · Role-based access "
        "separating employer and job-seeker workflows; JWT auth with bcrypt hashing<br/>"
        "<b>Links:</b> Live demo ↗ · GitHub ↗"))
    st.append(copy_block("S7 · Card 3 — Banking Web App",
        "<b>Title:</b> Banking Web App<br/>"
        "<b>One-liner:</b> Full-stack banking application with accounts, transactions and an authenticated API.<br/>"
        "<b>Stack chips:</b> React · Node.js · Express · REST API<br/>"
        "<b>Metric bullets:</b> Transaction ledger with validation and error handling · JWT-protected routes and "
        "server-side input checks<br/>"
        "<b>Links:</b> Live demo ↗"))
    st.append(copy_block("S7 · Card 4 — E-commerce Store",
        "<b>Title:</b> E-commerce Store<br/>"
        "<b>One-liner:</b> Full-stack online store: catalogue, cart and checkout flow.<br/>"
        "<b>Stack chips:</b> React · Node.js · Express<br/>"
        "<b>Metric bullets:</b> Cart state and checkout flow across client and API · Responsive product grid and "
        "detail views<br/>"
        "<b>Links:</b> GitHub ↗"))
    st.append(callout("warn",
        "<b>[CONFIRM] four things before this section ships:</b> (1) the live URLs for each demo, (2) whether the "
        "Banking Web App has a public repo to link, (3) real screenshots for all four projects, (4) whether "
        "PropFirm Intelligence will be publicly deployed or stays local — if local, replace \"Open the app\" with "
        "\"View source\" and a 60-second screen recording instead."))

    # =============================================================== S8
    st.append(h2("S8 · Trading record (compact)"))
    st.append(spec([
        ("Purpose", "Establish that the trading claim is real and risk-aware, without turning the landing page "
                    "into a performance pitch. Detail lives on <font face='DJM'>/trading</font>."),
        ("Layout", "Dark panel with a 1 px accent-tinted border. Row 1: heading + period + \"Full method\" link. "
                   "Row 2: four stat tiles. Row 3: equity curve sparkline (SVG, 100% width × 120 px) with the "
                   "account-reset marker. Row 4: instrument bars. Row 5: disclaimer, always visible."),
        ("Charts", "Hand-rolled SVG from <font face='DJM'>docs/landing-page/equity-curve.json</font> — no chart "
                   "library, keeping the JS budget near zero. Bars use accent for positive net P&amp;L and "
                   "<font face='DJM'>#F87171</font> for negative."),
        ("Data", "<font face='DJM'>trading-stats.json</font> (computed by <font face='DJM'>analyse_trades.py</font>). "
                 "Ship as a typed module, not a runtime fetch."),
        ("Interaction", "Hovering the sparkline shows a tooltip: date, symbol, P&amp;L, balance. Tooltips are "
                        "also exposed as a visually hidden table for screen readers."),
        ("Acceptance", "The disclaimer is in the DOM without any interaction; every figure matches Section 7; the "
                       "account reset from $13,680.48 to a new $100,000 account is visually marked, not smoothed over."),
    ]))
    st.append(copy_block("S8 · Heading and framing",
        "<b>Kicker:</b> THE RECORD<br/>"
        "<b>Heading:</b> What 100 closed trades actually show<br/>"
        "<b>Sub-line:</b> Exported from my trading account: 10 September – 13 November 2026, 64 days, USD. "
        "Published in full, including the losing streaks, because a sample you cannot inspect is not evidence."))
    st.append(stat_tiles([
        ("+$2,783.61", "Net P&L", "100 trades · 64 days"),
        ("35.0%", "Win rate", "35 W · 63 L · 2 break-even"),
        ("1.14", "Profit factor", "$22,666 gross profit / $19,882 gross loss"),
        ("2.05", "Payoff ratio", "Avg win $647.60 · avg loss $315.59"),
    ], per_row=4, tone="accent"))
    st.append(copy_block("S8 · Instrument bars (net P&L, full sample)",
        "Gold (XAU/USD) — 23 trades — <b>+$2,521.78</b> — PF 1.90 — win rate 43.5%<br/>"
        "Crude Oil (WTI) — 1 trade — <b>+$2,029.44</b> — win rate 100%<br/>"
        "Silver (XAG/USD) — 18 trades — <b>+$1,983.40</b> — PF 1.47 — win rate 33.3%<br/>"
        "USD/JPY — 22 trades — <b>+$238.33</b> — PF 1.09 — win rate 40.9%<br/>"
        "Bitcoin (BTC/USD) — 7 trades — <b>+$9.37</b> — PF 1.01 — win rate 42.9%<br/>"
        "EUR/USD — 29 trades — <b>−$3,998.71</b> — PF 0.56 — win rate 20.7%"))
    st.append(copy_block("S8 · The honest sentence (include verbatim)",
        "My edge is short-side and metals-biased: shorts returned +$7,717.01 at a 1.81 profit factor while longs "
        "returned −$4,933.40 at 0.52, and EUR/USD was my most-traded and worst instrument. That is in the report "
        "because hiding it would make every other number worthless."))
    st.append(copy_block("S8 · Disclaimer (7.5–8 px, muted, always visible)",
        "Figures are realised results from a single exported sample of 100 closed positions (10 Sep – 13 Nov 2026) "
        "and are not audited. Balance-based drawdown is measured at exported rows only and cannot show floating "
        "loss between them. Historical performance does not predict future results. Nothing on this page is "
        "financial advice, an offer to manage funds, or a solicitation."))
    st.append(copy_block("S8 · CTA",
        "<b>Primary:</b> Read the full analysis → /trading<br/>"
        "<b>Secondary:</b> Download the trade ledger (CSV) → /trades.csv"))

    # =============================================================== S9
    st.append(h2("S9 · Experience timeline"))
    st.append(spec([
        ("Purpose", "Show progression and that you have delivered outside a tutorial environment."),
        ("Layout", "Vertical timeline, 2 px line at <font face='DJM'>#1E293B</font> with accent dots. Each entry: "
                   "date range (monospace, 11 px, muted) · role (16 px bold) · org + location (13 px) · 3–5 "
                   "achievement bullets. Reverse chronological."),
        ("Interaction", "Entries fade in on scroll (once). Below 640 px the line moves to the left edge with "
                        "16 px inset."),
        ("Acceptance", "Dates match the CV exactly; each bullet starts with a past-tense verb; at least one bullet "
                       "per role carries a number."),
    ]))
    roles = [
        ("2021 – Present", "Independent Proprietary Trader", "Various prop firms · Remote",
         ["Five years of active trading with 10,000+ hours logged across FX, metals, indices, crypto and energy.",
          "Passed 7+ proprietary trading firm evaluations while applying disciplined risk management (1–2% per trade).",
          "Moved to a $100,000 account on 13 November 2026; first closed position +$2,297.18 (+2.30%). [DATA]",
          "Built PropFirm Intelligence to analyse closed-trade exports and match them against documented firm rules."]),
        ("2026", "Software Developer / Team Lead", "Job Recruitment Portal · Abuja, Nigeria",
         ["Led a 12-person development team that delivered a full-stack recruitment platform connecting employers and job seekers.",
          "Built features across the stack: React front ends, Node.js/Express REST APIs and MongoDB, with JWT auth and role-based access control.",
          "Managed team collaboration through Git and GitHub, including code review and debugging.",
          "Deployed the frontend on Vercel and the backend on Render.",
          "Built prior full-stack projects: an e-commerce platform and a banking web app."]),
        ("Mar 2026 – Present", "Operations Manager", "Dvine Block Industry · Abuja, Nigeria",
         ["Implemented a Microsoft Excel-based inventory and sales tracking system, improving inventory tracking efficiency by approximately 40%.",
          "Reduced material wastage by approximately 5% through structured monitoring.",
          "Tracked monthly business performance, providing visibility into ₦5–6 million in monthly revenue.",
          "Coordinated production, logistics, inventory and quality assurance."]),
        ("May 2023 – Dec 2023", "Industrial Training Engineer", "Ochacho Real Homes · Abuja, Nigeria",
         ["Supported structural inspections and site quality control.",
          "Maintained Excel-based material tracking logs.",
          "Reviewed engineering drawings against delivered work."]),
        ("2023 · 3 months", "Technical Instructor", "Gracious Grace School · Abuja, Nigeria",
         ["Raised student performance by approximately 20% (slower learners), 35% (average and fast learners) and over 50% (top performers).",
          "Adapted explanation style per learner group — the same skill a good evaluation justification needs."]),
    ]
    st.append(table(["Period", "Role", "Organisation", "Achievement bullets (paste as-is)"],
                    [[f"<font face='DJM'>{a}</font>", f"<b>{b}</b>", c, "<br/>".join("• " + x for x in d)]
                     for a, b, c, d in roles],
                    widths=[24 * mm, 34 * mm, 32 * mm, CONTENT_W - 90 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "<b>Ordering choice:</b> the CV lists trading last. On the landing page put the <b>Team Lead</b> role first "
        "and <b>Trader</b> second, because Segment A and B readers weight shipped software more heavily — but keep "
        "the trader role visible, since it explains your evaluation discipline. If you choose positioning P3, "
        "reverse this."))

    # =============================================================== S10
    st.append(h2("S10 · Certifications and education"))
    st.append(spec([
        ("Purpose", "Verifiable credentials. The certificate IDs are the most persuasive two lines on the page for "
                    "AI-evaluation buyers."),
        ("Layout", "Two columns ≥ 900 px: \"Certifications\" (2 cards) and \"Education\" (3 rows). Certificate card "
                   "shows issuer, title, date, ID in monospace, and a \"Verify\" affordance if the issuer offers one."),
        ("Detail", "IDs must be selectable text (recruiters copy them). Never render an ID as an image."),
        ("Acceptance", "Both IDs render exactly as <font face='DJM'>MRC-2026-HKHJULZA</font> and "
                       "<font face='DJM'>TSWW5QW86KV4MJ</font>, character for character."),
    ]))
    st.append(table(["Type", "Title", "Issuer", "Date", "ID / grade", "What to add"],
                    [
                        ["Certificate", "Introduction to Agents — AI agent evaluation",
                         "Mercor", "Oct 2026", "<font face='DJM'>MRC-2026-HKHJULZA</font>",
                         "Link to the credential page or attach the PDF if Mercor provides a public verify URL [CONFIRM]"],
                        ["Certificate", "Software Development (6-month programme)",
                         "TS Academy", "Certified 31 Oct 2026", "<font face='DJM'>TSWW5QW86KV4MJ</font>",
                         "Link to Credly/verify page if issued [CONFIRM]"],
                        ["Education", "Software Development Program — TypeScript, JavaScript, React",
                         "TS Academy", "6 months · certified Oct 2026", "Lagos, Nigeria (online)", "—"],
                        ["Education", "HND, Civil Engineering Technology",
                         "Abia State Polytechnic", "2024 – 2025", "<b>Distinction</b>", "—"],
                        ["Education", "ND, Civil Engineering Technology",
                         "Abia State Polytechnic", "2020 – 2023", "—", "—"],
                    ],
                    widths=[20 * mm, 46 * mm, 26 * mm, 24 * mm, 30 * mm, CONTENT_W - 146 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(copy_block("S10 · Section copy",
        "<b>Kicker:</b> CREDENTIALS<br/>"
        "<b>Heading:</b> Certificates you can check, not just believe<br/>"
        "<b>Sub-line:</b> Both certificate IDs are published so any recruiter can verify them directly with the "
        "issuer.<br/>"
        "<b>Note under the HND row:</b> Graduated Distinction — the grading band that matters, and the reason I am "
        "comfortable being measured."))

    # =============================================================== S11
    st.append(h2("S11 · Leadership and impact"))
    st.append(spec([
        ("Purpose", "Evidence of influence outside code: money raised, teams run, people taught."),
        ("Layout", "Three cards, or a compact list with a big number on the left of each row."),
        ("Acceptance", "Each entry states a team size, a period and an outcome."),
    ]))
    st.append(table(["Big number", "Entry", "Detail"],
                    [
                        ["₦162,000+", "<b>Technical &amp; Marketing Lead</b>, OBS team, NYSC camp · Plateau State · 2026 (3 weeks)",
                         "Led a 12-person team selling tickets for the Shout Out event, generating over ₦162,000 in gross "
                         "revenue at ₦500 per ticket. Led a 6-person technical team that set up speakers, chairs and "
                         "other equipment for events every day for three weeks."],
                        ["1 of 1", "<b>Project Lead</b>, final-year school project · Abia State Polytechnic",
                         "Led the construction of an ergonomic, reliable and comfortable upholstered chair — scoping, "
                         "materials, build and final review."],
                        ["Whole class", "<b>General Class Representative</b> · Abia State Polytechnic",
                         "Represented the class throughout the final year: liaison between students and department, "
                         "scheduling and issue resolution."],
                        ["20–50%", "<b>Technical Instructor</b> · Gracious Grace School (cross-reference)",
                         "Student performance gains by learner group; shown here as the leadership-through-teaching "
                         "data point."],
                    ],
                    widths=[22 * mm, 62 * mm, CONTENT_W - 84 * mm], cell_style=CELL))

    # =============================================================== S12
    st.append(h2("S12 · References and testimonials"))
    st.append(spec([
        ("Purpose", "Third-party validation. Highest-trust element on any candidate page — and the one most often faked."),
        ("Layout", "Two or three quote cards: quote (16 px, 1.6 leading) → name → role → relationship → optional "
                   "LinkedIn link. Masonry at ≥ 900 px, stacked below."),
        ("Rule", "<b>Never invent or paraphrase a testimonial.</b> If you have none today, ship the section as "
                 "\"References\" with names, roles and \"available on request\", and add quotes as they arrive."),
        ("Acceptance", "Every quote has a real, contactable author who has approved the wording in writing."),
    ]))
    st.append(copy_block("S12 · Placeholder copy (use until real quotes exist)",
        "<b>Kicker:</b> REFERENCES<br/>"
        "<b>Heading:</b> People who have worked with me<br/>"
        "<b>Body:</b> I led a 12-person development team, a 12-person marketing team at NYSC camp and a 6-person "
        "technical crew, and I ran tracking systems for a ₦5–6 million monthly operation. Written references from "
        "team members and stakeholders are available on request — ask me for them and I will send contacts the same day.<br/>"
        "<b>Button:</b> Request references → (opens the contact form with the subject pre-filled)"))
    st.append(callout("do",
        "<b>How to get two real quotes this week:</b> message (1) one developer from the 12-person recruitment "
        "team and (2) your supervisor at Dvine Block Industry or Ochacho Real Homes. Ask for two sentences: what you "
        "were responsible for, and one specific thing you did that helped. Quote them with first name + role + "
        "organisation, with their written permission saved."))

    # =============================================================== S13
    st.append(h2("S13 · How I work remotely"))
    st.append(spec([
        ("Purpose", "Kill the two objections international buyers have about hiring from Nigeria: connectivity and "
                    "timezone overlap. The CV already asserts both — make them concrete."),
        ("Layout", "Four small tiles in a row (2×2 on mobile), plus one line of copy."),
        ("Acceptance", "Every claim here is literally true of your setup — update the specifics [CONFIRM]."),
    ]))
    st.append(table(["Tile", "Heading", "Body (confirm the specifics)"],
                    [
                        ["1", "Connectivity", "Reliable high-speed internet with a mobile backup line. "
                                              "[CONFIRM: provider + speed, e.g. \"MTN fibre, 50 Mbps down / 20 up, "
                                              "with a 5G fallback\"]"],
                        ["2", "Power", "[CONFIRM: e.g. Inverter backup for multi-hour outages — worth stating "
                                       "explicitly, it is a real differentiator]"],
                        ["3", "Timezone", "Abuja is WAT (UTC+1). I overlap 4+ hours with UK/EU mornings and can "
                                          "shift to cover US Eastern mornings. Flexible across schedules and timezones."],
                        ["4", "Communication", "Written-first: clear tickets, PR descriptions and review comments. "
                                              "Daily async update, video calls on request. [CONFIRM: tools you use — "
                                              "Slack, Notion, Linear, Jira, Loom]"],
                    ],
                    widths=[10 * mm, 28 * mm, CONTENT_W - 38 * mm], cell_style=CELL))

    # =============================================================== S14
    st.append(h2("S14 · FAQ (optional)"))
    st.append(spec([
        ("Purpose", "Answer the six objections before they cost you an email. Cheap to build with "
                    "<font face='DJM'>&lt;details&gt;</font>."),
        ("Implementation", "Native <font face='DJM'>&lt;details&gt;/&lt;summary&gt;</font> elements — no JS, "
                           "accessible by default, indexable by search engines."),
        ("Schema", "Add <font face='DJM'>FAQPage</font> JSON-LD (Section 8.4) for rich results."),
        ("Acceptance", "Each answer is under 60 words; no answer contains a banned word from Section 2.5."),
    ]))
    faq = [
        ("Are you available for remote work with international teams?",
         "Yes. I work from Abuja (WAT, UTC+1) with reliable high-speed internet, a backup line and a flexible "
         "schedule. I can overlap with UK/EU mornings and shift earlier for US Eastern teams."),
        ("What kind of AI evaluation work have you done?",
         "I completed Mercor's Introduction to Agents course (certificate MRC-2026-HKHJULZA), which trains and "
         "tests rubric-based evaluation of agent output: rigour, calibration and written clarity. Because I build "
         "and debug JavaScript, React and Node.js applications, I can also review code and technical output rather "
         "than only prose."),
        ("What is your engineering stack?",
         "JavaScript and TypeScript, React with JSX and React Router, Vite, Node.js with Express and REST APIs, "
         "MongoDB with Mongoose, JWT authentication, bcrypt hashing and role-based access control. I deploy to "
         "Vercel and Render and manage everything through Git and GitHub."),
        ("Are you a profitable trader?",
         "I have traded proprietary capital for five years with 10,000+ hours logged and have passed 7+ firm "
         "evaluations at 1–2% risk per trade. On this site I publish a specific, dated 100-trade sample with its "
         "method and its losing streaks rather than a headline claim — see the trading record."),
        ("Do you take contracts, full-time roles, or both?",
         "[CONFIRM — e.g. Both. I take part-time evaluation and development contracts now, and I am open to a "
         "full-time remote role with the right team.]"),
        ("How quickly do you respond?",
         "[CONFIRM — e.g. Within 24 hours on weekdays, usually much faster. For time-sensitive evaluation batches, "
         "tell me the deadline in the first message.]"),
    ]
    st.append(table(["Question", "Answer"], [[f"<b>{q}</b>", a] for q, a in faq],
                    widths=[60 * mm, CONTENT_W - 60 * mm], cell_style=CELL))

    # =============================================================== S15
    st.append(h2("S15 · Contact and footer"))
    st.append(spec([
        ("Purpose", "The conversion. Remove every possible reason not to send the message."),
        ("Layout", "Two columns ≥ 900 px: form 58% / direct channels + availability panel 42%. Footer below: "
                   "monogram, one-line bio, nav columns, legal line, back-to-top."),
        ("Form fields", "Name (required) · Email (required, validated) · Company/organisation (optional) · "
                        "I'm interested in (select: AI evaluation work · Development contract · Full-time role · "
                        "PropFirm Intelligence · Other) · Message (required, min 20 chars, max 2000) · "
                        "Consent checkbox if you store submissions."),
        ("Provider", "No backend needed: Formspree, Web3Forms or Resend. Field names and endpoint go in "
                     "<font face='DJM'>.env.local</font> — never in client code as a secret."),
        ("States", "idle · validating (inline errors under each field) · submitting (button disabled + spinner) · "
                   "success (panel replaces form: \"Message sent — I reply within 24 hours on weekdays\") · "
                   "error (retry button, plus a mailto fallback link) · rate-limited."),
        ("Anti-spam", "Honeypot field + time-based check (submission under 3 seconds is rejected). Do not use a "
                      "CAPTCHA on a personal page unless spam proves to be a problem."),
        ("Accessibility", "Every input has a visible <font face='DJM'>&lt;label&gt;</font> (no placeholder-only "
                          "labels), errors are linked with <font face='DJM'>aria-describedby</font> and announced "
                          "via <font face='DJM'>role=\"alert\"</font>, success message gets "
                          "<font face='DJM'>aria-live=\"polite\"</font>, focus moves to the success panel."),
        ("Acceptance", "A real submission arrives in your inbox with the correct subject and reply-to; a submission "
                       "with an invalid email is blocked client-side with a clear message; the fallback mailto link "
                       "works with the form provider disabled."),
    ]))
    st.append(copy_block("S15 · Section copy",
        "<b>Kicker:</b> CONTACT<br/>"
        "<b>Heading:</b> Tell me what you need evaluated, built or fixed<br/>"
        "<b>Sub-line:</b> I reply within 24 hours on weekdays. If it is an evaluation batch with a deadline, say so "
        "in the first line and I will confirm capacity the same day.<br/>"
        "<b>Submit button:</b> Send message →<br/>"
        "<b>Under the button:</b> Prefer email? divineabbachimdirim1@gmail.com — or call/WhatsApp +234 906 749 2422."))
    st.append(copy_block("S15 · Side panel",
        "<b>Direct</b><br/>"
        "Email — divineabbachimdirim1@gmail.com<br/>"
        "Phone / WhatsApp — +234 906 749 2422<br/>"
        "GitHub — github.com/Divine-AC<br/>"
        "LinkedIn — linkedin.com/in/divine-abba-883540311<br/><br/>"
        "<b>Availability</b><br/>"
        "[CONFIRM: e.g. Open to part-time AI-evaluation contracts (20 h/week) and full-time remote developer roles. "
        "Available to start within one week.]<br/><br/>"
        "<b>Documents</b><br/>"
        "Download CV (PDF, 2 pages) · Download trade ledger (CSV, 100 rows)"))
    st.append(copy_block("S15 · Footer copy",
        "<b>Left:</b> © 2026 Divine Abba Chimdirim · Abuja, Nigeria<br/>"
        "<b>Middle links:</b> About · Projects · Trading record · CV · GitHub · LinkedIn<br/>"
        "<b>Right:</b> Built with Next.js and Tailwind CSS · Hosted on Vercel · Source on GitHub<br/>"
        "<b>Legal line (small, full width):</b> Trading figures on this site are realised results from a dated, "
        "unaudited export of my own closed positions. They are not audited performance, not a promise of future "
        "results, not financial advice, and not an offer to manage money or provide signals. Certificate IDs are "
        "published for verification."))
    st.append(PageBreak())
