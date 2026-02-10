<template>
    <Teleport to="body">
        <div id="toast-container">
            <TransitionGroup name="toast">
                <div
                    v-for="toast in toasts"
                    :key="toast.id"
                    :class="['toast', `toast-${toast.type}`, 'toast-visible']"
                >
                    {{ toast.message }}
                </div>
            </TransitionGroup>
        </div>
    </Teleport>
</template>

<script setup>
import { ref } from 'vue';

const toasts = ref([]);
let nextId = 0;

function showToast(message, type = 'error') {
    const id = nextId++;
    toasts.value.push({ id, message, type });

    setTimeout(() => {
        toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 4000);
}

defineExpose({ showToast });
</script>

<style scoped>
.toast-enter-active {
    transition:
        opacity 0.25s ease,
        transform 0.25s ease;
}

.toast-leave-active {
    transition:
        opacity 0.25s ease,
        transform 0.25s ease;
}

.toast-enter-from {
    opacity: 0;
    transform: translateY(8px);
}

.toast-leave-to {
    opacity: 0;
    transform: translateY(8px);
}
</style>
