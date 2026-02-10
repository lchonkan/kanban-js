import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as db from '../services/db.js';
import { useThemeStore } from './theme.js';

export const useBoardStore = defineStore('board', () => {
    const lists = ref([]);
    const loading = ref(false);

    async function loadBoard(userId) {
        loading.value = true;
        try {
            const boardData = await db.fetchBoard(userId);

            const themeStore = useThemeStore();
            if (boardData.profile?.theme) {
                themeStore.apply(boardData.profile.theme);
            }

            lists.value = boardData.lists.map((list) => ({
                ...list,
                tasks: boardData.tasks
                    .filter((t) => t.list_id === list.id)
                    .map((t) => ({
                        id: t.id,
                        listId: t.list_id,
                        title: t.title,
                        description: t.description || '',
                        completed: t.completed,
                        position: t.position,
                    })),
            }));
        } finally {
            loading.value = false;
        }
    }

    function clearBoard() {
        lists.value = [];
    }

    async function addTask(listId, title) {
        const list = lists.value.find((l) => l.id === listId);
        if (!list) return;

        const position = list.tasks.length;
        const record = await db.createTask(listId, title, position);

        list.tasks.push({
            id: record.id,
            listId: record.list_id,
            title: record.title,
            description: record.description || '',
            completed: record.completed,
            position: record.position,
        });
    }

    async function updateTask(taskId, fields) {
        await db.updateTask(taskId, fields);

        for (const list of lists.value) {
            const task = list.tasks.find((t) => t.id === taskId);
            if (task) {
                Object.assign(task, fields);
                break;
            }
        }
    }

    async function toggleTaskComplete(taskId) {
        for (const list of lists.value) {
            const task = list.tasks.find((t) => t.id === taskId);
            if (task) {
                const newCompleted = !task.completed;
                task.completed = newCompleted;
                try {
                    await db.updateTask(taskId, { completed: newCompleted });
                } catch (err) {
                    task.completed = !newCompleted;
                    throw err;
                }
                break;
            }
        }
    }

    async function reorderTasksInList(listId, tasks) {
        const list = lists.value.find((l) => l.id === listId);
        if (!list) return;

        list.tasks = tasks;
        const positions = tasks.map((t, i) => ({ id: t.id, position: i }));
        await db.reorderTasks(listId, positions);
    }

    async function moveTask(taskId, fromListId, toListId, newIndex) {
        const fromList = lists.value.find((l) => l.id === fromListId);
        const toList = lists.value.find((l) => l.id === toListId);
        if (!fromList || !toList) return;

        const taskIndex = fromList.tasks.findIndex((t) => t.id === taskId);
        if (taskIndex === -1) return;

        const [task] = fromList.tasks.splice(taskIndex, 1);
        task.listId = toListId;
        toList.tasks.splice(newIndex, 0, task);

        const toPositions = toList.tasks.map((t, i) => ({ id: t.id, position: i }));
        await db.reorderTasks(toListId, toPositions);

        if (fromListId !== toListId) {
            const fromPositions = fromList.tasks.map((t, i) => ({ id: t.id, position: i }));
            await db.reorderTasks(fromListId, fromPositions);
        }
    }

    async function reorderLists(newLists) {
        lists.value = newLists;
        const positions = newLists.map((l, i) => ({ id: l.id, position: i }));
        await db.reorderLists(positions);
    }

    return {
        lists,
        loading,
        loadBoard,
        clearBoard,
        addTask,
        updateTask,
        toggleTaskComplete,
        reorderTasksInList,
        moveTask,
        reorderLists,
    };
});
