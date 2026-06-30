import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import {
  generateDeckContent,
  generateImage,
  type DeckInput,
} from "@/lib/openai";
import { buildDeck, type DeckImages } from "@/lib/pptx";

export const runtime = "nodejs";
export const maxDuration = 300; // deck generation can take a couple of minutes

export async function POST(req: Request) {
  const profile = await getProfile();
  if (!profile || profile.status !== "active") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let consultationId: string;
  try {
    const body = await req.json();
    consultationId = String(body.consultationId || "");
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!consultationId) {
    return NextResponse.json(
      { error: "consultationId is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // Load the consultation (RLS scopes to owner / admin).
  const { data: c, error: loadErr } = await supabase
    .from("consultations")
    .select(
      `*,
       countries(name),
       cities(name),
       languages(name, rtl),
       p1:pathways!consultations_pathway_id_1_fkey(name, description, requirements, talking_points, prompt),
       p2:pathways!consultations_pathway_id_2_fkey(name, description, requirements, talking_points, prompt),
       children(id, name, age, background, sort_order)`
    )
    .eq("id", consultationId)
    .single();

  if (loadErr || !c) {
    return NextResponse.json(
      { error: "Consultation not found." },
      { status: 404 }
    );
  }

  // Mark as generating.
  await supabase
    .from("consultations")
    .update({ deck_status: "generating", deck_error: null })
    .eq("id", consultationId);

  try {
    const kids = (c.children ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order
    );

    const programs = [c.p1, c.p2].filter(Boolean) as any[];
    if (programs.length === 0) {
      throw new Error("Select at least one program before generating.");
    }

    const language = c.languages?.name || "English";
    const rtl = Boolean(c.languages?.rtl);

    const input: DeckInput = {
      country: c.countries?.name || "the destination country",
      city: c.cities?.name || null,
      language,
      programs: programs.map((p) => ({
        name: p.name,
        description: p.description,
        requirements: p.requirements,
        talking_points: p.talking_points,
        prompt: p.prompt,
      })),
      applicant: {
        role: "Main applicant",
        name: c.applicant_name,
        age: c.applicant_age,
        background: c.applicant_background,
      },
      spouse: c.spouse_name
        ? {
            role: "Spouse",
            name: c.spouse_name,
            age: c.spouse_age,
            background: c.spouse_background,
          }
        : null,
      children: kids.map((k: any) => ({
        role: "Child",
        name: k.name,
        age: k.age,
        background: k.background,
      })),
    };

    // 1) Write the slide copy.
    const content = await generateDeckContent(input);

    // 2) Generate imagery in parallel.
    const [coverImg, applicantImg, spouseImg, ...childImgs] = await Promise.all([
      generateImage(content.coverImagePrompt),
      generateImage(content.applicant.imagePrompt),
      content.spouse
        ? generateImage(content.spouse.imagePrompt)
        : Promise.resolve(null),
      ...(content.children || []).map((ch) => generateImage(ch.imagePrompt)),
    ]);

    const images: DeckImages = {
      cover: coverImg,
      applicant: applicantImg,
      spouse: spouseImg,
      children: childImgs,
    };

    // 3) Build the .pptx (mirrored layout + script fonts for RTL languages).
    const buffer = await buildDeck(content, images, rtl);

    // 4) Upload via service role (private bucket).
    const admin = createAdminClient();
    const safeName = (c.applicant_name || "client")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const path = `${consultationId}/${safeName}-${Date.now()}.pptx`;

    const { error: upErr } = await admin.storage
      .from("decks")
      .upload(path, buffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        upsert: true,
      });
    if (upErr) throw new Error(`Upload failed: ${upErr.message}`);

    // 5) Long-lived signed URL for download.
    const { data: signed, error: signErr } = await admin.storage
      .from("decks")
      .createSignedUrl(path, 60 * 60 * 24 * 365);
    if (signErr || !signed) throw new Error("Could not create download link.");

    await supabase
      .from("consultations")
      .update({
        deck_status: "ready",
        deck_url: signed.signedUrl,
        deck_error: null,
      })
      .eq("id", consultationId);

    return NextResponse.json({ ok: true, url: signed.signedUrl });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed.";
    await supabase
      .from("consultations")
      .update({ deck_status: "error", deck_error: message })
      .eq("id", consultationId);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
