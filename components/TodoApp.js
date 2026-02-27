'use client';

import { useState, useEffect, useCallback } from 'react';
import { createSupabaseClient } from '@/lib/supabase';

const STORAGE_KEY = 'my-todo-app';

function rowToTodo(row) {
  return {
    id: row.id,
    text: row.text,
    done: row.done,
    order_index: row.order_index ?? 0,
  };
}

function loadFromStorage() {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveToStorage(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (_) {}
}

export default function TodoApp() {
  const [todos, setTodos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [inputValue, setInputValue] = useState('');
  const [supabase, setSupabase] = useState(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const client = createSupabaseClient();
    setSupabase(client);
  }, []);

  const loadTodos = useCallback(async () => {
    if (supabase) {
      const { data, error } = await supabase
        .from('todos')
        .select('id, text, done, order_index')
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (!error && data) {
        setTodos(data.map(rowToTodo));
        return;
      }
    }
    const stored = loadFromStorage();
    setTodos(
      stored.map((t, i) => ({
        id: t.id || `local-${i}`,
        text: t.text,
        done: t.done,
        order_index: i,
      }))
    );
  }, [supabase]);

  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  const saveToStorageAndSet = (nextTodos) => {
    setTodos(nextTodos);
    saveToStorage(nextTodos);
  };

  const getFilteredTodos = () => {
    if (filter === 'active') return todos.filter((t) => !t.done);
    if (filter === 'done') return todos.filter((t) => t.done);
    return todos;
  };

  const addTodo = async () => {
    const text = inputValue.trim();
    if (!text) return;

    if (supabase) {
      const maxOrder =
        todos.length === 0 ? 0 : Math.max(...todos.map((t) => t.order_index ?? 0));
      const { data, error } = await supabase
        .from('todos')
        .insert({ text, done: false, order_index: maxOrder + 1 })
        .select('id, text, done, order_index')
        .single();
      if (!error && data) {
        setTodos((prev) => [...prev, rowToTodo(data)]);
        setInputValue('');
        return;
      }
    }

    const newTodo = {
      id: `local-${Date.now()}`,
      text,
      done: false,
      order_index: todos.length,
    };
    saveToStorageAndSet([...todos, newTodo]);
    setInputValue('');
  };

  const toggleDone = async (index) => {
    const todo = todos[index];
    if (!todo) return;
    const nextDone = !todo.done;
    const nextTodos = todos.map((t, i) => (i === index ? { ...t, done: nextDone } : t));

    if (supabase && todo.id && !String(todo.id).startsWith('local-')) {
      await supabase.from('todos').update({ done: nextDone }).eq('id', todo.id);
    }
    setTodos(nextTodos);
    saveToStorage(nextTodos);
  };

  const removeTodo = async (index) => {
    const todo = todos[index];
    if (!todo) return;
    if (supabase && todo.id && !String(todo.id).startsWith('local-')) {
      await supabase.from('todos').delete().eq('id', todo.id);
    }
    const nextTodos = todos.filter((_, i) => i !== index);
    saveToStorageAndSet(nextTodos);
  };

  const moveTodo = async (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    const nextTodos = [...todos];
    const [item] = nextTodos.splice(fromIndex, 1);
    const adjustedTo = toIndex > fromIndex ? toIndex - 1 : toIndex;
    nextTodos.splice(adjustedTo, 0, item);

    if (supabase) {
      const updates = nextTodos
        .map((t, i) => ({ id: t.id, order_index: i }))
        .filter((u) => u.id && !String(u.id).startsWith('local-'));
      for (const u of updates) {
        await supabase.from('todos').update({ order_index: u.order_index }).eq('id', u.id);
      }
    }
    saveToStorageAndSet(nextTodos);
  };

  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.setData('application/x-todo-index', String(index));
    setDraggingIndex(index);
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (index === draggingIndex) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    const related = e.relatedTarget;
    if (!related?.closest?.('.todoItem')) setDragOverIndex(null);
  };

  const handleDrop = (e, toIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    const fromIndex = parseInt(e.dataTransfer.getData('application/x-todo-index'), 10);
    if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) moveTodo(fromIndex, toIndex);
  };

  const filtered = getFilteredTodos();
  const emptyText =
    filter === 'done'
      ? '완료된 항목이 없습니다.'
      : filter === 'active'
        ? '미완료 항목이 없습니다.'
        : '아직 할 일이 없습니다.';

  return (
    <div className="app">
      <header className="header">
        <h1 className="title">나만의 할 일 관리</h1>
      </header>

      <section className="inputSection">
        <input
          type="text"
          className="todoInput"
          placeholder="할 일을 입력하세요"
          maxLength={200}
          autoComplete="off"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTodo()}
        />
        <button type="button" className="btn btnAdd" onClick={addTodo}>
          추가
        </button>
      </section>

      <section className="filterSection" aria-label="목록 필터">
        {['all', 'active', 'done'].map((f) => (
          <button
            key={f}
            type="button"
            className={`filterBtn ${filter === f ? 'active' : ''}`}
            data-filter={f}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? '전체' : f === 'active' ? '미완료' : '완료됨'}
          </button>
        ))}
      </section>

      <main className="todoListSection">
        <ul className="todoList" aria-label="할 일 목록">
          {filtered.map((todo, displayIndex) => {
            const index = todos.indexOf(todo);
            const isDragging = draggingIndex === index;
            const isDragOver = dragOverIndex === index;
            return (
              <li
                key={todo.id}
                className={`todoItem ${todo.done ? 'done' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'dragOver' : ''}`}
                data-index={index}
                draggable
                aria-label="순서 변경 가능"
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
              >
                <span className="todoDragHandle" aria-hidden />
                <input
                  type="checkbox"
                  className="todoCheckbox"
                  checked={todo.done}
                  aria-label="완료 표시"
                  onChange={() => toggleDone(index)}
                />
                <span className="todoText">{todo.text}</span>
                <button
                  type="button"
                  className="btn btnDelete"
                  aria-label="삭제"
                  onClick={() => removeTodo(index)}
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
        <p className={`emptyMessage ${filtered.length > 0 ? 'hidden' : ''}`}>{emptyText}</p>
      </main>
    </div>
  );
}
