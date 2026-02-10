<template>
    <div class="tasklist-wrapper">
        <div class="tasklist" :data-list-id="list.id">
            <div class="tasklist-header">
                <p class="tasklist-name">{{ list.title }}</p>
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
import { ref } from 'vue';
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
