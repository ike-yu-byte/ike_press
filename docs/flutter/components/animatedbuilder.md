---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# AnimatedBuilder / 显式动画

当需要**完全掌控**动画（播放、暂停、反转、循环、多动画编排）时，用显式动画：`AnimationController` + `AnimatedBuilder`。这是 Flutter 动画体系的核心，隐式动画（AnimatedXxx）满足不了时才上它。

## 循环旋转（repeat）

controller `repeat()` + AnimatedBuilder 每帧重建。

```dart
import 'package:flutter/material.dart';

/// 示例: animated-spin-repeat —— 无限旋转加载块
class AnimatedSpinDemo extends StatefulWidget {
  const AnimatedSpinDemo({super.key});

  @override
  State<AnimatedSpinDemo> createState() => _AnimatedSpinDemoState();
}

class _AnimatedSpinDemoState extends State<AnimatedSpinDemo>
    with SingleTickerProviderStateMixin {   // 提供 vsync
  late final AnimationController _controller = AnimationController(
    duration: const Duration(seconds: 2),
    vsync: this,
  )..repeat(); // 循环播放

  @override
  void dispose() {
    _controller.dispose(); // 必须释放
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Transform.rotate(
          angle: _controller.value * 2 * 3.14159, // value: 0→1
          child: child, // 复用下面的 child，build 不重入
        ),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.blue,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.flutter_dash, color: Colors.white),
        ),
      ),
    );
  }
}
```

## 播放/暂停/反转控制

显式动画的价值：随时 `pause` / `reverse` / `fling`。

```dart
import 'package:flutter/material.dart';

/// 示例: animated-control —— 按钮控制出入场
class AnimatedControlDemo extends StatefulWidget {
  const AnimatedControlDemo({super.key});

  @override
  State<AnimatedControlDemo> createState() => _AnimatedControlDemoState();
}

class _AnimatedControlDemoState extends State<AnimatedControlDemo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: const Duration(milliseconds: 500),
    vsync: this,
  );
  late final Animation<Offset> _slide =
      Tween(begin: const Offset(0, 1), end: Offset.zero).animate(
    CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRect(
            child: SlideTransition(
              position: _slide,
              child: Container(
                width: 200,
                height: 80,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.teal, borderRadius: BorderRadius.circular(12)),
                child: const Text('我滑进来了', style: TextStyle(color: Colors.white)),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(onPressed: () => _controller.forward(), child: const Text('进场')),
              const SizedBox(width: 8),
              FilledButton.tonal(onPressed: () => _controller.reverse(), child: const Text('退场')),
              const SizedBox(width: 8),
              OutlinedButton(onPressed: () => _controller.pause(), child: const Text('暂停')),
            ],
          ),
        ],
      ),
    );
  }
}
```

## 多动画编排（Chain / Interval）

一个 controller 驱动多段：先平移再缩放。

```dart
import 'package:flutter/material.dart';

/// 示例: animated-sequence —— Interval 分段编排
class AnimatedSequenceDemo extends StatefulWidget {
  const AnimatedSequenceDemo({super.key});

  @override
  State<AnimatedSequenceDemo> createState() => _AnimatedSequenceDemoState();
}

class _AnimatedSequenceDemoState extends State<AnimatedSequenceDemo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(seconds: 2))
        ..repeat(reverse: true); // 来回播

  // 前 50% 时间做位移，后 50% 做缩放
  late final Animation<double> _move =
      CurvedAnimation(parent: _controller, curve: const Interval(0, .5, curve: Curves.easeOut));
  late final Animation<double> _scale =
      CurvedAnimation(parent: _controller, curve: const Interval(.5, 1, curve: Curves.elasticOut));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Transform.translate(
          offset: Offset(_move.value * 120 - 60, 0),
          child: Transform.scale(scale: 0.5 + _scale.value * 0.8, child: child),
        ),
        child: Container(width: 60, height: 60, color: Colors.purple),
      ),
    );
  }
}
```

## ListenableBuilder 替代（只重建状态不重建子树）

Flutter 3.10+ 中若只监听值不依赖每帧重建，`ListenableBuilder` 更语义化；动画场景 AnimatedBuilder 仍是标配。

```dart
import 'package:flutter/material.dart';

// AnimatedBuilder 本质：
// AnimatedBuilder ≈ ListenableBuilder(listenable: animation,
//     builder: (context, child) => ...每帧重算...)
```

## API 速查

| API | 说明 |
| --- | --- |
| `AnimationController(vsync:, duration:)` | 驱动器，值 0→1 |
| `.forward()` / `.reverse()` / `.pause()` / `.repeat()` / `.fling()` | 播放控制 |
| `CurvedAnimation(parent:, curve:)` | 给 controller 加曲线 |
| `Tween(begin:, end:).animate(controller)` | 把 0→1 映射成任意区间 |
| `Interval(a, b)` / `CurveChain` | 分段与串接 |
| `AnimatedBuilder(animation:, builder:, child:)` | 每帧重建 builder；静态部分放 child |

## 易错点

::: danger controller 必须 dispose
`AnimationController` 是 `Listenable` + Ticker 的持有者，忘 dispose 直接泄漏报错；混入 `SingleTickerProviderStateMixin` 提供 vsync。
:::

::: warning 多个 controller 换 mixin
两个以上 controller 时 `SingleTickerProviderStateMixin` 会断言，改 `TickerProviderStateMixin`。
:::

::: info 能隐式就别显式
单纯属性过渡（AnimatedContainer 系）和"目标变了就补间"（TweenAnimationBuilder）都别上 controller；只有需要暂停/循环/编排时才用它。
:::
