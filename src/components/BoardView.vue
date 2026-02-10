<template>
    <section class="board">
        <draggable
            :list="boardStore.lists"
            item-key="id"
            :animation="150"
            handle=".tasklist-header"
            ghost-class="list-preview"
            drag-class="list-dragging"
            :style="{ display: 'flex', flexDirection: 'row' }"
            @change="onListChange"
        >
            <template #item="{ element }">
                <TaskListColumn :list="element" @edit-task="openEditModal" />
            </template>
        </draggable>
        <div v-if="showArchivedColumn" class="archived-column">
            <TaskListColumn
                :list="archivedListDisplay"
                :hide-add-task="true"
                :readonly="true"
                @edit-task="openEditModal"
            />
        </div>
    </section>
    <TaskEditModal ref="editModal" />
</template>

<script setup>
import { ref, computed } from 'vue';
import draggable from 'vuedraggable';
import TaskListColumn from './TaskListColumn.vue';
import TaskEditModal from './TaskEditModal.vue';
import { useBoardStore } from '../stores/board.js';
import * as db from '../services/db.js';

const boardStore = useBoardStore();
const editModal = ref(null);

const showArchivedColumn = computed(
    () =>
        boardStore.showArchived &&
        boardStore.archivedList &&
        boardStore.archivedList.tasks.length > 0
);

const archivedListDisplay = computed(() => {
    if (!boardStore.archivedList) return null;
    return {
        ...boardStore.archivedList,
        title: 'Archived',
    };
});

function openEditModal(task) {
    const allLists = boardStore.archivedList
        ? [...boardStore.lists, boardStore.archivedList]
        : boardStore.lists;
    const list = allLists.find((l) => l.tasks.some((t) => t.id === task.id));
    const displayTitle = list?.title === '__archived__' ? 'Archived' : list?.title || '';
    editModal.value?.open(task, displayTitle);
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
