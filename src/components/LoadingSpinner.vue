<template>
    <div class="loading-spinner">
        <div class="spinner"></div>
        <p class="spinner-text">Loading your board…</p>
    </div>
</template>

<style scoped>
.loading-spinner {
    position: fixed;
    inset: 0;
    z-index: 150;
    background-color: var(--board-bg);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
}
</style>
