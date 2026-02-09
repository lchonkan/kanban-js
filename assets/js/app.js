const DEFAULT_LISTS = ['Pendientes', 'En Proceso', 'Finalizadas'];
const THEME_STORAGE_KEY = 'kanban-theme';

/* ══════════════════════════════════════════════════
   Theme Manager — handles switching & persistence
   ══════════════════════════════════════════════════ */
class ThemeManager {
    static THEMES = ['dark', 'light', 'awesome'];

    static init() {
        const saved = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
        ThemeManager.apply(saved);

        // Wire up settings page open / close
        document.getElementById('open-settings').addEventListener('click', ThemeManager.openSettings);
        document.getElementById('close-settings').addEventListener('click', ThemeManager.closeSettings);

        // Wire up theme option clicks
        document.getElementById('theme-options').addEventListener('click', (e) => {
            const option = e.target.closest('.theme-option');
            if (!option) return;
            const theme = option.dataset.theme;
            ThemeManager.apply(theme);
            localStorage.setItem(THEME_STORAGE_KEY, theme);
        });
    }

    static apply(theme) {
        if (!ThemeManager.THEMES.includes(theme)) theme = 'dark';
        document.documentElement.setAttribute('data-theme', theme);

        // Highlight the active option in settings
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

class Task {
    constructor(taskID, parentID, taskName, description = '') {
        this.taskID = taskID;
        this.taskName = taskName;
        this.description = description;
        this.completed = false;
        this.parentListID = parentID;
        this.parentListName = document
            .getElementById(parentID)
            .querySelector('.tasklist-name').innerHTML;
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

        // Save on Ctrl/Cmd+Enter
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') TaskCardModal.close();
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) TaskCardModal.save();
        });
    }

    static open(taskObj, taskEl) {
        TaskCardModal.currentTask = taskObj;
        TaskCardModal.currentEl = taskEl;

        document.getElementById('card-title').value = taskObj.taskName;
        document.getElementById('card-desc').value = taskObj.description || '';
        document.getElementById('card-list-name').textContent = taskObj.parentListName;

        document.getElementById('task-card-modal').classList.add('visible');
        document.getElementById('card-title').focus();
    }

    static save() {
        const task = TaskCardModal.currentTask;
        const el = TaskCardModal.currentEl;
        if (!task || !el) return;

        task.taskName = document.getElementById('card-title').value.trim() || task.taskName;
        task.description = document.getElementById('card-desc').value;

        // Update DOM title
        el.querySelector('.task-title').textContent = task.taskName;

        TaskCardModal.close();
    }

    static close() {
        document.getElementById('task-card-modal').classList.remove('visible');
        TaskCardModal.currentTask = null;
        TaskCardModal.currentEl = null;
    }
}

class TaskList {
    tasks = [];

    constructor(id, listName = 'newList', targetBoard) {
        this.id = id;
        let thisList = document.getElementById(id);
        if (!document.getElementById(id)) {
            console.log(`Lista ${listName} creada con exito`);
            thisList = document.createElement('div');
            thisList.classList.add('tasklist-wrapper');
            thisList.setAttribute('draggable', 'true');
            thisList.innerHTML = `
            <div class="tasklist" id="${id}">
                <div class="tasklist-header">
                    <p class="tasklist-name">${listName}</p>
                </div>
                <div class="add-task-row">
                    <input class="add-task-input" type="text" placeholder="New task…" />
                    <button class="add-task-btn" title="Add task">+</button>
                </div>
            </div>
            `;
            targetBoard.appendChild(thisList);
        }
        this.wrapperEl = thisList;

        //console.log(thisList);

        const taskItems = ['task1', 'task2', 'task3'];

        for (const task of taskItems) {
            const newTask = new Task(id + '-' + task, id, 'defaultTask');
            this.addTask(newTask);
        }

        this.connectDroppable();

        // Wire up the persistent add-task input row
        const addTaskInput = thisList.querySelector('.add-task-input');
        const addTaskBtn = thisList.querySelector('.add-task-btn');

        addTaskBtn.addEventListener('click', () => this.submitNewTask(addTaskInput));
        addTaskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.submitNewTask(addTaskInput);
        });
    }

    connectDroppable() {
        // Task drop handling is now managed by Board.connectTaskDrag()
    }

    connectDrag(taskId) {
        // Task drag is now managed by Board.connectTaskDrag() via event delegation
    }

    submitNewTask(inputEl) {
        const name = inputEl.value.trim();
        if (name === '') return;
        const newTask = new Task(Math.random().toString(), this.id, name);
        this.addTask(newTask, true);
        inputEl.value = '';
        inputEl.focus();
    }

    addTask(task, animate = false) {
        this.tasks.push(task);
        const target = document.getElementById(task.parentListID);
        const newTaskEl = document.createElement('li');
        newTaskEl.setAttribute('id', task.taskID);
        newTaskEl.classList.add('task');
        newTaskEl.setAttribute('draggable', true);

        newTaskEl.innerHTML = `
            <div class="task-content">
                <button class="task-check" title="Mark complete">✓</button>
                <span class="task-title">${task.taskName}</span>
                <button class="task-edit-btn" title="Edit task">✎</button>
            </div>
        `;

        // Check button — toggle completed
        newTaskEl.querySelector('.task-check').addEventListener('click', (e) => {
            e.stopPropagation();
            task.completed = !task.completed;
            newTaskEl.classList.toggle('completed', task.completed);
        });

        // Edit button — open card modal
        newTaskEl.querySelector('.task-edit-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            TaskCardModal.open(task, newTaskEl);
        });

        // Insert before the add-task-row so new tasks appear above the input
        const addRow = target.querySelector('.add-task-row');
        if (addRow) {
            target.insertBefore(newTaskEl, addRow);
        } else {
            target.append(newTaskEl);
        }

        // Trigger pop-in animation for user-created tasks
        if (animate) {
            newTaskEl.classList.add('task-pop-in');
            newTaskEl.addEventListener('animationend', () => {
                newTaskEl.classList.remove('task-pop-in');
            }, { once: true });
        }

        this.connectDrag(task.taskID);
    }

    removeTask(task) {
        //Select the task to be removed
        const selectedTask = this.tasks.find((t) => t.taskID === task.taskID);
        const selectedDOMTask = document.getElementById(selectedTask.taskID);
        const target = document.getElementById(task.parentListID);
        target.removeChild(selectedDOMTask);
        this.tasks = this.tasks.filter((t) => t.taskID !== task.taskID);
    }
}

class Board {
    tasklists = [];
    constructor(status) {
        this.status = status;
        const mainApp = document.getElementById('app');
        const newBoard = document.createElement('section');
        newBoard.setAttribute('id', 'board');
        newBoard.classList.add('board');
        mainApp.appendChild(newBoard);

        const activeBoard = document.getElementById('board');

        let count = 1;
        DEFAULT_LISTS.forEach((element) => {
            const newList = new TaskList(`list${count}`, element, activeBoard);
            this.tasklists.push(newList);
            count++;
        });

        console.log('Listas en el tablero actual:', this.tasklists);

        this.connectListDrag();
        this.connectTaskDrag();
    }

    connectTaskDrag() {
        const board = document.getElementById('board');
        let draggedTask = null;
        let originalList = null;
        let originalNextSibling = null;

        // Use event delegation on the board for all task drag events
        board.addEventListener('dragstart', (event) => {
            const taskEl = event.target.closest('.task');
            if (!taskEl) return;

            // Set task-specific data type so list drag doesn't interfere
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
            // Don't handle if this is a list drag
            if (event.dataTransfer.types.includes('application/x-list')) return;
            if (!event.dataTransfer.types.includes('application/x-task')) return;

            event.preventDefault();

            // Find the tasklist the cursor is over
            const targetList = event.target.closest('.tasklist');
            if (!targetList) return;

            // Find the specific task element the cursor is over
            const targetTask = event.target.closest('.task');

            if (targetTask && targetTask !== draggedTask) {
                // Determine if cursor is on upper or lower half of the target task
                const rect = targetTask.getBoundingClientRect();
                const midpoint = rect.top + rect.height / 2;
                const addRow = targetList.querySelector('.add-task-row');

                if (event.clientY < midpoint) {
                    // Insert before the target task
                    if (draggedTask.nextElementSibling !== targetTask) {
                        targetList.insertBefore(draggedTask, targetTask);
                    }
                } else {
                    // Insert after the target task, but never below the add-task row
                    const ref = targetTask.nextElementSibling;
                    const insertRef = (ref && ref === addRow) ? addRow : ref;
                    if (draggedTask.nextElementSibling !== insertRef) {
                        targetList.insertBefore(draggedTask, insertRef);
                    }
                }
            } else if (!targetTask) {
                // Cursor is over the list but not over any task — insert before add-task-row
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

            // If drop didn't happen (cancelled), restore original position
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

        board.addEventListener('drop', (event) => {
            if (!draggedTask) return;
            if (!event.dataTransfer.types.includes('application/x-task')) return;
            event.preventDefault();
            event.stopPropagation();

            // Finalize: remove preview styling
            draggedTask.classList.remove('task-dragging');
            draggedTask.classList.remove('task-preview');

            const newList = draggedTask.closest('.tasklist');

            // Update the tasks arrays in each TaskList
            const taskId = draggedTask.id;

            // Find and remove task object from its old TaskList's array
            let movedTaskObj = null;
            for (const tl of this.tasklists) {
                const idx = tl.tasks.findIndex((t) => t.taskID === taskId);
                if (idx !== -1) {
                    movedTaskObj = tl.tasks.splice(idx, 1)[0];
                    break;
                }
            }

            // Add task to the new TaskList's array
            const newTaskList = this.tasklists.find((tl) => tl.id === newList.id);
            if (newTaskList && movedTaskObj) {
                // Update parent info
                movedTaskObj.parentListID = newList.id;
                movedTaskObj.parentListName = newList.querySelector('.tasklist-name').innerHTML;
                // Insert at the correct index based on DOM position
                const taskEls = [...newList.querySelectorAll('.task')];
                const domIdx = taskEls.findIndex((el) => el.id === taskId);
                newTaskList.tasks.splice(domIdx, 0, movedTaskObj);
            }

            draggedTask = null;
            originalList = null;
            originalNextSibling = null;
        });
    }

    connectListDrag() {
        const board = document.getElementById('board');
        const wrappers = board.querySelectorAll('.tasklist-wrapper');

        let mouseDownTarget = null;
        let draggedWrapper = null;
        let originalNextSibling = null; // to restore position on cancel

        wrappers.forEach((wrapper) => {
            wrapper.addEventListener('mousedown', (event) => {
                mouseDownTarget = event.target;
            });

            wrapper.addEventListener('dragstart', (event) => {
                // If the drag source is a task (not the wrapper itself), don't interfere
                if (event.target !== wrapper) {
                    return;
                }

                // Only allow list drag when starting from the header
                const header = wrapper.querySelector('.tasklist-header');
                if (!header.contains(mouseDownTarget)) {
                    event.preventDefault();
                    return;
                }
                event.dataTransfer.setData('application/x-list', wrapper.querySelector('.tasklist').id);
                event.dataTransfer.effectAllowed = 'move';

                // Remember original position so we can restore on cancel
                draggedWrapper = wrapper;
                originalNextSibling = wrapper.nextSibling;

                // Delay adding visual classes so the drag image captures clean state
                requestAnimationFrame(() => {
                    wrapper.classList.add('list-dragging');
                    wrapper.classList.add('list-preview');
                });
            });

            wrapper.addEventListener('dragend', (event) => {
                if (!draggedWrapper) return;

                // If the drop didn't happen (cancelled), restore original position
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

        // Use a single dragover on the board for efficient position tracking
        board.addEventListener('dragover', (event) => {
            if (!event.dataTransfer.types.includes('application/x-list')) return;
            if (!draggedWrapper) return;
            event.preventDefault();

            // Find which wrapper the cursor is over
            const targetWrapper = event.target.closest('.tasklist-wrapper');
            if (!targetWrapper || targetWrapper === draggedWrapper) return;

            // Determine left/right half
            const rect = targetWrapper.getBoundingClientRect();
            const midpoint = rect.left + rect.width / 2;

            if (event.clientX < midpoint) {
                // Insert before the target
                if (draggedWrapper.nextSibling !== targetWrapper) {
                    board.insertBefore(draggedWrapper, targetWrapper);
                }
            } else {
                // Insert after the target
                if (targetWrapper.nextSibling !== draggedWrapper) {
                    board.insertBefore(draggedWrapper, targetWrapper.nextSibling);
                }
            }
        });

        board.addEventListener('drop', (event) => {
            if (!event.dataTransfer.types.includes('application/x-list')) return;
            if (!draggedWrapper) return;
            event.preventDefault();
            event.stopPropagation();

            // Finalize: remove preview styling
            draggedWrapper.classList.remove('list-dragging');
            draggedWrapper.classList.remove('list-preview');

            // Update tasklists array to match new DOM order
            const domOrder = [...board.querySelectorAll('.tasklist-wrapper .tasklist')].map((el) => el.id);
            this.tasklists.sort((a, b) => domOrder.indexOf(a.id) - domOrder.indexOf(b.id));

            draggedWrapper = null;
            originalNextSibling = null;
        });
    }

    addTaskList(newList) {
        this.tasklist.push(newList);
    }
}

//* Launches the application
class App {
    static init() {
        //* Start the App and Get information from HTML
        console.info('App Started');
        ThemeManager.init();
        TaskCardModal.init();
        const board = new Board('active');
    }
}

App.init();
