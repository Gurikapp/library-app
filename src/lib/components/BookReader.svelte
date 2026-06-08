<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from "svelte";
  import { marked } from "marked";

  marked.setOptions({ breaks: true });

  export let book;
  const dispatch = createEventDispatcher();

  let pages = [];
  let currentPage = 0;
  let totalPages = 1;
  let pageContainer;
  let measureDiv;

  function getParagraphs(content) {
    const blocks = content.split(/\n\n+/).filter((p) => p.trim());
    const result = [];
    for (const block of blocks) {
      const lines = block.split("\n").filter((l) => l.trim());
      if (lines.length > 1) {
        result.push(...lines);
      } else {
        result.push(block);
      }
    }
    return result;
  }

  async function buildPages() {
    if (!measureDiv || !pageContainer) return;

    const maxHeight = pageContainer.clientHeight - 20;
    const paragraphs = getParagraphs(book.content);
    const result = [];
    let current = [];

    for (const para of paragraphs) {
      current.push(para);
      measureDiv.innerHTML = marked(current.join("\n"));
      await tick();

      if (measureDiv.offsetHeight > maxHeight && current.length > 1) {
        current.pop();
        result.push(current.join("\n"));
        current = [para];
        measureDiv.innerHTML = marked(current.join("\n"));
        await tick();
      }
    }

    if (current.length > 0) result.push(current.join("\n"));
    pages = result.map((p) => marked(p));
    totalPages = pages.length || 1;
    currentPage = 0;
  }

  function goToPage(index) {
    if (index < 0 || index >= totalPages) return;
    currentPage = index;
  }

  function nextPage() {
    goToPage(currentPage + 1);
  }
  function prevPage() {
    goToPage(currentPage - 1);
  }

  function handleAreaClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX - rect.left < rect.width / 2) prevPage();
    else nextPage();
  }

  function handleKeydown(e) {
    if (e.key === "ArrowRight" || e.key === " ") {
      e.preventDefault();
      nextPage();
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prevPage();
    }
    if (e.key === "Escape") dispatch("close");
  }

  onMount(async () => {
    window.addEventListener("keydown", handleKeydown);
    await tick();
    await buildPages();
  });

  onDestroy(() => {
    window.removeEventListener("keydown", handleKeydown);
  });
</script>

<!-- Overlay backdrop -->
<div
  class="overlay"
  on:click={() => dispatch("close")}
  aria-hidden="true"
></div>

<!-- Book reader -->
<div
  class="reader"
  role="dialog"
  aria-modal="true"
  aria-label="Читать: {book.title}"
>
  <div
    class="reader-header"
    style="--book-color: {book.color}; --text-color: {book.textColor}"
  >
    <h2 class="reader-title">{book.title}</h2>
    <button
      class="close-btn"
      on:click={() => dispatch("close")}
      aria-label="Закрыть книгу">✕</button
    >
  </div>

  <div
    class="page-area"
    bind:this={pageContainer}
    on:click={handleAreaClick}
    role="button"
    tabindex="0"
    on:keydown={(e) => {
      if (e.key === "Enter") handleAreaClick(e);
    }}
  >
    <div
      class="page-hint left"
      class:visible={currentPage > 0}
      aria-hidden="true"
    >
      ‹
    </div>

    <!-- невидимый блок для измерения -->
    <div class="measure-div" bind:this={measureDiv} aria-hidden="true"></div>

    <div class="page">
      <div class="page-inner">
        <div class="page-content" style="--book-color: {book.color}">
          {@html pages[currentPage] ?? ""}
        </div>
      </div>
    </div>

    <div
      class="page-hint right"
      class:visible={currentPage < totalPages - 1}
      aria-hidden="true"
    >
      ›
    </div>
  </div>

  <div
    class="reader-footer"
    style="--book-color: {book.color}; --text-color: {book.textColor}"
  >
    <div class="page-dots">
      {#each pages as _, i}
        <button
          class="page-dot"
          class:active={i === currentPage}
          on:click|stopPropagation={() => goToPage(i)}
          aria-label="Страница {i + 1}"
        ></button>
      {/each}
    </div>
    <div class="page-counter">{currentPage + 1} / {totalPages}</div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 100;
    backdrop-filter: blur(4px);
    animation: fadeIn 0.3s ease;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  .reader {
    position: fixed;
    inset: 5vh 5vw;
    z-index: 101;
    display: flex;
    flex-direction: column;
    background: #f5ead0;
    border-radius: 4px 12px 12px 4px;
    box-shadow:
      -20px 0 60px rgba(0, 0, 0, 0.8),
      20px 0 40px rgba(0, 0, 0, 0.5),
      0 30px 60px rgba(0, 0, 0, 0.7),
      inset -4px 0 10px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    animation: fadeIn 0.25s ease;
  }

  .reader-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.5rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--book-color) 90%, black),
      var(--book-color),
      color-mix(in srgb, var(--book-color) 80%, black)
    );
    border-bottom: 2px solid rgba(200, 168, 75, 0.4);
    position: relative;
    flex-shrink: 0;
  }

  .reader-title {
    flex: 1;
    text-align: center;
    font-family: "Cinzel Decorative", serif;
    font-size: clamp(0.8rem, 2vw, 1.2rem);
    color: var(--text-color);
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    letter-spacing: 0.05em;
  }

  .close-btn {
    position: absolute;
    right: 1rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: var(--text-color);
    cursor: pointer;
    font-size: 1.1rem;
    opacity: 0.6;
    padding: 0.3rem 0.5rem;
    border-radius: 3px;
    transition:
      opacity 0.2s,
      background 0.2s;
    line-height: 1;
  }

  .close-btn:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.2);
  }

  .page-area {
    flex: 1;
    position: relative;
    display: flex;
    align-items: stretch;
    cursor: pointer;
    overflow: hidden;
    background: #f5ead0;
    min-height: 0;
  }

  .page {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .page-inner {
    width: 100%;
    height: 100%;
  }

  .page-content {
    padding: 2.5rem 3rem;
    height: 100%;
    overflow: hidden;
    font-family: "Crimson Text", serif;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #2a1a08;
    background: linear-gradient(
        180deg,
        rgba(200, 168, 75, 0.05) 0%,
        transparent 30%
      ),
      #f5ead0;
    box-sizing: border-box;
  }

  :global(.page-content h1) {
    font-family: "Cinzel Decorative", serif;
    font-size: 1.3rem;
    color: #4a2d0a;
    margin-bottom: 1.5rem;
    text-align: center;
    border-bottom: 1px solid rgba(200, 168, 75, 0.4);
    padding-bottom: 0.8rem;
  }

  :global(.page-content h2, .page-content h3) {
    font-family: "Cinzel Decorative", serif;
    font-size: 1rem;
    color: #4a2d0a;
    margin: 1rem 0 0.5rem;
  }

  :global(.page-content p) {
    margin-bottom: 1rem;
    text-align: justify;
    hyphens: auto;
  }

  :global(.page-content hr) {
    border: none;
    text-align: center;
    margin: 1.5rem 0;
    color: rgba(200, 168, 75, 0.6);
  }

  :global(.page-content hr::before) {
    content: "✦ ✦ ✦";
    font-size: 0.8rem;
  }

  .measure-div {
    position: absolute;
    visibility: hidden;
    pointer-events: none;
    top: 0;
    left: 0;
    right: 0;
    padding: 2.5rem 3rem;
    font-family: "Crimson Text", serif;
    font-size: 1.1rem;
    line-height: 1.8;
    color: #2a1a08;
    box-sizing: border-box;
  }

  .page-hint {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    font-size: 2.5rem;
    color: rgba(74, 52, 32, 0.15);
    pointer-events: none;
    transition:
      opacity 0.3s,
      color 0.3s;
    opacity: 0;
    font-family: "Crimson Text", serif;
    z-index: 2;
  }

  .page-hint.visible {
    opacity: 1;
  }
  .page-hint.left {
    left: 0.8rem;
  }
  .page-hint.right {
    right: 0.8rem;
  }

  .page-area:hover .page-hint.visible {
    color: rgba(74, 52, 32, 0.4);
  }

  .reader-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    padding: 0.8rem 1.5rem;
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--book-color) 90%, black),
      var(--book-color)
    );
    border-top: 1px solid rgba(200, 168, 75, 0.3);
    position: relative;
    flex-shrink: 0;
  }

  .page-dots {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 200px;
  }

  .page-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: rgba(200, 168, 75, 0.3);
    border: none;
    cursor: pointer;
    padding: 0;
    transition:
      background 0.2s,
      transform 0.2s;
  }

  .page-dot.active {
    background: var(--text-color, #d4af37);
    transform: scale(1.3);
  }

  .page-dot:hover {
    background: rgba(200, 168, 75, 0.7);
  }

  .page-counter {
    font-family: "Crimson Text", serif;
    font-size: 0.85rem;
    color: var(--text-color);
    opacity: 0.7;
    min-width: 50px;
    text-align: right;
  }

  @media (max-width: 768px) {
    .reader {
      inset: 0;
      border-radius: 0;
    }

    .page-content {
      padding: 1.5rem 1.5rem;
      font-size: 1rem;
    }

    .measure-div {
      padding: 1.5rem 1.5rem;
      font-size: 1rem;
    }
  }
</style>
