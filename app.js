(function () {
  const todoInput = document.getElementById('todo-input');
  const addBtn = document.getElementById('add-btn');
  const todoList = document.getElementById('todo-list');
  const emptyMessage = document.getElementById('empty-message');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let todos = loadTodos();
  let filter = 'all'; // 'all' | 'active' | 'done'
  renderTodos();

  function getFilteredTodos() {
    if (filter === 'active') return todos.filter(function (t) { return !t.done; });
    if (filter === 'done') return todos.filter(function (t) { return t.done; });
    return todos;
  }

  function loadTodos() {
    try {
      const saved = localStorage.getItem('my-todo-app');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem('my-todo-app', JSON.stringify(todos));
    } catch (_) {}
  }

  function renderTodos() {
    var filtered = getFilteredTodos();
    todoList.innerHTML = '';
    emptyMessage.classList.toggle('hidden', filtered.length > 0);
    emptyMessage.textContent = filter === 'done' ? '완료된 항목이 없습니다.' : filter === 'active' ? '미완료 항목이 없습니다.' : '아직 할 일이 없습니다.';

    filtered.forEach(function (todo) {
      var index = todos.indexOf(todo);
      const li = document.createElement('li');
      li.className = 'todo-item' + (todo.done ? ' done' : '');
      li.setAttribute('data-index', index);
      li.draggable = true;
      li.setAttribute('aria-label', '순서 변경 가능');

      const dragHandle = document.createElement('span');
      dragHandle.className = 'todo-drag-handle';
      dragHandle.setAttribute('aria-hidden', 'true');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.className = 'todo-checkbox';
      checkbox.checked = todo.done;
      checkbox.setAttribute('aria-label', '완료 표시');
      checkbox.addEventListener('change', function () {
        toggleDone(index);
      });

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.setAttribute('aria-label', '삭제');
      deleteBtn.addEventListener('click', function () {
        removeTodo(index);
      });

      li.appendChild(dragHandle);
      li.appendChild(checkbox);
      li.appendChild(span);
      li.appendChild(deleteBtn);
      todoList.appendChild(li);

      li.addEventListener('dragstart', function (e) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(index));
        e.dataTransfer.setData('application/x-todo-index', String(index));
        li.classList.add('dragging');
      });
      li.addEventListener('dragend', function () {
        li.classList.remove('dragging');
        todoList.querySelectorAll('.todo-item.drag-over').forEach(function (el) {
          el.classList.remove('drag-over');
        });
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var targetLi = e.target.closest('li.todo-item');
        if (!targetLi) return;
        if (targetLi.classList.contains('dragging')) return;
        todoList.querySelectorAll('.todo-item.drag-over').forEach(function (el) {
          el.classList.remove('drag-over');
        });
        targetLi.classList.add('drag-over');
      });
      li.addEventListener('dragleave', function (e) {
        var related = e.relatedTarget;
        if (!related || !li.contains(related)) {
          li.classList.remove('drag-over');
        }
      });
      li.addEventListener('drop', function (e) {
        e.preventDefault();
        li.classList.remove('drag-over');
        var fromIdx = parseInt(e.dataTransfer.getData('application/x-todo-index'), 10);
        var toIdx = parseInt(li.getAttribute('data-index'), 10);
        if (!isNaN(fromIdx) && !isNaN(toIdx)) moveTodo(fromIdx, toIdx);
      });
    });
  }

  function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    todos.push({ text: text, done: false });
    todoInput.value = '';
    saveTodos();
    renderTodos();
    todoInput.focus();
  }

  function toggleDone(index) {
    if (index < 0 || index >= todos.length) return;
    todos[index].done = !todos[index].done;
    saveTodos();
    renderTodos();
  }

  function removeTodo(index) {
    if (index < 0 || index >= todos.length) return;
    todos.splice(index, 1);
    saveTodos();
    renderTodos();
  }

  function moveTodo(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= todos.length || toIndex < 0 || toIndex >= todos.length) return;
    if (fromIndex === toIndex) return;
    var item = todos.splice(fromIndex, 1)[0];
    if (toIndex > fromIndex) toIndex--;
    todos.splice(toIndex, 0, item);
    saveTodos();
    renderTodos();
  }

  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      filter = btn.getAttribute('data-filter');
      filterBtns.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      renderTodos();
    });
  });

  addBtn.addEventListener('click', addTodo);
  todoInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') addTodo();
  });
})();
