---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# TextField

`TextField` is the core text input widget, styled with an underline/border under Material. Its sibling `TextFormField` is meant for `Form` validation; nearly all properties are identical.

## Basic input + reading the value

Use a `TextEditingController` to read and write the text.

```dart
import 'package:flutter/material.dart';

/// Example: textfield-basic —— labeled field with live echo
class TextFieldBasicDemo extends StatefulWidget {
  const TextFieldBasicDemo({super.key});

  @override
  State<TextFieldBasicDemo> createState() => _TextFieldBasicDemoState();
}

class _TextFieldBasicDemoState extends State<TextFieldBasicDemo> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose(); // controller must be released
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                labelText: 'Username',
                hintText: 'Type something',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}), // re-render the echo below
            ),
            const SizedBox(height: 12),
            Text('Current input: ${_controller.text}'),
          ],
        ),
      ),
    );
  }
}
```

## Password field

`obscureText` masks input; a trailing eye button toggles visibility.

```dart
import 'package:flutter/material.dart';

/// Example: textfield-password —— show/hide password
class TextFieldPasswordDemo extends StatefulWidget {
  const TextFieldPasswordDemo({super.key});

  @override
  State<TextFieldPasswordDemo> createState() => _TextFieldPasswordDemoState();
}

class _TextFieldPasswordDemoState extends State<TextFieldPasswordDemo> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          obscureText: _obscure,
          decoration: InputDecoration(
            labelText: 'Password',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.lock),
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
      ),
    );
  }
}
```

## Keyboard type and length limit

`keyboardType` raises the matching keyboard; `maxLength` caps length and shows a counter.

```dart
import 'package:flutter/material.dart';

/// Example: textfield-keyboard —— phone keyboard, 11 chars max
class TextFieldKeyboardDemo extends StatelessWidget {
  const TextFieldKeyboardDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          keyboardType: TextInputType.phone,
          maxLength: 11,
          decoration: const InputDecoration(
            labelText: 'Mobile number',
            prefixText: '+86 ',
            border: OutlineInputBorder(),
          ),
        ),
      ),
    );
  }
}
```

> To allow digits only: `import 'package:flutter/services.dart';` then set `inputFormatters: [FilteringTextInputFormatter.digitsOnly]`.

## Multiline input

`maxLines: null` grows automatically -- good for remarks/feedback boxes.

```dart
import 'package:flutter/material.dart';

/// Example: textfield-multiline —— auto-growing multiline text
class TextFieldMultilineDemo extends StatelessWidget {
  const TextFieldMultilineDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          maxLines: null,
          decoration: const InputDecoration(
            labelText: 'Remarks',
            alignLabelWithHint: true, // label sits top-left instead of vertically centered
            border: OutlineInputBorder(),
          ),
        ),
      ),
    );
  }
}
```

## Border style comparison

The three mainstream `InputDecoration` looks: underline, outlined, filled.

```dart
import 'package:flutter/material.dart';

/// Example: textfield-decoration —— three decoration styles
class TextFieldDecorationDemo extends StatelessWidget {
  const TextFieldDecorationDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TextField(decoration: InputDecoration(labelText: 'Default underline')),
            const SizedBox(height: 12),
            const TextField(
              decoration: InputDecoration(labelText: 'Outlined', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            const TextField(
              decoration: InputDecoration(
                labelText: 'Filled',
                filled: true,
                fillColor: Colors.grey.shade200,
                border: OutlineInputBorder(borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `controller` | Read/write text, listen for changes |
| `decoration` | `InputDecoration`: label / hint / icons / border / counter |
| `keyboardType` | Keyboard type (text / phone / number / email...) |
| `obscureText` | Password mode |
| `maxLines` / `minLines` | Line count, null = unlimited |
| `maxLength` / `maxlengthEnforced` | Char limit / whether enforced |
| `enabled` | false greys out and blocks input (or use `readOnly`) |
| `onChanged` / `onSubmitted` | Input changed / enter submitted |
| `textCapitalization` / `autofocus` | Capitalization policy / auto focus |

## Pitfalls

::: danger Dispose your controller
Release `TextEditingController` in `State.dispose()` or you leak memory.
:::

::: warning Read controller.text
The value lives in `controller.text`; printing the controller itself gives the object description.
:::

::: warning Inside a Form use TextFormField
`TextField` has no `validator` property -- form validation scenarios must use `TextFormField` (properties nearly identical).
:::
