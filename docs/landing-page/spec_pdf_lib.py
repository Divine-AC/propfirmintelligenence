"""Shared styles + flowable helpers for the landing-page build specification PDF."""

from __future__ import annotations

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    HRFlowable,
    KeepTogether,
    ListFlowable,
    ListItem,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"

# ---------------------------------------------------------------- palette
INK = colors.HexColor("#0B1220")
INK_SOFT = colors.HexColor("#25324A")
MUTED = colors.HexColor("#5B6880")
ACCENT = colors.HexColor("#0E7490")
ACCENT_DK = colors.HexColor("#155E75")
ACCENT_SOFT = colors.HexColor("#E4F5F8")
LINE = colors.HexColor("#D7DEE9")
LINE_SOFT = colors.HexColor("#EDF1F7")
CODE_BG = colors.HexColor("#F3F6FA")
GOOD = colors.HexColor("#0F7B4D")
GOOD_BG = colors.HexColor("#E7F5EE")
BAD = colors.HexColor("#B4232A")
BAD_BG = colors.HexColor("#FBECEC")
WARN = colors.HexColor("#8A5A06")
WARN_BG = colors.HexColor("#FDF3E2")
COPY_BG = colors.HexColor("#FBFCFE")

PAGE_W, PAGE_H = A4
MARGIN_L = 18 * mm
MARGIN_R = 18 * mm
MARGIN_T = 24 * mm
MARGIN_B = 18 * mm
CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R  # 174 mm


# ---------------------------------------------------------------- fonts
def register_fonts() -> None:
    pdfmetrics.registerFont(TTFont("DJ", f"{FONT_DIR}/DejaVuSans.ttf"))
    pdfmetrics.registerFont(TTFont("DJ-B", f"{FONT_DIR}/DejaVuSans-Bold.ttf"))
    pdfmetrics.registerFont(TTFont("DJM", f"{FONT_DIR}/DejaVuSansMono.ttf"))
    pdfmetrics.registerFont(TTFont("DJM-B", f"{FONT_DIR}/DejaVuSansMono-Bold.ttf"))
    pdfmetrics.registerFont(TTFont("DJS", f"{FONT_DIR}/DejaVuSerif.ttf"))
    pdfmetrics.registerFont(TTFont("DJS-B", f"{FONT_DIR}/DejaVuSerif-Bold.ttf"))
    pdfmetrics.registerFontFamily("DJ", normal="DJ", bold="DJ-B", italic="DJS", boldItalic="DJS-B")
    pdfmetrics.registerFontFamily("DJM", normal="DJM", bold="DJM-B", italic="DJM", boldItalic="DJM-B")


# ---------------------------------------------------------------- styles
def styles() -> dict[str, ParagraphStyle]:
    s: dict[str, ParagraphStyle] = {}
    s["CoverKicker"] = ParagraphStyle("CoverKicker", fontName="DJ-B", fontSize=9.5, leading=14,
                                      textColor=ACCENT, alignment=TA_LEFT, spaceAfter=4)
    s["CoverTitle"] = ParagraphStyle("CoverTitle", fontName="DJ-B", fontSize=27, leading=32,
                                     textColor=INK, spaceAfter=8)
    s["CoverSub"] = ParagraphStyle("CoverSub", fontName="DJ", fontSize=13, leading=19,
                                   textColor=INK_SOFT, spaceAfter=6)
    s["CoverMeta"] = ParagraphStyle("CoverMeta", fontName="DJ", fontSize=9, leading=14, textColor=MUTED)
    s["H1"] = ParagraphStyle("H1", fontName="DJ-B", fontSize=16.5, leading=21, textColor=INK,
                             spaceBefore=2, spaceAfter=7, keepWithNext=1)
    s["H2"] = ParagraphStyle("H2", fontName="DJ-B", fontSize=12, leading=16, textColor=ACCENT_DK,
                             spaceBefore=11, spaceAfter=4, keepWithNext=1)
    s["H3"] = ParagraphStyle("H3", fontName="DJ-B", fontSize=10, leading=14, textColor=INK,
                             spaceBefore=8, spaceAfter=3, keepWithNext=1)
    s["Body"] = ParagraphStyle("Body", fontName="DJ", fontSize=9.3, leading=14.2, textColor=INK_SOFT,
                               spaceAfter=5, alignment=TA_LEFT)
    s["BodyTight"] = ParagraphStyle("BodyTight", parent=s["Body"], spaceAfter=2)
    s["Lead"] = ParagraphStyle("Lead", fontName="DJ", fontSize=10.4, leading=16, textColor=INK_SOFT,
                               spaceAfter=6)
    s["Small"] = ParagraphStyle("Small", fontName="DJ", fontSize=7.9, leading=11.4, textColor=MUTED,
                                spaceAfter=4)
    s["Bullet"] = ParagraphStyle("Bullet", parent=s["Body"], spaceAfter=2.5, leading=13.6)
    s["Cell"] = ParagraphStyle("Cell", fontName="DJ", fontSize=8.1, leading=11.4, textColor=INK_SOFT)
    s["CellB"] = ParagraphStyle("CellB", fontName="DJ-B", fontSize=8.1, leading=11.4, textColor=INK)
    s["CellSm"] = ParagraphStyle("CellSm", fontName="DJ", fontSize=7.2, leading=9.8, textColor=INK_SOFT)
    s["CellSmB"] = ParagraphStyle("CellSmB", fontName="DJ-B", fontSize=7.2, leading=9.8, textColor=INK)
    s["TH"] = ParagraphStyle("TH", fontName="DJ-B", fontSize=7.8, leading=10.6, textColor=colors.white)
    s["Mono"] = ParagraphStyle("Mono", fontName="DJM", fontSize=7.5, leading=10.6, textColor=INK)
    s["MonoSm"] = ParagraphStyle("MonoSm", fontName="DJM", fontSize=6.6, leading=9.2, textColor=INK_SOFT)
    s["CopyLabel"] = ParagraphStyle("CopyLabel", fontName="DJ-B", fontSize=7.2, leading=10,
                                    textColor=ACCENT_DK, spaceAfter=2)
    s["Copy"] = ParagraphStyle("Copy", fontName="DJ", fontSize=8.9, leading=13.4, textColor=INK)
    s["CalloutH"] = ParagraphStyle("CalloutH", fontName="DJ-B", fontSize=8.6, leading=12, textColor=INK)
    s["CalloutB"] = ParagraphStyle("CalloutB", fontName="DJ", fontSize=8.4, leading=12.4, textColor=INK_SOFT)
    s["TOC1"] = ParagraphStyle("TOC1", fontName="DJ-B", fontSize=9.4, leading=15, textColor=INK)
    s["TOC2"] = ParagraphStyle("TOC2", fontName="DJ", fontSize=8.6, leading=13, textColor=MUTED,
                               leftIndent=10)
    return s


S = styles()


def esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def P(text: str, style: str = "Body") -> Paragraph:
    return Paragraph(text, S[style])


def bullets(items: list[str], style: str = "Bullet", bullet: str = "\u2022", indent: float = 4.2 * mm):
    return ListFlowable(
        [ListItem(Paragraph(i, S[style]), leftIndent=indent, value=bullet) for i in items],
        bulletType="bullet", start=bullet, leftIndent=indent,
        bulletFontName="DJ", bulletFontSize=8, spaceBefore=1, spaceAfter=5,
    )


def numbered(items: list[str], style: str = "Bullet", indent: float = 5.4 * mm):
    return ListFlowable(
        [ListItem(Paragraph(i, S[style]), leftIndent=indent) for i in items],
        bulletType="1", bulletFormat="%s.", leftIndent=indent,
        bulletFontName="DJ-B", bulletFontSize=8.4, spaceBefore=1, spaceAfter=5,
    )


def rule(color=LINE, width=0.6, space_before=2, space_after=6):
    return HRFlowable(width="100%", thickness=width, color=color,
                      spaceBefore=space_before, spaceAfter=space_after, lineCap="round")


def _cell(text, style="Cell"):
    if hasattr(text, "wrapOn"):
        return text
    return Paragraph(str(text), S[style])


def table(header: list[str] | None, rows: list[list], widths: list[float],
          aligns: list[str] | None = None, cell_style="Cell", head_style="TH",
          font_size=None, zebra=True, valign="TOP", pad=3.4):
    data = []
    if header:
        data.append([Paragraph(h, S[head_style]) for h in header])
    for r in rows:
        data.append([_cell(c, cell_style) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), valign),
        ("LEFTPADDING", (0, 0), (-1, -1), pad + 1.6),
        ("RIGHTPADDING", (0, 0), (-1, -1), pad + 1.6),
        ("TOPPADDING", (0, 0), (-1, -1), pad),
        ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
        ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
    ]
    if header:
        cmds += [
            ("BACKGROUND", (0, 0), (-1, 0), INK),
            ("LINEBELOW", (0, 0), (-1, 0), 0.6, INK),
            ("TOPPADDING", (0, 0), (-1, 0), pad + 0.8),
            ("BOTTOMPADDING", (0, 0), (-1, 0), pad + 0.8),
        ]
    if zebra:
        start = 1 if header else 0
        for i in range(start, len(data)):
            if (i - start) % 2 == 1:
                cmds.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#F8FAFD")))
    if aligns:
        for i, a in enumerate(aligns):
            cmds.append(("ALIGN", (i, 0), (i, -1), {"l": "LEFT", "c": "CENTER", "r": "RIGHT"}[a]))
    t.setStyle(TableStyle(cmds))
    return t


def kv_table(pairs: list[tuple[str, str]], label_w: float = 34 * mm, style="Cell"):
    rows = [[Paragraph(f"<b>{esc(k)}</b>", S[style]), Paragraph(v, S[style])] for k, v in pairs]
    t = Table(rows, colWidths=[label_w, CONTENT_W - label_w], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 3.4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.4),
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F5F8FC")),
        ("LINEBELOW", (0, 0), (-1, -2), 0.35, LINE_SOFT),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, LINE),
    ]))
    return t


CALLOUTS = {
    "note": (ACCENT, ACCENT_SOFT, "NOTE"),
    "do": (GOOD, GOOD_BG, "DO THIS"),
    "dont": (BAD, BAD_BG, "AVOID"),
    "warn": (WARN, WARN_BG, "IMPORTANT"),
    "copy": (ACCENT_DK, COPY_BG, "READY-TO-PASTE COPY"),
}


def callout(kind: str, body: str, title: str | None = None, mono: bool = False):
    bar, bg, default_title = CALLOUTS[kind]
    body_style = "MonoSm" if mono else "CalloutB"
    inner = []
    if title or default_title:
        inner.append(Paragraph(f'<font color="{bar.hexval()}">{esc(title or default_title)}</font>',
                               S["CalloutH"]))
        inner.append(Spacer(1, 2))
    for chunk in body.split("\n\n"):
        chunk = chunk.strip()
        if not chunk:
            continue
        inner.append(Paragraph(esc(chunk) if mono else chunk, S[body_style]))
        inner.append(Spacer(1, 2.4))
    if inner and isinstance(inner[-1], Spacer):
        inner.pop()
    t = Table([[inner]], colWidths=[CONTENT_W], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 2.4, bar),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ("TOPPADDING", (0, 0), (-1, -1), 5.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5.5),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return KeepTogether([Spacer(1, 2), t, Spacer(1, 6)])


def code_block(text: str, wrap: int = 92, title: str | None = None):
    """Render monospace content preserving line breaks and indentation.

    Paragraph collapses raw newlines and leading spaces, so newlines become
    <br/> and leading spaces become non-breaking spaces; inner spaces stay
    normal so long lines can wrap inside the box.
    """
    src = text.rstrip("\n")
    if title:
        src = f"// {title}\n" + src
    out = []
    for ln in src.split("\n"):
        lead = len(ln) - len(ln.lstrip(" "))
        content = ln[lead:].replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        out.append("&nbsp;" * lead + content)
    body = "<br/>".join(out)
    t = Table([[Paragraph(body, S["MonoSm"])]], colWidths=[CONTENT_W], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CODE_BG),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("LINEBEFORE", (0, 0), (0, -1), 2.0, colors.HexColor("#94A3B8")),
        ("LEFTPADDING", (0, 0), (-1, -1), 7),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return KeepTogether([Spacer(1, 1), t, Spacer(1, 6)])


def section_header(num: str, title: str, blurb: str | None = None):
    """Big numbered section header used for the main parts of the doc.

    Emits real H1 paragraphs (not a table) so the document outline and PDF
    bookmarks pick the section up.
    """
    flow = [Spacer(1, 2)]
    label = f'<font color="#0E7490">{esc(num)}</font>\u2002{esc(title)}' if num else esc(title)
    flow.append(Paragraph(label, S["H1"]))
    flow.append(rule(ACCENT, 1.1, space_before=3, space_after=6))
    if blurb:
        flow.append(Paragraph(blurb, S["Lead"]))
    return KeepTogether(flow)


def h1(text: str, anchor: str | None = None):
    p = Paragraph(f'<a name="{anchor}"/>{esc(text)}' if anchor else esc(text), S["H1"])
    return p


def h2(text: str):
    return Paragraph(esc(text), S["H2"])


def h3(text: str):
    return Paragraph(esc(text), S["H3"])


def stat_tiles(tiles: list[tuple[str, str, str]], per_row: int = 4, tone="neutral"):
    """tiles = (value, label, sublabel)"""
    rows = []
    for i in range(0, len(tiles), per_row):
        chunk = tiles[i:i + per_row]
        while len(chunk) < per_row:
            chunk.append(None)
        cells = []
        for c in chunk:
            if c is None:
                cells.append("")
            else:
                val, lab, sub = c
                col = {"neutral": INK, "good": GOOD, "bad": BAD, "accent": ACCENT_DK}[tone]
                cells.append([
                    Paragraph(f'<font color="{col.hexval()}">{esc(val)}</font>',
                              ParagraphStyle("tv", fontName="DJ-B", fontSize=13.5, leading=16,
                                             textColor=col, alignment=TA_CENTER)),
                    Paragraph(f'<font color="#25324A">{esc(lab)}</font>',
                              ParagraphStyle("tl", fontName="DJ-B", fontSize=7.2, leading=9.6,
                                             alignment=TA_CENTER)),
                    Paragraph(f'<font color="#5B6880">{esc(sub)}</font>',
                              ParagraphStyle("ts", fontName="DJ", fontSize=6.6, leading=9,
                                             alignment=TA_CENTER)),
                ])
        rows.append(cells)
    w = CONTENT_W / per_row
    t = Table(rows, colWidths=[w] * per_row, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 4), ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("BOX", (0, 0), (-1, -1), 0.5, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE_SOFT),
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FAFCFE")),
    ]
    t.setStyle(TableStyle(cmds))
    return KeepTogether([Spacer(1, 2), t, Spacer(1, 7)])


# ---------------------------------------------------------------- doc template
class NumberedCanvas(rl_canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved = []

    def showPage(self):
        self._saved.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total = len(self._saved)
        for state in self._saved:
            self.__dict__.update(state)
            self._draw_furniture(total)
            super().showPage()
        super().save()

    def _draw_furniture(self, total: int):
        page = self._pageNumber
        if page == 1:
            return
        self.saveState()
        # header
        self.setFont("DJ", 7.2)
        self.setFillColor(MUTED)
        self.drawString(MARGIN_L, PAGE_H - 13.5 * mm,
                        "Landing Page Build Specification  \u00b7  Divine Abba Chimdirim")
        self.drawRightString(PAGE_W - MARGIN_R, PAGE_H - 13.5 * mm, "v1.0  \u00b7  16 Nov 2026")
        self.setStrokeColor(LINE)
        self.setLineWidth(0.5)
        self.line(MARGIN_L, PAGE_H - 15.4 * mm, PAGE_W - MARGIN_R, PAGE_H - 15.4 * mm)
        # footer
        self.line(MARGIN_L, MARGIN_B - 4.5 * mm, PAGE_W - MARGIN_R, MARGIN_B - 4.5 * mm)
        self.setFont("DJ", 7.2)
        self.setFillColor(MUTED)
        self.drawString(MARGIN_L, MARGIN_B - 9 * mm,
                        "Prepared for hand-off to a developer or AI build agent \u2014 contains all copy, data and acceptance criteria.")
        self.setFont("DJ-B", 7.6)
        self.setFillColor(INK)
        self.drawRightString(PAGE_W - MARGIN_R, MARGIN_B - 9 * mm, f"{page} / {total}")
        self.restoreState()


class SpecDoc(BaseDocTemplate):
    def __init__(self, path: str, **kw):
        super().__init__(path, pagesize=A4, leftMargin=MARGIN_L, rightMargin=MARGIN_R,
                         topMargin=MARGIN_T, bottomMargin=MARGIN_B,
                         title="Personal Landing Page \u2014 Build Specification & Content Pack",
                         author="Divine Abba Chimdirim",
                         subject="Landing page specification: content, design system, data and acceptance criteria",
                         creator="PropFirm Intelligence workspace", **kw)
        cover = Frame(MARGIN_L, MARGIN_B, CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B - 6 * mm,
                      id="cover", showBoundary=0)
        body = Frame(MARGIN_L, MARGIN_B, CONTENT_W, PAGE_H - MARGIN_T - MARGIN_B, id="body")
        self.addPageTemplates([
            PageTemplate(id="Cover", frames=[cover]),
            PageTemplate(id="Body", frames=[body]),
        ])
        self._outline: list[tuple[int, str, str]] = []
        self._last_level = -1

    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph):
            name = flowable.style.name
            if name not in ("H1", "H2"):
                return
            text = flowable.getPlainText().strip()
            if not text:
                return
            wanted = 0 if name == "H1" else 1
            # never jump more than one level deeper than the previous entry
            level = min(wanted, (self._last_level + 1) if self._outline else 0)
            self._last_level = level
            key = f"ol{len(self._outline)}"
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(text[:90], key, level=level, closed=(level == 1))
            self._outline.append((level, text, key))
