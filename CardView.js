/**
 * 卡片视图组件
 * 以卡片形式展示数据，支持分页、选择、点击事件
 * @file CardView.js
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
 * 卡片视图类
 * 提供卡片式数据展示，包括数据加载、渲染、分页、选择等
 */
class CardView {
  /**
   * 构造函数
   * @param {string} id - 容器的CSS选择器
   */
  constructor(id) {
    /** @type {HTMLElement} 容器元素 */
    this.element = document.querySelector(id);

    if (!this.element) {
      console.error("Element not found");
      return;
    }

    /** @type {HTMLElement} 卡片容器 */
    this.cardsContainer = document.createElement("div");
    this.cardsContainer.className = "card-view-container";
    this.element.appendChild(this.cardsContainer);

    /** @type {HTMLElement} 分页组件元素 */
    this.page = document.createElement("mdui-page-btn");
    this.page.id = "page" + Math.random().toString(36).substring(2);
    this.element.appendChild(this.page);

    /** @type {Array} 选中的数据 */
    this.selectData = [];
  }

  /**
   * 列配置对象
   * @typedef {Object} Column
   * @property {string}  field      字段名
   * @property {string}  name       显示文本
   * @property {boolean} [hidden]   是否隐藏（默认false）
   * @property {(value:any, row?:any)=>string} [formatter]
   *   可选：自定义渲染函数，返回渲染后字符串
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
   * @property {Object=}  params                  [可选] 请求参数
   * @property {Object=}  headers                 [可选] 请求头
   * @property {number[]=} pageSizes              [可选] 分页大小选项
   * @property {boolean=} page                    [可选] 是否启用分页
   */

  /**
   * 加载配置和数据
   * @param {CardViewOptions} config - 配置对象
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
            events: {
              onCardClick: function (row, index) {},
              onPaged: function (page) {},
              onSelect: function (rows) {},
            },
            empty_msg: "空空如也",
            params: {},
            headers: {},
            pageSizes: [10, 20, 50, 100],
            page: true,
          },
          config,
        );

        that.currentPage = parseInt($.url.getParam("page") || "1");
        that.pageSize = parseInt(
          $.url.getParam("size") || that.config.pageSizes[0],
        );

        if (!that.config.page) {
          that.page.style.display = "none";
        }

        that.data = [];
        that.totalRecords = 0;
        that.loadData((loading) => {
          try {
            that.renderCards();
            loading.close();
          } catch (e) {
            $.logger.error(e);
          }
        });
      },
    );
  }

  /**
   * 加载数据
   * @param {Function} callback - 加载完成后的回调函数
   */
  loadData(callback) {
    this.selectData = [];
    if (this.config.events.onSelect)
      this.config.events.onSelect(this.selectData);
    let that = this;
    const loading = new Loading(this.element);
    loading.show();
    this.fetchData(() => {
      callback(loading);
    });
  }

  /**
   * 重新加载数据
   * @param {Object} params - 请求参数
   * @param {boolean} reloadPage - 是否重新渲染分页
   */
  reload(params = undefined, reloadPage = false) {
    this.config.params = params || this.config.params;
    if (reloadPage) {
      this.currentPage = 1;
    }
    let that = this;
    this.loadData((loading) => {
      that.renderCards();
      if (reloadPage && that.config.page) {
        that.renderPage();
      }
      loading.close();
    });
  }

  /**
   * 获取数据
   * @param {Function} callback - 获取完成后的回调函数
   */
  fetchData(callback) {
    this.data = [];
    this.totalRecords = 0;

    const data = Object.assign(
      {
        page: this.currentPage,
        pageSize: this.pageSize,
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

        that.reload(that.config.params);
        if (that.config.events.onPaged) that.config.events.onPaged(index, pageSize);
      },
    });
  }

  /**
   * 渲染卡片
   */
  renderCards() {
    this.cardsContainer.innerHTML = "";
    this.cardsContainer.style.setProperty(
      "--card-min-width",
      this.config.cardWidth,
    );

    if (this.data.length === 0) {
      this.renderEmpty();
      return;
    }

    let that = this;
    this.data.forEach((row, index) => {
      const card = that.buildCard(row, index);
      that.cardsContainer.appendChild(card);
    });

    if (that.config.page) {
      that.renderPage();
    }
  }

  /**
   * 渲染空状态
   */
  renderEmpty() {
    const empty = document.createElement("div");
    empty.className = "card-view-empty";
    empty.innerHTML = `
      <div class="empty-icon">📭</div>
      <div class="empty-text">${this.config.empty_msg}</div>
    `;
    this.cardsContainer.appendChild(empty);
  }

  /**
   * 构建单个卡片
   * @param {Object} row - 行数据
   * @param {number} index - 索引
   * @returns {HTMLElement} 卡片元素
   */
  buildCard(row, index) {
    const card = document.createElement("div");
    card.className = "card-view-item";
    card.style.boxSizing = ""
    card.setAttribute("data-index", index);

    // 如果可选择，添加选择指示器
    if (this.config.selectable) {
      const checkbox = document.createElement("div");
      checkbox.className = "card-checkbox";
      checkbox.innerHTML = '<mdui-checkbox></mdui-checkbox>';
      card.appendChild(checkbox);

      const checkboxInput = checkbox.querySelector("mdui-checkbox");
      checkboxInput.addEventListener("change", (e) => {
        e.stopPropagation();
        this.toggleSelect(row, card);
      });
    }

    // 渲染模板内容
    const content = document.createElement("div");
    content.className = "card-content";
    content.innerHTML = this.renderTemplate(this.config.template, row, index);
    card.appendChild(content);

    // 点击事件
    card.addEventListener("click", () => {
      if (this.config.events.onCardClick) {
        this.config.events.onCardClick(row, index);
      }
    });

    return card;
  }

  /**
   * 渲染模板
   * @param {string} template - 模板字符串
   * @param {Object} row - 数据行
   * @param {number} index - 索引
   * @returns {string} 渲染后的HTML
   */
  renderTemplate(template, row, index) {
    let html = template;

    // 替换所有 {{field}} 标记
    html = html.replace(/\{\{(\w+)\}\}/g, (match, field) => {
      let value = row[field];

      // 查找是否有对应的 column 配置
      const column = this.config.columns.find(col => col.field === field);
      
      // 如果有格式化函数，先格式化
      if (column && column.formatter) {
        value = column.formatter(value, row, index);
      }

      // 返回值，如果为 null/undefined 返回空字符串
      return value !== null && value !== undefined ? value : "";
    });

    return html;
  }

  /**
   * 切换卡片选中状态
   * @param {Object} row - 行数据
   * @param {HTMLElement} card - 卡片元素
   */
  toggleSelect(row, card) {
    const checkbox = card.querySelector("mdui-checkbox");
    const isChecked = checkbox.checked;

    if (isChecked) {
      card.classList.add("selected");
      if (!this.selectData.includes(row)) {
        this.selectData.push(row);
      }
    } else {
      card.classList.remove("selected");
      const index = this.selectData.indexOf(row);
      if (index > -1) {
        this.selectData.splice(index, 1);
      }
    }

    if (this.config.events.onSelect) {
      this.config.events.onSelect(this.selectData);
    }
  }

  /**
   * 获取选中的数据
   * @returns {Array<Object>} 选中的数据数组
   */
  getSelectedRows() {
    return this.selectData;
  }

  /**
   * 销毁实例
   */
  destroy() {
    this.cardsContainer.innerHTML = "";
    this.page.innerHTML = "";
  }

  /**
   * 获取指定索引的数据
   * @param {number} index - 索引
   * @returns {Object} 数据对象
   */
  getRow(index) {
    return this.data[index];
  }
}
