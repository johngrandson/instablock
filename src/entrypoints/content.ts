import { browser, defineContentScript } from '#imports';
import { step } from '@/lib/runner';

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  main(ctx) {
    const controller = new AbortController();
    const probe = (message: unknown, sender: { id?: string }, respond: (value: unknown) => void) => {
      if (sender.id === browser.runtime.id && message && typeof message === 'object' && 'type' in message && message.type === 'probe') respond({ ready: true });
    };
    browser.runtime.onMessage.addListener(probe);
    ctx.onInvalidated(() => {
      controller.abort();
      browser.runtime.onMessage.removeListener(probe);
    });
    void step(controller).catch((error) => {
      if (!controller.signal.aborted) console.error('InstaBlock:', error);
    });
  },
});
