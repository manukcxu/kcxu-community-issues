import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- System checks (dry run: no audio is pushed to Radio.co) ---
    const radioPassword = Deno.env.get('RADIO_CO_PASSWORD');
    const heygenKey = Deno.env.get('HEYGEN_API_KEY');
    const checks = {
      radio_co_credentials: !!radioPassword,
      radio_co_host: 's5af3914a4.dj.radio.co:80',
      heygen_api_key: !!heygenKey,
      heygen_reachable: false
    };

    if (heygenKey) {
      const tokenRes = await fetch('https://api.heygen.com/v1/streaming.create_token', {
        method: 'POST',
        headers: { 'x-api-key': heygenKey, 'Content-Type': 'application/json' }
      });
      checks.heygen_reachable = tokenRes.ok;
    }

    // --- Build the show script from the top community issues ---
    const issues = await base44.asServiceRole.entities.CommunityIssue.filter({ status: 'approved' }, '-vote_count', 5);
    const issueList = issues.map((i, n) => `${n + 1}. ${i.title} — ${i.description} (${i.vote_count || 0} votes)`).join('\n');

    const script = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the AI radio host of KCXU 92.7 FM, a community radio station serving Santa Clara County, California. Write a complete 5-minute run-of-show script for a live test broadcast. Include: a warm station-branded intro, a rundown of the following top community issues with brief engaging commentary on each, a reminder that listeners can call in live at 408.506.1772 on Tuesdays and Fridays, and a sign-off. Keep it natural and conversational, timed to about 5 minutes of speech.\n\nTop community issues:\n${issueList || 'No issues submitted yet — improvise a general community-welcome segment.'}`
    });

    const today = new Date().toISOString().split('T')[0];
    const recording = await base44.asServiceRole.entities.BroadcastRecording.create({
      title: `Test Broadcast (Dry Run) — ${today} @ 5:55 PM PT`,
      date: today,
      duration_minutes: 5,
      time_slot: 'evening',
      notes: `DRY RUN — no audio was sent to Radio.co.\n\nSystem checks: ${JSON.stringify(checks, null, 2)}\n\n--- GENERATED SHOW SCRIPT ---\n\n${script}`
    });

    return Response.json({ success: true, checks, recording_id: recording.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});