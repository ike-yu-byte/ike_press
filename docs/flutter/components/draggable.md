---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Draggable 拖拽

`Draggable` 让一个 widget 可被拖起，拖到 `DragTarget` 上松手即完成一次投递。常用于拖拽排序、把内容拖进区域、标签归类等。

## 一对组合：Draggable + DragTarget

拖起方块放进接收区。

```dart
/// 示例: drag-target-basic —— 拖入投递完整流程
class DragTargetBasicDemo extends StatefulWidget {
  const DragTargetBasicDemo({super.key});

  @override
  State<DragTargetBasicDemo> createState() => _DragTargetBasicDemoState();
}

class _DragTargetBasicDemoState extends State<DragTargetBasicDemo> {
  int _received = 0;
  bool _holding = false; // 是否正悬停在 target 上方（用于高亮）

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // 拖起方
          Draggable<String>(
            data: 'box', // 携带数据
            feedback: Material(
              color: Colors.transparent,
              child: Container(
                width: 60, height: 60,
                decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.dragging, color: Colors.white),
              ),
            ),
            childWhenDragging: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.blue.shade100, borderRadius: BorderRadius.circular(8)),
            ),
            child: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.drag_handle, color: Colors.white),
            ),
          ),
          const SizedBox(width: 48),
          // 接收方
          DragTarget<String>(
            onWillAcceptWithDetails: (d) {
              setState(() => _holding = true);
              return d.data == 'box'; // 返回 false 则拒收
            },
            onLeave: (_) => setState(() => _holding = false),
            onMove: (d) {},
            onAcceptWithDetails: (_) {
              setState(() {
                _received++;
                _holding = false;
              });
            },
            builder: (context, candidateData, rejectedData) => Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: _holding ? Colors.green.shade100 : Colors.grey.shade200,
                border: Border.all(color: _holding ? Colors.green : Colors.grey, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text('已接收 $_received 次')),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 拖到任意处（无目标判定）

只想"把东西拖走/扔掉"，用一个全屏 DragTarget 或在 onDragEnd 判断位置。

```dart
/// 示例: drag-end-anywhere —— 松手即处理，不依赖 DragTarget
class DragEndDemo extends StatefulWidget {
  const DragEndDemo({super.key});

  @override
  State<DragEndDemo> createState() => _DragEndDemoState();
}

class _DragEndDemoState extends State<DragEndDemo> {
  String _log = '拖方块到任意位置松手';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Draggable<String>(
            data: 'trash',
            feedback: const Material(
              color: Colors.transparent,
              child: Icon(Icons.delete_forever, size: 48, color: Colors.red),
            ),
            onDragEnd: (details) {
              // details.offset：松手位置；details.didDropToTarget：是否命中过 target
              setState(() => _log = '松手于 (${details.offset.dx.round()}, ${details.offset.dy.round()})');
            },
            child: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.red.shade200, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.delete_outline),
            ),
          ),
          const SizedBox(height: 24),
          Text(_log),
        ],
      ),
    );
  }
}
```

## 多个源拖一个目标（按数据区分）

```dart
/// 示例: drag-multi-source —— 颜色分类游戏
class DragMultiSourceDemo extends StatefulWidget {
  const DragMultiSourceDemo({super.key});

  @override
  State<DragMultiSourceDemo> createState() => _DragMultiSourceDemoState();
}

class _DragMultiSourceDemoState extends State<DragMultiSourceDemo> {
  final _colors = [Colors.red, Colors.blue, Colors.green];
  Color? _lastDrop;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final c in _colors)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Draggable<Color>(
                    data: c,
                    feedback: Material(color: Colors.transparent, child: CircleAvatar(backgroundColor: c, radius: 20)),
                    child: CircleAvatar(backgroundColor: c, radius: 24),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 28),
          DragTarget<Color>(
            onAcceptWithDetails: (d) => setState(() => _lastDrop = d.data),
            builder: (context, candidates, rejected) => Container(
              width: 120,
              height: 60,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: candidates.isNotEmpty ? candidates.first : Colors.grey, width: 3),
                borderRadius: BorderRadius.circular(8),
                color: _lastDrop?.withAlpha(30),
              ),
              child: Text(_lastDrop == null ? '接住颜色' : '收到 $_lastDrop'),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `data` | 投递携带的数据（DragTarget 泛型要对上） |
| `feedback` | 拖动时跟手的预览 widget |
| `childWhenDragging` | 原位留下的残影 |
| `maxSimultaneousDrags` | 限制同时拖起数量 |
| `onDragStart` / `onDragEnd` / `onDraggableCanceled` | 生命周期回调（canceled = 松手未命中） |
| DragTarget `onWillAcceptWithDetails` / `onAcceptWithDetails` | 是否接受 / 接受后处理（旧版 onWillAccept/onAccept 已废弃） |
| DragTarget `builder(candidates, rejected)` | 按候选数据实时改外观 |

## 易错点

::: danger 泛型必须一致
`Draggable<T>` 与 `DragTarget<T>` 类型不同永不命中（不会报错，只是"收不到"），排查半天。
:::

::: warning feedback 需要 Material 祖先
feedback 挂在 Overlay 上，脱离原 widget 树；忘记包 `Material(color: transparent)` 时 InkWell 等会断。
:::

::: info 拖拽排序别手写
列表拖拽排序用现成的 `ReorderableListView`（SDK 内置），它内部就是拖拽机制的成品封装。
:::
