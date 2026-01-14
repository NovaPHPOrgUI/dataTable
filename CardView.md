# CardView 使用文档

## 核心设计

```
模板控制布局 + columns 控制格式化 = 完美结合
```

- **template**：定义 HTML 结构，用 `{{field}}` 标记字段位置
- **columns**：配置字段的 formatter，保持 DataTable 风格
- **零冗余**：每个字段只需在 columns 中配置一次

---

## 快速开始

```javascript
const cardView = new CardView('#container');
cardView.load({
  uri: '/api/users',
  
  // 模板：控制布局
  template: `
    <div class="user-card">
      <h3>{{name}}</h3>
      <p>{{email}}</p>
      <span>{{status}}</span>
    </div>
  `,
  
  // columns：控制格式化
  columns: [
    { field: 'name', name: '姓名' },
    { field: 'email', name: '邮箱' },
    { 
      field: 'status', 
      name: '状态',
      formatter: (val) => `<span class="badge-${val}">${val}</span>`
    }
  ]
});
```

---

## 从 DataTable 迁移

### 原 DataTable 代码

```javascript
const table = new DataTable('#container');
table.load({
  uri: '/api/data',
  columns: [
    { field: 'name', name: '姓名', align: 'left', width: 200 },
    { field: 'email', name: '邮箱', align: 'left' },
    { 
      field: 'status', 
      name: '状态',
      formatter: (val) => val === 1 ? '活跃' : '禁用'
    }
  ],
  mobile: true,
  events: {
    onRowClick: (row) => { console.log(row); }
  }
});
```

### 迁移到 CardView

```javascript
const cardView = new CardView('#container');
cardView.load({
  uri: '/api/data',
  
  // 新增：定义模板
  template: `
    <div class="my-card">
      <div class="name">{{name}}</div>
      <div class="email">{{email}}</div>
      <div class="status">{{status}}</div>
    </div>
  `,
  
  // columns 保持不变（删除 align, width）
  columns: [
    { field: 'name', name: '姓名' },
    { field: 'email', name: '邮箱' },
    { 
      field: 'status', 
      name: '状态',
      formatter: (val) => val === 1 ? '活跃' : '禁用'
    }
  ],
  
  // 事件名改变
  events: {
    onCardClick: (row) => { console.log(row); }
  }
});
```

---

## 完整配置

```javascript
cardView.load({
  // 数据源（必填）
  uri: '/api/users',
  
  // HTML 模板（必填）
  template: `
    <div class="card-header">
      <img src="{{avatar}}" class="avatar">
      <div class="info">
        <h3>{{name}}</h3>
        <p>{{email}}</p>
      </div>
    </div>
    <div class="card-body">
      <div class="role">{{role}}</div>
      <div class="status">{{status}}</div>
    </div>
    <div class="card-footer">
      <span>{{createdAt}}</span>
    </div>
  `,
  
  // 列配置（必填）- 保持 DataTable 风格
  columns: [
    { 
      field: 'avatar',
      name: '头像',
      formatter: (val) => val || '/default-avatar.png'
    },
    { field: 'name', name: '姓名' },
    { field: 'email', name: '邮箱' },
    { field: 'role', name: '角色' },
    { 
      field: 'status',
      name: '状态',
      formatter: (val, row, index) => {
        const colors = { active: 'green', inactive: 'red' };
        return `<span style="color:${colors[val]}">${val}</span>`;
      }
    },
    {
      field: 'createdAt',
      name: '创建时间',
      formatter: (val) => new Date(val).toLocaleDateString('zh-CN')
    }
  ],
  
  // 是否可选择
  selectable: true,
  
  // 卡片最小宽度
  cardWidth: '350px',
  
  // 事件回调
  events: {
    onCardClick: function(row, index) {
      console.log('点击:', row);
    },
    onSelect: function(selectedRows) {
      console.log('选中:', selectedRows);
    },
    onPaged: function(pageIndex, pageSize) {
      console.log('分页:', pageIndex, pageSize);
    }
  },
  
  // 其他配置
  empty_msg: '暂无数据',
  params: { status: 'active' },
  headers: { 'Authorization': 'Bearer token' },
  page: true,
  pageSizes: [12, 24, 48, 96]
});
```

---

## 模板语法

### 基础用法

```javascript
template: `
  <div>
    {{name}}    // 字段名必须在 columns 中存在
    {{email}}   // 会自动查找对应的 formatter
    {{custom}}  // 如果没有 formatter，直接显示原始值
  </div>
`
```

### 复杂布局

```javascript
template: `
  <div class="product-card">
    <!-- 头部 -->
    <div class="header">
      <img src="{{image}}" alt="{{name}}">
      <span class="price">¥{{price}}</span>
    </div>
    
    <!-- 内容 -->
    <div class="body">
      <h4>{{name}}</h4>
      <p>{{description}}</p>
    </div>
    
    <!-- 底部 -->
    <div class="footer">
      <div class="tags">{{tags}}</div>
      <button onclick="buy({{id}})">购买</button>
    </div>
  </div>
`,

columns: [
  { field: 'id', name: 'ID' },
  { field: 'image', name: '图片' },
  { field: 'name', name: '名称' },
  { 
    field: 'price',
    name: '价格',
    formatter: (val) => parseFloat(val).toFixed(2)
  },
  {
    field: 'description',
    name: '描述',
    formatter: (val) => val.substring(0, 100) + '...'
  },
  {
    field: 'tags',
    name: '标签',
    formatter: (val) => {
      if (!Array.isArray(val)) return '';
      return val.map(tag => `<span class="tag">${tag}</span>`).join('');
    }
  }
]
```

---

## 高级用法

### 1. 条件渲染

```javascript
columns: [
  {
    field: 'status',
    name: '状态',
    formatter: (val, row) => {
      if (val === 'active') return '<span class="badge-success">活跃</span>';
      if (val === 'pending') return '<span class="badge-warning">待审核</span>';
      return '<span class="badge-error">禁用</span>';
    }
  },
  {
    field: 'actions',
    name: '操作',
    formatter: (val, row) => {
      if (!row.canEdit) return '<span class="muted">无权限</span>';
      return `
        <button onclick="edit(${row.id})">编辑</button>
        <button onclick="del(${row.id})">删除</button>
      `;
    }
  }
]
```

### 2. 嵌套数据

```javascript
// 数据结构：{ user: { name: '张三', avatar: '...' }, meta: { views: 100 } }

template: `
  <div>
    <img src="{{userAvatar}}">
    <h3>{{userName}}</h3>
    <p>{{stats}}</p>
  </div>
`,

columns: [
  {
    field: 'userName',
    name: '用户名',
    formatter: (val, row) => row.user.name
  },
  {
    field: 'userAvatar',
    name: '头像',
    formatter: (val, row) => row.user.avatar
  },
  {
    field: 'stats',
    name: '统计',
    formatter: (val, row) => `${row.meta.views} 浏览`
  }
]
```

### 3. Material Design 风格

```javascript
template: `
  <mdui-card variant="elevated" clickable>
    <div style="padding: 16px;">
      <!-- 头部 -->
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
        <mdui-avatar src="{{avatar}}"></mdui-avatar>
        <div>
          <div style="font-weight: 500;">{{name}}</div>
          <div style="font-size: 12px; color: var(--mdui-color-on-surface-variant);">
            {{email}}
          </div>
        </div>
      </div>
      
      <!-- 内容 -->
      <div style="margin-bottom: 12px;">{{description}}</div>
      
      <!-- 标签 -->
      <div style="display: flex; gap: 8px;">
        {{roleChip}}
        {{statusChip}}
      </div>
    </div>
  </mdui-card>
`,

columns: [
  { field: 'avatar', name: '头像' },
  { field: 'name', name: '姓名' },
  { field: 'email', name: '邮箱' },
  { field: 'description', name: '描述' },
  {
    field: 'roleChip',
    name: '角色',
    formatter: (val, row) => `<mdui-chip>${row.role}</mdui-chip>`
  },
  {
    field: 'statusChip',
    name: '状态',
    formatter: (val, row) => {
      const variant = row.status === 'active' ? 'outlined' : 'filled';
      return `<mdui-chip variant="${variant}">${row.status}</mdui-chip>`;
    }
  }
]
```

### 4. 响应式布局

```javascript
template: `
  <div class="responsive-card">
    <div class="card-grid">
      <div class="col-image">
        <img src="{{image}}" alt="{{title}}">
      </div>
      <div class="col-info">
        <h3>{{title}}</h3>
        <p>{{content}}</p>
        <div class="meta">{{date}} · {{author}}</div>
      </div>
    </div>
  </div>
`,

columns: [
  { field: 'image', name: '图片' },
  { field: 'title', name: '标题' },
  { field: 'content', name: '内容' },
  { 
    field: 'date',
    name: '日期',
    formatter: (val) => new Date(val).toLocaleDateString()
  },
  { field: 'author', name: '作者' }
]
```

```css
/* 对应的 CSS */
.card-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 768px) {
  .card-grid {
    grid-template-columns: 200px 1fr;
  }
}

.col-image img {
  width: 100%;
  height: auto;
  border-radius: 8px;
}
```

---

## API 方法

```javascript
// 重新加载数据
cardView.reload();

// 更新参数并重新加载
cardView.reload({ keyword: 'search' });

// 重置分页
cardView.reload(undefined, true);

// 获取指定索引的数据
const row = cardView.getRow(0);

// 获取选中的数据
const selected = cardView.getSelectedRows();

// 销毁实例
cardView.destroy();
```

---

## 样式自定义

### 全局配置

```javascript
cardView.load({
  cardWidth: '400px',  // 卡片最小宽度
  // ...
});
```

### CSS 变量

```css
.card-view-container {
  --card-min-width: 350px;
}
```

### 卡片样式

```css
/* 修改卡片基础样式 */
.card-view-item {
  border-radius: 16px;
  padding: 24px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

/* 修改悬停效果 */
.card-view-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.15);
}

/* 修改选中状态 */
.card-view-item.selected {
  border: 2px solid #2196f3;
  background: rgba(33, 150, 243, 0.05);
}

/* 修改卡片间距 */
.card-view-container {
  gap: 24px;
  padding: 24px 0;
}
```

### 模板内样式

直接在模板中写样式或类名：

```javascript
template: `
  <div style="display: flex; align-items: center; gap: 16px;">
    <img src="{{avatar}}" style="width: 60px; height: 60px; border-radius: 50%;">
    <div>
      <h3 style="margin: 0; font-size: 18px;">{{name}}</h3>
      <p style="margin: 4px 0 0; color: #666;">{{email}}</p>
    </div>
  </div>
`
```

---

## 最佳实践

### 1. 字段命名规范

```javascript
// ✅ 好：语义化字段名
columns: [
  { field: 'userName', name: '用户名' },
  { field: 'userAvatar', name: '头像' }
]

// ❌ 不好：模糊的字段名
columns: [
  { field: 'field1', name: '字段1' },
  { field: 'data', name: '数据' }
]
```

### 2. formatter 保持纯函数

```javascript
// ✅ 好：纯函数，无副作用
formatter: (val) => val ? '是' : '否'

// ❌ 不好：有副作用
formatter: (val) => {
  window.someGlobal = val;  // 副作用
  return val;
}
```

### 3. XSS 防护

```javascript
// 如果数据来自用户输入，转义 HTML
columns: [
  {
    field: 'userInput',
    name: '用户输入',
    formatter: (val) => {
      const div = document.createElement('div');
      div.textContent = val;
      return div.innerHTML;
    }
  }
]
```

### 4. 性能优化

```javascript
// 避免在 formatter 中做重计算
// ❌ 不好
formatter: (val) => expensiveComputation(val)

// ✅ 好：缓存结果
formatter: (() => {
  const cache = new Map();
  return (val, row) => {
    const key = row.id;
    if (!cache.has(key)) {
      cache.set(key, expensiveComputation(val));
    }
    return cache.get(key);
  };
})()
```

---

## 常见问题

**Q: 模板中的字段必须在 columns 中定义吗？**
```javascript
// 不必须。如果 columns 中没有，直接显示原始值
template: `<div>{{name}} {{age}}</div>`  // age 没在 columns 里也可以

columns: [
  { field: 'name', name: '姓名' }
  // age 不需要定义，会直接显示
]
```

**Q: 如何隐藏某个字段？**
```javascript
// 方法1：不在模板中使用
template: `<div>{{name}}</div>`  // 只显示 name，不显示 email

// 方法2：使用 hidden 属性（虽然对模板无效，但保持风格一致）
columns: [
  { field: 'id', name: 'ID', hidden: true }
]
```

**Q: 如何实现点击卡片内的按钮？**
```javascript
template: `
  <div>
    {{name}}
    <button onclick="handleEdit({{id}})" data-id="{{id}}">编辑</button>
  </div>
`

// 全局定义函数
window.handleEdit = function(id) {
  console.log('编辑', id);
};

// 或使用事件委托
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-id]')) {
    const id = e.target.dataset.id;
    console.log('编辑', id);
  }
});
```

**Q: 如何实现排序？**
```html
<!-- 添加独立的排序控件 -->
<select onchange="cardView.reload({ sortBy: this.value })">
  <option value="name">按名称</option>
  <option value="date">按日期</option>
</select>

<div id="container"></div>
```

---

## 设计哲学

这个设计遵循三个原则：

### 1. 关注点分离

```
模板 -> 负责布局
columns -> 负责数据处理
组件 -> 负责渲染和状态
```

### 2. 数据驱动

```
数据 -> formatter -> 模板 -> DOM
```

### 3. 简单性

```
template: 字符串
columns: 数组
renderTemplate: 正则替换
```

---

**这才是"好品味"的代码！**
