---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# TweenAnimationBuilder 补间动画

> 🔵 有状态组件 · `StatefulWidget`

`TweenAnimationBuilder` 是"轻量显式动画"利器：给一个目标值 `tween.end`，它自动从当前值补间过去，并在每一帧用回调把中间值喂给你构建 widget。**不用手写 AnimationController、不用混入 Ticker**。

## 尺寸补间

`end` 值一变，就从当前值平滑滑过去。

```dart
import 'package:flutter/material.dart';

/// 示例: tween-size —— 点击方形在 60~160 间变化
class TweenSizeDemo extends StatefulWidget {
  const TweenSizeDemo({super.key});

  @override
  State<TweenSizeDemo> createState() => _TweenSizeDemoState();
}

class _TweenSizeDemoState extends State<TweenSizeDemo> {
  double _target = 60;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 60, end: _target),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
            builder: (context, value, child) => Container(
              width: value,
              height: value,
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _target = _target == 60 ? 160 : 60),
            child: const Text('变大变慢'),
          ),
        ],
      ),
    );
  }
}
```

## 旋转过渡

角度从 0 补间到 π，builder 里塞进 Transform.rotate。

```dart
import 'package:flutter/material.dart';

/// 示例: tween-rotate —— 点击旋转 180°
class TweenRotateDemo extends StatefulWidget {
  const TweenRotateDemo({super.key});

  @override
  State<TweenRotateDemo> createState() => _TweenRotateDemoState();
}

class _TweenRotateDemoState extends State<TweenRotateDemo> {
  double _turns = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: _turns),
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeInOut,
            builder: (context, value, child) => Transform.rotate(
              angle: value * 3.14159, // 0 → π
              child: Container(
                width: 100,
                height: 100,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.arrow_upward, color: Colors.white, size: 40),
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _turns = _turns == 0 ? 1 : 0),
            child: const Text('翻转'),
          ),
        ],
      ),
    );
  }
}
```

## 数字滚动（计数器效果）

类型不限于 double——`Intensity`、`Color`、自定义 Tween 都行。

```dart
import 'package:flutter/material.dart';

/// 示例: tween-counter —— 数字从 0 滚到目标值
class TweenCounterDemo extends StatefulWidget {
  const TweenCounterDemo({super.key});

  @override
  State<TweenCounterDemo> createState() => _TweenCounterDemoState();
}

class _TweenCounterDemoState extends State<TweenCounterDemo> {
  int _target = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: _target),
            duration: const Duration(milliseconds: 800),
            builder: (context, value, child) => Text(
              '$value',
              style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.indigo),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton(onPressed: () => setState(() => _target += 100), child: const Text('+100')),
              const SizedBox(width: 12),
              OutlinedButton(onPressed: () => setState(() => _target = 0), child: const Text('清零')),
            ],
          ),
        ],
      ),
    );
  }
}
```

## 颜色补间

```dart
import 'package:flutter/material.dart';

/// 示例: tween-color —— 点击切换并过渡颜色
class TweenColorDemo extends StatefulWidget {
  const TweenColorDemo({super.key});

  @override
  State<TweenColorDemo> createState() => _TweenColorDemoState();
}

class _TweenColorDemoState extends State<TweenColorDemo> {
  Color _color = Colors.red;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TweenAnimationBuilder<Color?>(
        tween: ColorTween(end: _color),
        duration: const Duration(milliseconds: 600),
        builder: (context, value, child) => Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(color: value, shape: BoxShape.circle),
          child: TextButton(
            onPressed: () => setState(() => _color = _color == Colors.red ? Colors.green : Colors.red),
            child: const Text('点我变色', style: TextStyle(color: Colors.white)),
          ),
        ),
      ),
    );
  }
}
```

## child 参数：省重建

builder 不随帧变化的固定部分传 `child`，避免每帧重建。

```dart
import 'package:flutter/material.dart';

// builder 的第三个参数 child 就是顶层 child 字段，
// 它在动画期间不会重复构建——把静态内容放进去：
TweenAnimationBuilder<double>(
  tween: Tween(end: _target),
  duration: const Duration(milliseconds: 300),
  builder: (context, value, child) => Transform.scale(
    scale: value,
    child: child, // 直接复用，不是每帧重新 build 一个 Image
  ),
  child: const Image.network('https://picsum.photos/100/100'),
)
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `tween` | `Tween<T>(begin:, end:)`；end 变化即重启动画 |
| `duration` / `curve` | 时长与曲线 |
| `builder(context, value, child)` | 每帧调用，value 为当前插值 |
| `child` | 静态内容直通 builder，避免每帧重建 |

## 易错点

::: danger begin 只在首次生效
动画中途 `end` 再变时，从**当前值**补间；`begin` 只用于第一帧初值。想让"清零重滚"要改 key 重建。
:::

::: warning 它不能暂停/反转/循环
需要 `pause` / `reverse` / `repeat` 语义时必须上 `AnimationController`（见 AnimatedBuilder 页），它只管"目标变了就滑过去"。
:::

::: info 循环动画写法
`end` 用 `Tween(begin: 0, end: 1)` + 定时器周期翻转 end 值可模拟呼吸/循环，但性能与可控性不如 controller。
:::
