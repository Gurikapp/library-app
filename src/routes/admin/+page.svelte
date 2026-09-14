<script>
  import { onMount } from 'svelte';

  // ───── AUTH ─────
  let token = '';
  let password = '';
  let authError = '';
  let isLoggedIn = false;
  let authLoading = false;

  // ───── STATE ─────
  let books = [];
  let loading = false;
  let error = '';
  let success = '';

  // ───── EDITOR ─────
  let mode = 'list'; // 'list' | 'new' | 'edit'
  let editBook = null;

  // Поля формы
  let fTitle = '';
  let fContent = '';
  let fColor = '';
  let fTextColor = '#f0e6d3';
  let fShelf = '';
  let fPosition = '';
  let fFilename = '';
  let fRandomColor = true;
  let fRandomSlot = true;

  let saving = false;
  let freeSlots = [];
  let slotsLoading = false;

  // Предустановленные цвета книг
  const PRESET_COLORS = [
    '#4a3728','#2d4a28','#28394a','#4a2d3d','#4a4228',
    '#6b2d1e','#1e3d6b','#3d6b1e','#6b1e5a','#5b4caf',
    '#8b4513','#2f4f4f','#722f37','#1c3a4a','#4a3000',
  ];

  const TEXT_COLORS = [
    { label: 'Золото', value: '#f0e6d3' },
    { label: 'Кремовый', value: '#f5f0e8' },
    { label: 'Серебро', value: '#e0e0e8' },
    { label: 'Белый', value: '#ffffff' },
    { label: 'Тёплый', value: '#ffe4b5' },
  ];

  function randomFrom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ───── AUTH FUNCTIONS ─────
  async function login() {
    authLoading = true;
    authError = '';
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      const data = await res.json();
      if (!res.ok) { authError = data.error || 'Ошибка входа'; return; }
      token = data.token;
      localStorage.setItem('admin_token', token);
      isLoggedIn = true;
      await loadBooks();
    } catch {
      authError = 'Ошибка соединения';
    } finally {
      authLoading = false;
    }
  }

  function logout() {
    token = '';
    localStorage.removeItem('admin_token');
    isLoggedIn = false;
    books = [];
    mode = 'list';
  }

  // ───── BOOKS FUNCTIONS ─────
  async function loadBooks() {
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/books', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) { logout(); return; }
      const data = await res.json();
      books = data.map(b => {
        const fm = parseFrontmatter(b.rawContent);
        const body = extractBody(b.rawContent);
        return {
          ...b,
          title: fm.title || b.name.replace('.md', ''),
          shelf: fm.shelf || '',
          position: fm.position || '',
          color: fm.color || '#4a3728',
          textColor: fm.textColor || '#f0e6d3',
          body
        };
      });
    } catch {
      error = 'Не удалось загрузить книги';
    } finally {
      loading = false;
    }
  }

  function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) return {};
    const fm = {};
    for (const line of match[1].split(/\r?\n/)) {
      const m = line.match(/^(\w+):\s*"?([^"#]*?)"?\s*(?:#.*)?$/);
      if (m) fm[m[1].trim()] = m[2].trim();
    }
    return fm;
  }

  function extractBody(raw) {
    return raw.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').trim();
  }

  function buildFileContent(title, body, color, textColor, shelf, position) {
    const spineColor = darkenColor(color);
    return `---\ntitle: ${title}\nshelf: ${shelf}\nposition: ${position}\ncolor: "${color}"\nspineColor: "${spineColor}"\ntextColor: "${textColor}"\n---\n\n${body}`;
  }

  function darkenColor(hex) {
    try {
      const r = parseInt(hex.slice(1,3),16);
      const g = parseInt(hex.slice(3,5),16);
      const b = parseInt(hex.slice(5,7),16);
      return `#${Math.max(0,r-30).toString(16).padStart(2,'0')}${Math.max(0,g-30).toString(16).padStart(2,'0')}${Math.max(0,b-30).toString(16).padStart(2,'0')}`;
    } catch { return hex; }
  }

  async function loadFreeSlots() {
    slotsLoading = true;
    try {
      const res = await fetch('/api/slots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      freeSlots = data.free || [];
    } catch {
      freeSlots = [];
    } finally {
      slotsLoading = false;
    }
  }

  function startNew() {
    mode = 'new';
    editBook = null;
    fTitle = '';
    fContent = '';
    fColor = randomFrom(PRESET_COLORS);
    fTextColor = '#f0e6d3';
    fShelf = '';
    fPosition = '';
    fFilename = '';
    fRandomColor = true;
    fRandomSlot = true;
    loadFreeSlots();
  }

  function startEdit(book) {
    mode = 'edit';
    editBook = book;
    fTitle = book.title;
    fContent = book.body;
    fColor = book.color;
    fTextColor = book.textColor;
    fShelf = book.shelf;
    fPosition = book.position;
    fFilename = book.name;
    fRandomColor = false;
    fRandomSlot = false;
    loadFreeSlots();
  }

  function cancelEdit() {
    mode = 'list';
    editBook = null;
    error = '';
  }

  async function saveBook() {
    if (!fTitle.trim()) { error = 'Введите название'; return; }
    if (!fContent.trim()) { error = 'Введите текст'; return; }

    saving = true;
    error = '';
    success = '';

    try {
      // Определяем цвет
      const color = fRandomColor ? randomFrom(PRESET_COLORS) : fColor;
      const textColor = fTextColor;

      // Определяем место
      let shelf, position;
      if (fRandomSlot) {
        if (freeSlots.length === 0) {
          error = 'Нет свободных мест на первых двух стеллажах';
          saving = false;
          return;
        }
        const slot = randomFrom(freeSlots);
        shelf = slot.shelf;
        position = slot.position;
      } else {
        shelf = parseInt(fShelf) || 1;
        position = parseInt(fPosition) || 1;
      }

      const content = buildFileContent(fTitle.trim(), fContent.trim(), color, textColor, shelf, position);

      if (mode === 'new') {
        const filename = fFilename.trim() || fTitle.trim();
        const res = await fetch('/api/books', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ filename, content })
        });
        const data = await res.json();
        if (!res.ok) { error = data.error || 'Ошибка сохранения'; saving = false; return; }
      } else {
        const res = await fetch('/api/books', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            path: editBook.path,
            sha: editBook.sha,
            content,
            filename: editBook.name
          })
        });
        const data = await res.json();
        if (!res.ok) { error = data.error || 'Ошибка сохранения'; saving = false; return; }
      }

      success = mode === 'new'
        ? '✓ Книга добавлена! Сайт обновится через ~1 минуту.'
        : '✓ Книга обновлена! Сайт обновится через ~1 минуту.';
      mode = 'list';
      await loadBooks();
    } catch {
      error = 'Ошибка при сохранении';
    } finally {
      saving = false;
    }
  }

  async function deleteBook(book) {
    if (!confirm(`Удалить книгу «${book.title}»? Это действие нельзя отменить.`)) return;
    error = '';
    success = '';
    try {
      const res = await fetch('/api/books', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path: book.path, sha: book.sha, filename: book.name })
      });
      const data = await res.json();
      if (!res.ok) { error = data.error || 'Ошибка удаления'; return; }
      success = `✓ Книга «${book.title}» удалена.`;
      await loadBooks();
    } catch {
      error = 'Ошибка при удалении';
    }
  }

  onMount(async () => {
    const saved = localStorage.getItem('admin_token');
    if (saved) {
      token = saved;
      const res = await fetch('/api/auth', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        isLoggedIn = true;
        await loadBooks();
      } else {
        localStorage.removeItem('admin_token');
      }
    }
  });
</script>

<svelte:head>
  <title>Вброс админка</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
</svelte:head>

<div class="admin-wrapper">

  <!-- ══════ ЛОГИН ══════ -->
  {#if !isLoggedIn}
  <div class="login-screen">
    <div class="login-box">
      <div class="login-ornament">✦</div>
      <h1 class="login-title">Вброс</h1>
      <p class="login-sub">Вход</p>
      <div class="login-ornament">✦</div>

      <form on:submit|preventDefault={login} class="login-form">
        <input
          type="password"
          bind:value={password}
          placeholder="Пароль"
          class="login-input"
          autocomplete="current-password"
          disabled={authLoading}
        />
        {#if authError}
          <p class="login-error">{authError}</p>
        {/if}
        <button type="submit" class="btn-primary" disabled={authLoading}>
          {authLoading ? 'Вхожу...' : 'Войти'}
        </button>
      </form>
      <a href="/" class="back-link">← Вернуться в библиотеку</a>
    </div>
  </div>

  <!-- ══════ ГЛАВНЫЙ ИНТЕРФЕЙС ══════ -->
  {:else}
  <header class="admin-header">
    <div class="header-left">
      <span class="header-ornament">✦</span>
      <h1 class="header-title">Вброс</h1>
      <span class="header-sub">админка</span>
    </div>
    <div class="header-right">
      <a href="/" class="btn-ghost" target="_blank">Открыть сайт ↗</a>
      <button class="btn-ghost" on:click={logout}>Выйти</button>
    </div>
  </header>

  <main class="admin-main">

    {#if success}
      <div class="alert alert-success">{success}</div>
    {/if}
    {#if error && mode === 'list'}
      <div class="alert alert-error">{error}</div>
    {/if}

    <!-- ──── СПИСОК КНИГ ──── -->
    {#if mode === 'list'}
    <div class="list-header">
      <h2 class="section-title">Книги <span class="count">({books.length})</span></h2>
      <button class="btn-primary" on:click={startNew}>+ Добавить книгу</button>
    </div>

    {#if loading}
      <div class="loading-wrap">
        <span class="spinner">✦</span>
        <span>Загружаю книги...</span>
      </div>
    {:else if books.length === 0}
      <p class="empty-text">Книг пока нет. Добавьте первую!</p>
    {:else}
      <div class="books-grid">
        {#each books as book}
          <div class="book-card">
            <div class="book-card-spine" style="background: {book.color}"></div>
            <div class="book-card-body">
              <div class="book-card-title">{book.title}</div>
              <div class="book-card-meta">
                Полка {book.shelf}, позиция {book.position}
              </div>
              <div class="book-card-preview">
                {book.body.slice(0, 120)}{book.body.length > 120 ? '…' : ''}
              </div>
              <div class="book-card-actions">
                <button class="btn-edit" on:click={() => startEdit(book)}>✏ Редактировать</button>
                <button class="btn-delete" on:click={() => deleteBook(book)}>✕ Удалить</button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}

    <!-- ──── ФОРМА РЕДАКТИРОВАНИЯ / СОЗДАНИЯ ──── -->
    {:else}
    <div class="editor-wrap">
      <div class="editor-header">
        <button class="btn-ghost btn-back" on:click={cancelEdit}>← Назад</button>
        <h2 class="section-title">
          {mode === 'new' ? 'Новая книга' : `Редактировать: ${editBook.title}`}
        </h2>
      </div>

      {#if error}
        <div class="alert alert-error">{error}</div>
      {/if}

      <div class="editor-layout">
        <!-- Левая колонка: настройки -->
        <div class="editor-sidebar">

          <div class="field">
            <label class="field-label">Название книги *</label>
            <input class="field-input" bind:value={fTitle} placeholder="Введите название" />
          </div>

          {#if mode === 'new'}
          <div class="field">
            <label class="field-label">Имя файла (необязательно)</label>
            <input class="field-input" bind:value={fFilename} placeholder="{fTitle || 'название'}" />
            <span class="field-hint">Если пусто — используется название</span>
          </div>
          {/if}

          <!-- ЦВЕТ -->
          <div class="field">
            <div class="field-toggle">
              <label class="field-label">Цвет обложки</label>
              <label class="toggle">
                <input type="checkbox" bind:checked={fRandomColor} />
                <span class="toggle-track"></span>
                <span class="toggle-label">Случайный</span>
              </label>
            </div>

            {#if !fRandomColor}
            <div class="color-grid">
              {#each PRESET_COLORS as c}
                <button
                  class="color-swatch"
                  class:selected={fColor === c}
                  style="background: {c}"
                  on:click={() => fColor = c}
                  title={c}
                ></button>
              {/each}
            </div>
            <div class="custom-color-row">
              <label class="field-label-sm">Свой цвет:</label>
              <input type="color" bind:value={fColor} class="color-input" />
              <span class="color-hex">{fColor}</span>
            </div>
            {:else}
            <div class="random-preview">
              {#each PRESET_COLORS.slice(0, 6) as c}
                <span class="color-dot" style="background:{c}"></span>
              {/each}
              <span class="random-label">один из этих</span>
            </div>
            {/if}
          </div>

          <!-- ЦВЕТ ТЕКСТА -->
          <div class="field">
            <label class="field-label">Цвет текста на обложке</label>
            <div class="text-color-row">
              {#each TEXT_COLORS as tc}
                <button
                  class="text-color-btn"
                  class:selected={fTextColor === tc.value}
                  style="background:{fColor || '#4a3728'}; color:{tc.value}; border-color: {fTextColor === tc.value ? tc.value : 'transparent'}"
                  on:click={() => fTextColor = tc.value}
                >{tc.label}</button>
              {/each}
            </div>
          </div>

          <!-- МЕСТО НА ПОЛКЕ -->
          <div class="field">
            <div class="field-toggle">
              <label class="field-label">Место на полке</label>
              <label class="toggle">
                <input type="checkbox" bind:checked={fRandomSlot} />
                <span class="toggle-track"></span>
                <span class="toggle-label">Случайное</span>
              </label>
            </div>

            {#if fRandomSlot}
              {#if slotsLoading}
                <p class="field-hint">Проверяю свободные места...</p>
              {:else}
                <p class="field-hint">
                  Свободно {freeSlots.length} мест{freeSlots.length === 1 ? 'о' : freeSlots.length < 5 ? 'а' : ''} на первых двух стеллажах
                </p>
              {/if}
            {:else}
              <div class="slot-inputs">
                <div>
                  <label class="field-label-sm">Полка (1–48)</label>
                  <input
                    class="field-input field-input-sm"
                    type="number" min="1" max="48"
                    bind:value={fShelf}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label class="field-label-sm">Позиция (1–11)</label>
                  <input
                    class="field-input field-input-sm"
                    type="number" min="1" max="11"
                    bind:value={fPosition}
                    placeholder="1"
                  />
                </div>
              </div>
              {#if !slotsLoading && freeSlots.length > 0}
              <details class="slots-details">
                <summary>Занятые места</summary>
                <div class="shelf-map">
                  {#each Array(24) as _, si}
                    <div class="shelf-map-row">
                      <span class="shelf-map-label">{si+1}</span>
                      {#each Array(11) as _, pi}
                        {@const isOccupied = !freeSlots.find(f => f.shelf === si+1 && f.position === pi+1)}
                        <div
                          class="shelf-map-cell"
                          class:occupied={isOccupied}
                          class:selected={parseInt(fShelf) === si+1 && parseInt(fPosition) === pi+1}
                          on:click={() => { fShelf = si+1; fPosition = pi+1; }}
                          title="Полка {si+1}, позиция {pi+1}"
                        ></div>
                      {/each}
                    </div>
                  {/each}
                </div>
              </details>
              {/if}
            {/if}
          </div>

        </div>

        <!-- Правая колонка: текст -->
        <div class="editor-main">
          <div class="field editor-field">
            <label class="field-label">Текст книги * <span class="field-hint-inline">(Markdown)</span></label>
            <textarea
              class="editor-textarea"
              bind:value={fContent}
              placeholder="Текст вашего произведения..."
              spellcheck="true"
            ></textarea>
          </div>

          <!-- Предпросмотр обложки -->
          <div class="preview-section">
            <span class="field-label">Предпросмотр обложки:</span>
            <div class="book-preview" style="background: {fColor || '#4a3728'}">
              <span style="color: {fTextColor}">{fTitle || 'Название'}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="editor-actions">
        <button class="btn-ghost" on:click={cancelEdit} disabled={saving}>Отмена</button>
        <button class="btn-primary" on:click={saveBook} disabled={saving}>
          {saving ? 'Сохраняю...' : mode === 'new' ? 'Добавить книгу' : 'Сохранить изменения'}
        </button>
      </div>
    </div>
    {/if}

  </main>
  {/if}
</div>

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }
  :global(body) { background: #0e0a06; color: #e8d5b0; font-family: 'Crimson Text', serif; }

  /* ── ОБЩИЕ ── */
  .admin-wrapper { min-height: 100vh; display: flex; flex-direction: column; }

  .btn-primary {
    background: linear-gradient(135deg, #c8a84b, #a07830);
    color: #1a0e06;
    border: none;
    padding: 0.6rem 1.4rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    transition: filter 0.2s, transform 0.1s;
    white-space: nowrap;
  }
  .btn-primary:hover:not(:disabled) { filter: brightness(1.15); transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-ghost {
    background: transparent;
    color: #c8a84b;
    border: 1px solid rgba(200,168,75,0.4);
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Crimson Text', serif;
    font-size: 0.9rem;
    transition: background 0.2s, color 0.2s;
    text-decoration: none;
    display: inline-flex;
    align-items: center;
  }
  .btn-ghost:hover { background: rgba(200,168,75,0.1); color: #e8c870; }

  .alert {
    padding: 0.8rem 1.2rem;
    border-radius: 4px;
    margin-bottom: 1rem;
    font-size: 0.95rem;
  }
  .alert-success { background: rgba(50,120,50,0.2); border: 1px solid rgba(80,160,80,0.4); color: #90d090; }
  .alert-error { background: rgba(120,40,40,0.3); border: 1px solid rgba(180,60,60,0.4); color: #f09090; }

  /* ── ЛОГИН ── */
  .login-screen {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      radial-gradient(ellipse at 50% 30%, rgba(120,80,20,0.2) 0%, transparent 60%),
      #0e0a06;
  }

  .login-box {
    background: rgba(45,31,14,0.8);
    border: 1px solid rgba(200,168,75,0.3);
    border-radius: 8px;
    padding: 2.5rem 2rem;
    width: min(380px, 90vw);
    text-align: center;
    box-shadow: 0 20px 60px rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
  }

  .login-ornament { color: #c8a84b; opacity: 0.5; font-size: 1rem; margin: 0.5rem 0; }
  .login-title {
    font-family: 'Cinzel Decorative', serif;
    font-size: 2rem;
    color: #c8a84b;
    letter-spacing: 0.2em;
    text-shadow: 0 0 30px rgba(201,168,76,0.4);
    margin: 0.3rem 0;
  }
  .login-sub { color: #9a8060; font-style: italic; font-size: 0.9rem; margin-bottom: 1.5rem; }
  .login-form { display: flex; flex-direction: column; gap: 0.8rem; margin-top: 1.5rem; }
  .login-input {
    background: rgba(10,7,4,0.6);
    border: 1px solid rgba(200,168,75,0.3);
    color: #e8d5b0;
    padding: 0.75rem 1rem;
    border-radius: 4px;
    font-family: 'Crimson Text', serif;
    font-size: 1rem;
    text-align: center;
    outline: none;
    transition: border-color 0.2s;
  }
  .login-input:focus { border-color: rgba(200,168,75,0.7); }
  .login-error { color: #f09090; font-size: 0.85rem; }
  .back-link {
    display: block;
    margin-top: 1.2rem;
    color: #9a8060;
    font-size: 0.85rem;
    text-decoration: none;
    transition: color 0.2s;
  }
  .back-link:hover { color: #c8a84b; }

  /* ── HEADER ── */
  .admin-header {
    background: linear-gradient(180deg, #1a0e06, #0e0a06);
    border-bottom: 1px solid rgba(200,168,75,0.2);
    padding: 0.8rem 1.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .header-left { display: flex; align-items: center; gap: 0.7rem; }
  .header-ornament { color: #c8a84b; opacity: 0.6; }
  .header-title {
    font-family: 'Cinzel Decorative', serif;
    font-size: 1.1rem;
    color: #c8a84b;
    letter-spacing: 0.1em;
  }
  .header-sub { color: #9a8060; font-size: 0.85rem; font-style: italic; }
  .header-right { display: flex; gap: 0.6rem; align-items: center; }

  /* ── MAIN ── */
  .admin-main { flex: 1; max-width: 1200px; margin: 0 auto; width: 100%; padding: 1.5rem; }

  .list-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; }
  .section-title {
    font-family: 'Cinzel Decorative', serif;
    font-size: clamp(1rem, 3vw, 1.4rem);
    color: #c8a84b;
    letter-spacing: 0.05em;
  }
  .count { font-size: 0.7em; opacity: 0.6; }

  .loading-wrap { display: flex; gap: 0.8rem; align-items: center; color: #9a8060; padding: 2rem; }
  .spinner { animation: spin 2s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty-text { color: #9a8060; font-style: italic; padding: 2rem; }

  /* ── КАРТОЧКИ КНИГ ── */
  .books-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1rem;
  }

  .book-card {
    background: rgba(45,31,14,0.6);
    border: 1px solid rgba(200,168,75,0.15);
    border-radius: 6px;
    display: flex;
    overflow: hidden;
    transition: border-color 0.2s, transform 0.2s;
  }
  .book-card:hover { border-color: rgba(200,168,75,0.35); transform: translateY(-2px); }

  .book-card-spine { width: 8px; flex-shrink: 0; }
  .book-card-body { flex: 1; padding: 0.9rem; display: flex; flex-direction: column; gap: 0.4rem; }

  .book-card-title {
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.85rem;
    color: #e8c870;
    line-height: 1.3;
  }
  .book-card-meta { font-size: 0.75rem; color: #9a8060; }
  .book-card-preview { font-size: 0.85rem; color: #c0a878; line-height: 1.5; flex: 1; }

  .book-card-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }

  .btn-edit, .btn-delete {
    border: none;
    padding: 0.35rem 0.7rem;
    border-radius: 3px;
    cursor: pointer;
    font-family: 'Crimson Text', serif;
    font-size: 0.8rem;
    transition: filter 0.2s;
  }
  .btn-edit { background: rgba(200,168,75,0.15); color: #c8a84b; }
  .btn-edit:hover { background: rgba(200,168,75,0.25); }
  .btn-delete { background: rgba(180,50,50,0.15); color: #e08080; }
  .btn-delete:hover { background: rgba(180,50,50,0.3); }

  /* ── РЕДАКТОР ── */
  .editor-wrap { display: flex; flex-direction: column; gap: 1rem; }

  .editor-header { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .btn-back { font-size: 0.85rem; padding: 0.4rem 0.8rem; }

  .editor-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.5rem;
    align-items: start;
  }

  .editor-sidebar {
    background: rgba(45,31,14,0.5);
    border: 1px solid rgba(200,168,75,0.15);
    border-radius: 6px;
    padding: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: 1.1rem;
  }

  .editor-main { display: flex; flex-direction: column; gap: 1rem; }

  .field { display: flex; flex-direction: column; gap: 0.4rem; }
  .editor-field { flex: 1; }

  .field-label { font-family: 'Cinzel Decorative', serif; font-size: 0.7rem; color: #c8a84b; letter-spacing: 0.05em; }
  .field-label-sm { font-size: 0.7rem; color: #9a8060; }
  .field-hint { font-size: 0.75rem; color: #9a8060; font-style: italic; }
  .field-hint-inline { font-size: 0.7em; color: #9a8060; font-family: 'Crimson Text', serif; font-style: italic; }

  .field-input {
    background: rgba(10,7,4,0.6);
    border: 1px solid rgba(200,168,75,0.25);
    color: #e8d5b0;
    padding: 0.55rem 0.8rem;
    border-radius: 4px;
    font-family: 'Crimson Text', serif;
    font-size: 1rem;
    outline: none;
    transition: border-color 0.2s;
    width: 100%;
  }
  .field-input:focus { border-color: rgba(200,168,75,0.6); }
  .field-input-sm { width: 100px; }

  .editor-textarea {
    background: rgba(10,7,4,0.7);
    border: 1px solid rgba(200,168,75,0.25);
    color: #e8d5b0;
    padding: 1rem;
    border-radius: 4px;
    font-family: 'Crimson Text', serif;
    font-size: 1rem;
    line-height: 1.7;
    resize: vertical;
    min-height: 400px;
    width: 100%;
    outline: none;
    transition: border-color 0.2s;
  }
  .editor-textarea:focus { border-color: rgba(200,168,75,0.5); }

  /* ЦВЕТ */
  .field-toggle { display: flex; align-items: center; justify-content: space-between; }

  .toggle { display: flex; align-items: center; gap: 0.4rem; cursor: pointer; }
  .toggle input { display: none; }
  .toggle-track {
    width: 32px; height: 18px;
    background: rgba(200,168,75,0.2);
    border-radius: 9px;
    position: relative;
    transition: background 0.2s;
  }
  .toggle-track::after {
    content: '';
    position: absolute;
    width: 12px; height: 12px;
    border-radius: 50%;
    background: #9a8060;
    top: 3px; left: 3px;
    transition: transform 0.2s, background 0.2s;
  }
  .toggle input:checked + .toggle-track { background: rgba(200,168,75,0.5); }
  .toggle input:checked + .toggle-track::after { transform: translateX(14px); background: #c8a84b; }
  .toggle-label { font-size: 0.78rem; color: #9a8060; }

  .color-grid { display: flex; flex-wrap: wrap; gap: 5px; }
  .color-swatch {
    width: 28px; height: 28px;
    border-radius: 3px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.15s, border-color 0.15s;
  }
  .color-swatch:hover { transform: scale(1.15); }
  .color-swatch.selected { border-color: #e8c870; transform: scale(1.1); }

  .custom-color-row { display: flex; align-items: center; gap: 0.6rem; margin-top: 0.3rem; }
  .color-input { width: 36px; height: 28px; border: none; padding: 0; cursor: pointer; background: none; border-radius: 3px; }
  .color-hex { font-size: 0.8rem; color: #9a8060; font-family: monospace; }

  .random-preview { display: flex; align-items: center; gap: 4px; }
  .color-dot { width: 18px; height: 18px; border-radius: 50%; }
  .random-label { font-size: 0.78rem; color: #9a8060; margin-left: 4px; font-style: italic; }

  .text-color-row { display: flex; flex-wrap: wrap; gap: 5px; }
  .text-color-btn {
    padding: 3px 8px;
    border-radius: 3px;
    border: 2px solid transparent;
    cursor: pointer;
    font-size: 0.75rem;
    font-family: 'Crimson Text', serif;
    transition: border-color 0.15s;
  }
  .text-color-btn.selected { border-color: white; }

  /* СЛОТЫ */
  .slot-inputs { display: flex; gap: 1rem; }
  .slots-details { margin-top: 0.5rem; }
  .slots-details summary { font-size: 0.8rem; color: #9a8060; cursor: pointer; }

  .shelf-map { display: flex; flex-direction: column; gap: 2px; margin-top: 0.5rem; }
  .shelf-map-row { display: flex; align-items: center; gap: 2px; }
  .shelf-map-label { font-size: 0.6rem; color: #9a8060; width: 18px; text-align: right; flex-shrink: 0; }
  .shelf-map-cell {
    width: 14px; height: 10px;
    border-radius: 1px;
    background: rgba(200,168,75,0.25);
    cursor: pointer;
    transition: background 0.15s;
  }
  .shelf-map-cell:hover { background: rgba(200,168,75,0.5); }
  .shelf-map-cell.occupied { background: rgba(180,60,60,0.4); cursor: default; }
  .shelf-map-cell.selected { background: #c8a84b; }

  /* Предпросмотр книги */
  .preview-section { display: flex; align-items: center; gap: 1rem; flex-wrap: wrap; }
  .book-preview {
    width: 100px; height: 140px;
    border-radius: 3px 6px 6px 3px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    text-align: center;
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.65rem;
    line-height: 1.3;
    box-shadow: -3px 0 8px rgba(0,0,0,0.5), 3px 0 6px rgba(0,0,0,0.3);
    transition: background 0.3s;
    word-break: break-word;
  }

  .editor-actions {
    display: flex;
    gap: 0.8rem;
    justify-content: flex-end;
    padding-top: 0.5rem;
    border-top: 1px solid rgba(200,168,75,0.15);
  }

  /* ── АДАПТИВ ── */
  @media (max-width: 900px) {
    .editor-layout { grid-template-columns: 1fr; }
    .editor-sidebar { order: 2; }
    .editor-main { order: 1; }
    .editor-textarea { min-height: 250px; }
  }

  @media (max-width: 600px) {
    .admin-main { padding: 1rem 0.8rem; }
    .list-header { gap: 0.6rem; }
    .books-grid { grid-template-columns: 1fr; }
    .admin-header { padding: 0.6rem 1rem; }
    .header-sub { display: none; }
    .slot-inputs { flex-direction: column; gap: 0.6rem; }
  }
</style>
