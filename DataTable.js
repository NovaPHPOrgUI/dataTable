/**
 * 数据表格组件
 * 原生 table 渲染：分页、服务端排序、多选、固定列、移动端卡片布局
 * @file DataTable.js
 * @version 2.0.0
 */

/*
 * Copyright (c) 2025. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

/** 选择列总宽（px，border-box，含 padding） */
const DT_CHECK_WIDTH = 48;
/** 未指定宽度的列在计算表格最小宽度时的内容占位（px） */
const DT_AUTO_MIN_WIDTH = 120;
/**
 * 普通单元格水平 padding 总和（px）
 * 必须与 datatable.css 里 --dt-cell-pad-x（左右各 1rem）一致
 */
const DT_CELL_PAD_X = 32;
const DT_MIN_COLUMN_WIDTH = 40;

/**
 * 解析列宽为像素数字。兼容 160 / "160" / "160px" / "auto"。
 * @param {number|string|null|undefined} w
 * @returns {number|null} null = 弹性列（吃剩余宽度）
 */
function parseColumnWidth(w) {
  if (w == null || w === "" || w === "auto") return null;
  if (typeof w === "number" && Number.isFinite(w) && w > 0) return w;
  if (typeof w === "string") {
    const m = w.trim().match(/^(\d+(?:\.\d+)?)\s*(px)?$/i);
    if (m) return parseFloat(m[1]);
  }
  return null;
}

class DataTable {
  /**
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

    /** @type {HTMLElement} 滚动容器 */
    this.wrap = document.createElement("div");
    this.wrap.className = "dt-wrap";

    /** @type {HTMLTableElement} 表格元素 */
    this.table = document.createElement("table");
    this.table.id = this.tableName;
    this.table.className = "dt-table";
    this.table.innerHTML = "<thead></thead><tbody></tbody>";
    this.wrap.appendChild(this.table);
    this.element.appendChild(this.wrap);

    /** @type {HTMLElement} 分页组件元素 */
    this.page = document.createElement("mdui-page-btn");
    this.page.id = "page" + Math.random().toString(36).substring(2);
    this.element.appendChild(this.page);

    this.data = [];
    this.totalRecords = 0;
    this.selectData = [];
    this.sortColumn = "";
    this.sortOrder = "";

    this.table.addEventListener("click", (e) => this.onClick(e));
    this.table.addEventListener("change", (e) => this.onCheck(e));

    // 鼠标移到容器底部时唤醒系统横滚条（不必先横向拖一下）
    this._hScrollPinned = false;
    this._onWrapMouseMove = (e) => this.onWrapMouseMove(e);
    this._onWrapMouseLeave = () => {
      this._hScrollPinned = false;
      this.setHScrollHot(false);
    };
    this._onWrapScroll = () => this.onWrapScroll();
    this.wrap.addEventListener("mousemove", this._onWrapMouseMove);
    this.wrap.addEventListener("mouseleave", this._onWrapMouseLeave);
    this.wrap.addEventListener("scroll", this._onWrapScroll, { passive: true });
  }

  /**
   * 距底边 20px 内且内容溢出 → 点亮系统横滚条
   * @param {MouseEvent} e
   */
  onWrapMouseMove(e) {
    if (this.wrap.scrollWidth <= this.wrap.clientWidth + 1) {
      this._hScrollPinned = false;
      this.setHScrollHot(false);
      return;
    }
    const rect = this.wrap.getBoundingClientRect();
    const nearBottom = e.clientY >= rect.bottom - 20 && e.clientY <= rect.bottom;
    this._hScrollPinned = nearBottom;
    this.setHScrollHot(nearBottom);
  }

  /**
   * 横滚过程中也保持条可见，停滚稍后收起（除非鼠标仍在底边）
   */
  onWrapScroll() {
    if (this.wrap.scrollWidth <= this.wrap.clientWidth + 1) return;
    this.setHScrollHot(true);
    clearTimeout(this._hScrollTimer);
    this._hScrollTimer = setTimeout(() => {
      if (!this._hScrollPinned) this.setHScrollHot(false);
    }, 800);
  }

  /**
   * 切换横滚条显示：class 控样式，1px 轻推唤醒叠加条
   * @param {boolean} on
   */
  setHScrollHot(on) {
    const shown = this.wrap.classList.contains("dt-hhot");
    if (!!on === shown) return;
    this.wrap.classList.toggle("dt-hhot", on);
    if (!on) return;
    const x = this.wrap.scrollLeft;
    const max = this.wrap.scrollWidth - this.wrap.clientWidth;
    if (max <= 0) return;
    this.wrap.scrollLeft = x >= max ? x - 1 : x + 1;
    this.wrap.scrollLeft = x;
  }

  /**
   * 列配置对象
   * @typedef {Object} Column
   * @property {string}  field      字段名
   * @property {string}  name       表头显示文本
   * @property {string}  align      对齐方式（left | center | right）
   * @property {number|string}  width 列宽，数字或 'auto'
   * @property {string=} fixed      固定列：'left' | 'right'
   * @property {boolean=} sortable  是否可排序
   * @property {boolean=} resizable 是否允许拖拽调整列宽，默认 true
   * @property {(value:any, row?:any, index?:number)=>string} [formatter]
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
   * @property {(Object|string)=} params          [可选] 请求参数，支持对象或表单选择器
   * @property {Object=}  headers                 [可选] 请求头
   * @property {number[]=} pageSizes              [可选] 分页大小选项
   * @property {boolean=} page                    [可选] 是否启用分页
   * @property {boolean=} resizable               [可选] 是否允许调整列宽，默认 true
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
        "/components/dataTable/datatable.css",
        "URLUtils",
      ],
      function () {
        that.config = Object.assign(
          {
            uri: "",
            break: false,
            columns: [],
            mobile: true,
            selectable: true,
            lineHeight: "auto",
            height: "auto",
            events: {},
            empty_msg: "空空如也",
            params: {},
            headers: {},
            pageSizes: [5, 10, 20, 50, 100],
            page: true,
            resizable: true,
          },
          config,
        );
        that.currentPage = parseInt($.url.getParam("page") || "1");
        that.pageSize = parseInt($.url.getParam("size") || that.config.pageSizes[0]);
        if (typeof that.config.params === "string") {
          $.form.val(that.config.params, $.url.getAllParams());
        }
        that.element.classList.add("dt");
        that.element.classList.toggle("table-mobile", !!that.config.mobile);
        that.element.classList.toggle("dt-break", !!that.config.break);
        that.page.style.display = that.config.page ? "" : "none";

        if (that.config.height !== "auto") {
          that.wrap.style.maxHeight = DataTable.cssSize(that.config.height);
        }
        if (that.config.lineHeight !== "auto") {
          that.table.style.setProperty("--dt-row-height", DataTable.cssSize(that.config.lineHeight));
        }

        that.columns = that.buildColumns();
        that.renderHead();
        that.reload();
      },
    );
  }

  /**
   * 数字转 px，字符串原样返回
   * @param {number|string} v
   * @returns {string}
   */
  static cssSize(v) {
    return typeof v === "number" ? v + "px" : v;
  }

  /**
   * 重新加载表格数据
   * @param {Object|boolean} params - 请求参数；传 boolean 等同于只传 reloadPage
   * @param {boolean} reloadPage - 是否重置到第一页
   */
  reload(params = undefined, reloadPage = false) {
    if (typeof params === "boolean") reloadPage = params;
    if (typeof params === "object" && params !== null) this.config.params = params;
    if (reloadPage) {
      this.currentPage = 1;
      $.url.setParam("page", "1");
    }
    this.setSelected([], true);
    const loading = new Loading(this.element);
    loading.show();
    this.fetchData(() => {
      // 当前页已无数据但总数不为零（如删掉了末页最后一条）：退回最后一页
      const lastPage = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
      if (this.data.length === 0 && this.currentPage > lastPage) {
        this.currentPage = lastPage;
        $.url.setParam("page", String(lastPage));
        loading.close();
        this.reload();
        return;
      }
      try {
        this.renderBody();
        if (this.config.page) this.renderPage();
      } catch (e) {
        $.logger.error(e);
      }
      loading.close();
    });
  }

  /**
   * 获取表格数据
   * @param {Function} callback - 请求结束后的回调（成功或失败都会调用）
   */
  fetchData(callback) {
    this.data = [];
    this.totalRecords = 0;
    const data = Object.assign(this.resolveParams(), {
      page: this.currentPage,
      pageSize: this.pageSize,
      sortColumn: this.sortColumn,
      sortOrder: this.sortOrder,
    });

    $.ajax({
      method: "GET",
      url: this.config.uri,
      headers: this.config.headers,
      data: data,
      success: (json) => {
        this.data = json.data || [];
        this.totalRecords = json.count || 0;
      },
      error: (xhr) => {
        $.toaster.error("请求失败");
        console.error(xhr);
      },
      complete: callback,
    });
  }

  /**
   * 获取最终请求参数
   * @returns {Object} 请求参数对象
   */
  resolveParams() {
    if (typeof this.config.params === "string") {
      const vals = $.form.val(this.config.params) || {};
      Object.entries(vals).forEach(([key, value]) => {
        $.url.setParam(key, value);
      });
      return vals;
    }
    return Object.assign({}, this.config.params);
  }

  /**
   * 整理列配置：按 left 固定 / 普通 / right 固定 排序，并计算 sticky 偏移
   * @returns {Array<Object>}
   */
  buildColumns() {
    const left = [];
    const middle = [];
    const right = [];
    for (const col of this.config.columns) {
      let width = parseColumnWidth(col.width);
      if (col.fixed && width === null) width = 100;
      const column = Object.assign({}, col, { width, offset: 0 });
      if (col.fixed === "left") left.push(column);
      else if (col.fixed === "right") right.push(column);
      else middle.push(column);
    }

    const columns = [...left, ...middle, ...right];
    this.updateColumnLayout(columns);
    return columns;
  }

  updateColumnLayout(columns) {
    // sticky 偏移用「内容宽 + 水平 padding」；选择列本身是 border-box 总宽
    const outer = (w) => (w == null ? DT_AUTO_MIN_WIDTH : w) + DT_CELL_PAD_X;

    let offset = this.config.selectable ? DT_CHECK_WIDTH : 0;
    for (const col of columns.filter((col) => col.fixed === "left")) {
      col.offset = offset;
      offset += outer(col.width);
    }
    offset = 0;
    for (const col of columns.filter((col) => col.fixed === "right").reverse()) {
      col.offset = offset;
      offset += outer(col.width);
    }

    // min-width = 实际渲染总宽，避免 content-box 漏算 padding 撑出页面横条
    const minWidth = columns.reduce(
      (sum, c) => sum + outer(c.width),
      this.config.selectable ? DT_CHECK_WIDTH : 0,
    );
    this.table.style.setProperty("--dt-min-width", minWidth + "px");
    if (this._manualColumnWidths) this.table.style.width = minWidth + "px";
  }

  lockColumnWidths() {
    const cells = this.table.tHead.rows[0].cells;
    const offset = this.config.selectable ? 1 : 0;
    const widths = this.columns.map((_, index) =>
      Math.max(1, cells[index + offset].getBoundingClientRect().width - DT_CELL_PAD_X),
    );
    this.columns.forEach((col, index) => { col.width = widths[index]; });
    this._manualColumnWidths = true;
  }

  resizeColumn(index, width) {
    this.columns[index].width = Math.max(DT_MIN_COLUMN_WIDTH, width);
    this.updateColumnLayout(this.columns);
    const offset = this.config.selectable ? 1 : 0;
    for (const row of this.table.rows) {
      if (row.classList.contains("dt-empty")) continue;
      this.columns.forEach((col, colIndex) => {
        const cell = row.cells[colIndex + offset];
        this.applyColumnStyle(cell, col);
        const handle = cell.querySelector(".dt-resize-handle");
        if (handle) handle.setAttribute("aria-valuenow", String(Math.round(col.width + DT_CELL_PAD_X)));
      });
    }
  }

  startColumnResize(event, index, handle) {
    if (event.button !== 0 || event.isPrimary === false) return;
    event.preventDefault();
    event.stopPropagation();
    this.endColumnResize();
    this.lockColumnWidths();
    this.resizeColumn(index, this.columns[index].width);
    const state = {
      handle, pointerId: event.pointerId, startX: event.clientX,
      width: this.columns[index].width,
    };
    state.move = (e) => {
      if (e.pointerId !== state.pointerId) return;
      this.resizeColumn(index, state.width + e.clientX - state.startX);
    };
    state.end = (e) => {
      if (e.pointerId === state.pointerId) this.endColumnResize();
    };
    this._columnResize = state;
    handle.addEventListener("pointermove", state.move);
    handle.addEventListener("pointerup", state.end);
    handle.addEventListener("pointercancel", state.end);
    handle.addEventListener("lostpointercapture", state.end);
    handle.setPointerCapture(event.pointerId);
    this.element.classList.add("dt-resizing");
  }

  endColumnResize() {
    const state = this._columnResize;
    if (!state) return;
    this._columnResize = null;
    state.handle.removeEventListener("pointermove", state.move);
    state.handle.removeEventListener("pointerup", state.end);
    state.handle.removeEventListener("pointercancel", state.end);
    state.handle.removeEventListener("lostpointercapture", state.end);
    if (state.handle.hasPointerCapture(state.pointerId)) {
      state.handle.releasePointerCapture(state.pointerId);
    }
    this.element.classList.remove("dt-resizing");
  }

  /**
   * 给 th/td 应用列的宽度、对齐、固定定位
   * @param {HTMLElement} cell
   * @param {Object} col
   */
  applyColumnStyle(cell, col) {
    cell.dataset.field = col.field;
    if (col.align) cell.style.textAlign = col.align;
    // width 为数字才锁列宽；null（auto）不设，留给 table-layout:fixed 吃剩余空间
    if (col.width != null) {
      cell.style.width = col.width + "px";
      cell.style.minWidth = col.width + "px";
    }
    if (col.fixed) {
      cell.classList.add("dt-fixed", "dt-fixed-" + col.fixed);
      cell.style[col.fixed] = col.offset + "px";
    }
  }

  /**
   * 渲染表头
   */
  renderHead() {
    this.endColumnResize();
    const tr = document.createElement("tr");
    if (this.config.selectable) {
      const th = document.createElement("th");
      th.className = "dt-check dt-fixed dt-fixed-left";
      th.style.left = "0px";
      th.innerHTML = '<mdui-checkbox class="dt-check-all"></mdui-checkbox>';
      tr.appendChild(th);
    }
    for (const [index, col] of this.columns.entries()) {
      const th = document.createElement("th");
      this.applyColumnStyle(th, col);
      const label = document.createElement("span");
      label.className = "dt-th-text";
      label.textContent = col.name;
      th.appendChild(label);
      if (col.sortable) {
        th.classList.add("dt-sortable");
        const icon = document.createElement("mdui-icon");
        icon.className = "dt-sort-icon";
        icon.setAttribute("name", "unfold_more");
        th.appendChild(icon);
      }
      if (this.config.resizable && col.resizable !== false && index < this.columns.length - 1) {
        const handle = document.createElement("span");
        handle.className = "dt-resize-handle";
        handle.tabIndex = 0;
        handle.title = "拖拽调整列宽";
        handle.setAttribute("role", "separator");
        handle.setAttribute("aria-orientation", "vertical");
        handle.setAttribute("aria-label", "调整" + col.name + "列宽");
        handle.setAttribute("aria-valuemin", String(DT_MIN_COLUMN_WIDTH + DT_CELL_PAD_X));
        handle.addEventListener("pointerdown", (e) => this.startColumnResize(e, index, handle));
        handle.addEventListener("click", (e) => e.stopPropagation());
        handle.addEventListener("keydown", (e) => {
          if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
          e.preventDefault();
          e.stopPropagation();
          this.lockColumnWidths();
          this.resizeColumn(index, this.columns[index].width + (e.key === "ArrowRight" ? 10 : -10));
        });
        th.appendChild(handle);
      }
      tr.appendChild(th);
    }
    const thead = this.table.tHead;
    thead.innerHTML = "";
    thead.appendChild(tr);
    for (const th of tr.cells) {
      const handle = th.querySelector(".dt-resize-handle");
      if (handle) handle.setAttribute("aria-valuenow", String(Math.round(th.getBoundingClientRect().width)));
    }
    this.renderSortState();
  }

  /**
   * 同步表头排序图标
   */
  renderSortState() {
    this.table.querySelectorAll("th.dt-sortable").forEach((th) => {
      const active = th.dataset.field === this.sortColumn && this.sortOrder !== "";
      th.classList.toggle("dt-sort-active", active);
      const icons = { asc: "arrow_upward", desc: "arrow_downward" };
      th.querySelector(".dt-sort-icon").setAttribute(
        "name",
        active ? icons[this.sortOrder] : "unfold_more",
      );
    });
  }

  /**
   * 渲染表体
   */
  renderBody() {
    const tbody = this.table.tBodies[0];
    tbody.innerHTML = "";
    const colCount = this.columns.length + (this.config.selectable ? 1 : 0);

    if (this.data.length === 0) {
      const tr = document.createElement("tr");
      tr.className = "dt-empty";
      const td = document.createElement("td");
      td.colSpan = colCount;
      td.textContent = this.config.empty_msg;
      tr.appendChild(td);
      tbody.appendChild(tr);
    } else {
      this.data.forEach((row, index) => {
        const tr = document.createElement("tr");
        tr.dataset.index = index;
        if (this.config.selectable) {
          const td = document.createElement("td");
          td.className = "dt-check dt-fixed dt-fixed-left";
          td.style.left = "0px";
          td.innerHTML = "<mdui-checkbox></mdui-checkbox>";
          tr.appendChild(td);
        }
        this.columns.forEach((col, colIndex) => {
          const td = this.renderCell(col, row, index);
          td.dataset.col = colIndex;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
    }
  }

  /**
   * 渲染单元格
   * @param {Object} col
   * @param {Object} row
   * @param {number} index
   * @returns {HTMLTableCellElement}
   */
  renderCell(col, row, index) {
    const td = document.createElement("td");
    this.applyColumnStyle(td, col);

    const value = row[col.field];
    let result = value ?? "";
    if (col.formatter) {
      result = col.formatter(value, row, index);
    }
    const isPlain = result === value || (typeof result === "string" && result.indexOf("<") === -1);

    const name = document.createElement("span");
    name.className = "table-mobile-name";
    name.textContent = col.name;
    const content = document.createElement("span");
    content.className = "table-col";
    content.innerHTML = result ?? "";
    if (isPlain && !this.config.break) {
      content.title = content.textContent;
    }
    td.appendChild(name);
    td.appendChild(content);
    return td;
  }

  /**
   * 渲染分页组件
   */
  renderPage() {
    let that = this;
    this.page.init({
      pageIndex: that.currentPage,
      pageSizes: that.config.pageSizes,
      pageSize: that.pageSize,
      total: that.totalRecords,
      onPageChange: function (index, pageSize) {
        that.currentPage = index;
        that.pageSize = pageSize;
        $.url.setParam("page", index);
        $.url.setParam("size", pageSize);
        that.reload();
        if (that.config.events.onPaged) that.config.events.onPaged(index, pageSize);
      },
    });
  }

  /**
   * 表格点击：排序 / 行点击 / 单元格点击
   * @param {MouseEvent} e
   */
  onClick(e) {
    const th = e.target.closest("th.dt-sortable");
    if (th) {
      this.toggleSort(th.dataset.field);
      return;
    }
    if (e.target.closest("mdui-checkbox")) return;

    const td = e.target.closest("tbody td");
    if (!td || td.parentElement.classList.contains("dt-empty")) return;
    const rowIndex = parseInt(td.parentElement.dataset.index);
    const row = this.data[rowIndex];
    if (td.dataset.col !== undefined && this.config.events.onCellClick) {
      this.config.events.onCellClick(row, rowIndex, parseInt(td.dataset.col), td.dataset.field);
    }
    if (this.config.events.onRowClick) {
      this.config.events.onRowClick(row, rowIndex);
    }
  }

  /**
   * 切换排序：无 → 升序 → 降序 → 无
   * @param {string} field
   */
  toggleSort(field) {
    if (this.sortColumn !== field) {
      this.sortColumn = field;
      this.sortOrder = "asc";
    } else if (this.sortOrder === "asc") {
      this.sortOrder = "desc";
    } else {
      this.sortColumn = "";
      this.sortOrder = "";
    }
    this.renderSortState();
    this.reload(true);
  }

  /**
   * 复选框变更（忽略 setSelected 同步时的回声）
   * @param {Event} e
   */
  onCheck(e) {
    if (this._syncingCheck) return;
    const box = e.target.closest("mdui-checkbox");
    if (!box) return;
    if (box.classList.contains("dt-check-all")) {
      this.setSelected(box.checked ? this.data.slice() : []);
      return;
    }
    const tr = box.closest("tr");
    const row = this.data[parseInt(tr.dataset.index)];
    const next = this.selectData.filter((r) => r !== row);
    if (box.checked) next.push(row);
    this.setSelected(next);
  }

  /**
   * 设置选中行并同步复选框状态
   * @param {Array<Object>} rows
   * @param {boolean=} silent - 为 true 时不触发 onSelect（例如 reload 前清空）
   */
  setSelected(rows, silent = false) {
    this.selectData = rows;
    this._syncingCheck = true;
    this.table.querySelectorAll("tbody tr[data-index]").forEach((tr) => {
      const checked = rows.includes(this.data[parseInt(tr.dataset.index)]);
      tr.classList.toggle("dt-selected", checked);
      const box = tr.querySelector("mdui-checkbox");
      if (box && box.checked !== checked) box.checked = checked;
    });
    const all = this.table.querySelector(".dt-check-all");
    if (all) {
      const allChecked = this.data.length > 0 && rows.length === this.data.length;
      const indeterminate = rows.length > 0 && rows.length < this.data.length;
      if (all.checked !== allChecked) all.checked = allChecked;
      if (all.indeterminate !== indeterminate) all.indeterminate = indeterminate;
    }
    this._syncingCheck = false;
    if (!silent && this.config.events.onSelect) this.config.events.onSelect(rows);
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
    this.endColumnResize();
    clearTimeout(this._hScrollTimer);
    this.wrap.removeEventListener("mousemove", this._onWrapMouseMove);
    this.wrap.removeEventListener("mouseleave", this._onWrapMouseLeave);
    this.wrap.removeEventListener("scroll", this._onWrapScroll);
    this.wrap.remove();
    this.page.remove();
    this.element.classList.remove("dt", "table-mobile", "dt-break");
    this.data = [];
    this.selectData = [];
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
