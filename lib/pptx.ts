import PptxGenJS from "pptxgenjs";
import { BRAND } from "@/lib/brand";
import type { DeckContent } from "@/lib/openai";

const NAVY = BRAND.colors.navy;
const NAVY_LIGHT = BRAND.colors.navyLight;
const ORANGE = BRAND.colors.orange;
const CREAM = BRAND.colors.cream;
const INK = BRAND.colors.ink;
const SLATE = BRAND.colors.slate;
const WHITE = "FFFFFF";
const SERIF = BRAND.fonts.heading;

export type DeckImages = {
  cover: Buffer | null;
  applicant: Buffer | null;
  spouse: Buffer | null;
  children: (Buffer | null)[];
};

function dataUri(buf: Buffer | null): string | null {
  return buf ? `data:image/png;base64,${buf.toString("base64")}` : null;
}

// Small wordmark drawn with native shapes/text (top-right of content slides).
function wordmark(slide: PptxGenJS.Slide, color = WHITE) {
  slide.addText(
    [
      { text: "SUGIMOTO ", options: { bold: true } },
      { text: "VISA", options: { bold: false } },
    ],
    {
      x: 9.7,
      y: 0.18,
      w: 3.4,
      h: 0.4,
      align: "right",
      fontFace: SERIF,
      fontSize: 12,
      color,
      charSpacing: 2,
    }
  );
}

function contentHeader(slide: PptxGenJS.Slide, title: string, kicker?: string) {
  slide.background = { color: CREAM };
  // Top navy band
  slide.addShape("rect", {
    x: 0,
    y: 0,
    w: "100%",
    h: 1.15,
    fill: { color: NAVY },
    line: { type: "none" },
  });
  // Orange accent line under band
  slide.addShape("rect", {
    x: 0,
    y: 1.15,
    w: "100%",
    h: 0.06,
    fill: { color: ORANGE },
    line: { type: "none" },
  });
  if (kicker) {
    slide.addText(kicker.toUpperCase(), {
      x: 0.6,
      y: 0.2,
      w: 8,
      h: 0.3,
      fontFace: BRAND.fonts.body,
      fontSize: 11,
      color: ORANGE,
      charSpacing: 3,
    });
  }
  slide.addText(title, {
    x: 0.6,
    y: kicker ? 0.5 : 0.3,
    w: 8.8,
    h: 0.6,
    fontFace: SERIF,
    fontSize: 26,
    bold: true,
    color: WHITE,
  });
  wordmark(slide);
}

function footer(slide: PptxGenJS.Slide) {
  slide.addText(BRAND.website, {
    x: 0.6,
    y: 7.05,
    w: 6,
    h: 0.3,
    fontFace: BRAND.fonts.body,
    fontSize: 10,
    color: SLATE,
  });
  slide.addText("Prepared exclusively for our valued client", {
    x: 7,
    y: 7.05,
    w: 5.7,
    h: 0.3,
    align: "right",
    fontFace: BRAND.fonts.body,
    fontSize: 10,
    italic: true,
    color: SLATE,
  });
}

function bulletItems(items: string[]) {
  return items.map((t) => ({
    text: t,
    options: { bullet: { code: "2022", indent: 16 } },
  }));
}

// Renders a person/opportunity page: text left, image right.
function personSlide(
  pptx: PptxGenJS,
  page: { title: string; summary: string; opportunities: string[] },
  kicker: string,
  image: Buffer | null
) {
  const slide = pptx.addSlide();
  contentHeader(slide, page.title, kicker);

  const img = dataUri(image);
  const textW = img ? 6.7 : 12.1;

  slide.addText(page.summary, {
    x: 0.6,
    y: 1.5,
    w: textW,
    h: 1.4,
    fontFace: BRAND.fonts.body,
    fontSize: 14,
    color: INK,
    valign: "top",
    lineSpacingMultiple: 1.15,
  });

  slide.addText("OPPORTUNITIES", {
    x: 0.6,
    y: 3.0,
    w: textW,
    h: 0.3,
    fontFace: BRAND.fonts.body,
    fontSize: 12,
    bold: true,
    color: ORANGE,
    charSpacing: 2,
  });

  slide.addText(bulletItems(page.opportunities), {
    x: 0.6,
    y: 3.35,
    w: textW,
    h: 3.3,
    fontFace: BRAND.fonts.body,
    fontSize: 13.5,
    color: INK,
    valign: "top",
    lineSpacingMultiple: 1.2,
  });

  if (img) {
    // Image card on the right.
    slide.addShape("rect", {
      x: 7.5,
      y: 1.5,
      w: 5.2,
      h: 5.1,
      fill: { color: WHITE },
      line: { color: BRAND.colors.orange, width: 0 },
      shadow: { type: "outer", color: "999999", blur: 6, offset: 2, angle: 90, opacity: 0.3 },
    });
    slide.addImage({
      data: img,
      x: 7.6,
      y: 1.6,
      w: 5.0,
      h: 4.9,
      sizing: { type: "cover", w: 5.0, h: 4.9 },
    });
  }

  footer(slide);
  return slide;
}

export async function buildDeck(
  content: DeckContent,
  images: DeckImages
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.333 x 7.5 in
  pptx.author = BRAND.name;
  pptx.company = BRAND.name;

  // -------- Cover --------
  const cover = pptx.addSlide();
  cover.background = { color: NAVY };
  const coverImg = dataUri(images.cover);
  if (coverImg) {
    slideCoverImage(cover, coverImg);
  }
  // Flame accent block + wordmark
  cover.addShape("rect", {
    x: 0.6,
    y: 0.6,
    w: 0.12,
    h: 0.55,
    fill: { color: ORANGE },
    line: { type: "none" },
  });
  cover.addText(
    [
      { text: "SUGIMOTO ", options: { bold: true } },
      { text: "VISA", options: {} },
    ],
    {
      x: 0.85,
      y: 0.6,
      w: 6,
      h: 0.55,
      fontFace: SERIF,
      fontSize: 20,
      color: WHITE,
      charSpacing: 3,
      valign: "middle",
    }
  );

  cover.addText(content.headline, {
    x: 0.6,
    y: 2.6,
    w: coverImg ? 7.2 : 12,
    h: 1.8,
    fontFace: SERIF,
    fontSize: 40,
    bold: true,
    color: WHITE,
    valign: "top",
    lineSpacingMultiple: 1.0,
  });
  cover.addText(content.subhead, {
    x: 0.6,
    y: 4.5,
    w: coverImg ? 7.0 : 11,
    h: 1.2,
    fontFace: BRAND.fonts.body,
    fontSize: 16,
    color: "D7DCE6",
    valign: "top",
    lineSpacingMultiple: 1.2,
  });
  cover.addText(BRAND.website, {
    x: 0.6,
    y: 6.9,
    w: 6,
    h: 0.3,
    fontFace: BRAND.fonts.body,
    fontSize: 11,
    color: ORANGE,
  });

  // -------- Overview --------
  const ov = pptx.addSlide();
  contentHeader(ov, content.overview.title || "Your Pathway Overview", "Pathway Overview");
  let y = 1.5;
  for (const prog of content.overview.programs || []) {
    ov.addText(prog.name, {
      x: 0.6,
      y,
      w: 7.4,
      h: 0.4,
      fontFace: SERIF,
      fontSize: 16,
      bold: true,
      color: NAVY,
    });
    y += 0.45;
    if (prog.summary) {
      ov.addText(prog.summary, {
        x: 0.6,
        y,
        w: 7.4,
        h: 0.6,
        fontFace: BRAND.fonts.body,
        fontSize: 12,
        color: INK,
        valign: "top",
        lineSpacingMultiple: 1.1,
      });
      y += 0.7;
    }
    if (prog.keyPoints?.length) {
      ov.addText(bulletItems(prog.keyPoints), {
        x: 0.7,
        y,
        w: 7.3,
        h: 0.25 * prog.keyPoints.length + 0.2,
        fontFace: BRAND.fonts.body,
        fontSize: 12,
        color: INK,
        valign: "top",
        lineSpacingMultiple: 1.1,
      });
      y += 0.28 * prog.keyPoints.length + 0.25;
    }
    y += 0.15;
  }

  // Why destination — right column card
  ov.addShape("rect", {
    x: 8.4,
    y: 1.5,
    w: 4.3,
    h: 5.1,
    fill: { color: WHITE },
    line: { color: BRAND.colors.border, width: 1 },
  });
  ov.addText("WHY THIS DESTINATION", {
    x: 8.7,
    y: 1.7,
    w: 3.8,
    h: 0.3,
    fontFace: BRAND.fonts.body,
    fontSize: 12,
    bold: true,
    color: ORANGE,
    charSpacing: 2,
  });
  ov.addText(bulletItems(content.overview.whyDestination || []), {
    x: 8.7,
    y: 2.1,
    w: 3.8,
    h: 4.3,
    fontFace: BRAND.fonts.body,
    fontSize: 12.5,
    color: INK,
    valign: "top",
    lineSpacingMultiple: 1.2,
  });
  footer(ov);

  // -------- People --------
  personSlide(pptx, content.applicant, "Main Applicant", images.applicant);
  if (content.spouse) {
    personSlide(pptx, content.spouse, "Partner / Spouse", images.spouse);
  }
  (content.children || []).forEach((child, i) => {
    personSlide(
      pptx,
      child,
      child.name ? `For ${child.name}` : `Child ${i + 1}`,
      images.children[i] ?? null
    );
  });

  // -------- Closing --------
  const end = pptx.addSlide();
  end.background = { color: NAVY };
  end.addShape("rect", {
    x: 0,
    y: 3.2,
    w: "100%",
    h: 0.06,
    fill: { color: ORANGE },
    line: { type: "none" },
  });
  end.addText("Let's build your future together.", {
    x: 0.6,
    y: 2.2,
    w: 12,
    h: 0.9,
    align: "center",
    fontFace: SERIF,
    fontSize: 30,
    bold: true,
    color: WHITE,
  });
  end.addText(BRAND.website, {
    x: 0.6,
    y: 3.5,
    w: 12,
    h: 0.5,
    align: "center",
    fontFace: BRAND.fonts.body,
    fontSize: 16,
    color: ORANGE,
  });

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}

// Cover image: right-side full-height band with a navy gradient scrim on the left edge.
function slideCoverImage(slide: PptxGenJS.Slide, img: string) {
  slide.addImage({
    data: img,
    x: 7.8,
    y: 0,
    w: 5.53,
    h: 7.5,
    sizing: { type: "cover", w: 5.53, h: 7.5 },
  });
  // Navy scrim to blend the image edge into the cover.
  slide.addShape("rect", {
    x: 7.0,
    y: 0,
    w: 1.4,
    h: 7.5,
    fill: { color: NAVY, transparency: 30 },
    line: { type: "none" },
  });
}
