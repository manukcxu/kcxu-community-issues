import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Use AI to research Santa Clara County issues
    const researchPrompt = `You are a community journalist covering Santa Clara County, California. 
    Research and compile the top 10 most pressing current community issues, news, and topics that Santa Clara County residents should be aware of right now.
    
    For each issue provide:
    1. A clear, concise title
    2. Why it matters to residents
    3. Current status or recent developments
    4. Any upcoming community meetings, votes, or deadlines
    
    Categories to cover: housing & homelessness, public safety, transportation, schools & education, environmental concerns, local government & policy, public health, economic development, infrastructure, and community services.
    
    Format as a numbered ranked list from most to least urgent. Be specific with facts, dates, and local context.`;

    const researchResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: researchPrompt,
      add_context_from_internet: true,
      model: 'gemini_3_1_pro'
    });

    const content = typeof researchResult === 'string' ? researchResult : JSON.stringify(researchResult);
    const today = new Date().toISOString().split('T')[0];

    // Save report to database
    const report = await base44.asServiceRole.entities.WeeklyResearchReport.create({
      generated_date: today,
      content: content,
      email_sent: false,
      seeded_to_issues: false
    });

    // Send email to weeklyissues@kcxu.live
    const emailBody = `
<!DOCTYPE html>
<html>
<head><style>
  body { font-family: Arial, sans-serif; background: #2D2D2D; color: #ffffff; margin: 0; padding: 20px; }
  .header { background: #F5C200; padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 24px; }
  .header h1 { color: #2D2D2D; margin: 0; font-size: 24px; }
  .content { background: #1a1a1a; padding: 24px; border-radius: 12px; line-height: 1.7; white-space: pre-wrap; }
  .footer { text-align: center; color: #666; font-size: 12px; margin-top: 20px; }
</style></head>
<body>
  <div class="header">
    <h1>KCXU 92.7 FM — Weekly Community Issues Report</h1>
    <p style="color:#2D2D2D;margin:4px 0 0">Santa Clara County · ${today}</p>
  </div>
  <div class="content">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
  <div class="footer">
    <p>KCXU 92.7 FM · 749 Story Road, Ste. 10, San Jose, CA 95122</p>
    <p>This report is auto-generated every Monday at 8 AM PT</p>
  </div>
</body>
</html>`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'weeklyissues@kcxu.live',
      subject: `KCXU Weekly Community Issues — Santa Clara County — ${today}`,
      body: emailBody,
      from_name: 'KCXU 92.7 FM Research'
    });

    // Update report as emailed
    await base44.asServiceRole.entities.WeeklyResearchReport.update(report.id, {
      email_sent: true,
      email_sent_at: new Date().toISOString()
    });

    return Response.json({ success: true, report_id: report.id, content_length: content.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});