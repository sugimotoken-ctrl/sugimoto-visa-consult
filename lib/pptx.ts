import PptxGenJS from "pptxgenjs";
import { BRAND } from "@/lib/brand";
import type { DeckContent, DeckLabels } from "@/lib/openai";

const NAVY = BRAND.colors.navy;
const ORANGE = BRAND.colors.orange;
const CREAM = BRAND.colors.cream;
const INK = BRAND.colors.ink;
const SLATE = BRAND.colors.slate;
const WHITE = "FFFFFF";
const PAGEW = 13.333; // LAYOUT_WIDE width in inches

export type DeckImages = {
  cover: Buffer | null;
  applicant: Buffer | null;
  spouse: Buffer | null;
  children: (Buffer | null)[];
};

// Rendering context: layout is authored left-to-right, then mirrored for RTL.
type Ctx = {
  rtl: boolean;
  heading: string; // font for serif/display text
  body: string; // font for body text
  labels: DeckLabels;
};

function dataUri(buf: Buffer | null): string | null {
  return buf ? `data:image/png;base64,${buf.toString("base64")}` : null;
}

// Mirror an x coordinate for RTL given the element width.
function mx(ctx: Ctx, x: number, w: number): number {
  return ctx.rtl ? PAGEW - x - w : x;
}

type Align = "left" | "right" | "center";
function flipAlign(ctx: Ctx, a?: Align): Align {
  if (!ctx.rtl) return a ?? "left";
  if (a === "center") return "center";
  if (a === "right") return "left";
  return "right";
}

type TxtOpts = {
  x: number;
  y: number;
  w: number;
  h: number;
  font: "heading" | "body";
  size: number;
  color: string;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
  valign?: "top" | "middle" | "bottom";
  charSpacing?: number;
  lineSpacingMultiple?: number;
};

type TextInput = string | { text: string; options?: Record<string, unknown> }[];

function txt(slide: PptxGenJS.Slide, ctx: Ctx, text: TextInput, o: TxtOpts) {
  slide.addText(text as never, {
    x: mx(ctx, o.x, o.w),
    y: o.y,
    w: o.w,
    h: o.h,
    fontFace: o.font === "heading" ? ctx.heading : ctx.body,
    fontSize: o.size,
    color: o.color,
    bold: o.bold,
    italic: o.italic,
    align: flipAlign(ctx, o.align),
    valign: o.valign,
    charSpacing: o.charSpacing,
    lineSpacingMultiple: o.lineSpacingMultiple,
    rtlMode: ctx.rtl,
  });
}

function rect(
  slide: PptxGenJS.Slide,
  ctx: Ctx,
  o: {
    x: number;
    y: number;
    w: number;
    h: number;
    fill: string;
    transparency?: number;
    line?: { color: string; width: number };
    shadow?: PptxGenJS.ShadowProps;
    fullWidth?: boolean;
  }
) {
  slide.addShape("rect", {
    x: o.fullWidth ? 0 : mx(ctx, o.x, o.w),
    y: o.y,
    w: o.fullWidth ? "100%" : o.w,
    h: o.h,
    fill: { color: o.fill, transparency: o.transparency },
    line: o.line ?? { type: "none" },
    shadow: o.shadow,
  });
}

function img(
  slide: PptxGenJS.Slide,
  ctx: Ctx,
  o: { data: string; x: number; y: number; w: number; h: number }
) {
  slide.addImage({
    data: o.data,
    x: mx(ctx, o.x, o.w),
    y: o.y,
    w: o.w,
    h: o.h,
    sizing: { type: "cover", w: o.w, h: o.h },
  });
}

function wordmark(slide: PptxGenJS.Slide, ctx: Ctx, color = WHITE) {
  // Authored top-right; mirrors to top-left for RTL.
  txt(
    slide,
    ctx,
    [
      { text: "SUGIMOTO ", options: { bold: true } },
      { text: "VISA", options: { bold: false } },
    ],
    { x: 9.7, y: 0.18, w: 3.4, h: 0.4, font: "heading", size: 12, color, align: "right", charSpacing: 2 }
  );
}

function contentHeader(
  slide: PptxGenJS.Slide,
  ctx: Ctx,
  title: string,
  kicker?: string
) {
  slide.background = { color: CREAM };
  rect(slide, ctx, { x: 0, y: 0, w: PAGEW, h: 1.15, fill: NAVY, fullWidth: true });
  rect(slide, ctx, { x: 0, y: 1.15, w: PAGEW, h: 0.06, fill: ORANGE, fullWidth: true });
  if (kicker) {
    txt(slide, ctx, kicker.toUpperCase(), {
      x: 0.6, y: 0.2, w: 8, h: 0.3, font: "body", size: 11, color: ORANGE, charSpacing: 3,
    });
  }
  txt(slide, ctx, title, {
    x: 0.6, y: kicker ? 0.5 : 0.3, w: 8.8, h: 0.6, font: "heading", size: 26, bold: true, color: WHITE,
  });
  wordmark(slide, ctx);
}

function footer(slide: PptxGenJS.Slide, ctx: Ctx) {
  txt(slide, ctx, BRAND.website, {
    x: 0.6, y: 7.05, w: 6, h: 0.3, font: "body", size: 10, color: SLATE,
  });
  txt(slide, ctx, ctx.labels.preparedFor, {
    x: 7, y: 7.05, w: 5.7, h: 0.3, font: "body", size: 10, color: SLATE, italic: true, align: "right",
  });
}

function bulletItems(items: string[]) {
  return items.map((t) => ({
    text: t,
    options: { bullet: { code: "2022", indent: 16 } },
  }));
}

// Person/opportunity page: text + image side by side (mirrored for RTL).
function personSlide(
  pptx: PptxGenJS,
  ctx: Ctx,
  page: { title: string; summary: string; opportunities: string[] },
  kicker: string,
  image: Buffer | null
) {
  const slide = pptx.addSlide();
  contentHeader(slide, ctx, page.title, kicker);

  const picture = dataUri(image);
  const textW = picture ? 6.7 : 12.1;

  txt(slide, ctx, page.summary, {
    x: 0.6, y: 1.5, w: textW, h: 1.4, font: "body", size: 14, color: INK, valign: "top", lineSpacingMultiple: 1.15,
  });
  txt(slide, ctx, ctx.labels.opportunities.toUpperCase(), {
    x: 0.6, y: 3.0, w: textW, h: 0.3, font: "body", size: 12, bold: true, color: ORANGE, charSpacing: 2,
  });
  txt(slide, ctx, bulletItems(page.opportunities), {
    x: 0.6, y: 3.35, w: textW, h: 3.3, font: "body", size: 13.5, color: INK, valign: "top", lineSpacingMultiple: 1.2,
  });

  if (picture) {
    rect(slide, ctx, {
      x: 7.5, y: 1.5, w: 5.2, h: 5.1, fill: WHITE,
      shadow: { type: "outer", color: "999999", blur: 6, offset: 2, angle: 90, opacity: 0.3 },
    });
    img(slide, ctx, { data: picture, x: 7.6, y: 1.6, w: 5.0, h: 4.9 });
  }

  footer(slide, ctx);
  return slide;
}

export async function buildDeck(
  content: DeckContent,
  images: DeckImages,
  rtl = false
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = BRAND.name;
  pptx.company = BRAND.name;

  // Latin serif/sans for LTR; Tahoma renders Persian/Arabic/Cyrillic well in Office.
  const ctx: Ctx = {
    rtl,
    heading: rtl ? "Tahoma" : BRAND.fonts.heading,
    body: rtl ? "Tahoma" : BRAND.fonts.body,
    labels: content.labels,
  };

  // -------- Cover --------
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  const coverImg = dataUri(images.cover);
  if (coverImg) {
    img(cover, ctx, { data: coverImg, x: 7.8, y: 0, w: 5.53, h: 7.5 });
    rect(cover, ctx, { x: 7.0, y: 0, w: 1.4, h: 7.5, fill: NAVY, transparency: 30 });
  }
  rect(cover, ctx, { x: 0.6, y: 0.6, w: 0.12, h: 0.55, fill: ORANGE });
  txt(
    cover,
    ctx,
    [
      { text: "SUGIMOTO ", options: { bold: true } },
      { text: "VISA", options: {} },
    ],
    { x: 0.85, y: 0.6, w: 6, h: 0.55, font: "heading", size: 20, color: WHITE, charSpacing: 3, valign: "middle" }
  );
  txt(cover, ctx, content.headline, {
    x: 0.6, y: 2.6, w: coverImg ? 7.2 : 12, h: 1.8, font: "heading", size: 40, bold: true, color: WHITE, valign: "top", lineSpacingMultiple: 1.0,
  });
  txt(cover, ctx, content.subhead, {
    x: 0.6, y: 4.5, w: coverImg ? 7.0 : 11, h: 1.2, font: "body", size: 16, color: "D7DCE6", valign: "top", lineSpacingMultiple: 1.2,
  });
  txt(cover, ctx, BRAND.website, {
    x: 0.6, y: 6.9, w: 6, h: 0.3, font: "body", size: 11, color: ORANGE,
  });

  // -------- Overview --------
  const ov = pptx.addSlide();
  contentHeader(ov, ctx, content.overview.title || ctx.labels.pathwayOverview, ctx.labels.pathwayOverview);
  let y = 1.5;
  for (const prog of content.overview.programs || []) {
    txt(ov, ctx, prog.name, {
      x: 0.6, y, w: 7.4, h: 0.4, font: "heading", size: 16, bold: true, color: NAVY,
    });
    y += 0.45;
    if (prog.summary) {
      txt(ov, ctx, prog.summary, {
        x: 0.6, y, w: 7.4, h: 0.6, font: "body", size: 12, color: INK, valign: "top", lineSpacingMultiple: 1.1,
      });
      y += 0.7;
    }
    if (prog.keyPoints?.length) {
      txt(ov, ctx, bulletItems(prog.keyPoints), {
        x: 0.7, y, w: 7.3, h: 0.25 * prog.keyPoints.length + 0.2, font: "body", size: 12, color: INK, valign: "top", lineSpacingMultiple: 1.1,
      });
      y += 0.28 * prog.keyPoints.length + 0.25;
    }
    y += 0.15;
  }

  rect(ov, ctx, { x: 8.4, y: 1.5, w: 4.3, h: 5.1, fill: WHITE, line: { color: BRAND.colors.border, width: 1 } });
  txt(ov, ctx, ctx.labels.whyDestination.toUpperCase(), {
    x: 8.7, y: 1.7, w: 3.8, h: 0.3, font: "body", size: 12, bold: true, color: ORANGE, charSpacing: 2,
  });
  txt(ov, ctx, bulletItems(content.overview.whyDestination || []), {
    x: 8.7, y: 2.1, w: 3.8, h: 4.3, font: "body", size: 12.5, color: INK, valign: "top", lineSpacingMultiple: 1.2,
  });
  footer(ov, ctx);

  // -------- People --------
  personSlide(pptx, ctx, content.applicant, ctx.labels.mainApplicant, images.applicant);
  if (content.spouse) {
    personSlide(pptx, ctx, content.spouse, ctx.labels.partnerSpouse, images.spouse);
  }
  (content.children || []).forEach((child, i) => {
    const kicker = child.name
      ? `${ctx.labels.forPrefix} ${child.name}`
      : `${ctx.labels.child} ${i + 1}`;
    personSlide(pptx, ctx, child, kicker, images.children[i] ?? null);
  });

  // -------- Closing --------
  const end = pptx.addSlide();
  end.background = { color: NAVY };
  rect(end, ctx, { x: 0, y: 3.2, w: PAGEW, h: 0.06, fill: ORANGE, fullWidth: true });
  txt(end, ctx, content.labels.closing, {
    x: 0.6, y: 2.2, w: 12, h: 0.9, font: "heading", size: 30, bold: true, color: WHITE, align: "center",
  });
  txt(end, ctx, BRAND.website, {
    x: 0.6, y: 3.5, w: 12, h: 0.5, font: "body", size: 16, color: ORANGE, align: "center",
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
