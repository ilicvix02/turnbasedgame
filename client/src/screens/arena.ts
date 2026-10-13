// Arena (asynchronous PvP): rank, flags, defense team, opponents (players + NPC challengers), log, leaderboard.
import { getHero } from '@shared/engine/registry';
import { arenaRank, FLAG_REGEN_MS } from '@shared/meta/profile';
import { $ui, h, icon, modal, toast } from '../core/dom';
import { api, store } from '../core/api';
import { music, sfx } from '../core/audio';
import { go, pickTeam, register, topbar } from '../ui';
import { hideMenuStage, showHeroes } from '../menu3d';
import { runBattle } from '../battle/session';
import { portraitImg } from '../g3d/portraits';

register('arena', async () => {
  void music('arena');
  const [st, opp] = await Promise.all([api.arena(), api.opponents()]);
  const p = store.profile!;
  const rank = arenaRank(st.points);
  const def = p.arena.defense.map((u) => p.heroes.find((x) => x.uid === u)).filter(Boolean);
  void showHeroes(def.length ? def.slice(0, 1).map((x) => x!.heroId) : ['vulkar'], 'lobby');
  const nextFlag = st.flags < 5 ? Math.max(0, Math.ceil((st.flagsAt + FLAG_REGEN_MS - Date.now()) / 60000)) : 0;
  const oppList = h('div', { class: 'col', style: 'gap:8px' }, opp.opponents.map((o) => h('div', { class: 'opp' },
    h('div', { class: 'col', style: 'gap:2px;min-width:120px' }, h('b', {}, o.name), h('span', { class: 'tiny dim' }, `${o.points} pts · ${arenaRank(o.points).name}${o.npc ? ' · Challenger NPC' : ''}`)),
    h('div', { class: 'minis grow' }, o.team.map((id, i) => h('div', { class: 'mini', title: getHero(id).name }, portraitImg(id, ''), h('span', { class: 'ml' }, `${o.levels[i]}`)))),
    h('button', { class: 'btn sm', onclick: () => attack(o.id, o.team) }, icon('crossed-swords'), 'Attack'),
  )));
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar('Arena'),
    h('div', { class: 'page-body' },
      h('div', { class: 'mainpane', style: 'margin-left:auto;max-width:880px' },
        h('div', { class: 'row', style: 'gap:12px;align-items:stretch' },
          h('div', { class: 'panel rank-badge' }, icon('laurel-crown', rank.color), h('div', { class: 'rn', style: `color:${rank.color}` }, rank.name), h('div', { class: 'small' }, `${st.points} points`), h('div', { class: 'tiny dim' }, `${st.wins}W / ${st.losses}L`)),
          h('div', { class: 'panel grow', style: 'padding:14px;display:flex;flex-direction:column;gap:8px' },
            h('div', { class: 'row between' }, h('b', { class: 'gold' }, 'Defense Team'), h('button', { class: 'btn sm ghost', onclick: setDefense }, 'Edit')),
            def.length ? h('div', { class: 'minis' }, def.map((x) => h('div', { class: 'mini', style: 'width:54px;height:54px' }, portraitImg(x!.heroId, '')))) : h('div', { class: 'small dim' }, 'No defense set — other players cannot challenge you until you set one.'),
            h('div', { class: 'row', style: 'gap:6px' }, h('span', { class: 'pill' }, icon('flag-objective'), `Flags ${st.flags}/5`), nextFlag ? h('span', { class: 'tiny dim' }, `next in ${nextFlag} min`) : null, h('button', { class: 'btn sm ghost', style: 'margin-left:auto', onclick: () => leaderboard('arena') }, icon('podium-winner'), 'Rankings')),
          ),
        ),
        h('div', { class: 'panel', style: 'padding:14px;display:flex;flex-direction:column;gap:10px;min-height:0;flex:1' },
          h('div', { class: 'row between' }, h('b', { class: 'gold' }, 'Opponents'), h('button', { class: 'btn sm ghost', onclick: () => void go('arena') }, icon('cycle'), 'Refresh')),
          h('div', { class: 'scroll grow' }, oppList),
          st.log?.length ? h('div', { class: 'tiny dim' }, 'Recent attacks on you: ', st.log.map((l: any) => `${l.name} ${l.win ? 'won' : 'lost'} (${l.delta > 0 ? '−' : ''}${Math.abs(Math.round(l.delta / 2))})`).join(' · ')) : null,
        ),
      ),
    ),
  ));

  async function setDefense() {
    const team = await pickTeam({ title: 'Arena Defense (4 heroes, AI controlled)', min: 4, max: 4, initial: p.arena.defense, confirm: 'Save Defense' });
    if (!team) return;
    try { await api.action('setDefense', { team }); sfx('ui_confirm'); toast('Defense saved.', 'ok'); void go('arena'); } catch (e) { toast((e as Error).message, 'err'); }
  }

  async function attack(id: number, enemy: string[]) {
    const team = await pickTeam({ title: 'Attack Team', initial: p.lastTeam || p.heroes.slice(0, 4).map((x) => x.uid), enemy });
    if (!team) return;
    let t: { battleId: string; config: any; ai: any };
    try { t = await api.action('startArena', { opponent: id, team }); } catch (e) { toast((e as Error).message, 'err'); return; }
    hideMenuStage();
    await runBattle({
      config: t.config, ai: t.ai, theme: 'arena', title: `Arena · vs ${t.config.teams[1].name}`, music: 'arena',
      finish: async (inputs) => {
        const r = await api.action<any>('finishBattle', { battleId: t.battleId, inputs });
        return { win: r.win, rewards: r.rewards, extra: h('div', { class: r.delta > 0 ? 'gold big' : 'big' }, `${r.delta > 0 ? '+' : ''}${r.delta} arena points`) };
      },
      onExit: async () => { await store.refresh(); void go('arena'); },
    });
  }
});

export async function leaderboard(kind: 'arena' | 'rta') {
  const { rows } = await api.leaderboard(kind);
  const me = store.user?.username;
  modal(h('div', { class: 'col', style: 'min-height:0' },
    h('h2', { class: 'title' }, kind === 'arena' ? 'Arena Rankings' : 'World Arena Rankings'),
    h('div', { class: 'mbody scroll', style: 'max-height:60vh' },
      h('div', { class: 'lb-row tiny dim' }, h('span', {}, '#'), h('span', {}, 'Name'), h('span', {}, kind === 'arena' ? 'Points' : 'MMR'), h('span', {}, 'W/L')),
      rows.length ? rows.map((r, i) => h('div', { class: `lb-row ${r.name === me ? 'me' : ''}` }, h('span', { class: 'gold' }, String(i + 1)), h('span', {}, r.name), h('span', {}, String(r.score)), h('span', { class: 'dim' }, `${r.wins}/${r.losses}`))) : h('div', { class: 'dim' }, 'No ranked players yet.'),
    ),
  ));
}
