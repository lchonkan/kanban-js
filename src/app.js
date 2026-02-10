import { onAuthStateChange, signUp, signIn, signOut, getUser } from './auth.js';
import * as db from './db.js';
import { showToast } from './toast.js';

const THEME_STORAGE_KEY = 'kanban-theme';

/* ══════════════════════════════════════════════════
   Theme Manager — handles switching & persistence
   ══════════════════════════════════════════════════ */
class ThemeManager {
    static THEMES = ['dark', 'light', 'awesome'];
    static _userId = null;

    static init(savedTheme = null) {
        const theme = savedTheme || localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
        ThemeManager.apply(theme);

        document
            .getElementById('open-settings')
            .addEventListener('click', ThemeManager.openSettings);
        document
            .getElementById('close-settings')
            .addEventListener('click', ThemeManager.closeSettings);

        document.getElementById('theme-options').addEventListener('click', async (e) => {
            const option = e.target.closest('.theme-option');
            if (!option) return;
            const theme = option.dataset.theme;
            ThemeManager.apply(theme);
            localStorage.setItem(THEME_STORAGE_KEY, theme);

            try {
                await db.updateTheme(theme);
            } catch (err) {
                console.error('Failed to persist theme:', err);
                showToast('Failed to save theme preference');
            }
        });
    }

    static setUser(userId) {
        ThemeManager._userId = userId;
    }

    static apply(theme) {
        if (!ThemeManager.THEMES.includes(theme)) theme = 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_STORAGE_KEY, theme);

        document.querySelectorAll('.theme-option').forEach((el) => {
            el.classList.toggle('active', el.dataset.theme === theme);
        });
    }

    static openSettings() {
        document.getElementById('settings-page').classList.add('visible');
    }

    static closeSettings() {
        document.getElementById('settings-page').classList.remove('visible');
    }
}

/* ══════════════════════════════════════════════════
   Task — data object for a single task
   ══════════════════════════════════════════════════ */
class Task {
    constructor({ id, listId, title, description = '', completed = false, position = 0 }) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.completed = completed;
        this.listId = listId;
        this.position = position;
    }
}

/* ══════════════════════════════════════════════════
   Task Card Modal — edit task title + description
   ══════════════════════════════════════════════════ */
class TaskCardModal {
    static currentTask = null;
    static currentEl = null;

    static init() {
        const modal = document.getElementById('task-card-modal');
        const backdrop = modal.querySelector('.card-backdrop');
        const closeBtn = document.getElementById('card-close');
        const saveBtn = document.getElementById('card-save');

        backdrop.addEventListener('click', TaskCardModal.close);
        closeBtn.addEventListener('click', TaskCardModal.close);
        saveBtn.addEventListener('click', TaskCardModal.save);

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') TaskCardModal.close();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) TaskCardModal.save();
        });
    }

    static open(taskObj, taskEl, listTitle) {
        TaskCardModal.currentTask = taskObj;
        TaskCardModal.currentEl = taskEl;

        document.getElementById('card-title').value = taskObj.title;
        document.getElementById('card-desc').value = taskObj.description || '';
        document.getElementById('card-list-name').textContent = listTitle;

        document.getElementById('task-card-modal').classList.add('visible');
        document.getElementById('card-title').focus();
    }

    static async save() {
        const task = TaskCardModal.currentTask;
        const el = TaskCardModal.currentEl;
        if (!task || !el) return;

        const newTitle = document.getElementById('card-title').value.trim() || task.title;
        const newDesc = document.getElementById('card-desc').value;

        task.title = newTitle;
        task.description = newDesc;

        el.querySelector('.task-title').textContent = task.title;

        try {
            await db.updateTask(task.id, { title: task.title, description: task.description });
        } catch (err) {
            console.error('Failed to update task:', err);
            showToast('Failed to save task changes');
        }

        TaskCardModal.close();
    }

    static close() {
        document.getElementById('task-card-modal').classList.remove('visible');
        TaskCardModal.currentTask = null;
        TaskCardModal.currentEl = null;
    }
}

/* ══════════════════════════════════════════════════
   TaskList — renders a column, manages tasks[]
   ══════════════════════════════════════════════════ */
class TaskList {
    tasks = [];

    constructor({ id, title, position, boardEl }) {
        this.id = id;
        this.title = title;
        this.position = position;

        // Build DOM safely (no innerHTML)
        const wrapper = document.createElement('div');
        wrapper.classList.add('tasklist-wrapper');
        wrapper.setAttribute('draggable', 'true');

        const listEl = document.createElement('div');
        listEl.classList.add('tasklist');
        listEl.id = id;

        const header = document.createElement('div');
        header.classList.add('tasklist-header');
        const nameEl = document.createElement('p');
        nameEl.classList.add('tasklist-name');
        nameEl.textContent = title;
        header.appendChild(nameEl);

        const addRow = document.createElement('div');
        addRow.classList.add('add-task-row');

        const input = document.createElement('input');
        input.classList.add('add-task-input');
        input.type = 'text';
        input.placeholder = 'New task…';

        const addBtn = document.createElement('button');
        addBtn.classList.add('add-task-btn');
        addBtn.title = 'Add task';
        addBtn.textContent = '+';

        addRow.appendChild(input);
        addRow.appendChild(addBtn);

        listEl.appendChild(header);
        listEl.appendChild(addRow);
        wrapper.appendChild(listEl);
        boardEl.appendChild(wrapper);

        this.wrapperEl = wrapper;
        this.listEl = listEl;

        addBtn.addEventListener('click', () => this.submitNewTask(input));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitNewTask(input);
        });
    }

    async submitNewTask(inputEl) {
        const name = inputEl.value.trim();
        if (name === '') return;

        inputEl.disabled = true;
        const position = this.tasks.length;

        try {
            const record = await db.createTask(this.id, name, position);
            const task = new Task({
                id: record.id,
                listId: this.id,
                title: record.title,
                description: record.description || '',
                completed: record.completed,
                position: record.position,
            });
            this.addTask(task, true);
            inputEl.value = '';
        } catch (err) {
            console.error('Failed to create task:', err);
            showToast('Failed to create task');
        } finally {
            inputEl.disabled = false;
            inputEl.focus();
        }
    }

    addTask(task, animate = false) {
        this.tasks.push(task);

        const newTaskEl = document.createElement('li');
        newTaskEl.id = task.id;
        newTaskEl.classList.add('task');
        newTaskEl.setAttribute('draggable', 'true');
        if (task.completed) newTaskEl.classList.add('completed');

        const content = document.createElement('div');
        content.classList.add('task-content');

        const checkBtn = document.createElement('button');
        checkBtn.classList.add('task-check');
        checkBtn.title = 'Mark complete';
        checkBtn.textContent = '\u2713';

        const titleSpan = document.createElement('span');
        titleSpan.classList.add('task-title');
        titleSpan.textContent = task.title;

        const editBtn = document.createElement('button');
        editBtn.classList.add('task-edit-btn');
        editBtn.title = 'Edit task';
        editBtn.textContent = '\u270E';

        content.appendChild(checkBtn);
        content.appendChild(titleSpan);
        content.appendChild(editBtn);
        newTaskEl.appendChild(content);

        checkBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            task.completed = !task.completed;
            newTaskEl.classList.toggle('completed', task.completed);
            try {
                await db.updateTask(task.id, { completed: task.completed });
            } catch (err) {
                console.error('Failed to update task:', err);
                showToast('Failed to update task');
                task.completed = !task.completed;
                newTaskEl.classList.toggle('completed', task.completed);
            }
        });

        editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            TaskCardModal.open(task, newTaskEl, this.title);
        });

        const addRow = this.listEl.querySelector('.add-task-row');
        if (addRow) {
            this.listEl.insertBefore(newTaskEl, addRow);
        } else {
            this.listEl.append(newTaskEl);
        }

        if (animate) {
            newTaskEl.classList.add('task-pop-in');
            newTaskEl.addEventListener(
                'animationend',
                () => {
                    newTaskEl.classList.remove('task-pop-in');
                },
                { once: true }
            );
        }
    }

    removeTask(task) {
        const el = document.getElementById(task.id);
        if (el) el.remove();
        this.tasks = this.tasks.filter((t) => t.id !== task.id);
    }
}

/* ══════════════════════════════════════════════════
   Board — renders board section, manages drag-and-drop
   ══════════════════════════════════════════════════ */
class Board {
    tasklists = [];
    boardEl = null;

    constructor(boardEl) {
        this.boardEl = boardEl;
    }

    async loadBoard(userId) {
        this.boardEl.innerHTML = '';
        this.tasklists = [];

        const boardData = await db.fetchBoard(userId);

        // Apply persisted theme
        if (boardData.profile?.theme) {
            ThemeManager.apply(boardData.profile.theme);
        }

        // Create TaskList instances from DB data
        for (const list of boardData.lists) {
            const tl = new TaskList({
                id: list.id,
                title: list.title,
                position: list.position,
                boardEl: this.boardEl,
            });
            this.tasklists.push(tl);
        }

        // Distribute tasks into their lists
        for (const taskData of boardData.tasks) {
            const tl = this.tasklists.find((l) => l.id === taskData.list_id);
            if (!tl) continue;
            const task = new Task({
                id: taskData.id,
                listId: taskData.list_id,
                title: taskData.title,
                description: taskData.description || '',
                completed: taskData.completed,
                position: taskData.position,
            });
            tl.addTask(task);
        }

        this.connectListDrag();
        this.connectTaskDrag();
    }

    connectTaskDrag() {
        const board = this.boardEl;
        let draggedTask = null;
        let originalList = null;
        let originalNextSibling = null;

        board.addEventListener('dragstart', (event) => {
            const taskEl = event.target.closest('.task');
            if (!taskEl) return;

            event.dataTransfer.setData('application/x-task', taskEl.id);
            event.dataTransfer.effectAllowed = 'move';

            draggedTask = taskEl;
            originalList = taskEl.closest('.tasklist');
            originalNextSibling = taskEl.nextElementSibling;

            requestAnimationFrame(() => {
                taskEl.classList.add('task-dragging');
                taskEl.classList.add('task-preview');
            });
        });

        board.addEventListener('dragover', (event) => {
            if (!draggedTask) return;
            if (event.dataTransfer.types.includes('application/x-list')) return;
            if (!event.dataTransfer.types.includes('application/x-task')) return;

            event.preventDefault();

            const targetList = event.target.closest('.tasklist');
            if (!targetList) return;

            const targetTask = event.target.closest('.task');

            if (targetTask && targetTask !== draggedTask) {
                const rect = targetTask.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const addRow = targetList.querySelector('.add-task-row');

                if (event.clientY < midpoint) {
                    if (draggedTask.nextElementSibling !== targetTask) {
                        targetList.insertBefore(draggedTask, targetTask);
                    }
                } else {
                    const ref = targetTask.nextElementSibling;
                    const insertRef = ref && ref === addRow ? addRow : ref;
                    if (draggedTask.nextElementSibling !== insertRef) {
                        targetList.insertBefore(draggedTask, insertRef);
                    }
                }
            } else if (!targetTask) {
                const addRow = targetList.querySelector('.add-task-row');
                const tasks = targetList.querySelectorAll('.task');
                const lastTask = tasks[tasks.length - 1];
                if (lastTask !== draggedTask) {
                    targetList.insertBefore(draggedTask, addRow || null);
                }
            }
        });

        board.addEventListener('dragend', (event) => {
            if (!draggedTask) return;

            if (event.dataTransfer.dropEffect === 'none') {
                if (originalNextSibling) {
                    originalList.insertBefore(draggedTask, originalNextSibling);
                } else {
                    originalList.appendChild(draggedTask);
                }
            }

            draggedTask.classList.remove('task-dragging');
            draggedTask.classList.remove('task-preview');
            draggedTask = null;
            originalList = null;
            originalNextSibling = null;
        });

        board.addEventListener('drop', async (event) => {
            if (!draggedTask) return;
            if (!event.dataTransfer.types.includes('application/x-task')) return;
            event.preventDefault();
            event.stopPropagation();

            draggedTask.classList.remove('task-dragging');
            draggedTask.classList.remove('task-preview');

            const newListEl = draggedTask.closest('.tasklist');
            const taskId = draggedTask.id;

            // Find and remove task object from its old TaskList
            let movedTaskObj = null;
            let sourceTaskList = null;
            for (const tl of this.tasklists) {
                const idx = tl.tasks.findIndex((t) => t.id === taskId);
                if (idx !== -1) {
                    movedTaskObj = tl.tasks.splice(idx, 1)[0];
                    sourceTaskList = tl;
                    break;
                }
            }

            // Add task to the new TaskList's array
            const newTaskList = this.tasklists.find((tl) => tl.id === newListEl.id);
            if (newTaskList && movedTaskObj) {
                movedTaskObj.listId = newListEl.id;

                const taskEls = [...newListEl.querySelectorAll('.task')];
                const domIdx = taskEls.findIndex((el) => el.id === taskId);
                newTaskList.tasks.splice(domIdx, 0, movedTaskObj);

                // Persist: update moved task's list_id and reorder affected lists
                try {
                    const newPositions = newTaskList.tasks.map((t, i) => ({
                        id: t.id,
                        position: i,
                    }));
                    await db.reorderTasks(newTaskList.id, newPositions);

                    // If moved between lists, reorder source list too
                    if (sourceTaskList && sourceTaskList.id !== newTaskList.id) {
                        const sourcePositions = sourceTaskList.tasks.map((t, i) => ({
                            id: t.id,
                            position: i,
                        }));
                        await db.reorderTasks(sourceTaskList.id, sourcePositions);
                    }
                } catch (err) {
                    console.error('Failed to persist task reorder:', err);
                    showToast('Failed to save task order');
                }
            }

            draggedTask = null;
            originalList = null;
            originalNextSibling = null;
        });
    }

    connectListDrag() {
        const board = this.boardEl;
        const wrappers = board.querySelectorAll('.tasklist-wrapper');

        let mouseDownTarget = null;
        let draggedWrapper = null;
        let originalNextSibling = null;

        wrappers.forEach((wrapper) => {
            wrapper.addEventListener('mousedown', (event) => {
                mouseDownTarget = event.target;
            });

            wrapper.addEventListener('dragstart', (event) => {
                if (event.target !== wrapper) return;

                const header = wrapper.querySelector('.tasklist-header');
                if (!header.contains(mouseDownTarget)) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.setData(
                    'application/x-list',
                    wrapper.querySelector('.tasklist').id
                );
                event.dataTransfer.effectAllowed = 'move';

                draggedWrapper = wrapper;
                originalNextSibling = wrapper.nextSibling;

                requestAnimationFrame(() => {
                    wrapper.classList.add('list-dragging');
                    wrapper.classList.add('list-preview');
                });
            });

            wrapper.addEventListener('dragend', (event) => {
                if (!draggedWrapper) return;

                if (event.dataTransfer.dropEffect === 'none') {
                    if (originalNextSibling) {
                        board.insertBefore(draggedWrapper, originalNextSibling);
                    } else {
                        board.appendChild(draggedWrapper);
                    }
                }

                draggedWrapper.classList.remove('list-dragging');
                draggedWrapper.classList.remove('list-preview');
                draggedWrapper = null;
                originalNextSibling = null;
            });
        });

        board.addEventListener('dragover', (event) => {
            if (!event.dataTransfer.types.includes('application/x-list')) return;
            if (!draggedWrapper) return;
            event.preventDefault();

            const targetWrapper = event.target.closest('.tasklist-wrapper');
            if (!targetWrapper || targetWrapper === draggedWrapper) return;

            const rect = targetWrapper.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;

            if (event.clientX < midpoint) {
                if (draggedWrapper.nextSibling !== targetWrapper) {
                    board.insertBefore(draggedWrapper, targetWrapper);
                }
            } else {
                if (targetWrapper.nextSibling !== draggedWrapper) {
                    board.insertBefore(draggedWrapper, targetWrapper.nextSibling);
                }
            }
        });

        board.addEventListener('drop', async (event) => {
            if (!event.dataTransfer.types.includes('application/x-list')) return;
            if (!draggedWrapper) return;
            event.preventDefault();
            event.stopPropagation();

            draggedWrapper.classList.remove('list-dragging');
            draggedWrapper.classList.remove('list-preview');

            // Update tasklists array to match new DOM order
            const domOrder = [...board.querySelectorAll('.tasklist-wrapper .tasklist')].map(
                (el) => el.id
            );
            this.tasklists.sort((a, b) => domOrder.indexOf(a.id) - domOrder.indexOf(b.id));

            // Persist new list order
            try {
                const listPositions = this.tasklists.map((tl, i) => ({
                    id: tl.id,
                    position: i,
                }));
                await db.reorderLists(listPositions);
            } catch (err) {
                console.error('Failed to persist list reorder:', err);
                showToast('Failed to save list order');
            }

            draggedWrapper = null;
            originalNextSibling = null;
        });
    }
}

/* ══════════════════════════════════════════════════
   Auth UI — login / signup form handling
   ══════════════════════════════════════════════════ */
class AuthUI {
    static init() {
        const form = document.getElementById('auth-form');
        const toggleLink = document.getElementById('auth-toggle');
        const submitBtn = document.getElementById('auth-submit');
        const heading = document.getElementById('auth-heading');
        const errorEl = document.getElementById('auth-error');
        const passwordInput = document.getElementById('auth-password');

        let isSignUp = false;

        toggleLink.addEventListener('click', (e) => {
            e.preventDefault();
            isSignUp = !isSignUp;
            heading.textContent = isSignUp ? 'Create Account' : 'Sign In';
            submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
            toggleLink.textContent = isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Create one";
            errorEl.textContent = '';
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.textContent = '';

            const email = document.getElementById('auth-email').value.trim();
            const password = passwordInput.value;

            // Client-side validation
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                errorEl.textContent = 'Please enter a valid email address.';
                return;
            }
            if (isSignUp && password.length < 6) {
                errorEl.textContent = 'Password must be at least 6 characters.';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = isSignUp ? 'Creating account…' : 'Signing in…';

            try {
                if (isSignUp) {
                    await signUp(email, password);
                } else {
                    await signIn(email, password);
                }
            } catch (err) {
                errorEl.textContent = err.message || 'Authentication failed. Please try again.';
                submitBtn.disabled = false;
                submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
            }
        });
    }
}

/* ══════════════════════════════════════════════════
   App — entry point and auth state routing
   ══════════════════════════════════════════════════ */
class App {
    static board = null;

    static init() {
        console.info('App Started');

        // Apply cached theme immediately to avoid flash
        const cachedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
        ThemeManager.apply(cachedTheme);

        ThemeManager.init(cachedTheme);
        TaskCardModal.init();
        AuthUI.init();

        const authPage = document.getElementById('auth-page');
        const boardPage = document.getElementById('board-page');
        const loadingEl = document.getElementById('loading-spinner');
        const signOutBtn = document.getElementById('sign-out-btn');

        signOutBtn.addEventListener('click', async () => {
            try {
                await signOut();
            } catch (err) {
                console.error('Sign out failed:', err);
                showToast('Failed to sign out');
            }
        });

        // Create the board element
        const boardEl = document.createElement('section');
        boardEl.id = 'board';
        boardEl.classList.add('board');
        document.getElementById('app').appendChild(boardEl);
        App.board = new Board(boardEl);

        let loadingBoard = false;

        onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
                const user = getUser(session);
                if (user) {
                    if (loadingBoard) return;
                    loadingBoard = true;

                    authPage.classList.remove('visible');
                    boardPage.classList.add('visible');
                    loadingEl.classList.add('visible');

                    // Use setTimeout to break out of the auth callback,
                    // avoiding a deadlock with the Supabase client's internal auth lock.
                    setTimeout(async () => {
                        try {
                            await App.board.loadBoard(user.id);
                        } catch (err) {
                            console.error('Failed to load board:', err);
                            showToast('Failed to load your board. Please refresh.');
                        } finally {
                            loadingEl.classList.remove('visible');
                            loadingBoard = false;
                        }
                    }, 0);
                } else if (event === 'INITIAL_SESSION') {
                    authPage.classList.add('visible');
                    boardPage.classList.remove('visible');
                }
            }

            if (event === 'SIGNED_OUT') {
                boardPage.classList.remove('visible');
                authPage.classList.add('visible');
                boardEl.innerHTML = '';
                App.board.tasklists = [];
            }
        });
    }
}

App.init();
