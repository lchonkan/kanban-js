<template>
    <div class="tasklist-wrapper" :class="{ 'tasklist-collapsed': collapsed }">
        <div v-if="collapsed" class="tasklist-collapsed-bar" @click="collapsed = false">
            <span class="tasklist-collapsed-title">{{ list.title }}</span>
            <span class="tasklist-collapsed-count">{{ list.tasks.length }}</span>
        </div>
        <div v-else class="tasklist" :data-list-id="list.id">
            <div class="tasklist-header">
                <input
                    v-if="editing"
                    ref="renameInput"
                    v-model="editTitle"
                    class="tasklist-rename-input"
                    type="text"
                    @keydown.enter="submitRename"
                    @keydown.esc="cancelRename"
                    @blur="submitRename"
                />
                <p v-else class="tasklist-name" @dblclick="startRename">{{ list.title }}</p>
                <div v-if="!readonly" class="tasklist-header-actions">
                    <button
                        class="list-collapse-btn"
                        title="Collapse list"
                        @click="collapsed = true"
                    >
                        ➤‹
                    </button>
                    <div class="list-menu-container">
                        <button
                            class="list-menu-btn"
                            title="List actions"
                            @click="menuOpen = !menuOpen"
                        >
                            ⋯
                        </button>
                        <div v-if="menuOpen" class="list-menu-dropdown" @click.stop>
                            <button class="list-menu-item" @click="handleDuplicate">
                                Duplicate list
                            </button>
                            <button class="list-menu-item" @click="handleArchiveList">
                                Archive list
                            </button>
                            <hr class="list-menu-divider" />
                            <button
                                v-if="!confirmingDelete"
                                class="list-menu-item list-menu-item-danger"
                                @click="confirmingDelete = true"
                            >
                                Delete list
                            </button>
                            <template v-else>
                                <span class="list-menu-confirm-label">Delete this list?</span>
                                <div class="list-menu-confirm-actions">
                                    <button class="list-menu-confirm-yes" @click="submitDelete">
                                        Yes, delete
                                    </button>
                                    <button
                                        class="list-menu-confirm-no"
                                        @click="confirmingDelete = false"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </template>
                        </div>
                    </div>
                </div>
            </div>
            <draggable
                :list="list.tasks"
                :group="readonly ? { name: 'tasks', pull: false, put: false } : 'tasks'"
                item-key="id"
                :animation="150"
                :sort="!readonly"
                ghost-class="task-preview"
                drag-class="task-dragging"
                @change="onTaskChange"
            >
                <template #item="{ element }">
                    <TaskCard :task="element" @edit="(task) => $emit('editTask', task)" />
                </template>
            </draggable>
            <div v-if="!hideAddTask" class="add-task-row">
                <input
                    ref="newTaskInput"
                    v-model="newTaskTitle"
                    class="add-task-input"
                    type="text"
                    placeholder="New task…"
                    @keydown.enter="submitNewTask"
                />
                <button class="add-task-btn" title="Add task" @click="submitNewTask">+</button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount } from 'vue';
import draggable from 'vuedraggable';
import TaskCard from './TaskCard.vue';
import { useBoardStore } from '../stores/board.js';
import * as db from '../services/db.js';

const props = defineProps({
    list: { type: Object, required: true },
    hideAddTask: { type: Boolean, default: false },
    readonly: { type: Boolean, default: false },
});

defineEmits(['editTask']);

const boardStore = useBoardStore();
const newTaskTitle = ref('');
const newTaskInput = ref(null);
const editing = ref(false);
const editTitle = ref('');
const renameInput = ref(null);
const confirmingDelete = ref(false);
const collapsed = ref(false);
const menuOpen = ref(false);

function closeMenuOnClickOutside(e) {
    if (menuOpen.value && !e.target.closest('.list-menu-container')) {
        menuOpen.value = false;
        confirmingDelete.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', closeMenuOnClickOutside);
});

onBeforeUnmount(() => {
    document.removeEventListener('click', closeMenuOnClickOutside);
});

async function startRename() {
    if (props.readonly) return;
    editTitle.value = props.list.title;
    editing.value = true;
    await nextTick();
    renameInput.value?.focus();
    renameInput.value?.select();
}

async function submitRename() {
    const title = editTitle.value.trim();
    editing.value = false;
    if (!title || title === props.list.title) return;

    try {
        await boardStore.renameList(props.list.id, title);
    } catch (err) {
        console.error('Failed to rename list:', err);
    }
}

function cancelRename() {
    editing.value = false;
}

async function submitDelete() {
    confirmingDelete.value = false;
    menuOpen.value = false;
    try {
        await boardStore.deleteList(props.list.id);
    } catch (err) {
        console.error('Failed to delete list:', err);
    }
}

async function handleDuplicate() {
    menuOpen.value = false;
    try {
        await boardStore.duplicateList(props.list.id);
    } catch (err) {
        console.error('Failed to duplicate list:', err);
    }
}

async function handleArchiveList() {
    menuOpen.value = false;
    try {
        await boardStore.archiveList(props.list.id);
    } catch (err) {
        console.error('Failed to archive list:', err);
    }
}

async function submitNewTask() {
    const title = newTaskTitle.value.trim();
    if (!title) return;

    // Clear input and re-focus immediately so the user can keep typing
    newTaskTitle.value = '';
    newTaskInput.value?.focus();

    try {
        await boardStore.addTask(props.list.id, title);
    } catch (err) {
        console.error('Failed to create task:', err);
    }
}

async function onTaskChange(evt) {
    // `added` fires on the receiving list, `removed` fires on the source list,
    // `moved` fires when reordering within the same list.
    // vuedraggable has already mutated the arrays by the time this fires.
    // We persist the new positions for this list.
    if (evt.added || evt.moved) {
        try {
            const positions = props.list.tasks.map((t, i) => ({ id: t.id, position: i }));
            await db.reorderTasks(props.list.id, positions);
        } catch (err) {
            console.error('Failed to persist task reorder:', err);
        }
    }
    if (evt.removed) {
        try {
            const positions = props.list.tasks.map((t, i) => ({ id: t.id, position: i }));
            await db.reorderTasks(props.list.id, positions);
        } catch (err) {
            console.error('Failed to persist source list reorder:', err);
        }
    }
}
</script>
