---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# DatePicker

Flutter's date picker is not a widget -- you call `showDatePicker` which pops a dialog. Time uses `showTimePicker`.

## Picking a date

```dart
/// Example: datepicker-basic —— button opens the calendar dialog
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
      firstDate: DateTime(2000), // earliest selectable
      lastDate: DateTime(2100),  // latest selectable
    );
    if (picked != null) setState(() => _date = picked); // cancel returns null
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_date == null ? 'No date picked yet' : 'Picked: ${_date!.toLocal()}'.split('.')[0]),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: _pickDate,
            icon: const Icon(Icons.calendar_today),
            label: const Text('Pick date'),
          ),
        ],
      ),
    );
  }
}
```

## Picking a time

```dart
/// Example: datepicker-time —— TimePicker in 24/12-hour form
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
      helpText: 'Choose reminder time',
    );
    if (picked != null) setState(() => _time = picked);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_time == null ? 'No time picked yet' : 'Picked: $_time'),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: _pickTime,
            icon: const Icon(Icons.access_time),
            label: const Text('Pick time'),
          ),
        ],
      ),
    );
  }
}
```

## Restricting the range and selectable days

`selectableDayPredicate` controls exactly which days are tappable (e.g. only the next 7 days).

```dart
/// Example: datepicker-restrict —— only within 7 days from today, weekdays only
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
        // additionally exclude weekends
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
          Text(_date == null ? 'Only weekdays within 7 days' : 'Picked: ${_date!.toLocal()}'.split('.')[0]),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: _pickDate,
            icon: const Icon(Icons.event),
            label: const Text('Book a date'),
          ),
        ],
      ),
    );
  }
}
```

## Localization and looks

Configure `localizationsDelegates` + `locale` on `MaterialApp` to localize the calendar; tweak appearance via `showDatePicker`'s `builder` hook or the theme.

```dart
/// Example: datepicker-styled —— custom confirm/cancel button text
Future<DateTime?> _pickWithCustomButtons(BuildContext context) {
  return showDatePicker(
    context: context,
    initialDate: DateTime.now(),
    firstDate: DateTime(2000),
    lastDate: DateTime(2100),
    cancelText: 'Close',
    confirmText: 'That day',
    errorFormatText: 'Wrong date format',
  );
}
```

> Full localization requires `flutter_localizations`' `GlobalMaterialLocalizations.delegate` plus a matching `locale` in `main.dart`, otherwise the calendar stays in English.

## API reference

| Parameter | Description |
| --- | --- |
| `initialDate` / `firstDate` / `lastDate` | Initial value / range bounds (required) |
| `selectableDayPredicate` | Fine-grained "which day is tappable" |
| `helpText` / `cancelText` / `confirmText` | Copy text |
| `builder` | Wrap in a theme to restyle the dialog |
| `showTimePicker(initialTime:)` | Time version, returns `TimeOfDay` |

## Pitfalls

::: danger Always await and null-check
Cancelling returns null; dereferencing `.year` straight away crashes on null.
:::

::: warning initialDate must lie between firstDate and lastDate
Otherwise the debug-mode assertion fails -- clamp historical dates before feeding them back in.
:::

::: info Date ranges: showDateRangePicker
For "check-in / check-out" scenarios there is a ready-made `showDateRangePicker` returning `DateTimeRange?` -- don't pop two pickers and stitch the logic yourself.
:::
