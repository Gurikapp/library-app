<script>
  import { createEventDispatcher } from 'svelte';
  import BookSpine from './BookSpine.svelte';

  export let shelves;
  export let caseNumber;

  const dispatch = createEventDispatcher();

  function handleOpenBook(event) {
    dispatch('openBook', event.detail);
  }
</script>

<div class="bookcase" aria-label="Стеллаж {caseNumber}">
  <div class="case-top-molding"></div>
  <div class="case-side left"></div>
  <div class="case-side right"></div>
  
  <div class="shelves-container">
    {#each shelves as shelf, shelfIndex}
      <div class="shelf-row">
        <div class="shelf-back"></div>
        <div class="books-row">
          {#each shelf as book, posIndex}
            {#if book}
              <BookSpine {book} on:open={handleOpenBook} />
            {:else}
              <div class="empty-slot" aria-hidden="true"></div>
            {/if}
          {/each}
        </div>
        <div class="shelf-plank">
          <div class="shelf-plank-front"></div>
        </div>
      </div>
    {/each}
  </div>

  <div class="case-bottom"></div>
</div>

<style>
  .bookcase {
    position: relative;
    display: inline-flex;
    flex-direction: column;
    background: var(--wood-mid);
    border-radius: 4px 4px 0 0;
    box-shadow:
      -8px 0 20px rgba(0,0,0,0.6),
      8px 0 20px rgba(0,0,0,0.6),
      0 10px 40px rgba(0,0,0,0.8),
      inset 0 0 60px rgba(0,0,0,0.3);
    border: 2px solid var(--wood-light);
    border-bottom: none;
    padding: 16px 12px 0;
  }

  .case-top-molding {
    position: absolute;
    top: -12px;
    left: -6px;
    right: -6px;
    height: 14px;
    background: linear-gradient(180deg, #5a3d1e 0%, var(--wood-light) 50%, var(--wood-mid) 100%);
    border-radius: 4px 4px 0 0;
    border: 1px solid rgba(200, 168, 75, 0.2);
    border-bottom: none;
    box-shadow: 0 -4px 10px rgba(0,0,0,0.5);
  }

  .case-side {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 14px;
  }

  .case-side.left {
    left: -14px;
    background: linear-gradient(90deg, #0d0702, #1a0e06);
    border-radius: 4px 0 0 0;
  }

  .case-side.right {
    right: -14px;
    background: linear-gradient(270deg, #0d0702, #1a0e06);
    border-radius: 0 4px 0 0;
  }

  .shelves-container {
    display: flex;
    flex-direction: column;
    width: 320px;
  }

  .shelf-row {
    position: relative;
    padding-bottom: 10px;
  }

  .shelf-back {
    position: absolute;
    inset: 0;
    bottom: 10px;
    background: 
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 40px,
        rgba(0,0,0,0.05) 40px,
        rgba(0,0,0,0.05) 41px
      ),
      linear-gradient(180deg, #100a04, #0d0702);
    z-index: 0;
  }

  .books-row {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: flex-end;
    height: 64px;
    padding: 0 4px;
    gap: 1px;
  }

  .empty-slot {
    flex: 1;
    min-width: 20px;
    max-width: 32px;
    height: 55px;
  }

  .shelf-plank {
    position: relative;
    z-index: 2;
    height: 10px;
  }

  .shelf-plank-front {
    height: 100%;
    background: linear-gradient(180deg, 
      #6b4c26 0%, 
      #4a3420 30%, 
      #3d2a14 70%,
      #2d1f0e 100%
    );
    box-shadow: 
      0 4px 8px rgba(0,0,0,0.6),
      0 2px 4px rgba(0,0,0,0.4),
      inset 0 1px 0 rgba(255,255,255,0.05);
    border-bottom: 1px solid rgba(0,0,0,0.5);
  }

  .case-bottom {
    height: 16px;
    background: linear-gradient(180deg, var(--wood-light), var(--wood-dark));
    margin: 0 -12px;
    border-top: 2px solid rgba(200, 168, 75, 0.15);
    box-shadow: 0 6px 15px rgba(0,0,0,0.7);
  }

  .case-number {
    text-align: center;
    padding: 6px;
    font-family: 'Cinzel Decorative', serif;
    font-size: 0.7rem;
    color: rgba(200, 168, 75, 0.4);
    letter-spacing: 0.1em;
  }
</style>
