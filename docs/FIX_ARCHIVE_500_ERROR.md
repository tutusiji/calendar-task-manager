# 修复归档功能 500 错误

## 问题描述

归档项目时返回 500 Internal Server Error

```
POST http://localhost:3000/api/projects/[id]/archive
Status: 500 Internal Server Error
```

## 诊断结果

✅ 数据库字段已正确添加 (`isArchived`, `archivedAt`)  
✅ Prisma 客户端可以正常查询字段  
✅ 数据库操作逻辑测试通过  
✅ API 路由代码无语法错误  

## 可能原因

1. **Next.js 缓存问题** - .next 目录缓存了旧的代码
2. **Prisma 客户端未更新** - 开发服务器使用的是旧的 Prisma 客户端
3. **开发服务器未重启** - 代码更改后未重启服务器

## 解决方案

### 方案 1: 完全重启（推荐）

```bash
# 1. 停止开发服务器 (Ctrl+C)

# 2. 清理构建缓存
rm -r -Force .next

# 3. 重新生成 Prisma 客户端（需要先停止所有使用 Prisma 的进程）
# 如果遇到权限错误，请先关闭所有终端和 VS Code
npx prisma generate

# 4. 重新启动开发服务器
npm run dev
```

### 方案 2: 强制重新生成 Prisma

如果方案 1 中 `npx prisma generate` 报权限错误：

```bash
# 1. 完全关闭 VS Code 和所有终端

# 2. 重新打开终端

# 3. 删除 Prisma 缓存
rm -r -Force node_modules\.prisma
rm -r -Force node_modules\.pnpm\@prisma+client*\node_modules\.prisma

# 4. 重新生成
npx prisma generate

# 5. 启动开发服务器
npm run dev
```

### 方案 3: 使用 db push（最简单）

```bash
# 1. 停止开发服务器

# 2. 推送数据库更改（会自动生成客户端）
npx prisma db push

# 3. 清理 Next.js 缓存
rm -r -Force .next

# 4. 重新启动
npm run dev
```

## 验证步骤

### 1. 检查 Prisma 客户端

```bash
npx tsx scripts/check-archive-fields.ts
```

应该看到：
```
✅ 字段已存在
查询结果: { id: '...', name: '...', isArchived: false, archivedAt: null }
```

### 2. 测试 API 逻辑

```bash
npx tsx scripts/test-archive-api.ts
```

应该看到：
```
✅ 归档成功!
✅ 恢复成功!
✅ 所有测试通过！
```

### 3. 测试 HTTP 请求

启动开发服务器后，在浏览器控制台或使用 curl 测试：

```bash
# 获取一个项目 ID
curl http://localhost:3000/api/projects

# 测试归档（替换 PROJECT_ID）
curl -X POST http://localhost:3000/api/projects/PROJECT_ID/archive \
  -H "Cookie: your-session-cookie"
```

## 常见错误及解决

### 错误 1: "Unknown field `isArchived`"

**原因**: Prisma 客户端未更新

**解决**:
```bash
# 停止所有进程
# 重新生成
npx prisma generate
```

### 错误 2: "EPERM: operation not permitted"

**原因**: 文件被占用（开发服务器或其他进程正在使用）

**解决**:
1. 完全关闭 VS Code
2. 关闭所有终端
3. 重新打开并执行命令

### 错误 3: "Column does not exist"

**原因**: 数据库迁移未执行

**解决**:
```bash
npx prisma db push
```

### 错误 4: 500 错误但无具体信息

**原因**: 开发服务器缓存

**解决**:
```bash
# 清理缓存
rm -r -Force .next
rm -r -Force .next/cache

# 重启服务器
npm run dev
```

## 检查清单

在测试归档功能前，确保：

- [ ] 数据库字段已添加（运行 check-archive-fields.ts）
- [ ] Prisma 客户端已更新（无 "Unknown field" 错误）
- [ ] .next 目录已清理
- [ ] 开发服务器已重启
- [ ] 浏览器缓存已清除（Ctrl+Shift+R）
- [ ] 已登录并有权限归档项目

## 调试技巧

### 查看详细错误

在 `app/api/projects/[id]/archive/route.ts` 中临时添加更详细的日志：

```typescript
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    console.log('=== 归档 API 开始 ===')
    
    const auth = await authenticate(request)
    console.log('认证结果:', auth)
    if (auth.error) return auth.error

    const { id } = await params
    console.log('项目 ID:', id)

    const existingProject = await prisma.project.findUnique({
      where: { id },
      include: { organization: true }
    })
    console.log('项目信息:', existingProject)

    // ... 其余代码
    
  } catch (error) {
    console.error('=== 归档 API 错误 ===')
    console.error('错误类型:', error.constructor.name)
    console.error('错误消息:', error.message)
    console.error('错误堆栈:', error.stack)
    return serverErrorResponse('归档项目失败')
  }
}
```

### 查看服务器日志

开发服务器的终端会显示详细错误信息，注意查看：
- Prisma 查询错误
- 认证错误
- 权限错误
- 数据库连接错误

## 成功标志

归档成功后应该看到：

1. **浏览器控制台**: 无错误，显示成功 Toast
2. **网络请求**: 状态码 200，返回更新后的项目数据
3. **UI 更新**: 项目从活跃列表移到归档列表
4. **数据库**: `isArchived = true`, `archivedAt` 有时间戳

## 如果问题仍然存在

1. 检查服务器终端的完整错误堆栈
2. 运行 `npx tsx scripts/test-archive-api.ts` 确认数据库操作正常
3. 检查是否有其他 API 路由冲突
4. 尝试重新克隆项目并重新安装依赖

## 联系支持

如果以上方法都无法解决，请提供：
- 完整的错误堆栈（服务器终端输出）
- `check-archive-fields.ts` 的输出
- `test-archive-api.ts` 的输出
- Node.js 版本 (`node -v`)
- Prisma 版本 (`npx prisma -v`)
