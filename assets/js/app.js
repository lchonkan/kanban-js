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

    connectDroppable(id) {
        const targetHandle = document.getElementById(this.id);
        targetHandle.addEventListener('dragenter', (event) => {
            if (event.dataTransfer.types[0] === 'text/plain') {
                event.preventDefault();
            }
        });

        targetHandle.addEventListener('dragover', (event) => {
            if (event.dataTransfer.types[0] === 'text/plain') {
                targetHandle.classList.add('droppable');
                event.preventDefault();
            }
        });

        targetHandle.addEventListener('dragleave', (event) => {
            if (event.relatedTarget !== targetHandle) {
                targetHandle.classList.remove('droppable');
            }
        });

        targetHandle.addEventListener('drop', (event) => {
            event.stopPropagation();
            const tid = event.dataTransfer.getData('text/plain');
            if (this.tasks.find((t) => t.taskID === tid)) {
                console.log('task is already in this list');
            }

            console.log(event);
            const draggedTask = document.getElementById(tid);
            const parentTask = draggedTask.parentElement;
            const parentOfTarget = event.path[2];

            const targetList = parentOfTarget.querySelector('.tasklist');
            targetList.appendChild(draggedTask);
            console.log(targetList);

            console.log('The dragged task:', draggedTask);
            console.log('The parent for the dragged task:', parentTask);
            console.log('The target list for this task', parentOfTarget);
            console.log(this.tasks);
        });
    }

    connectDrag(taskId) {
        const tt = document.getElementById(taskId);
        tt.addEventListener('dragstart', function (event) {
            event.dataTransfer.setData('text/plain', this.id);
            event.dataTransfer.setData('text/plain', this.id);
            event.dataTransfer.effectAllowed = 'move';
            console.log('event target', event.target.id);
            console.log('dragging...', this.id);
        });
        //console.log(tt);
        //console.log('connectDragCalled');
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
