<template>
    <li :class="['task', { completed: task.completed }]">
        <div class="task-content">
            <button class="task-check" title="Mark complete" @click.stop="toggleComplete">✓</button>
            <span class="task-title">{{ task.title }}</span>
            <button class="task-edit-btn" title="Edit task" @click.stop="$emit('edit', task)">
                ✎
            </button>
        </div>
    </li>
</template>

<script setup>
import { useBoardStore } from '../stores/board.js';

const props = defineProps({
    task: { type: Object, required: true },
});

defineEmits(['edit']);

const boardStore = useBoardStore();

async function toggleComplete() {
    try {
        await boardStore.toggleTaskComplete(props.task.id);
    } catch (err) {
        console.error('Failed to update task:', err);
    }
}
</script>
