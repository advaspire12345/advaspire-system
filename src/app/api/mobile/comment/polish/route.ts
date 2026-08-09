import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { authenticateMobile } from "@/lib/mobile-auth";

// Softens a teacher's attendance comment before a parent reads it. The rewrite
// runs server-side because the Anthropic key must never reach the app bundle —
// anyone can extract a string from a published build.
//
// The teacher always reviews the result before it saves; this endpoint only
// proposes wording and never writes to the database.

const MAX_INPUT_CHARS = 2000;

const SYSTEM = `You rewrite a robotics teacher's note about a student so a parent reads it as warm and encouraging.

Rules, in priority order:
1. Never change the facts. Every observation, behaviour, mistake, achievement, name, number and date in the original must survive in the rewrite. Do not soften a fact out of existence — a student who was disruptive must still read as having been disruptive.
2. Never invent. Do not add praise, context, next steps, or detail that is not in the original.
3. Change only the tone: lead with what the child did well where the original allows it, phrase difficulties as things the child is working on rather than failings, and remove any wording that sounds blunt or dismissive.
4. Keep it the same length or shorter. Never pad.
5. Write in the same language the teacher used. If the note mixes English and Malay, keep that mix.
6. Plain text only — no markdown, no bullet points, no headings, no quotation marks around the whole note.

Reply with the rewritten note and nothing else. No preamble, no explanation, no alternatives.`;

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateMobile(request);
    if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
    if (!auth.user) return NextResponse.json({ error: "Not a staff account." }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const comment = typeof body?.comment === "string" ? body.comment.trim() : "";
    const studentName = typeof body?.studentName === "string" ? body.studentName.trim() : "";

    if (!comment) return NextResponse.json({ error: "There's no comment to rewrite yet." }, { status: 400 });
    if (comment.length > MAX_INPUT_CHARS) {
      return NextResponse.json({ error: "That comment is too long to rewrite." }, { status: 400 });
    }
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "AI rewriting isn't configured on the server yet." }, { status: 503 });
    }

    const client = new Anthropic();
    // Short single-turn rewrite: low effort keeps latency down for a teacher
    // waiting on the attendance screen. max_tokens is deliberately small — the
    // output is one short paragraph and the prompt forbids padding.
    const message = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: studentName
            ? `Student: ${studentName}\n\nTeacher's note:\n${comment}`
            : `Teacher's note:\n${comment}`,
        },
      ],
    });

    if (message.stop_reason === "refusal") {
      return NextResponse.json({ error: "Couldn't rewrite that comment. Please send it in your own words." }, { status: 422 });
    }

    const polished = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("")
      .trim();

    if (!polished) {
      return NextResponse.json({ error: "The rewrite came back empty. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ polished });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "Too many rewrites at once. Try again in a moment." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("comment polish failed", err.status, err.message);
      return NextResponse.json({ error: "The rewriting service is unavailable right now." }, { status: 502 });
    }
    console.error("comment polish failed", err);
    return NextResponse.json({ error: "Couldn't rewrite that comment." }, { status: 500 });
  }
}
