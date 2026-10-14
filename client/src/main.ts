import '@fontsource/cinzel/600.css';
import '@fontsource/cinzel/700.css';
import '@fontsource/marcellus/400.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './style.css';
import '@shared/data/index';
import { getHero } from '@shared/engine/registry';
import { PROLOGUE } from '@shared/data/campaign';
import { api, setToken, store, token } from './core/api';
import { $ui, h, icon, modal, toast } from './core/dom';
import { music, saveAudioSettings, settings, sfx, unlockAudio } from './core/audio';
import { preloadCore } from './g3d/assets';
import { preloadFx } from './g3d/fxtex';
import { hideMenuStage, menuStage, showHeroes } from './menu3d';
import { currencies, go, playDialogue, register } from './ui';
import { runBattle } from './battle/session';
import './screens/heroes';
import './screens/summon';
import './screens/campaign';
import './screens/arena';
import './screens/rta';
import './screens/codex';

// resolved against the page so the build works from any base path
document.documentElement.style.setProperty('--frame-img', `url("${new URL('assets/ui/frame.png', document.baseURI).href}")`);

// ───────────────────────── boot ─────────────────────────
const loading = h('div', { class: 'loading' }, h('div', { class: 'col center' }, h('div', { class: 'logo', style: 'font-size:42px' }, 'AETHRA'), h('div', { class: 'spin' }), h('div', { class: 'tiny dim', id: 'loadmsg' }, 'Summoning the Seven Thrones…')));
document.body.appendChild(loading);
window.addEventListener('pointerdown', () => unlockAudio(), { once: false });
window.addEventListener('keydown', () => unlockAudio(), { once: true });

async function boot() {
  preloadFx();
  await preloadCore();
  menuStage();
  loading.style.opacity = '0';
  setTimeout(() => loading.remove(), 600);
  if (token) {
    try {
      await store.refresh();
      return enterGame();
    } catch {
      setToken(null);
    }
  }
  void go('title');
}

export async function enterGame() {
  if (!store.profile!.campaign.tutorialDone) return go('intro');
  return go('lobby');
}

// ───────────────────────── title & auth ─────────────────────────
register('title', async () => {
  void music('title');
  void showHeroes(['seraphine', 'aurel', 'nocturne'], 'title');
  const formBox = h('div', {});
  const press = h('div', { class: 'press' }, 'Tap to begin');
  const scr = h('div', { class: 'screen titlescreen' },
    h('div', { class: 'logo' }, 'AETHRA'),
    h('div', { class: 'logo-sub' }, 'Seven Thrones'),
    press,
    formBox,
    h('div', { class: 'tiny mute', style: 'position:absolute;bottom:10px;right:14px' }, 'v1.0 · CC0 art by Quaternius & Kenney · icons by game-icons.net'),
  );
  $ui().appendChild(scr);
  const showAuth = (mode: 'login' | 'register') => {
    press.remove();
    formBox.innerHTML = '';
    const user = h('input', { class: 'input', placeholder: 'Name (3–16 letters/numbers)', autocomplete: 'username', maxlength: '16' }) as HTMLInputElement;
    const pass = h('input', { class: 'input', type: 'password', placeholder: 'Password (8+ characters)', autocomplete: mode === 'login' ? 'current-password' : 'new-password' }) as HTMLInputElement;
    const btn = h('button', { class: 'btn big', style: 'width:100%' }, mode === 'login' ? 'Enter Aethra' : 'Create Account');
    const submit = async () => {
      btn.setAttribute('disabled', '');
      try {
        const r = mode === 'login' ? await api.login(user.value.trim(), pass.value) : await api.register(user.value.trim(), pass.value);
        setToken(r.token);
        await store.refresh();
        sfx('j_match');
        void enterGame();
      } catch (e) {
        toast((e as Error).message, 'err');
      } finally {
        btn.removeAttribute('disabled');
      }
    };
    btn.addEventListener('click', submit);
    pass.addEventListener('keydown', (e) => { if (e.key === 'Enter') void submit(); });
    formBox.appendChild(h('div', { class: 'auth panel gilded col' },
      h('h2', { class: 'title' }, mode === 'login' ? 'Welcome back, Bellbearer' : 'Answer the Covenant Bell'),
      h('label', {}, 'Name'), user, h('label', {}, 'Password'), pass, btn,
      h('div', { class: 'switch' }, mode === 'login' ? 'New here? ' : 'Have an account? ', h('a', { onclick: () => showAuth(mode === 'login' ? 'register' : 'login') }, mode === 'login' ? 'Create an account' : 'Sign in')),
    ));
    user.focus();
  };
  scr.addEventListener('click', () => { if (press.isConnected) { sfx('ui_confirm'); showAuth('register'); } });
});

// ───────────────────────── prologue + tutorial ─────────────────────────
register('intro', async () => {
  void music('title');
  await showHeroes(['seraphine', 'aurel', 'verity'], 'pair');
  await playDialogue(PROLOGUE);
  const t = await api.action<{ battleId: string; config: any; ai: any }>('startTutorial');
  hideMenuStage();
  await runBattle({
    config: t.config, ai: t.ai, theme: 'arena', title: 'Prologue: The Lost Hour', music: 'battle', canSurrender: false,
    finish: async (inputs) => {
      const r = await api.action<any>('finishBattle', { battleId: t.battleId, inputs });
      return { win: r.win, rewards: r.gift ? { gift: r.gift } : undefined, extra: h('div', { class: 'dim' }, r.win ? 'The wisps scatter. The bell answers you.' : 'You fall — but the Choir drags you back. Try again from the lobby.') };
    },
    onExit: async () => {
      await store.refresh();
      if (!store.profile!.campaign.tutorialDone) {
        toast('The prologue must be won to continue.');
        return go('intro');
      }
      await playDialogue([
        { who: 'seraphine', text: 'You did it. The Bell chose well. I\'ll stay by your side — and I\'ve called a few friends.' },
        { who: 'narrator', text: 'Seraphine has joined your roster. You also received 3,000 Aether Crystals: visit the Summoning Altar to call more heroes.' },
      ]);
      return go('lobby');
    },
  });
});

// ───────────────────────── lobby ─────────────────────────
register('lobby', async () => {
  void music('lobby');
  menuStage();
  const p = store.profile!;
  const featured = p.heroes.slice().sort((a, b) => getHero(b.heroId).rarity - getHero(a.heroId).rarity || b.level - a.level)[0];
  const fd = getHero(featured?.heroId || 'seraphine');
  void showHeroes([fd.id], 'lobby');
  const item = (ic: string, name: string, desc: string, target: string, badge?: string) => h('div', { class: 'menu-item', onclick: () => { sfx('ui_select'); void go(target); } },
    h('div', { class: 'mi-ico' }, icon(ic)),
    h('div', {}, h('div', { class: 'mi-name' }, name), h('div', { class: 'mi-desc' }, desc)),
    badge ? h('span', { class: 'badge' }, badge) : null,
  );
  const today = new Date().toISOString().slice(0, 10);
  const dailyReady = p.daily.last !== today;
  const scr = h('div', { class: 'screen' }, h('div', { class: 'lobby' },
    h('div', { class: 'topbar' },
      h('div', { class: 'row grow' }, h('div', { class: 'logo', style: 'font-size:26px' }, 'AETHRA'), h('span', { class: 'pill' }, icon('person'), store.user?.username || p.name)),
      currencies(),
    ),
    h('div', { class: 'featured' },
      h('div', { class: 'htitle' }, fd.title),
      h('div', { class: 'hname' }, fd.name),
      h('div', { class: 'quote' }, `“${fd.quote}”`),
    ),
    h('div', { class: 'menu' },
      item('treasure-map', 'Campaign', 'The story of the stolen hours', 'campaign'),
      item('three-friends', 'Heroes', `${p.heroes.length} heroes · upgrade & gear`, 'heroes'),
      item('magic-portal', 'Summon', 'Call heroes with Aether Crystals', 'summon'),
      item('crossed-swords', 'Arena', 'Attack defense teams for rank', 'arena'),
      item('sword-clash', 'World Arena', 'Real-time draft PvP', 'rta'),
      item('open-book', 'Codex', 'Meta, tier list & mechanics', 'codex'),
    ),
    h('div', { class: 'bottombar' },
      dailyReady ? h('button', { class: 'btn violet', onclick: async (e: Event) => { const r = await api.action<any>('daily'); sfx('coins'); toast(`Daily gift: ${r.crystals} crystals, ${r.gold} gold, ${r.mola} molagora, ${r.runes} runes`, 'ok'); (e.target as HTMLElement).remove(); } }, icon('open-treasure-chest'), 'Daily Gift') : null,
      h('button', { class: 'iconbtn', title: 'Settings', onclick: () => openSettings() }, icon('auto-repair')),
    ),
  ));
  $ui().appendChild(scr);
});

export function openSettings() {
  const vol = (label: string, key: 'music' | 'sfx') => {
    const inp = h('input', { type: 'range', min: '0', max: '1', step: '0.05', value: String(settings[key]), style: 'width:100%' }) as HTMLInputElement;
    inp.addEventListener('input', () => { settings[key] = Number(inp.value); saveAudioSettings(); });
    return h('div', { class: 'col', style: 'gap:4px' }, h('label', { class: 'tiny dim' }, label), inp);
  };
  const m = modal(h('div', { class: 'col' },
    h('h2', { class: 'title' }, 'Settings'),
    vol('Music volume', 'music'),
    vol('Effects volume', 'sfx'),
    h('label', { class: 'row' }, (() => { const c = h('input', { type: 'checkbox' }) as HTMLInputElement; c.checked = settings.muted; c.addEventListener('change', () => { settings.muted = c.checked; saveAudioSettings(); }); return c; })(), 'Mute all audio'),
    h('div', { class: 'sep' }),
    h('div', { class: 'tiny dim' }, `Signed in as ${store.user?.username}`),
    h('div', { class: 'row', style: 'justify-content:flex-end' },
      h('button', { class: 'btn red', onclick: async () => { try { await api.logout(); } catch { /* ignore */ } setToken(null); m.close(); location.reload(); } }, 'Sign out'),
      h('button', { class: 'btn', onclick: () => m.close() }, 'Close'),
    ),
  ));
}

void boot().catch((e) => {
  console.error(e);
  const msg = document.getElementById('loadmsg');
  if (msg) msg.textContent = 'Failed to load: ' + (e as Error).message;
});
