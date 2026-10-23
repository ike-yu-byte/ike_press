---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Slider 滑块

`Slider` 让用户在一段区间内拖动选择数值，如音量、亮度、价格范围。

## 基础连续滑块

```dart
import 'package:flutter/material.dart';

/// 示例: slider-basic —— 0-100 连续拖动
class SliderBasicDemo extends StatefulWidget {
  const SliderBasicDemo({super.key});

  @override
  State<SliderBasicDemo> createState() => _SliderBasicDemoState();
}

class _SliderBasicDemoState extends State<SliderBasicDemo> {
  double _value = 30;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _value,
              min: 0,
              max: 100,
              onChanged: (v) => setState(() => _value = v),
            ),
            Text('当前值：${_value.toStringAsFixed(1)}'),
          ],
        ),
      ),
    );
  }
}
```

## 离散档位 + 气泡标签

`divisions` 切档位，`label` 在拖动时显示气泡。

```dart
import 'package:flutter/material.dart';

/// 示例: slider-divisions —— 5 档价格选择
class SliderDivisionsDemo extends StatefulWidget {
  const SliderDivisionsDemo({super.key});

  @override
  State<SliderDivisionsDemo> createState() => _SliderDivisionsDemoState();
}

class _SliderDivisionsDemoState extends State<SliderDivisionsDemo> {
  double _price = 50;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _price,
              min: 10,
              max: 90,
              divisions: 4, // 10 / 30 / 50 / 70 / 90 五档
              label: '¥${_price.round()}',
              onChanged: (v) => setState(() => _price = v),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 区间滑块 RangeSlider

一次选一段（价格区间筛选）。

```dart
import 'package:flutter/material.dart';

/// 示例: slider-range —— RangeSlider 双端选择
class SliderRangeDemo extends StatefulWidget {
  const SliderRangeDemo({super.key});

  @override
  State<SliderRangeDemo> createState() => _SliderRangeDemoState();
}

class _SliderRangeDemoState extends State<SliderRangeDemo> {
  RangeValues _range = const RangeValues(20, 80);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RangeSlider(
              values: _range,
              min: 0,
              max: 100,
              divisions: 10,
              labels: RangeLabels(
                '¥${_range.start.round()}',
                '¥${_range.end.round()}',
              ),
              onChanged: (v) => setState(() => _range = v),
            ),
            Text('区间：¥${_range.start.round()} - ¥${_range.end.round()}'),
          ],
        ),
      ),
    );
  }
}
```

## 松手才提交（onChanged vs onChangeEnd）

拖动过程只更新 UI，松手才发请求——省掉连续请求风暴。

```dart
import 'package:flutter/material.dart';

/// 示例: slider-commit —— 松手时才真正应用
class SliderCommitDemo extends StatefulWidget {
  const SliderCommitDemo({super.key});

  @override
  State<SliderCommitDemo> createState() => _SliderCommitDemoState();
}

class _SliderCommitDemoState extends State<SliderCommitDemo> {
  double _dragging = 40;
  double _applied = 40;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _dragging,
              min: 0,
              max: 100,
              onChanged: (v) => setState(() => _dragging = v), // 拖动中持续回调
              onChangeEnd: (v) {
                // 松手后才"发请求"
                setState(() => _applied = v);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('已应用：$v'), duration: const Duration(seconds: 1)),
                );
              },
            ),
            Text('拖动中：${_dragging.round()}　已提交：${_applied.round()}'),
          ],
        ),
      ),
    );
  }
}
```

## M3 样式（带图标）

```dart
import 'package:flutter/material.dart';

/// 示例: slider-m3-icons —— 两端图标 + 主题色
class SliderM3IconsDemo extends StatefulWidget {
  const SliderM3IconsDemo({super.key});

  @override
  State<SliderM3IconsDemo> createState() => _SliderM3IconsDemoState();
}

class _SliderM3IconsDemoState extends State<SliderM3IconsDemo> {
  double _volume = 0.6;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          children: [
            const Icon(Icons.volume_down),
            Expanded(
              child: Slider(
                value: _volume,
                onChanged: (v) => setState(() => _volume = v),
              ),
            ),
            const Icon(Icons.volume_up),
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
| `value` / `min` / `max` | 当前值与区间，value 必须落在 [min, max] |
| `divisions` | 离散档位数（区间等分） |
| `label` | 拖动时气泡文字 |
| `onChanged` / `onChangeStart` / `onChangeEnd` | 拖动中 / 按下 / 松手 |
| `inactiveColor` / `activeColor` / `thumbColor` | 轨道未填段 / 已填段 / 滑块颜色 |
| `allowedInteraction` | M3：限制点按/拖动等交互方式 |

## 易错点

::: danger value 越界直接断言崩溃
`value` 不在 `[min, max]` 内会在 debug 模式抛断言。初始值、接口回填值都要先 clamp。
:::

::: warning onChanged 传 null 即禁用
与按钮/开关同款禁用约定。
:::

::: info 拖动别发请求
`onChanged` 每帧都回调，网络请求一律放 `onChangeEnd`，或加防抖。
:::
