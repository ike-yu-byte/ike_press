---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/circleavatar' # Flutter Web preview URL for this page
---

# CircleAvatar

> 🟢 Stateless widget · `StatelessWidget`

`CircleAvatar` draws a circular placeholder, typically a user avatar: photo, icon or initials.

## Image avatar

```dart
import 'package:flutter/material.dart';

/// Example: circleavatar-image —— network avatar
class CircleAvatarImageDemo extends StatelessWidget {
  const CircleAvatarImageDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircleAvatar(
        radius: 36,
        backgroundImage: NetworkImage('https://picsum.photos/200/200'),
      ),
    );
  }
}
```

## Icon fallback

Use an icon when there is no picture.

```dart
import 'package:flutter/material.dart';

/// Example: circleavatar-icon —— icon avatar
class CircleAvatarIconDemo extends StatelessWidget {
  const CircleAvatarIconDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: CircleAvatar(
        radius: 36,
        backgroundColor: Colors.blue.shade100,
        child: const Icon(Icons.person, color: Colors.blue, size: 40),
      ),
    );
  }
}
```

## Initial letter

```dart
import 'package:flutter/material.dart';

/// Example: circleavatar-letter —— initials avatar
class CircleAvatarLetterDemo extends StatelessWidget {
  const CircleAvatarLetterDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircleAvatar(
        radius: 36,
        backgroundColor: Colors.orange,
        child: Text('Z', style: TextStyle(color: Colors.white, fontSize: 32)),
      ),
    );
  }
}
```

## Inside a list item

Combine with `ListTile.leading` for user lists.

```dart
import 'package:flutter/material.dart';

/// Example: circleavatar-listtile —— user list row
class CircleAvatarListTileDemo extends StatelessWidget {
  const CircleAvatarListTileDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: ListTile(
          leading: const CircleAvatar(
            backgroundImage: NetworkImage('https://picsum.photos/200/200'),
          ),
          title: const Text('John Doe'),
          subtitle: const Text('Online'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {},
        ),
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `backgroundImage` | Background `ImageProvider` |
| `child` | Content such as `Icon` / `Text` |
| `radius` | Radius |
| `backgroundColor` | Base color (visible when the child is not an image) |

::: warning No built-in load-failure fallback
Network avatars can 404. For robustness combine `Container` + `ClipOval` + `Image(errorBuilder:)`, or fall back to initials.
:::
