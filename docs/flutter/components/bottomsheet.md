---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# BottomSheet 底部弹窗

> 🟢 无状态组件 · `StatelessWidget`

底部弹窗从屏幕底部升起，适合放"分享渠道""筛选条件""操作列表"等中等复杂度内容，比对话框更贴合拇指操作区。

## 模态底部弹窗（最常用）

```dart
import 'package:flutter/material.dart';

/// 示例: bottomsheet-modal —— 分享渠道列表
class BottomSheetModalDemo extends StatelessWidget {
  const BottomSheetModalDemo({super.key});

  Future<void> _showShare(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      showDragHandle: true, // 顶部拖拽小横条（M3）
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('分享到', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            for (final channel in const ['微信好友', '朋友圈', '复制链接', '更多'])
              ListTile(
                leading: const Icon(Icons.share),
                title: Text(channel),
                onTap: () => Navigator.pop(context), // 选中即收起
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.icon(
        onPressed: () => _showShare(context),
        icon: const Icon(Icons.ios_share),
        label: const Text('弹出分享面板'),
      ),
    );
  }
}
```

## 高内容可滚动

内容超过半屏时 `isScrollControlled: true` + 自限最大高。

```dart
import 'package:flutter/material.dart';

/// 示例: bottomsheet-scrollable —— 长列表筛选面板
class BottomSheetScrollableDemo extends StatelessWidget {
  const BottomSheetScrollableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.tonalIcon(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true, // 允许超过默认 9/16 高度
          showDragHandle: true,
          builder: (context) => DraggableScrollableSheet(
            initialChildSize: 0.6, // 初始占 60% 屏高
            maxChildSize: 0.9,
            minChildSize: 0.4,
            expand: false,
            builder: (context, scrollController) => Column(
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('价格区间', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                Expanded(
                  child: ListView.builder(
                    controller: scrollController, // 关键：把滚动交给 sheet
                    itemCount: 30,
                    itemBuilder: (context, i) => ListTile(title: Text('筛选项 $i')),
                  ),
                ),
              ],
            ),
          ),
        ),
        icon: const Icon(Icons.filter_alt),
        label: const Text('打开筛选（可拖高）'),
      ),
    );
  }
}
```

## 持久底部面板（非模态）

`persistentBottomSheet` 不遮全屏、可常驻，配合 `BottomSheet` widget 手动管理。

```dart
import 'package:flutter/material.dart';

/// 示例: bottomsheet-persistent —— 地图式常驻面板（简化示意）
class PersistentSheetDemo extends StatefulWidget {
  const PersistentSheetDemo({super.key});

  @override
  State<PersistentSheetDemo> createState() => _PersistentSheetDemoState();
}

class _PersistentSheetDemoState extends State<PersistentSheetDemo> {
  PersistentBottomSheetController? _controller;

  void _openPersistent(BuildContext context) {
    _controller?.close();
    _controller = showBottomSheet(
      context: context, // 注意不是 showModalBottomSheet
      builder: (context) => const Padding(
        padding: EdgeInsets.all(24),
        child: Text('非模态面板：点其他地方不会自动关，需代码 close'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          FilledButton(onPressed: () => _openPersistent(context), child: const Text('打开常驻面板')),
          const SizedBox(width: 12),
          OutlinedButton(onPressed: () => _controller?.close(), child: const Text('关闭')),
        ],
      ),
    );
  }
}
```

## 属性速查

| 参数（showModalBottomSheet） | 说明 |
| --- | --- |
| `builder` | 必填，返回面板内容 |
| `isScrollControlled` | true 允许超半屏，配 DraggableScrollableSheet |
| `showDragHandle` | 顶部拖拽条（M3） |
| `enableDrag` | 是否可下拉关闭（默认 true） |
| `backgroundColor` / `surfaceTintColor` | 面板背景 |
| `shape` | 顶部圆角等（默认 M3 已圆角） |
| `constraints` | 固定最小/最大高 |
| `useSafeArea` | 避开系统导航区 |

## 易错点

::: danger builder 的 context 才是弹层的
`onTap: () => Navigator.pop(context)` 必须用 builder 给的 context，闭包捕获外层 context 关不掉弹层。
:::

::: warning isScrollControlled 忘配滚动组件
设了 true 但没有 ListView/DraggableScrollableSheet 时，超高内容直接溢出报错。
:::

::: info 键盘顶不起面板
输入框类底部面板要自己处理：外层包 `Padding(bottom: MediaQuery.viewInsetsOf(context).bottom)` 才不会被键盘盖住。
:::
