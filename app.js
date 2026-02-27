(function () {
  const todoInput = document.getElementById('todo-input');
  const addBtn = document.getElementById('add-btn');
  const todoList = document.getElementById('todo-list');
  const emptyMessage = document.getElementById('empty-message');
  const filterBtns = document.querySelectorAll('.filter-btn');

  let todos = [];
  let filter = 'all';
  let supabase = null;
  const STORAGE_KEY = 'my-todo-app';

  function getFilteredTodos() {
    if (filter === 'active') return todos.filter(function (t) { return !t.done; });
    if (filter === 'done') return todos.filter(function (t) { return t.done; });
    return todos;
  }

  function loadFromStorage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (_) {}
  }

  function rowToTodo(row) {
    return {
      id: row.id,
      text: row.text,
      done: row.done,
      order_index: row.order_index != null ? row.order_index : 0,
    };
  }

  async function getConfig() {
    if (window.__SUPABASE_CONFIG__ && window.__SUPABASE_CONFIG__.url && window.__SUPABASE_CONFIG__.anonKey) {
      return window.__SUPABASE_CONFIG__;
    }
    try {
      const res = await fetch('/.netlify/functions/supabase-config');
      if (!res.ok) return null;
      const data = await res.json();
      return (data.url && data.anonKey) ? data : null;
    } catch (_) {
      return null;
    }
  }

  async function loadTodos() {
    if (supabase) {
      const { data, error } = await supabase
        .from('todos')
        .select('id, text, done, order_index')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && data) {
        todos = data.map(rowToTodo);
        renderTodos();
        return;
      }
    }
    var stored = loadFromStorage();
    todos = stored.map(function (t, i) {
      return { id: t.id || 'local-' + i, text: t.text, done: t.done, order_index: i };
    });
    renderTodos();
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
      li.setAttribute('data-id', todo.id || '');
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
      checkbox.addEventListener('change', function () { toggleDone(index); });

      const span = document.createElement('span');
      span.className = 'todo-text';
      span.textContent = todo.text;

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn-delete';
      deleteBtn.textContent = '삭제';
      deleteBtn.setAttribute('aria-label', '삭제');
      deleteBtn.addEventListener('click', function () { removeTodo(index); });

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
        todoList.querySelectorAll('.todo-item.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
      });
      li.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        var targetLi = e.target.closest('li.todo-item');
        if (!targetLi || targetLi.classList.contains('dragging')) return;
        todoList.querySelectorAll('.todo-item.drag-over').forEach(function (el) { el.classList.remove('drag-over'); });
        targetLi.classList.add('drag-over');
      });
      li.addEventListener('dragleave', function (e) {
        var related = e.relatedTarget;
        if (!related || !li.contains(related)) li.classList.remove('drag-over');
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

  async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    if (supabase) {
      var maxOrder = todos.length === 0 ? 0 : Math.max.apply(null, todos.map(function (t) { return t.order_index || 0; }));
      const { data, error } = await supabase
        .from('todos')
        .insert({ text: text, done: false, order_index: maxOrder + 1 })
        .select('id, text, done, order_index')
        .single();
      if (!error && data) {
        todos.push(rowToTodo(data));
        todoInput.value = '';
        renderTodos();
        todoInput.focus();
        return;
      }
    }

    todos.push({ id: 'local-' + Date.now(), text: text, done: false, order_index: todos.length });
    todoInput.value = '';
    saveToStorage();
    renderTodos();
    todoInput.focus();
  }

  async function toggleDone(index) {
    if (index < 0 || index >= todos.length) return;
    var todo = todos[index];
    todo.done = !todo.done;
    if (supabase && todo.id && String(todo.id).indexOf('local-') !== 0) {
      await supabase.from('todos').update({ done: todo.done }).eq('id', todo.id);
    } else {
      saveToStorage();
    }
    renderTodos();
  }

  async function removeTodo(index) {
    if (index < 0 || index >= todos.length) return;
    var todo = todos[index];
    if (supabase && todo.id && String(todo.id).indexOf('local-') !== 0) {
      await supabase.from('todos').delete().eq('id', todo.id);
    }
    todos.splice(index, 1);
    saveToStorage();
    renderTodos();
  }

  async function moveTodo(fromIndex, toIndex) {
    if (fromIndex < 0 || fromIndex >= todos.length || toIndex < 0 || toIndex >= todos.length) return;
    if (fromIndex === toIndex) return;
    var item = todos.splice(fromIndex, 1)[0];
    if (toIndex > fromIndex) toIndex--;
    todos.splice(toIndex, 0, item);
    if (supabase) {
      var updates = todos.map(function (t, i) { return { id: t.id, order_index: i }; })
        .filter(function (u) { return u.id && String(u.id).indexOf('local-') !== 0; });
      for (var i = 0; i < updates.length; i++) {
        await supabase.from('todos').update({ order_index: updates[i].order_index }).eq('id', updates[i].id);
      }
    } else {
      saveToStorage();
    }
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

  (async function init() {
    var config = await getConfig();
    if (config && typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      supabase = window.supabase.createClient(config.url, config.anonKey);
    }
    await loadTodos();
  })();
})();
