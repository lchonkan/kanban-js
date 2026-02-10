<template>
    <draggable
        :list="boardStore.lists"
        item-key="id"
        tag="section"
        :component-data="{ class: 'board' }"
        :animation="150"
        handle=".tasklist-header"
        ghost-class="list-preview"
        drag-class="list-dragging"
        @change="onListChange"
    >
        <template #item="{ element }">
            <TaskListColumn :list="element" @edit-task="openEditModal" />
        </template>
    </draggable>
    <TaskEditModal ref="editModal" />
</template>

<script setup>
import { ref } from 'vue';
import draggable from 'vuedraggable';
import TaskListColumn from './TaskListColumn.vue';
import TaskEditModal from './TaskEditModal.vue';
import { useBoardStore } from '../stores/board.js';
import * as db from '../services/db.js';

const boardStore = useBoardStore();
const editModal = ref(null);

function openEditModal(task) {
    const list = boardStore.lists.find((l) => l.tasks.some((t) => t.id === task.id));
    editModal.value?.open(task, list?.title || '');
}

async function onListChange() {
    try {
        const positions = boardStore.lists.map((l, i) => ({ id: l.id, position: i }));
        await db.reorderLists(positions);
    } catch (err) {
        console.error('Failed to persist list reorder:', err);
    }
}
</script>
