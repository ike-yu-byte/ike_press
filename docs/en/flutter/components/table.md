---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/table' # Flutter Web preview URL for this page
---

# Table

> 🟢 Stateless widget · `StatelessWidget`

Flutter ships a native `Table`: a `TableRow` represents one row, and each child inside a row is a cell (optionally wrap it in `TableCell` for fine-grained alignment). Column widths are set precisely via `columnWidths`, which suits tables with **fixed rows/columns and tidy content**; when data is large or you need scrolling/sorting, switch to `DataTable` or build one with `ListView`.

## Basic table

`Table` + a few `TableRow`s, with `border` drawing the grid lines. Every row should have the same number of cells.

```dart
import 'package:flutter/material.dart';

/// Example: table-basic —— a three-row, three-column basic table
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
          TableRow(children: [cell('Name'), cell('Role'), cell('Status')]),
          TableRow(children: [cell('Alice'), cell('Dev'), cell('Active')]),
          TableRow(children: [cell('Bob'), cell('Design'), cell('On leave')]),
        ],
      ),
    );
  }
}
```

## Column widths

`columnWidths` sets the width per column index: `FixedColumnWidth` for fixed pixels, `FlexColumnWidth` to split the remaining space by weight, `FractionColumnWidth` for a fraction of the parent width; any column not listed falls back to `defaultColumnWidth`.

```dart
import 'package:flutter/material.dart';

/// Example: table-column-width —— set each column's width with columnWidths
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
        defaultColumnWidth: const FlexColumnWidth(), // unlisted columns split the remaining width by flex
        columnWidths: const {
          0: FixedColumnWidth(90),
          1: FlexColumnWidth(2),
          2: FlexColumnWidth(1),
        },
        children: [
          TableRow(children: [cell('Fixed 90'), cell('Flex 2'), cell('Flex 1')]),
          TableRow(children: [cell('A'), cell('longer content takes more space'), cell('B')]),
        ],
      ),
    );
  }
}
```

## Border and padding

`TableBorder` can draw only some edges (e.g. horizontal lines only, for a list-like feel); `cellPadding` adds uniform padding to every cell, or you can wrap each cell in its own `Padding`.

```dart
import 'package:flutter/material.dart';

/// Example: table-border-padding —— custom border and cell padding
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
          TableRow(children: [cell('Course', header: true), cell('Hours', header: true)]),
          TableRow(children: [cell('Flutter Basics'), cell('24')]),
          TableRow(children: [cell('Advanced Dart'), cell('16')]),
        ],
      ),
    );
  }
}
```

::: tip Use DataTable for scrolling/sorting
`Table` itself doesn't scroll, sort, or support selection. For an interactive data table use `DataTable` / `PaginatedDataTable`; for a static table with fixed rows and columns, `Table` is the lightest option.
:::

## Property cheat sheet

| Property | Description |
| --- | --- |
| `children` | List of `TableRow`s; each row should have the same number of cells |
| `columnWidths` | `{columnIndex: ColumnWidth}`, sets individual column widths |
| `defaultColumnWidth` | Fallback width for columns not in `columnWidths`; defaults to `FlexColumnWidth(1)` |
| `border` | `TableBorder`, draws the outer frame / inner lines |
| `cellPadding` | Inner padding `EdgeInsetsGeometry` for each cell |
| `textDirection` | Column layout direction (LTR / RTL) |

## Pitfalls

::: danger Keep the cell count consistent across rows
If `TableRow`s have differing numbers of children, an assertion error is thrown; the column count is the max across all rows, and missing cells are left blank but easily misalign -- keep every row consistent.
:::

::: warning Needs a finite width
`Table` lays out within a given width; putting it in a horizontally unbounded `Row` / horizontal `ListView` errors. Constrain the width with `SizedBox`/`Expanded`, or make all `columnWidths` `FixedColumnWidth`.
:::
