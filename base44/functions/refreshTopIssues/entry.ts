import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Research the current top 3 Santa Clara County issues from the web
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a community journalist covering Santa Clara County, California. Research current local news and identify the TOP 3 most pressing community issues affecting Santa Clara County residents RIGHT NOW. Rank them from most to least urgent. For each issue give a clear concise title (under 12 words) and a 1-2 sentence description explaining why it matters to residents, with specific current facts.`,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro',
      response_json_schema: {
        type: 'object',
        properties: {
          issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          }
        }
      }
    });

    const newIssues = (result.issues || []).slice(0, 3);
    if (newIssues.length === 0) {
      return Response.json({ error: 'Research returned no issues' }, { status: 500 });
    }

    // Unpin the previously pinned issues
    const pinned = await base44.asServiceRole.entities.CommunityIssue.filter({ is_pinned: true });
    for (const issue of pinned) {
      await base44.asServiceRole.entities.CommunityIssue.update(issue.id, { is_pinned: false });
    }

    // Create the new top 3 as pinned, approved issues
    const created = [];
    for (let i = 0; i < newIssues.length; i++) {
      const rec = await base44.asServiceRole.entities.CommunityIssue.create({
        title: newIssues[i].title,
        description: newIssues[i].description,
        submitter_name: 'KCXU Research Desk',
        submitter_phone: 'auto',
        submitter_language: 'en',
        status: 'approved',
        is_pinned: true,
        pin_rank: i + 1,
        submitted_by_admin: true,
        vote_count: 0
      });
      created.push(rec.id);
    }

    return Response.json({ success: true, unpinned: pinned.length, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});