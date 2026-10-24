<script lang="ts">
  import type { Status } from '@/lib/campaign';

  let { status, detail = '' }: { status: Status; detail?: string } = $props();

  const TONES: Record<Status, { label: string; dot: string }> = {
    idle: { label: 'Pronto', dot: 'bg-muted-foreground-1' },
    running: { label: 'Rodando', dot: 'bg-primary animate-pulse' },
    stopped: { label: 'Parado', dot: 'bg-yellow-500' },
    capped: { label: 'Limite', dot: 'bg-yellow-500' },
    finished: { label: 'Concluído', dot: 'bg-teal-500' },
    failed: { label: 'Falhou', dot: 'bg-red-500' },
  };
  const tone = $derived(TONES[status]);
</script>

<span class="inline-flex items-center gap-x-1.5 min-w-0 text-xs text-muted-foreground-1">
  <span class="size-1.5 shrink-0 rounded-full {tone.dot}"></span>
  <span class="truncate">{tone.label}{detail ? ` · ${detail}` : ''}</span>
</span>
