// Fetches World Cup matches from football-data.org.
// The API key stays server-side (Netlify env var), never in the browser.
// Responses are cached on Netlify's CDN for 15 minutes, so the whole
// family hitting refresh costs you ~4 API calls an hour (limit is 10/min).

export default async () => {
  const key = process.env.FOOTBALL_DATA_API_KEY;
  if (!key) {
    return Response.json(
      { error: "missing_key", message: "Set FOOTBALL_DATA_API_KEY in Netlify environment variables." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch("https://api.football-data.org/v4/competitions/WC/matches", {
      headers: { "X-Auth-Token": key },
    });

    if (!res.ok) {
      const body = await res.text();
      return Response.json(
        { error: "upstream_error", status: res.status, body: body.slice(0, 500) },
        { status: 502, headers: { "Netlify-CDN-Cache-Control": "public, s-maxage=60" } }
      );
    }

    const data = await res.json();
    return Response.json(
      { fetchedAt: new Date().toISOString(), matches: data.matches || [] },
      {
        headers: {
          "Cache-Control": "public, max-age=0, must-revalidate",
          "Netlify-CDN-Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
        },
      }
    );
  } catch (err) {
    return Response.json({ error: "fetch_failed", message: String(err) }, { status: 502 });
  }
};

export const config = { path: "/api/results" };
