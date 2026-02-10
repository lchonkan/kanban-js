import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as db from '../services/db.js';

const THEME_STORAGE_KEY = 'kanban-theme';
const THEMES = ['dark', 'light', 'awesome'];

export const useThemeStore = defineStore('theme', () => {
    const current = ref(localStorage.getItem(THEME_STORAGE_KEY) || 'dark');

    function apply(theme) {
        if (!THEMES.includes(theme)) theme = 'dark';
        current.value = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    async function setTheme(theme) {
        apply(theme);
        try {
            await db.updateTheme(theme);
        } catch (err) {
            console.error('Failed to persist theme:', err);
            throw err;
        }
    }

    // Apply cached theme immediately to avoid flash
    apply(current.value);

    return { current, themes: THEMES, apply, setTheme };
});
