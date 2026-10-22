import { defineConfig } from 'vitepress'

export default defineConfig({
  lastUpdated: true, // 启用最后更新时间
  cleanUrls: true, // 启用简洁 URL

  head: [['link', { rel: 'icon', href: '/favicon.png' }]],

  // 国际化：root = 简体中文（站点根路径），en = 英文（/en/ 路径）
  // 配置 locales 后，导航栏右上角自动出现语言切换下拉按钮
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'IKE Press',
      description: '一个程序员的碎碎念',
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
        returnToTopLabel: '返回顶部', // 仅移动端可见
        langMenuLabel: '切换语言',

        search: {
          provider: 'local',
          options: {
            locales: {
              root: {
                translations: {
                  button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
                  modal: {
                    displayDetails: '展开详情',
                    resetButtonTitle: '清空搜索',
                    backButtonTitle: '关闭',
                    noResultsText: '无法找到相关结果',
                    footer: {
                      selectText: '选择',
                      selectKeyAriaLabel: '回车键',
                      navigateText: '切换',
                      navigateUpKeyAriaLabel: '上箭头',
                      navigateDownKeyAriaLabel: '下箭头',
                      closeText: '关闭',
                      closeKeyAriaLabel: 'Esc 键',
                    },
                  },
                },
              },
            },
          },
        },

        socialLinks: [
          { icon: 'github', link: 'https://github.com/ike-yu-byte/ike_press' },
          {
            icon: 'wechat',
            link: 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzUxNTU1NDk5Mg%3D%3D&scene=305#wechat_redirect',
            ariaLabel: '微信公众号',
          },
        ],

        footer: {
          message: '基于 MIT 许可发布',
          copyright:
            'Copyright © 2026 ike_yu <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer">粤ICP备2026151960号-1</a>',
        },
      },
    },

    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'IKE Press',
      description: 'A programmer’s rambling blog',
      themeConfig: {
        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Guide', link: '/en/guide/', activeMatch: '/en/guide/' },
        ],

        sidebar: {
          '/en/guide/': [
            {
              text: 'Getting Started',
              collapsed: false,
              items: [
                { text: 'Introduction', link: '/en/guide/index' },
                { text: 'Quick Start', link: '/en/guide/getting-started' },
                { text: 'Project Structure', link: '/en/guide/project-structure' },
              ],
            },
          ],
        },

        outline: { level: [2, 6], label: 'On this page' },

        docFooter: { prev: 'Previous', next: 'Next' },
        lastUpdatedText: 'Last updated',
        langMenuLabel: 'Change language',

        search: {
          provider: 'local',
        },

        socialLinks: [
          { icon: 'github', link: 'https://github.com/ike-yu-byte/ike_press' },
          {
            icon: 'wechat',
            link: 'https://mp.weixin.qq.com/mp/profile_ext?action=home&__biz=MzUxNTU1NDk5Mg%3D%3D&scene=305#wechat_redirect',
            ariaLabel: 'WeChat Official Account',
          },
        ],

        footer: {
          message: 'Published under the MIT License',
          copyright:
            'Copyright © 2026 ike_yu <a href="https://beian.miit.gov.cn/#/Integrated/index" target="_blank" rel="noopener noreferrer">粤ICP备2026151960号-1</a>',
        },
      },
    },
  },
})
