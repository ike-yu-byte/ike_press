---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Form 表单校验

`Form` 把一组 `TextFormField` 等输入项聚合成一个整体，统一校验、统一重置。校验逻辑写在每个字段的 `validator` 里。

## 登录表单（完整校验流程）

`GlobalKey<FormState>` → `validate()` → 提交。

```dart
import 'package:flutter/material.dart';

/// 示例: form-login —— 邮箱 + 密码双字段校验
class FormLoginDemo extends StatefulWidget {
  const FormLoginDemo({super.key});

  @override
  State<FormLoginDemo> createState() => _FormLoginDemoState();
}

class _FormLoginDemoState extends State<FormLoginDemo> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _pwdController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _pwdController.dispose();
    super.dispose();
  }

  void _submit() {
    if (_formKey.currentState!.validate()) {
      // 全部字段通过才走到这里
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('提交成功')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(labelText: '邮箱', border: OutlineInputBorder()),
                validator: (value) {
                  if (value == null || value.isEmpty) return '请输入邮箱';
                  if (!value.contains('@')) return '邮箱格式不正确';
                  return null; // 返回 null 表示通过
                },
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _pwdController,
                obscureText: true,
                decoration: const InputDecoration(labelText: '密码', border: OutlineInputBorder()),
                validator: (v) => (v == null || v.length < 6) ? '密码至少 6 位' : null,
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: FilledButton(onPressed: _submit, child: const Text('登录')),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## autovalidateMode 即时校验

默认点按钮才校验；设 `autovalidateMode` 边输边验。

```dart
import 'package:flutter/material.dart';

/// 示例: form-autovalidate —— 输入过程实时报错
class FormAutoValidateDemo extends StatefulWidget {
  const FormAutoValidateDemo({super.key});

  @override
  State<FormAutoValidateDemo> createState() => _FormAutoValidateDemoState();
}

class _FormAutoValidateDemoState extends State<FormAutoValidateDemo> {
  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          autovalidateMode: AutovalidateMode.onUserInteraction, // 用户交互过才开启，避免进来就满屏红
          child: TextFormField(
            decoration: const InputDecoration(
              labelText: '昵称（2-10 个字）',
              border: OutlineInputBorder(),
            ),
            validator: (v) {
              if (v == null || v.trim().length < 2 || v.trim().length > 10) {
                return '长度需 2-10 个字';
              }
              return null;
            },
          ),
        ),
      ),
    );
  }
}
```

## 统一重置与局部保存

`reset()` 一键清空全表；单个字段可 `save()` 落到 onSaved。

```dart
import 'package:flutter/material.dart';

/// 示例: form-reset —— 填写后一键重置
class FormResetDemo extends StatefulWidget {
  const FormResetDemo({super.key});

  @override
  State<FormResetDemo> createState() => _FormResetDemoState();
}

class _FormResetDemoState extends State<FormResetDemo> {
  final _formKey = GlobalKey<FormState>();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                initialValue: '默认值',
                decoration: const InputDecoration(labelText: '内容', border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _formKey.currentState!.reset(), // 恢复各字段 initialValue
                      child: const Text('重置'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 核心 API 速查

| API | 说明 |
| --- | --- |
| `Form(key: _formKey)` | 用 GlobalKey 拿到 `FormState` |
| `_formKey.currentState!.validate()` | 触发全表 validator，任一失败返回 false |
| `.reset()` / `.save()` | 重置全表 / 全表执行 onSaved |
| `autovalidateMode` | `disabled` / `always` / `onUserInteraction` |
| `TextFormField(validator:, onSaved:)` | 单字段校验 / 保存回调 |

## 易错点

::: danger validator 返回 String 而不是抛异常
返回错误文案（String）即报错提示，返回 null 即通过；别在 validator 里 throw。
:::

::: warning validate() 前 Form 必须已挂载
_formKey.currentState 在 Form 渲染前是 null，用 `!` 强制解包要确保时机正确。
:::

::: info 数据取用 controller 或 onSaved
校验通过后取值：推荐 `controller.text`；也可在每个字段 `onSaved` 里存进模型，最后 `save()` 统一收集。
:::
