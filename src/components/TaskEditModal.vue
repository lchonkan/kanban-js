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
                <div class="card-danger-actions">
                    <template v-if="!confirmingDelete">
                        <button v-if="isArchived" class="card-archive-btn" @click="unarchive">
                            Unarchive
                        </button>
                        <button v-else class="card-archive-btn" @click="archive">Archive</button>
                        <button class="card-delete-btn" @click="confirmingDelete = true">
                            Delete
                        </button>
                    </template>
                    <template v-else>
                        <span class="card-confirm-label">Delete this task?</span>
                        <button class="card-confirm-delete-btn" @click="confirmDelete">
                            Yes, delete
                        </button>
                        <button class="card-cancel-delete-btn" @click="confirmingDelete = false">
                            Cancel
                        </button>
                    </template>
                </div>
                <button class="card-save-btn" @click="save">Save</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, computed } from 'vue';
import { useBoardStore } from '../stores/board.js';

const boardStore = useBoardStore();

const visible = ref(false);
const title = ref('');
const description = ref('');
const listTitle = ref('');
const taskId = ref(null);
const currentListId = ref(null);
const confirmingDelete = ref(false);

const titleInput = ref(null);

const isArchived = computed(
    () => boardStore.archivedList && currentListId.value === boardStore.archivedList.id
);

async function open(task, parentListTitle) {
    taskId.value = task.id;
    title.value = task.title;
    description.value = task.description || '';
    listTitle.value = parentListTitle;
    currentListId.value = task.listId;
    confirmingDelete.value = false;
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

async function confirmDelete() {
    if (!taskId.value) return;
    try {
        await boardStore.deleteTask(taskId.value);
    } catch (err) {
        console.error('Failed to delete task:', err);
    }
    close();
}

async function archive() {
    if (!taskId.value) return;
    try {
        await boardStore.archiveTask(taskId.value);
    } catch (err) {
        console.error('Failed to archive task:', err);
    }
    close();
}

async function unarchive() {
    if (!taskId.value) return;
    try {
        await boardStore.unarchiveTask(taskId.value);
    } catch (err) {
        console.error('Failed to unarchive task:', err);
    }
    close();
}

function close() {
    visible.value = false;
    taskId.value = null;
    confirmingDelete.value = false;
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
