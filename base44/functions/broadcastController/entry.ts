import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // --- Fetch top community issues (also used for the going-live alert) ---
    const issues = await base44.asServiceRole.entities.CommunityIssue.filter({ status: 'approved' }, '-vote_count', 5);
    const topIssue = issues[0];

    // --- Going-live alert ---
    const startedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    const liveBody = `🔴 KCXU Community Issues is NOW GOING LIVE.\n\nStarted at: ${startedAt} PT\nDuration: 5 minutes\n\nTop issue to be talked about:\n${topIssue ? `"${topIssue.title}" — ${topIssue.description} (${topIssue.vote_count || 0} votes)` : 'No approved issues yet — general community-welcome segment.'}\n\nYou will receive another alert when the broadcast completes.`;
    for (const recipient of ['dj@kcxu.live', user.email]) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: recipient,
          from_name: 'KCXU Community Issues — Live Broadcast',
          subject: '🔴 GOING LIVE: KCXU Community Issues Broadcast',
          body: liveBody
        });
      } catch (e) {
        console.warn(`Could not send going-live alert to ${recipient}: ${e.message}`);
      }
    }

    // --- Build the show script from the top community issues ---
    const issueList = issues.map((i, n) => `${n + 1}. ${i.title} — ${i.description} (${i.vote_count || 0} votes)`).join('\n');

    const script = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the AI radio host of KCXU 92.7 FM, a community radio station serving Santa Clara County, California. Write a complete 5-minute spoken script for a live broadcast. Include: a warm station-branded intro, a rundown of the following top community issues with brief engaging commentary on each, a reminder that listeners can call in live at 408.506.1772 on Tuesdays and Fridays, and a sign-off. Keep it natural and conversational. IMPORTANT: output ONLY the words to be spoken (no stage directions, headers, or timestamps) and keep the total length UNDER 4500 characters.\n\nTop community issues:\n${issueList || 'No issues submitted yet — improvise a general community-welcome segment.'}`
    });

    // --- Generate the broadcast audio (TTS) ---
    const speechText = String(script).slice(0, 4900);
    const { url: audioUrl } = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text: speechText,
      voice: 'storm',
      language_code: 'en'
    });

    // --- Push the audio live to Radio.co (Icecast source connection, per Radio.co live broadcasting docs) ---
    const radioPassword = Deno.env.get('RADIO_CO_PASSWORD');
    const broadcastStatus = { attempted: false, connected: false, detail: '' };

    if (!radioPassword) {
      broadcastStatus.detail = 'RADIO_CO_PASSWORD is missing — audio was NOT sent to Radio.co.';
    } else {
      broadcastStatus.attempted = true;
      const audioRes = await fetch(audioUrl);
      const audioBytes = new Uint8Array(await audioRes.arrayBuffer());
      try {
        const streamRes = await fetch('http://s5af3914a4.dj.radio.co:80/', {
          method: 'PUT',
          headers: {
            'Authorization': 'Basic ' + btoa('source:' + radioPassword),
            'Content-Type': 'audio/mpeg',
            'Ice-Name': 'KCXU Community Issues — Live',
            'Ice-Public': '0',
            'Expect': '100-continue'
          },
          body: audioBytes
        });
        broadcastStatus.connected = streamRes.ok;
        broadcastStatus.detail = broadcastStatus.connected
          ? 'Audio pushed to the Radio.co live mount successfully.'
          : `Radio.co rejected the source connection (HTTP ${streamRes.status}). Check the stream password in your Radio.co broadcast settings.`;
      } catch (e) {
        broadcastStatus.detail = `Could not connect to the Radio.co live mount: ${e.message}`;
      }
    }

    const today = new Date().toISOString().split('T')[0];
    const recording = await base44.asServiceRole.entities.BroadcastRecording.create({
      title: `Live Broadcast — ${today}`,
      date: today,
      duration_minutes: 5,
      time_slot: 'evening',
      drive_file_url: audioUrl,
      notes: `LIVE BROADCAST\n\nBroadcast status: ${JSON.stringify(broadcastStatus, null, 2)}\n\nAudio file: ${audioUrl}\n\n--- SHOW SCRIPT ---\n\n${speechText}`
    });

    // --- Completion alert ---
    const endedAt = new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: user.email,
      from_name: 'KCXU Broadcast Alerts',
      subject: broadcastStatus.connected ? '✅ KCXU Live Broadcast COMPLETED' : '⚠️ KCXU Live Broadcast finished with issues',
      body: `The live broadcast run finished at ${endedAt} PT.\n\nRadio.co live connection: ${broadcastStatus.connected ? 'CONNECTED — audio was sent live on air' : 'NOT CONNECTED'}\nDetails: ${broadcastStatus.detail}\n\nThe show audio and script are saved in your admin dashboard under Recordings.\nAudio file: ${audioUrl}`
    });

    return Response.json({ success: true, broadcast: broadcastStatus, recording_id: recording.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});