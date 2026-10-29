/**
 * 分页组件
 * 自定义元素 <mdui-page-btn>：上一页/下一页、带省略号的页码、总数、每页条数、跳页
 * 使用 light DOM，避免 Shadow DOM 里 mdui-dropdown 浮层坐标漂移
 * @file Pagination.js
 * @version 2.0.0
 */

/*
 * Copyright (c) 2025. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

"use strict";

const PG_STYLE_ID = "mdui-page-btn-style";

function ensurePaginationStyle() {
  if (document.getElementById(PG_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = PG_STYLE_ID;
  style.textContent = `
    mdui-page-btn { display: block; }
    mdui-page-btn .pg {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      margin-top: 0.75rem;
      padding: 0.25rem;
      font-size: var(--mdui-typescale-body-medium-size);
      line-height: var(--mdui-typescale-body-medium-line-height);
      color: rgb(var(--mdui-color-on-surface-variant));
    }
    mdui-page-btn .pg:empty { display: none; }
    mdui-page-btn .pg-info,
    mdui-page-btn .pg-nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.25rem;
    }
    mdui-page-btn .pg-count {
      padding: 0 0.25rem;
      white-space: nowrap;
    }
    mdui-page-btn .pg-limits {
      display: inline-flex;
      width: fit-content;
      max-width: max-content;
      vertical-align: middle;
    }
    mdui-page-btn .pg-btn {
      appearance: none;
      border: 0;
      margin: 0;
      padding: 0 0.5rem;
      min-width: 2.25rem;
      height: 2.25rem;
      border-radius: var(--mdui-shape-corner-full);
      background: transparent;
      color: rgb(var(--mdui-color-on-surface));
      font: inherit;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: background-color var(--mdui-motion-duration-short4) var(--mdui-motion-easing-standard),
                  color var(--mdui-motion-duration-short4) var(--mdui-motion-easing-standard);
    }
    mdui-page-btn .pg-btn:hover { background: rgba(var(--mdui-color-on-surface), 0.08); }
    mdui-page-btn .pg-btn:focus-visible {
      outline: 2px solid rgb(var(--mdui-color-primary));
      outline-offset: 2px;
    }
    mdui-page-btn .pg-btn[aria-current="page"] {
      background: rgb(var(--mdui-color-primary));
      color: rgb(var(--mdui-color-on-primary));
      font-weight: 600;
      cursor: default;
    }
    mdui-page-btn .pg-ellipsis {
      min-width: 2.25rem;
      text-align: center;
      color: rgb(var(--mdui-color-on-surface-variant));
      user-select: none;
    }
    mdui-page-btn .pg-jump {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      margin-left: 0.5rem;
      white-space: nowrap;
    }
    mdui-page-btn .pg-jump input {
      width: 3rem;
      height: 2rem;
      padding: 0 0.5rem;
      border: 1px solid rgb(var(--mdui-color-outline));
      border-radius: var(--mdui-shape-corner-small);
      background: rgb(var(--mdui-color-surface));
      color: rgb(var(--mdui-color-on-surface));
      font: inherit;
      text-align: center;
      -moz-appearance: textfield;
    }
    mdui-page-btn .pg-jump input::-webkit-outer-spin-button,
    mdui-page-btn .pg-jump input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    mdui-page-btn .pg-jump input:focus {
      outline: none;
      border-color: rgb(var(--mdui-color-primary));
      box-shadow: 0 0 0 1px rgb(var(--mdui-color-primary));
    }
    @media (max-width: 600px) {
      mdui-page-btn .pg {
        justify-content: center;
        flex-direction: column;
        align-items: stretch;
        gap: 0.375rem;
      }
      mdui-page-btn .pg-info,
      mdui-page-btn .pg-nav {
        justify-content: center;
        width: 100%;
      }
      mdui-page-btn .pg-jump { display: none; }
      mdui-page-btn .pg-btn {
        min-width: 2.5rem;
        height: 2.5rem;
      }
      mdui-page-btn .pg-count { font-size: 0.8125rem; }
    }
  `;
  document.head.appendChild(style);
}

class Pagination extends HTMLElement {
  constructor() {
    super();
    // createElement('mdui-page-btn') 时构造函数不能往 light DOM 塞子节点
    // （Shadow DOM 可以；这里为了 mdui-dropdown 定位才用 light DOM）
    ensurePaginationStyle();

    this._compactMq = window.matchMedia("(max-width: 600px)");
    this._onCompactChange = () => {
      if (this.options) this.render();
    };
    if (this._compactMq.addEventListener) {
      this._compactMq.addEventListener("change", this._onCompactChange);
    } else {
      this._compactMq.addListener(this._onCompactChange);
    }

    $.emitter.on("translate:set", () => {
      TranslateUtils.autoTranslate(this);
    });
  }

  /** 确保导航根节点存在（init / connected 时再建） */
  ensureRoot() {
    let nav = this.querySelector(":scope > .pg");
    if (!nav) {
      nav = document.createElement("nav");
      nav.className = "pg";
      nav.setAttribute("aria-label", "分页");
      this.appendChild(nav);
    }
    this.element = nav;
    return nav;
  }

  connectedCallback() {
    this.ensureRoot();
  }

  /**
   * 窄屏压缩页码窗口
   * @returns {number}
   */
  effectivePageCount() {
    const base = Math.max(3, this.options.pageCount || 5);
    return this._compactMq && this._compactMq.matches ? Math.min(base, 3) : base;
  }

  /**
   * 初始化分页组件
   * @param {Object} options
   * @param {number} options.pageIndex - 当前页码
   * @param {number} options.pageSize - 每页显示条数
   * @param {Array<number>} options.pageSizes - 每页条数选项
   * @param {number} options.pageCount - 当前页两侧最多显示的页码数量（含当前页）
   * @param {number} options.total - 总记录数
   * @param {string} options.layout - 布局：first, prev, pager, next, last, jumper
   * @param {boolean} options.showCount - 是否显示总条数
   * @param {boolean} options.showLimits - 是否显示每页条数选择器
   * @param {Function} options.onPageChange - 页码改变回调 (index, pageSize)
   */
  init(options) {
    this._layout = ["first", "prev", "pager", "next", "last", "jumper"];
    this.options = Object.assign(
      {
        pageIndex: 1,
        pageSize: 10,
        pageSizes: [5, 10, 20, 50, 100],
        pageCount: 5,
        total: 0,
        layout: "prev, pager, next, jumper",
        showCount: true,
        showLimits: true,
        onPageChange: function (index, pageSize) {},
      },
      options,
    );

    this.ensureRoot();
    this.pageNum = 0;
    this.render();
  }

  render() {
    this.pageNum = Math.max(1, Math.ceil(this.options.total / this.options.pageSize));
    this.options.pageIndex = Math.min(Math.max(1, this.options.pageIndex), this.pageNum);

    this.element.innerHTML = "";

    if (this.options.showCount || this.options.showLimits) {
      const info = this.createElement("div", "pg-info");
      if (this.options.showCount) info.appendChild(this.count());
      if (this.options.showLimits) info.appendChild(this.limits());
      this.element.appendChild(info);
    }

    const nav = this.createElement("div", "pg-nav");
    this.options.layout.split(",").forEach((v) => {
      const method = v.trim();
      if (!this._layout.includes(method)) return;
      const element = this[method]();
      if (Array.isArray(element)) {
        element.forEach((item) => nav.appendChild(item));
      } else if (element) {
        nav.appendChild(element);
      }
    });
    this.element.appendChild(nav);
  }

  /**
   * @param {string} icon
   * @param {string} label
   * @param {number} target
   * @param {boolean} disabled
   * @returns {HTMLElement}
   */
  iconButton(icon, label, target, disabled) {
    const btn = this.createElement("mdui-button-icon", "pg-icon");
    btn.setAttribute("icon", icon);
    btn.setAttribute("aria-label", label);
    btn.disabled = disabled;
    btn.addEventListener("click", () => this.handleChangePage(target));
    return btn;
  }

  first() {
    return this.iconButton("first_page", "首页", 1, this.options.pageIndex <= 1);
  }

  prev() {
    return this.iconButton("chevron_left", "上一页", this.options.pageIndex - 1, this.options.pageIndex <= 1);
  }

  next() {
    return this.iconButton("chevron_right", "下一页", this.options.pageIndex + 1, this.options.pageIndex >= this.pageNum);
  }

  last() {
    return this.iconButton("last_page", "末页", this.pageNum, this.options.pageIndex >= this.pageNum);
  }

  /**
   * @returns {Array<HTMLElement>}
   */
  pager() {
    return this.pageItems().map((v) => {
      if (v === "…") {
        const gap = this.createElement("span", "pg-ellipsis");
        gap.textContent = "…";
        return gap;
      }
      const btn = this.createElement("button", "pg-btn");
      btn.type = "button";
      btn.textContent = v;
      btn.setAttribute("aria-label", `第 ${v} 页`);
      if (v === this.options.pageIndex) {
        btn.setAttribute("aria-current", "page");
      } else {
        btn.addEventListener("click", () => this.handleChangePage(v));
      }
      return btn;
    });
  }

  /**
   * @returns {Array<number|string>}
   */
  pageItems() {
    const total = this.pageNum;
    const count = this.effectivePageCount();
    if (total <= count + 2) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const half = Math.floor(count / 2);
    let start = Math.max(2, this.options.pageIndex - half);
    let end = Math.min(total - 1, start + count - 1);
    start = Math.max(2, end - count + 1);

    const items = [1];
    if (start > 2) items.push("…");
    for (let i = start; i <= end; i++) items.push(i);
    if (end < total - 1) items.push("…");
    items.push(total);
    return items;
  }

  /**
   * @returns {HTMLElement|null}
   */
  jumper() {
    if (this.pageNum <= this.effectivePageCount() + 2) return null;
    const label = this.createElement("label", "pg-jump");
    const input = document.createElement("input");
    input.type = "number";
    input.min = 1;
    input.max = this.pageNum;
    input.setAttribute("aria-label", "跳转到页");
    const go = () => {
      const target = Math.min(Math.max(1, parseInt(input.value) || 1), this.pageNum);
      input.value = "";
      if (target !== this.options.pageIndex) this.handleChangePage(target);
    };
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") go();
    });
    input.addEventListener("blur", () => {
      if (input.value !== "") go();
    });
    label.append("跳至", input, "页");
    return label;
  }

  count() {
    const span = this.createElement("span", "pg-count");
    span.textContent = `共 ${this.options.total} 条`;
    return span;
  }

  limits() {
    const dropdown = this.createElement("mdui-dropdown", "pg-limits");
    dropdown.setAttribute("placement", "top-start");

    const button = this.createElement("mdui-button");
    button.setAttribute("slot", "trigger");
    button.setAttribute("variant", "text");
    button.setAttribute("end-icon", "expand_more");
    button.textContent = `${this.options.pageSize} 条/页`;
    dropdown.appendChild(button);

    const menu = this.createElement("mdui-menu");
    menu.setAttribute("selects", "single");
    menu.setAttribute("value", `${this.options.pageSize}`);
    this.options.pageSizes.forEach((size) => {
      const option = this.createElement("mdui-menu-item");
      option.value = `${size}`;
      option.textContent = `${size} 条/页`;
      menu.appendChild(option);
    });
    menu.addEventListener("change", (event) => {
      const size = parseInt(event.target.value);
      if (!size || size === this.options.pageSize) return;
      this.options.pageSize = size;
      this.handleChangePage(1);
    });

    dropdown.appendChild(menu);
    return dropdown;
  }

  /**
   * @param {number} index
   */
  handleChangePage(index) {
    this.options.pageIndex = index;
    if (typeof this.options.onPageChange === "function") {
      this.options.onPageChange(index, this.options.pageSize);
    }
    this.render();
  }

  /**
   * @param {string} tag
   * @param {string=} className
   * @returns {HTMLElement}
   */
  createElement(tag, className) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }
}

if (!customElements.get("mdui-page-btn")) {
  customElements.define("mdui-page-btn", Pagination);
}
