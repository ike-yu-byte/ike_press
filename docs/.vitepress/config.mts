import { defineConfig } from 'vitepress'

export default defineConfig({
  outDir: '../dist',
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
          { text: 'Flutter', link: '/flutter/', activeMatch: '/flutter/' },
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

          '/flutter/': [
            {
              text: '开始',
              collapsed: false,
              items: [
                { text: '分区首页', link: '/flutter/index' },
              ],
            },
            {
              text: '基础组件',
              collapsed: false,
              items: [
                { text: 'Text 文本' },
                { text: 'Button 按钮', link: '/flutter/components/button' },
                { text: 'Image 图片' },
                { text: 'Icon 图标' },
                { text: 'Container 容器' },
                { text: 'Padding 内边距' },
                { text: 'SizedBox 尺寸占位' },
                { text: 'Divider 分割线' },
                { text: 'CircleAvatar 头像' },
              ],
            },
            {
              text: '布局组件',
              collapsed: false,
              items: [
                { text: 'Row 横向布局' },
                { text: 'Column 纵向布局' },
                { text: 'Stack 层叠布局' },
                { text: 'Flex 弹性布局' },
                { text: 'Wrap 流式布局' },
                { text: 'Center / Align 对齐' },
                { text: 'Expanded / Flexible 伸展' },
              ],
            },
            {
              text: '滚动与列表',
              collapsed: false,
              items: [
                { text: 'ListView 列表' },
                { text: 'GridView 网格' },
                { text: 'PageView 翻页' },
                { text: 'SingleChildScrollView 单_child 滚动' },
                { text: 'RefreshIndicator 下拉刷新' },
                { text: 'Dismissible 滑动删除' },
                { text: 'ListTile 列表项' },
                { text: 'Card 卡片' },
              ],
            },
            {
              text: '表单输入',
              collapsed: false,
              items: [
                { text: 'TextField 输入框' },
                { text: 'Form 表单校验' },
                { text: 'Checkbox 复选框' },
                { text: 'Radio 单选框' },
                { text: 'Switch 开关' },
                { text: 'Slider 滑块' },
                { text: 'DropdownButton 下拉选择' },
                { text: 'DatePicker 日期选择器' },
              ],
            },
            {
              text: '导航与页面骨架',
              collapsed: false,
              items: [
                { text: 'Scaffold 页面脚手架' },
                { text: 'AppBar 顶栏' },
                { text: 'BottomNavigationBar 底部导航' },
                { text: 'NavigationRail 侧边导航' },
                { text: 'Drawer 抽屉' },
                { text: 'TabBar / TabBarView 选项卡' },
                { text: 'PopupMenuButton 弹出菜单' },
                { text: 'Navigator 路由跳转' },
              ],
            },
            {
              text: '反馈与浮层',
              collapsed: false,
              items: [
                { text: 'AlertDialog 对话框' },
                { text: 'SnackBar 消息条' },
                { text: 'BottomSheet 底部弹窗' },
                { text: 'Tooltip 提示气泡' },
                { text: 'ProgressIndicator 进度指示' },
                { text: 'Badge 徽标' },
              ],
            },
            {
              text: '动画',
              collapsed: false,
              items: [
                { text: 'AnimatedContainer 属性动画' },
                { text: 'AnimatedOpacity 透明度动画' },
                { text: 'TweenAnimationBuilder 补间动画' },
                { text: 'Hero 跨页动画' },
                { text: 'AnimatedBuilder / 显式动画' },
              ],
            },
            {
              text: '手势交互',
              collapsed: false,
              items: [
                { text: 'GestureDetector 手势检测' },
                { text: 'InkWell 水波纹' },
                { text: 'Draggable 拖拽' },
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
          { text: 'Flutter', link: '/en/flutter/', activeMatch: '/en/flutter/' },
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

          '/en/flutter/': [
            {
              text: 'Flutter',
              collapsed: false,
              items: [
                { text: 'Section Home', link: '/en/flutter/index' },
                // Add a line here for every Flutter article written
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
