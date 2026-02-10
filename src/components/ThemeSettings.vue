<template>
    <div v-if="visible" class="settings-page">
        <div class="settings-container">
            <div class="settings-header">
                <h1>Settings</h1>
                <button class="settings-close-btn" title="Close" @click="close">✕</button>
            </div>
            <div class="settings-section">
                <h2>Color Theme</h2>
                <div class="theme-options">
                    <div
                        v-for="theme in themes"
                        :key="theme.key"
                        :class="['theme-option', { active: themeStore.current === theme.key }]"
                        :data-theme="theme.key"
                        @click="selectTheme(theme.key)"
                    >
                        <div :class="['theme-option-swatch', `swatch-${theme.key}`]"></div>
                        <div class="theme-option-info">
                            <span class="theme-option-name">{{ theme.name }}</span>
                            <span class="theme-option-desc">{{ theme.desc }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref } from 'vue';
import { useThemeStore } from '../stores/theme.js';

const themeStore = useThemeStore();
const visible = ref(false);

const themes = [
    { key: 'dark', name: 'Dark', desc: 'Classic dark interface — easy on the eyes' },
    { key: 'light', name: 'Light', desc: 'Clean and bright for daytime use' },
    { key: 'awesome', name: 'Awesome', desc: 'Neon synthwave vibes — totally radical' },
];

async function selectTheme(theme) {
    try {
        await themeStore.setTheme(theme);
    } catch {
        // Error already logged in store
    }
}

function open() {
    visible.value = true;
}

function close() {
    visible.value = false;
}

defineExpose({ open, close });
</script>

<style scoped>
.settings-page {
    position: fixed;
    inset: 0;
    z-index: 50;
    background-color: var(--settings-bg);
    overflow-y: auto;
    animation: fade-in 0.2s ease-out forwards;
}
</style>
