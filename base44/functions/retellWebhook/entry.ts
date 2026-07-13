import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const FALLBACK_TOPIC = "the top issues facing Santa Clara County this week";

Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get("RetellAiIncomingPhoneCall");
    if (!apiKey) {
      return Response.json({ error: "Missing Retell AI credentials" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-retell-signature");
    if (!signature) {
      return Response.json({ error: "Missing signature" }, { status: 401 });
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(apiKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
    const computedSignature = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedSignature !== signature) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const payload = JSON.parse(rawBody);
    const eventType = payload.event;
    const call = payload.call;

    const base44 = createClientFromRequest(req);

    if ((eventType === "call_ended" || eventType === "call_analyzed") && call?.transcript) {
      const pinned = await base44.asServiceRole.entities.CommunityIssue.filter(
        { status: 'approved', is_pinned: true },
        'pin_rank',
        1
      );
      const weeklyTopic = pinned.length > 0 ? pinned[0].title : FALLBACK_TOPIC;

      const extracted = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `This is a transcript of a phone call to KCXU Connect, a community radio call-in line where residents share opinions on local civic issues. Extract the caller's name and a summary of their opinion from the transcript below. If a name or opinion cannot be found, use an empty string.\n\nTranscript:\n${call.transcript}`,
        response_json_schema: {
          type: "object",
          properties: {
            caller_name: { type: "string" },
            opinion_summary: { type: "string" }
          },
          required: ["caller_name", "opinion_summary"]
        }
      });

      if (extracted.opinion_summary) {
        await base44.asServiceRole.entities.CommunityIssue.create({
          title: weeklyTopic,
          description: extracted.opinion_summary,
          submitter_name: extracted.caller_name || "Anonymous Caller",
          submitter_phone: call.from_number || "",
        });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});