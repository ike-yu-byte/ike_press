---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Switch 开关

`Switch` 表示一个即时生效的开/关切换（如 Wi-Fi、通知）。与 Checkbox 一样是受控组件，靠 `value` + `onChanged` 驱动，区别在于 Switch 带滑动动画、语义是"拨一下就立刻生效"。

## 基础开关

```dart
import 'package:flutter/material.dart';

/// 示例: switch-basic —— Wi-Fi 开关即时生效
class SwitchBasicDemo extends StatefulWidget {
  const SwitchBasicDemo({super.key});

  @override
  State<SwitchBasicDemo> createState() => _SwitchBasicDemoState();
}

class _SwitchBasicDemoState extends State<SwitchBasicDemo> {
  bool _wifi = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Wi-Fi'),
          const SizedBox(width: 12),
          Switch(
            value: _wifi,
            onChanged: (bool v) => setState(() => _wifi = v),
          ),
          Text(_wifi ? '已开启' : '已关闭'),
        ],
      ),
    );
  }
}
```

## 整行可点（SwitchListTile）

设置页标准形态，点标题也能切换。

```dart
import 'package:flutter/material.dart';

/// 示例: switch-listtile —— 设置列表风格
class SwitchListTileDemo extends StatefulWidget {
  const SwitchListTileDemo({super.key});

  @override
  State<SwitchListTileDemo> createState() => _SwitchListTileDemoState();
}

class _SwitchListTileDemoState extends State<SwitchListTileDemo> {
  bool _notify = true;
  bool _dark = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SwitchListTile(
              title: const Text('消息通知'),
              subtitle: const Text('接收推送和提醒'),
              secondary: const Icon(Icons.notifications),
              value: _notify,
              onChanged: (v) => setState(() => _notify = v),
            ),
            SwitchListTile(
              title: const Text('深色模式'),
              secondary: const Icon(Icons.dark_mode),
              value: _dark,
              onChanged: (v) => setState(() => _dark = v),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Material 3 配色定制

新版用 `WidgetStateProperty` 按状态（选中/未选中/禁用）给色。

```dart
import 'package:flutter/material.dart';

/// 示例: switch-colored —— M3 状态属性配色
class SwitchColoredDemo extends StatefulWidget {
  const SwitchColoredDemo({super.key});

  @override
  State<SwitchColoredDemo> createState() => _SwitchColoredDemoState();
}

class _SwitchColoredDemoState extends State<SwitchColoredDemo> {
  bool _on = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Switch(
            value: _on,
            onChanged: (v) => setState(() => _on = v),
            activeThumbColor: Colors.white,
            activeTrackColor: Colors.green,
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: Colors.grey.shade300,
          ),
          const SizedBox(height: 12),
          // 老属性仍可用：简单场景 activeColor 一把梭
          Switch(
            value: !_on,
            activeColor: Colors.red,
            onChanged: (v) => setState(() => _on = !v),
          ),
        ],
      ),
    );
  }
}
```

## 禁用与加载确认

```dart
import 'package:flutter/material.dart';

/// 示例: switch-async —— 拨动后异步确认，期间显示加载
class SwitchAsyncDemo extends StatefulWidget {
  const SwitchAsyncDemo({super.key});

  @override
  State<SwitchAsyncDemo> createState() => _SwitchAsyncDemoState();
}

class _SwitchAsyncDemoState extends State<SwitchAsyncDemo> {
  bool _bluetooth = false;
  bool _pending = false;

  Future<void> _toggle(bool v) async {
    setState(() => _pending = true);
    await Future.delayed(const Duration(seconds: 1)); // 模拟开启蓝牙耗时
    if (!mounted) return;
    setState(() {
      _bluetooth = v;
      _pending = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_pending ? '处理中…' : '蓝牙'),
          const SizedBox(width: 12),
          Switch(
            value: _bluetooth,
            // 异步处理中禁用，防止连点
            onChanged: _pending ? null : _toggle,
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
| `value` / `onChanged` | 受控状态 / 回调（null 即禁用） |
| `activeColor` / `activeTrackColor` | 旧版：打开时滑块 / 轨道颜色 |
| `activeThumbColor` / `inactiveThumbColor` / `activeTrackColor` / `inactiveTrackColor` | M3 状态配色 |
| `thumbIcon` / `trackIcon` / `selectedOverlayColor` | M3 滑块图标 / 轨道图标 / 按压态 |
| `SwitchListTile` | 整行可点版，带 title / subtitle / secondary |

## 易错点

::: danger onChanged 传 null 即禁用
与 Checkbox 相同约定：`onChanged: null` 变灰不可拨。想"异步生效期间不可再拨"就临时传 null。
:::

::: warning 受控组件必须 setState
不在 onChanged 里更新 value，开关永远弹回原位。
:::

::: info Switch vs Checkbox 语义
即时生效（拨了就执行）用 Switch；需要"提交确认"的勾选（协议同意）用 Checkbox。别混用。
:::
