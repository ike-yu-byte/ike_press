---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Center / Align 对齐

`Center` 与 `Align` 把子组件在父级空间内摆到某个位置，`Center` 即 `Align(alignment: Alignment.center)`。

## 居中

```dart
/// 示例: align-center —— 居中
class AlignCenterDemo extends StatelessWidget {
  const AlignCenterDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 160,
      child: ColoredBox(
        color: Colors.blue.shade50,
        child: Center(
          child: ElevatedButton(onPressed: () {}, child: const Text('我居中')),
        ),
      ),
    );
  }
}
```

## 九宫格对齐

`Alignment` 常量控制贴哪一角。

```dart
/// 示例: align-corner —— 右下角
class AlignCornerDemo extends StatelessWidget {
  const AlignCornerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 160,
      child: ColoredBox(
        color: Colors.grey.shade200,
        child: Align(
          alignment: Alignment.bottomRight,
          child: Container(width: 40, height: 40, color: Colors.red),
        ),
      ),
    );
  }
}
```

## 强制宽高比

`AspectRatio` 固定子宽高比。

```dart
/// 示例: align-ratio —— 16:9
class AlignRatioDemo extends StatelessWidget {
  const AlignRatioDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(color: Colors.teal, child: const Center(child: Text('16:9'))),
        ),
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `child` | 被对齐的子 |
| `alignment` | `Alignment` / `AlignmentDirectional` |
| `widthFactor` / `heightFactor` | 自身尺寸 = 子尺寸 × 系数 |

::: tip RTL 用 AlignmentDirectional
涉及从右到左语言时，用 `AlignmentDirectional.centerStart` 而非 `Alignment.centerLeft`，会随文字方向自动翻转。
:::
