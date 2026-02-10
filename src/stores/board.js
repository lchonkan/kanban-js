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
        const tempId = 'temp-' + Date.now();
        const tempTask = {
            id: tempId,
            listId,
            title,
            description: '',
            completed: false,
            position,
        };
        list.tasks.push(tempTask);

        try {
            const record = await db.createTask(listId, title, position);
            const mapped = mapTask(record);
            const idx = list.tasks.findIndex((t) => t.id === tempId);
            if (idx !== -1) {
                Object.assign(list.tasks[idx], mapped);
            }
        } catch (err) {
            const idx = list.tasks.findIndex((t) => t.id === tempId);
            if (idx !== -1) {
                list.tasks.splice(idx, 1);
            }
            throw err;
        }
    }

    async function updateTask(taskId, fields) {
        const allLists = archivedList.value ? [...lists.value, archivedList.value] : lists.value;
        let task = null;
        for (const list of allLists) {
            task = list.tasks.find((t) => t.id === taskId);
            if (task) break;
        }
        if (!task) return;

        const snapshot = {};
        for (const key of Object.keys(fields)) {
            snapshot[key] = task[key];
        }
        Object.assign(task, fields);

        try {
            await db.updateTask(taskId, fields);
        } catch (err) {
            Object.assign(task, snapshot);
            throw err;
        }
    }

    async function deleteTask(taskId) {
        const allLists = archivedList.value ? [...lists.value, archivedList.value] : lists.value;
        let sourceList = null;
        let sourceIdx = -1;
        let removedTask = null;

        for (const list of allLists) {
            const idx = list.tasks.findIndex((t) => t.id === taskId);
            if (idx !== -1) {
                sourceList = list;
                sourceIdx = idx;
                [removedTask] = list.tasks.splice(idx, 1);
                break;
            }
        }
        if (!removedTask) return;

        try {
            await db.deleteTask(taskId);
        } catch (err) {
            sourceList.tasks.splice(sourceIdx, 0, removedTask);
            throw err;
        }
    }

    async function archiveTask(taskId) {
        // Lazy-create archived list if it doesn't exist (needs real DB ID)
        if (!archivedList.value) {
            const maxPos = lists.value.reduce((m, l) => Math.max(m, l.position ?? 0), 0);
            const record = await db.createList(ARCHIVED_LIST_TITLE, maxPos + 1000);
            archivedList.value = { ...record, tasks: [] };
        }

        // Find and move task optimistically
        let sourceList = null;
        let sourceIdx = -1;
        let task = null;

        for (const list of lists.value) {
            const idx = list.tasks.findIndex((t) => t.id === taskId);
            if (idx !== -1) {
                sourceList = list;
                sourceIdx = idx;
                [task] = list.tasks.splice(idx, 1);
                break;
            }
        }
        if (!task) return;

        const prevListId = task.listId;
        const prevPosition = task.position;
        const position = archivedList.value.tasks.length;
        task.listId = archivedList.value.id;
        task.position = position;
        archivedList.value.tasks.push(task);

        try {
            await db.updateTask(taskId, {
                list_id: archivedList.value.id,
                position,
            });
        } catch (err) {
            // Rollback: remove from archived, restore to source
            const archIdx = archivedList.value.tasks.findIndex((t) => t.id === taskId);
            if (archIdx !== -1) {
                archivedList.value.tasks.splice(archIdx, 1);
            }
            task.listId = prevListId;
            task.position = prevPosition;
            sourceList.tasks.splice(sourceIdx, 0, task);
            throw err;
        }
    }

    async function unarchiveTask(taskId, targetListId) {
        const target = lists.value.find((l) => l.id === targetListId) || lists.value[0];
        if (!target || !archivedList.value) return;

        const idx = archivedList.value.tasks.findIndex((t) => t.id === taskId);
        if (idx === -1) return;

        const [task] = archivedList.value.tasks.splice(idx, 1);
        const prevListId = task.listId;
        const prevPosition = task.position;
        const position = target.tasks.length;
        task.listId = target.id;
        task.position = position;
        target.tasks.push(task);

        try {
            await db.updateTask(taskId, {
                list_id: target.id,
                position,
            });
        } catch (err) {
            // Rollback: remove from target, restore to archived
            const targetIdx = target.tasks.findIndex((t) => t.id === taskId);
            if (targetIdx !== -1) {
                target.tasks.splice(targetIdx, 1);
            }
            task.listId = prevListId;
            task.position = prevPosition;
            archivedList.value.tasks.splice(idx, 0, task);
            throw err;
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

    async function addList(title) {
        const maxPos = lists.value.reduce((m, l) => Math.max(m, l.position ?? 0), 0);
        const position = maxPos + 1;
        const tempId = 'temp-list-' + Date.now();
        const tempList = { id: tempId, title, position, tasks: [] };
        lists.value.push(tempList);

        try {
            const record = await db.createList(title, position);
            const idx = lists.value.findIndex((l) => l.id === tempId);
            if (idx !== -1) {
                Object.assign(lists.value[idx], { ...record, tasks: [] });
            }
        } catch (err) {
            const idx = lists.value.findIndex((l) => l.id === tempId);
            if (idx !== -1) {
                lists.value.splice(idx, 1);
            }
            throw err;
        }
    }

    async function renameList(listId, title) {
        const list = lists.value.find((l) => l.id === listId);
        if (!list) return;

        const prevTitle = list.title;
        list.title = title;

        try {
            await db.renameList(listId, title);
        } catch (err) {
            list.title = prevTitle;
            throw err;
        }
    }

    async function deleteList(listId) {
        const idx = lists.value.findIndex((l) => l.id === listId);
        if (idx === -1) return;

        const [removed] = lists.value.splice(idx, 1);

        try {
            await db.deleteList(listId);
        } catch (err) {
            lists.value.splice(idx, 0, removed);
            throw err;
        }
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
        addList,
        renameList,
        deleteList,
    };
});
