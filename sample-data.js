/* ============================================================
   Demo mode: a fictional tournament so the app looks alive
   before you've added your API key and real config.
   Deterministic pseudo-random results — refresh-stable.
   ============================================================ */

(function () {
  const DEMO_TEAMS = [
    // tier 1..6, eight teams per tier (fictional seeding for the demo only)
    ["France", "Brazil", "Argentina", "Spain", "England", "Germany", "Portugal", "Netherlands"],
    ["Belgium", "Italy", "Uruguay", "Croatia", "Colombia", "Morocco", "USA", "Mexico"],
    ["Switzerland", "Denmark", "Japan", "Senegal", "Ecuador", "Austria", "Korea Republic", "Norway"],
    ["Australia", "Canada", "Scotland", "Paraguay", "Egypt", "Algeria", "Türkiye", "Côte d'Ivoire"],
    ["Qatar", "Saudi Arabia", "Tunisia", "Panama", "Ghana", "Uzbekistan", "South Africa", "Iran"],
    ["Jordan", "New Zealand", "Honduras", "Cape Verde", "Jamaica", "Curaçao", "Haiti", "Bolivia"],
  ];

  const DEMO_PLAYERS = ["You", "Mum", "Dad", "Sam", "Alex", "Jordan", "Charlie", "Nan"];

  // deterministic RNG
  let seed = 20260611;
  function rnd() {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  }

  // ownership: tier t teams dealt round-robin with offset so it's mixed
  const demoConfig = {
    title: "Family World Cup 2026",
    players: DEMO_PLAYERS.map((name, pi) => ({
      name,
      teams: DEMO_TEAMS.map((tierTeams, t) => ({
        tier: t + 1,
        team: tierTeams[(pi + t * 3) % 8],
      })),
    })),
    resultOverrides: [],
  };

  const allTeams = [];
  DEMO_TEAMS.forEach((tier, t) => tier.forEach((name) => allTeams.push({ name, tier: t + 1 })));

  // shuffle into 12 groups of 4
  const pool = [...allTeams];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const groups = [];
  for (let g = 0; g < 12; g++) groups.push(pool.slice(g * 4, g * 4 + 4));

  const matches = [];
  let id = 1;
  let day = 0;
  const baseDate = new Date("2026-06-11T16:00:00Z");
  function dateFor(offsetDays, hour) {
    const d = new Date(baseDate);
    d.setUTCDate(d.getUTCDate() + offsetDays);
    d.setUTCHours(hour, 0, 0, 0);
    return d.toISOString();
  }

  function strength(team) {
    return 7 - team.tier + (rnd() - 0.5) * 1.6;
  }

  function playGroup(a, b, when) {
    const sa = 7 - a.tier, sb = 7 - b.tier;
    const pDraw = 0.26 * Math.exp(-Math.abs(sa - sb) / 3);
    const r = rnd();
    let winner, gh, ga;
    if (r < pDraw) {
      winner = "DRAW";
      gh = ga = Math.floor(rnd() * 3);
    } else {
      const pa = 1 / (1 + Math.pow(10, -(sa - sb) / 4));
      if (rnd() < pa) { winner = "HOME_TEAM"; gh = 1 + Math.floor(rnd() * 3); ga = Math.max(0, gh - 1 - Math.floor(rnd() * 2)); }
      else { winner = "AWAY_TEAM"; ga = 1 + Math.floor(rnd() * 3); gh = Math.max(0, ga - 1 - Math.floor(rnd() * 2)); }
    }
    return {
      id: id++,
      stage: "GROUP_STAGE",
      group: null,
      utcDate: when,
      status: "FINISHED",
      homeTeam: { name: a.name },
      awayTeam: { name: b.name },
      score: { winner, duration: "REGULAR", fullTime: { home: gh, away: ga } },
    };
  }

  const groupPts = new Map(allTeams.map((t) => [t.name, 0]));
  groups.forEach((g, gi) => {
    const letter = "ABCDEFGHIJKL"[gi];
    const fixtures = [
      [0, 1], [2, 3], [0, 2], [1, 3], [0, 3], [1, 2],
    ];
    fixtures.forEach(([i, j], fi) => {
      const m = playGroup(g[i], g[j], dateFor(Math.floor(fi / 2) * 4 + (gi % 4), 13 + (gi % 3) * 3));
      m.group = "Group " + letter;
      matches.push(m);
      if (m.score.winner === "DRAW") {
        groupPts.set(g[i].name, groupPts.get(g[i].name) + 1);
        groupPts.set(g[j].name, groupPts.get(g[j].name) + 1);
      } else {
        const w = m.score.winner === "HOME_TEAM" ? g[i] : g[j];
        groupPts.set(w.name, groupPts.get(w.name) + 3);
      }
    });
  });

  // qualifiers: top 2 per group + 8 best thirds
  const thirds = [];
  let qualifiers = [];
  groups.forEach((g) => {
    const order = [...g].sort((a, b) => groupPts.get(b.name) - groupPts.get(a.name) || rnd() - 0.5);
    qualifiers.push(order[0], order[1]);
    thirds.push(order[2]);
  });
  thirds.sort((a, b) => groupPts.get(b.name) - groupPts.get(a.name) || rnd() - 0.5);
  qualifiers = qualifiers.concat(thirds.slice(0, 8));

  // R32: played. R16: scheduled (the demo "now" is mid-tournament).
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function playKO(a, b, stage, when) {
    const sa = 7 - a.tier, sb = 7 - b.tier;
    const pa = 1 / (1 + Math.pow(10, -(sa - sb) / 4));
    const homeWins = rnd() < pa;
    const pens = rnd() < 0.22;
    let gh = Math.floor(rnd() * 3), ga;
    if (pens) ga = gh;
    else { if (homeWins) { gh = Math.max(1, gh); ga = gh - 1 - Math.floor(rnd() * 2); ga = Math.max(0, ga); } else { ga = Math.max(1, gh); gh = ga - 1; gh = Math.max(0, gh); } }
    return {
      id: id++,
      stage,
      utcDate: when,
      status: "FINISHED",
      homeTeam: { name: a.name },
      awayTeam: { name: b.name },
      score: {
        winner: homeWins ? "HOME_TEAM" : "AWAY_TEAM",
        duration: pens ? "PENALTY_SHOOTOUT" : "REGULAR",
        fullTime: { home: gh, away: ga },
        penalties: pens ? { home: homeWins ? 4 : 2, away: homeWins ? 2 : 4 } : undefined,
      },
      _winnerTeam: homeWins ? a : b,
    };
  }

  const r32Pairs = shuffle(qualifiers);
  const r16Teams = [];
  for (let k = 0; k < 32; k += 2) {
    const m = playKO(r32Pairs[k], r32Pairs[k + 1], "LAST_32", dateFor(18 + (k % 8), 14 + (k % 3) * 3));
    matches.push(m);
    r16Teams.push(m._winnerTeam);
  }
  // R16 scheduled, not yet played
  for (let k = 0; k < 16; k += 2) {
    matches.push({
      id: id++,
      stage: "LAST_16",
      utcDate: dateFor(24 + (k % 4), 15 + (k % 2) * 4),
      status: "TIMED",
      homeTeam: { name: r16Teams[k].name },
      awayTeam: { name: r16Teams[k + 1].name },
      score: { winner: null, fullTime: { home: null, away: null } },
    });
  }

  window.DEMO = { config: demoConfig, matches };
})();
