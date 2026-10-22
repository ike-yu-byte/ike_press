import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Layout from './Layout.vue'
import FlutterPreview from './components/FlutterPreview.vue'
import './styles/var.css'

export default {
  extends: DefaultTheme,
  // 自定义 Layout：向默认主题的 aside-top 插槽注入组件预览面板
  Layout,
  enhanceApp({ app }) {
    // 也保留全局注册，普通页面可在正文内手动放置
    app.component('FlutterPreview', FlutterPreview)
  },
} satisfies Theme
