const DEFAULT_LISTS = ['Pendientes', 'En Proceso', 'Finalizadas'];

class Task {
    constructor(taskID, parentID, taskName) {
        this.taskID = taskID;
        this.taskName = taskName;
        this.parentListID = parentID;
        this.parentListName = document
            .getElementById(parentID)
            .querySelector('.tasklist-name').innerHTML;
        //this.connectDrag();
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
                <button class="add-task-btn">+</button>
            </div>
            </div>
            `;
            //console.log(thisList);
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

        //console.dir(this.tasks);

        //$Show Add Task Modal
        const addTaskBtn = thisList.querySelector('.add-task-btn');
        addTaskBtn.addEventListener('click', this.addTaskBtnHandler.bind(this));
    }

    connectDroppable() {
        // Task drop handling is now managed by Board.connectTaskDrag()
    }

    connectDrag(taskId) {
        // Task drag is now managed by Board.connectTaskDrag() via event delegation
    }

    addTaskBtnHandler() {
        const tasklist = document.getElementById(this.id);

        // Guard against duplicates — focus existing form if present
        const existingForm = tasklist.querySelector('.inline-task-form');
        if (existingForm) {
            existingForm.querySelector('input').focus();
            return;
        }

        // Create inline form
        const form = document.createElement('div');
        form.classList.add('inline-task-form');
        form.innerHTML = `
            <input type="text" placeholder="Task name..." />
            <div class="inline-task-form-buttons">
                <button class="inline-task-add">Add</button>
                <button class="inline-task-cancel">✕</button>
            </div>
        `;
        tasklist.appendChild(form);

        const input = form.querySelector('input');
        const addBtn = form.querySelector('.inline-task-add');
        const cancelBtn = form.querySelector('.inline-task-cancel');

        input.focus();

        const submit = () => {
            const name = input.value.trim();
            if (name !== '') {
                const newTask = new Task(Math.random().toString(), this.id, name);
                this.addTask(newTask);
            }
            form.remove();
        };

        const cancel = () => {
            form.remove();
        };

        addBtn.addEventListener('click', submit);
        cancelBtn.addEventListener('click', cancel);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                submit();
            } else if (event.key === 'Escape') {
                cancel();
            }
        });
    }

    addTask(task) {
        this.tasks.push(task);
        const target = document.getElementById(task.parentListID);
        const newTask = document.createElement('li');
        newTask.setAttribute('id', task.taskID);
        newTask.classList.add('task');
        newTask.textContent = task.taskName;
        newTask.setAttribute('draggable', true);
        target.append(newTask);
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

                if (event.clientY < midpoint) {
                    // Insert before the target task
                    if (draggedTask.nextElementSibling !== targetTask) {
                        targetList.insertBefore(draggedTask, targetTask);
                    }
                } else {
                    // Insert after the target task
                    if (targetTask.nextElementSibling !== draggedTask) {
                        targetList.insertBefore(draggedTask, targetTask.nextElementSibling);
                    }
                }
            } else if (!targetTask) {
                // Cursor is over the list but not over any task — append to end
                // But avoid re-appending if already the last task
                const tasks = targetList.querySelectorAll('.task');
                const lastTask = tasks[tasks.length - 1];
                if (lastTask !== draggedTask) {
                    targetList.appendChild(draggedTask);
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

            // Remove task from its old TaskList's array
            for (const tl of this.tasklists) {
                const idx = tl.tasks.findIndex((t) => t.taskID === taskId);
                if (idx !== -1) {
                    tl.tasks.splice(idx, 1);
                    break;
                }
            }

            // Add task to the new TaskList's array
            const newTaskList = this.tasklists.find((tl) => tl.id === newList.id);
            if (newTaskList) {
                // Find the task object and update its parent info
                const taskObj = new Task(taskId, newList.id, draggedTask.textContent);
                // Insert at the correct index based on DOM position
                const taskEls = [...newList.querySelectorAll('.task')];
                const domIdx = taskEls.findIndex((el) => el.id === taskId);
                newTaskList.tasks.splice(domIdx, 0, taskObj);
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
        const board = new Board('active');
    }
}

App.init();
