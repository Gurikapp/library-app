<script>
  import { createEventDispatcher } from 'svelte';

  export let book;

  const dispatch = createEventDispatcher();

  // Deterministic height variation based on book slug
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  const hash = hashCode(book.slug);
  const heightVariation = 48 + (hash % 18); // 48–65px
  const widthVariation = 20 + (hash % 14);  // 20–33px

  function handleClick() {
    dispatch('open', book);
  }
</script>

<button
  class="book-spine"
  style="
    --book-color: {book.color};
    --spine-color: {book.spineColor};
    --text-color: {book.textColor};
    --book-height: {heightVariation}px;
    --book-width: {widthVariation}px;
  "
  on:click={handleClick}
  title={book.title}
  aria-label="Открыть книгу: {book.title}"
>
  <div class="spine-texture"></div>
  <div class="spine-top-detail"></div>
  <div class="spine-bottom-detail"></div>
  <!-- <span class="spine-title">{book.title}</span> -->
  <div class="spine-shine"></div>
</button>

<style>
  .book-spine {
    position: relative;
    width: var(--book-width);
    height: var(--book-height);
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--spine-color) 80%, black) 0%,
      var(--book-color) 20%,
      color-mix(in srgb, var(--book-color) 90%, white) 50%,
      var(--book-color) 80%,
      color-mix(in srgb, var(--spine-color) 60%, black) 100%
    );
    border: none;
    cursor: pointer;
    border-radius: 1px 2px 2px 1px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
    transition: transform 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
    box-shadow:
      -2px 0 4px rgba(0,0,0,0.5),
      2px 0 3px rgba(0,0,0,0.3),
      inset 1px 0 2px rgba(255,255,255,0.05);
    transform-origin: bottom center;
  }

  .book-spine:hover {
    transform: translateY(-8px) scaleX(1.05);
    filter: brightness(1.3);
    box-shadow:
      -3px 0 8px rgba(0,0,0,0.6),
      3px 0 6px rgba(0,0,0,0.4),
      0 0 15px color-mix(in srgb, var(--book-color) 50%, transparent),
      inset 1px 0 2px rgba(255,255,255,0.1);
    z-index: 10;
  }

  .book-spine:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }

  .spine-texture {
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      180deg,
      transparent 0px,
      transparent 3px,
      rgba(0,0,0,0.04) 3px,
      rgba(0,0,0,0.04) 4px
    );
    pointer-events: none;
  }

  .spine-top-detail,
  .spine-bottom-detail {
    position: absolute;
    left: 2px;
    right: 2px;
    height: 3px;
    background: color-mix(in srgb, var(--text-color) 30%, transparent);
    border-radius: 1px;
  }

  .spine-top-detail {
    top: 5px;
  }

  .spine-bottom-detail {
    bottom: 5px;
  }

  .spine-title {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-family: 'Crimson Text', serif;
    font-size: 9px;
    font-weight: 600;
    color: var(--text-color);
    text-align: center;
    padding: 6px 1px;
    line-height: 1.1;
    letter-spacing: 0.05em;
    overflow: hidden;
    max-height: calc(var(--book-height) - 20px);
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    position: relative;
    z-index: 1;
  }

  .spine-shine {
    position: absolute;
    top: 0;
    left: 20%;
    width: 20%;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent);
    pointer-events: none;
  }
</style>
