import { PACING, sleep, wait } from './pacing';

const LABELS = {
  following: ['Following', 'Requested', 'Seguindo', 'Solicitado'],
  unfollow: ['Unfollow', 'Deixar de seguir'],
  follow: ['Follow', 'Follow Back', 'Seguir', 'Seguir de volta'],
  options: ['Options', 'Opções'],
  block: ['Block', 'Bloquear'],
  unblock: ['Unblock', 'Desbloquear'],
};
const UNAVAILABLE = ["Sorry, this page isn't available.", 'Esta página não está disponível.', 'Esta página não está disponível no momento.'];
type Label = keyof typeof LABELS;
export type StepResult = 'done' | 'skipped';
export type StepContext = { target: string; signal: AbortSignal; beforeClick: () => Promise<void> };

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0;
const labelOf = (el: HTMLElement) => el.innerText.trim() || el.getAttribute('aria-label') || el.querySelector('svg')?.getAttribute('aria-label') || '';

function findControl(key: Label, root: ParentNode) {
  const matches = [...root.querySelectorAll<HTMLElement>('button, [role="button"]')].filter(
    (el) => isVisible(el) && LABELS[key].includes(labelOf(el)),
  );
  return matches.find((el) => !matches.some((other) => other !== el && el.contains(other)));
}

function profileHeader(target: string) {
  const header = document.querySelector<HTMLElement>('main header');
  return header && [...header.querySelectorAll('h1, h2')].some((heading) => heading.textContent?.trim().toLowerCase() === target) ? header : undefined;
}
const profileControl = (key: Label, target: string) => {
  const header = profileHeader(target);
  return header && findControl(key, header);
};
const topDialog = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(isVisible).at(-1);

async function waitFor<T>(what: string, find: () => T | undefined | false, signal: AbortSignal): Promise<T> {
  const deadline = Date.now() + 15_000;
  while (true) {
    signal.throwIfAborted();
    const found = find();
    if (found) return found;
    if (Date.now() >= deadline) throw new Error(`timeout waiting for ${what}`);
    await sleep(250, signal);
  }
}

// Scripted events remain untrusted; pacing does not guarantee acceptance by Instagram.
async function humanClick(el: HTMLElement, context: StepContext) {
  const check = async () => {
    await context.beforeClick();
    context.signal.throwIfAborted();
    if (!el.isConnected || !isVisible(el) || el.matches(':disabled, [aria-disabled="true"]')) throw new Error('O controle do perfil mudou.');
  };
  await check();
  const box = el.getBoundingClientRect();
  const point = { clientX: box.left + box.width * (0.3 + Math.random() * 0.4), clientY: box.top + box.height * (0.3 + Math.random() * 0.4) };
  const fire = (type: string, buttons: number) => el.dispatchEvent(new PointerEvent(type, {
    ...point, buttons, bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true,
  }));
  for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove']) fire(type, 0);
  for (const type of ['pointerdown', 'mousedown']) fire(type, 1);
  await wait([0.06, 0.14], context.signal);
  await check();
  for (const type of ['pointerup', 'mouseup', 'click']) fire(type, 0);
}

export async function dwell(signal: AbortSignal) {
  await wait(PACING.dwell, signal);
  window.scrollBy({ top: 200 + Math.random() * 400, behavior: 'smooth' });
  await wait([1, 2.5], signal);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await wait([0.5, 1.5], signal);
}

async function clickInDialog(key: Label, context: StepContext, except?: HTMLElement) {
  const button = await waitFor(`${key} in dialog`, () => {
    const dialog = topDialog();
    const found = dialog && findControl(key, dialog);
    return found && found !== except ? found : undefined;
  }, context.signal);
  await wait(PACING.reaction, context.signal);
  await humanClick(button, context);
  return button;
}

export async function profileReady(context: StepContext): Promise<boolean> {
  const state = await waitFor('profile controls', () => {
    if (profileControl('options', context.target) || profileControl('unblock', context.target)) return 'ready';
    const main = document.querySelector<HTMLElement>('main');
    return main && UNAVAILABLE.some((text) => main.innerText.includes(text)) ? 'unavailable' : false;
  }, context.signal);
  if (topDialog()) throw new Error('Feche o diálogo aberto no Instagram e tente novamente.');
  return state === 'ready';
}

export async function unfollow(context: StepContext): Promise<StepResult> {
  const button = profileControl('following', context.target);
  if (!button) {
    if (profileControl('follow', context.target) || profileControl('unblock', context.target)) return 'skipped';
    throw new Error('Não foi possível identificar o estado do perfil.');
  }
  await humanClick(button, context);
  await clickInDialog('unfollow', context);
  await waitFor('follow button on target profile', () => !profileControl('following', context.target) && profileControl('follow', context.target), context.signal);
  return 'done';
}

export async function block(context: StepContext): Promise<StepResult> {
  if (profileControl('unblock', context.target)) return 'skipped';
  const button = profileControl('options', context.target);
  if (!button) throw new Error('Não foi possível localizar as opções do perfil.');
  await humanClick(button, context);
  const first = await clickInDialog('block', context);
  await clickInDialog('block', context, first);
  await waitFor('unblock button on target profile', () => profileControl('unblock', context.target), context.signal);
  return 'done';
}
