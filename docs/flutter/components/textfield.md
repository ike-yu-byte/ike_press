---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# TextField 输入框

> 🔵 有状态组件 · `StatefulWidget`

`TextField` 是文本输入的核心组件，Material 下带下划线/边框样式。它的"兄弟" `TextFormField` 用于放进 `Form` 做校验，绝大多数属性一致。

## 基础输入 + 读取值

用 `TextEditingController` 读写文本。

```dart
import 'package:flutter/material.dart';

/// 示例: textfield-basic —— 带标签的输入框并实时显示内容
class TextFieldBasicDemo extends StatefulWidget {
  const TextFieldBasicDemo({super.key});

  @override
  State<TextFieldBasicDemo> createState() => _TextFieldBasicDemoState();
}

class _TextFieldBasicDemoState extends State<TextFieldBasicDemo> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose(); // controller 必须释放
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: _controller,
              decoration: const InputDecoration(
                labelText: '用户名',
                hintText: '请输入',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}), // 输入即刷新下方回显
            ),
            const SizedBox(height: 12),
            Text('当前输入：${_controller.text}'),
          ],
        ),
      ),
    );
  }
}
```

## 密码框

`obscureText` 遮蔽输入，右侧眼睛按钮切换明文。

```dart
import 'package:flutter/material.dart';

/// 示例: textfield-password —— 显隐切换密码框
class TextFieldPasswordDemo extends StatefulWidget {
  const TextFieldPasswordDemo({super.key});

  @override
  State<TextFieldPasswordDemo> createState() => _TextFieldPasswordDemoState();
}

class _TextFieldPasswordDemoState extends State<TextFieldPasswordDemo> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          obscureText: _obscure,
          decoration: InputDecoration(
            labelText: '密码',
            border: const OutlineInputBorder(),
            prefixIcon: const Icon(Icons.lock),
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
        ),
      ),
    );
  }
}
```

## 键盘类型与长度限制

`keyboardType` 弹对应键盘，`maxLength` 限字数并显示计数器。

```dart
import 'package:flutter/material.dart';

/// 示例: textfield-keyboard —— 手机号键盘 + 限 11 位
class TextFieldKeyboardDemo extends StatelessWidget {
  const TextFieldKeyboardDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          keyboardType: TextInputType.phone,
          maxLength: 11,
          decoration: const InputDecoration(
            labelText: '手机号',
            prefixText: '+86 ',
            border: OutlineInputBorder(),
          ),
        ),
      ),
    );
  }
}
```

> 只允许数字需 `import 'package:flutter/services.dart';` 后设 `inputFormatters: [FilteringTextInputFormatter.digitsOnly]`。

## 多行输入

`maxLines: null` 自动增高，做备注/留言框。

```dart
import 'package:flutter/material.dart';

/// 示例: textfield-multiline —— 自适应高度的多行文本
class TextFieldMultilineDemo extends StatelessWidget {
  const TextFieldMultilineDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: TextField(
          maxLines: null,
          decoration: const InputDecoration(
            labelText: '备注',
            alignLabelWithHint: true, // 标签贴左上而不是垂直居中
            border: OutlineInputBorder(),
          ),
        ),
      ),
    );
  }
}
```

## 边框风格对比

`InputDecoration` 的下划线、填充、描边三种主流风格。

```dart
import 'package:flutter/material.dart';

/// 示例: textfield-decoration —— 三种装饰风格
class TextFieldDecorationDemo extends StatelessWidget {
  const TextFieldDecorationDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TextField(decoration: InputDecoration(labelText: '默认下划线')),
            const SizedBox(height: 12),
            const TextField(
              decoration: InputDecoration(labelText: '描边', border: OutlineInputBorder()),
            ),
            const SizedBox(height: 12),
            const TextField(
              decoration: InputDecoration(
                labelText: '填充',
                filled: true,
                fillColor: Colors.grey.shade200,
                border: OutlineInputBorder(borderSide: BorderSide.none),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 常用属性速查

| 属性 | 说明 |
| --- | --- |
| `controller` | 读写文本、监听变化 |
| `decoration` | `InputDecoration`：label / hint / icon / 边框 / 计数器 |
| `keyboardType` | 键盘类型（text / phone / number / email…） |
| `obscureText` | 密码模式 |
| `maxLines` / `minLines` | 行数，null 为不限 |
| `maxLength` / `maxlengthEnforced` | 字数限制 / 是否强制 |
| `enabled` | false 置灰只读（只读也可用 `readOnly`） |
| `onChanged` / `onSubmitted` | 输入变化 / 回车提交 |
| `textCapitalization` / `autofocus` | 大小写策略 / 自动聚焦 |

## 易错点

::: danger controller 记得 dispose
`TextEditingController` 要在 `State.dispose()` 里释放，否则内存泄漏。
:::

::: warning 读值别用 toString
取值是 `controller.text`；直接打印 controller 得到的是对象描述。
:::

::: warning 放进 Form 要换 TextFormField
`TextField` 没有 `validator` 属性，表单校验场景必须用 `TextFormField`（属性几乎一致）。
:::
