---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/inkwell' # 该页 Flutter Web 预览地址
---

# InkWell 水波纹

> 🔵 有状态组件 · `StatefulWidget`

`InkWell` 给子组件加上 Material 的**点击水波纹（ripple）**效果，自带 `onTap`/`onLongPress` 手势。是"可点的自定义区域"的标准选择。

## 基础水波纹

```dart
import 'package:flutter/material.dart';

/// 示例: inkwell-basic —— 点整块出波纹
class InkWellBasicDemo extends StatelessWidget {
  const InkWellBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.blue.shade50, // 波纹画在最近的 Material 上
      child: InkWell(
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: Text('点我有水波纹', style: TextStyle(fontSize: 16)),
        ),
      ),
    );
  }
}
```

## 圆角裁剪

波纹默认是矩形扩散，配 `customBorder` 或外层 `clipBehavior` 贴合形状。

```dart
import 'package:flutter/material.dart';

/// 示例: inkwell-rounded —— 圆角卡片可点
class InkWellRoundedDemo extends StatelessWidget {
  const InkWellRoundedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias, // 关键：让波纹按圆角裁剪
      child: InkWell(
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(24),
          child: Row(children: [Icon(Icons.photo), SizedBox(width: 12), Text('图文可点卡')]),
        ),
      ),
    );
  }
}
```

## 状态反馈（选中/悬停）

`radius`、hover 色、选中高亮都能定制；桌面端 hover 也有效果。

```dart
import 'package:flutter/material.dart';

/// 示例: inkwell-states —— hover/selected 态颜色
class InkWellStatesDemo extends StatefulWidget {
  const InkWellStatesDemo({super.key});

  @override
  State<InkWellStatesDemo> createState() => _InkWellStatesDemoState();
}

class _InkWellStatesDemoState extends State<InkWellStatesDemo> {
  bool _selected = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.grey.shade200,
        child: InkWell(
          onTap: () => setState(() => _selected = !_selected),
          selected: _selected,
          hoverColor: Colors.amber.shade100,
          splashColor: Colors.amber.shade300,
          highlightColor: Colors.amber.withAlpha(60),
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Text(_selected ? '已选中（金底）' : '点选中'),
          ),
        ),
      ),
    );
  }
}
```

## Ink 装饰同族

想让文字/图片也"沾染"波纹（波纹画在 Ink 层而非 Material 层），用 `Ink`/`ColoredBox` 替代 Container 背景。

```dart
import 'package:flutter/material.dart';

/// 示例: ink-image-reveal —— 图片上盖波纹
class InkImageDemo extends StatelessWidget {
  const InkImageDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      child: InkWell(
        onTap: () {},
        // Ink 让背景图随水波纹一起显隐
        child: Ink(
          width: 160,
          height: 100,
          decoration: BoxDecoration(
            image: const DecorationImage(
              image: NetworkImage('https://picsum.photos/seed/ink/320/200'),
              fit: BoxFit.cover,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `onTap` / `onLongPress` / `onDoubleTap` | 手势（null 即不可点无水波纹） |
| `splashColor` / `highlightColor` / `hoverColor` | 按压波纹 / 按压停留 / 悬停 色 |
| `splashFactory` | 波纹形态（`InkSparkle`/`InkRipple`，M3 默认 InkSparkle） |
| `radius` | 波纹最大半径 |
| `customBorder` | 波纹裁剪形状 |
| `selected` / `focusColor` | 选中态 / 焦点色（遥控器/键盘导航） |
| `excludeFromSemantics` / `enableFeedback` | 无障碍 / 触觉反馈 |

## 易错点

::: danger 必须在 Material 之上
水波纹画在最近的 `Material` 祖先上。若 InkWell 直接放在 `Container(color: ...)` 里（那不是 Material），波纹不可见。要么外层用 `Card`/`Scaffold`（自带 Material），要么用 `Ink` 作背景，要么包 `Material(child: InkWell(...))`。
:::

::: warning onTap 为 null 波纹消失
InkWell 靠非空回调判断"可交互"；全部回调传 null 时它变成纯布局组件，不再有 hover/press 效果（这也是禁用态的实现方式）。
:::

::: info InkWell vs GestureDetector 选择
需要 Material 反馈（按钮感）用 InkWell；只需要拖/缩等手势用 GestureDetector；两者同时挂时注意手势竞技场归属（外层 InkWell 会抢 tap）。
:::
