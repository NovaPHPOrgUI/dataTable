/**
 * 数据表格组件
 * 提供功能丰富的数据表格显示、分页、排序、选择等功能
 * @file DataTable.js
 * @author License Auto System
 * @version 1.0.0
 */

/*
 * Copyright (c) 2025. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

/**
 * 数据表格类
 * 提供数据表格的完整功能，包括数据加载、渲染、分页、排序等
 */
class DataTable {
  /**
   * 构造函数
   * @param {string} id - 表格容器的CSS选择器
   */
  constructor(id) {
    /** @type {HTMLElement} 表格容器元素 */
    this.element = document.querySelector(id);

    if (!this.element) {
      console.error("Element not found");
      return;
    }

    /** @type {string} 表格唯一标识名 */
    this.tableName = "table" + Math.random().toString(36).substring(2);

    /** @type {HTMLTableElement} 表格元素 */
    this.table = document.createElement("table");
    this.table.id = this.tableName;
    this.element.appendChild(this.table);
    
    /** @type {HTMLElement} 分页组件元素 */
    this.page = document.createElement("mdui-page-btn");
    this.page.id = "page" + Math.random().toString(36).substring(2);
    this.element.appendChild(this.page);
  }
  /**
   * 列配置对象
   * @typedef {Object} Column
   * @property {string}  field      字段名
   * @property {string}  name       表头显示文本
   * @property {string}  align      对齐方式（left | center | right）
   * @property {number}  width      列宽
   * @property {(value:any, row?:any)=>string} [formatter]
   *   可选：自定义单元格渲染函数，返回渲染后字符串
   */

  /**
   * 表格整体配置
   * @typedef {Object} TableOptions
   * @property {string}   uri                     数据接口地址（必填）
   * @property {Column[]} columns                 列配置数组（必填）
   * @property {boolean}  mobile                  是否启用移动端适配（必填）
   * @property {boolean}  selectable              是否可选择行（必填）
   * @property {string}   lineHeight              行高（必填）
   * @property {string}   height                  表格高度（必填）
   * @property {boolean=} break                   [可选] 是否启用换行
   * @property {Object=}  events                  [可选] 事件回调对象
   * @property {string=}  empty_msg               [可选] 空数据提示
   * @property {Object=}  params                  [可选] 请求参数
   * @property {Object=}  headers                 [可选] 请求头
   * @property {number[]=} pageSizes              [可选] 分页大小选项
   * @property {boolean=} page                    [可选] 是否启用分页
   */

  /**
   * 加载表格配置和数据
   * @param {TableOptions} config - 表格配置对象
   */
  load(config) {
    let that = this;
    $.loader(
      [
        "/components/dataTable/Pagination.js",
        "/components/dataTable/gridManager.js",
        "/components/dataTable/datatable.css",
        'URLUtils'
      ],
      function () {
        that.config = Object.assign(
          {
            uri: "",
            break: false,
            columns: [
              {
                field: "id",
                name: "ID",
                align: "center",
                fixed: "left", //固定列，left为左边，right为右边,默认为空
                width: "auto", //列宽度
                sortable: true, //是否可排序
                formatter: function (value, row, index) {
                  return value;
                },
              },
            ],
            mobile: true,
            selectable: true, //是否可以多选
            lineHeight: "auto", //表格行高，默认"auto
            height: "auto", //表格高度
            events: {
              onRowClick: function (row, rowIndex) {},
              // row: 当前行数据
              // rowIndex: 当前行索引
              // colIndex: 当前列索引
              onCellClick: function (row, rowIndex, colIndex, colName) {},
              onPaged: function (page) {},
              onSelect: function (rows) {},
            },
            empty_msg: "空空如也",
            params: {},
            headers: {},
            pageSizes: [5,10, 20, 50, 100],
            page: true,
          },
          config,
        );
        that.currentPage = parseInt($.url.getParam("page") || "1");
        that.pageSize = parseInt($.url.getParam("size") || that.config.pageSizes[0]);
        if (that.config.mobile) {
          that.element.classList.add("table-mobile");
        }

        if (!that.config.page) {
          that.page.style.display = "none";
        }

        that.data = [];
        that.totalRecords = 0;
        that.sortColumn = "";
        that.sortOrder = "";
        that.loadData((loading) => {
          try {
            that.renderTable();
            loading.close();
          } catch (e) {
            $.logger.error(e);
          }
        });
      },
    );
  }

  /**
   * 加载表格数据
   * @param {Function} callback - 加载完成后的回调函数
   */
  loadData(callback) {
    this.selectData = [];
    GridManager.setCheckedData(this.table, this.selectData);
    if (this.config.events.onSelect) this.config.events.onSelect(this.selectData);
    let that = this;
    const loading = new Loading(this.element);
    loading.show();
    this.fetchData(() => {
      callback(loading);
    });
  }

  /**
   * 重新加载表格数据
   * @param {Object} params - 请求参数
   * @param {boolean} reloadPage - 是否重新渲染分页
   */
  reload(params = undefined, reloadPage = false) {
    this.config.params = params || this.config.params;
    let that = this;
    this.loadData((loading) => {
      GridManager.setAjaxData(that.tableName, {
        data: that.data,
        total: that.totalRecords,
      });
      if (reloadPage && that.config.page) {
        that.renderPage();
      }
      loading.close();
    });
  }

  /**
   * 获取表格数据
   * @param {Function} callback - 获取完成后的回调函数
   */
  fetchData(callback) {
    this.data = [];
    this.totalRecords = 0;

    const data = Object.assign(
      {
        page: this.currentPage,
        pageSize: this.pageSize,
        sortColumn: this.sortColumn,
        sortOrder: this.sortOrder,
      },
      this.config.params,
    );

    $.ajax({
      method: "GET",
      url: this.config.uri,
      headers: this.config.headers,
      data: data,
      success: (json) => {
        try {
          this.data = json.data;
          this.totalRecords = json.count;
        } catch (e) {
          $.toaster.error("数据解析出错！");
          console.error(e);
        }
      },
      error: (xhr) => {
        $.toaster.error("请求失败");
        console.error(xhr);
      },
      complete: callback,
    });
  }

  /**
   * 构建列配置
   * @returns {Array<Object>} 列配置数组
   */
  buildColumns() {
    let columnData = [];
    let leftFixedData = [];
    let rightFixedData = [];
    let that = this;
    for (let col of this.config.columns) {
      let width = col.width || null;
      if (width === "auto") {
        width = null;
      }
      if (
          (col.fixed === "left" || col.fixed === "right") && width === null
      ) {
        width = 100;
      }
      let column = {
        key: col.field,
        text: col.name,
        align: col.align,
        fixed: col.fixed || undefined,
        width: width,
        sorting: col.sortable ? "" : undefined,
        // 函数参数:
        // cell: 当前单元格的渲染数据
        // row: 当前单元格所在行的渲染数据, 本例中: 参数nodeData=== rowData.url
        // index: 索引
        // key: 列唯一键值
        template: function (cell, row, index, key) {
          let result = cell || "";
          if (col.formatter) {
            result = col.formatter(cell, row, index);
          }
          if (result === cell || (typeof result == "string" && result.indexOf("<") === -1)) {
            if (that.config.break) {
              result = `<span class="${that.config.break ? 'break-line' : ''}">${result}</span>`;
            } else {
              result = `<mdui-tooltip>
  <span>${result}</span>
   <div slot="content">
   ${result}
  </div>
</mdui-tooltip>`;
            }
          }

          let text = col.name;
          result = `<span class="table-mobile-name">${text}</span> <span class="table-col">${result}</span>`;

          return result;
        },
      };


      if (column.fixed === "left") {
        leftFixedData.push(column);
      } else if (column.fixed === "right") {
        rightFixedData.push(column);
      } else {
        columnData.push(column);
      }
    }
    return [...leftFixedData, ...columnData, ...rightFixedData];
  }
  
  /**
   * 渲染分页组件
   */
  renderPage() {
    let that = this;
    this.page.init({
      pageIndex:  that.currentPage,
      pageSizes: that.config.pageSizes,
      pageSize: that.pageSize,
    //  currentPage: that.currentPage,
      total: that.totalRecords,
      //layout: "prev, pager, next, count, limits",
      onPageChange: function (index, pageSize) {

        that.currentPage = index;
        that.pageSize = pageSize;

        $.url.setParam("page", index);
        $.url.setParam("size", pageSize);

        that.reload(that.config.params);
        if (that.config.events.onPaged)
          that.config.events.onPaged(index, pageSize);
      },
    });
  }

  /**
   * 渲染表格
   */
  renderTable() {
    let that = this;
    this.table.GM({
      gridManagerName: that.tableName,
      supportAutoOrder: false,
      height: that.config.height === "auto" ? undefined : that.config.height,
      lineHeight:
        that.config.height === "auto" ? undefined : that.config.lineHeight,
      disableAutoLoading: true,
      supportMenu: false,
      supportAdjust: true,
      supportDrag: false,
      ajaxData: {
        data: that.data,
        total: that.totalRecords,
      },
      supportCheckbox: that.config.selectable,
      checkboxConfig: {
        // 选择列宽度配置
        width: 40,

        // 是否通过点击行来进行选中
        useRowCheck: false,

        // 当前选中操作是否使用单选
        useRadio: false,

        // 触发刷新类操作时(搜索、刷新、分页、排序、过滤)，是否禁用状态保持
        disableStateKeep: undefined,

        // 指定选中操作精准匹配字段，该值需保证每条数据的唯一性。默认不指定，对整条数据进行匹配。
        // 在使用树型结构表格(supportTreeData)时，必须配置key，否则会造成已选中数据错误。
        key: undefined, // 配置此项可提升选中操作性能, 数据量越大越明显。

        // 复选时最大可选数，生效条件: supportCheckbox === true && useRadio === false
        max: undefined,

        // 是否使用固定列, 默认为undefined
        // 接收两种值: 'left', 'right'
        fixed: "left",
      },
      columnData: that.buildColumns(),
      rowClick: function (row, rowIndex, tr) {
        if (that.config.events.onRowClick)
          that.config.events.onRowClick(row, rowIndex);
      },
      cellClick: function (row, rowIndex, colIndex, td) {
        let tdName = td.getAttribute("td-name") || "";
        if (that.config.events.onCellClick)
          that.config.events.onCellClick(row, rowIndex, colIndex, tdName);
      },
      sortingBefore: function (sort) {
        let key = Object.keys(sort);
        if (key.length === 0) {
          that.sortColumn = "";
          that.sortOrder = "";
          return;
        }
        that.sortColumn = key[0];
        that.sortOrder = sort[key[0]].toLowerCase();
        that.reload(that.config.params, true);
      },
      checkedAfter: function (checkedList, isChecked, rowData) {
        that.selectData = checkedList;
        if (that.config.events.onSelect)
          that.config.events.onSelect(checkedList);
      },
    });
    if (that.config.page) {
      that.renderPage();
    }
  }

  /**
   * 获取选中的行数据
   * @returns {Array<Object>} 选中的行数据数组
   */
  getSelectedRows() {
    return this.selectData;
  }
  
  /**
   * 销毁表格实例
   */
  destroy() {
    GridManager.destroy(this.tableName);
  }

  /**
   * 获取指定索引的行数据
   * @param {number} index - 行索引
   * @returns {Object} 行数据对象
   */
  getRow(index) {
    return this.data[index];
  }
}
