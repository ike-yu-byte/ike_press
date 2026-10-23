---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Form

`Form` aggregates a group of `TextFormField` inputs into one unit for unified validation and reset. Validation logic lives in each field's `validator`.

## Login form (full validation flow)

`GlobalKey<FormState>` -> `validate()` -> submit.

```dart
import 'package:flutter/material.dart';

/// Example: form-login —— email + password two-field validation
class FormLoginDemo extends StatefulWidget {
  const FormLoginDemo({super.key});

  @override
  State<FormLoginDemo> createState() => _FormLoginDemoState();
}

class _FormLoginDemoState extends State<FormLoginDemo> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _pwdController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _pwdController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      // only reached when every field passes
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Submitted')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                validator: (value) {
                  if (value == null || value.isEmpty) return 'Enter your email';
                  if (!value.contains('@')) return 'Invalid email format';
                  return null; // null means pass
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _pwdController,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.length < 6) ? 'At least 6 characters' : null,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: _submit, child: const Text('Log in')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Live validation with autovalidateMode

By default validation only runs on button press; `autovalidateMode` validates while typing.

```dart
import 'package:flutter/material.dart';

/// Example: form-autovalidate —— errors appear while typing
class FormAutoValidateDemo extends StatefulWidget {
  const FormAutoValidateDemo({super.key});

  @override
  State<FormAutoValidateDemo> createState() => _FormAutoValidateDemoState();
}

class _FormAutoValidateDemoState extends State<FormAutoValidateDemo> {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          autovalidateMode: AutovalidateMode.onUserInteraction, // only after interaction, so the form isn't red on entry
          child: TextFormField(
            decoration: const InputDecoration(
              labelText: 'Nickname (2-10 chars)',
              border: OutlineInputBorder(),
            ),
            validator: (v) {
              if (v == null || v.trim().length < 2 || v.trim().length > 10) {
                return 'Length must be 2-10 characters';
              }
              return null;
            },
          ),
        ),
      ),
    );
  }
}
```

## Unified reset and save

`reset()` clears the whole form in one shot; individual fields run `save()` into onSaved.

```dart
import 'package:flutter/material.dart';

/// Example: form-reset —— one-click reset after editing
class FormResetDemo extends StatefulWidget {
  const FormResetDemo({super.key});

  @override
  State<FormResetDemo> createState() => _FormResetDemoState();
}

class _FormResetDemoState extends State<FormResetDemo> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                initialValue: 'Default value',
                decoration: const InputDecoration(labelText: 'Content', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _formKey.currentState!.reset(), // restores each field's initialValue
                      child: const Text('Reset'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Core API reference

| API | Description |
| --- | --- |
| `Form(key: _formKey)` | Get the `FormState` via a GlobalKey |
| `_formKey.currentState!.validate()` | Runs all validators; returns false if any fails |
| `.reset()` / `.save()` | Reset the form / run all onSaved callbacks |
| `autovalidateMode` | `disabled` / `always` / `onUserInteraction` |
| `TextFormField(validator:, onSaved:)` | Per-field validation / save callback |

## Pitfalls

::: danger validator returns a String, don't throw
Returning an error message (String) shows the error; returning null passes. Never throw inside a validator.
:::

::: warning The Form must be mounted before validate()
_formKey.currentState is null before the Form renders -- be careful with `!` force-unwrapping and timing.
:::

::: info Read data via controller or onSaved
After validation passes, read values via `controller.text` (recommended), or store into your model in each field's `onSaved` and collect them all with `save()`.
:::
