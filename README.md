# InstaBlock

Chrome extension (WXT + Svelte 5) that unfollows and/or blocks a list of Instagram profiles using
the session already logged in on a tab. It clicks Instagram's own buttons with random delays, so no
private API, no tokens, no passwords.

## Setup

```
pnpm install      # also runs `wxt prepare` (generated types in .wxt/)
pnpm test         # vitest, pure domain only
pnpm check        # svelte-check
pnpm build        # .output/chrome-mv3
pnpm dev          # dev build with reload
```

Load `.output/chrome-mv3` at `chrome://extensions` (Developer mode, Load unpacked).

## Use

The extension expects the tab to be logged in to Instagram already. It never reads or stores
credentials; a redirect to the login page halts the campaign as `failed (redirected)`.

1. On a logged-in instagram.com tab, open the popup and paste the profiles (name, `@name` or URL)
   separated by line breaks, spaces or commas. Tokens that cannot be an Instagram username
   (accents, symbols, other hosts, over 30 chars) are ignored and counted next to the field.
2. Bloquear comes selected (it also removes the follow). Pick Deixar de seguir if you only want to
   unfollow, then press Iniciar. The tab navigates profile by profile.
3. Leave that tab alone until the status reads Concluído. Parar halts after the current delay.
   Reopening the popup shows the remaining names prefilled, so Iniciar resumes.

The campaign stops at the first failure (expected button never appeared, which is also how an
Instagram action block shows up, or a redirect to login/checkpoint). Wait a few hours before
resuming.

## Code map

```
src/lib/campaign.ts         pure domain: types, transitions, username parsing. Tested.
src/lib/pacing.ts           delays, active hours, session pacing. Tested.
src/lib/campaign-store.ts   the one storage item (local:campaign)
src/lib/runner.ts           effects: one page load of the runner tab processes one target
src/lib/instagram.ts        anti-corruption layer: LABELS + clicks on the profile page
src/entrypoints/content.ts  wires message -> start, and step() on every load
src/entrypoints/popup/      Svelte popup (App.svelte)
```

## Looking human

Instagram does not say how it detects automation. Public write-ups point at regular timing, no
time spent on the page, script clicks with no coordinates, and continuing after a block. What the
extension does about it, all in `src/lib/pacing.ts` and `src/lib/instagram.ts`:

- waits 3-8 s on each profile, scrolls down and back up before acting;
- waits 0.8-2.5 s after a dialog opens before confirming;
- clicks with a pointer event sequence at a random point inside the button, with a press duration;
- acts only between 08:00 and 23:00 local time, sleeping until the window opens otherwise;
- halts on the first failure and never retries into a block.

Known limit: events dispatched from a content script are `isTrusted: false`, like every script
click. Only `chrome.debugger` can produce trusted input; it needs the `debugger` permission and
shows a banner. Not done unless Instagram starts rejecting synthetic clicks.

## Pacing and blocks

Instagram does not publish limits; its restrictions are velocity-based and depend on account
history. Vendor guides agree on 10-20 unfollows/hour as safe, 30+/hour as block territory, and
100-150/day for accounts older than six months (20-50 for new ones). `PACING` in
`src/lib/pacing.ts` targets about 15/hour: 2.5-5.5 min between targets and a 10-20 min pause
every 10 targets. `SESSION_CAP` halts a campaign after 40 targets.

Rules of thumb from the same guides: run at most once a day, keep using Instagram normally in
between, and after any "Action blocked" or checkpoint stop everything for 24 h or more. The
extension halts on the first failure for that reason.

## When Instagram changes labels

Everything language- or layout-dependent is `LABELS` at the top of `src/lib/instagram.ts`. Open a
profile, read the button texts (Following, Unfollow, Follow, the Options icon aria-label, Block,
Unblock) and add or fix a row. A `failed (timeout waiting for ...)` outcome names the missing label.

## Risks

Automation is against Instagram's terms. The account can be action-blocked for hours or days. Keep
the lists short and the delays as they are.
