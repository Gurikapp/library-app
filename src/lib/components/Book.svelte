<script>
  import { selectedBook } from '$lib/stores/library.js';

  export let book;

  // Derive a slightly darker shade for spine shading
  function darken(hex, amount = 30) {
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3
      ? c.split('').map(x => x + x).join('')
      : c, 16);
    const r = Math.max(0, (num >> 16) - amount);
    const g = Math.max(0, ((num >> 8) & 0xff) - amount);
    const b = Math.max(0, (num & 0xff) - amount);
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  function lighten(hex, amount = 40) {
    const c = hex.replace('#', '');
    const num = parseInt(c.length === 3
      ? c.split('').map(x => x + x).join('')
      : c, 16);
    const r = Math.min(255, (num >> 16) + amount);
    const g = Math.min(255, ((num >> 8) & 0xff) + amount);
    const b = Math.min(255, (num & 0xff) + amount);
    return `#${[r, g, b].map(x => x.toString(16).padStart(2, '0')).join('')}`;
  }

  $: base = book.color || '#5c3d1e';
  $: dark = darken(base, 40);
  $: light = lighten(base, 35);
  $: spineGrad = `linear-gradient(90deg, ${dark} 0%, ${light} 35%, ${base} 60%, ${dark} 100%)`;

  // Determine text color (light or dark) based on brightness
  function brightness(hex) {
    const c = hex.replace('#', '');
    const num = parseInt(c, 16);
    const r = (num >> 16) & 0xff;
    const g = (num >> 8) & 0xff;
    const b = num & 0xff;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
  $: textColor = brightness(base) > 128 ? '#1a0e05' : '#f0e6c8';

  function openBook() {
    selectedBook.set(book);
  }
</script>

<button
  class="book-spine"
  on:click={openBook}
  title={book.title}
  style="
    background: {spineGrad};
    color: {textColor};
    --book-base: {base};
    --book-light: {light};
  "
  aria-label="Открыть книгу: {book.title}"
>
  <span class="book-title">{book.title}</span>
  <div class="spine-decoration top"></div>
  <div class="spine-decoration bottom"></div>
  <div class="spine-highlight"></div>
  <div class="hover-glow"></div>
</button>

<style>
  .book-spine {
    flex: 1;
    min-width: 16px;
    max-width: 28px;
    height: clamp(42px, 7vw, 58px);
    align-self: flex-end;
    border: none;
    border-radius: 1px 2px 2px 1px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      transform 0.18s cubic-bezier(0.34, 1.56, 0.64, 1),
      filter 0.15s ease,
      box-shadow 0.18s ease;
    box-shadow:
      1px 0 3px rgba(0,0,0,0.5),
      -1px 0 2px rgba(0,0,0,0.3),
      inset 1px 0 1px rgba(255,255,255,0.08);
    padding: 4px 2px;
    display: flex;
    align-items: center;
    justify-content: center;
    /* Slight random tilt for organic feel — done via nth-child in parent */
  }

  /* Alternate slight tilts */
  .book-spine:nth-child(3n) { transform-origin: bottom center; }
  .book-spine:nth-child(3n+1) { transform: rotate(-0.4deg); transform-origin: bottom center; }
  .book-spine:nth-child(3n+2) { transform: rotate(0.5deg); transform-origin: bottom center; }

  .book-spine:hover {
    transform: translateY(-6px) rotate(0deg) !important;
    filter: brightness(1.25) saturate(1.2);
    box-shadow:
      2px -3px 12px rgba(0,0,0,0.6),
      0 0 18px rgba(var(--book-light), 0.3),
      inset 1px 0 2px rgba(255,255,255,0.15);
    z-index: 10;
  }

  .book-spine:focus-visible {
    outline: 2px solid var(--gold);
    outline-offset: 2px;
  }

  .book-title {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    font-family: var(--font-body);
    font-size: clamp(7px, 1.2vw, 10px);
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-height: 90%;
    line-height: 1.1;
    position: relative;
    z-index: 2;
    text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  }

  .spine-decoration {
    position: absolute;
    left: 2px;
    right: 2px;
    height: 2px;
    background: rgba(255,255,255,0.12);
    border-radius: 1px;
  }
  .spine-decoration.top { top: 4px; }
  .spine-decoration.bottom { bottom: 4px; }

  .spine-highlight {
    position: absolute;
    top: 0;
    left: 0;
    width: 4px;
    bottom: 0;
    background: linear-gradient(90deg, rgba(255,255,255,0.15), transparent);
    pointer-events: none;
  }

  .hover-glow {
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, rgba(255,255,255,0.12), transparent 70%);
    opacity: 0;
    transition: opacity 0.2s;
    pointer-events: none;
  }
  .book-spine:hover .hover-glow { opacity: 1; }
</style>
