---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/safearea' # 该页 Flutter Web 预览地址
---

# SafeArea 安全区

> 🟢 无状态组件 · `StatelessWidget`

`SafeArea` 读取 `MediaQuery.padding`，把子组件从刘海、状态栏、底部手势条等系统"不安全区"往里推，避免内容被遮挡。它不占额外空间，只是"吃掉"已有的系统内边距。

## 基本内缩

不给 `SafeArea`，内容会顶到屏幕边缘被刘海盖住；包一层 `SafeArea` 后内容自动内缩到安全区。（预览框用假造的 `padding` 模拟设备安全区，蓝灰色即"危险区"露出的底色。）

```dart
import 'package:flutter/material.dart';

/// 示例: safearea-basic —— 用假造的刘海/手势条演示内容内缩
class SafeAreaBasicDemo extends StatelessWidget {
  const SafeAreaBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    // 模拟一台上下左右各有"不安全区"的设备
    const fake = EdgeInsets.fromLTRB(20, 36, 20, 36);
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: fake, viewPadding: fake),
      child: Container(
        color: Colors.blueGrey, // 危险区露出的底色
        child: const SafeArea(
          child: ColoredBox(
            color: Colors.white,
            child: Center(child: Text('内容被 SafeArea 推入安全区内')),
          ),
        ),
      ),
    );
  }
}
```

## 按边开关

`top` / `bottom` / `left` / `right` 分别控制某条边是否内缩（默认全 `true`）；`minimum` 在安全区之外再补一层最小内边距。

```dart
import 'package:flutter/material.dart';

/// 示例: safearea-edges —— top/bottom/left/right 开关控制哪几边内缩
class SafeAreaEdgesDemo extends StatelessWidget {
  const SafeAreaEdgesDemo({super.key});

  static Widget _cell(String label, bool allEdges) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Expanded(
          child: Container(
            color: Colors.blueGrey,
            child: SafeArea(
              top: allEdges,
              bottom: allEdges,
              child: const ColoredBox(color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    const fake = EdgeInsets.fromLTRB(16, 32, 16, 32);
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: fake, viewPadding: fake),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            Expanded(child: _cell('四边都缩', true)),
            const SizedBox(width: 8),
            Expanded(child: _cell('上下不缩', false)),
          ],
        ),
      ),
    );
  }
}
```

::: tip 常常不用手写
`Scaffold` 会自动把 `AppBar`、`BottomNavigationBar` 让开安全区。真正需要 `SafeArea` 的是那些铺满整屏、又没用 `Scaffold` 结构的内容（如自定义启动页、横屏游戏画面）。
:::

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `top` / `bottom` / `left` / `right` | 各边是否内缩，默认全 `true` |
| `minimum` | 安全区之外再补的最小 `EdgeInsets` |
| `maintainBottomViewPadding` | 键盘等 `viewInsets` 弹出时仍保留底部安全区内边距 |
| `child` | 被推入安全区的子组件 |

## 易错点

::: warning 依赖 MediaQuery.padding
`SafeArea` 吃的是 `MediaQuery` 的 `padding`。如果上层用 `MediaQuery.removePadding` 把某个方向清成 0，`SafeArea` 在该方向就不会内缩。
:::

::: info 与 Padding 的区别
`SafeArea` 的内缩值由设备决定（不同机型不同），`Padding` 是你写死的固定值。二者可叠加：`SafeArea` 保证不被遮挡，`Padding` 负责美观留白。
:::
