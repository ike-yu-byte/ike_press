---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Flex 弹性布局

`Flex` 是 `Row`/`Column` 的底层实现，`direction` 决定主轴方向。只有当排列方向需要运行时切换时才直接用它。

## 竖直方向（等价 Column）

```dart
/// 示例: flex-vertical —— direction 竖直
class FlexVerticalDemo extends StatelessWidget {
  const FlexVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Flex(
        direction: Axis.vertical,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 100, height: 40, color: Colors.red),
          Container(width: 100, height: 40, color: Colors.green),
        ],
      ),
    );
  }
}
```

## 运行时切换方向

响应式：宽屏横排、窄屏竖排。

```dart
/// 示例: flex-responsive —— 按宽度切换方向
class FlexResponsiveDemo extends StatelessWidget {
  const FlexResponsiveDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final horizontal = constraints.maxWidth > 400;
        return Flex(
          direction: horizontal ? Axis.horizontal : Axis.vertical,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 80, height: 80, color: Colors.blue),
            Container(width: 80, height: 80, color: Colors.orange),
          ],
        );
      },
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `direction` | `Axis.horizontal` / `Axis.vertical`（必填） |
| `children` | 子组件 |
| `mainAxisAlignment` | 主轴对齐 |
| `crossAxisAlignment` | 交叉轴对齐 |

::: info 绝大多数场景用 Row / Column
只有排列方向需按条件动态切换时，`Flex` 才比写两套 Row/Column 更简洁。
:::
