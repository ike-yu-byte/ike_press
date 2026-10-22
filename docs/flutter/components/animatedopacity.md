---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# AnimatedOpacity 透明度动画

`AnimatedOpacity` 在 `opacity` 变化时自动做淡入淡出过渡。适合显示/隐藏元素时加个柔和过渡，而不是生硬地出现消失。

## 淡入淡出

```dart
/// 示例: animatedopacity-toggle —— 显隐过渡
class AnimatedOpacityToggleDemo extends StatefulWidget {
  const AnimatedOpacityToggleDemo({super.key});

  @override
  State<AnimatedOpacityToggleDemo> createState() => _AnimatedOpacityToggleDemoState();
}

class _AnimatedOpacityToggleDemoState extends State<AnimatedOpacityToggleDemo> {
  bool _visible = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedOpacity(
            opacity: _visible ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 400),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('我会淡入淡出'),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _visible = !_visible),
            child: const Text('切换显隐'),
          ),
        ],
      ),
    );
  }
}
```

## 透明但仍占位

opacity 0 只是看不见，仍占布局空间、仍可点——这是最常见的认知坑。

```dart
/// 示例: animatedopacity-placeholder —— 隐身后位置没消失
class AnimatedOpacityPlaceholderDemo extends StatefulWidget {
  const AnimatedOpacityPlaceholderDemo({super.key});

  @override
  State<AnimatedOpacityPlaceholderDemo> createState() => _AnimatedOpacityPlaceholderDemoState();
}

class _AnimatedOpacityPlaceholderDemoState extends State<AnimatedOpacityPlaceholderDemo> {
  bool _hide = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('上方'),
          AnimatedOpacity(
            opacity: _hide ? 0 : 1,
            duration: const Duration(milliseconds: 300),
            child: Container(height: 80, width: 200, color: Colors.amber),
          ),
          const Text('下方——即使琥珀块“隐身”，两行文字仍然隔着一段空白'),
          const SizedBox(height: 16),
          Switch(value: _hide, onChanged: (v) => setState(() => _hide = v)),
        ],
      ),
    );
  }
}
```

## 透明 + 不占位组合

淡出结束后换成 `SizedBox.shrink()`，或用 `Visibility` 一步到位。

```dart
/// 示例: animatedopacity-gone —— 淡出后彻底收起
class AnimatedOpacityGoneDemo extends StatefulWidget {
  const AnimatedOpacityGoneDemo({super.key});

  @override
  State<AnimatedOpacityGoneDemo> createState() => _AnimatedOpacityGoneDemoState();
}

class _AnimatedOpacityGoneDemoState extends State<AnimatedOpacityGoneDemo> {
  bool _show = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedSize( // 子尺寸变化时平滑过渡，避免"跳"
            duration: const Duration(milliseconds: 300),
            child: AnimatedOpacity(
              opacity: _show ? 1 : 0,
              duration: const Duration(milliseconds: 300),
              child: _show
                  ? Container(height: 80, width: 200, color: Colors.teal)
                  : const SizedBox(width: 200), // 淡出完成后可不占位
            ),
          ),
          const SizedBox(height: 16),
          Switch(value: _show, onChanged: (v) => setState(() => _show = v)),
        ],
      ),
    );
  }
}
```

> 更省事的现成方案：`Visibility(visible: _show, maintainSize: false, replacementBuilder: ...)`，或用 `AnimatedCrossFade` 在两个 child 间淡入淡出切换。

## 同族属性动画

```dart
AnimatedOpacity   // opacity
AnimatedDefaultTextStyle // 文字样式过渡
// 半透明叠背景：FadeTransition（显式）也可达到同样效果
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `opacity` | 目标透明度 0.0~1.0，变化即触发动画 |
| `duration` | 必填 |
| `curve` | 动画曲线 |
| `child` | 被淡入淡出的内容 |

## 易错点

::: danger opacity 0 ≠ 移除
仍然占位、仍然可以接收点击和焦点；真正不需要就条件渲染换 `SizedBox.shrink()`。
:::

::: warning 频繁切换会插值回跳
动画中途再改 opacity，从当前值重新补间，视觉上一般没问题；但配合"延迟移除"逻辑时注意 setState 时序。
:::

::: info 整页淡入
路由级淡入用 `PageTransitionsBuilder`/`FadeTransition`；单元素淡入才轮到 AnimatedOpacity。
:::
