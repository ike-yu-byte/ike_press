---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Image

`Image` loads from assets, the network, files or memory -- the constructor picks the source.

## Network image + fill

`fit: BoxFit.cover` scales proportionally and crops to fill.

```dart
/// Example: image-network —— network image with cover fill
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

## Loading and error placeholders

`loadingBuilder` shows progress, `errorBuilder` provides a fallback.

```dart
/// Example: image-placeholder —— loading / failed placeholders
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

## Rounded corners

`Image` itself has no radius -- clip with an outer `ClipRRect`.

```dart
/// Example: image-rounded —— ClipRRect rounded corners
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

## Asset images

`Image.asset` reads assets declared in `pubspec.yaml`; put density variants under `2.0x/`, `3.0x/` subfolders and Flutter picks automatically.

```dart
/// Example: image-asset —— bundled resource image
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

| Constructor | Source |
| --- | --- |
| `Image.asset` | Bundled asset |
| `Image.network` | Network |
| `Image.file` | Local file |
| `Image.memory` | In-memory bytes |

| Property | Description |
| --- | --- |
| `fit` | `BoxFit`: cover / contain / fill / fitWidth / fitHeight / none |
| `alignment` | Which part to keep when cover crops |
| `width` / `height` | Explicit size |
| `loadingBuilder` / `errorBuilder` | Loading/error placeholders |

::: tip Use cached_network_image for network image lists
Plain `Image.network` has no on-disk cache; in list scenarios use the third-party `cached_network_image`.
:::
