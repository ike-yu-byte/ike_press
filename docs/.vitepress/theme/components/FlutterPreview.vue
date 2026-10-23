<script setup lang="ts">
const props = defineProps<{
  /** Flutter Web 预览页地址，留空则只显示占位框 */
  url?: string
  /** 面板标题 */
  title?: string
}>()
</script>

<template>
  <aside class="flutter-preview">
    <div class="fp-head">
      <span class="fp-title">{{ props.title || '组件预览' }}</span>
      <span class="fp-badge">Flutter Web</span>
    </div>
    <div class="fp-body">
      <iframe
        v-if="props.url"
        class="fp-iframe"
        :src="props.url"
        frameborder="0"
        allow="autoplay; clipboard-write"
      />
      <div v-else class="fp-placeholder">
        <span class="fp-placeholder-icon">📦</span>
        <p>iframe 占位中</p>
        <p class="fp-tip">
          在页面 frontmatter 的 <code>preview:</code> 填入
          Flutter Web 地址即可嵌入实时预览
        </p>
      </div>
    </div>
  </aside>
</template>

<style scoped>
/* 渲染在文档 aside 列内，宽度跟随列宽（Flutter 页通过 pageClass 加宽到 360px） */
.flutter-preview {
  display: flex;
  flex-direction: column;
  width: 100%;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  background-color: var(--vp-c-bg-soft);
  box-shadow: var(--vp-shadow-1);
  overflow: hidden;
}

.fp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--vp-c-divider);
  background-color: var(--vp-c-bg);
  flex-shrink: 0;
}

.fp-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--vp-c-text-1);
}

.fp-badge {
  font-size: 11px;
  font-weight: 500;
  color: var(--vp-c-brand-1);
  padding: 2px 8px;
  border-radius: 99px;
  background-color: var(--vp-c-brand-soft);
}

.fp-body {
  /* 右栏已隐藏 TOC、面板 sticky，适当调高以填充 PC 端视口剩余空间（上限防止超大屏过长） */
  height: min(76vh, 820px);
  flex-shrink: 0;
}

.fp-iframe {
  width: 100%;
  height: 100%;
  border: 0;
  display: block;
}

.fp-placeholder {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 0 16px;
  text-align: center;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.fp-placeholder-icon {
  font-size: 40px;
  margin-bottom: 8px;
}

.fp-tip {
  font-size: 12px;
  color: var(--vp-c-text-3);
}

.fp-placeholder code {
  font-size: 12px;
}
</style>
