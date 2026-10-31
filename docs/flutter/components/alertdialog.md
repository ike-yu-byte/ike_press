---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/alertdialog' # 该页 Flutter Web 预览地址
---

# AlertDialog 对话框

> 🟢 无状态组件 · `StatelessWidget`

对话框用于打断用户、请求确认或展示关键信息。通过 `showDialog` 弹出，内部放 `AlertDialog`。

## 确认对话框

```dart
import 'package:flutter/material.dart';

/// 示例: alert-confirm —— 删除二次确认
class AlertDialogConfirmDemo extends StatefulWidget {
  const AlertDialogConfirmDemo({super.key});

  @override
  State<AlertDialogConfirmDemo> createState() => _AlertDialogConfirmDemoState();
}

class _AlertDialogConfirmDemoState extends State<AlertDialogConfirmDemo> {
  String _status = '待操作';

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('确认删除？'),
        content: const Text('删除后不可恢复。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    setState(() => _status = ok == true ? '已删除' : '已取消');
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_status),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: _confirmDelete,
            icon: const Icon(Icons.delete),
            label: const Text('删除文件'),
          ),
        ],
      ),
    );
  }
}
```

## 带输入框的对话框

对话框里放表单，确认时读取 controller。

```dart
import 'package:flutter/material.dart';

/// 示例: alert-input —— 重命名输入弹窗
class AlertDialogInputDemo extends StatefulWidget {
  const AlertDialogInputDemo({super.key});

  @override
  State<AlertDialogInputDemo> createState() => _AlertDialogInputDemoState();
}

class _AlertDialogInputDemoState extends State<AlertDialogInputDemo> {
  final _controller = TextEditingController(text: '旧文件名');
  String _name = '旧文件名';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _rename() async {
    _controller.text = _name;
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('重命名'),
        content: TextField(controller: _controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('取消')),
          FilledButton(
            onPressed: () => Navigator.pop(context, _controller.text),
            child: const Text('确定'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) setState(() => _name = result);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('当前名称：$_name'),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: _rename, child: const Text('重命名')),
        ],
      ),
    );
  }
}
```

## 列表选择对话框（SimpleDialog）

纯"挑一个"场景用 `SimpleDialog`，选项即按钮。

```dart
import 'package:flutter/material.dart';

/// 示例: alert-simple-dialog —— 打开方式选择
class SimpleDialogDemo extends StatefulWidget {
  const SimpleDialogDemo({super.key});

  @override
  State<SimpleDialogDemo> createState() => _SimpleDialogDemoState();
}

class _SimpleDialogDemoState extends State<SimpleDialogDemo> {
  String _opened = '默认';

  Future<void> _pick() async {
    final app = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Open with'),
        children: [
          for (final app in const ['浏览器', 'PDF 阅读器', '编辑器'])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, app),
              child: Text(app),
            ),
        ],
      ),
    );
    if (app != null) setState(() => _opened = app);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('用「$_opened」打开'),
          const SizedBox(height: 8),
          FilledButton(onPressed: _pick, child: const Text('选择打开方式')),
        ],
      ),
    );
  }
}
```

## 不可取消 & 富样式

```dart
import 'package:flutter/material.dart';

/// 示例: alert-unclosable —— barrierDismissible false + 自定义 icon/形状
class AlertDialogStyledDemo extends StatelessWidget {
  const AlertDialogStyledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () => showDialog(
          context: context,
          barrierDismissible: false, // 点遮罩不关，必须按按钮
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.warning_amber, color: Colors.orange, size: 36),
            title: const Text('需要登录'),
            content: const Text('登录后才能继续操作。'),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            actions: [
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('去登录'),
                ),
              ),
            ],
          ),
        ),
        child: const Text('弹出强制登录框'),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `title` / `content` | 标题 / 正文（content 放任意 widget） |
| `actions` | 底部按钮行；`actionsPadding` 调边距 |
| `icon` | 顶部图标（M3 风格） |
| `shape` / `backgroundColor` / `elevation` | 外观 |
| `showDialog(barrierDismissible:)` | 点外部能否关闭（默认 true） |
| `showDialog(useRootNavigator:)` | 多层 Navigator 时挂哪层 |

## 易错点

::: tip 返回值靠 Navigator.pop(context, value)
`showDialog<T>` 的 Future 结果就是按钮里 `pop(context, value)` 传的 value；不传值关闭（点遮罩）拿到 null，一定要判空。
:::

::: warning 关闭后别直接用旧 context
await 之后弹框那层的 context 已销毁；外层 State 的 context 仍可用，取值操作放外层回调里。
:::

::: danger 别在 build 里直接 showDialog
会无限重复弹窗（热重载时尤其明显）；只在用户交互回调里调用。
:::
