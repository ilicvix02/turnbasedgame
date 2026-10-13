// Minimal DOM toolkit: element builder, icons, toasts, modals, tooltips.
import ICONS from '../gen/icons.json';
import { sfx } from './audio';

type Child = Node | string | number | null | undefined | false | Child[];
type Attrs = Record<string, unknown> & { class?: string; style?: string | Partial<CSSStyleDeclaration>; on?: Record<string, (e: any) => void> };

export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Attrs | Child, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (attrs && (typeof attrs !== 'object' || attrs instanceof Node || Array.isArray(attrs))) {
    children.unshift(attrs as Child);
  } else if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k === 'on') {
        for (const [ev, fn] of Object.entries(v as Record<string, (e: Event) => void>)) el.addEventListener(ev, fn);
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  append(el, children);
  return el;
}

function append(el: Node, children: Child[]) {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

const ICON_MAP = ICONS as Record<string, string>;
export function iconSvg(name: string, color?: string): string {
  const body = ICON_MAP[name] || ICON_MAP['sparkles'] || '';
  return `<svg class="ico" viewBox="0 0 512 512"${color ? ` style="fill:${color}"` : ''}>${body}</svg>`;
}
export function icon(name: string, color?: string): HTMLElement {
  const s = document.createElement('span');
  s.style.display = 'contents';
  s.innerHTML = iconSvg(name, color);
  return s.firstElementChild as HTMLElement;
}
export function hasIcon(name: string) {
  return !!ICON_MAP[name];
}

export function clear(el: Element) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

export const $ui = () => document.getElementById('ui')!;
export const $overlay = () => document.getElementById('overlay')!;

export function toast(msg: string, kind: 'ok' | 'err' | '' = '') {
  const t = h('div', { class: `toast ${kind}` }, msg);
  document.getElementById('toasts')!.appendChild(t);
  if (kind === 'err') sfx('ui_error');
  setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 450); }, kind === 'err' ? 3600 : 2600);
}

export function modal(content: Node, opts: { wide?: boolean; onClose?: () => void; dismissable?: boolean } = {}) {
  const box = h('div', { class: `modal panel gilded ${opts.wide ? 'wide' : ''}` }, content);
  const back = h('div', { class: 'modal-back' }, box);
  const close = () => { back.remove(); opts.onClose?.(); };
  if (opts.dismissable !== false) back.addEventListener('pointerdown', (e) => { if (e.target === back) { sfx('ui_close'); close(); } });
  document.body.appendChild(back);
  sfx('ui_open');
  return { close, box };
}

export function confirmDialog(title: string, text: string, okLabel = 'Confirm'): Promise<boolean> {
  return new Promise((resolve) => {
    const m = modal(h('div', { class: 'col' },
      h('h2', { class: 'title' }, title),
      h('div', { class: 'dim' }, text),
      h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:8px' },
        h('button', { class: 'btn ghost', onclick: () => { m.close(); resolve(false); } }, 'Cancel'),
        h('button', { class: 'btn', onclick: () => { sfx('ui_confirm'); m.close(); resolve(true); } }, okLabel),
      ),
    ), { onClose: () => resolve(false) });
  });
}

let tipEl: HTMLElement | null = null;
export function tooltip(target: HTMLElement, content: () => Node | string) {
  const show = (e: PointerEvent) => {
    hideTip();
    const c = content();
    tipEl = h('div', { class: 'panel unit-tip' }, c);
    document.body.appendChild(tipEl);
    const r = tipEl.getBoundingClientRect();
    const x = Math.min(window.innerWidth - r.width - 8, Math.max(8, e.clientX + 14));
    const y = Math.min(window.innerHeight - r.height - 8, Math.max(8, e.clientY + 14));
    tipEl.style.left = x + 'px';
    tipEl.style.top = y + 'px';
  };
  target.addEventListener('pointerenter', show);
  target.addEventListener('pointerleave', hideTip);
}
export function hideTip() {
  tipEl?.remove();
  tipEl = null;
}

export const fmt = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : Math.round(n).toLocaleString());
export const pct = (n: number) => `${Math.round(n * 100)}%`;
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Highlight game keywords inside skill text. */
const KEYWORDS = ['Stun', 'Sleep', 'Provoke', 'Silence', 'Burn', 'Bleed', 'Poison', 'Curse', 'Doom', 'Unhealable', 'Unbuffable', 'Immunity', 'Barrier', 'Invincibility', 'Stealth', 'Counterattack', 'Extra Turn', 'extra turn', 'Combat Readiness', 'Soul Burn', 'Echo', 'Fate Thread', 'Imprison', 'Extinction', 'Target', 'Exposed', 'Fear', 'Restrict', 'Bloom', 'Vampirism', 'Immortality', 'Dominion', 'Decrease Defense', 'Decreased Defense', 'Decrease Attack', 'Decrease Speed', 'Decreased Speed', 'Decrease Hit Chance', 'Increased Attack', 'Greater Attack', 'Increased Defense', 'Increased Speed', 'Increased Critical Hit Chance', 'Continuous Heal', 'Lumen', 'Thirst', 'Penance', 'Thesis', 'Overcharge', 'Resonance', 'Vanguard', 'Pierce', 'Grudge', 'Detonate', 'detonates'];
const KW_RE = new RegExp(`(${KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length).join('|')})`, 'g');
export function richText(s: string): HTMLElement {
  const el = h('span');
  const esc = s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  el.innerHTML = esc.replace(KW_RE, '<span class="kw">$1</span>').replace(/(\d+(?:\.\d+)?%)/g, '<b>$1</b>');
  return el;
}
