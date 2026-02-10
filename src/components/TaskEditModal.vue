<template>
    <div v-if="visible" class="task-card-modal">
        <div class="card-backdrop" @click="close"></div>
        <div
            class="task-card"
            @keydown.esc="close"
            @keydown.ctrl.enter="save"
            @keydown.meta.enter="save"
        >
            <div class="task-card-header">
                <input ref="titleInput" v-model="title" class="card-title-input" type="text" />
                <button class="task-card-close" title="Close" @click="close">✕</button>
            </div>
            <div class="task-card-meta">
                in <strong>{{ listTitle }}</strong>
            </div>
            <div class="task-card-body">
                <label for="card-desc">Description</label>
                <textarea
                    id="card-desc"
                    v-model="description"
                    placeholder="Add a more detailed description…"
                ></textarea>
            </div>
            <div class="task-card-footer">
                <button class="card-save-btn" @click="save">Save</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useBoardStore } from '../stores/board.js';

const boardStore = useBoardStore();

const visible = ref(false);
const title = ref('');
const description = ref('');
const listTitle = ref('');
const taskId = ref(null);

const titleInput = ref(null);

async function open(task, parentListTitle) {
    taskId.value = task.id;
    title.value = task.title;
    description.value = task.description || '';
    listTitle.value = parentListTitle;
    visible.value = true;
    await nextTick();
    titleInput.value?.focus();
}

async function save() {
    if (!taskId.value) return;

    const newTitle = title.value.trim() || title.value;
    const newDesc = description.value;

    try {
        await boardStore.updateTask(taskId.value, { title: newTitle, description: newDesc });
    } catch (err) {
        console.error('Failed to save task changes:', err);
    }

    close();
}

function close() {
    visible.value = false;
    taskId.value = null;
}

defineExpose({ open });
</script>

<style scoped>
.task-card-modal {
    position: fixed;
    z-index: 100;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 12vh;
}
</style>
