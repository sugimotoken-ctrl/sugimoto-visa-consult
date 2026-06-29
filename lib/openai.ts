import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;
const TEXT_MODEL = process.env.OPENAI_TEXT_MODEL || "gpt-4o";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export function getOpenAI() {
  if (!apiKey || apiKey.startsWith("sk-...")) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your environment to generate presentations."
    );
  }
  return new OpenAI({ apiKey });
}

// Images may use a dedicated key; fall back to the main key when not set.
function getOpenAIForImages() {
  const imageKey = process.env.OPENAI_IMAGE_API_KEY;
  if (imageKey && !imageKey.startsWith("sk-...")) {
    return new OpenAI({ apiKey: imageKey });
  }
  return getOpenAI();
}

// ---------- Types describing the generated deck content ----------
export type PersonPage = {
  title: string;
  summary: string; // 2-3 sentence intro paragraph
  opportunities: string[]; // 4-6 concise bullet points
  imagePrompt: string; // prompt for the page image
};

// Localized labels for the deck's fixed chrome (headings/footers).
export type DeckLabels = {
  pathwayOverview: string;
  whyDestination: string;
  opportunities: string;
  mainApplicant: string;
  partnerSpouse: string;
  forPrefix: string; // e.g. "For" → "For Daniel"
  child: string; // fallback when a child has no name
  preparedFor: string; // footer note
  closing: string; // closing slide line
};

export type DeckContent = {
  headline: string; // cover headline
  subhead: string; // cover subhead
  coverImagePrompt: string;
  labels: DeckLabels;
  overview: {
    title: string;
    programs: { name: string; summary: string; keyPoints: string[] }[];
    whyDestination: string[]; // bullets about the country/city
  };
  applicant: PersonPage;
  spouse: PersonPage | null;
  children: (PersonPage & { name: string })[];
};

// English fallbacks if the model omits a label.
export const DEFAULT_LABELS: DeckLabels = {
  pathwayOverview: "PATHWAY OVERVIEW",
  whyDestination: "WHY THIS DESTINATION",
  opportunities: "OPPORTUNITIES",
  mainApplicant: "MAIN APPLICANT",
  partnerSpouse: "PARTNER / SPOUSE",
  forPrefix: "For",
  child: "Child",
  preparedFor: "Prepared exclusively for our valued client",
  closing: "Let's build your future together.",
};

type PersonInput = {
  role: string;
  name: string;
  age: number | null;
  background: string | null;
};

export type DeckInput = {
  country: string;
  city: string | null;
  language: string; // target language for all written content, e.g. "Persian (Farsi)"
  programs: {
    name: string;
    description: string | null;
    requirements: string | null;
    talking_points: string | null;
  }[];
  applicant: PersonInput;
  spouse: PersonInput | null;
  children: PersonInput[];
};

const SYSTEM_PROMPT = `You are a senior immigration consultant at Sugimoto Visa writing a polished, encouraging client-facing presentation after a consultation.
Write in a warm, professional, confident tone. Be specific and realistic — never invent program rules; rely on the provided program notes and general, well-established facts about the destination.
For each person, focus on concrete opportunities tailored to THEIR background (career prospects, recognition of qualifications, study/school options for children, lifestyle and community).
Image prompts are the ONLY field that must always be written in English (they are sent to an image model); everything else must be in the requested target language.
Image prompts must describe tasteful, photorealistic, optimistic editorial photography (no text, no logos, no collages, real-looking people or scenery relevant to the destination and the person's situation).
Return ONLY valid JSON matching the requested schema.`;

function buildUserPrompt(input: DeckInput): string {
  const place = input.city ? `${input.city}, ${input.country}` : input.country;
  const programs = input.programs
    .map(
      (p, i) =>
        `Program ${i + 1}: ${p.name}\n  Description: ${p.description || "n/a"}\n  Requirements: ${p.requirements || "n/a"}\n  Talking points: ${p.talking_points || "n/a"}`
    )
    .join("\n");

  const person = (p: PersonInput | null) =>
    p
      ? `- ${p.role}: ${p.name}${p.age != null ? `, age ${p.age}` : ""}. Background: ${p.background || "not provided"}`
      : null;

  const people = [
    person(input.applicant),
    person(input.spouse),
    ...input.children.map(person),
  ]
    .filter(Boolean)
    .join("\n");

  return `TARGET LANGUAGE: ${input.language}
Write EVERY piece of text in ${input.language}, EXCEPT the "imagePrompt" fields which must stay in English. This includes headline, subhead, all titles, summaries, bullet points, AND the "labels" object.

Destination: ${place}

Programs discussed:
${programs}

Family:
${people}

Produce a JSON object with this exact shape:
{
  "headline": string,                // cover title, e.g. the ${input.language} equivalent of "Your Future in ${place}"
  "subhead": string,                 // one inspiring sentence
  "coverImagePrompt": string,        // ENGLISH
  "labels": {                        // fixed UI labels, translated into ${input.language}
    "pathwayOverview": string,       // e.g. "PATHWAY OVERVIEW"
    "whyDestination": string,        // e.g. "WHY THIS DESTINATION"
    "opportunities": string,         // e.g. "OPPORTUNITIES"
    "mainApplicant": string,         // e.g. "MAIN APPLICANT"
    "partnerSpouse": string,         // e.g. "PARTNER / SPOUSE"
    "forPrefix": string,             // e.g. "For" (used as "For <child name>")
    "child": string,                 // e.g. "Child"
    "preparedFor": string,           // e.g. "Prepared exclusively for our valued client"
    "closing": string                // e.g. "Let's build your future together."
  },
  "overview": {
    "title": string,
    "programs": [ { "name": string, "summary": string, "keyPoints": string[] } ],
    "whyDestination": string[]       // 4-6 bullets on opportunities/quality of life in ${place}
  },
  "applicant": { "title": string, "summary": string, "opportunities": string[], "imagePrompt": string },
  "spouse": { "title": string, "summary": string, "opportunities": string[], "imagePrompt": string } | null,
  "children": [ { "name": string, "title": string, "summary": string, "opportunities": string[], "imagePrompt": string } ]
}

Rules:
- "opportunities" arrays: 4-6 short, specific bullet points each.
- If there is no spouse provided, set "spouse" to null.
- Make one children entry per child provided (empty array if none). For children, emphasize schooling, education quality, language, activities, and a bright future.
- Keep program "name" values recognizable (you may keep the official program name and add a ${input.language} gloss if helpful).
- Child "name" values are the people's actual names — keep them as given, do not translate names.
- Tailor everything to each person's stated background and to ${place}.`;
}

export async function generateDeckContent(
  input: DeckInput
): Promise<DeckContent> {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: TEXT_MODEL,
    temperature: 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(input) },
    ],
  });
  const raw = completion.choices[0]?.message?.content || "{}";
  const content = JSON.parse(raw) as DeckContent;
  // Fill any missing labels with English defaults so the deck never has blanks.
  content.labels = { ...DEFAULT_LABELS, ...(content.labels ?? {}) };
  return content;
}

// Returns a PNG image buffer for the given prompt, or null on failure.
export async function generateImage(prompt: string): Promise<Buffer | null> {
  try {
    const client = getOpenAIForImages();
    const result = await client.images.generate({
      model: IMAGE_MODEL,
      prompt,
      size: "1024x1024",
      n: 1,
    });
    const b64 = result.data?.[0]?.b64_json;
    if (!b64) return null;
    return Buffer.from(b64, "base64");
  } catch (e) {
    console.error("Image generation failed:", e);
    return null; // Deck still builds without the image.
  }
}
