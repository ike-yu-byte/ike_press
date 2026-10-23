---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# GestureDetector 手势检测

`GestureDetector` 给任意 widget 添加手势识别（点击、双击、长按、拖动、缩放等），它**只处理逻辑、不提供任何视觉反馈**（没有水波纹）。

## 点击/双击/长按

```dart
import 'package:flutter/material.dart';

/// 示例: gesture-tap —— 三种基础点击手势回显
class GestureTapDemo extends StatefulWidget {
  const GestureTapDemo({super.key});

  @override
  State<GestureTapDemo> createState() => _GestureTapDemoState();
}

class _GestureTapDemoState extends State<GestureTapDemo> {
  String _last = '点我试试';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => setState(() => _last = '单击'),
            onDoubleTap: () => setState(() => _last = '双击'),
            onLongPress: () => setState(() => _last = '长按'),
            child: Container(
              width: 140,
              height: 140,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text('手势区域', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 16),
          Text('识别结果：$_last'),
        ],
      ),
    );
  }
}
```

## 拖动（自由移动）

`onPanUpdate` 每帧给增量 `delta`，累加进偏移。

```dart
import 'package:flutter/material.dart';

/// 示例: gesture-drag —— 拖动方块随处移动
class GestureDragDemo extends StatefulWidget {
  const GestureDragDemo({super.key});

  @override
  State<GestureDragDemo> createState() => _GestureDragDemoState();
}

class _GestureDragDemoState extends State<GestureDragDemo> {
  Offset _pos = const Offset(20, 20);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          left: _pos.dx,
          top: _pos.dy,
          child: GestureDetector(
            onPanUpdate: (d) => setState(() => _pos += d.delta),
            child: Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.drag_handle, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}
```

## 缩放（双指捏合）

`onScaleUpdate` 的 `details.scale` 是相对起始的缩放倍数。

```dart
import 'package:flutter/material.dart';

/// 示例: gesture-scale —— 双指缩放图片
class GestureScaleDemo extends StatefulWidget {
  const GestureScaleDemo({super.key});

  @override
  State<GestureScaleDemo> createState() => _GestureScaleDemoState();
}

class _GestureScaleDemoState extends State<GestureScaleDemo> {
  double _scale = 1;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        onScaleUpdate: (d) => setState(() => _scale = (_scale * d.scale).clamp(0.5, 3.0)),
        onScaleEnd: (_) {},
        child: Transform.scale(
          scale: _scale,
          child: Image.network(
            'https://picsum.photos/seed/scale/200/200',
            width: 200,
            height: 200,
          ),
        ),
      ),
    );
  }
}
```

## 点击区域与行为细节

```dart
import 'package:flutter/material.dart';

/// 示例: gesture-behavior —— opaque 让空白区也能点
class GestureBehaviorDemo extends StatelessWidget {
  const GestureBehaviorDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque, // 关键：透明区域也参与命中
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: Text('四周 padding 原本是点不中的'),
        ),
      ),
    );
  }
}
```

## 手势竞技场（和滚动冲突）

子树里有 ListView 等滚动组件时，手势会"竞争"；`excludeFromSemantics`、`dragStartBehavior` 是常用调节项。

```dart
import 'package:flutter/material.dart';

// 常用缓解手段：
GestureDetector(
  onHorizontalDragUpdate: (d) {},
  dragStartBehavior: DragStartBehavior.down, // 按下即开始（默认 start 更宽容）
  child: MyDraggableContent(),
)
// 与父滚动组件彻底隔离用 RawGestureDetector 自定义竞技场判负逻辑（进阶）
```

## 属性速查

| 回调 | 触发 |
| --- | --- |
| `onTapDown` / `onTapUp` / `onTap` / `onTapCancel` | 按下 / 抬起 / 有效点击 / 按下后移开取消 |
| `onDoubleTap` / `onLongPress` | 双击 / 长按 |
| `onHorizontalDrag*` / `onVerticalDrag*` | 单向拖（start/update/end） |
| `onPanStart/Update/End` | 自由拖 |
| `onScaleStart/Update/End` | 双指缩放 |
| `behavior` | `deferToChild`（默认，仅 child 命中）/ `opaque`（含空白）/ `translucent` |

## 易错点

::: danger 点击区域 = child 大小
GestureDetector 的命中范围就是它的 child；child 小则难点中。需要更大点击区套 `Padding`/`SizedBox` 撑出区域，**且透明区域要 `behavior: opaque` 才接收手势**。
:::

::: warning 没有任何视觉反馈
要水波纹用 `InkWell`；GestureDetector 适合纯逻辑手势（拖动、缩放）或不需要 Material 反馈的场景。
:::

::: info onTap vs InkWell.onTap
按钮类可点元素优先语义化组件（ElevatedButton、InkWell、ListTile.onTap）；GestureDetector 用于"非按钮"的手势增强。
:::
