<script setup lang="ts">
import { useData } from 'vitepress'
import FlutterPreview from './FlutterPreview.vue'

const { frontmatter } = useData()
</script>

<template>
  <!-- 仅当页面 frontmatter 显式声明了 preview 键时，才在右栏顶部渲染预览面板 -->
  <FlutterPreview
    v-if="'preview' in frontmatter"
    :url="frontmatter.preview || undefined"
    :title="frontmatter.previewTitle || '组件预览'"
  />
</template>
