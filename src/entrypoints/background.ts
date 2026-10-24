import { browser, defineBackground } from '#imports';
import { handleCommand, stopCampaignForTab } from '@/lib/coordinator';

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((message, sender, respond) => {
    void handleCommand(message, sender).then(respond);
    return true;
  });
  const stop = (tabId?: number) => void stopCampaignForTab(tabId).catch(console.error);
  browser.tabs.onRemoved.addListener((tabId) => stop(tabId));
  browser.runtime.onStartup.addListener(() => stop());
  browser.runtime.onInstalled.addListener(() => stop());
});
