import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  const expectedToken = Deno.env.get("VAPI_BEARER_TOKEN");

  if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const message = payload?.message;
    const transcript = message?.transcript || message?.artifact?.transcript || "";
    const callerName = message?.customer?.name || message?.call?.customer?.name || "";
    const callerPhone = message?.customer?.number || message?.call?.customer?.number || "";

    if (transcript) {
      const pinned = await base44.asServiceRole.entities.CommunityIssue.filter({ is_pinned: true }, "pin_rank", 1);
      const topTopic = pinned[0]?.title || "general community concerns";

      const extraction = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `A caller phoned KCXU Connect to discuss "${topTopic}". Here is the call transcript:\n\n${transcript}\n\nExtract the caller's name (if not already known: "${callerName}") and a concise summary of their opinion.`,
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            opinion_summary: { type: "string" }
          },
          required: ["opinion_summary"]
        }
      });

      if (extraction?.opinion_summary) {
        await base44.asServiceRole.entities.CommunityIssue.create({
          title: topTopic,
          description: extraction.opinion_summary,
          submitter_name: extraction.name || callerName || "Anonymous Caller",
          submitter_phone: callerPhone || "unknown",
          status: "pending"
        });
      }
    }

    return Response.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});