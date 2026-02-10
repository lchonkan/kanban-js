<template>
    <section>
        <nav class="nav-bar">
            <span class="nav-title">KAN BAN JS</span>
            <div class="nav-actions">
                <button
                    class="archive-toggle-btn"
                    :class="{ active: boardStore.showArchived }"
                    title="Toggle archived tasks"
                    @click="boardStore.toggleShowArchived()"
                >
                    Archive
                </button>
                <button class="settings-btn" title="Settings" @click="$emit('openSettings')">
                    ⚙
                </button>
                <button class="nav-sign-out-btn" title="Sign out" @click="handleSignOut">
                    Sign out
                </button>
            </div>
        </nav>
    </section>
</template>

<script setup>
import { useAuthStore } from '../stores/auth.js';
import { useBoardStore } from '../stores/board.js';

defineEmits(['openSettings']);

const authStore = useAuthStore();
const boardStore = useBoardStore();

async function handleSignOut() {
    try {
        await authStore.signOut();
    } catch (err) {
        console.error('Sign out failed:', err);
    }
}
</script>
