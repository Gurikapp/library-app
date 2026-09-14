<script>
  import BookCase from '$lib/components/BookCase.svelte';
  import BookReader from '$lib/components/BookReader.svelte';

  export let data;

  let selectedBook = null;

  function openBook(book) {
    selectedBook = book;
    document.body.style.overflow = 'hidden';
  }

  function closeBook() {
    selectedBook = null;
    document.body.style.overflow = '';
  }
</script>

<svelte:head>
  <title>Вброс хранилище</title>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
</svelte:head>

<div class="library-wrapper">

  <div class="cases-scroll">
    <div class="cases-container">
      {#each data.library as shelves, caseIndex}
        <BookCase
          {shelves}
          caseNumber={caseIndex + 1}
          on:openBook={(e) => openBook(e.detail)}
        />
      {/each}
    </div>
  </div>

</div>

{#if selectedBook}
  <BookReader book={selectedBook} on:close={closeBook} />
{/if}

<style>
  :global(*) { margin: 0; padding: 0; box-sizing: border-box; }

  :global(body) {
    background: #0a0704;
    color: #e8d5b0;
    overflow-x: hidden;
  }

  :global(:root) {
    --wood-dark: #1a0e06;
    --wood-mid: #2d1f0e;
    --wood-light: #4a3420;
    --gold: #c8a84b;
    --gold-light: #e8c870;
    --gold-dark: #8a6f2e;
    --parchment: #f0e6c8;
    --font-display: 'Cinzel Decorative', serif;
    --font-body: 'Crimson Text', serif;
  }

  .library-wrapper {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background:
      radial-gradient(ellipse at 50% 0%, rgba(120, 80, 20, 0.2) 0%, transparent 60%),
      radial-gradient(ellipse at 20% 50%, rgba(80, 40, 10, 0.15) 0%, transparent 50%),
      radial-gradient(ellipse at 80% 50%, rgba(80, 40, 10, 0.15) 0%, transparent 50%),
      #0a0704;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.25; }
    50% { opacity: 0.5; }
  }

  .cases-scroll {
    flex: 1;
    overflow-x: auto;
    padding: 2.5rem 1rem 3rem;
    scrollbar-width: thin;
    scrollbar-color: var(--gold-dark) var(--wood-dark);
  }

  .cases-scroll::-webkit-scrollbar { height: 6px; }
  .cases-scroll::-webkit-scrollbar-track { background: var(--wood-dark); }
  .cases-scroll::-webkit-scrollbar-thumb { background: var(--gold-dark); border-radius: 3px; }

  .cases-container {
    display: flex;
    gap: 3rem;
    min-width: max-content;
    padding: 0 2rem 1rem;
    align-items: flex-start;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .cases-container { gap: 2rem; padding: 0 1rem 1rem; }
  }

  @media (max-width: 480px) {
    .cases-container { gap: 1.5rem; }
  }
</style>
