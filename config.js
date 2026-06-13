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
      name: "Jenny",
      teams: [
        { tier: 1, team: "France" },
        { tier: 2, team: "Germany" },
        { tier: 3, team: "Japan" },
        { tier: 4, team: "Australia" },
        { tier: 5, team: "Czechia" },
        { tier: 6, team: "Ghana" },
      ],
    },
    {
      name: "Joe",
      teams: [
        { tier: 1, team: "Argentina" },
        { tier: 2, team: "Croatia" },
        { tier: 3, team: "Switzerland" },
        { tier: 4, team: "Norway" },
        { tier: 5, team: "Paraguay" },
        { tier: 6, team: "New Zealand" },
      ],
    },
    {
      name: "Itzí",
      teams: [
        { tier: 1, team: "Spain" },
        { tier: 2, team: "Morocco" },
        { tier: 3, team: "Senegal" },
        { tier: 4, team: "Turkey" },
        { tier: 5, team: "Canada" },
        { tier: 6, team: "Uzbekistan" },
      ],
    },
    {
      name: "Javier",
      teams: [
        { tier: 1, team: "England" },
        { tier: 2, team: "Colombia" },
        { tier: 3, team: "Austria" },
        { tier: 4, team: "Algeria" },
        { tier: 5, team: "Bosnia & Herzegovina" },
        { tier: 6, team: "Jordan" },
      ],
    },
    {
      name: "Kevin",
      teams: [
        { tier: 1, team: "Brazil" },
        { tier: 2, team: "Sweden" },
        { tier: 3, team: "Ecuador" },
        { tier: 4, team: "Ivory Coast" },
        { tier: 5, team: "Saudi Arabia" },
        { tier: 6, team: "Cape Verde Islands" },
      ],
    },
    {
      name: "Ben",
      teams: [
        { tier: 1, team: "Portugal" },
        { tier: 2, team: "Uruguay" },
        { tier: 3, team: "South Korea" },
        { tier: 4, team: "Scotland" },
        { tier: 5, team: "Qatar" },
        { tier: 6, team: "Congo DR" },
      ],
    },
    {
      name: "Mads",
      teams: [
        { tier: 1, team: "Netherlands" },
        { tier: 2, team: "United States" },
        { tier: 3, team: "Iran" },
        { tier: 4, team: "Tunisia" },
        { tier: 5, team: "Iraq" },
        { tier: 6, team: "Haiti" },
      ],
    },
    {
      name: "Helen",
      teams: [
        { tier: 1, team: "Belgium" },
        { tier: 2, team: "Mexico" },
        { tier: 3, team: "Egypt" },
        { tier: 4, team: "Panama" },
        { tier: 5, team: "South Africa" },
        { tier: 6, team: "Curacao" },
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
