// Campaign: chapters → stages → story → team select → verified battle → rewards.
import { getHero } from '@shared/engine/registry';
import { CHAPTERS, STAGES, STAGE_BY_ID, type StageDef } from '@shared/data/campaign';
import { $ui, fmt, h, icon, modal, toast } from '../core/dom';
import { api, store } from '../core/api';
import { music, sfx } from '../core/audio';
import { go, playDialogue, pickTeam, register, topbar } from '../ui';
import { hideMenuStage, showHeroes } from '../menu3d';
import { runBattle } from '../battle/session';
import { portraitImg } from '../g3d/portraits';

let chapterSel = 1;

const unlocked = (st: StageDef) => {
  const c = store.profile!.campaign.cleared;
  const prev = st.index > 1 ? `${st.chapter}-${st.index - 1}` : st.chapter > 1 ? `${st.chapter - 1}-10` : null;
  return !prev || prev in c;
};

register('campaign', async () => {
  void music('map');
  const cleared = store.profile!.campaign.cleared;
  // default to the furthest chapter reached
  const furthest = STAGES.filter(unlocked).pop();
  if (furthest && !(`${chapterSel}-1` in cleared) && chapterSel === 1) chapterSel = furthest.chapter;
  const ch = CHAPTERS[chapterSel - 1];
  void showHeroes(STAGES.filter((s) => s.chapter === chapterSel && s.boss).map((s) => s.waves[s.waves.length - 1][0].id), 'lobby');
  const chapters = h('div', { class: 'chapters' }, CHAPTERS.map((c) => {
    const open = unlocked(STAGE_BY_ID[`${c.id}-1`]);
    const done = STAGES.filter((s) => s.chapter === c.id && s.id in cleared).length;
    return h('div', { class: `chapter ${c.id === chapterSel ? 'on' : ''} ${open ? '' : 'locked'}`, style: `border-left:3px solid ${c.color}`, onclick: () => { if (!open) return toast('Clear the previous chapter first.'); chapterSel = c.id; sfx('ui_select'); void go('campaign'); } },
      h('div', { class: 'tiny dim' }, `Chapter ${c.id}`), h('div', { class: 'cn' }, c.name), h('div', { class: 'tiny', style: `color:${c.color}` }, `${done}/10 cleared`));
  }));
  const stages = h('div', { class: 'stages' }, STAGES.filter((s) => s.chapter === chapterSel).map((s) => {
    const open = unlocked(s);
    const stars = cleared[s.id] || 0;
    const bossId = s.boss ? s.waves[s.waves.length - 1][0].id : null;
    return h('div', { class: `stage ${open ? '' : 'locked'} ${s.boss ? 'boss' : ''}`, onclick: () => { if (!open) return toast('Clear the previous stage first.'); sfx('ui_select'); stageModal(s); } },
      h('div', { class: 'row between' }, h('span', { class: 'sid' }, `${s.id}${s.boss ? ' · BOSS' : ''}`), h('span', { class: 'stars3' }, stars ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '')),
      h('div', { class: 'sn' }, s.name),
      h('div', { class: 'tiny dim' }, `Recommended Lv ${s.level} · ${s.stamina} stamina`),
      bossId ? h('div', { class: 'tiny', style: 'color:#ff8a9a' }, getHero(bossId).name) : s.unlockHero && !(s.id in cleared) ? h('div', { class: 'tiny gold' }, `Hero reward: ${getHero(s.unlockHero).name}`) : null,
    );
  }));
  $ui().appendChild(h('div', { class: 'screen page' },
    topbar('Campaign'),
    h('div', { class: 'page-body' },
      h('div', { class: 'mainpane', style: 'margin-left:auto;max-width:900px' },
        h('div', { class: 'panel', style: 'padding:14px;display:flex;flex-direction:column;gap:12px;min-height:0;flex:1' },
          chapters,
          h('div', { class: 'row between' }, h('div', {}, h('div', { class: 'title', style: 'font-size:22px' }, ch.name), h('div', { class: 'small dim', style: 'font-family:var(--serif);font-style:italic' }, ch.subtitle)), h('button', { class: 'btn ghost sm', onclick: () => playDialogue(ch.intro) }, icon('scroll-unfurled'), 'Story')),
          h('div', { class: 'scroll grow' }, stages),
        ),
      ),
    ),
  ));
  // first visit to a chapter: play its intro
  const seenKey = `aethra.ch${chapterSel}`;
  try { if (!localStorage.getItem(seenKey)) { localStorage.setItem(seenKey, '1'); void playDialogue(ch.intro); } } catch { /* ignore */ }
});

function stageModal(s: StageDef) {
  const enemies = [...new Set(s.waves.flat().map((w) => w.id))];
  const r = s.rewards;
  const first = !(s.id in store.profile!.campaign.cleared);
  const m = modal(h('div', { class: 'col' },
    h('div', { class: 'row between' }, h('h2', { class: 'title' }, `${s.id} · ${s.name}`), s.boss ? h('span', { class: 'pill', style: 'color:#ff8a9a' }, 'BOSS') : null),
    h('div', { class: 'small dim' }, `${s.waves.length} waves · Recommended level ${s.level} · costs ${s.stamina} stamina (you have ${store.profile!.stamina})`),
    h('div', { class: 'tiny dim' }, 'ENEMIES'),
    h('div', { class: 'row wrap', style: 'gap:6px' }, enemies.map((id) => h('div', { class: 'mini', style: 'width:56px;height:56px', title: getHero(id).name }, portraitImg(id, '')))),
    h('div', { class: 'tiny dim' }, 'REWARDS'),
    h('div', { class: 'row wrap', style: 'gap:6px' },
      h('span', { class: 'cur gold' }, icon('two-coins'), fmt(r.gold)),
      h('span', { class: 'cur crys' }, icon('crystal-cluster'), String(r.crystals + (first ? r.firstCrystals : 0))),
      h('span', { class: 'cur sta' }, icon('upgrade'), `${r.xp} XP`),
      r.mola ? h('span', { class: 'cur mola' }, icon('sprout'), String(r.mola)) : null,
      h('span', { class: 'cur' }, icon('battle-gear'), `${Math.round(r.gearChance * 100)}% gear (iLv ${r.gearTier})`),
      first && s.unlockHero ? h('span', { class: 'cur', style: 'color:var(--gold2)' }, icon('three-friends'), getHero(s.unlockHero).name) : null,
    ),
    h('div', { class: 'tiny mute' }, '★★★ in ≤25 actions · ★★ in ≤45 · ★ otherwise. Battles are verified by the server.'),
    h('div', { class: 'row', style: 'justify-content:flex-end' },
      h('button', { class: 'btn ghost', onclick: () => m.close() }, 'Close'),
      h('button', { class: 'btn big', onclick: async () => { m.close(); await startStage(s); } }, 'Select Team'),
    ),
  ));
}

async function startStage(s: StageDef) {
  const p = store.profile!;
  const team = await pickTeam({ title: `${s.id} · ${s.name}`, initial: p.lastTeam || p.heroes.slice(0, 4).map((x) => x.uid), enemy: [...new Set(s.waves.flat().map((w) => w.id))] });
  if (!team) return;
  let t: { battleId: string; config: any; ai: any };
  try { t = await api.action('startCampaign', { stage: s.id, team }); } catch (e) { toast((e as Error).message, 'err'); return; }
  await playDialogue(s.story);
  hideMenuStage();
  await runBattle({
    config: t.config, ai: t.ai, theme: s.scene, title: `${s.id} · ${s.name}`, music: s.boss ? 'boss' : 'battle',
    finish: async (inputs) => {
      const r = await api.action<any>('finishBattle', { battleId: t.battleId, inputs });
      return { win: r.win, rewards: r.win ? r.rewards : undefined, extra: r.win ? null : h('div', { class: 'dim' }, 'Upgrade your heroes, gear and skills — or try a different team.') };
    },
    onExit: async () => {
      await store.refresh();
      const won = s.id in store.profile!.campaign.cleared;
      if (won && s.after) await playDialogue(s.after);
      void go('campaign');
    },
  });
  void sfx;
}
