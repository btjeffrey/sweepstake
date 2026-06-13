/* ============================================================
   App: loads results (live API via Netlify function, or demo),
   runs the engine, renders the five tabs.
   ============================================================ */

(function () {
  const $ = (sel, el) => (el || document).querySelector(sel);
  const view = $("#view");
  const bannerEl = $("#banner");

  let state = null;          // engine output
  let mode = "loading";      // "live" | "demo"
  let demoReason = "";
  let activeTab = "table";
  let matchFilter = "all";
  let fetchedAt = null;

  const configIsPlaceholder = () =>
    window.CONFIG.players.some((p) => p.teams.some((t) => /^tier \d team$/i.test(t.team.trim())));

  /* ---------- data loading ---------- */
  async function load(forceSpin) {
    const btn = $("#refreshBtn");
    if (forceSpin) btn.classList.add("spinning");
    const usePlaceholders = configIsPlaceholder();
    let matches = null;

    if (!new URLSearchParams(location.search).has("demo")) {
      try {
        const res = await fetch("/api/results", { cache: "no-store" });
        const data = await res.json();
        if (res.ok && Array.isArray(data.matches)) {
          matches = data.matches;
          fetchedAt = data.fetchedAt;
        } else {
          demoReason = data.error === "missing_key"
            ? "No API key yet — add FOOTBALL_DATA_API_KEY in Netlify, then redeploy."
            : "Couldn't reach the results feed (" + (data.error || res.status) + ").";
        }
      } catch (e) {
        demoReason = "Couldn't reach the results feed — check your connection.";
      }
    } else {
      demoReason = "Demo mode requested (?demo in the address).";
    }

    if (matches && !usePlaceholders) {
      mode = "live";
      state = Engine.computeState(window.CONFIG, matches);
    } else {
      if (matches && usePlaceholders) {
        demoReason = "Teams not set up yet — edit config.js with your family's teams.";
        // still surface the real API team names for setup help
        const probe = Engine.computeState(window.CONFIG, matches);
        window._apiTeamNames = probe.diagnostics.apiTeams;
      }
      mode = "demo";
      state = Engine.computeState(window.DEMO.config, window.DEMO.matches);
    }
    btn.classList.remove("spinning");
    renderAll();
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function fmtDate(iso, withTime) {
    const d = new Date(iso);
    const date = d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
    if (!withTime) return date;
    return date + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  function dayKey(iso) {
    return new Date(iso).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  }

  /* ---------- banner ---------- */
  function renderBanner() {
    const bits = [];
    if (mode === "demo") {
      bits.push(
        `<div class="banner"><strong>Demo mode.</strong> ${esc(demoReason || "Showing fictional results so you can explore.")} ` +
        `The table, steals and rivalries below are made up.` +
        (window._apiTeamNames && window._apiTeamNames.length
          ? `<details><summary>Show the ${window._apiTeamNames.length} team names the live feed uses (copy these into config.js)</summary><div class="api-list">${window._apiTeamNames.map(esc).join("<br>")}</div></details>`
          : "") +
        `</div>`
      );
    } else {
      const d = state.diagnostics;
      const cfgNorm = new Set(d.apiTeams.map((t) => Engine.norm(t)));
      const missing = [];
      window.CONFIG.players.forEach((p) =>
        p.teams.forEach((t) => { if (!cfgNorm.has(Engine.norm(t.team))) missing.push(`${t.team} (${p.name})`); })
      );
      if (missing.length) {
        bits.push(
          `<div class="banner"><strong>Setup check:</strong> ${missing.length} team name${missing.length > 1 ? "s" : ""} in config.js ` +
          `do${missing.length > 1 ? "n't" : "esn't"} match the live feed, so those teams score nothing: ` +
          `<b>${missing.map(esc).join(", ")}</b>.` +
          `<details><summary>Show every name the feed uses</summary><div class="api-list">${d.apiTeams.map(esc).join("<br>")}</div></details></div>`
        );
      }
      if (d.unknownStages.length) {
        bits.push(`<div class="banner"><strong>Heads up:</strong> unrecognised rounds in the feed (${d.unknownStages.map(esc).join(", ")}) are being ignored.</div>`);
      }
    }
    bannerEl.innerHTML = bits.join("");
  }

  /* ---------- views ---------- */
  function renderTable() {
    const topScore = state.table.length ? state.table[0].points : 0;
    const scoring = topScore !== 0;
    const crown = (fill) =>
      `<svg class="crown" viewBox="0 0 24 18" width="22" height="17" aria-hidden="true">` +
      `<path d="M2 5l4 4 6-7 6 7 4-4-2 11H4L2 5z" fill="${fill}" stroke="rgba(0,0,0,0.25)" stroke-width="0.6" stroke-linejoin="round"/>` +
      `<circle cx="2" cy="5" r="1.6" fill="${fill}"/><circle cx="22" cy="5" r="1.6" fill="${fill}"/>` +
      `<circle cx="12" cy="2" r="1.6" fill="${fill}"/></svg>`;
    const CROWNS = { 1: "var(--gold)", 2: "var(--silver)", 3: "var(--bronze)" };
    const rows = state.table.map((p) => {
      const medal = scoring && CROWNS[p.rank] ? p.rank : 0;
      const stealNet = p.stealsFor - p.stealsAgainst;
      return `
        <div class="trow ${medal ? "podium podium-" + medal : ""}" data-squad="${p.index}">
          <div class="rank">${medal ? crown(CROWNS[medal]) : p.rank}</div>
          <div class="who">
            <div class="name">${esc(p.name)}</div>
            <div class="sub">
              <span>Grp ${p.groupPts}</span>
              <span>KO ${p.koPts}</span>
              <span>Qual ${p.qualBonus}</span>
              <span class="${stealNet > 0 ? "pos" : stealNet < 0 ? "neg" : ""}">Steals ${stealNet > 0 ? "+" : ""}${stealNet}</span>
            </div>
          </div>
          <div class="pts">${p.points}<small>PTS</small></div>
        </div>`;
    });
    view.innerHTML = `<div class="section-label">League table</div>` + rows.join("") +
      `<div class="rivalry-hint">Tap a player to jump to their squad.</div>`;
    view.querySelectorAll("[data-squad]").forEach((el) =>
      el.addEventListener("click", () => { activeTab = "squads"; syncTabs(); renderAll(); })
    );
  }

  function renderMatches() {
    const filters = [
      ["all", "All"], ["today", "Today"], ["upcoming", "Upcoming"],
      ["GROUP", "Groups"], ["R32", "R32"], ["R16", "R16"], ["QF", "QF"], ["SF", "SF"], ["FINAL", "Finals"],
      ["steals", "Steals"], ["finished", "Results"],
    ];
    const now = new Date();
    const todayStr = now.toDateString();

    let list = state.matches.filter((m) => m.homeTeam && m.awayTeam);
    if (matchFilter === "today") list = list.filter((m) => new Date(m.utcDate).toDateString() === todayStr);
    else if (matchFilter === "upcoming") list = list.filter((m) => m.status !== "FINISHED");
    else if (matchFilter === "finished") list = list.filter((m) => m.status === "FINISHED");
    else if (matchFilter === "steals") list = list.filter((m) => m.steal);
    else if (matchFilter === "FINAL") list = list.filter((m) => m.stage === "FINAL" || m.stage === "THIRD");
    else if (matchFilter !== "all") list = list.filter((m) => m.stage === matchFilter);

    // upcoming first when "all": show next 3 fixtures pinned, then results newest-first
    const finished = list.filter((m) => m.status === "FINISHED").sort((a, b) => new Date(b.utcDate) - new Date(a.utcDate));
    const upcoming = list.filter((m) => m.status !== "FINISHED").sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    function matchCard(m) {
      const finishedM = m.status === "FINISHED" && m.score && m.score.winner;
      const ft = m.score && m.score.fullTime;
      const pens = m.score && m.score.penalties && m.score.duration === "PENALTY_SHOOTOUT";
      const homeWin = finishedM && m.score.winner === "HOME_TEAM";
      const awayWin = finishedM && m.score.winner === "AWAY_TEAM";
      const ownerTag = (o) => (o ? `<b>${esc(o.player)}</b> · T${o.tier}` : "—");
      const foot = [];
      if (m.freeHit && finishedM) foot.push(`<span class="freehit">Free hit — ${esc(m.homeOwner.player)} owns both</span>`);
      if (m.steal) foot.push(`<span class="steal-note">⚡ ${esc(m.steal.taker)} steals ${m.steal.gap} from ${esc(m.steal.victim)}</span>`);
      if (finishedM && !m.freeHit) {
        const winPts = m.deltas.filter((d) => d.why !== "steal" && d.why !== "stolen" && d.pts > 0);
        winPts.forEach((d) => foot.push(`<span>+${d.pts} ${esc(d.player)}</span>`));
      }
      if (pens) foot.push(`<span>Pens ${m.score.penalties.home}–${m.score.penalties.away}</span>`);
      if (m.overridden) foot.push(`<span>manually corrected</span>`);
      return `
        <div class="match" data-id="${m.id}">
          <div class="stagechip">
            <span class="${m.stage !== "GROUP" ? "ko" : ""}">${esc(m.group || m.stageLabel)}</span>
            <span>${fmtDate(m.utcDate, m.status !== "FINISHED")}</span>
          </div>
          <div class="teams">
            <div class="side home ${homeWin ? "winner" : ""}">
              <div class="tname">${esc(m.homeTeam)}</div>
              <div class="owner-tag">${ownerTag(m.homeOwner)}</div>
            </div>
            <div class="score ${finishedM ? "" : "upcoming"}">${finishedM && ft ? `${ft.home}–${ft.away}` : "v"}</div>
            <div class="side away ${awayWin ? "winner" : ""}">
              <div class="tname">${esc(m.awayTeam)}</div>
              <div class="owner-tag">${ownerTag(m.awayOwner)}</div>
            </div>
          </div>
          ${foot.length ? `<div class="footnote">${foot.join("")}</div>` : ""}
          <div class="detail" hidden>match id ${m.id} — use this for resultOverrides in config.js</div>
        </div>`;
    }

    function grouped(arr) {
      let out = "", lastDay = "";
      for (const m of arr) {
        const dk = dayKey(m.utcDate);
        if (dk !== lastDay) { out += `<div class="day-label">${esc(dk)}</div>`; lastDay = dk; }
        out += matchCard(m);
      }
      return out;
    }

    let html = `<div class="filterbar">${filters
      .map(([k, l]) => `<button class="fchip ${matchFilter === k ? "active" : ""}" data-f="${k}">${l}</button>`)
      .join("")}</div>`;

    if (!finished.length && !upcoming.length) {
      html += `<div class="empty"><div class="big">📺</div>Nothing here yet for this filter.</div>`;
    } else if (matchFilter === "upcoming" || matchFilter === "today") {
      html += grouped(matchFilter === "upcoming" ? upcoming : [...upcoming, ...finished]);
    } else {
      if (upcoming.length && matchFilter === "all") {
        html += `<div class="section-label">Next up</div>` + upcoming.slice(0, 3).map(matchCard).join("");
      }
      if (finished.length) {
        html += `<div class="section-label">Results</div>` + grouped(finished);
      } else if (upcoming.length > 3 || matchFilter !== "all") {
        html += grouped(upcoming);
      }
    }
    view.innerHTML = html;
    view.querySelectorAll(".fchip").forEach((b) =>
      b.addEventListener("click", () => { matchFilter = b.dataset.f; renderMatches(); })
    );
    view.querySelectorAll(".match").forEach((el) =>
      el.addEventListener("click", () => { const d = el.querySelector(".detail"); d.hidden = !d.hidden; })
    );
  }

  function renderSteals() {
    const ev = state.stealEvents;
    if (!ev.length) {
      view.innerHTML = `<div class="empty"><div class="big">🕵️</div>No steals yet. The minnows are biding their time.</div>`;
      return;
    }
    const byPlayer = state.players.map((p) => ({ name: p.name, f: p.stealsFor, a: p.stealsAgainst }));
    const thief = [...byPlayer].sort((a, b) => b.f - a.f)[0];
    const robbed = [...byPlayer].sort((a, b) => b.a - a.a)[0];

    const rows = ev.map((e) => `
      <div class="print-row ${e.gap >= 4 ? "big" : ""}">
        <div class="pdate">${fmtDate(e.date).toUpperCase()} · ${esc(e.stageLabel).toUpperCase()}${e.gap >= 4 ? " · DAYLIGHT ROBBERY" : ""}</div>
        <div class="ptext">${esc(e.takerTeam)} (T${e.takerTier}) beat ${esc(e.victimTeam)} (T${e.victimTier})${e.score ? ` ${e.score.home}–${e.score.away}` : ""}
        — <span class="taker">${esc(e.taker)}</span> <span class="amt">+${e.gap}</span>, <span class="victim">${esc(e.victim)} −${e.gap}</span></div>
      </div>`).join("");

    view.innerHTML = `
      <div class="steal-stats">
        <div class="stat-card thief"><div class="lbl">Master thief</div><div class="val"><span class="n">+${thief.f}</span> ${esc(thief.name)}</div></div>
        <div class="stat-card robbed"><div class="lbl">Most robbed</div><div class="val"><span class="n">−${robbed.a}</span> ${esc(robbed.name)}</div></div>
      </div>
      <div class="section-label">The steal ledger</div>
      <div class="printer">${rows}</div>`;
  }

  function renderRivalry() {
    const ps = state.players;
    const grid = state.rivalryGrid;
    const short = (n) => (n.length > 6 ? n.slice(0, 6) : n);
    let head = `<tr><th class="rowhead"></th>${ps.map((p) => `<th>${esc(short(p.name))}</th>`).join("")}</tr>`;
    let body = ps.map((p, i) => {
      const cells = ps.map((q, j) => {
        if (i === j) return `<td class="self"></td>`;
        const c = grid[i][j];
        if (!c || (c.wins === 0 && c.losses === 0 && c.draws === 0)) return `<td class="level" data-pair="${i}-${j}">–</td>`;
        const cls = c.wins > c.losses ? "ahead" : c.wins < c.losses ? "behind" : "level";
        return `<td class="${cls}" data-pair="${i}-${j}">${c.wins}–${c.losses}${c.draws ? `<span class="d">${c.draws} dr</span>` : ""}</td>`;
      }).join("");
      return `<tr><th class="rowhead">${esc(short(p.name))}</th>${cells}</tr>`;
    }).join("");

    view.innerHTML = `
      <div class="section-label">Head-to-head record</div>
      <div class="rivalry-wrap"><table class="rgrid">${head}${body}</table></div>
      <div class="rivalry-hint">Read across: row player's wins–losses against each column player. Green means you own them. Tap a cell for the full story.</div>`;

    view.querySelectorAll("td[data-pair]").forEach((td) =>
      td.addEventListener("click", () => openRivalrySheet(...td.dataset.pair.split("-").map(Number)))
    );
  }

  function openRivalrySheet(i, j) {
    const key = i < j ? `${i}-${j}` : `${j}-${i}`;
    const r = state.rivalry[key];
    const a = state.players[i], b = state.players[j];
    let wins = 0, losses = 0, draws = 0, items = "";
    if (r) {
      const flipped = r.a !== i;
      wins = flipped ? r.bWins : r.aWins;
      losses = flipped ? r.aWins : r.bWins;
      draws = r.draws;
      items = [...r.matches].reverse().map((m) => {
        const ft = m.score && m.score.fullTime;
        return `<div class="h2h-match">
          <div>${esc(m.homeTeam)} ${ft && ft.home != null ? `${ft.home}–${ft.away}` : "v"} ${esc(m.awayTeam)}
            ${m.steal ? ` <span style="color:var(--amber)">⚡${m.steal.gap}</span>` : ""}</div>
          <div class="meta">${esc(m.stageLabel)} · ${fmtDate(m.utcDate)}</div>
        </div>`;
      }).join("");
    }
    $("#sheetCard").innerHTML = `
      <h3>${esc(a.name)} v ${esc(b.name)}</h3>
      <div class="h2h-score">${wins}<span class="vs">–</span>${losses}${draws ? `<span class="vs">(${draws} draws)</span>` : ""}</div>
      ${items || `<div class="empty">Their teams haven't met yet. It's coming.</div>`}`;
    $("#sheet").classList.remove("hidden");
  }

  function renderSquads() {
    const cards = state.table.map((p) => {
      const teams = [...p.teams].sort((a, b) => a.tier - b.tier);
      const lis = teams.map((t) => {
        const dead = t.status === "out";
        const pill =
          t.status === "champion" ? `<span class="statuspill champion">Champions</span>` :
          t.status === "finalist" ? `<span class="statuspill finalist">Runner-up</span>` :
          t.status === "third" ? `<span class="statuspill third">3rd place</span>` :
          dead ? `<span class="statuspill out">Out</span>` : "";
        return `<li>
          <span class="tierbadge">T${t.tier}</span>
          <div class="tm">
            <div class="nm ${dead ? "dead" : ""}">${esc(t.team)}</div>
            <div class="formchips">${t.form.map((f) => `<span class="fc ${f}">${f}</span>`).join("")}</div>
          </div>
          ${pill}
          <span class="tpts ${t.points < 0 ? "neg" : ""}">${t.points}</span>
        </li>`;
      }).join("");
      return `<div class="squad">
        <div class="squad-head">
          <span class="rankpill">#${p.rank}</span>
          <span class="name">${esc(p.name)}</span>
          <span class="total">${p.points}</span>
        </div>
        <ul>${lis}</ul>
      </div>`;
    });
    view.innerHTML = `<div class="section-label">Squads · points per team</div>` + cards.join("");
  }

  /* ---------- shell ---------- */
  function syncTabs() {
    document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === activeTab));
  }

  function renderAll() {
    $("#appTitle").textContent = (mode === "demo" ? window.DEMO.config.title : window.CONFIG.title) || "Family World Cup";
    $("#liveDot").classList.toggle("demo", mode === "demo");
    $("#updatedAt").textContent =
      mode === "demo"
        ? "DEMO DATA — fictional results"
        : "Updated " + (fetchedAt ? new Date(fetchedAt).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "just now") + " · refreshes every 15 min";
    renderBanner();
    if (activeTab === "table") renderTable();
    else if (activeTab === "matches") renderMatches();
    else if (activeTab === "steals") renderSteals();
    else if (activeTab === "rivalry") renderRivalry();
    else renderSquads();
    window.scrollTo({ top: 0 });
  }

  document.querySelectorAll(".tab").forEach((t) =>
    t.addEventListener("click", () => { activeTab = t.dataset.tab; syncTabs(); renderAll(); })
  );
  $("#refreshBtn").addEventListener("click", () => load(true));
  $("#sheetBackdrop").addEventListener("click", () => $("#sheet").classList.add("hidden"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && mode === "live") load(false);
  });

  load(false);
})();
