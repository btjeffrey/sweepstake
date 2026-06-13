/* ============================================================
   Sweepstake scoring engine
   Pure functions: (config, matches) -> full computed state.
   Works in the browser and in Node (for tests).
   ============================================================ */

const STAGE_MAP = {
  GROUP_STAGE: "GROUP",
  LAST_32: "R32",
  ROUND_OF_32: "R32",
  LAST_16: "R16",
  ROUND_OF_16: "R16",
  QUARTER_FINALS: "QF",
  QUARTER_FINAL: "QF",
  SEMI_FINALS: "SF",
  SEMI_FINAL: "SF",
  THIRD_PLACE: "THIRD",
  THIRD_PLACE_PLAYOFF: "THIRD",
  FINAL: "FINAL",
};

const DEFAULT_POINTS = {
  GROUP_WIN: 3,
  GROUP_DRAW: 1,
  QUALIFY: 2, // per team reaching the Round of 32
  R32: 4,
  R16: 5,
  QF: 7,
  SF: 9,
  THIRD: 3,
  FINAL: 12,
};

const STAGE_LABELS = {
  GROUP: "Group stage",
  R32: "Round of 32",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  THIRD: "Third-place play-off",
  FINAL: "Final",
};

const STAGE_ORDER = ["GROUP", "R32", "R16", "QF", "SF", "THIRD", "FINAL"];

function norm(name) {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Build lookup: normalised team name -> { player, playerIndex, tier, team } */
function buildOwnership(config) {
  const owners = new Map();
  const problems = [];
  config.players.forEach((p, pi) => {
    (p.teams || []).forEach((entry) => {
      const key = norm(entry.team);
      if (!key || /tier \d (team|placeholder)?/.test(key)) {
        problems.push({ type: "placeholder", player: p.name, tier: entry.tier });
        return;
      }
      if (owners.has(key)) {
        problems.push({ type: "duplicate", team: entry.team, player: p.name });
        return;
      }
      owners.set(key, { player: p.name, playerIndex: pi, tier: entry.tier, team: entry.team });
    });
  });
  return { owners, problems };
}

function applyOverrides(matches, overrides) {
  if (!overrides || !overrides.length) return matches;
  const byId = new Map(overrides.filter((o) => o.matchId != null).map((o) => [o.matchId, o]));
  return matches.map((m) => {
    const o = byId.get(m.id);
    if (!o) return m;
    const next = JSON.parse(JSON.stringify(m));
    next.status = "FINISHED";
    next.score = next.score || {};
    next.score.winner = o.winner; // "HOME_TEAM" | "AWAY_TEAM" | "DRAW"
    if (o.score) next.score.fullTime = o.score; // {home, away}
    next._overridden = true;
    return next;
  });
}

function computeState(config, rawMatches) {
  const points = Object.assign({}, DEFAULT_POINTS, config.points || {});
  const { owners, problems } = buildOwnership(config);
  const matches = applyOverrides(rawMatches || [], config.resultOverrides);

  const players = config.players.map((p, i) => ({
    name: p.name,
    emoji: p.emoji || "",
    index: i,
    points: 0,
    groupPts: 0,
    qualBonus: 0,
    koPts: 0,
    stealsFor: 0,
    stealsAgainst: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    teams: (p.teams || []).map((t) => ({
      team: t.team,
      tier: t.tier,
      points: 0,
      played: 0,
      form: [], // "W" | "D" | "L"
      status: "alive", // alive | out | finalist | champion | third
      lastStage: "GROUP",
    })),
  }));

  const teamState = new Map(); // normName -> player team record
  players.forEach((p) =>
    p.teams.forEach((t) => teamState.set(norm(t.team), { ...t, _owner: p, ref: t }))
  );

  const apiTeams = new Set();
  const unknownApiTeams = new Set();
  const unknownStages = new Set();
  const stealEvents = [];
  const enriched = [];
  const rivalry = {}; // "i-j" sorted pair -> {a, b, aWins, bWins, matches: []}
  const n = config.players.length;

  const ownerOf = (name) => owners.get(norm(name)) || null;

  const pairKey = (i, j) => (i < j ? `${i}-${j}` : `${j}-${i}`);

  function recordRivalry(wOwner, lOwner, m, stage, label) {
    const key = pairKey(wOwner.playerIndex, lOwner.playerIndex);
    if (!rivalry[key]) {
      const [a, b] = key.split("-").map(Number);
      rivalry[key] = { a, b, aWins: 0, bWins: 0, draws: 0, matches: [] };
    }
    const r = rivalry[key];
    if (label === "DRAW") r.draws += 1;
    else if (wOwner.playerIndex === r.a) r.aWins += 1;
    else r.bWins += 1;
    r.matches.push({ ...m, _resultLabel: label });
  }

  // qualification: any team appearing in an R32 fixture.
  // The feed contains the full tournament skeleton from day one, so R32
  // fixtures exist as empty placeholders long before the draw is known.
  // Only a fixture with real team names counts, and elimination is only
  // inferred once the draw is essentially complete (32 named teams).
  const r32Teams = new Set();
  for (const m of matches) {
    const stage = STAGE_MAP[m.stage];
    if (stage === "R32") {
      if (m.homeTeam && m.homeTeam.name) r32Teams.add(norm(m.homeTeam.name));
      if (m.awayTeam && m.awayTeam.name) r32Teams.add(norm(m.awayTeam.name));
    }
  }
  const r32DrawComplete = r32Teams.size >= 32;
  for (const key of r32Teams) {
    const o = ownerOf(key);
    const ts = teamState.get(key);
    if (o && ts) {
      players[o.playerIndex].qualBonus += points.QUALIFY;
      players[o.playerIndex].points += points.QUALIFY;
    }
  }

  const sorted = [...matches].sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

  for (const m of sorted) {
    const stage = STAGE_MAP[m.stage];
    if (!stage) {
      unknownStages.add(m.stage);
      continue;
    }
    const homeName = m.homeTeam && m.homeTeam.name;
    const awayName = m.awayTeam && m.awayTeam.name;
    if (homeName) apiTeams.add(homeName);
    if (awayName) apiTeams.add(awayName);

    const home = homeName ? ownerOf(homeName) : null;
    const away = awayName ? ownerOf(awayName) : null;
    if (homeName && !home) unknownApiTeams.add(homeName);
    if (awayName && !away) unknownApiTeams.add(awayName);

    const em = {
      id: m.id,
      utcDate: m.utcDate,
      status: m.status,
      stage,
      stageLabel: STAGE_LABELS[stage],
      group: m.group || null,
      homeTeam: homeName,
      awayTeam: awayName,
      homeOwner: home,
      awayOwner: away,
      score: m.score || null,
      overridden: !!m._overridden,
      freeHit: !!(home && away && home.playerIndex === away.playerIndex),
      deltas: [], // [{playerIndex, pts, why}]
      steal: null,
    };

    const finished = m.status === "FINISHED" && m.score && m.score.winner;
    if (finished && home && away) {
      const winner = m.score.winner; // HOME_TEAM | AWAY_TEAM | DRAW
      const give = (o, pts, why) => {
        players[o.playerIndex].points += pts;
        em.deltas.push({ playerIndex: o.playerIndex, player: o.player, pts, why });
      };
      const teamRec = (o) => teamState.get(norm(o.team)).ref;

      if (stage === "GROUP") {
        if (winner === "DRAW") {
          give(home, points.GROUP_DRAW, "draw");
          give(away, points.GROUP_DRAW, "draw");
          players[home.playerIndex].groupPts += points.GROUP_DRAW;
          players[away.playerIndex].groupPts += points.GROUP_DRAW;
          players[home.playerIndex].draws++;
          players[away.playerIndex].draws++;
          teamRec(home).points += points.GROUP_DRAW;
          teamRec(away).points += points.GROUP_DRAW;
          teamRec(home).form.push("D");
          teamRec(away).form.push("D");
          if (!em.freeHit) recordRivalry(home, away, em, stage, "DRAW");
        } else {
          const w = winner === "HOME_TEAM" ? home : away;
          const l = winner === "HOME_TEAM" ? away : home;
          give(w, points.GROUP_WIN, "win");
          players[w.playerIndex].groupPts += points.GROUP_WIN;
          players[w.playerIndex].wins++;
          players[l.playerIndex].losses++;
          teamRec(w).points += points.GROUP_WIN;
          teamRec(w).form.push("W");
          teamRec(l).form.push("L");
          handleSteal(w, l);
          if (!em.freeHit) recordRivalry(w, l, em, stage, "WIN");
        }
        teamRec(home).played++;
        teamRec(away).played++;
      } else {
        // knockout: winner always defined (pens count as wins)
        const w = winner === "HOME_TEAM" ? home : away;
        const l = winner === "HOME_TEAM" ? away : home;
        const pts = points[stage];
        give(w, pts, STAGE_LABELS[stage] + " win");
        players[w.playerIndex].koPts += pts;
        players[w.playerIndex].wins++;
        players[l.playerIndex].losses++;
        teamRec(w).points += pts;
        teamRec(w).form.push("W");
        teamRec(l).form.push("L");
        teamRec(home).played++;
        teamRec(away).played++;
        teamRec(w).lastStage = stage;
        teamRec(l).lastStage = stage;
        // elimination / honours
        if (stage === "FINAL") {
          teamRec(w).status = "champion";
          teamRec(l).status = "finalist";
        } else if (stage === "THIRD") {
          teamRec(w).status = "third";
          teamRec(l).status = "out";
        } else if (stage === "SF") {
          // loser still has 3rd-place game
        } else {
          teamRec(l).status = "out";
        }
        handleSteal(w, l);
        if (!em.freeHit) recordRivalry(w, l, em, stage, "WIN");
      }

      function handleSteal(w, l) {
        const gap = w.tier - l.tier; // winner's tier number higher => underdog won
        if (gap > 0 && w.playerIndex !== l.playerIndex) {
          players[w.playerIndex].points += gap;
          players[w.playerIndex].stealsFor += gap;
          players[l.playerIndex].points -= gap;
          players[l.playerIndex].stealsAgainst += gap;
          teamState.get(norm(w.team)).ref.points += gap;
          teamState.get(norm(l.team)).ref.points -= gap;
          const ev = {
            date: m.utcDate,
            stage,
            stageLabel: STAGE_LABELS[stage],
            taker: w.player,
            takerIndex: w.playerIndex,
            takerTeam: w.team,
            takerTier: w.tier,
            victim: l.player,
            victimIndex: l.playerIndex,
            victimTeam: l.team,
            victimTier: l.tier,
            gap,
            score: m.score && m.score.fullTime ? m.score.fullTime : null,
            homeTeam: homeName,
            awayTeam: awayName,
          };
          stealEvents.push(ev);
          em.steal = ev;
          em.deltas.push({ playerIndex: w.playerIndex, player: w.player, pts: gap, why: "steal" });
          em.deltas.push({ playerIndex: l.playerIndex, player: l.player, pts: -gap, why: "stolen" });
        }
      }
    }
    enriched.push(em);
  }

  // group elimination: only once the R32 draw is fully known can we say
  // a group team that isn't in it is out
  if (r32DrawComplete) {
    for (const [key, ts] of teamState) {
      if (ts.ref.status === "alive" && ts.ref.lastStage === "GROUP" && !r32Teams.has(key)) {
        ts.ref.status = "out";
      }
    }
  }

  // standings
  const table = [...players].sort(
    (a, b) => b.points - a.points || b.stealsFor - a.stealsFor || a.name.localeCompare(b.name)
  );
  // shared ranking: players level on points get the same rank (so a tie at
  // the top shares the crown). steals only decide display order, not rank.
  table.forEach((p, i) => {
    p.rank = i > 0 && table[i - 1].points === p.points ? table[i - 1].rank : i + 1;
  });

  // rivalry grid as matrix
  const grid = Array.from({ length: n }, () => Array(n).fill(null));
  Object.values(rivalry).forEach((r) => {
    grid[r.a][r.b] = { wins: r.aWins, losses: r.bWins, draws: r.draws };
    grid[r.b][r.a] = { wins: r.bWins, losses: r.aWins, draws: r.draws };
  });

  stealEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

  return {
    points,
    players,
    table,
    matches: enriched,
    stealEvents,
    rivalry,
    rivalryGrid: grid,
    diagnostics: {
      problems,
      unknownApiTeams: [...unknownApiTeams].sort(),
      apiTeams: [...apiTeams].sort(),
      unknownStages: [...unknownStages],
      configuredTeams: owners.size,
    },
    stageOrder: STAGE_ORDER,
    stageLabels: STAGE_LABELS,
  };
}

const Engine = { computeState, norm, STAGE_MAP, STAGE_LABELS, DEFAULT_POINTS };
if (typeof module !== "undefined" && module.exports) module.exports = Engine;
if (typeof window !== "undefined") window.Engine = Engine;
