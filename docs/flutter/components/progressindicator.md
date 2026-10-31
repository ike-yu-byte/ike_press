---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/progressindicator' # 该页 Flutter Web 预览地址
---

# ProgressIndicator 进度指示

> 🟢 无状态组件 · `StatelessWidget`

进度指示分两类：**不确定**（转圈，不知道还要多久）和**确定**（有百分比）。对应 `CircularProgressIndicator` 与 `LinearProgressIndicator`。

## 不确定进度（加载中）

```dart
import 'package:flutter/material.dart';

/// 示例: progress-indeterminate —— 圆形 + 线性转圈
class ProgressIndeterminateDemo extends StatelessWidget {
  const ProgressIndeterminateDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 24),
          SizedBox(width: 200, child: LinearProgressIndicator()),
          SizedBox(height: 24),
          // 自定义颜色与粗细
          CircularProgressIndicator(color: Colors.green, strokeWidth: 6),
        ],
      ),
    );
  }
}
```

## 确定进度（有 value）

给 `value`（0.0~1.0）即变成确定进度，按比例填充。

```dart
import 'package:flutter/material.dart';

/// 示例: progress-determinate —— 下载进度 60%
class ProgressDeterminateDemo extends StatelessWidget {
  const ProgressDeterminateDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const progress = 0.6;
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          LinearProgressIndicator(value: progress, minHeight: 10, borderRadius: BorderRadius.all(Radius.circular(5))),
          SizedBox(height: 16),
          CircularProgressIndicator(value: progress),
          SizedBox(height: 8),
          Text('下载中 60%'),
        ],
      ),
    );
  }
}
```

## 加载/内容条件切换

最常见的异步页写法：loading 态与内容态二选一。

```dart
import 'package:flutter/material.dart';

/// 示例: progress-conditional —— 模拟加载后显示内容
class ProgressConditionalDemo extends StatefulWidget {
  const ProgressConditionalDemo({super.key});

  @override
  State<ProgressConditionalDemo> createState() => _ProgressConditionalDemoState();
}

class _ProgressConditionalDemoState extends State<ProgressConditionalDemo> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: _loading
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 12),
                Text('加载中…'),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('内容已就绪'),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () {
                    setState(() => _loading = true);
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) setState(() => _loading = false);
                    });
                  },
                  child: const Text('重新加载'),
                ),
              ],
            ),
    );
  }
}
```

## 缓动进度（Indeterminate 双值）

新版支持 `value` + `total` 表达"完成 x/total"的分段式进度（M3）。

```dart
import 'package:flutter/material.dart';

/// 示例: progress-steps —— 分段步骤进度
class ProgressStepsDemo extends StatelessWidget {
  const ProgressStepsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 240,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LinearProgressIndicator(value: 2 / 5, color: Colors.indigo),
            SizedBox(height: 8),
            Text('第 2 步 / 共 5 步'),
          ],
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `value` | null = 不确定转圈；0.0~1.0 = 确定进度 |
| `color` / `backgroundColor` / `strokeWidth` | 前景 / 轨道 / 粗细 |
| `minHeight` / `semanticsLabel` | 高度 / 无障碍朗读 |
| borderRadius（Linear） | 圆角进度条 |
| `CircularProgressIndicator(minValue:)` | 新版区间进度 |

## 易错点

::: danger value 越界
`value` 必须在 `[0.0, 1.0]`（debug 断言），除零、NaN 都会崩；除法进度先 clamp。
:::

::: warning 全屏 loading 要 Center
进度组件默认尽量占满约束，直接放 Column 会被拉很大；常用 `Center(child: SizedBox(width: 32, height: 32, child: CircularProgressIndicator()))` 限尺寸。
:::

::: info 按钮内小转圈
按钮加载态：`ElevatedButton(onPressed: null, child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))`，onPressed 传 null 即禁用。
:::
