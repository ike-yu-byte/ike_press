---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# SnackBar 消息条

> 🟢 无状态组件 · `StatelessWidget`

`SnackBar` 是从屏幕底部短暂弹出的轻提示（"已保存""发送失败"），不打断操作，几秒后自动消失，可带一个"撤销"动作。

## 基本提示

```dart
import 'package:flutter/material.dart';

/// 示例: snackbar-basic —— 操作成功轻提示
class SnackBarBasicDemo extends StatelessWidget {
  const SnackBarBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('已保存到相册'),
              duration: Duration(seconds: 2),
            ),
          );
        },
        child: const Text('保存图片'),
      ),
    );
  }
}
```

## 带撤销动作

`SnackBarAction` 提供单个按钮，点击即回调。

```dart
import 'package:flutter/material.dart';

/// 示例: snackbar-undo —— 删除 + 撤销
class SnackBarUndoDemo extends StatefulWidget {
  const SnackBarUndoDemo({super.key});

  @override
  State<SnackBarUndoDemo> createState() => _SnackBarUndoDemoState();
}

class _SnackBarUndoDemoState extends State<SnackBarUndoDemo> {
  final items = ['条目 A', '条目 B', '条目 C'];

  void _remove(int index) {
    final removed = items.removeAt(index);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('已删除「$removed」'),
        action: SnackBarAction(
          label: '撤销',
          onPressed: () => setState(() => items.insert(index, removed)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < items.length; i++)
              ListTile(
                title: Text(items[i]),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _remove(i),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 样式与位置

样式上：`behavior: floating` 浮起留边、`backgroundColor` 语义色区分成功/失败（都在底部）。位置上：`SnackBar` 由 `ScaffoldMessenger` 固定贴底，`floating` 也只是留边，**挪不到顶部或中间**；想要不同位置得换机制：

- **底部**：`SnackBar`（原生位置，含 fixed / floating / 语义色三种样式）
- **顶部**：`MaterialBanner`（`showMaterialBanner`，贴顶）
- **居中**：两者都做不到，用 `Overlay` / `Stack` 自绘 toast

```dart
import 'dart:async';
import 'package:flutter/material.dart';

/// 示例: snackbar-styles —— 三种样式 + 顶部/居中两种位置
class SnackBarStylesDemo extends StatefulWidget {
  const SnackBarStylesDemo({super.key});

  @override
  State<SnackBarStylesDemo> createState() => _SnackBarStylesDemoState();
}

class _SnackBarStylesDemoState extends State<SnackBarStylesDemo> {
  bool _showCenter = false;
  Timer? _timer;

  void _showCenterToast() {
    _timer?.cancel();
    setState(() => _showCenter = true);
    _timer = Timer(const Duration(milliseconds: 1600), () {
      if (mounted) setState(() => _showCenter = false);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // 局部 ScaffoldMessenger + Scaffold：让提示落在容器内而非整屏底部
    return ScaffoldMessenger(
      child: Scaffold(
        body: Builder(
          builder: (context) {
            final messenger = ScaffoldMessenger.of(context);
            return Stack(
              children: [
                Align(
                  alignment: Alignment.topCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // —— 样式（都贴底）——
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Text('贴底常规样式'),
                                backgroundColor: Colors.teal,
                              ));
                          },
                          child: const Text('底部贴边'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Text('floating 会浮起留边'),
                                behavior: SnackBarBehavior.floating,
                                margin: EdgeInsets.all(16),
                              ));
                          },
                          child: const Text('浮动样式'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Row(children: [Icon(Icons.error, color: Colors.white), SizedBox(width: 8), Text('操作失败')]),
                                backgroundColor: Colors.redAccent,
                                behavior: SnackBarBehavior.floating,
                              ));
                          },
                          child: const Text('错误红色'),
                        ),
                        const SizedBox(height: 8),
                        // —— 位置（顶部 / 居中）——
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearMaterialBanners()
                              ..showMaterialBanner(MaterialBanner(
                                content: const Text('要顶部提示请用 MaterialBanner'),
                                leading: const Icon(Icons.info, color: Colors.blue),
                                actions: [
                                  TextButton(
                                    onPressed: () => messenger.clearMaterialBanners(),
                                    child: const Text('关闭'),
                                  ),
                                ],
                              ));
                          },
                          child: const Text('顶部 · MaterialBanner'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: _showCenterToast,
                          child: const Text('居中 · 自定义 Toast'),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_showCenter)
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle, color: Colors.white, size: 20),
                          SizedBox(width: 8),
                          Text('居中自定义提示', style: TextStyle(color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
```

::: tip 样式怎么调
`backgroundColor` 表达语义色（成功绿 / 失败红），`behavior: floating` + `margin`/`width` 控制留边与宽度——这些只改外观，不改“贴底”这一事实。
:::

## 替换当前消息

默认多条消息排队显示；`clearSnackBars()` 先清再弹，保证只看到最新一条。

```dart
import 'package:flutter/material.dart';

/// 示例: snackbar-replace —— 清掉旧消息再弹新的
void _showFresh(BuildContext context) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.clearSnackBars(); // 连续操作时避免排长队
  messenger.showSnackBar(const SnackBar(content: Text('最新消息')));
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `content` | 主体文案（必填，可放 Row 加图标） |
| `duration` | 展示时长，默认 4s |
| `action` | `SnackBarAction(label:, onPressed:)` 单按钮 |
| `backgroundColor` / `elevation` | 背景 / 阴影 |
| `behavior` | `fixed` 贴底 / `floating` 浮起（仅影响外观，不改“贴底”） |
| 弹出位置 | SnackBar 恒为底部；顶部用 `MaterialBanner`，居中用 `Overlay` 自绘 |
| `margin` / `width` | floating 时的外边距 / 固定宽 |
| `snackBarAnimationStyle` | 自定义进出场动画 |

## 易错点

::: danger 用 ScaffoldMessenger 不是 Scaffold
弹 SnackBar 要通过 `ScaffoldMessenger.of(context)`（不是 `Scaffold.of`）。`MaterialApp` 已自动提供根 `ScaffoldMessenger`，一般无需自己包。
:::

::: warning 点 SnackBar 默认即关闭
用户点一下就收起；撤销类关键操作别只靠 SnackBar，重要状态要能在界面里找回。
:::

::: info duration 不能太短
低于 `kFloatingSnackBarDuration` 的动画时间时会被拉到最低值；也别设 0，会立刻消失。
:::
