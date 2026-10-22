---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Stack 层叠布局

`Stack` 让子组件沿 Z 轴叠放，后面的盖在前面上。适合角标、浮层、水印。

## 图片 + 角标

用 `Positioned` 精确定位。

```dart
/// 示例: stack-badge —— 右上角红点角标
class StackBadgeDemo extends StatelessWidget {
  const StackBadgeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        children: [
          Container(width: 120, height: 120, color: Colors.grey.shade300),
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
              child: const Text('3', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 整体对齐浮层

未用 `Positioned` 的子按 `alignment` 统一对齐。

```dart
/// 示例: stack-watermark —— 右下角水印
class StackWatermarkDemo extends StatelessWidget {
  const StackWatermarkDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        alignment: Alignment.bottomRight,
        children: [
          Image.network('https://picsum.photos/240/160', width: 240, height: 160, fit: BoxFit.cover),
          const Padding(
            padding: EdgeInsets.all(8),
            child: Text('© ike', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `children` | 层叠子，越靠后越在上 |
| `alignment` | 非定位子的对齐 |
| `fit` | loose 包住 / expand 撑满 |
| `clipBehavior` | 溢出裁剪方式 |

::: tip 定位靠 Positioned
`Stack` 本身不控制子位置，需要 `Positioned`（top/bottom/left/right/width/height）精确摆放。
:::
