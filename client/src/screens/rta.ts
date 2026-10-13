// World Arena (real-time): queue → Epic Seven-style draft (pre-ban 2, 1-2-2-2-2-1, protected 3rd pick, post-ban) → live battle.
import { getHero } from '@shared/engine/registry';
import { PLAYABLE, ELEMENT_COLORS } from '@shared/data/index';
import { rtaTier } from '@shared/meta/profile';
import { HERO_TIER_LETTER } from '@shared/meta/tiers';
import { PREBAN_COUNT, PROTECTED_PICK, type DraftState } from '@shared/meta/draft';
import { $ui, clear, h, icon, toast } from '../core/dom';
import { api, store, token } from '../core/api';
import { music, sfx } from '../core/audio';
import { go, onLeave, register, tierBadge, topbar, ELEMENT_ICON } from '../ui';
import { hideMenuStage, showHeroes } from '../menu3d';
import { runBattle } from '../battle/session';
import { portraitImg } from '../g3d/portraits';
import { leaderboard } from './arena';

let ws: WebSocket | null = null;
const listeners = new Set<(m: any) => void>();
function connect(): Promise<WebSocket> {
  if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve(ws);
  return new Promise((resolve, reject) => {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const s = new WebSocket(`${proto}://${location.host}/ws?token=${token}`);
    s.onopen = () => { ws = s; resolve(s); };
    s.onerror = () => reject(new Error('Could not connect to the World Arena server.'));
    s.onclose = () => { if (ws === s) ws = null; for (const l of listeners) l({ t: 'closed' }); };
    s.onmessage = (e) => { const m = JSON.parse(e.data); for (const l of [...listeners]) l(m); };
  });
}
const send = (m: unknown) => ws?.send(JSON.stringify(m));
function listen(fn: (m: any) => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }

register('rta', async () => {
  void music('arena');
  const tier = rtaTier(store.rta.mmr);
  void showHeroes(['ticktock', 'nocturne'], 'pair');
  const status = h('div', { class: 'small dim' }, 'Connecting…');
  const queueBox = h('div', { class: 'col center', style: 'gap:10px' });
  let off: (() => void) | null = null;
  onLeave(() => { off?.(); if (ws) send({ t: 'cancel' }); });
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar('World Arena'),
    h('div', { class: 'page-body' },
      h('div', { class: 'mainpane', style: 'margin-left:auto;max-width:620px;justify-content:center' },
        h('div', { class: 'panel gilded', style: 'padding:22px;display:flex;flex-direction:column;gap:14px;align-items:center;text-align:center' },
          h('div', { class: 'rank-badge' }, icon('crowned-skull', tier.color), h('div', { class: 'rn', style: `color:${tier.color}` }, tier.name), h('div', { class: 'small' }, `${store.rta.mmr} MMR · ${store.rta.wins}W / ${store.rta.losses}L`)),
          h('div', { class: 'small dim', style: 'max-width:480px' }, 'Real-time PvP with the Champion-league draft: each player secretly pre-bans 2 heroes, a coin flip decides first pick, picks alternate 1-2-2-2-2-1, every 3rd pick is protected, then each side post-bans one enemy hero and the remaining 4v4 fight live with a 30-second turn timer.'),
          h('div', { class: 'row wrap center' },
            h('button', { class: 'btn big', onclick: () => queue('ranked') }, icon('sword-clash'), 'Ranked'),
            h('button', { class: 'btn big violet', onclick: () => queue('mock') }, icon('rolling-dices'), 'Mock Draft'),
            h('button', { class: 'btn ghost', onclick: () => leaderboard('rta') }, icon('podium-winner'), 'Rankings'),
          ),
          h('div', { class: 'tiny mute' }, 'Ranked uses your own roster and builds (5+ heroes). Mock Draft gives both players all 60 heroes at reference endgame builds. If no player is found within a few seconds you are matched against an AI duelist.'),
          queueBox, status,
        ),
      ),
    ),
  ));
  try {
    await connect();
    status.textContent = 'Connected.';
    const st = await api.rtaStatus().catch(() => null);
    if (st) status.textContent = `${st.online} online · ${st.matches} live matches`;
  } catch (e) { status.textContent = (e as Error).message; }

  off = listen((m) => {
    if (m.t === 'queued') {
      clear(queueBox);
      const started = Date.now();
      const tEl = h('div', { class: 'timer' }, '0s');
      const iv = setInterval(() => { if (!tEl.isConnected) return clearInterval(iv); tEl.textContent = `${Math.floor((Date.now() - started) / 1000)}s`; }, 500);
      queueBox.append(h('div', { class: 'spin' }), h('div', { class: 'title' }, m.mode === 'mock' ? 'Searching · Mock Draft' : 'Searching · Ranked'), tEl, h('button', { class: 'btn ghost sm', onclick: () => { send({ t: 'cancel' }); clear(queueBox); } }, 'Cancel'));
    }
    if (m.t === 'error') toast(m.msg, 'err');
    if (m.t === 'match') { off?.(); off = null; sfx('j_match'); void go('draft', m); }
    if (m.t === 'hello' && m.inMatch) toast('Reconnecting to your match…');
  });
  async function queue(mode: 'ranked' | 'mock') {
    try { await connect(); } catch (e) { return toast((e as Error).message, 'err'); }
    send({ t: 'queue', mode });
  }
});

register('draft', async (match: any) => {
  void music('arena');
  hideMenuStage();
  const you: 0 | 1 = match.you;
  const players = match.players as { name: string; mmr: number; bot: boolean; roster: string[] }[];
  let draft: DraftState & { picker: { side: 0 | 1; count: number } | null } = match.draft;
  let selection: string[] = [];
  let preban: string[] = [];
  let battleStarted = false;
  const root = h('div', { class: 'screen', style: 'background:radial-gradient(ellipse at 50% 0%, #2a1a4a, #07060d 70%)' });
  $ui().appendChild(root);
  const off = listen((m) => {
    if (m.t === 'draft') { draft = m.draft; selection = []; render(); if (draft.phase === 'pick' && draft.picker?.side === you) sfx('ui_bong'); }
    if (m.t === 'battle' && !battleStarted) { battleStarted = true; startBattle(m); }
    if (m.t === 'error') toast(m.msg, 'err');
    if (m.t === 'end' && !battleStarted) { toast(m.reason || 'Match ended.'); off(); void go('rta'); }
    if (m.t === 'closed' && !battleStarted) { toast('Disconnected from the World Arena.', 'err'); void go('rta'); }
  });
  onLeave(() => { off(); clearInterval(timer); });

  const timerEl = h('div', { class: 'timer' });
  const timer = setInterval(() => { timerEl.textContent = `${Math.max(0, Math.ceil((draft.deadline - Date.now()) / 1000))}`; }, 250);

  const sideBox = (side: 0 | 1) => {
    const p = players[side];
    const picks = draft.picks[side];
    const opp = (1 - side) as 0 | 1;
    const box = h('div', { class: `draft-side panel ${side === you ? 'me' : 'opp'}` },
      h('div', { class: 'row between' }, h('div', { class: 'pname', style: `color:${side === you ? '#8ad8ff' : '#ff8a9a'}` }, p.name, p.bot ? h('span', { class: 'tiny dim' }, ' (AI)') : null), h('span', { class: 'tiny dim' }, `${p.mmr} MMR`)),
      h('div', { class: 'tiny dim' }, `${side === draft.first ? 'FIRST PICK' : 'SECOND PICK'}`),
      h('div', { class: 'tiny dim' }, 'PRE-BANS'),
      h('div', { class: 'prebans' }, (draft.prebans[side] || []).map((id) => h('div', { class: 'mini', title: getHero(id).name, style: 'filter:grayscale(1);opacity:.7' }, portraitImg(id, '')))),
    );
    for (let i = 0; i < 5; i++) {
      const id = picks[i];
      const active = draft.phase === 'pick' && draft.picker?.side === side && i >= picks.length && i < picks.length + draft.picker.count;
      const banned = id && draft.postbans[opp] === id;
      box.appendChild(h('div', { class: `pickslot ${active ? 'active' : ''} ${banned ? 'banned' : ''} ${id && i === PROTECTED_PICK ? 'prot' : ''}`, onclick: () => {
        if (draft.phase === 'postban' && side !== you && id && i !== PROTECTED_PICK && !draft.postbans[you]) { send({ t: 'postban', hero: id }); sfx('ui_confirm'); }
      } },
        id ? h('div', { class: 'mini' }, portraitImg(id, '')) : h('div', { class: 'mini', style: 'display:grid;place-items:center;color:var(--mute)' }, String(i + 1)),
        id ? h('div', {}, h('div', { class: 'small' }, getHero(id).name), h('div', { class: 'tiny dim' }, getHero(id).title)) : h('div', { class: 'tiny mute' }, active ? 'Picking…' : ''),
      ));
    }
    return box;
  };

  const render = () => {
    clear(root);
    const phaseLabel = draft.phase === 'preban' ? `PRE-BAN · choose up to ${PREBAN_COUNT}` : draft.phase === 'pick' ? (draft.picker?.side === you ? `YOUR PICK · choose ${draft.picker.count}` : 'OPPONENT IS PICKING') : draft.phase === 'postban' ? (draft.postbans[you] ? 'WAITING FOR OPPONENT' : 'POST-BAN · tap an enemy pick (protected 3rd pick excluded)') : 'BATTLE STARTING';
    const banned = new Set([...(draft.prebans[0] || []), ...(draft.prebans[1] || [])]);
    const taken = new Set([...draft.picks[0], ...draft.picks[1]]);
    const pool = draft.phase === 'preban' ? PLAYABLE().map((x) => x.id) : players[you].roster;
    const sorted = pool.slice().sort((a, b) => getHero(b).rarity - getHero(a).rarity || a.localeCompare(b));
    const grid = h('div', { class: 'grid' }, sorted.map((id) => {
      const d = getHero(id);
      const dis = draft.phase === 'pick' && (banned.has(id) || taken.has(id));
      const sel = draft.phase === 'preban' ? preban.includes(id) : selection.includes(id);
      const card = h('div', { class: `hcard r${d.rarity} ${sel ? 'sel' : ''} ${dis ? 'dis' : ''}`, title: `${d.name} — ${d.tagline}`, onclick: () => {
        if (dis) return;
        sfx('ui_click');
        if (draft.phase === 'preban') { preban = preban.includes(id) ? preban.filter((x) => x !== id) : preban.length < PREBAN_COUNT ? [...preban, id] : preban; render(); }
        else if (draft.phase === 'pick' && draft.picker?.side === you) { selection = selection.includes(id) ? selection.filter((x) => x !== id) : selection.length < draft.picker.count ? [...selection, id] : [...selection.slice(1), id]; render(); }
      } }, portraitImg(id), h('div', { class: 'lv' }, h('span', { class: 'nm' }, d.name), tierBadge(id)));
      const el = h('div', { class: 'el' }, icon(ELEMENT_ICON[d.element], ELEMENT_COLORS[d.element]));
      card.appendChild(el);
      return card;
    }));
    const action = draft.phase === 'preban' && !(draft.prebans[you] || []).length
      ? h('button', { class: 'btn red', onclick: () => { send({ t: 'preban', heroes: preban }); sfx('ui_confirm'); } }, `Confirm pre-ban (${preban.length}/${PREBAN_COUNT})`)
      : draft.phase === 'pick' && draft.picker?.side === you
        ? h('button', { class: 'btn', disabled: selection.length !== draft.picker.count ? true : undefined, onclick: () => { send({ t: 'pick', heroes: selection }); sfx('ui_confirm'); } }, `Lock in (${selection.length}/${draft.picker.count})`)
        : null;
    root.appendChild(h('div', { class: 'draft' },
      h('div', { class: 'draft-head panel' },
        h('button', { class: 'iconbtn', title: 'Leave match', onclick: () => { if (confirm('Leave the match? It counts as a loss.')) { send({ t: 'leave' }); void go('rta'); } } }, icon('return-arrow')),
        h('div', { class: 'phase title' }, phaseLabel),
        h('div', { class: 'row' }, action, timerEl),
      ),
      sideBox(you),
      h('div', { class: 'draft-pool panel' }, h('div', { class: 'tiny dim' }, draft.phase === 'preban' ? 'All heroes — pre-bans are secret and apply to both players' : 'Your roster · tier badges come from the balance simulator'), h('div', { class: 'scroll grow' }, grid)),
      sideBox((1 - you) as 0 | 1),
    ));
  };
  render();

  function startBattle(m: any) {
    off();
    clearInterval(timer);
    root.remove();
    void runBattle({
      config: m.config, ai: 'normal', theme: 'arena', title: `World Arena · ${players[0].name} vs ${players[1].name}`, music: 'arena',
      rta: { you, send, inputs: m.inputs || [], subscribe: listen, deadline: m.deadline },
      onExit: async () => { await store.refresh(); void go('rta'); },
    });
  }
});
