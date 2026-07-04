Deno.serve(async (req) => {
  try {
    const apiKey = Deno.env.get('HEYGEN_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'HEYGEN_API_KEY is not configured' }, { status: 500 });
    }
    const res = await fetch('https://api.heygen.com/v1/streaming.create_token', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' }
    });
    const data = await res.json();
    if (!res.ok || !data?.data?.token) {
      return Response.json({ error: data?.message || 'Failed to create HeyGen streaming token' }, { status: 502 });
    }
    return Response.json({
      token: data.data.token,
      avatar_id: '63014563-22f7-4401-95db-034f3c992ec3'
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});