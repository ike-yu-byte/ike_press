---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'http://www.panglai.online/' # Flutter Web 预览地址，留空则显示占位框
previewTitle: '组件预览'
---

# Button 按钮

按钮用于开启一个闭环的操作任务，如“删除”对象、“购买”商品等。

## 引入

```dart
import 'package:tdesign_flutter/tdesign_flutter.dart';
```

## 组件类型

### 标志按钮

使用 `theme` 属性设置按钮的主题色，默认为 `TDButtonTheme.primary`。

```dart
Row(
  children: const [
    TDButton(text: "主要按钮", theme: TDButtonTheme.primary),
    TDButton(text: "默认按钮", theme: TDButtonTheme.defaultType),
    TDButton(text: "危险按钮", theme: TDButtonTheme.danger),
  ],
)
```

### 幽灵按钮

使用 `variant` 属性设置按钮的样式类型，支持 `base`（填充）、`outline`（描边）、`dashed`（虚线描边）、`text`（文字）。

```dart
Row(
  children: const [
    TDButton(text: "填充", variant: TDButtonStyle.base, theme: TDButtonTheme.primary),
    TDButton(text: "描边", variant: TDButtonStyle.outline, theme: TDButtonTheme.primary),
    TDButton(text: "虚线", variant: TDButtonStyle.dashed, theme: TDButtonTheme.primary),
    TDButton(text: "文字", variant: TDButtonStyle.text, theme: TDButtonTheme.primary),
  ],
)
```

## 组件状态

通过 `disabled` 控制禁用态，通过 `loading` 控制加载态。

```dart
Row(
  children: const [
    TDButton(text: "禁用", disabled: true, theme: TDButtonTheme.primary),
    TDButton(text: "加载中", isLoading: true, theme: TDButtonTheme.primary),
  ],
)
```

## 组件尺寸与形状

`size` 支持 `small` / `medium` / `large`；`shape` 支持 `rectangle`（圆角矩形）、`square`、`round`（胶囊）、`circle`。

```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: const [
    TDButton(text: "小", size: TDButtonSize.small, theme: TDButtonTheme.primary),
    TDButton(text: "中", size: TDButtonSize.medium, theme: TDButtonTheme.primary),
    TDButton(text: "大", size: TDButtonSize.large, theme: TDButtonTheme.primary),
    TDButton(text: "胶囊", shape: TDButtonShape.round, theme: TDButtonTheme.primary),
    TDButton(
      icon: TDIcons.favorite,
      shape: TDButtonShape.circle,
      theme: TDButtonTheme.primary,
    ),
  ],
)
```

## 块级按钮

设置 `isBlock: true` 后按钮将占满父容器宽度。

```dart
const TDButton(
  text: "块级按钮",
  isBlock: true,
  theme: TDButtonTheme.primary,
  size: TDButtonSize.large,
)
```

## API

### Props

| 名称 | 类型 | 默认值 | 说明 | 是否必填 |
| --- | --- | --- | --- | --- |
| text | `String` | - | 按钮文案 | 否 |
| child | `Widget` | - | 自定义内容，优先级高于 `text` | 否 |
| theme | `TDButtonTheme` | `defaultType` | 主题：`defaultType` / `primary` / `danger` / `light` | 否 |
| variant | `TDButtonStyle` | `base` | 样式：`base` / `outline` / `dashed` / `text` | 否 |
| size | `TDButtonSize` | `medium` | 尺寸：`small` / `medium` / `large` / `extraSmall` | 否 |
| shape | `TDButtonShape` | `rectangle` | 形状：`rectangle` / `square` / `round` / `circle` | 否 |
| disabled | `bool` | `false` | 是否禁用 | 否 |
| isLoading | `bool` | `false` | 是否为加载状态 | 否 |
| isBlock | `bool` | `false` | 是否为块级按钮 | 否 |
| icon | `IconData` | - | 图标，仅按钮内容为文字时生效 | 否 |
| onTap | `TDFont onPress` | - | 点击按钮时的回调 | 否 |

### Events

| 名称 | 参数 | 描述 |
| --- | --- | --- |
| onTap | `()` | 点击按钮时触发，禁用与加载态下不会触发 |

## 调试指南

::: tip
右侧预览面板的 `preview` 目前为占位空值。后续把 Flutter Web 示例工程部署后（如 `https://xxx.pages.dev/#/preview/button`），填到本页 frontmatter 的 `preview:` 字段即可实时联动预览；新组件页复制这两行 frontmatter（`pageClass` + `preview`）即可获得同样的三栏布局。
:::
