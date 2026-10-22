---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Dismissible 滑动删除

`Dismissible` 让子组件可以**向某个方向滑走**，滑出后触发回调（通常是从列表里删除）。邮件、待办列表左滑删除就是它。

## 基本滑动删除

右滑删除一项，露出红色背景 + 删除图标。

```dart
/// 示例: dismissible-basic —— 右滑删除
class DismissibleBasicDemo extends StatefulWidget {
  const DismissibleBasicDemo({super.key});

  @override
  State<DismissibleBasicDemo> createState() => _DismissibleBasicDemoState();
}

class _DismissibleBasicDemoState extends State<DismissibleBasicDemo> {
  final items = ['邮件一', '邮件二', '邮件三', '邮件四'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item), // 必填且唯一！
                direction: DismissDirection.endToStart, // 右滑（从右往左）
                background: Container(
                  color: Colors.red,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.delete, color: Colors.white),
                ),
                onDismissed: (dir) {
                  setState(() => items.remove(item)); // 真正移除数据
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('已删除「$item」')),
                  );
                },
                child: ListTile(
                  title: Text(item),
                  tileColor: Colors.grey.shade100,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 双向滑动、不同背景

左滑归档、右滑删除，按方向显示不同背景和处理。

```dart
/// 示例: dismissible-twoway —— 左右滑不同操作
class DismissibleTwoWayDemo extends StatefulWidget {
  const DismissibleTwoWayDemo({super.key});

  @override
  State<DismissibleTwoWayDemo> createState() => _DismissibleTwoWayDemoState();
}

class _DismissibleTwoWayDemoState extends State<DismissibleTwoWayDemo> {
  final items = ['任务 A', '任务 B', '任务 C'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item),
                // 左滑显示绿色"归档"，右滑显示红色"删除"
                secondaryBackground: Container(
                  color: Colors.red,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.delete_forever, color: Colors.white),
                ),
                background: Container(
                  color: Colors.green,
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.only(left: 24),
                  child: const Icon(Icons.archive, color: Colors.white),
                ),
                onDismissed: (dir) {
                  final msg = dir == DismissDirection.startToEnd ? '已归档' : '已删除';
                  setState(() => items.remove(item));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$msg：$item')),
                  );
                },
                child: ListTile(title: Text(item), tileColor: Colors.grey.shade100),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 确认后再删（confirmDismiss）

滑开不等于删除——在 `confirmDismiss` 里弹框，用户确认才返回 true。

```dart
/// 示例: dismissible-confirm —— 滑开后二次确认
class DismissibleConfirmDemo extends StatefulWidget {
  const DismissibleConfirmDemo({super.key});

  @override
  State<DismissibleConfirmDemo> createState() => _DismissibleConfirmDemoState();
}

class _DismissibleConfirmDemoState extends State<DismissibleConfirmDemo> {
  final items = ['重要文件 1', '重要文件 2'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item),
                background: Container(
                  color: Colors.orange,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.warning, color: Colors.white),
                ),
                confirmDismiss: (dir) async {
                  // 弹确认框，返回 false 则自动弹回
                  return await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('确认删除？'),
                          content: Text('「$item」删除后不可恢复'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('取消')),
                            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('删除')),
                          ],
                        ),
                      ) ??
                      false;
                },
                onDismissed: (_) => setState(() => items.remove(item)),
                child: ListTile(title: Text(item), tileColor: Colors.grey.shade100),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `key` | **必填且全局唯一**，通常用数据 id |
| `direction` | 允许的滑动方向，默认 `horizontal`（双向） |
| `background` | startToEnd（左滑）时露出的背景 |
| `secondaryBackground` | endToStart（右滑）时露出的背景 |
| `confirmDismiss` | 滑开后返回 true 才真正 dismiss（可做二次确认） |
| `onDismissed` | 滑走完成后回调（在这里删数据） |
| `movementDuration` | 未确认时弹回动画时长 |

## 易错点

::: danger key 必须唯一且稳定
`Duplicate GlobalKey` 断言错误几乎都源于此：列表项 key 用了 index（删除后重复）或写死常量。用数据本身的 id。
:::

::: danger onDismissed 里必须删数据
widget 滑走消失但数据源还在，下一帧 setState 会重建出同样的项，看起来"删不掉"。
:::

::: warning 撤销需要暂存
滑走即删除，想"撤销"需在 onDismissed 里暂存原索引，SnackBarAction 时插回。
:::
