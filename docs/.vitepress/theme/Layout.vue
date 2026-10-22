<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import FlutterAside from './components/FlutterAside.vue'

const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #aside-top>
      <FlutterAside />
    </template>
  </Layout>
</template>
