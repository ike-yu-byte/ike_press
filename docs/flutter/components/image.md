---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Image 图片

> 🔵 有状态组件 · `StatefulWidget`

`Image` 支持从资源、网络、文件、内存加载，用不同构造函数区分来源。

## 网络图片 + 填充

`fit: BoxFit.cover` 等比裁剪填满。

```dart
import 'package:flutter/material.dart';

/// 示例: image-network —— 网络图 cover 填充
class ImageNetworkDemo extends StatelessWidget {
  const ImageNetworkDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Image.network(
        'https://picsum.photos/400/300',
        width: 240,
        height: 160,
        fit: BoxFit.cover,
      ),
    );
  }
}
```

## 加载与错误占位

`loadingBuilder` 显示进度、`errorBuilder` 兜底失败。

```dart
import 'package:flutter/material.dart';

/// 示例: image-placeholder —— 加载中/失败占位
class ImagePlaceholderDemo extends StatelessWidget {
  const ImagePlaceholderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Image.network(
        'https://picsum.photos/400/300',
        width: 240,
        height: 160,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, progress) {
          if (progress == null) return child;
          return const Center(child: CircularProgressIndicator());
        },
        errorBuilder: (context, error, stack) =>
            const Icon(Icons.broken_image, size: 48),
      ),
    );
  }
}
```

## 圆角图片

`Image` 自身无圆角，靠外层 `ClipRRect` 裁剪。

```dart
import 'package:flutter/material.dart';

/// 示例: image-rounded —— ClipRRect 裁圆角
class ImageRoundedDemo extends StatelessWidget {
  const ImageRoundedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Image.network(
          'https://picsum.photos/300/300',
          width: 160,
          height: 160,
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
```

## 资源图片

`Image.asset` 读取 `pubspec.yaml` 声明的 assets，多倍图放 `2.0x/`、`3.0x/` 子目录自动选。

```dart
import 'package:flutter/material.dart';

/// 示例: image-asset —— 读取打包资源
class ImageAssetDemo extends StatelessWidget {
  const ImageAssetDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Image.asset('assets/images/logo.png', width: 120),
    );
  }
}
```

## API

| 构造函数 | 来源 |
| --- | --- |
| `Image.asset` | 打包资源 |
| `Image.network` | 网络 |
| `Image.file` | 本地文件 |
| `Image.memory` | 内存字节 |

| 属性 | 说明 |
| --- | --- |
| `fit` | `BoxFit`：cover / contain / fill / fitWidth / fitHeight / none |
| `alignment` | cover 裁剪时保留哪一部分 |
| `width` / `height` | 显式尺寸 |
| `loadingBuilder` / `errorBuilder` | 加载/错误占位 |

::: tip 列表大量网络图用 cached_network_image
裸 `Image.network` 不落盘缓存，列表场景请用三方包 `cached_network_image`。
:::
