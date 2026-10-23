---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Expanded / Flexible 伸展

> 🟢 无状态组件 · `StatelessWidget`

`Expanded` 和 `Flexible` 只能作为 `Row` / `Column` / `Flex` 的直接子，用来按比例分配主轴上的剩余空间。

## 吃满剩余空间

`Expanded` 强制子填满分配到的空间，最常见的用法是撑开输入框。

```dart
import 'package:flutter/material.dart';

/// 示例: expanded-fill —— 输入框吃掉剩余宽度
class ExpandedFillDemo extends StatelessWidget {
  const ExpandedFillDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: [
            const Icon(Icons.person),
            const SizedBox(width: 8),
            const Expanded(
              child: TextField(
                decoration: InputDecoration(labelText: '用户名'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## flex 权重分配

多个 `Expanded` 按 `flex` 比例瓜分剩余空间（默认 `flex: 1`）。

```dart
import 'package:flutter/material.dart';

/// 示例: expanded-flex —— 1:2:3 权重瓜分
class ExpandedFlexDemo extends StatelessWidget {
  const ExpandedFlexDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: const Row(
          children: [
            Expanded(flex: 1, child: ColoredBox(color: Colors.red, child: SizedBox(height: 60))),
            Expanded(flex: 2, child: ColoredBox(color: Colors.green, child: SizedBox(height: 60))),
            Expanded(flex: 3, child: ColoredBox(color: Colors.blue, child: SizedBox(height: 60))),
          ],
        ),
      ),
    );
  }
}
```

## Flexible 按需占位

`Flexible`（`fit: loose`）只保证子**不超过**分配上限，可小于上限；`Expanded`（`fit: tight`）强制填满。

```dart
import 'package:flutter/material.dart';

/// 示例: flexible-loose —— 文字不撑满、按需占位
class FlexibleLooseDemo extends StatelessWidget {
  const FlexibleLooseDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: [
            Container(width: 60, height: 60, color: Colors.blue.shade200),
            const SizedBox(width: 12),
            // Flexible：文字短就短占，不会硬撑开背景
            const Flexible(
              child: ColoredBox(
                color: Colors.amber,
                child: Text('按需占位，不超过分配上限'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## fit 参数对比

同一行内紧排三个色块：`tight` 铺满整行，`loose` 只按内容占位。

```dart
import 'package:flutter/material.dart';

/// 示例: expanded-fit-compare —— tight 与 loose 的差别
class ExpandedFitCompareDemo extends StatelessWidget {
  const ExpandedFitCompareDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('fit: tight（Expanded）'),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                Expanded(flex: 1, child: Container(height: 32, color: Colors.red)),
                Expanded(flex: 1, child: Container(height: 32, color: Colors.green)),
              ],
            ),
          ),
          const Text('fit: loose（Flexible）'),
          Padding(
            padding: const EdgeInsets.all(8),
            child: Row(
              children: [
                const Flexible(flex: 1, child: Text('短')),
                Flexible(flex: 1, child: Container(height: 32, width: 80, color: Colors.green)),
              ],
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
| `flex` | 权重整数，默认 1，必须 > 0 |
| `fit` | `FlexFit.tight`（填满）/ `FlexFit.loose`（最多到上限），Expanded 默认 tight、Flexible 默认 loose |
| `child` | 被伸展的子组件 |

## 易错点

::: danger 必须是有界约束的父
`Expanded`/`Flexible` 依赖父级给出**确定的主轴可用空间**。放在无限主轴的父里（如 `Expanded` 的 Row 里再套一个横向 `ListView`）会报错。
:::

::: warning 必须是直接子
必须是 Row/Column/Flex 的**直接** children，中间隔一层 widget（如包在另一个 Container 里）就失效——`Expanded` 靠父 Flex 识别，识别不到就不生效。
:::
