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
          { text: 'Vue', link: '/vue/', activeMatch: '/vue/' },
          { text: 'React', link: '/react/', activeMatch: '/react/' },
          { text: 'NestJS', link: '/nestjs/', activeMatch: '/nestjs/' },
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

          '/vue/': [
            {
              text: 'Vue',
              collapsed: false,
              items: [
                { text: 'Vue 知识库入口', link: '/vue/index' },
                { text: '模板语法', link: '/vue/template-syntax' },
                { text: '计算属性与侦听器', link: '/vue/computed-watch' },
                { text: '组件系统', link: '/vue/components' },
                { text: '响应式与生命周期', link: '/vue/reactivity-lifecycle' },
                { text: '表单与组件通信', link: '/vue/forms-communication' },
                { text: '路由 vue-router', link: '/vue/router' },
                { text: '状态管理 Pinia', link: '/vue/state-management' },
                { text: '性能与最佳实践', link: '/vue/performance-best-practices' },
              ],
            },
          ],

          '/react/': [
            {
              text: 'React',
              collapsed: false,
              items: [
                { text: 'React 知识库入口', link: '/react/index' },
                { text: 'JSX 与模板语法', link: '/react/jsx' },
                { text: '组件与状态', link: '/react/components-state' },
                { text: 'Hooks 详解', link: '/react/hooks' },
                { text: '组件通信', link: '/react/communication' },
                { text: '路由', link: '/react/router' },
                { text: '状态管理', link: '/react/state-management' },
                { text: '性能与高频踩坑', link: '/react/performance-pitfalls' },
              ],
            },
          ],

          '/nestjs/': [
            {
              text: '开始',
              collapsed: false,
              items: [
                { text: 'NestJS 是什么', link: '/nestjs/index' },
                { text: '框架原理：IoC 与依赖注入', link: '/nestjs/principles' },
                { text: '快速开始：第一个项目', link: '/nestjs/first-app' },
              ],
            },
            {
              text: '核心概念',
              collapsed: false,
              items: [
                { text: '控制器与路由', link: '/nestjs/controllers' },
                { text: 'Provider 与 Service', link: '/nestjs/providers' },
                { text: '模块系统', link: '/nestjs/modules' },
                { text: '一次请求的完整生命周期', link: '/nestjs/request-lifecycle' },
              ],
            },
            {
              text: '请求处理',
              collapsed: false,
              items: [
                { text: '中间件', link: '/nestjs/middleware' },
                { text: '管道与数据校验', link: '/nestjs/pipes-validation' },
                { text: '守卫与 JWT 认证', link: '/nestjs/guards-auth' },
                { text: '拦截器与异常过滤器', link: '/nestjs/interceptors-filters' },
              ],
            },
            {
              text: '进阶实战',
              collapsed: false,
              items: [
                { text: '数据库：TypeORM 与 Prisma', link: '/nestjs/database' },
                { text: '配置、环境变量与 CORS', link: '/nestjs/config-deploy' },
                { text: '单元测试与 E2E 测试', link: '/nestjs/testing' },
                { text: '速查表与学习路线', link: '/nestjs/cheatsheet' },
              ],
            },
          ],

          '/flutter/': [
            {
              text: '开始',
              collapsed: false,
              items: [
                { text: 'Dart 基础语法', link: '/flutter/dart-basics' },
                { text: '开始 Flutter', link: '/flutter/index' },
                { text: 'setState 与生命周期', link: '/flutter/widget-lifecycle' },
                { text: '事件总线', link: '/flutter/event-bus' },
                { text: 'GlobalKey', link: '/flutter/global-key' },
                { text: 'Navigator 路由', link: '/flutter/navigator' },
              ],
            },
            {
              text: '基础组件',
              collapsed: false,
              items: [
                { text: 'Text 文本', link: '/flutter/components/text' },
                { text: 'Button 按钮', link: '/flutter/components/button' },
                { text: 'Image 图片', link: '/flutter/components/image' },
                { text: 'Icon 图标', link: '/flutter/components/icon' },
                { text: 'Container 容器', link: '/flutter/components/container' },
                { text: 'Padding 内边距', link: '/flutter/components/padding' },
                { text: 'SizedBox 尺寸占位', link: '/flutter/components/sizedbox' },
                { text: 'Divider 分割线', link: '/flutter/components/divider' },
                { text: 'CircleAvatar 头像', link: '/flutter/components/circleavatar' },
              ],
            },
            {
              text: '布局组件',
              collapsed: false,
              items: [
                { text: 'Row 横向布局', link: '/flutter/components/row' },
                { text: 'Column 纵向布局', link: '/flutter/components/column' },
                { text: 'Stack 层叠布局', link: '/flutter/components/stack' },
                { text: 'Flex 弹性布局', link: '/flutter/components/flex' },
                { text: 'Wrap 流式布局', link: '/flutter/components/wrap' },
                { text: 'Center / Align 对齐', link: '/flutter/components/align' },
                { text: 'Expanded / Flexible 伸展', link: '/flutter/components/expanded' },
                { text: 'SafeArea 安全区', link: '/flutter/components/safearea' },
                { text: 'Table 表格', link: '/flutter/components/table' },
              ],
            },
            {
              text: '滚动与列表',
              collapsed: false,
              items: [
                { text: 'ListView 列表', link: '/flutter/components/listview' },
                { text: 'GridView 网格', link: '/flutter/components/gridview' },
                { text: 'PageView 翻页', link: '/flutter/components/pageview' },
                { text: 'SingleChildScrollView 单_child 滚动', link: '/flutter/components/scrollview' },
                { text: 'RefreshIndicator 下拉刷新', link: '/flutter/components/refreshindicator' },
                { text: 'Dismissible 滑动删除', link: '/flutter/components/dismissible' },
                { text: 'ListTile 列表项', link: '/flutter/components/listtile' },
                { text: 'Card 卡片', link: '/flutter/components/card' },
              ],
            },
            {
              text: '表单输入',
              collapsed: false,
              items: [
                { text: 'TextField 输入框', link: '/flutter/components/textfield' },
                { text: 'Form 表单校验', link: '/flutter/components/form' },
                { text: 'Checkbox 复选框', link: '/flutter/components/checkbox' },
                { text: 'Radio 单选框', link: '/flutter/components/radio' },
                { text: 'Switch 开关', link: '/flutter/components/switch' },
                { text: 'Slider 滑块', link: '/flutter/components/slider' },
                { text: 'DropdownButton 下拉选择', link: '/flutter/components/dropdownbutton' },
                { text: 'DatePicker 日期选择器', link: '/flutter/components/datepicker' },
              ],
            },
            {
              text: '导航与页面骨架',
              collapsed: false,
              items: [
                { text: 'Scaffold 页面脚手架', link: '/flutter/components/scaffold' },
                { text: 'AppBar 顶栏', link: '/flutter/components/appbar' },
                { text: 'BottomNavigationBar 底部导航', link: '/flutter/components/bottomnavigationbar' },
                { text: 'NavigationRail 侧边导航', link: '/flutter/components/navigationrail' },
                { text: 'Drawer 抽屉', link: '/flutter/components/drawer' },
                { text: 'TabBar / TabBarView 选项卡', link: '/flutter/components/tabbar' },
                { text: 'PopupMenuButton 弹出菜单', link: '/flutter/components/popupmenubutton' },
                { text: 'Navigator 路由跳转', link: '/flutter/components/navigator' },
              ],
            },
            {
              text: '反馈与浮层',
              collapsed: false,
              items: [
                { text: 'AlertDialog 对话框', link: '/flutter/components/alertdialog' },
                { text: 'SnackBar 消息条', link: '/flutter/components/snackbar' },
                { text: 'BottomSheet 底部弹窗', link: '/flutter/components/bottomsheet' },
                { text: 'Tooltip 提示气泡', link: '/flutter/components/tooltip' },
                { text: 'ProgressIndicator 进度指示', link: '/flutter/components/progressindicator' },
                { text: 'Badge 徽标', link: '/flutter/components/badge' },
              ],
            },
            {
              text: '动画',
              collapsed: false,
              items: [
                { text: 'AnimatedContainer 属性动画', link: '/flutter/components/animatedcontainer' },
                { text: 'AnimatedOpacity 透明度动画', link: '/flutter/components/animatedopacity' },
                { text: 'TweenAnimationBuilder 补间动画', link: '/flutter/components/tweenanimationbuilder' },
                { text: 'Hero 跨页动画', link: '/flutter/components/hero' },
                { text: 'AnimatedBuilder / 显式动画', link: '/flutter/components/animatedbuilder' },
              ],
            },
            {
              text: '手势交互',
              collapsed: false,
              items: [
                { text: 'GestureDetector 手势检测', link: '/flutter/components/gesturedetector' },
                { text: 'InkWell 水波纹', link: '/flutter/components/inkwell' },
                { text: 'Draggable 拖拽', link: '/flutter/components/draggable' },
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
          { text: 'Vue', link: '/en/vue/', activeMatch: '/en/vue/' },
          { text: 'React', link: '/en/react/', activeMatch: '/en/react/' },
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

          '/en/vue/': [
            {
              text: 'Vue',
              collapsed: false,
              items: [
                { text: 'Vue Knowledge Base', link: '/en/vue/index' },
                { text: 'Template Syntax', link: '/en/vue/template-syntax' },
                { text: 'Computed & Watch', link: '/en/vue/computed-watch' },
                { text: 'Component System', link: '/en/vue/components' },
                { text: 'Reactivity & Lifecycle', link: '/en/vue/reactivity-lifecycle' },
                { text: 'Forms & Communication', link: '/en/vue/forms-communication' },
                { text: 'Routing (vue-router)', link: '/en/vue/router' },
                { text: 'State Management (Pinia)', link: '/en/vue/state-management' },
                { text: 'Performance & Best Practices', link: '/en/vue/performance-best-practices' },
              ],
            },
          ],

          '/en/react/': [
            {
              text: 'React',
              collapsed: false,
              items: [
                { text: 'React Knowledge Base', link: '/en/react/index' },
                { text: 'JSX & Template Syntax', link: '/en/react/jsx' },
                { text: 'Components & State', link: '/en/react/components-state' },
                { text: 'Hooks in Depth', link: '/en/react/hooks' },
                { text: 'Component Communication', link: '/en/react/communication' },
                { text: 'Routing', link: '/en/react/router' },
                { text: 'State Management', link: '/en/react/state-management' },
                { text: 'Performance & Pitfalls', link: '/en/react/performance-pitfalls' },
              ],
            },
          ],

          '/en/flutter/': [
            {
              text: 'Get Started',
              collapsed: false,
              items: [
                { text: 'Dart Basics', link: '/en/flutter/dart-basics' },
                { text: 'Start Flutter', link: '/en/flutter/index' },
                { text: 'setState & Lifecycle', link: '/en/flutter/widget-lifecycle' },
                { text: 'Event Bus', link: '/en/flutter/event-bus' },
                { text: 'GlobalKey', link: '/en/flutter/global-key' },
                { text: 'Navigator Routing', link: '/en/flutter/navigator' },
              ],
            },
            {
              text: 'Basics',
              collapsed: false,
              items: [
                { text: 'Text', link: '/en/flutter/components/text' },
                { text: 'Button', link: '/en/flutter/components/button' },
                { text: 'Image', link: '/en/flutter/components/image' },
                { text: 'Icon', link: '/en/flutter/components/icon' },
                { text: 'Container', link: '/en/flutter/components/container' },
                { text: 'Padding', link: '/en/flutter/components/padding' },
                { text: 'SizedBox', link: '/en/flutter/components/sizedbox' },
                { text: 'Divider', link: '/en/flutter/components/divider' },
                { text: 'CircleAvatar', link: '/en/flutter/components/circleavatar' },
              ],
            },
            {
              text: 'Layout',
              collapsed: false,
              items: [
                { text: 'Row', link: '/en/flutter/components/row' },
                { text: 'Column', link: '/en/flutter/components/column' },
                { text: 'Stack', link: '/en/flutter/components/stack' },
                { text: 'Flex', link: '/en/flutter/components/flex' },
                { text: 'Wrap', link: '/en/flutter/components/wrap' },
                { text: 'Center / Align', link: '/en/flutter/components/align' },
                { text: 'Expanded / Flexible', link: '/en/flutter/components/expanded' },
                { text: 'SafeArea', link: '/en/flutter/components/safearea' },
                { text: 'Table', link: '/en/flutter/components/table' },
              ],
            },
            {
              text: 'Scrolling & Lists',
              collapsed: false,
              items: [
                { text: 'ListView', link: '/en/flutter/components/listview' },
                { text: 'GridView', link: '/en/flutter/components/gridview' },
                { text: 'PageView', link: '/en/flutter/components/pageview' },
                { text: 'SingleChildScrollView', link: '/en/flutter/components/scrollview' },
                { text: 'RefreshIndicator', link: '/en/flutter/components/refreshindicator' },
                { text: 'Dismissible', link: '/en/flutter/components/dismissible' },
                { text: 'ListTile', link: '/en/flutter/components/listtile' },
                { text: 'Card', link: '/en/flutter/components/card' },
              ],
            },
            {
              text: 'Forms & Inputs',
              collapsed: false,
              items: [
                { text: 'TextField', link: '/en/flutter/components/textfield' },
                { text: 'Form', link: '/en/flutter/components/form' },
                { text: 'Checkbox', link: '/en/flutter/components/checkbox' },
                { text: 'Radio', link: '/en/flutter/components/radio' },
                { text: 'Switch', link: '/en/flutter/components/switch' },
                { text: 'Slider', link: '/en/flutter/components/slider' },
                { text: 'DropdownButton', link: '/en/flutter/components/dropdownbutton' },
                { text: 'DatePicker', link: '/en/flutter/components/datepicker' },
              ],
            },
            {
              text: 'Navigation & Page Shell',
              collapsed: false,
              items: [
                { text: 'Scaffold', link: '/en/flutter/components/scaffold' },
                { text: 'AppBar', link: '/en/flutter/components/appbar' },
                { text: 'BottomNavigationBar', link: '/en/flutter/components/bottomnavigationbar' },
                { text: 'NavigationRail', link: '/en/flutter/components/navigationrail' },
                { text: 'Drawer', link: '/en/flutter/components/drawer' },
                { text: 'TabBar / TabBarView', link: '/en/flutter/components/tabbar' },
                { text: 'PopupMenuButton', link: '/en/flutter/components/popupmenubutton' },
                { text: 'Navigator', link: '/en/flutter/components/navigator' },
              ],
            },
            {
              text: 'Feedback & Overlays',
              collapsed: false,
              items: [
                { text: 'AlertDialog', link: '/en/flutter/components/alertdialog' },
                { text: 'SnackBar', link: '/en/flutter/components/snackbar' },
                { text: 'BottomSheet', link: '/en/flutter/components/bottomsheet' },
                { text: 'Tooltip', link: '/en/flutter/components/tooltip' },
                { text: 'ProgressIndicator', link: '/en/flutter/components/progressindicator' },
                { text: 'Badge', link: '/en/flutter/components/badge' },
              ],
            },
            {
              text: 'Animation',
              collapsed: false,
              items: [
                { text: 'AnimatedContainer', link: '/en/flutter/components/animatedcontainer' },
                { text: 'AnimatedOpacity', link: '/en/flutter/components/animatedopacity' },
                { text: 'TweenAnimationBuilder', link: '/en/flutter/components/tweenanimationbuilder' },
                { text: 'Hero', link: '/en/flutter/components/hero' },
                { text: 'AnimatedBuilder / Explicit', link: '/en/flutter/components/animatedbuilder' },
              ],
            },
            {
              text: 'Gestures',
              collapsed: false,
              items: [
                { text: 'GestureDetector', link: '/en/flutter/components/gesturedetector' },
                { text: 'InkWell', link: '/en/flutter/components/inkwell' },
                { text: 'Draggable', link: '/en/flutter/components/draggable' },
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
