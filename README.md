# DataTable 数据表格组件

> jsMap key: `DataTable`

## 基础用法

```javascript
window.pageLoadFiles = ['DataTable'];
window.pageOnLoad = function () {

    function buildTableUri(extraParams = {}) {
        const url = new URL('/admin/模块/方法', window.location.origin);
        url.searchParams.set('format', 'table');
        Object.entries(extraParams).forEach(([key, value]) =>
            url.searchParams.set(key, String(value))
        );
        return url.pathname + url.search;
    }

    const table = new DataTable('#tableContainer');
    table.load({
        uri: buildTableUri(),       // 数据接口（必填）
        mobile: true,               // 移动端适配（必填）
        selectable: false,          // 是否可多选行（必填）
        lineHeight: 'auto',         // 行高（必填）
        height: 'auto',             // 表格高度（必填）
        break: true,                // 是否允许换行（可选，默认 false）
        page: true,                 // 是否分页（可选，默认 true）
        pageSizes: [5, 10, 20, 50, 100], // 分页大小选项（可选）
        empty_msg: '空空如也',       // 空数据提示（可选）
        params: {},                 // 额外请求参数（可选）
        headers: {},                // 额外请求头（可选）
        columns: [
            { field: 'id', name: 'ID', align: 'center', sortable: true },
            { field: 'name', name: '名称', align: 'left', sortable: true },
        ],
    });

    return false;
};
```

## 列配置 Column

| 属性 | 类型 | 说明 |
|------|------|------|
| `field` | `string` | 字段名 |
| `name` | `string` | 表头文本 |
| `align` | `string` | 对齐：`left` / `center` / `right` |
| `sortable` | `boolean` | 是否可排序 |
| `width` | `number\|'auto'` | 列宽，默认 `'auto'` |
| `fixed` | `string` | 固定列：`'left'` / `'right'`，不传则不固定 |
| `formatter` | `function(value, row, index): string` | 自定义渲染，返回 HTML 字符串 |

## Formatter 写法

```javascript
function statusChip(value, row) {
    if (!value && value !== 0) return '<span class="text-on-surface-38">—</span>';
    return '<mdui-chip elevated>' + $.escapeHtml(String(value)) + '</mdui-chip>';
}

// 操作列
{
    field: '_action',
    name: '操作',
    align: 'center',
    sortable: false,
    formatter: function (value, row) {
        const id = $.escapeHtml(row.id || '');
        return `<mdui-button variant="tonal" href="/admin/xx/detail?id=${id}">详情</mdui-button>`;
    },
}
```

> ⚠️ 动态值**必须** `$.escapeHtml()` 转义，无数据统一显示 `—`。

## 事件回调

```javascript
table.load({
    // ...
    events: {
        onRowClick: function (row, rowIndex) {},
        onCellClick: function (row, rowIndex, colIndex, colName) {},
        onPaged: function (page, pageSize) {},
        onSelect: function (selectedRows) {},
    },
});
```

## 带筛选栏

```javascript
window.pageLoadFiles = ['DataTable'];
window.pageOnLoad = function () {

    function buildTableUri(extraParams = {}) { /* ... */ }

    function currentFilters() {
        return {
            keyword: ($('#filterKeyword').val() || '').trim(),
            type: $('#filterType').val() || '',
        };
    }

    function applyFilters() {
        table.reload(currentFilters(), true); // true = 重置到第 1 页
    }

    function resetFilters() {
        $('#filterKeyword').val('');
        $('#filterType').val('');
        applyFilters();
    }

    const table = new DataTable('#xxxTable');
    table.load({ uri: buildTableUri(), /* ... */ });

    $('#applyFiltersBtn').on('click', applyFilters);
    $('#resetFiltersBtn').on('click', resetFilters);
    $('#filterKeyword').on('keydown', function (e) {
        if (e.key === 'Enter') applyFilters();
    });

    return false;
};
```

## 实例方法

| 方法 | 说明 |
|------|------|
| `table.load(config)` | 初始化加载 |
| `table.reload(params, resetPage)` | 重新加载数据 |
| `table.getSelectedRows()` | 获取选中行 |
| `table.getRow(index)` | 获取指定行数据 |
| `table.destroy()` | 销毁实例 |

## 后端接口约定

请求参数：`page`、`pageSize`、`sortColumn`、`sortOrder` + 自定义 `params`

返回格式：

```json
{ "data": [...], "count": 100 }
```

