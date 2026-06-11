/* ============================================================
   YOUR SETUP — this is the only file you need to edit.

   1. Put each family member's name below.
   2. Fill in their six teams, one per tier (tier 1 = strongest).
      ⚠ Team names must match the football-data.org spelling
        EXACTLY (e.g. "Korea Republic", "Côte d'Ivoire").
        Until they all match, the app shows a Setup banner
        listing every name the API uses — copy from there.
   3. Optional: fix a wrong result with resultOverrides.

   While any team below still says "Tier X team", the app runs
   in DEMO mode with fictional data so everyone can see how it
   will look.
   ============================================================ */

window.CONFIG = {
  title: "Family World Cup 2026",

  players: [
    {
      name: "Player 1",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 2",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 3",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 4",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 5",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 6",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 7",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
    {
      name: "Player 8",
      teams: [
        { tier: 1, team: "Tier 1 team" },
        { tier: 2, team: "Tier 2 team" },
        { tier: 3, team: "Tier 3 team" },
        { tier: 4, team: "Tier 4 team" },
        { tier: 5, team: "Tier 5 team" },
        { tier: 6, team: "Tier 6 team" },
      ],
    },
  ],

  /* Manual corrections — only if the data feed ever gets one wrong.
     Find the match id in the Matches tab (long-press a match), then:
     { matchId: 12345, winner: "HOME_TEAM" }            // or "AWAY_TEAM" or "DRAW"
     { matchId: 12345, winner: "AWAY_TEAM", score: { home: 1, away: 2 } }
  */
  resultOverrides: [],

  /* Scoring — already set to your agreed system; change only if the
     family renegotiates. */
  points: {
    GROUP_WIN: 3,
    GROUP_DRAW: 1,
    QUALIFY: 2,
    R32: 4,
    R16: 5,
    QF: 7,
    SF: 9,
    THIRD: 3,
    FINAL: 12,
  },
};
