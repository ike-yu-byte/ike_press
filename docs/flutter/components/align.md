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

## 方向感知对齐

RTL 语言（阿拉伯语等）下 `Alignment.centerLeft` 仍贴物理左侧；要"跟随文字起始边"须用 `AlignmentDirectional.centerStart`。

```dart
/// 示例: align-text-direction —— Directionality 切换左右
class AlignTextDirectionDemo extends StatelessWidget {
  const AlignTextDirectionDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Directionality(
            textDirection: TextDirection.ltr,
            child: SizedBox(
              width: 220,
              height: 70,
              child: ColoredBox(
                color: Colors.blue.shade50,
                child: const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text('LTR 贴左'),
                ),
              ),
            ),
          ),
          Directionality(
            textDirection: TextDirection.rtl,
            child: SizedBox(
              width: 220,
              height: 70,
              child: ColoredBox(
                color: Colors.orange.shade50,
                child: const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text('RTL 贴右'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 强制宽高比

```dart
/// 示例: align-ratio —— 16:9 盒子
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
| `alignment` | `Alignment` / `AlignmentDirectional` 常量 |
| `widthFactor` / `heightFactor` | 自身尺寸 = 子尺寸 × 系数 |
| `child` | 被定位的子 |

`AspectRatio`：

| 属性 | 说明 |
| --- | --- |
| `aspectRatio` | 宽 / 高 比值 |

## 易错点

::: danger Align 不能裸放无界空间
`Align` 默认尽量撑大，放进 Column 无约束时会报错；给它套 SizedBox 或在有界父级里使用。
:::

::: tip Alignment 与 AlignmentDirectional
`Alignment.centerLeft` 是物理方位，`AlignmentDirectional.centerStart` 是逻辑方位（随 RTL 翻转）。国际化界面一律用后者。
:::
