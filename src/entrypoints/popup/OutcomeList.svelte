<script lang="ts">
  import type { Outcome } from '@/lib/campaign';

  let { outcomes }: { outcomes: Outcome[] } = $props();

  const DOT: Record<Outcome['result'], string> = {
    done: 'bg-teal-500',
    skipped: 'bg-muted-foreground-1',
    failed: 'bg-red-500',
  };
</script>

<ul class="divide-y divide-layer-line max-h-44 overflow-y-auto">
  {#each outcomes as { target, result, reason }}
    <li class="flex items-center gap-x-3 py-2">
      <span class="size-1.5 shrink-0 rounded-full {DOT[result]}"></span>
      <span class="text-sm text-foreground truncate">{target}</span>
      <span class="ms-auto shrink-0 text-xs text-muted-foreground-1">{reason ?? result}</span>
    </li>
  {/each}
</ul>
