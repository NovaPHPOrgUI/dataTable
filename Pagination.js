/*
 * Copyright (c) 2025. Lorem ipsum dolor sit amet, consectetur adipiscing elit.
 * Morbi non lorem porttitor neque feugiat blandit. Ut vitae ipsum eget quam lacinia accumsan.
 * Etiam sed turpis ac ipsum condimentum fringilla. Maecenas magna.
 * Proin dapibus sapien vel ante. Aliquam erat volutpat. Pellentesque sagittis ligula eget metus.
 * Vestibulum commodo. Ut rhoncus gravida arcu.
 */

"use strict";

class Pagination extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.shadowRoot.innerHTML = `
            <div id="pagination" class="box page page-default"></div>
            <style>
                .box {
                    display: flex;
                    flex-direction: column; /* 改为列方向 */
                    justify-content: center;
                    align-items: center;
                    flex-wrap: wrap;
                    margin-top: 1rem;
                }
                .page-info{
                    margin-top: 0.5rem;
                }
                .page-container {
                    display: flex;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .page-container-list {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem; 
                }
                .page-curr {
                    background-color: rgba(var(--mdui-color-primary))!important; 
                    color: rgba(var(--mdui-color-on-primary)); 
                    font-weight: bold; 
                }
                .page-prev, .page-next, .page-btn {
                    padding: 0 10px;
                    margin: 0 5px; 
                }
                .disabled {
                    pointer-events: none;
                    color: rgba(var(--mdui-color-on-surface-variant), 0.5);
                }
                .page-item {
                    margin: 0.25rem;
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: var(--mdui-shape-corner-medium); 
                    display: flex;
                    justify-content: center;
                    min-width: 1rem;
                    background-color: rgba(var(--mdui-color-background)); 
                    box-shadow: var(--mdui-elevation-level1);
                    transition: background-color 0.3s, box-shadow 0.3s; 
                }
                .page-item:hover {
                    background-color: rgba(var(--mdui-color-secondary-container)); 
                    box-shadow: var(--mdui-elevation-level2);
                }
                .page-limits select {
                    margin-left: 10px;
                    padding: 0.25rem; 
                    border-radius: var(--mdui-shape-corner-medium); 
                    border: 1px solid rgba(var(--mdui-color-outline), 0.2); 
                    background-color: rgba(var(--mdui-color-background)); 
                    box-shadow: var(--mdui-elevation-level1);
                }
                .page-limits select:focus {
                    border-color: rgba(var(--mdui-color-primary), 0.8); 
                    box-shadow: var(--mdui-elevation-level2);
                }
                .page-count {
                    font-size: 0.875rem; 
                    color: rgba(var(--mdui-color-on-surface), 0.7); 
                    padding: 0.5rem; 
                }
                @media (max-width: 600px) {
                    .page-container-list {
                        flex-wrap: wrap; 
                        gap: 0.25rem; 
                    }
                    .page-item {
                        min-width: 2rem; 
                        padding: 0.25rem; 
                    }
                }
            </style>
        `;

const that = this;

    $.emitter.on('translate:set', () => {
        TranslateUtils.autoTranslate(this.shadowRoot);
    });
  }

  init(options) {
    this._layout = ["first", "prev", "pager", "next", "last"];
    this.options = Object.assign(
      {
        pageIndex: 1,
        pageSize: 10,
        pageSizes: [5, 10, 20, 50, 100],
        pageCount: 5,
        total: 0,
        layout: "first, prev, pager, next, last",
        showCount: true, // 新增参数，控制是否显示条目数
        showLimits: true, // 新增参数，控制是否显示分页数
        onPageChange: function (index, pageSize) {},
      },
      options,
    );

    this.element = this.shadowRoot.getElementById("pagination");
    this.pageNum = 0;
    this.render();
  }

  render() {
    this.pageNum = Math.ceil(this.options.total / this.options.pageSize);

    if (this.options.pageIndex > this.pageNum)
      this.options.pageIndex = this.pageNum;
    if (this.options.pageIndex <= 0) this.options.pageIndex = 1;

    this.element.innerHTML = ``;
    const container = this.createElement("div", "page-container-list");

    this.options.layout.split(",").forEach((v) => {
      const method = v.trim();
      if (this._layout.includes(method) && typeof this[method] === "function") {
        const element = this[method]();
        if (Array.isArray(element)) {
          element.forEach((item) => container.appendChild(item));
        } else if (element) container.appendChild(element);
      }
    });

    this.element.appendChild(container);

    // 创建第二行容器
    if (this.options.showCount || this.options.showLimits) {
      const infoContainer = this.createElement("div", [
        "page-container-list",
        "page-info",
      ]);
      if (this.options.showCount) {
        const countElement = this.count();
        infoContainer.appendChild(countElement);
      }
      if (this.options.showLimits) {
        const limitsElement = this.limits();
        infoContainer.appendChild(limitsElement);
      }
      this.element.appendChild(infoContainer);
    }
  }

  first() {
    const disabled = this.options.pageIndex <= 1 ? ["disabled"] : [];
    const element = this.createElement("span", ["page-item", ...disabled]);
    element.innerHTML = `<mdui-icon name="keyboard_double_arrow_left"></mdui-icon>`;
    element.addEventListener("click", () => {
      if (this.options.pageIndex > 1) {
        this.handleChangePage(1);
      }
    });
    return element;
  }

  prev() {
    const disabled = this.options.pageIndex <= 1 ? ["disabled"] : [];
    const element = this.createElement("span", ["page-item", ...disabled]);
    element.innerHTML = `<mdui-icon name="chevron_left"></mdui-icon>`;
    element.addEventListener("click", () => {
      if (this.options.pageIndex > 1) {
        this.handleChangePage(this.options.pageIndex - 1);
      }
    });
    return element;
  }

  pager() {
    const { min, max } = this.getBetween();
    const arrs = this.generateArray(min, max);

    let ret = [];
    arrs.forEach((v) => {
      let element = this.createElement("span", "page-item");
      if (v === this.options.pageIndex) {
        element.classList.add("page-curr");
      }

      element.innerText = v;

      if (v !== this.options.pageIndex) {
        element.addEventListener("click", () => {
          if (v !== this.options.pageIndex) {
            this.handleChangePage(v);
          }
        });
      }
      ret.push(element);
    });

    return ret;
  }

  next() {
    const disabled = this.options.pageIndex >= this.pageNum ? ["disabled"] : [];
    const element = this.createElement("span", ["page-item", ...disabled]);
    element.innerHTML = `<mdui-icon name="chevron_right"></mdui-icon>`;
    element.addEventListener("click", () => {
      if (this.options.pageIndex < this.pageNum) {
        this.handleChangePage(this.options.pageIndex + 1);
      }
    });
    return element;
  }

  last() {
    const disabled = this.options.pageIndex >= this.pageNum ? ["disabled"] : [];
    const element = this.createElement("span", ["page-item", ...disabled]);
    element.innerHTML = `<mdui-icon name="keyboard_double_arrow_right"></mdui-icon>`;
    element.addEventListener("click", () => {
      if (this.options.pageIndex < this.pageNum) {
        this.handleChangePage(this.pageNum);
      }
    });
    return element;
  }

  count() {
    const span = this.createElement("span", "page-count");
    span.innerText = `共 ${this.options.total} 条`;
    return span;
  }

  limits() {
    const span = this.createElement("mdui-dropdown", "page-limits");
    const button = this.createElement("mdui-button");
    button.setAttribute("slot", "trigger");
    button.setAttribute("variant", "text");
    button.innerText = `${this.options.pageSize} 条/页`;
    span.appendChild(button);

    const select = this.createElement("mdui-menu", "");
    select.setAttribute("selects", "single");
    select.setAttribute("value", `${this.options.pageSizes[0]}`);
    this.options.pageSizes.forEach((size) => {
      const option = this.createElement("mdui-menu-item", "");
      option.value = size;
      option.innerText = `${size} 条/页`;
      select.appendChild(option);
    });

    select.addEventListener("change", (event) => {
      this.options.pageSize = parseInt(event.target.value);
      this.handleChangePage(1);
    });

    span.appendChild(select);
    return span;
  }

  handleChangePage(index) {
    this.options.pageIndex = index;
    if (typeof this.options.onPageChange === "function") {
      this.options.onPageChange(index, this.options.pageSize);
    }
    this.render();
  }

  getBetween() {
    const half = Math.floor(this.options.pageCount / 2);
    let min = this.options.pageIndex - half;
    let max = this.options.pageIndex + half;

    if (min < 1) {
      min = 1;
      max = Math.min(this.pageNum, this.options.pageCount);
    }

    if (max > this.pageNum) {
      max = this.pageNum;
      min = Math.max(1, this.pageNum - this.options.pageCount + 1);
    }

    return { min, max };
  }

  generateArray(start, end) {
    const arr = [];
    for (let i = start; i <= end; i++) {
      arr.push(i);
    }
    return arr;
  }

  createElement(tag, classList) {
    const el = document.createElement(tag);
    if (Array.isArray(classList)) {
      classList.forEach((cls) => el.classList.add(cls));
    } else if (classList) {
      el.classList.add(classList);
    }
    return el;
  }
}

customElements.define("mdui-page-btn", Pagination);
