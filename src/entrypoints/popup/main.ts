import { mount } from 'svelte';
import App from './App.svelte';
import './app.css';

// Preline tokens switch on the `dark` class; follow the system setting.
document.documentElement.classList.toggle('dark', matchMedia('(prefers-color-scheme: dark)').matches);

export default mount(App, { target: document.getElementById('app')! });
