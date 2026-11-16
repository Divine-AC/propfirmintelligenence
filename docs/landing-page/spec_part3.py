"""Part 3 — Section 5: design system, and Section 6: the consolidated copy deck."""

from __future__ import annotations

from reportlab.lib.units import mm
from reportlab.platypus import PageBreak, Spacer

from spec_pdf_lib import (BAD, CONTENT_W, GOOD, P, bullets, callout, code_block, h2, kv_table, rule,
                          section_header, table)

CELL = "CellSm"


def build(st: list, ctx: dict) -> None:
    # =============================================================== 5. design system
    st.append(section_header("5", "Design system",
                             "A dark \"trading terminal\" look that matches the product already in this repository, "
                             "so the personal page and PropFirm Intelligence feel like one body of work."))

    st.append(h2("5.1  Art direction"))
    st.append(kv_table([
        ("Mood", "Calm, precise, technical. Instrument-panel, not nightclub. Think Bloomberg terminal meets a good "
                 "engineering blog — high information density but generous whitespace between blocks."),
        ("Reference feel", "Linear.app, Vercel.com, Stripe docs, FTMO's dashboard. Restrained motion, sharp type, "
                           "numbers set in tabular figures."),
        ("Signature moves", "(1) Tabular monospace for every number so columns align; (2) a 1 px accent-tinted hairline "
                            "under section headings; (3) subtle 40 px grid texture at 3% opacity behind the hero and "
                            "the trading panel; (4) green/red used only for signed P&L, never decoratively."),
        ("What to avoid", "Gradient text on headings, glassmorphism everywhere, animated particles, stock photos of "
                          "candles and laptops, emoji as icons, more than one accent hue, drop shadows on dark surfaces."),
        ("Theme", "Dark only for v1. The existing app is <font face='DJM'>bg-slate-950</font> dark; matching it avoids "
                  "building and QA-ing two themes. Structure the tokens so a light theme can be added later by "
                  "overriding CSS variables."),
    ], label_w=32 * mm, style=CELL))

    st.append(h2("5.2  Colour tokens"))
    st.append(P("Define these once as CSS custom properties in <font face='DJM'>src/app/globals.css</font> inside "
                "<font face='DJM'>@theme</font> (Tailwind v4 syntax) and reference them everywhere. Never hard-code "
                "a hex value inside a component."))
    st.append(table(["Token", "Hex", "Tailwind v4 var", "Use", "Contrast on bg"],
                    [
                        ["background", "#020617", "--color-bg", "Page background (slate-950)", "—"],
                        ["surface", "#0B1526", "--color-surface", "Cards, panels, utility bar", "—"],
                        ["surface-2", "#0F1D33", "--color-surface-2", "Raised card on hover, inputs", "—"],
                        ["border", "#1E293B", "--color-border", "Card and input borders (slate-800)", "—"],
                        ["border-strong", "#334155", "--color-border-strong", "Focused input border", "—"],
                        ["text", "#F8FAFC", "--color-text", "Headings, primary text (slate-50)", "17.4:1"],
                        ["text-muted", "#94A3B8", "--color-muted", "Body copy, labels (slate-400)", "7.4:1"],
                        ["text-faint", "#64748B", "--color-faint", "Footnotes, disclaimers, timestamps (slate-500)", "4.7:1"],
                        ["accent", "#22D3EE", "--color-accent", "Links, active nav, icons, focus ring (cyan-400)", "11.0:1"],
                        ["accent-solid", "#0E7490", "--color-accent-solid", "Primary button background (cyan-700)", "white text 5.0:1"],
                        ["accent-tint", "#0E74901F", "--color-accent-tint", "12% wash behind hero glow, chip backgrounds", "—"],
                        ["positive", "#4ADE80", "--color-positive", "Signed gains, wins (green-400)", "9.6:1"],
                        ["negative", "#F87171", "--color-negative", "Signed losses (red-400)", "6.4:1"],
                        ["warning", "#FBBF24", "--color-warning", "\"Unverified\" badges in the product (amber-400)", "10.5:1"],
                    ],
                    widths=[26 * mm, 22 * mm, 34 * mm, 62 * mm, CONTENT_W - 144 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("do",
        "Contrast ratios above are against <font face='DJM'>#020617</font>. All body-text pairings clear WCAG 2.2 AA "
        "(4.5:1) and most clear AAA (7:1). The only exception to watch: <font face='DJM'>#64748B</font> on "
        "<font face='DJM'>#020617</font> is 4.7:1 — fine for footnotes at ≥ 12 px, but do not use it for anything "
        "a reader must understand, and never on the smaller disclaimer text at 7–8 px (use "
        "<font face='DJM'>#94A3B8</font> there)."))
    st.append(code_block(
        '@import "tailwindcss";\n\n'
        ":root {\n"
        "  --bg: #020617;      --surface: #0B1526;  --surface-2: #0F1D33;\n"
        "  --border: #1E293B;  --border-strong: #334155;\n"
        "  --text: #F8FAFC;    --muted: #94A3B8;    --faint: #64748B;\n"
        "  --accent: #22D3EE;  --accent-solid: #0E7490; --accent-tint: rgba(14,116,144,.12);\n"
        "  --positive: #4ADE80; --negative: #F87171; --warning: #FBBF24;\n"
        "}\n\n"
        "@theme inline {\n"
        "  --color-bg: var(--bg);            --color-surface: var(--surface);\n"
        "  --color-surface-2: var(--surface-2); --color-border: var(--border);\n"
        "  --color-text: var(--text);        --color-muted: var(--muted);\n"
        "  --color-faint: var(--faint);      --color-accent: var(--accent);\n"
        "  --color-accent-solid: var(--accent-solid);\n"
        "  --color-positive: var(--positive); --color-negative: var(--negative);\n"
        "  --font-sans: var(--font-inter), system-ui, sans-serif;\n"
        "  --font-mono: var(--font-jetbrains), ui-monospace, monospace;\n"
        "}\n\n"
        "html { scroll-behavior: smooth; scroll-padding-top: 80px; }\n"
        "@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }\n"
        "body { background: var(--bg); color: var(--text); font-family: var(--font-sans); }\n"
        "::selection { background: rgba(34,211,238,.28); }\n"
        ":focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 4px; }\n"
        ".tnum { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }",
        title="src/app/globals.css — token layer"))

    st.append(h2("5.3  Typography"))
    st.append(kv_table([
        ("Display / UI font", "<b>Inter</b> (weights 400, 500, 600, 700, 800) loaded with "
                              "<font face='DJM'>next/font/google</font> and <font face='DJM'>display: swap</font>. "
                              "Alternatives: Geist Sans, IBM Plex Sans, Satoshi. <b>Do not</b> keep Arial — the "
                              "current <font face='DJM'>globals.css</font> sets Arial and it reads as unstyled."),
        ("Numeric / code font", "<b>JetBrains Mono</b> (400, 500, 700) for every number, date, certificate ID, stat "
                                "tile, price and code block. Tabular figures are the whole point: columns must align. "
                                "Alternative: IBM Plex Mono, Geist Mono."),
        ("Line length", "Body copy max 68 characters (~660 px at 16 px). Headings max 24 characters per line."),
        ("Letter spacing", "Headings −0.02em; eyebrows and kickers +0.18em (uppercase); body 0."),
    ], label_w=38 * mm, style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(table(["Step", "Use", "Desktop", "Mobile", "Wt.", "Tailwind classes"],
                    [
                        ["Display", "Hero h1", "60 / 64 px", "36 / 42 px", "800", "<font face='DJM'>text-4xl sm:text-6xl font-extrabold tracking-tight</font>"],
                        ["H2", "Section headings", "34 / 40 px", "26 / 32 px", "700", "<font face='DJM'>text-3xl font-bold tracking-tight</font>"],
                        ["H3", "Card titles", "20 / 28 px", "18 / 26 px", "600", "<font face='DJM'>text-xl font-semibold</font>"],
                        ["Eyebrow", "Kickers", "12 / 16 px", "11 / 15 px", "600", "<font face='DJM'>text-xs font-semibold uppercase tracking-[0.18em]</font>"],
                        ["Lead", "Sub-headlines", "19 / 30 px", "16 / 26 px", "400", "<font face='DJM'>text-lg leading-8 text-muted</font>"],
                        ["Body", "Paragraphs", "16 / 27 px", "15 / 25 px", "400", "<font face='DJM'>text-base leading-7 text-muted</font>"],
                        ["Small", "Labels, captions", "13 / 20 px", "12 / 18 px", "500", "<font face='DJM'>text-sm text-muted</font>"],
                        ["Stat", "Big numbers", "34 / 38 px", "26 / 30 px", "700", "<font face='DJM'>font-mono text-3xl font-bold tnum</font>"],
                        ["Micro", "Disclaimers, footer", "12 / 18 px", "11 / 17 px", "400", "<font face='DJM'>text-xs leading-relaxed text-faint</font>"],
                    ],
                    widths=[16 * mm, 30 * mm, 24 * mm, 22 * mm, 11 * mm, CONTENT_W - 103 * mm], cell_style=CELL))

    st.append(h2("5.4  Space, grid, radius, elevation"))
    st.append(table(["Aspect", "Specification"],
                    [
                        ["Base unit", "4 px. All spacing is a multiple of 4 (Tailwind's default scale)."],
                        ["Container", "max-width 1200 px, centred, horizontal padding 20 px (&lt; 640), 32 px (640–1023), 40 px (≥ 1024)."],
                        ["Content column", "Prose blocks max 720 px. Stat grids and card rows use the full container."],
                        ["Section rhythm", "Vertical padding 96 px desktop / 64 px mobile between major sections; 40 px between a heading and its content."],
                        ["Grid", "12-column CSS grid at ≥ 1024 px, 6-column at 640–1023 px, 4-column below. Gutter 24 px desktop / 16 px mobile."],
                        ["Card grid gaps", "24 px desktop, 16 px mobile."],
                        ["Radius", "Pills and chips 999 px · buttons 12 px · cards and panels 16 px · inputs 10 px · images 16 px · small badges 6 px."],
                        ["Borders", "1 px solid var(--border) on every card, input and panel. On hover, border becomes var(--accent) at 60% opacity. Avoid 2 px borders except for focus."],
                        ["Elevation", "No drop shadows on dark backgrounds — they are invisible. Depth comes from surface steps: bg → surface → surface-2, plus the 1 px border. Use a shadow only on floating elements (mobile menu sheet, tooltips): 0 16px 40px rgba(2,6,23,.6)."],
                        ["Dividers", "1 px var(--border) at 60% opacity. Under section headings use a 48 px wide, 2 px accent bar instead of a full-width rule."],
                    ],
                    widths=[34 * mm, CONTENT_W - 34 * mm], cell_style=CELL))

    st.append(h2("5.5  Component inventory"))
    st.append(P("Build these eleven components once in <font face='DJM'>src/components/ui/</font> and reuse them "
                "everywhere. Nothing else should need bespoke styling."))
    st.append(table(["Component", "File", "Variants / props", "Notes"],
                    [
                        ["Button", "<font face='DJM'>ui/Button.tsx</font>", "primary · secondary · ghost · link; sizes sm/md/lg; <font face='DJM'>asChild</font> so it can render an <font face='DJM'>&lt;a&gt;</font>",
                         "Primary = accent-solid bg, white text, 12 px radius, 44 px min height. Hover: brightness 110%. Active: translateY(1px). Disabled: 50% opacity, cursor-not-allowed."],
                        ["Card", "<font face='DJM'>ui/Card.tsx</font>", "default · panel · feature", "surface bg, 1 px border, 16 px radius, 24 px padding (20 px mobile)."],
                        ["Chip / Tag", "<font face='DJM'>ui/Chip.tsx</font>", "static · core-skill · working-skill · status", "999 px radius, 12 px text, 6×12 padding. Core skills get a 6 px filled accent dot; working skills an outline dot."],
                        ["StatTile", "<font face='DJM'>ui/StatTile.tsx</font>", "value, label, hint, tone (neutral/positive/negative/accent)", "Value in mono, tabular figures, 34 px. Optional count-up animation on first view only."],
                        ["SectionHeading", "<font face='DJM'>ui/SectionHeading.tsx</font>", "eyebrow, title, subline, align", "Renders eyebrow → h2 → 48 px accent bar → subline. One source of truth for section spacing."],
                        ["TimelineItem", "<font face='DJM'>ui/TimelineItem.tsx</font>", "period, role, org, bullets[]", "Dot + 2 px line. Line colour border; dot accent with a 4 px surface ring."],
                        ["ProjectCard", "<font face='DJM'>ui/ProjectCard.tsx</font>", "image, title, blurb, stack[], metrics[], links[]", "Whole card is a link; inner links stop propagation and are aria-hidden duplicates."],
                        ["Accordion", "<font face='DJM'>ui/Accordion.tsx</font>", "items[{q,a}]", "Native <font face='DJM'>&lt;details&gt;</font>/<font face='DJM'>&lt;summary&gt;</font> with a rotating chevron. No JS state."],
                        ["Sparkline", "<font face='DJM'>ui/Sparkline.tsx</font>", "points[], markerIndex, height", "Pure SVG polyline + gradient area fill. Marker for the account reset. Hover tooltip + hidden data table for screen readers."],
                        ["BarRow", "<font face='DJM'>ui/BarRow.tsx</font>", "label, value, tone, meta", "Horizontal bar scaled to the largest absolute value, signed colour, mono value at the right."],
                        ["Disclaimer", "<font face='DJM'>ui/Disclaimer.tsx</font>", "variant (inline/page)", "Always-rendered small text block with a 1 px left accent-faint border. Never inside a tooltip or accordion."],
                    ],
                    widths=[26 * mm, 34 * mm, 52 * mm, CONTENT_W - 112 * mm], cell_style=CELL))

    st.append(h2("5.6  Iconography"))
    st.append(bullets([
        "Use <b>Lucide</b> (<font face='DJM'>lucide-react</font>) at 20–24 px, stroke 1.75, colour "
        "<font face='DJM'>var(--accent)</font> inside pillars and <font face='DJM'>var(--muted)</font> elsewhere.",
        "Suggested set: <font face='DJM'>ClipboardCheck</font> (evaluation), <font face='DJM'>Code2</font> "
        "(development), <font face='DJM'>CandlestickChart</font> (markets), <font face='DJM'>MapPin</font>, "
        "<font face='DJM'>Clock</font>, <font face='DJM'>Mail</font>, <font face='DJM'>Phone</font>, "
        "<font face='DJM'>Github</font>, <font face='DJM'>Linkedin</font>, <font face='DJM'>Download</font>, "
        "<font face='DJM'>ArrowRight</font>, <font face='DJM'>ArrowUpRight</font>, <font face='DJM'>ExternalLink</font>, "
        "<font face='DJM'>ShieldCheck</font>, <font face='DJM'>Wifi</font>, <font face='DJM'>Calendar</font>, "
        "<font face='DJM'>Menu</font>, <font face='DJM'>X</font>, <font face='DJM'>ChevronDown</font>.",
        "Decorative icons get <font face='DJM'>aria-hidden=\"true\"</font>. Icons that are the only content of a "
        "button need an <font face='DJM'>aria-label</font> or visually hidden text.",
        "Never use emoji as UI icons. Country and currency symbols (₦, $) are text, not icons.",
    ]))

    st.append(h2("5.7  Motion"))
    st.append(table(["Element", "Motion", "Duration", "Easing"],
                    [
                        ["Section reveal on scroll", "opacity 0→1, translateY 16→0 px, once, IntersectionObserver at 15% visibility", "500 ms", "cubic-bezier(0.16,1,0.3,1)"],
                        ["Hero headline + subline", "fade up 12 px, 80 ms stagger between the three lines", "500 ms", "ease-out"],
                        ["Card hover", "translateY −2 px, border colour to accent", "180 ms", "ease-out"],
                        ["Button hover / active", "brightness 110% / translateY 1 px", "120 ms", "ease-out"],
                        ["Stat count-up", "integer or 2-dp count from 0, once on first view; respects reduced motion by rendering the final value immediately", "900 ms", "ease-out"],
                        ["Sparkline draw", "stroke-dashoffset reveal on first view", "1000 ms", "ease-in-out"],
                        ["Mobile menu sheet", "translateX 100%→0 with a 40% scrim fade", "240 ms", "cubic-bezier(0.16,1,0.3,1)"],
                        ["Accordion open", "no height animation (native details); chevron rotates 180°", "180 ms", "ease-out"],
                    ],
                    widths=[38 * mm, 74 * mm, 20 * mm, CONTENT_W - 132 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(callout("dont",
        "<b>Global rule:</b> wrap every animation in a <font face='DJM'>prefers-reduced-motion: reduce</font> check "
        "that renders the final state instantly. Nothing on the page may autoplay, loop, or move without user "
        "interaction. No parallax. No cursor-following effects."))

    st.append(h2("5.8  Breakpoints"))
    st.append(table(["Name", "Width", "Layout changes"],
                    [
                        ["xs", "0–639 px", "Single column, 20 px gutters, hamburger nav, stat tiles 2-up, hero image hidden or full-width below the copy, type scale steps down one level."],
                        ["sm", "640–767 px", "Utility bar appears, stat tiles 2-up, cards single column."],
                        ["md", "768–1023 px", "Stat tiles 3-up, project cards 2-up, pillars 2-up + 1, nav still hamburger."],
                        ["lg", "1024–1279 px", "Full nav links, hero splits 58/42, pillars 3-up, projects 3-up, contact 58/42."],
                        ["xl", "≥ 1280 px", "Container fixed at 1200 px and centred; proof strip shows all six tiles in one row."],
                    ],
                    widths=[16 * mm, 24 * mm, CONTENT_W - 40 * mm], cell_style=CELL))

    st.append(h2("5.9  Imagery direction"))
    st.append(bullets([
        "<b>Portrait (hero):</b> professional, chest-up, plain dark or neutral background, looking at the camera, "
        "neutral-to-slight smile, no sunglasses, no busy pattern. Natural light. 1200×1500 px source, exported "
        "900×1125 WebP + AVIF. If you do not have one, book a 30-minute shoot — this single asset changes how the "
        "whole page reads. Do not use an AI-generated face of yourself.",
        "<b>Project screenshots:</b> real UI captures at 1600×1000, taken in the dark theme where possible, cropped "
        "to the most information-dense view, no browser chrome. For PropFirm Intelligence capture the matches page "
        "and the history report.",
        "<b>Charts:</b> generated from your own data (equity-curve.json), styled with the tokens above. Never use a "
        "stock chart image.",
        "<b>Optional texture:</b> a single 1600×1000 photo of your actual desk/setup for the About section adds "
        "credibility with the remote-work audience.",
        "<b>Never use:</b> stock photos of traders, candlestick wallpapers, money imagery, city skylines, or "
        "generic \"team meeting\" photos.",
    ]))
    st.append(PageBreak())

    # =============================================================== 6. copy deck
    st.append(section_header("6", "Content data — the complete copy deck",
                             "Every string the page needs, in one place, ready to drop into "
                             "<font face='DJM'>src/content/profile.ts</font>. Section 4 shows the same copy in "
                             "layout context; this section is the source of truth for the build."))

    st.append(h2("6.1  Identity and contact"))
    st.append(kv_table([
        ("Full name", "Divine Abba Chimdirim"),
        ("Preferred short form", "Divine"),
        ("Monogram", "DAC"),
        ("Role line (primary)", "AI Training &amp; Evaluation · Software Developer (JavaScript, React, Node.js)"),
        ("Role line (short, for nav/OG)", "AI Evaluation &amp; Full-Stack Developer"),
        ("Location", "Abuja, FCT, Nigeria"),
        ("Timezone", "WAT — UTC+1 (no daylight saving)"),
        ("Email", "divineabbachimdirim1@gmail.com"),
        ("Phone / WhatsApp", "+234 906 749 2422"),
        ("GitHub", "https://github.com/Divine-AC"),
        ("LinkedIn", "https://www.linkedin.com/in/divine-abba-883540311"),
        ("CV file", "/Divine_Abba_Chimdirim_Resume.pdf  (place in <font face='DJM'>public/</font>)"),
        ("Trade ledger", "/trades.csv  (from <font face='DJM'>docs/landing-page/trades.csv</font>)"),
        ("Availability", "[CONFIRM — e.g. Open to part-time AI-evaluation contracts and full-time remote developer roles; can start within one week]"),
    ], label_w=42 * mm, style=CELL))

    st.append(h2("6.2  Hero strings and headline options"))
    st.append(table(["Slot", "Final string"],
                    [
                        ["Eyebrow", "AI TRAINING &amp; EVALUATION · SOFTWARE DEVELOPER · ABUJA, NIGERIA"],
                        ["h1 (chosen, P1)", "I evaluate AI output the way I trade: rules first, evidence always."],
                        ["h1 alt A2", "Software developer and AI evaluation specialist — I check the work, then prove it."],
                        ["h1 alt A3", "Careful eyes for AI output. Shipping hands for React and Node.js."],
                        ["h1 alt A4 (P2)", "Full-stack developer building React and Node.js products from Abuja — and the tools I wish existed."],
                        ["Sub-headline", "I'm Divine Abba Chimdirim. I review model and agent output against explicit rubrics, with calibrated scores and written justifications, and I build the JavaScript applications that make that work visible. Five years trading proprietary capital taught me the habit this job actually needs: record everything, claim nothing you cannot defend."],
                        ["CTA primary", "Work with me"],
                        ["CTA secondary", "View my projects"],
                        ["CTA tertiary", "Download CV (PDF, 2 pages)"],
                        ["Photo alt text", "Divine Abba Chimdirim, software developer and AI evaluation specialist, working from Abuja, Nigeria"],
                    ],
                    widths=[30 * mm, CONTENT_W - 30 * mm], cell_style=CELL))

    st.append(h2("6.3  Section kickers and headings"))
    st.append(table(["Section", "Kicker (uppercase, letterspaced)", "Heading (h2)"],
                    [
                        ["S3 Proof strip", "THE SHORT VERSION", "Six numbers, all checkable"],
                        ["S4 Pillars", "WHAT I DO", "Three ways I am useful to a team"],
                        ["S5 About", "ABOUT", "From site inspections to agent evaluations"],
                        ["S6 Skills", "CAPABILITIES", "What I actually work with"],
                        ["S7 Projects", "SELECTED WORK", "Things I have shipped"],
                        ["S8 Trading", "THE RECORD", "What 100 closed trades actually show"],
                        ["S9 Experience", "EXPERIENCE", "Where I have worked"],
                        ["S10 Credentials", "CREDENTIALS", "Certificates you can check, not just believe"],
                        ["S11 Leadership", "LEADERSHIP", "Teams, tickets and a chair that had to be comfortable"],
                        ["S12 References", "REFERENCES", "People who have worked with me"],
                        ["S13 Remote", "HOW I WORK", "Built for remote, across timezones"],
                        ["S14 FAQ", "QUESTIONS", "What recruiters usually ask me"],
                        ["S15 Contact", "CONTACT", "Tell me what you need evaluated, built or fixed"],
                    ],
                    widths=[26 * mm, 52 * mm, CONTENT_W - 78 * mm], cell_style=CELL))

    st.append(h2("6.4  Microcopy — buttons, labels, states"))
    st.append(table(["Where", "String"],
                    [
                        ["Nav primary button", "Get in touch"],
                        ["Product link", "PropFirm Intelligence ↗"],
                        ["Card links", "Live demo ↗ · GitHub ↗ · Read the case →"],
                        ["Back to top", "Back to top ↑"],
                        ["Menu button aria-label", "Open navigation menu / Close navigation menu"],
                        ["Skip link", "Skip to main content"],
                        ["Form: name label", "Your name"],
                        ["Form: email label", "Email address"],
                        ["Form: org label", "Company or organisation (optional)"],
                        ["Form: interest label", "I'm interested in"],
                        ["Form: interest options", "AI evaluation work · Development contract · Full-time role · PropFirm Intelligence · Something else"],
                        ["Form: message label", "What do you need? (minimum 20 characters)"],
                        ["Form: message placeholder", "Scope, deadline, and how I can help. The more specific, the faster I can answer."],
                        ["Form: submit", "Send message"],
                        ["Form: submitting", "Sending…"],
                        ["Form: success title", "Message sent"],
                        ["Form: success body", "Thanks — I have your message and I reply within 24 hours on weekdays. If it is urgent, WhatsApp +234 906 749 2422."],
                        ["Form: error title", "That did not send"],
                        ["Form: error body", "Please try again, or email me directly at divineabbachimdirim1@gmail.com."],
                        ["Validation: name", "Please enter your name."],
                        ["Validation: email", "Please enter a valid email address, e.g. name@company.com."],
                        ["Validation: message short", "Please add a little more detail (at least 20 characters)."],
                        ["Validation: interest", "Please choose one option."],
                        ["Empty/JS-off fallback", "Email me at divineabbachimdirim1@gmail.com — this form needs JavaScript, but my inbox does not."],
                        ["404 page", "This page does not exist. · Back to the landing page →"],
                        ["Chart tooltip", "{date} · {symbol} · {direction} · P&L {signed value} · Balance {value}"],
                        ["Account-reset marker label", "New $100,000 account opened 13 Nov 2026"],
                        ["Unverified badge", "Unverified"],
                        ["Last-updated line", "Trading data updated {date} · Page last built {date}"],
                    ],
                    widths=[42 * mm, CONTENT_W - 42 * mm], cell_style=CELL))

    st.append(h2("6.5  SEO strings"))
    st.append(table(["Page", "title (≤ 60 chars)", "description (150–158 chars)"],
                    [
                        ["/", "Divine Abba Chimdirim — AI Evaluation &amp; Developer",
                         "AI training and evaluation specialist and full-stack React/Node.js developer in Abuja, Nigeria. Mercor-certified, verifiable credentials, shipped projects, documented trading record."],
                        ["/trading", "Trading Record — Divine Abba Chimdirim",
                         "A dated, unaudited sample of 100 closed trades from 10 Sep to 13 Nov 2026: net P&L, win rate, profit factor, per-instrument results, drawdown and method."],
                        ["/projects", "Projects — Divine Abba Chimdirim",
                         "Full-stack projects in React, Node.js, Express and MongoDB, plus PropFirm Intelligence, an evidence-based prop-firm matching and trade-history analytics tool."],
                    ],
                    widths=[18 * mm, 56 * mm, CONTENT_W - 74 * mm], cell_style=CELL))
    st.append(Spacer(1, 2 * mm))
    st.append(bullets([
        "<b>OG title:</b> Divine Abba Chimdirim — AI Evaluation &amp; Full-Stack Developer",
        "<b>OG description:</b> Rubric-based AI evaluation, React/Node.js delivery, and a documented trading record. Abuja, Nigeria — remote worldwide.",
        "<b>OG image:</b> 1200×630, dark background, name in 64 px, role line in 24 px, three chips "
        "(Mercor certified · 12-person team lead · 5+ years trading), monogram top-left, URL bottom-right.",
        "<b>Twitter card:</b> <font face='DJM'>summary_large_image</font>.",
        "<b>Keywords to cover naturally in body text</b> (no keyword stuffing): AI agent evaluation, AI training "
        "data, model output review, rubric, calibration, React developer Nigeria, Node.js developer Abuja, "
        "remote JavaScript developer, prop firm trader, trade history analysis.",
    ]))

    st.append(h2("6.6  Legal and disclaimer copy (verbatim)"))
    st.append(callout("copy",
        "<b>Trading disclaimer (S8 panel and /trading page, always visible):</b><br/>"
        "Trading figures shown here are realised results from an exported sample of my own closed positions over a "
        "stated period. They are unaudited, they are not representative of all my trading, and they do not predict "
        "future results. Balance-based drawdown is measured only at exported rows and cannot capture floating loss "
        "between them. Nothing on this website is financial advice, an offer to manage funds, a solicitation, or a "
        "trading signal service.<br/><br/>"
        "<b>Certificate line (S10):</b><br/>"
        "Certificate identifiers are published so that any recruiter or client can verify them directly with the "
        "issuing organisation.<br/><br/>"
        "<b>Footer legal line:</b><br/>"
        "© 2026 Divine Abba Chimdirim. Trading performance shown is historical, unaudited and not indicative of "
        "future results. No investment advice is offered or implied.<br/><br/>"
        "<b>Privacy line (if you use a form provider or analytics):</b><br/>"
        "Messages sent through this form are used only to reply to you. This site sets no advertising cookies."
        "[CONFIRM: adjust to the provider you choose and add a /privacy page if you store submissions or use "
        "Google Analytics.]",
        title="VERBATIM LEGAL COPY"))
    st.append(PageBreak())
