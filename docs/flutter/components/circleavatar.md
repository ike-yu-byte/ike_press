---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# CircleAvatar 头像

`CircleAvatar` 画一个圆形占位，常显示用户头像：图片、图标或文字首字母。

## 图片头像

```dart
import 'package:flutter/material.dart';

/// 示例: circleavatar-image —— 网络头像
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

## 图标兜底

无图时用图标占位。

```dart
import 'package:flutter/material.dart';

/// 示例: circleavatar-icon —— 图标头像
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

## 文字首字母

```dart
import 'package:flutter/material.dart';

/// 示例: circleavatar-letter —— 首字母头像
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

## 列表项中

配合 `ListTile.leading` 做用户列表。

```dart
import 'package:flutter/material.dart';

/// 示例: circleavatar-listtile —— 用户列表项
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
          title: const Text('张三'),
          subtitle: const Text('在线'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {},
        ),
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `backgroundImage` | 背景图片 `ImageProvider` |
| `child` | 放 `Icon` / `Text` 等内容 |
| `radius` | 半径 |
| `backgroundColor` | 底色（child 非图片时可见） |

::: warning 无内置加载失败占位
网络头像可能 404，稳妥做法用 `Container` + `ClipOval` + `Image(errorBuilder:)` 组合，或文字兜底。
:::
