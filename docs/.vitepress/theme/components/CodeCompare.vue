<template>
  <div class="code-compare">
    <div class="code-compare-col">
      <div class="code-compare-label">Python</div>
      <slot name="python" />
    </div>
    <div class="code-compare-col">
      <div class="code-compare-label">JS / TS</div>
      <slot name="js" />
    </div>
  </div>
</template>
