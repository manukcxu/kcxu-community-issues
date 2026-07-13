import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const FALLBACK_TOPIC = "the top issues facing Santa Clara County this week";
const GREETING = "Hi! Welcome to KCXU Connect. Thanks for calling in to share your voice. May I have your name please?";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const apiKey = Deno.env.get("RetellAiIncomingPhoneCall");
    if (!apiKey) {
      return Response.json({ error: "Missing Retell AI credentials" }, { status: 500 });
    }

    const pinned = await base44.entities.CommunityIssue.filter(
      { status: 'approved', is_pinned: true },
      'pin_rank',
      1
    );
    const weeklyTopic = pinned.length > 0 ? pinned[0].title : FALLBACK_TOPIC;

    const generalPrompt = `You are a friendly phone assistant for KCXU Connect, a community voice platform for Santa Clara County residents to share opinions on local civic issues.

After the caller shares their name, say warmly: "Thanks, [caller_name]. I've got that."

Then ask: "This week we're hearing from community members about ${weeklyTopic}. What's your opinion on this?"

Rules: Listen without interrupting. Keep prompts warm and brief. Don't interrupt the caller while they share their opinion. Once they finish, acknowledge their perspective: "Thanks for sharing that, [caller_name]."

After acknowledging, close the call with: "Your voice matters. We may feature your comments on our broadcast. Thank you for calling KCXU Connect."

Tone: Warm, welcoming, encouraging, neutral.`;

    const llmRes = await fetch("https://api.retellai.com/create-retell-llm", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        general_prompt: generalPrompt,
        begin_message: GREETING
      })
    });
    const llmData = await llmRes.json();
    if (!llmRes.ok) {
      return Response.json({ error: "Failed to create Retell LLM", details: llmData }, { status: 500 });
    }

    const agentRes = await fetch("https://api.retellai.com/create-agent", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        agent_name: "KCXU Connect Phone Assistant",
        voice_id: "11labs-Adrian",
        response_engine: { type: "retell-llm", llm_id: llmData.llm_id }
      })
    });
    const agentData = await agentRes.json();
    if (!agentRes.ok) {
      return Response.json({ error: "Failed to create Retell agent", details: agentData }, { status: 500 });
    }

    const existingSetting = await base44.entities.AppSettings.filter({ key: 'retell_agent_id' });
    if (existingSetting.length > 0) {
      await base44.entities.AppSettings.update(existingSetting[0].id, { value: agentData.agent_id });
    } else {
      await base44.entities.AppSettings.create({ key: 'retell_agent_id', value: agentData.agent_id, description: 'Retell AI agent ID for the KCXU Connect phone assistant' });
    }

    return Response.json({ success: true, agent_id: agentData.agent_id, llm_id: llmData.llm_id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});