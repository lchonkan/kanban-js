<template>
    <template v-if="!authStore.ready">
        <LoadingSpinner />
    </template>
    <template v-else-if="authStore.user">
        <div class="board-page">
            <AppNavbar @open-settings="settingsPanel?.open()" />
            <ThemeSettings ref="settingsPanel" />
            <LoadingSpinner v-if="boardStore.loading" />
            <router-view />
        </div>
    </template>
    <template v-else>
        <router-view />
    </template>
    <ToastNotification ref="toast" />
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from './stores/auth.js';
import { useBoardStore } from './stores/board.js';
import AppNavbar from './components/AppNavbar.vue';
import ThemeSettings from './components/ThemeSettings.vue';
import LoadingSpinner from './components/LoadingSpinner.vue';
import ToastNotification from './components/ToastNotification.vue';

const authStore = useAuthStore();
const boardStore = useBoardStore();
const router = useRouter();

const settingsPanel = ref(null);
const toast = ref(null);

onMounted(() => {
    authStore.init();
});

watch(
    () => authStore.user,
    (user, oldUser) => {
        if (user) {
            router.push({ name: 'board' });
            // Use setTimeout to break out of the auth callback,
            // avoiding a deadlock with the Supabase client's internal auth lock.
            setTimeout(async () => {
                try {
                    await boardStore.loadBoard(user.id);
                } catch (err) {
                    console.error('Failed to load board:', err);
                    toast.value?.showToast('Failed to load your board. Please refresh.');
                }
            }, 0);
        } else if (oldUser) {
            boardStore.clearBoard();
            router.push({ name: 'login' });
        }
    }
);

watch(
    () => authStore.ready,
    (ready) => {
        if (ready && !authStore.user) {
            router.push({ name: 'login' });
        }
    }
);
</script>

<style scoped>
.board-page {
    display: flex;
    flex-direction: column;
    height: 100%;
}
</style>
