import { defineConfig } from 'vitepress'

export default defineConfig({
  lang: 'zh-CN',
  title: 'IKE Press',
  description: '基于 VitePress 搭建的静态文档站点',

  lastUpdated: true, // 启用最后更新时间
  cleanUrls: true, // 启用简洁 URL

  head: [['link', { rel: 'icon', href: '/favicon.png' }]],

  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/', activeMatch: '/guide/' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
          collapsed: false,
          items: [
            { text: '介绍', link: '/guide/index' },
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '目录结构', link: '/guide/project-structure' },
          ],
        },
      ],
    },

    outline: { level: [2, 6], label: '本页目录' }, // h2-h6收录到右侧目录

    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdatedText: '最后更新',
    darkModeSwitchLabel: '主题', // 仅移动端可见
    sidebarMenuLabel: '菜单', // 仅移动端可见
    returnToTopLabel: '返回顶部',

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
          modal: {
            displayDetails: '展开详情',
            resetButtonTitle: '清空搜索',
            backButtonTitle: '关闭',
            noResultsText: '无法找到相关结果',
            footer: {
              selectText: '选择',
              enterText: '跳转',
            },
          },
        },
      },
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ike-yu-byte/ike_press' },
    ],

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2026 ike_yu <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer">粤ICP备2026151960号-1</a>',
    },
  },
})
