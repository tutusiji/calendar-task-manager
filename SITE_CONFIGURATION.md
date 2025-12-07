# 站点配置说明

## 概述

为了支持在不同场合部署时使用不同的站点名称、标语等信息，我们将所有站点相关的文本配置化到环境变量中。

## 配置文件

### 1. 环境变量文件

#### `.env` (本地开发环境)
```env
# Site Configuration - 站点配置
NEXT_PUBLIC_APP_NAME=OxHorse Planner
NEXT_PUBLIC_APP_SUBTITLE=牛马日记
NEXT_PUBLIC_APP_SLOGAN=打工人必备的轻量任务管理工具
NEXT_PUBLIC_PAGE_TITLE=OxHorse Planner - 牛马日记
```

**注意**：`pageDescription`（SEO 描述）会自动组合为：`应用名称 副标题 —— 标语` 的格式，无需单独配置。

#### `.env.example` (示例配置)
包含所有配置项的说明和默认值，用于参考和快速部署。

### 2. 配置管理文件

#### `lib/site-config.ts`
统一管理站点配置，从环境变量中读取，提供默认值。

```typescript
export const siteConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'OxHorse Planner',
  appSubtitle: process.env.NEXT_PUBLIC_APP_SUBTITLE || '牛马日记',
  appSlogan: process.env.NEXT_PUBLIC_APP_SLOGAN || '打工人必备的轻量任务管理工具',
  pageTitle: process.env.NEXT_PUBLIC_PAGE_TITLE || 'OxHorse Planner - 牛马日记',
  // pageDescription 自动组合完整格式
  get pageDescription() {
    return `${this.appName} ${this.appSubtitle} —— ${this.appSlogan}`
  },
  get logoAlt() {
    return `${this.appName} Logo`
  },
  get fullTitle() {
    return `${this.appSubtitle} —— ${this.appSlogan}`
  }
}
```

## 配置项说明

| 环境变量 | 说明 | 使用位置 | 默认值 |
|---------|------|---------|--------|
| `NEXT_PUBLIC_APP_NAME` | 应用名称 | Logo旁边、页面标题 | OxHorse Planner |
| `NEXT_PUBLIC_APP_SUBTITLE` | 应用副标题 | 登录页完整标题 | 牛马日记 |
| `NEXT_PUBLIC_APP_SLOGAN` | 应用标语/描述 | Logo下方、登录页 | 打工人必备的轻量任务管理工具 |

**SEO 描述**：自动组合为 `应用名称 副标题 —— 标语` 格式
| `NEXT_PUBLIC_PAGE_TITLE` | 页面标题 | 浏览器标签页 | OxHorse Planner - 牛马日记 |

## 使用方式

### 在组件中使用

```typescript
import { siteConfig } from '@/lib/site-config'

// 使用应用名称
<h1>{siteConfig.appName}</h1>

// 使用标语
<p>{siteConfig.appSlogan}</p>

// 使用完整标题（副标题 + 标语）
<p>{siteConfig.fullTitle}</p>

// 使用 Logo Alt 文本
<Image src="/logo.png" alt={siteConfig.logoAlt} />
```

### 在 metadata 中使用

```typescript
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: siteConfig.pageTitle,
  description: siteConfig.pageDescription,
}
```

## 已更新的文件

### 1. `app/layout.tsx`
- ✅ 页面标题（浏览器标签页）
- ✅ 页面描述（SEO）

### 2. `app/page.tsx`
- ✅ Logo Alt 文本
- ✅ 应用名称（Logo旁边）
- ✅ 应用标语（Logo下方）

### 3. `app/login/page.tsx`
- ✅ Logo Alt 文本
- ✅ 应用名称（大标题）
- ✅ 完整标题（副标题 + 标语）

## 不同部署场景示例

### 场景 1：公司内部部署
```env
NEXT_PUBLIC_APP_NAME=任务管理系统
NEXT_PUBLIC_APP_SUBTITLE=企业版
NEXT_PUBLIC_APP_SLOGAN=高效协作，轻松管理
NEXT_PUBLIC_PAGE_TITLE=任务管理系统 - 企业版
```

### 场景 2：个人使用
```env
NEXT_PUBLIC_APP_NAME=我的日程
NEXT_PUBLIC_APP_SUBTITLE=个人版
NEXT_PUBLIC_APP_SLOGAN=简单高效的个人任务管理
NEXT_PUBLIC_PAGE_TITLE=我的日程 - 个人版
```

### 场景 3：团队协作
```env
NEXT_PUBLIC_APP_NAME=TeamPlanner
NEXT_PUBLIC_APP_SUBTITLE=团队协作
NEXT_PUBLIC_APP_SLOGAN=让团队协作更简单
NEXT_PUBLIC_PAGE_TITLE=TeamPlanner - 团队协作
```

## 部署步骤

### 1. 本地开发
1. 复制 `.env.example` 为 `.env`
2. 根据需要修改配置项
3. 重启开发服务器

### 2. Docker 部署
在 `docker-compose.yml` 中添加环境变量：

```yaml
services:
  app:
    environment:
      - NEXT_PUBLIC_APP_NAME=你的应用名称
      - NEXT_PUBLIC_APP_SUBTITLE=你的副标题
      - NEXT_PUBLIC_APP_SLOGAN=你的标语
      - NEXT_PUBLIC_PAGE_TITLE=你的页面标题
```

### 3. 生产环境
在服务器上设置环境变量：

```bash
export NEXT_PUBLIC_APP_NAME="你的应用名称"
export NEXT_PUBLIC_APP_SUBTITLE="你的副标题"
export NEXT_PUBLIC_APP_SLOGAN="你的标语"
export NEXT_PUBLIC_PAGE_TITLE="你的页面标题"
```

或在 `.env.production` 文件中配置。

## 注意事项

### 1. 环境变量前缀
- 所有客户端可访问的环境变量必须以 `NEXT_PUBLIC_` 开头
- 这是 Next.js 的安全机制，防止敏感信息泄露到客户端

### 2. 构建时注入
- `NEXT_PUBLIC_*` 变量在构建时被注入到代码中
- 修改这些变量后需要重新构建应用
- 开发环境会自动重新加载

### 3. 默认值
- 所有配置项都有默认值
- 如果不设置环境变量，将使用默认值
- 默认值为原始的 "OxHorse Planner" 相关文本

### 4. 字符编码
- 确保 `.env` 文件使用 UTF-8 编码
- 支持中文等多语言字符

### 5. 安全性
- 这些配置项是公开的，不包含敏感信息
- 不要在这些变量中存储密钥、密码等敏感数据

## 验证配置

### 检查环境变量是否生效

在浏览器控制台中运行：
```javascript
console.log(process.env.NEXT_PUBLIC_APP_NAME)
```

或在组件中：
```typescript
import { siteConfig } from '@/lib/site-config'
console.log(siteConfig)
```

### 检查页面显示

1. **浏览器标签页**：查看标题是否为配置的 `NEXT_PUBLIC_PAGE_TITLE`
2. **主页 Logo 旁边**：查看是否显示配置的 `NEXT_PUBLIC_APP_NAME`
3. **主页 Logo 下方**：查看是否显示配置的 `NEXT_PUBLIC_APP_SLOGAN`
4. **登录页大标题**：查看是否显示配置的 `NEXT_PUBLIC_APP_NAME`
5. **登录页副标题**：查看是否显示 `副标题 —— 标语` 的格式

## 故障排除

### 问题 1：修改环境变量后没有生效
**解决方案**：
1. 停止开发服务器
2. 删除 `.next` 目录
3. 重新启动开发服务器

### 问题 2：Docker 部署后配置未生效
**解决方案**：
1. 检查 `docker-compose.yml` 中的环境变量配置
2. 重新构建镜像：`docker-compose build --no-cache`
3. 重新启动容器：`docker-compose up -d`

### 问题 3：生产环境显示默认值
**解决方案**：
1. 确认环境变量已正确设置
2. 检查构建日志，确认变量被正确注入
3. 重新构建应用

## 相关文件

### 新增文件
- `lib/site-config.ts` - 站点配置管理

### 修改文件
- `.env` - 本地环境变量
- `.env.example` - 示例配置
- `app/layout.tsx` - 页面元数据
- `app/page.tsx` - 主页 Logo 和标题
- `app/login/page.tsx` - 登录页 Logo 和标题

## 未来扩展

可以考虑添加更多配置项：

1. **主题颜色**：
   - `NEXT_PUBLIC_PRIMARY_COLOR`
   - `NEXT_PUBLIC_SECONDARY_COLOR`

2. **联系信息**：
   - `NEXT_PUBLIC_SUPPORT_EMAIL`
   - `NEXT_PUBLIC_SUPPORT_URL`

3. **社交媒体**：
   - `NEXT_PUBLIC_TWITTER_URL`
   - `NEXT_PUBLIC_GITHUB_URL`

4. **功能开关**：
   - `NEXT_PUBLIC_ENABLE_ANALYTICS`
   - `NEXT_PUBLIC_ENABLE_NOTIFICATIONS`

5. **多语言支持**：
   - `NEXT_PUBLIC_DEFAULT_LOCALE`
   - `NEXT_PUBLIC_AVAILABLE_LOCALES`
