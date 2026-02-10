import { defineStore } from 'pinia';
import { ref } from 'vue';
import * as db from '../services/db.js';
import { ARCHIVED_LIST_TITLE } from '../services/db.js';
import { useThemeStore } from './theme.js';

export const useBoardStore = defineStore('board', () => {
    const lists = ref([]);
    const archivedList = ref(null);
    const showArchived = ref(false);
    const loading = ref(false);

    function mapTask(t) {
        return {
            id: t.id,
            listId: t.list_id,
            title: t.title,
            description: t.description || '',
            completed: t.completed,
            position: t.position,
        };
    }

    async function loadBoard(userId) {
        loading.value = true;
        try {
            const boardData = await db.fetchBoard(userId);

            const themeStore = useThemeStore();
            if (boardData.profile?.theme) {
                themeStore.apply(boardData.profile.theme);
            }

            const allLists = boardData.lists.map((list) => ({
                ...list,
                tasks: boardData.tasks.filter((t) => t.list_id === list.id).map(mapTask),
            }));

            const archived = allLists.find((l) => l.title === ARCHIVED_LIST_TITLE);
            const regular = allLists.filter((l) => l.title !== ARCHIVED_LIST_TITLE);

            archivedList.value = archived || null;
            lists.value = regular;
        } finally {
            loading.value = false;
        }
    }

    function clearBoard() {
        lists.value = [];
        archivedList.value = null;
        showArchived.value = false;
    }

    async function addTask(listId, title) {
        const list = lists.value.find((l) => l.id === listId);
        if (!list) return;

        const position = list.tasks.length;
        const record = await db.createTask(listId, title, position);

        list.tasks.push(mapTask(record));
    }

    async function updateTask(taskId, fields) {
        await db.updateTask(taskId, fields);

        const allLists = archivedList.value ? [...lists.value, archivedList.value] : lists.value;
        for (const list of allLists) {
            const task = list.tasks.find((t) => t.id === taskId);
            if (task) {
                Object.assign(task, fields);
                break;
            }
        }
    }

    async function deleteTask(taskId) {
        await db.deleteTask(taskId);

        const allLists = archivedList.value ? [...lists.value, archivedList.value] : lists.value;
        for (const list of allLists) {
            const idx = list.tasks.findIndex((t) => t.id === taskId);
            if (idx !== -1) {
                list.tasks.splice(idx, 1);
                break;
            }
        }
    }

    async function archiveTask(taskId) {
        // Lazy-create archived list if it doesn't exist
        if (!archivedList.value) {
            const maxPos = lists.value.reduce((m, l) => Math.max(m, l.position ?? 0), 0);
            const record = await db.createList(ARCHIVED_LIST_TITLE, maxPos + 1000);
            archivedList.value = { ...record, tasks: [] };
        }

        // Move task in DB
        const position = archivedList.value.tasks.length;
        await db.updateTask(taskId, {
            list_id: archivedList.value.id,
            position,
        });

        // Move task in local state
        for (const list of lists.value) {
            const idx = list.tasks.findIndex((t) => t.id === taskId);
            if (idx !== -1) {
                const [task] = list.tasks.splice(idx, 1);
                task.listId = archivedList.value.id;
                task.position = position;
                archivedList.value.tasks.push(task);
                break;
            }
        }
    }

    async function unarchiveTask(taskId, targetListId) {
        const target = lists.value.find((l) => l.id === targetListId) || lists.value[0];
        if (!target || !archivedList.value) return;

        const position = target.tasks.length;
        await db.updateTask(taskId, {
            list_id: target.id,
            position,
        });

        const idx = archivedList.value.tasks.findIndex((t) => t.id === taskId);
        if (idx !== -1) {
            const [task] = archivedList.value.tasks.splice(idx, 1);
            task.listId = target.id;
            task.position = position;
            target.tasks.push(task);
        }
    }

    function toggleShowArchived() {
        showArchived.value = !showArchived.value;
    }

    async function toggleTaskComplete(taskId) {
        const allLists = archivedList.value ? [...lists.value, archivedList.value] : lists.value;
        for (const list of allLists) {
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
        archivedList,
        showArchived,
        loading,
        loadBoard,
        clearBoard,
        addTask,
        updateTask,
        deleteTask,
        archiveTask,
        unarchiveTask,
        toggleShowArchived,
        toggleTaskComplete,
        reorderTasksInList,
        moveTask,
        reorderLists,
    };
});
