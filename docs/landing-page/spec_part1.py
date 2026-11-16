"""Part 1 — cover page, contents, how to use, strategy, information architecture."""

from __future__ import annotations

from reportlab.lib.units import mm
from reportlab.platypus import NextPageTemplate, PageBreak, Paragraph, Spacer, Table, TableStyle

from spec_pdf_lib import (ACCENT, CONTENT_W, INK, LINE, MUTED, P, S, bullets, callout, code_block,
                          h1, h2, h3, kv_table, numbered, rule, section_header, stat_tiles, table)


def build(st: list, ctx: dict) -> None:
    st.append(NextPageTemplate("Body"))

    # ------------------------------------------------------------------ cover
    st.append(Spacer(1, 14 * mm))
    st.append(Paragraph("BUILD SPECIFICATION &amp; CONTENT PACK", S["CoverKicker"]))
    st.append(Paragraph("Personal Landing Page", S["CoverTitle"]))
    st.append(Paragraph("Divine Abba Chimdirim", S["CoverSub"]))
    st.append(Paragraph("AI Training &amp; Evaluation  ·  Software Developer (JavaScript, React, Node.js)  ·  "
                        "Independent Proprietary Trader", S["CoverMeta"]))
    st.append(Spacer(1, 8 * mm))
    st.append(rule(ACCENT, 1.4, 0, 8))
    st.append(Paragraph(
        "This document contains everything needed to build the landing page: goals, audience, page map, "
        "a section-by-section specification with final ready-to-paste copy, the complete design system "
        "(colour tokens, type scale, spacing, components), the analysed trading record, the technical "
        "implementation plan for this repository, an asset checklist, a QA and launch checklist, and a "
        "hand-off prompt for a developer or an AI build agent.", S["Lead"]))
    st.append(Spacer(1, 6 * mm))

    st.append(kv_table([
        ("Document", "Landing Page Build Specification &amp; Content Pack"),
        ("Version", "1.0  (16 November 2026)"),
        ("Owner", "Divine Abba Chimdirim — Abuja, Nigeria (WAT / UTC+1)"),
        ("Target repo", "<font face='DJM'>Divine-AC/propfirmintelligenence</font> — Next.js 16.4.3 · React 19 · Tailwind CSS v4 · TypeScript"),
        ("Source 1", "<font face='DJM'>Divine_Abba_Chimdirim_Resume.pdf</font> — 2-page CV, all facts, links and certificate IDs"),
        ("Source 2", "Closed-position trading export — 100 trades, 10 Sep 2026 to 13 Nov 2026 (parsed and analysed in Section 7)"),
        ("Deliverable", "One public landing page (plus optional <font face='DJM'>/trading</font> evidence page) deployed on Vercel"),
        ("Companion files", "<font face='DJM'>docs/landing-page/trades.csv</font> · <font face='DJM'>trading-stats.json</font> · "
                            "<font face='DJM'>equity-curve.json</font> · <font face='DJM'>content.json</font> · <font face='DJM'>analyse_trades.py</font>"),
    ], label_w=32 * mm))

    st.append(Spacer(1, 7 * mm))
    st.append(callout("warn",
        "Every number in this pack is traceable. Figures taken from the CV are marked <b>[CV]</b>, figures computed "
        "from the trade export are marked <b>[DATA]</b>, and figures that still need your confirmation are marked "
        "<b>[CONFIRM]</b>. Do not publish a number that you cannot evidence — Section 7.8 sorts the trading figures "
        "into three publication tiers for exactly this reason."))

    st.append(PageBreak())

    # ------------------------------------------------------------------ contents
    st.append(section_header("", "Contents", None))
    toc = [
        ("1", "How to use this document", "Hand-off modes, definition of done"),
        ("2", "Strategy: goal, audience, positioning", "What the page must achieve and for whom"),
        ("3", "Information architecture &amp; sitemap", "Page inventory, navigation, anchors, URLs"),
        ("4", "Section-by-section build specification", "S0–S15: layout, exact copy, components, states, acceptance criteria"),
        ("5", "Design system", "Colour tokens, typography, spacing, components, motion, breakpoints"),
        ("6", "Content data — the complete copy deck", "Every string the page needs, in one place"),
        ("7", "Trading record: analysis and publication plan", "100 trades parsed; what to show, what to contextualise"),
        ("8", "Technical implementation plan", "File tree, components, SEO, JSON-LD, performance, forms, deploy"),
        ("9", "Asset checklist — what you must supply", "Photo, screenshots, logos, links, with exact specs"),
        ("10", "Build plan and milestones", "Phased task list with effort estimates"),
        ("11", "QA and launch checklist", "Functional, visual, accessibility, SEO, performance, device matrix"),
        ("12", "Risk, claims and compliance", "Disclaimers, prohibited claims, data protection"),
        ("A", "Appendix A — Full trade ledger (100 rows)", "The raw evidence behind Section 7"),
        ("B", "Appendix B — Machine-readable content contract", "JSON schema for <font face='DJM'>src/content/profile.ts</font>"),
        ("C", "Appendix C — Links, IDs and verification references", "Every URL and certificate ID to wire up"),
        ("D", "Appendix D — Hand-off prompt", "Copy-paste brief for a developer or AI build agent"),
    ]
    rows = []
    for num, title, sub in toc:
        rows.append([
            Paragraph(f"<b>{num}</b>", S["TOC1"]),
            [Paragraph(title, S["TOC1"]), Paragraph(sub, S["TOC2"])],
        ])
    t = Table(rows, colWidths=[12 * mm, CONTENT_W - 12 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE),
    ]))
    st.append(t)
    st.append(PageBreak())

    # ------------------------------------------------------------------ 1. how to use
    st.append(section_header("1", "How to use this document",
                             "This pack is written so a developer, an agency, or an AI coding agent can build the "
                             "page without asking you a single question."))

    st.append(h2("1.1  Three ways to hand this off"))
    st.append(table(
        ["Mode", "Who builds it", "What you send", "What to check first"],
        [
            ["AI build agent\n(recommended)",
             "An agent working in this repository, e.g. Arena / Cursor / Claude Code",
             "This PDF plus Appendix D as the prompt. The agent already has the repo, the CV facts and the trade CSV.",
             "Section 4 (copy) and Section 8 (file tree). Tell the agent to keep the existing <font face='DJM'>/matches</font> and <font face='DJM'>/history</font> routes untouched."],
            ["Freelance developer",
             "A person you hire",
             "This PDF, the CV PDF, your photo, and the GitHub repo link",
             "Section 9 (assets) and Section 11 (QA checklist) — make the checklist part of the contract."],
            ["Yourself",
             "You, following the plan",
             "Everything is here; start at Section 10 (build plan)",
             "Section 8.3 — content lives in data files, not inside JSX, so you can edit copy without touching layout."],
        ],
        widths=[26 * mm, 34 * mm, 56 * mm, CONTENT_W - 116 * mm],
        cell_style="CellSm"))
    st.append(Spacer(1, 3 * mm))

    st.append(h2("1.2  Reading order"))
    st.append(numbered([
        "<b>Section 2</b> — agree the goal and the audience before any design decision.",
        "<b>Section 3</b> — agree the page map and navigation.",
        "<b>Section 4</b> — build section by section; each subsection is self-contained and has acceptance criteria.",
        "<b>Section 5</b> — set up the design tokens once, at the start, and never hard-code a colour again.",
        "<b>Section 6</b> — paste the copy deck into <font face='DJM'>src/content/profile.ts</font>.",
        "<b>Section 7</b> — decide which trading figures you are comfortable publishing (this needs your judgement).",
        "<b>Section 8–12</b> — implement, test, ship.",
    ]))

    st.append(h2("1.3  Definition of done"))
    st.append(P("The page is finished when all of the following are true:"))
    st.append(bullets([
        "All 16 sections from Section 4 are present with the exact copy from Section 6 (typos fixed, nothing invented).",
        "Design tokens from Section 5.2 and 5.3 are defined once in <font face='DJM'>globals.css</font> and used everywhere.",
        "Every external link (GitHub, LinkedIn, demos, certificates) resolves and opens in a new tab with "
        "<font face='DJM'>rel=\"noopener noreferrer\"</font>.",
        "Lighthouse scores on the deployed URL: Performance ≥ 95, Accessibility ≥ 98, Best Practices ≥ 95, SEO ≥ 98.",
        "Keyboard-only navigation reaches every interactive element with a visible focus ring; skip link works.",
        "The page is legible and unbroken at 320 px, 375 px, 768 px, 1024 px, 1440 px and 1920 px widths.",
        "The contact form sends a real message end to end and shows success, error and spam-blocked states.",
        "The risk disclaimer from Section 6.12 is visible without interaction on any page that shows trading figures.",
        "<font face='DJM'>npx tsc --noEmit</font>, <font face='DJM'>npm run lint</font> and <font face='DJM'>npm test</font> all pass.",
        "A print stylesheet exists so <font face='DJM'>Ctrl+P</font> produces a clean one-page résumé view (recruiters do this).",
    ]))
    st.append(PageBreak())

    # ------------------------------------------------------------------ 2. strategy
    st.append(section_header("2", "Strategy: goal, audience, positioning",
                             "A landing page is not a CV on the web. It has one job: make the right person take the "
                             "next action within 30 seconds."))

    st.append(h2("2.1  Primary objective"))
    st.append(callout("do",
        "<b>Get a qualified human to contact you.</b> Every other goal is secondary. The page must convert three "
        "kinds of visitor into an email, a call, or a repo click: AI-training recruiters, software-engineering "
        "recruiters and clients, and prop-firm / trading-community contacts."))
    st.append(P("Secondary objectives, in order: (a) make your evidence verifiable in under a minute — certificate IDs, "
                "live demos, GitHub commits, trade data; (b) rank for your own name and for \"AI agent evaluation "
                "Nigeria\"-style queries; (c) act as the front door to the PropFirm Intelligence product you are "
                "already building in this repository."))

    st.append(h2("2.2  Audience segments"))
    st.append(table(
        ["Segment", "What they are scanning for", "What wins them", "Primary CTA"],
        [
            ["<b>A. AI training &amp; evaluation recruiters</b><br/>Mercor, Outlier, Alignerr, Invisible, Scale-type "
             "vendors and their reviewers",
             "Can this person follow a rubric, calibrate, write clear justifications, and hold a schedule? Do they "
             "have the domain depth (code, reasoning) to judge model output?",
             "The Mercor <i>Introduction to Agents</i> certificate with its ID, the evaluation-specific skill block, "
             "and a work sample that shows rigour (PropFirm Intelligence's \"explain the evidence and its unknowns\" "
             "approach is exactly this mindset).",
             "Email / \"Book a call\""],
            ["<b>B. Engineering recruiters &amp; clients</b><br/>Nigerian and remote-first agencies, startups, "
             "product teams hiring JS/React/Node",
             "Real shipped products, stack match, Git hygiene, deployment experience, teamwork, timezone fit.",
             "Three live full-stack projects, a 12-person team lead story, Vercel + Render deployments, JWT/RBAC "
             "depth, HND Distinction, and explicit remote-readiness.",
             "View GitHub / Email"],
            ["<b>C. Trading &amp; prop-firm audience</b><br/>Prop firms, trading communities, people who find you "
             "through the PropFirm Intelligence tool",
             "Are you actually a trader, and do you understand risk? Is the tool credible?",
             "Five years and 10,000+ hours, 7+ passed evaluations, a documented 100-trade sample with honest "
             "drawdown figures, and the tool itself as proof of engineering + market understanding.",
             "Open the tool / Read the record"],
        ],
        widths=[38 * mm, 44 * mm, 56 * mm, CONTENT_W - 138 * mm],
        cell_style="CellSm"))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("note",
        "<b>Design consequence:</b> Segment A scans in about 20 seconds on a phone, so the hero must state the "
        "AI-evaluation identity first and the developer identity second. Segment B needs proof depth, so projects and "
        "the GitHub link sit above the fold on desktop. Segment C arrives from the tool, so a compact trading-record "
        "strip plus a link to the full evidence is enough on the landing page — the detail lives on <font face='DJM'>/trading</font>."))

    st.append(h2("2.3  Positioning statement"))
    st.append(callout("copy",
        "\"Divine Abba Chimdirim is a Nigeria-based software developer and AI-training specialist who evaluates "
        "machine output with the same discipline he applies to markets: explicit rules, recorded evidence, and "
        "no claim he cannot defend. He ships React and Node.js products, leads teams, and has traded proprietary "
        "capital for five years.\""))
    st.append(P("The single differentiator to repeat throughout the page: <b>evidence over adjectives</b>. Most "
                "candidate pages say \"detail-oriented\". Yours shows a certificate ID, a live demo, a trade ledger "
                "and a self-built analytics tool. This is also the exact quality AI-evaluation clients are hiring for."))

    st.append(h2("2.4  Three positioning options — pick one before building"))
    st.append(table(
        ["Option", "Hero headline", "Best for", "Risk"],
        [
            ["<b>P1 — Evaluation-first</b><br/><i>recommended</i>",
             "\"I evaluate AI output the way I trade: with rules, evidence and no excuses.\"",
             "Segment A (highest-paying remote hourly work right now) and it still reads as engineering-credible.",
             "Engineering recruiters may under-read your build skills — solved by the pillar cards immediately below."],
            ["P2 — Developer-first",
             "\"Full-stack developer shipping React and Node.js products from Abuja.\"",
             "Segment B; classic, safe, easy to scan.",
             "You look like one of thousands of junior full-stack candidates; the evaluation angle is your scarcity."],
            ["P3 — Trader-first",
             "\"Five years, 10,000 hours, 7+ funded evaluations passed.\"",
             "Segment C and product marketing for PropFirm Intelligence.",
             "Weakest for paid work; invites scepticism about trading claims. Use as the <font face='DJM'>/trading</font> page headline instead."],
        ],
        widths=[30 * mm, 56 * mm, 48 * mm, CONTENT_W - 134 * mm],
        cell_style="CellSm"))
    st.append(Spacer(1, 2 * mm))
    st.append(P("This spec writes the copy for <b>P1 (evaluation-first)</b>, with a strong developer pillar and a "
                "credible trading pillar. If you prefer P2, swap the hero strings in Section 6.2 — everything else "
                "stays identical."))

    st.append(h2("2.5  Voice and tone"))
    st.append(table(
        ["Rule", "Yes", "No"],
        [
            ["Specific beats vague", "\"Led a 12-person team that shipped a full-stack recruitment platform\"",
             "\"Strong leadership and teamwork skills\""],
            ["Numbers with units and dates", "\"Improved inventory tracking efficiency by ~40%\" [CV]",
             "\"Significantly improved efficiency\""],
            ["Plain Anglophone English, no hype", "\"Here is what the data shows, and what it cannot show\"",
             "\"Rockstar ninja guru, crushing it, 10x\""],
            ["First person singular, calm and direct", "\"I review agent output against the rubric, then justify the score\"",
             "\"Divine is a passionate individual who leverages synergies\""],
            ["Honest about limits", "\"This sample is 100 closed trades over 64 days\"",
             "\"Consistently profitable across all market conditions\""],
            ["Sentence length", "Mostly 8–18 words. One idea per sentence.",
             "Stacked clauses, em-dash chains, marketing cadence"],
        ],
        widths=[40 * mm, 68 * mm, CONTENT_W - 108 * mm],
        cell_style="CellSm"))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("dont",
        "<b>Words banned from this page:</b> guru, ninja, rockstar, 10x, passionate about, leveraging, synergies, "
        "seamless, cutting-edge, world-class, guaranteed, risk-free, \"profitable trader\" (unless qualified by a "
        "dated sample), \"self-taught genius\". <b>Also banned:</b> any statement implying you manage other people's "
        "money or offer trading signals — see Section 12."))

    st.append(h2("2.6  Success metrics"))
    st.append(table(
        ["Metric", "Baseline (day 0)", "Target (day 60)", "How to measure"],
        [
            ["Qualified inbound emails per month", "0", "8–15", "Inbox + form provider dashboard"],
            ["Contact-form completion rate", "n/a", "≥ 35% of form openers", "Form provider analytics or Plausible custom event"],
            ["Scroll depth: reaches Projects section", "n/a", "≥ 60% of sessions", "Plausible / GA4 scroll event"],
            ["Click-through to GitHub", "n/a", "≥ 12% of sessions", "Outbound-link click event"],
            ["Lighthouse performance (mobile)", "n/a", "≥ 95", "Lighthouse CI or PageSpeed Insights"],
            ["Ranking for exact name query", "not indexed", "Position 1 within 3 weeks of index", "Google Search Console"],
        ],
        widths=[52 * mm, 28 * mm, 34 * mm, CONTENT_W - 114 * mm],
        cell_style="CellSm"))
    st.append(PageBreak())

    # ------------------------------------------------------------------ 3. IA
    st.append(section_header("3", "Information architecture and sitemap",
                             "One primary landing page, one optional evidence page, and the product routes you "
                             "already have."))

    st.append(h2("3.1  Page inventory"))
    st.append(table(
        ["Route", "Page", "Purpose", "Status in repo"],
        [
            ["<font face='DJM'>/</font>", "Landing page (this spec)", "Convert visitors into contact actions",
             "<b>Rebuild</b> — the current <font face='DJM'>src/app/page.tsx</font> is the product overview; move it to <font face='DJM'>/app</font> or keep the product intro as Section S7"],
            ["<font face='DJM'>/trading</font>", "Trading record (evidence page)", "Full statistics, charts and the 100-trade ledger with disclaimers", "<b>New</b>"],
            ["<font face='DJM'>/projects</font>", "Project detail (optional)", "Deeper case studies if you want them", "Optional — cards on the landing page are enough for v1"],
            ["<font face='DJM'>/matches</font>", "PropFirm Intelligence — firm matching", "Product", "Exists — do not change"],
            ["<font face='DJM'>/history</font>", "PropFirm Intelligence — history analysis", "Product", "Exists — do not change"],
            ["<font face='DJM'>/cv</font>", "Résumé", "Serves <font face='DJM'>Divine_Abba_Chimdirim_Resume.pdf</font> for download", "<b>New</b> — static file in <font face='DJM'>public/</font>"],
        ],
        widths=[24 * mm, 42 * mm, 54 * mm, CONTENT_W - 120 * mm],
        cell_style="CellSm"))
    st.append(Spacer(1, 3 * mm))
    st.append(callout("warn",
        "<b>Decision needed [CONFIRM]:</b> is the landing page for <i>you</i> or for <i>PropFirm Intelligence</i>? "
        "This spec assumes <b>you</b>, with the product presented as your strongest project (Section S7). If you want "
        "the product to own the homepage, keep the existing <font face='DJM'>page.tsx</font> and put your personal "
        "page at <font face='DJM'>/about</font> — but that weakens Segment A and B conversion. Recommended: personal "
        "page at <font face='DJM'>/</font>, product reachable from the nav and from project card 2."))

    st.append(h2("3.2  Landing page section order"))
    st.append(P("Fifteen blocks, top to bottom. Order is deliberate: identity → proof → depth → contact. "
                "Anchor IDs are the ones to use in the nav and in <font face='DJM'>href</font> links."))
    order = [
        ("S0", "Utility bar", "#top", "Optional thin strip: location, availability, \"Download CV\""),
        ("S1", "Navbar", "#top", "Sticky; name/logo + 6 anchors + primary CTA"),
        ("S2", "Hero", "#top", "Headline, sub-headline, two CTAs, photo, credibility chips"),
        ("S3", "Proof strip", "#proof", "Four to six hard numbers"),
        ("S4", "What I do (3 pillars)", "#services", "AI evaluation · Software development · Markets"),
        ("S5", "About", "#about", "Narrative, photo or workspace image, quick facts"),
        ("S6", "Skills", "#skills", "Grouped chips with a proficiency indicator"),
        ("S7", "Projects", "#projects", "Four cards incl. PropFirm Intelligence"),
        ("S8", "Trading record", "#trading", "Compact dashboard + link to /trading + disclaimer"),
        ("S9", "Experience timeline", "#experience", "Five roles, reverse chronological"),
        ("S10", "Certifications &amp; education", "#credentials", "Two certificates with IDs, three qualifications"),
        ("S11", "Leadership &amp; impact", "#leadership", "Three leadership entries"),
        ("S12", "References / testimonials", "#references", "Placeholder until you have two real quotes"),
        ("S13", "How I work remotely", "#remote", "Setup, timezone, availability, communication"),
        ("S14", "FAQ", "#faq", "Six recruiter questions (optional but cheap)"),
        ("S15", "Contact + footer", "#contact", "Form, direct channels, legal line, risk disclaimer"),
    ]
    st.append(table(["ID", "Section", "Anchor", "One-line role"],
                    [[a, b, f"<font face='DJM'>{c}</font>", d] for a, b, c, d in order],
                    widths=[12 * mm, 52 * mm, 26 * mm, CONTENT_W - 90 * mm], cell_style="CellSm"))
    st.append(Spacer(1, 3 * mm))
    st.append(P("<b>Fold line:</b> on a 1440×900 desktop, S0–S3 must fit above the fold. On a 375×667 phone, S2 "
                "(headline, sub-headline, both CTAs and at least two credibility chips) must fit above the fold "
                "without scrolling."))

    st.append(h2("3.3  Navigation behaviour"))
    st.append(bullets([
        "Sticky navbar, height 64 px desktop / 56 px mobile, background <font face='DJM'>#020617</font> at 90% "
        "opacity with a 12 px backdrop blur and a 1 px bottom border at <font face='DJM'>#1E293B</font>.",
        "Desktop links (≥ 1024 px): About · Skills · Projects · Trading · Experience · Contact, plus a solid "
        "primary button \"Hire me\" / \"Get in touch\".",
        "Below 1024 px: collapse to a hamburger that opens a full-height sheet from the right, links stacked at "
        "18 px, close button top-right, <font face='DJM'>Escape</font> closes, focus is trapped while open, and "
        "focus returns to the hamburger on close.",
        "Scroll-spy: the current section link is highlighted with the accent colour and a 2 px underline. Use "
        "<font face='DJM'>IntersectionObserver</font> with <font face='DJM'>rootMargin: '-45% 0px -50% 0px'</font>.",
        "Smooth scrolling: <font face='DJM'>html { scroll-behavior: smooth }</font> plus "
        "<font face='DJM'>scroll-padding-top: 80px</font> so anchors do not hide under the sticky bar. Disable "
        "smooth scroll when <font face='DJM'>prefers-reduced-motion: reduce</font>.",
        "A \"skip to content\" link is the first focusable element, visually hidden until focused.",
    ]))

    st.append(h2("3.4  URL, metadata and identity plan"))
    st.append(kv_table([
        ("Domain [CONFIRM]", "Choose one and register it: <font face='DJM'>divinechimdirim.com</font> (recommended) · "
                             "<font face='DJM'>divineabba.dev</font> · <font face='DJM'>chimdirim.dev</font>. "
                             "Keep it short and spellable for phone calls."),
        ("Interim", "Deploy to Vercel first (<font face='DJM'>propfirm-intelligence.vercel.app</font> or a project named "
                    "<font face='DJM'>divine-chimdirim</font>) and add the custom domain later — no rebuild needed."),
        ("Canonical", "One canonical URL per page; redirect <font face='DJM'>www</font> → apex (or the reverse) with a 301."),
        ("Title tag", "Divine Abba Chimdirim — AI Evaluation &amp; Full-Stack Developer (≤ 60 characters)"),
        ("Meta description", "See Section 8.4 — 150–158 characters, includes \"Abuja\", \"React\", \"AI agent evaluation\"."),
        ("OG image", "1200×630 px, dark background, name, role line and three proof chips (spec in Section 9)."),
        ("Favicon", "32×32 and 180×180 versions of the \"DAC\" monogram, accent cyan on slate-950."),
        ("Handle consistency", "Use the same monogram and the same bio sentence on GitHub, LinkedIn and X so the "
                              "landing page reads as the hub, not an island."),
    ], label_w=34 * mm))
    st.append(PageBreak())
