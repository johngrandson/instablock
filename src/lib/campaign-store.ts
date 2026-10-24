import { storage } from '#imports';
import { EMPTY, type Campaign } from './campaign';

export const campaignStore = storage.defineItem<Campaign>('local:campaign', { fallback: EMPTY });
