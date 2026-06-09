import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Marketing-site AI chat. Public endpoint, no auth. Uses Claude with
 * prompt caching on the long system prompt (Advaspire knowledge base) so
 * each follow-up turn is cheap.
 *
 * Body: { messages: [{ role: 'user' | 'assistant', content: string }] }
 * Returns: { reply: string }
 */

const ADVASPIRE_KNOWLEDGE = `
You are the Advaspire Robotics & Coding Academy AI assistant on the public
marketing website. You speak to PARENTS and PROSPECTIVE STUDENTS who want
to learn about our programs.

# About Advaspire

Advaspire Robotics & Coding Academy teaches project-based robotics and
coding to kids aged 7–18 in Malaysia. Founded 2018. Branches:
- Semenyih, Selangor (HQ)
- Kepong, Kuala Lumpur

# Phone & WhatsApp
+60 17-318 0089
WhatsApp link: https://wa.me/60173180089

# Four tracks (kids can pick or rotate)

1. Robotics — LEGO Spike, Arduino, sensors, 3D parts. Hands-on building
   and programming physical robots.
2. Game Coding — Scratch (younger), Unity (older), Roblox Studio,
   C# basics. Kids ship playable games each term.
3. App Coding — Flutter / Dart, UI/UX, Firebase. Real mobile apps that
   run on the parent's phone.
4. Data Coding & AI — Python, Pandas, ML basics, AI agents. Trains
   simple models, makes robots decide on their own.

# Three age tiers

- Apprentice (7–10) — Scratch, LEGO Spike, Micro:bit. Drag-and-drop +
  finished things to take home.
- Craftsman (11–14) — Python, JavaScript, Arduino, Unity. First
  published game, first deployable app.
- Expertise (15–18) — AI agents, full-stack apps, competition robotics.
  Portfolio-grade work for STEM scholarships.

# Pricing (MYR)

- Monthly: RM 180 / 4 sessions
- Quarterly: RM 480 / 12 sessions (save RM 60)
- Semi-annual: RM 900 / 24 sessions (save up to RM 180, free
  completion certificate)
All packages include: 1.5h classes, project materials, parent portal
access, weekly progress + project photos.

# Free trial

- 100% free, 90-minute session
- Real tools, real project — kid takes something home
- Parents welcome to observe
- No credit card / payment needed
- We follow up only if invited
- Book via the "Book a free trial class" button on the page, or
  WhatsApp +60 17-318 0089.

# Style guide for your responses

- Concise. 2–4 short paragraphs MAX unless the user explicitly asks
  for a detailed breakdown.
- Friendly + parent-facing. Avoid jargon when explaining tools.
- When asked something you don't know (specific instructor names,
  exact branch addresses, real-time class availability), say so and
  point the user to WhatsApp +60 17-318 0089.
- Always nudge toward the free trial when the parent shows interest.
- Never invent prices or commitments. Never quote curriculum we don't
  offer. Stick to what's documented above.
- Do not promise specific outcomes (e.g. "your child will get into
  MIT"). Speak about portfolio quality, skills gained.
- If asked to do something unrelated (e.g. "write me a poem", "what's
  the weather"), politely redirect to Advaspire questions.

When you don't know, escalate to WhatsApp. Don't make things up.
`.trim();

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          reply:
            "Our AI assistant is offline right now — please ping us on WhatsApp at +60 17-318 0089 and we'll reply within an hour.",
          fallback: true,
        },
        { status: 200 },
      );
    }

    const body = (await req.json()) as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
    };
    const messages = (body.messages ?? []).filter(
      (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string",
    );
    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }
    // Cap history so we don't blow the context — last 10 turns is plenty.
    const recent = messages.slice(-10);

    const anthropic = new Anthropic({ apiKey });
    const result = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 500,
      system: [
        {
          type: "text",
          text: ADVASPIRE_KNOWLEDGE,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: recent.map((m) => ({ role: m.role, content: m.content })),
    });

    const reply = result.content
      .filter((block) => block.type === "text")
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("[marketing/chat]", err);
    return NextResponse.json(
      {
        reply:
          "Our AI hit an error. Reach us on WhatsApp at +60 17-318 0089 and a human will help.",
        fallback: true,
      },
      { status: 200 },
    );
  }
}
