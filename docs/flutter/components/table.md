---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/table' # 该页 Flutter Web 预览地址
---

# Table 表格

> 🟢 无状态组件 · `StatelessWidget`

Flutter 原生就有 `Table`：用 `TableRow` 表示一行，行里的每个子组件即一个单元格（可选 `TableCell` 精细控制对齐）。列宽由 `columnWidths` 精确指定，适合**行列固定、内容规整**的表格；数据量大或需要滚动/排序时改用 `DataTable` 或 `ListView` 自建。

## 基础表格

`Table` + 若干 `TableRow`，`border` 画出网格线。每行的单元格数量应一致。

```dart
import 'package:flutter/material.dart';

/// 示例: table-basic —— 三行三列基础表格
class TableBasicDemo extends StatelessWidget {
  const TableBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    Widget cell(String text) => Padding(
          padding: const EdgeInsets.all(10),
          child: Text(text),
        );
    return Center(
      child: Table(
        border: TableBorder.all(color: Colors.blueGrey.shade300),
        children: [
          TableRow(children: [cell('姓名'), cell('角色'), cell('状态')]),
          TableRow(children: [cell('张三'), cell('开发'), cell('在职')]),
          TableRow(children: [cell('李四'), cell('设计'), cell('休假')]),
        ],
      ),
    );
  }
}
```

## 列宽控制

`columnWidths` 按列索引指定宽度：`FixedColumnWidth` 固定像素、`FlexColumnWidth` 按权重瓜分剩余空间、`FractionColumnWidth` 按父宽比例；未列出的列用 `defaultColumnWidth`。

```dart
import 'package:flutter/material.dart';

/// 示例: table-column-width —— columnWidths 指定各列宽
class TableColumnWidthDemo extends StatelessWidget {
  const TableColumnWidthDemo({super.key});

  @override
  Widget build(BuildContext context) {
    Widget cell(String text) => Padding(
          padding: const EdgeInsets.all(10),
          child: Text(text),
        );
    return Center(
      child: Table(
        border: TableBorder.all(color: Colors.blueGrey.shade300),
        defaultColumnWidth: const FlexColumnWidth(), // 未指定列按 flex 平分剩余宽
        columnWidths: const {
          0: FixedColumnWidth(90),
          1: FlexColumnWidth(2),
          2: FlexColumnWidth(1),
        },
        children: [
          TableRow(children: [cell('固定90'), cell('Flex 2'), cell('Flex 1')]),
          TableRow(children: [cell('A'), cell('较长内容占据更多空间'), cell('B')]),
        ],
      ),
    );
  }
}
```

## 边框与内边距

`TableBorder` 可只画部分边（如只留横线做列表感）；`cellPadding` 统一给每个单元格加内边距，也可在单元格里自己套 `Padding`。

```dart
import 'package:flutter/material.dart';

/// 示例: table-border-padding —— 自定义边框与单元格内边距
class TableBorderPaddingDemo extends StatelessWidget {
  const TableBorderPaddingDemo({super.key});

  @override
  Widget build(BuildContext context) {
    Widget cell(String text, {bool header = false}) => Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: Text(
            text,
            style: TextStyle(fontWeight: header ? FontWeight.bold : FontWeight.normal),
          ),
        );
    return Center(
      child: Table(
        border: const TableBorder(
          top: BorderSide(color: Colors.grey),
          bottom: BorderSide(color: Colors.grey),
          horizontalInside: BorderSide(color: Colors.grey, width: 0.5),
        ),
        defaultColumnWidth: const FlexColumnWidth(),
        children: [
          TableRow(children: [cell('课程', header: true), cell('学时', header: true)]),
          TableRow(children: [cell('Flutter 基础'), cell('24')]),
          TableRow(children: [cell('Dart 进阶'), cell('16')]),
        ],
      ),
    );
  }
}
```

::: tip 需要滚动/排序用 DataTable
`Table` 本身不滚动、不排序、不带选择。要做可交互的数据表用 `DataTable` / `PaginatedDataTable`；只要固定行列的静态表，`Table` 最轻量。
:::

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `children` | `TableRow` 列表，每行的单元格数应一致 |
| `columnWidths` | `{列索引: ColumnWidth}`，指定单列宽度 |
| `defaultColumnWidth` | 未在 `columnWidths` 里的列的兜底宽度，默认 `FlexColumnWidth(1)` |
| `border` | `TableBorder`，画外框/内线 |
| `cellPadding` | 每个单元格的内边距 `EdgeInsetsGeometry` |
| `textDirection` | 列的排列方向（LTR / RTL） |

## 易错点

::: danger 各行单元格数要一致
`TableRow` 的 children 数量不一致会抛断言错误；列数取所有行的最大值，缺的列会留空但容易错位，最好每行对齐。
:::

::: warning 需要有限宽度
`Table` 会在给定宽度里布局，放进横向无界的 `Row`/水平 `ListView` 会报错；用 `SizedBox`/`Expanded` 约束宽度，或让 `columnWidths` 全为 `FixedColumnWidth`。
:::
