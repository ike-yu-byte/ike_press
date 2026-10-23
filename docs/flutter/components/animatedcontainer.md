---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# AnimatedContainer 属性动画

`AnimatedContainer` 除了普通 `Container` 的能力，还能在属性变化时**自动补间过渡**（尺寸、颜色、圆角、margin 等），无需自己写 `AnimationController`。

## 点击切换尺寸/颜色

改属性 + setState，剩下的交给动画。

```dart
import 'package:flutter/material.dart';

/// 示例: animatedcontainer-toggle —— 尺寸颜色圆角三属性同变
class AnimatedContainerToggleDemo extends StatefulWidget {
  const AnimatedContainerToggleDemo({super.key});

  @override
  State<AnimatedContainerToggleDemo> createState() => _AnimatedContainerToggleDemoState();
}

class _AnimatedContainerToggleDemoState extends State<AnimatedContainerToggleDemo> {
  bool _big = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeInOut,
            width: _big ? 180.0 : 80.0,
            height: _big ? 180.0 : 80.0,
            decoration: BoxDecoration(
              color: _big ? Colors.red : Colors.blue,
              borderRadius: BorderRadius.circular(_big ? 90 : 8),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _big = !_big),
            child: Text(_big ? '恢复原样' : '放大变身'),
          ),
        ],
      ),
    );
  }
}
```

## 选中态卡片（展开收起）

列表点击项变化高度与背景，是 AnimatedContainer 的主战场。

```dart
import 'package:flutter/material.dart';

/// 示例: animatedcontainer-expand —— FAQ 手风琴单项
class AnimatedContainerExpandDemo extends StatefulWidget {
  const AnimatedContainerExpandDemo({super.key});

  @override
  State<AnimatedContainerExpandDemo> createState() => _AnimatedContainerExpandDemoState();
}

class _AnimatedContainerExpandDemoState extends State<AnimatedContainerExpandDemo> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _expanded ? Colors.blue.shade50 : Colors.grey.shade100,
            border: Border.all(color: _expanded ? Colors.blue : Colors.transparent),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('什么是热重载？', style: TextStyle(fontWeight: FontWeight.bold)),
              if (_expanded) ...[
                const SizedBox(height: 8),
                const Text('修改代码后按 r，无需重启即可看到效果，开发体验极佳。'),
              ],
              TextButton(
                onPressed: () => setState(() => _expanded = !_expanded),
                child: Text(_expanded ? '收起' : '展开'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 多属性错峰（不同 duration）

同一变化里不同属性想不同节奏，外套两层各管一段。

```dart
import 'package:flutter/material.dart';

/// 示例: animatedcontainer-stagger —— 先变大后变色
class AnimatedContainerStaggerDemo extends StatefulWidget {
  const AnimatedContainerStaggerDemo({super.key});

  @override
  State<AnimatedContainerStaggerDemo> createState() => _AnimatedContainerStaggerDemoState();
}

class _AnimatedContainerStaggerDemoState extends State<AnimatedContainerStaggerDemo> {
  bool _on = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            // 外层管尺寸（快）
            duration: const Duration(milliseconds: 200),
            width: _on ? 140.0 : 60.0,
            height: _on ? 140.0 : 60.0,
            child: AnimatedContainer(
              // 内层管颜色（慢，形成拖尾感）
              duration: const Duration(milliseconds: 600),
              decoration: BoxDecoration(
                color: _on ? Colors.orange : Colors.indigo,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Switch(value: _on, onChanged: (v) => setState(() => _on = v)),
        ],
      ),
    );
  }
}
```

## 原理与同族

```dart
import 'package:flutter/material.dart';

// AnimatedXxx 家族（用法同款）：
AnimatedOpacity   // opacity 变化过渡
AnimatedPadding   // padding 变化过渡
AnimatedAlign     // alignment 变化过渡
AnimatedDefaultTextStyle // 文字样式过渡
AnimatedSwitcher  // child 整体替换时切换动画
```

::: info 它是组合 widget
`AnimatedContainer` 内部为每个可动画属性持有插值器；build 时属性与上次不同就启动补间。因此**只能动画它自己直接接收的属性**，套在 child 里的 widget 内部变化它管不着。
:::

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `duration` | **必填**，无它不动画 |
| `curve` | 动画曲线，默认 `Curves.linear` |
| `width/height/margin/padding/alignment/decoration/constraints/color` | 全部可过渡属性（同 Container） |
| `transform` | Matrix4 变换也可动画 |

## 易错点

::: danger 必须有 duration
`AnimatedContainer` 必须给 `duration`，忘了写属性会瞬变。想"停一下再动"设 `Duration.zero` 关闭。
:::

::: warning decoration 整体替换才动画
`BoxDecoration` 每帧重建插值，两个差异过大的 decoration（如加 image）可能报错或跳变，尽量只改 color/borderRadius/border 同类项。
:::

::: info 属性动画 beyond Container
想给任意 widget 的任意数值做隐式动画（无 controller），用 `TweenAnimationBuilder`（见下一页）。
:::
