<script lang="ts">
  import type { Snippet } from 'svelte';

  type Tone = 'yellow' | 'red';
  let { tone, title, children }: { tone: Tone; title: string; children: Snippet } = $props();

  const BOX: Record<Tone, string> = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-500/20 dark:border-yellow-900 dark:text-yellow-500',
    red: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-500/20 dark:border-red-900 dark:text-red-500',
  };
</script>

<div class="border text-sm rounded-lg p-4 {BOX[tone]}" role="alert">
  <div class="flex">
    <svg
      class="shrink-0 size-4 mt-0.5"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {#if tone === 'yellow'}
        <circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" />
      {:else}
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" />
      {/if}
    </svg>
    <div class="ms-3">
      <h3 class="text-sm font-semibold">{title}</h3>
      <div class="mt-1 text-sm">{@render children()}</div>
    </div>
  </div>
</div>
