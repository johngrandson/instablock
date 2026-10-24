<script lang="ts">
  import { browser } from '#imports';
  import { onMount } from 'svelte';
  import { EMPTY, SESSION_CAP, parseInput, type Action, type Campaign } from '@/lib/campaign';
  import { campaignStore } from '@/lib/campaign-store';
  import { estimateRemainingMs, formatDuration } from '@/lib/pacing';
  import { sendCommand } from '@/lib/messages';
  import Alert from './Alert.svelte';
  import OutcomeList from './OutcomeList.svelte';
  import StatusBadge from './StatusBadge.svelte';

  const ACTIONS: { value: Action; title: string }[] = [
    { value: 'block', title: 'Bloquear' },
    { value: 'unfollow', title: 'Deixar de seguir' },
  ];
  const DESCRIPTION: Record<Action, string> = {
    block: 'Bloqueia o perfil e já remove o follow.',
    unfollow: 'Só remove do seu "seguindo".',
  };
  const BUTTON =
    'w-full py-2 px-3 inline-flex justify-center items-center gap-x-2 text-sm font-medium rounded-lg border focus-visible:ring-2 focus-visible:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none';
  const SEGMENT =
    'flex-1 py-2 px-3 -ms-px first:rounded-s-lg first:ms-0 last:rounded-e-lg inline-flex justify-center items-center text-sm font-medium bg-layer border border-layer-line text-layer-foreground cursor-pointer hover:bg-layer-hover has-checked:z-10 has-checked:bg-primary has-checked:border-primary-line has-checked:text-primary-foreground has-checked:hover:bg-primary-hover has-focus-visible:ring-2 has-focus-visible:ring-primary-focus has-disabled:opacity-50 has-disabled:pointer-events-none';
  const TEXTAREA =
    'py-2 px-3 sm:py-3 sm:px-4 block w-full bg-layer border-layer-line rounded-lg sm:text-sm text-foreground placeholder:text-muted-foreground-1 focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb';

  let campaign = $state<Campaign>(EMPTY);
  let text = $state('');
  let action = $state<Action>('block');
  let error = $state('');
  let loaded = $state(false);
  let busy = $state(false);

  onMount(() => {
    let disposed = false;
    let updated = false;
    const sync = (value: Campaign | null) => {
      if (disposed) return;
      const next = value ?? EMPTY;
      if (!loaded || campaign.status === 'running' || campaign.pending.join('\n') !== next.pending.join('\n') || campaign.run?.id !== next.run?.id) {
        text = next.pending.join('\n');
        if (next.pending.length || next.outcomes.length) action = next.action;
      }
      campaign = next;
      loaded = true;
    };
    const unwatch = campaignStore.watch((value) => { updated = true; sync(value); });
    void campaignStore.getValue().then((value) => { if (!updated) sync(value); }).catch(() => {
      if (!disposed) error = 'Não foi possível carregar a campanha. Reabra o popup.';
    });
    return () => { disposed = true; unwatch(); };
  });

  const running = $derived(campaign.status === 'running');
  const parsed = $derived(parseInput(text));
  const count = $derived(parsed.targets.length);
  const processed = $derived(campaign.outcomes.filter((outcome) => outcome.result !== 'failed').length);
  const total = $derived(processed + campaign.pending.length);
  const percent = $derived(total ? Math.round((processed / total) * 100) : 0);
  const remaining = $derived(formatDuration(estimateRemainingMs(campaign.pending.length)));
  const currentTarget = $derived(campaign.pending[0] ?? '');
  const lastReason = $derived(campaign.outcomes.at(-1)?.reason ?? '');

  async function start() {
    if (busy || !loaded || running || !count) return;
    error = '';
    busy = true;
    try {
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
      if (tab?.id === undefined) throw new Error('Abra uma aba do Instagram antes de iniciar.');
      await sendCommand({ type: 'start', tabId: tab.id, action, targets: parsed.targets });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Não foi possível iniciar.';
    } finally { busy = false; }
  }

  async function stop() {
    if (busy || !campaign.run) return;
    busy = true;
    error = '';
    try { await sendCommand({ type: 'stop', runId: campaign.run.id }); }
    catch (cause) { error = cause instanceof Error ? cause.message : 'Não foi possível parar.'; }
    finally { busy = false; }
  }
</script>

<main class="p-4 flex flex-col gap-3 bg-background text-foreground">
  <header class="flex items-center justify-between gap-x-3">
    <h1 class="text-sm font-semibold">InstaBlock</h1>
    <StatusBadge status={campaign.status} detail={running ? currentTarget : ''} />
  </header>

  {#if total}
    <div>
      <div
        class="flex w-full h-1.5 bg-surface-1 rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Progresso da campanha"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="h-full rounded-full bg-primary transition duration-500" style="width: {percent}%"></div>
      </div>
      <p class="mt-1.5 text-xs text-muted-foreground-1 text-end">{processed} de {total}{running ? ` · ${remaining}` : ''}</p>
    </div>
  {/if}

  <p class="flex gap-x-2 text-xs text-muted-foreground-1" role="note">
    <svg class="shrink-0 size-4 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
    </svg>
    Abra numa aba do Instagram já logada. Só clica nos botões do perfil; não lê senha.
  </p>

  <div>
    <div class="mb-3 flex flex-wrap justify-between items-center gap-2">
      <label for="targets" class="block text-sm font-medium text-foreground">Perfis</label>
      <span class="block text-sm text-muted-foreground-1" title={parsed.ignored.join(', ')}>
        {count} {count === 1 ? 'perfil' : 'perfis'}{parsed.ignored.length ? ` · ${parsed.ignored.length} ignorado${parsed.ignored.length === 1 ? '' : 's'}` : ''}
      </span>
    </div>
    <textarea
      id="targets"
      rows="3"
      bind:value={text}
      disabled={running || busy || !loaded}
      aria-describedby="targets-help"
      placeholder="alice&#10;@bob&#10;instagram.com/carol"
      class={TEXTAREA}
    ></textarea>
    <p id="targets-help" class="mt-2 text-xs text-muted-foreground-1">nome, @nome ou URL; separe por linha, espaço ou vírgula</p>
  </div>

  <div>
    <div class="flex rounded-lg shadow-2xs" role="radiogroup" aria-label="Ação">
      {#each ACTIONS as { value, title }}
        <label class={SEGMENT}>
          <input type="radio" name="action" bind:group={action} {value} disabled={running || busy || !loaded} class="sr-only" />
          {title}
        </label>
      {/each}
    </div>
    <p class="mt-2 text-xs text-muted-foreground-1">{DESCRIPTION[action]}</p>
  </div>

  {#if running}
    <div>
      <button
        type="button"
        onclick={stop}
        disabled={busy}
        class="{BUTTON} bg-secondary border-secondary-line text-secondary-foreground hover:bg-secondary-hover focus:bg-secondary-hover"
      >
        Parar
      </button>
      <p class="mt-2 text-xs text-muted-foreground-1 text-center">Deixe esta aba aberta.</p>
    </div>
  {:else}
    <button
      type="button"
      onclick={start}
      disabled={!count || busy || !loaded}
      class="{BUTTON} bg-primary border-primary-line text-primary-foreground hover:bg-primary-hover focus:bg-primary-hover"
    >
      Iniciar
    </button>
  {/if}

  {#if error}
    <Alert tone="red" title="Não foi possível continuar">{error}</Alert>
  {:else if campaign.status === 'failed'}
    <Alert tone="red" title="Falhou em {currentTarget}">
      {lastReason === 'redirected' ? 'O Instagram redirecionou. Faça login nesta aba e clique em Iniciar.' : lastReason}
    </Alert>
  {:else if campaign.status === 'capped'}
    <Alert tone="yellow" title="Limite da sessão ({SESSION_CAP})">
      Continue amanhã com Iniciar; os perfis restantes já estão na lista.
    </Alert>
  {/if}

  {#if campaign.outcomes.length}
    <OutcomeList outcomes={campaign.outcomes} />
  {/if}

  <footer class="mt-1 flex items-center justify-center gap-x-1.5 text-xs text-muted-foreground-1">
    <!-- Nexvolt "X" mark, from nexvolt/apps/nexvolt_driver_web/priv/static/assets/brand/nexvolt-x.svg -->
    <svg class="size-3 text-[#16b674]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1278 1341" aria-hidden="true">
      <path fill="currentColor" transform="translate(44 1171) scale(1 -1)" d="M-44 -170 446 502 83 1001H384L596 710L933 1171H1234L747 502L1113 0H812L596 296L257 -170Z" />
    </svg>
    Powered by NXVLT
  </footer>
</main>
