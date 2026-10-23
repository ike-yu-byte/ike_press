---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# DatePicker 日期选择器

> 🔵 有状态组件 · `StatefulWidget`

Flutter 的日期选择不是一个 widget，而是通过 `showDatePicker` 弹出一个对话框。时间用 `showTimePicker`。

## 选择日期

```dart
import 'package:flutter/material.dart';

/// 示例: datepicker-basic —— 点按钮弹日历选日期
class DatePickerBasicDemo extends StatefulWidget {
  const DatePickerBasicDemo({super.key});

  @override
  State<DatePickerBasicDemo> createState() => _DatePickerBasicDemoState();
}

class _DatePickerBasicDemoState extends State<DatePickerBasicDemo> {
  DateTime? _date;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: DateTime(2000), // 可选最早
      lastDate: DateTime(2100),  // 可选最晚
    );
    if (picked != null) setState(() => _date = picked); // 取消返回 null
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_date == null ? '尚未选择日期' : '已选：${_date!.toLocal()}'.split('.')[0]),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today),
            label: const Text('选择日期'),
          ),
        ],
      ),
    );
  }
}
```

## 选择时间

```dart
import 'package:flutter/material.dart';

/// 示例: datepicker-time —— TimePicker 24/12 小时制
class TimePickerDemo extends StatefulWidget {
  const TimePickerDemo({super.key});

  @override
  State<TimePickerDemo> createState() => _TimePickerDemoState();
}

class _TimePickerDemoState extends State<TimePickerDemo> {
  TimeOfDay? _time;

  Future<void> _pickTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime: _time ?? TimeOfDay.now(),
      helpText: '选择提醒时间',
    );
    if (picked != null) setState(() => _time = picked);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_time == null ? '尚未选择时间' : '已选：$_time'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickTime,
            icon: const Icon(Icons.access_time),
            label: const Text('选择时间'),
          ),
        ],
      ),
    );
  }
}
```

## 限制可选范围与高亮日

`selectableDayPredicate` 精确控制哪些天可点（如只能选未来 7 天）。

```dart
import 'package:flutter/material.dart';

/// 示例: datepicker-restrict —— 只允许选今天起 7 天内
class DatePickerRestrictDemo extends StatefulWidget {
  const DatePickerRestrictDemo({super.key});

  @override
  State<DatePickerRestrictDemo> createState() => _DatePickerRestrictDemoState();
}

class _DatePickerRestrictDemoState extends State<DatePickerRestrictDemo> {
  DateTime? _date;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final last = now.add(const Duration(days: 7));
    final picked = await showDatePicker(
      context: context,
      initialDate: _date ?? now,
      firstDate: now,
      lastDate: last,
      selectableDayPredicate: (day) {
        // 再排除周末
        return day.weekday != DateTime.saturday && day.weekday != DateTime.sunday;
      },
    );
    if (picked != null) setState(() => _date = picked);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_date == null ? '只能选 7 天内的非周末' : '已选：${_date!.toLocal()}'.split('.')[0]),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: _pickDate,
            icon: const Icon(Icons.event),
            label: const Text('预约日期'),
          ),
        ],
      ),
    );
  }
}
```

## 中文化与外观

`MaterialApp` 配 `localizationsDelegates` + `locale: Locale('zh')` 即汉化日历；外观走 `showDatePicker` 的 `builder` 钩子或主题。

```dart
import 'package:flutter/material.dart';

/// 示例: datepicker-styled —— 定制确认/取消按钮文案
Future<DateTime?> _pickWithCustomButtons(BuildContext context) {
  return showDatePicker(
    context: context,
    initialDate: DateTime.now(),
    firstDate: DateTime(2000),
    lastDate: DateTime(2100),
    cancelText: '关闭',
    confirmText: '就这天',
    errorFormatText: '日期格式不对',
  );
}
```

> 完整汉化需在 `main.dart` 配 `flutter_localizations` 的 `GlobalMaterialLocalizations.delegate` 与 `locale: Locale('zh')`，否则日历是英文。

## API 速查

| 参数 | 说明 |
| --- | --- |
| `initialDate` / `firstDate` / `lastDate` | 初始 / 范围边界（必填） |
| `selectableDayPredicate` | 精确到"哪天可点" |
| `helpText` / `cancelText` / `confirmText` | 文案 |
| `builder` | 包一层主题改写外观 |
| `showTimePicker(initialTime:)` | 时间版，返回 `TimeOfDay` |

## 易错点

::: danger 必须 await 且判空
用户点取消返回 null，直接 `.year` 取值会空崩溃。
:::

::: warning initialDate 必须落在 first~last 之间
否则 debug 模式断言失败，回填历史日期时先 clamp。
:::

::: info 日期区间用 showDateRangePicker
"入住-离店"这类场景有现成的 `showDateRangePicker`，返回 `DateTimeRange?`，不要自己弹两次拼逻辑。
:::
