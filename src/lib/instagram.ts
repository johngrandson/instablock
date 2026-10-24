// Anti-corruption layer: drives Instagram's own buttons so its JS builds every request.
// Only LABELS depends on the account's UI language. Add a row per language.
import { PACING, wait } from './pacing';

const LABELS = {
  following: ['Following', 'Requested', 'Seguindo', 'Solicitado'],
  unfollow: ['Unfollow', 'Deixar de seguir'],
  follow: ['Follow', 'Follow Back', 'Seguir', 'Seguir de volta'],
  options: ['Options', 'Opções'],
  block: ['Block', 'Bloquear'],
  unblock: ['Unblock', 'Desbloquear'],
};

type Label = keyof typeof LABELS;
const WAIT_MS = 15_000;

export type StepResult = 'done' | 'skipped';

const isVisible = (el: HTMLElement) => el.getClientRects().length > 0;
const labelOf = (el: HTMLElement) =>
  el.innerText.trim() || el.querySelector('svg')?.getAttribute('aria-label') || '';

// Innermost visible button whose label is in LABELS[key].
function findControl(key: Label, root: ParentNode = document) {
  const matches = [...root.querySelectorAll<HTMLElement>('button, [role="button"]')].filter(
    (el) => isVisible(el) && LABELS[key].includes(labelOf(el)),
  );
  return matches.find((el) => !matches.some((other) => other !== el && el.contains(other)));
}

const topDialog = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].at(-1);

function waitFor<T>(what: string, find: () => T | undefined | false, ms = WAIT_MS): Promise<T> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + ms;
    const tick = () => {
      const found = find();
      if (found) return resolve(found);
      if (Date.now() > deadline) return reject(new Error(`timeout waiting for ${what}`));
      setTimeout(tick, 250);
    };
    tick();
  });
}

// Pointer sequence at a random point inside the element, with a press duration, instead of a bare
// .click() that reports coordinates 0,0.
// shortcut: events are isTrusted:false like any script click; upgrade to chrome.debugger
// Input.dispatchMouseEvent if Instagram starts rejecting synthetic clicks.
async function humanClick(el: HTMLElement) {
  const box = el.getBoundingClientRect();
  const point = {
    clientX: box.left + box.width * (0.3 + Math.random() * 0.4),
    clientY: box.top + box.height * (0.3 + Math.random() * 0.4),
  };
  const fire = (type: string, buttons: number) =>
    el.dispatchEvent(
      new PointerEvent(type, { ...point, buttons, bubbles: true, cancelable: true, composed: true, pointerType: 'mouse', isPrimary: true }),
    );
  for (const type of ['pointerover', 'mouseover', 'pointermove', 'mousemove']) fire(type, 0);
  for (const type of ['pointerdown', 'mousedown']) fire(type, 1);
  await wait([0.06, 0.14]);
  for (const type of ['pointerup', 'mouseup', 'click']) fire(type, 0);
}

/** Reads the profile like a person: pause, scroll down, scroll back up, pause. */
export async function dwell() {
  await wait(PACING.dwell);
  window.scrollBy({ top: 200 + Math.random() * 400, behavior: 'smooth' });
  await wait([1, 2.5]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
  await wait([0.5, 1.5]);
}

// `except` skips the button already clicked, so a confirm dialog reusing the label is not mistaken for the first one.
async function clickInDialog(key: Label, except?: HTMLElement) {
  const button = await waitFor(`${key} in dialog`, () => {
    const dialog = topDialog();
    const found = dialog && findControl(key, dialog);
    return found && found !== except ? found : undefined;
  });
  await wait(PACING.reaction);
  await humanClick(button);
  return button;
}

/** Resolves false when the profile never renders (not found, unavailable). */
export const profileReady = () =>
  waitFor('options button', () => findControl('options')).then(
    () => true,
    () => false,
  );

export async function unfollow(): Promise<StepResult> {
  const button = findControl('following');
  if (!button) return 'skipped';
  await humanClick(button);
  await clickInDialog('unfollow');
  await waitFor('follow button', () => findControl('follow'));
  return 'done';
}

export async function block(): Promise<StepResult> {
  const button = findControl('options');
  if (!button) return 'skipped';
  await humanClick(button);
  const first = await clickInDialog('block');
  await clickInDialog('block', first);
  await waitFor('unblock button', () => findControl('unblock'));
  return 'done';
}
