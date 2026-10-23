---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Checkbox 复选框

`Checkbox` 表示开/关二态选择。它是**受控组件**：自己不记忆状态，勾选结果完全由外部 `value` + `onChanged` 决定。

## 基础勾选

```dart
import 'package:flutter/material.dart';

/// 示例: checkbox-basic —— 单个开关勾选
class CheckboxBasicDemo extends StatefulWidget {
  const CheckboxBasicDemo({super.key});

  @override
  State<CheckboxBasicDemo> createState() => _CheckboxBasicDemoState();
}

class _CheckboxBasicDemoState extends State<CheckboxBasicDemo> {
  bool _checked = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Checkbox(
            value: _checked,
            onChanged: (bool? v) => setState(() => _checked = v ?? false),
          ),
          const Text('同意用户协议'),
        ],
      ),
    );
  }
}
```

## 多选组

一组独立选项，value 存进 Set 管理。

```dart
import 'package:flutter/material.dart';

/// 示例: checkbox-group —— 兴趣爱好多选
class CheckboxGroupDemo extends StatefulWidget {
  const CheckboxGroupDemo({super.key});

  @override
  State<CheckboxGroupDemo> createState() => _CheckboxGroupDemoState();
}

class _CheckboxGroupDemoState extends State<CheckboxGroupDemo> {
  final _options = ['编程', '读书', '运动', '音乐'];
  final _selected = <String>{'编程'};

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final opt in _options)
            CheckboxListTile(
              title: Text(opt),
              value: _selected.contains(opt),
              onChanged: (v) => setState(() {
                v == true ? _selected.add(opt) : _selected.remove(opt);
              }),
            ),
          const SizedBox(height: 8),
          Text('已选：${_selected.join('、')}'),
        ],
      ),
    );
  }
}
```

## 三态与全选联动

`tristate: true` 允许 null（部分选中），做"全选框 + 子项"经典联动。

```dart
import 'package:flutter/material.dart';

/// 示例: checkbox-tristate —— 全选框三态联动子项
class CheckboxTristateDemo extends StatefulWidget {
  const CheckboxTristateDemo({super.key});

  @override
  State<CheckboxTristateDemo> createState() => _CheckboxTristateDemoState();
}

class _CheckboxTristateDemoState extends State<CheckboxTristateDemo> {
  final _children = [false, false, false];

  bool? get _parent =>
      _children.every((c) => c) ? true : _children.every((c) => !c) ? false : null;

  void _toggleAll(bool? all) {
    setState(() {
      for (var i = 0; i < _children.length; i++) {
        _children[i] = all ?? false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CheckboxListTile(
            title: const Text('全选'),
            value: _parent,
            tristate: true, // 部分选中显示横线
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: _toggleAll,
          ),
          for (var i = 0; i < _children.length; i++)
            CheckboxListTile(
              title: Text('子项 $i'),
              value: _children[i],
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: (v) => setState(() => _children[i] = v ?? false),
            ),
        ],
      ),
    );
  }
}
```

## 禁用态

```dart
import 'package:flutter/material.dart';

/// 示例: checkbox-disabled —— onChanged 传 null 即禁用
class CheckboxDisabledDemo extends StatelessWidget {
  const CheckboxDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Checkbox(value: true, onChanged: null), // 禁用但显示已勾选
          Text('不可修改'),
        ],
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `value` | 当前状态；`bool?` 配合 `tristate` |
| `onChanged` | 回调，**传 null 即禁用** |
| `tristate` | 允许 null / true / false 三态 |
| `activeColor` / `checkColor` / `side` | 选中色 / 勾色 / 边框 |
| `visualDensity` / `materialTapTargetSize` | 点击区域密度 |

## 易错点

::: danger onChanged 传 null 即禁用
`onChanged: null` 时 Checkbox 变灰不可点。这不是 bug，是 Flutter 表达"禁用"的统一约定（和按钮一致）。要可点就必须给非空回调。
:::

::: warning 受控组件必须 setState
onChanged 里不 setState，勾选框永远弹回原状态——"点了没反应"九成是这个原因。
:::

::: tip 整行可点用 CheckboxListTile
交互上让标题文字也能点中勾选框，优先 `CheckboxListTile` 而不是 `Row(Checkbox + Text)`。
:::
