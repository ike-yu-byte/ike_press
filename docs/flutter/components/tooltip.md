---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Tooltip 提示气泡

> 🔵 有状态组件 · `StatefulWidget`

`Tooltip` 给某个 widget 加一段悬浮/长按提示文字，常用于图标按钮说明其含义。

## 基础提示

桌面端鼠标悬停显示，移动端长按显示。

```dart
import 'package:flutter/material.dart';

/// 示例: tooltip-basic —— 图标加说明
class TooltipBasicDemo extends StatelessWidget {
  const TooltipBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: '这是收藏按钮',
        child: Icon(Icons.favorite, size: 32),
      ),
    );
  }
}
```

## 触发方式与时长

`triggerMode` 改为点击触发；`waitDuration` / `showDuration` 控制节奏。

```dart
import 'package:flutter/material.dart';

/// 示例: tooltip-trigger —— 点击即弹、自定义时长
class TooltipTriggerDemo extends StatelessWidget {
  const TooltipTriggerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: '点一下就出现的提示',
        triggerMode: TooltipTriggerMode.tap, // tap / longPress / manual
        showDuration: Duration(seconds: 2),
        child: Icon(Icons.info_outline),
      ),
    );
  }
}
```

## 位置与样式

```dart
import 'package:flutter/material.dart';

/// 示例: tooltip-style ——  preferBelow + 自定义装饰
class TooltipStyleDemo extends StatelessWidget {
  const TooltipStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: '我显示在下方、圆角深底',
        preferBelow: true, // 优先下方；false 优先上方
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(color: Colors.white, fontSize: 12),
        child: Icon(Icons.location_on),
      ),
    );
  }
}
```

## 富文本提示（RICH）

`RichMessage` 让提示内容不只是纯文本。

```dart
import 'package:flutter/material.dart';

/// 示例: tooltip-rich —— 提示里带图标排版
class TooltipRichDemo extends StatelessWidget {
  const TooltipRichDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        triggerMode: TooltipTriggerMode.tap,
        richMessage: TextSpan(
          children: [
            TextSpan(text: '支持 ', style: TextStyle(color: Colors.white)),
            TextSpan(text: 'Markdown', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
            TextSpan(text: ' 语法', style: TextStyle(color: Colors.white)),
          ],
        ),
        child: Icon(Icons.help_outline),
      ),
    );
  }
}
```

## 手动控制显隐

`manualTrigger: true` 时由外部逻辑（如键盘焦点）决定何时展示。

```dart
import 'package:flutter/material.dart';

/// 示例: tooltip-manual —— 外部状态控制
class TooltipManualDemo extends StatefulWidget {
  const TooltipManualDemo({super.key});

  @override
  State<TooltipManualDemo> createState() => _TooltipManualDemoState();
}

class _TooltipManualDemoState extends State<TooltipManualDemo> {
  final _key = GlobalKey<TooltipState>();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Tooltip(
            key: _key, // 把 key 挂到 Tooltip 上才能拿到 State
            manualTrigger: true,
            triggerMode: TooltipTriggerMode.manual,
            message: '手动模式的气泡',
            child: const Icon(Icons.touch_app),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton.tonal(
                onPressed: () => _key.currentState?.showTooltip(),
                child: const Text('显示'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () => _key.currentState?.hideTooltip(),
                child: const Text('隐藏'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
```

> 手动模式三件套：`key: GlobalKey<TooltipState>()` + `manualTrigger: true` + `triggerMode: TooltipTriggerMode.manual`，再调 `showTooltip()` / `hideTooltip()`。

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `message` / `richMessage` | 提示文本 / 富文本（二选一，rich 优先） |
| `triggerMode` | `tap` / `longPress`（默认按平台） / `manual` |
| `waitDuration` / `showDuration` / `exitDuration` | 悬停多久出现 / 显示多久 / 消失动画时长 |
| `preferBelow` / `verticalOffset` | 位置 |
| `decoration` / `textStyle` / `padding` / `margin` | 外观 |
| `excludeFromSemantics` / `toolTip` | 无障碍（Semantics 里朗读用） |

## 易错点

::: warning 移动端别依赖 Tooltip
触屏没有 hover，长按才出现的交互认知成本高；关键功能提示应该做成可见文案。
:::

::: danger 提示内容别太长
Tooltip 宽度有上限，长句会被截行；超过两行说明你该用引导浮层而不是 Tooltip。
:::

::: info Tooltip 自带 IconButton 场景
`IconButton(tooltip: '删除')` 内部就是包了一个 Tooltip，多数时候不需要手动再包。
:::
