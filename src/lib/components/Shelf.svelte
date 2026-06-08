<script>
  import Book from './Book.svelte';
  export let books;
  export let shelfNumber;
</script>

<div class="shelf-wrapper">
  <!-- Shelf number label -->
  <div class="shelf-number">{shelfNumber}</div>

  <!-- Books row -->
  <div class="books-row">
    {#each books as book, i}
      {#if book}
        <Book {book} />
      {:else}
        <div class="empty-slot"></div>
      {/if}
    {/each}
  </div>

  <!-- Shelf plank -->
  <div class="shelf-plank">
    <div class="plank-edge"></div>
    <div class="plank-surface"></div>
    <div class="plank-shadow"></div>
  </div>
</div>

<style>
  .shelf-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 56px;
  }

  .shelf-number {
    position: absolute;
    left: -14px;
    bottom: 10px;
    font-family: var(--font-display);
    font-size: 0.45rem;
    color: var(--gold);
    opacity: 0.3;
    writing-mode: vertical-rl;
    letter-spacing: 0.1em;
  }

  .books-row {
    flex: 1;
    display: flex;
    align-items: flex-end;
    padding: 4px 6px 0;
    gap: 1px;
    position: relative;
    z-index: 2;
  }

  .empty-slot {
    flex: 1;
    min-width: 14px;
    max-width: 26px;
    height: 80%;
    align-self: flex-end;
  }

  /* Shelf plank */
  .shelf-plank {
    height: 9px;
    position: relative;
    flex-shrink: 0;
  }
  .plank-edge {
    height: 3px;
    background: linear-gradient(90deg,
      var(--wood-dark) 0%,
      var(--wood-light) 15%,
      #8B5a2b 50%,
      var(--wood-light) 85%,
      var(--wood-dark) 100%
    );
    box-shadow: 0 0 4px rgba(201,168,76,0.1);
  }
  .plank-surface {
    height: 6px;
    background: linear-gradient(180deg,
      var(--wood-mid) 0%,
      var(--wood-dark) 100%
    );
  }
  .plank-shadow {
    position: absolute;
    bottom: -4px;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(180deg, rgba(0,0,0,0.5), transparent);
  }
</style>
