<template>
    <div class="board-container">
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
            <div class="add-list-wrapper">
                <div v-if="addingList" class="add-list-form">
                    <input
                        ref="addListInput"
                        v-model="newListTitle"
                        class="add-list-input"
                        type="text"
                        placeholder="List title…"
                        @keydown.enter="submitNewList"
                        @keydown.esc="cancelAddList"
                    />
                    <div class="add-list-actions">
                        <button class="add-list-confirm-btn" @click="submitNewList">Add</button>
                        <button class="add-list-cancel-btn" @click="cancelAddList">✕</button>
                    </div>
                </div>
                <button v-else class="add-list-btn" @click="startAddList">+ Add list</button>
            </div>
        </section>
        <aside v-if="showArchivedColumn" class="archived-panel">
            <TaskListColumn
                :list="archivedListDisplay"
                :hide-add-task="true"
                :readonly="true"
                @edit-task="openEditModal"
            />
        </aside>
    </div>
    <TaskEditModal ref="editModal" />
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import draggable from 'vuedraggable';
import TaskListColumn from './TaskListColumn.vue';
import TaskEditModal from './TaskEditModal.vue';
import { useBoardStore } from '../stores/board.js';
import * as db from '../services/db.js';

const boardStore = useBoardStore();
const editModal = ref(null);
const addingList = ref(false);
const newListTitle = ref('');
const addListInput = ref(null);

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

async function startAddList() {
    addingList.value = true;
    await nextTick();
    addListInput.value?.focus();
}

async function submitNewList() {
    const title = newListTitle.value.trim();
    if (!title) return;

    newListTitle.value = '';
    addingList.value = false;

    try {
        await boardStore.addList(title);
    } catch (err) {
        console.error('Failed to create list:', err);
    }
}

function cancelAddList() {
    newListTitle.value = '';
    addingList.value = false;
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
