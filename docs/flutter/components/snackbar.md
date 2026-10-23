---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# SnackBar 消息条

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

`behavior: floating` 浮起不贴底；`backgroundColor` 语义色区分成功/失败。

```dart
import 'package:flutter/material.dart';

/// 示例: snackbar-styles —— 三种外观对比
class SnackBarStylesDemo extends StatelessWidget {
  const SnackBarStylesDemo({super.key});

  @override
  Widget build(BuildContext context) {
    void show(SnackBar bar) => ScaffoldMessenger.of(context).showSnackBar(bar);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Text('贴底常规样式'),
              backgroundColor: Colors.teal,
            )),
            child: const Text('底部贴边'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Text('floating 会浮起留边'),
              behavior: SnackBarBehavior.floating,
              margin: EdgeInsets.all(16),
            )),
            child: const Text('浮动样式'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Row(children: [Icon(Icons.error, color: Colors.white), SizedBox(width: 8), Text('操作失败')]),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
            )),
            child: const Text('错误红色'),
          ),
        ],
      ),
    );
  }
}
```

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
| `behavior` | `fixed` 贴底 / `floating` 浮起 |
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
