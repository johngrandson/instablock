import { browser, defineContentScript } from '#imports';
import { start, step, type StartCommand } from '@/lib/runner';

export default defineContentScript({
  matches: ['https://www.instagram.com/*'],
  main() {
    browser.runtime.onMessage.addListener((command: StartCommand) => {
      void start(command);
    });
    void step();
  },
});
