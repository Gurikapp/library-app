<script>
  import Bookcase from './Bookcase.svelte';
  export let grid;
</script>

<div class="library-wrapper">
  <!-- Ambient particles -->
  <div class="dust-particles" aria-hidden="true">
    {#each Array(18) as _, i}
      <span class="dust" style="
        left: {5 + i * 5.2 + Math.sin(i * 1.7) * 4}%;
        animation-delay: {i * 0.7}s;
        animation-duration: {8 + (i % 5) * 2.5}s;
        opacity: {0.15 + (i % 4) * 0.07};
        width: {1 + (i % 3)}px;
        height: {1 + (i % 3)}px;
      "></span>
    {/each}
  </div>

  <header class="library-header">
    <div class="header-ornament">✦</div>
    <h1 class="library-title">Arcanum</h1>
    <p class="library-subtitle">Хранилище знаний и тайн</p>
    <div class="header-ornament">✦</div>
  </header>

  <div class="scroll-hint" aria-label="Прокрутите вправо">
    <span>◁</span>
    <span class="hint-text">листайте</span>
    <span>▷</span>
  </div>

  <div class="bookcases-row">
    {#each grid as bookcaseData, i}
      <Bookcase shelves={bookcaseData} bookcaseIndex={i} />
    {/each}
    <!-- Floor shadow line -->
    <div class="floor-shadow"></div>
  </div>

  <div class="floor"></div>

  <!-- Torch lights -->
  <div class="torch torch-left" aria-hidden="true">
    <div class="torch-flame"></div>
    <div class="torch-glow"></div>
    <div class="torch-handle"></div>
  </div>
  <div class="torch torch-right" aria-hidden="true">
    <div class="torch-flame"></div>
    <div class="torch-glow"></div>
    <div class="torch-handle"></div>
  </div>
</div>

<style>
  .library-wrapper {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 15% 30%, rgba(180, 80, 20, 0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 85% 30%, rgba(180, 80, 20, 0.12) 0%, transparent 55%),
      radial-gradient(ellipse at 50% 0%, rgba(100, 50, 10, 0.25) 0%, transparent 60%),
      linear-gradient(180deg, #0d0603 0%, #1a0d04 40%, #0d0603 100%);
    position: relative;
    overflow-x: hidden;
    padding-bottom: 4rem;
  }

  /* Dust particles */
  .dust-particles {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }
  .dust {
    position: absolute;
    background: var(--gold);
    border-radius: 50%;
    animation: float linear infinite;
    top: 100%;
  }
  @keyframes float {
    0% { transform: translateY(0) translateX(0); opacity: 0; top: 100%; }
    10% { opacity: 1; }
    90% { opacity: 0.5; }
    100% { transform: translateY(-100vh) translateX(30px); opacity: 0; top: 0; }
  }

  /* Header */
  .library-header {
    text-align: center;
    padding: 3rem 2rem 1.5rem;
    position: relative;
    z-index: 2;
  }
  .library-title {
    font-family: var(--font-display);
    font-size: clamp(2.8rem, 8vw, 6rem);
    font-weight: 700;
    color: var(--gold-bright);
    letter-spacing: 0.18em;
    text-shadow:
      0 0 40px rgba(201, 168, 76, 0.6),
      0 0 80px rgba(201, 168, 76, 0.3),
      2px 2px 0 rgba(0,0,0,0.8);
    margin: 0.3rem 0;
    line-height: 1;
  }
  .library-subtitle {
    font-family: var(--font-body);
    font-style: italic;
    font-size: clamp(0.9rem, 2vw, 1.2rem);
    color: var(--parchment-dark);
    letter-spacing: 0.25em;
    opacity: 0.75;
    text-transform: uppercase;
  }
  .header-ornament {
    font-size: 1.2rem;
    color: var(--gold);
    opacity: 0.6;
    margin: 0.4rem 0;
  }

  /* Scroll hint */
  .scroll-hint {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    color: var(--gold);
    opacity: 0.4;
    font-size: 0.75rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    margin-bottom: 1rem;
    animation: pulse 3s ease-in-out infinite;
  }
  .hint-text { font-family: var(--font-body); font-style: italic; }
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.6; }
  }

  /* Bookcases row */
  .bookcases-row {
    display: flex;
    gap: 0;
    overflow-x: auto;
    padding: 2rem 4rem 3rem;
    scroll-snap-type: x mandatory;
    scrollbar-color: var(--gold) var(--wood-dark);
    position: relative;
    z-index: 2;
  }
  .bookcases-row::-webkit-scrollbar { height: 6px; }

  .floor-shadow {
    position: absolute;
    bottom: 2.5rem;
    left: 0;
    right: 0;
    height: 30px;
    background: radial-gradient(ellipse at 50% 100%, rgba(0,0,0,0.6) 0%, transparent 70%);
    pointer-events: none;
  }

  .floor {
    width: 100%;
    height: 6px;
    background: linear-gradient(90deg, transparent, var(--wood-mid), var(--gold), var(--wood-mid), transparent);
    opacity: 0.3;
  }

  /* Torches */
  .torch {
    position: fixed;
    top: 28%;
    z-index: 10;
    pointer-events: none;
  }
  .torch-left { left: 1.5rem; }
  .torch-right { right: 1.5rem; }

  .torch-handle {
    width: 8px;
    height: 36px;
    background: linear-gradient(180deg, var(--wood-light), var(--wood-dark));
    border-radius: 2px 2px 4px 4px;
    margin: 0 auto;
    margin-top: 4px;
  }

  .torch-flame {
    width: 18px;
    height: 28px;
    background: radial-gradient(ellipse at 50% 80%, #ff4400, #ffaa00 40%, #ffee88 70%, transparent);
    border-radius: 50% 50% 30% 30%;
    margin: 0 auto;
    animation: flicker 1.2s ease-in-out infinite alternate;
    position: relative;
    z-index: 2;
  }

  .torch-glow {
    position: absolute;
    top: -20px;
    left: 50%;
    transform: translateX(-50%);
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: radial-gradient(ellipse, rgba(255, 120, 20, 0.25) 0%, transparent 70%);
    animation: flicker 1.2s ease-in-out infinite alternate;
  }

  @keyframes flicker {
    0% { transform: scaleX(1) scaleY(1); opacity: 0.9; }
    25% { transform: scaleX(0.92) scaleY(1.06); opacity: 1; }
    50% { transform: scaleX(1.05) scaleY(0.97); opacity: 0.85; }
    75% { transform: scaleX(0.96) scaleY(1.04); opacity: 0.95; }
    100% { transform: scaleX(1.02) scaleY(1.02); opacity: 1; }
  }

  @media (max-width: 640px) {
    .torch { display: none; }
    .bookcases-row { padding: 1rem 1rem 2rem; }
  }
</style>
