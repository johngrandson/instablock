import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'InstaBlock',
    description: 'Unfollow or block a list of Instagram profiles with human-like delays.',
    permissions: ['storage'],
  },
});
