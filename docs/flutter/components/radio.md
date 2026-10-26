---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Radio 单选框

> 🔵 有状态组件 · `StatefulWidget`

`Radio` 用于一组互斥选项里选一个。单个 `Radio` 没有意义，Flutter 3.32+ 用一个祖先 `RadioGroup` 统一接管组状态：谁的 `value == RadioGroup.groupValue` 谁就亮，子项只需声明 `value`。

## 基础单选

```dart
import 'package:flutter/material.dart';

/// 示例: radio-basic —— 性别二选一
class RadioBasicDemo extends StatefulWidget {
  const RadioBasicDemo({super.key});

  @override
  State<RadioBasicDemo> createState() => _RadioBasicDemoState();
}

class _RadioBasicDemoState extends State<RadioBasicDemo> {
  String? _gender = 'male';

  @override
  Widget build(BuildContext context) {
    return Center(
      // 组状态挂在 RadioGroup 上，子项只写 value
      child: RadioGroup<String>(
        groupValue: _gender,
        onChanged: (v) => setState(() => _gender = v),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Radio<String>(value: 'male'),
            Text('男'),
            Radio<String>(value: 'female'),
            Text('女'),
          ],
        ),
      ),
    );
  }
}
```

## 整行可点（推荐 RadioListTile）

单选场景几乎都该用 `RadioListTile`，点标题文字也能选中。

```dart
import 'package:flutter/material.dart';

/// 示例: radio-listtile —— 支付方式单选
class RadioListTileDemo extends StatefulWidget {
  const RadioListTileDemo({super.key});

  @override
  State<RadioListTileDemo> createState() => _RadioListTileDemoState();
}

class _RadioListTileDemoState extends State<RadioListTileDemo> {
  String _pay = 'wechat';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: RadioGroup<String>(
          groupValue: _pay,
          onChanged: (v) => setState(() => _pay = v!),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              RadioListTile<String>(
                title: Text('微信支付'),
                secondary: Icon(Icons.chat),
                value: 'wechat',
              ),
              RadioListTile<String>(
                title: Text('支付宝'),
                secondary: Icon(Icons.account_balance),
                value: 'alipay',
              ),
              RadioListTile<String>(
                title: Text('银行卡'),
                secondary: Icon(Icons.credit_card),
                value: 'bank',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 枚举类型驱动（推荐写法）

泛型用枚举而不是字符串，编译期防写错值。

```dart
import 'package:flutter/material.dart';

/// 示例: radio-enum —— 用 enum 做类型安全的单选
enum DeliverySpeed { standard, express, sameDay }

class RadioEnumDemo extends StatefulWidget {
  const RadioEnumDemo({super.key});

  @override
  State<RadioEnumDemo> createState() => _RadioEnumDemoState();
}

class _RadioEnumDemoState extends State<RadioEnumDemo> {
  DeliverySpeed _speed = DeliverySpeed.standard;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          RadioGroup<DeliverySpeed>(
            groupValue: _speed,
            onChanged: (v) => setState(() => _speed = v!),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final (i, label) in const ['标准配送', '加急配送', '当日达'].indexed)
                  RadioListTile<DeliverySpeed>(
                    title: Text(label),
                    value: DeliverySpeed.values[i],
                  ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Text('当前：${_speed.name}'),
        ],
      ),
    );
  }
}
```

## 禁用单项

```dart
import 'package:flutter/material.dart';

/// 示例: radio-disabled —— enabled: false 该项不可选
class RadioDisabledDemo extends StatefulWidget {
  const RadioDisabledDemo({super.key});

  @override
  State<RadioDisabledDemo> createState() => _RadioDisabledDemoState();
}

class _RadioDisabledDemoState extends State<RadioDisabledDemo> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: RadioGroup<int>(
        groupValue: _selected,
        onChanged: (v) => setState(() => _selected = v!),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            RadioListTile<int>(title: Text('可选项'), value: 0),
            RadioListTile<int>(title: Text('售罄，不可选'), value: 1, enabled: false),
          ],
        ),
      ),
    );
  }
}
```

## 新写法：RadioGroup 容器（Flutter 3.32+）

`groupValue` / `onChanged` 已从单项上废弃，改由祖先 `RadioGroup` 统一接管组状态：

```dart
import 'package:flutter/material.dart';

/// 示例: radio-group-new-api —— RadioGroup 管理单选组
class RadioGroupNewDemo extends StatefulWidget {
  const RadioGroupNewDemo({super.key});

  @override
  State<RadioGroupNewDemo> createState() => _RadioGroupNewDemoState();
}

class _RadioGroupNewDemoState extends State<RadioGroupNewDemo> {
  String _pay = 'wechat';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        // 组状态挂在这里，子项只写 value
        child: RadioGroup<String>(
          groupValue: _pay,
          onChanged: (v) => setState(() => _pay = v!),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              RadioListTile<String>(title: Text('微信支付'), value: 'wechat'),
              RadioListTile<String>(title: Text('支付宝'), value: 'alipay'),
              RadioListTile<String>(title: Text('银行卡'), value: 'bank'),
            ],
          ),
        ),
      ),
    );
  }
}
```

::: info 为什么改
旧写法每个选项都重复传 `groupValue` + `onChanged`，漏传一个就互斥失效；`RadioGroup` 把组状态上提到一个祖先，子项只声明 `value`，还能嵌套自定义分组。
:::

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `RadioGroup` 的 `groupValue` / `onChanged` | 组选中值 / 变更回调（挂在祖先容器上） |
| `Radio` / `RadioListTile` 的 `value` | 本选项标识，等于 `groupValue` 即选中 |
| `enabled` | 传 `false` 禁用单项 |
| `activeColor` / `fillColor` | 选中颜色 |
| `RadioListTile` 的 `title` / `subtitle` / `secondary` / `controlAffinity` | 整行布局槽位 |
| `groupDirection`（ListTile 版） | 圆点放左（leading）还是右（trailing） |

## 易错点

::: danger 泛型类型必须一致
`RadioGroup<T>` 的泛型、`groupValue` 和子项 `Radio<T>` / `RadioListTile<T>` 的 `value` 必须是同一类型，混用 String/int 编译就报错。
:::

::: warning 不 setState 永远选不中
和 Checkbox 一样是受控组件，`RadioGroup.onChanged` 里必须 setState 更新 groupValue。
:::

::: tip 直接用 RadioGroup
`Radio` / `RadioListTile` 单项上的 `groupValue` / `onChanged` 已废弃（Flutter 3.32+），统一改用祖先 `RadioGroup`；禁用单项用 `enabled: false` 而不是 `onChanged: null`。
:::
