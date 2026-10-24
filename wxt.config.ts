import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  vite: () => ({ plugins: [tailwindcss()] }),
  manifest: {
    name: 'InstaBlock',
    description: 'Bloqueie ou deixe de seguir uma lista de perfis do Instagram, com pausas e controle de execução.',
    homepage_url: 'https://johngrandson.github.io/instablock/',
    permissions: ['storage'],
  },
});
