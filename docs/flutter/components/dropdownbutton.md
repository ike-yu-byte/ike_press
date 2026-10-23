---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# DropdownButton 下拉选择

`DropdownButton` 点击弹出一个选项菜单，选中后收起并把当前项显示在按钮位置。适合从固定几个选项里选一个（城市、分类）。

## 基础用法

```dart
import 'package:flutter/material.dart';

/// 示例: dropdown-basic —— 城市单选下拉
class DropdownBasicDemo extends StatefulWidget {
  const DropdownBasicDemo({super.key});

  @override
  State<DropdownBasicDemo> createState() => _DropdownBasicDemoState();
}

class _DropdownBasicDemoState extends State<DropdownBasicDemo> {
  String? _city = '北京';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DropdownButton<String>(
        value: _city,
        hint: const Text('请选择城市'), // value 为 null 时显示
        items: const [
          DropdownMenuItem(value: '北京', child: Text('北京')),
          DropdownMenuItem(value: '上海', child: Text('上海')),
          DropdownMenuItem(value: '广州', child: Text('广州')),
          DropdownMenuItem(value: '深圳', child: Text('深圳')),
        ],
        onChanged: (v) => setState(() => _city = v),
      ),
    );
  }
}
```

## 表单风格（带边框标签）

裸 `DropdownButton` 没有边框，表单场景用 `DropdownButtonFormField` 直接获得 `InputDecoration`。

```dart
import 'package:flutter/material.dart';

/// 示例: dropdown-form-field —— 带描边和标签的下拉
class DropdownFormFieldDemo extends StatefulWidget {
  const DropdownFormFieldDemo({super.key});

  @override
  State<DropdownFormFieldDemo> createState() => _DropdownFormFieldDemoState();
}

class _DropdownFormFieldDemoState extends State<DropdownFormFieldDemo> {
  String? _category;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: DropdownButtonFormField<String>(
          value: _category,
          decoration: const InputDecoration(
            labelText: '分类',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'food', child: Text('美食')),
            DropdownMenuItem(value: 'travel', child: Text('旅行')),
            DropdownMenuItem(value: 'tech', child: Text('科技')),
          ],
          onChanged: (v) => setState(() => _category = v),
        ),
      ),
    );
  }
}
```

## 富内容选项

菜单项可放图标、颜色等任意 widget。

```dart
import 'package:flutter/material.dart';

/// 示例: dropdown-rich —— 带图标的选项
class DropdownRichDemo extends StatefulWidget {
  const DropdownRichDemo({super.key});

  @override
  State<DropdownRichDemo> createState() => _DropdownRichDemoState();
}

class _DropdownRichDemoState extends State<DropdownRichDemo> {
  int _priority = 1;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DropdownButton<int>(
        value: _priority,
        items: const [
          DropdownMenuItem(
            value: 0,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.grey), Text(' 低'),
            ]),
          ),
          DropdownMenuItem(
            value: 1,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.orange), Text(' 中'),
            ]),
          ),
          DropdownMenuItem(
            value: 2,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.red), Text(' 高'),
            ]),
          ),
        ],
        onChanged: (v) => setState(() => _priority = v ?? 1),
      ),
    );
  }
}
```

## 选项过多：升级选择器

下拉菜单不适合长列表（>10 项滚动困难），改用底部弹层或对话框列表。

```dart
import 'package:flutter/material.dart';

/// 示例: dropdown-bottom-sheet —— 长列表走底部选择器
class DropdownBottomSheetDemo extends StatefulWidget {
  const DropdownBottomSheetDemo({super.key});

  @override
  State<DropdownBottomSheetDemo> createState() => _DropdownBottomSheetDemoState();
}

class _DropdownBottomSheetDemoState extends State<DropdownBottomSheetDemo> {
  String _bank = '工商银行';
  final _banks = ['工商银行', '建设银行', '农业银行', '中国银行', '招商银行', '交通银行', '邮储银行', '中信银行'];

  Future<void> _pick() async {
    final result = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final b in _banks)
              ListTile(
                title: Text(b),
                trailing: b == _bank ? const Icon(Icons.check) : null,
                onTap: () => Navigator.pop(context, b),
              ),
          ],
        ),
      ),
    );
    if (result != null) setState(() => _bank = result);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: OutlinedButton.icon(
          onPressed: _pick,
          icon: const Icon(Icons.account_balance),
          label: Text(_bank),
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `value` / `items` / `onChanged` | 三件套；null 显示 hint |
| `hint` | 未选中时的占位文案 |
| `underline` / `iconEnabledColor` | 下划线 / 箭头颜色 |
| `isExpanded` | true 时按钮撑满宽度、文字左对齐 |
| `itemBuilder`（FormField 版） | Form 集成 + validator |
| `menuMaxHeight` | 菜单最大高度，超出滚动 |

## 易错点

::: danger value 必须能匹配某个 item
`value` 必须等于某个 `DropdownMenuItem.value`（或为 null 显示 hint）。若初始值不在列表里会断言报错。
:::

::: warning 选项文案宽度撑爆菜单
菜单宽度取最宽项；某项特别长会把整个按钮撑变形，给长项 Text 设 `overflow` + 固定宽。
:::

::: info M3 替代者
Material 3 的菜单式选择器（带搜索、分组）官方推荐用 `MenuAnchor` 或第三方 dropdown 包；简单表单用 `DropdownButtonFormField` 已足够。
:::
