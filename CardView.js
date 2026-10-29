/**
 * 卡片视图组件
 * 以卡片网格展示数据：分页、多选、点击；移动端自适应列数
 * @file CardView.js
 * @version 2.0.0
 */

/*
 * Copyright (c) 2025. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

class CardView {
  /**
   * @param {string} id - 容器的CSS选择器
   */
  constructor(id) {
    /** @type {HTMLElement} 容器元素 */
    this.element = document.querySelector(id);

    if (!this.element) {
      console.error("Element not found");
      return;
    }

    this.element.classList.add("cv");

    /** @type {HTMLElement} 选择工具栏 */
    this.selectionBar = document.createElement("div");
    this.selectionBar.className = "card-view-selection-bar";
    this.selectionBar.innerHTML = `
      <mdui-button variant="tonal" class="card-view-select-all">全选本页</mdui-button>
      <mdui-button variant="text" class="card-view-clear-all">取消全选</mdui-button>
      <span class="card-view-selected-count" aria-live="polite"></span>
    `;
    this.element.appendChild(this.selectionBar);

    /** @type {HTMLElement} 卡片容器 */
    this.cardsContainer = document.createElement("div");
    this.cardsContainer.className = "card-view-container";
    this.element.appendChild(this.cardsContainer);

    /** @type {HTMLElement} 分页组件元素 */
    this.page = document.createElement("mdui-page-btn");
    this.page.id = "page" + Math.random().toString(36).substring(2);
    this.element.appendChild(this.page);

    this.data = [];
    this.totalRecords = 0;
    this.selectData = [];

    this.selectionBar.querySelector(".card-view-select-all").addEventListener("click", () => this.selectAll());
    this.selectionBar.querySelector(".card-view-clear-all").addEventListener("click", () => this.clearSelection());
    this.cardsContainer.addEventListener("change", (e) => this.onCheck(e));
    this.cardsContainer.addEventListener("click", (e) => this.onClick(e));
  }

  /**
   * 列配置对象
   * @typedef {Object} Column
   * @property {string}  field      字段名
   * @property {string}  name       显示文本
   * @property {boolean} [hidden]   是否隐藏（默认false）
   * @property {(value:any, row?:any, index?:number)=>string} [formatter]
   */

  /**
   * 卡片视图配置
   * @typedef {Object} CardViewOptions
   * @property {string}   uri                     数据接口地址（必填）
   * @property {string}   template                卡片HTML模板，使用{{field}}标记字段位置（必填）
   * @property {Column[]} columns                 列配置数组，用于字段格式化（必填）
   * @property {boolean}  selectable              是否可选择卡片（必填）
   * @property {string}   cardWidth               卡片最小宽度（默认300px）
   * @property {Object=}  events                  [可选] 事件回调对象
   * @property {string=}  empty_msg               [可选] 空数据提示
   * @property {(Object|string)=} params          [可选] 请求参数，支持对象或表单选择器
   * @property {Object=}  headers                 [可选] 请求头
   * @property {number[]=} pageSizes              [可选] 分页大小选项
   * @property {boolean=} page                    [可选] 是否启用分页
   */

  /**
   * 加载配置和数据
   * @param {CardViewOptions} config
   */
  load(config) {
    let that = this;
    $.loader(
      [
        "/components/dataTable/Pagination.js",
        "/components/dataTable/CardView.css",
        "URLUtils",
      ],
      function () {
        that.config = Object.assign(
          {
            uri: "",
            template: "<div>{{id}}</div>",
            columns: [],
            selectable: false,
            cardWidth: "300px",
            events: {},
            empty_msg: "空空如也",
            params: {},
            headers: {},
            pageSizes: [10, 20, 50, 100],
            page: true,
          },
          config,
        );

        that.currentPage = parseInt($.url.getParam("page") || "1");
        that.pageSize = parseInt($.url.getParam("size") || that.config.pageSizes[0]);
        if (typeof that.config.params === "string") {
          $.form.val(that.config.params, $.url.getAllParams());
        }

        that.page.style.display = that.config.page ? "" : "none";
        that.selectionBar.classList.toggle("is-visible", !!that.config.selectable);
        that.cardsContainer.style.setProperty(
          "--card-min-width",
          typeof that.config.cardWidth === "number"
            ? that.config.cardWidth + "px"
            : that.config.cardWidth,
        );
        that.reload();
      },
    );
  }

  /**
   * 重新加载数据
   * @param {Object|boolean} params
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
      const lastPage = Math.max(1, Math.ceil(this.totalRecords / this.pageSize));
      if (this.data.length === 0 && this.currentPage > lastPage) {
        this.currentPage = lastPage;
        $.url.setParam("page", String(lastPage));
        loading.close();
        this.reload();
        return;
      }
      try {
        this.renderCards();
        if (this.config.page) this.renderPage();
      } catch (e) {
        $.logger.error(e);
      }
      loading.close();
    });
  }

  /**
   * @param {Function} callback
   */
  fetchData(callback) {
    this.data = [];
    this.totalRecords = 0;
    const data = Object.assign(this.resolveParams(), {
      page: this.currentPage,
      pageSize: this.pageSize,
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
   * @returns {Object}
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

  renderCards() {
    this.cardsContainer.innerHTML = "";

    if (this.data.length === 0) {
      this.renderEmpty();
      this.updateSelectionBarState();
      return;
    }

    this.data.forEach((row, index) => {
      this.cardsContainer.appendChild(this.buildCard(row, index));
    });
    this.updateSelectionBarState();
  }

  renderEmpty() {
    const empty = document.createElement("div");
    empty.className = "card-view-empty";
    empty.innerHTML = `
      <mdui-icon name="inbox" class="empty-icon"></mdui-icon>
      <div class="empty-text">${this.config.empty_msg}</div>
    `;
    this.cardsContainer.appendChild(empty);
  }

  /**
   * @param {Object} row
   * @param {number} index
   * @returns {HTMLElement}
   */
  buildCard(row, index) {
    const card = document.createElement("div");
    card.className = "card-view-item";
    card.dataset.index = index;

    if (this.config.selectable) {
      const checkbox = document.createElement("div");
      checkbox.className = "card-checkbox";
      checkbox.innerHTML = "<mdui-checkbox></mdui-checkbox>";
      card.appendChild(checkbox);
    }

    const content = document.createElement("div");
    content.className = "card-content";
    content.innerHTML = this.renderTemplate(this.config.template, row, index);
    card.appendChild(content);
    return card;
  }

  /**
   * @param {string} template
   * @param {Object} row
   * @param {number} index
   * @returns {string}
   */
  renderTemplate(template, row, index) {
    return template.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      let value = row[field];
      const column = this.config.columns.find((col) => col.field === field);
      if (column && column.formatter) {
        value = column.formatter(value, row, index);
      }
      return value != null ? value : "";
    });
  }

  /**
   * 卡片点击：忽略复选框与操作按钮
   * @param {MouseEvent} e
   */
  onClick(e) {
    if (
      e.target.closest(".card-checkbox") ||
      e.target.closest(".book-actions") ||
      e.target.closest("mdui-button-icon") ||
      e.target.closest("mdui-button") ||
      e.target.closest("a")
    ) {
      return;
    }
    const card = e.target.closest(".card-view-item");
    if (!card) return;
    const index = parseInt(card.dataset.index);
    const row = this.data[index];
    if (this.config.events.onCardClick) {
      this.config.events.onCardClick(row, index, e);
    }
  }

  /**
   * @param {Event} e
   */
  onCheck(e) {
    if (this._syncingCheck) return;
    const box = e.target.closest("mdui-checkbox");
    if (!box) return;
    const card = box.closest(".card-view-item");
    if (!card) return;
    const row = this.data[parseInt(card.dataset.index)];
    const next = this.selectData.filter((r) => r !== row);
    if (box.checked) next.push(row);
    this.setSelected(next);
  }

  /**
   * @param {Array<Object>} rows
   * @param {boolean=} silent - 为 true 时不触发 onSelect
   */
  setSelected(rows, silent = false) {
    this.selectData = rows;
    this._syncingCheck = true;
    this.cardsContainer.querySelectorAll(".card-view-item").forEach((card) => {
      const checked = rows.includes(this.data[parseInt(card.dataset.index)]);
      card.classList.toggle("selected", checked);
      const box = card.querySelector("mdui-checkbox");
      if (box && box.checked !== checked) box.checked = checked;
    });
    this._syncingCheck = false;
    if (!silent && this.config.events.onSelect) this.config.events.onSelect(rows);
    this.updateSelectionBarState();
  }

  selectAll() {
    if (!this.config || !this.config.selectable) return;
    this.setSelected(this.data.slice());
  }

  clearSelection() {
    if (!this.config || !this.config.selectable) return;
    this.setSelected([]);
  }

  /** 兼容旧命名 */
  unselectAll() {
    this.clearSelection();
  }

  updateSelectionBarState() {
    if (!this.selectionBar) return;
    const selectAllBtn = this.selectionBar.querySelector(".card-view-select-all");
    const clearAllBtn = this.selectionBar.querySelector(".card-view-clear-all");
    const countEl = this.selectionBar.querySelector(".card-view-selected-count");
    const total = this.data ? this.data.length : 0;
    const selected = this.selectData ? this.selectData.length : 0;

    if (selectAllBtn) selectAllBtn.disabled = total === 0 || selected >= total;
    if (clearAllBtn) clearAllBtn.disabled = selected === 0;
    if (countEl) countEl.textContent = selected > 0 ? `已选 ${selected}` : "";
  }

  getSelectedRows() {
    return this.selectData;
  }

  destroy() {
    this.cardsContainer.remove();
    this.selectionBar.remove();
    this.page.remove();
    this.element.classList.remove("cv");
    this.data = [];
    this.selectData = [];
  }

  getRow(index) {
    return this.data[index];
  }
}
