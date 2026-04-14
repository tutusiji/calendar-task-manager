# 邀请码缺失问题修复

## 🐛 问题描述

后加入组织的成员无法获取邀请码，API 返回错误：
```json
{
  "success": false,
  "error": "邀请码尚未生成"
}
```

## 🔍 问题原因

在以下场景中创建组织成员时，没有生成 `inviteCode`：
1. ✅ 通过邀请链接加入（已有邀请码生成）
2. ❌ 通过加入申请被批准（缺少邀请码生成）
3. ❌ 管理员直接添加成员（缺少邀请码生成）
4. ❌ 自助加入组织（缺少邀请码生成）

## ✅ 修复内容

### 1. 代码修复

修改了以下文件：

**app/api/organizations/join-requests/[id]/approve/route.ts**
- 在批准加入申请时生成邀请码

**app/api/organizations/[id]/members/route.ts**
- 在管理员添加成员时生成邀请码
- 在自助加入组织时生成邀请码

### 2. 数据修复脚本

创建了两个脚本用于修复已存在的数据：

**scripts/fix-missing-invite-codes.ts** (Node.js)
```bash
# 本地开发环境使用
npx tsx scripts/fix-missing-invite-codes.ts
```

**fix-missing-invite-codes.sql** (SQL)
```bash
# 生产服务器使用
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < fix-missing-invite-codes.sql
```

## 🚀 部署步骤

### 本地测试

```bash
# 1. 运行修复脚本（可选，如果有缺失的邀请码）
npx tsx scripts/fix-missing-invite-codes.ts

# 2. 测试创建成员
# - 通过加入申请
# - 管理员添加成员
# - 自助加入

# 3. 验证邀请码是否生成
# 访问组织管理面板 -> 查看邀请码
```

### 服务器部署

```bash
# 1. 重新构建镜像
docker build -t calendar-task-manager:latest .

# 2. 导出镜像
docker save -o calendar-app-fix.tar calendar-task-manager:latest

# 3. 上传到服务器并加载
docker load -i calendar-app-fix.tar

# 4. 修复已存在的数据（如果有缺失的邀请码）
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < fix-missing-invite-codes.sql

# 5. 重启应用
docker-compose restart app

# 6. 验证
# - 访问组织管理面板
# - 检查邀请码是否显示
```

## 📊 验证查询

```sql
-- 检查是否还有缺失邀请码的成员
SELECT 
    COUNT(*) as total_members,
    COUNT("inviteCode") as members_with_code,
    COUNT(*) - COUNT("inviteCode") as members_without_code
FROM "OrganizationMember";

-- 查看所有成员的邀请码
SELECT 
    u.name as user_name,
    o.name as organization_name,
    om."inviteCode",
    om."createdAt"
FROM "OrganizationMember" om
JOIN "User" u ON om."userId" = u.id
JOIN "Organization" o ON om."organizationId" = o.id
ORDER BY om."createdAt" DESC;
```

## 🔄 离线部署包更新

如果已经制作了离线部署包，需要重新制作：

```powershell
# 重新运行打包脚本
.\build-offline-deploy.ps1
```

新的部署包将包含：
- ✅ 修复后的应用代码
- ✅ 数据修复 SQL 脚本（已包含在 database-full-update.sql 中）

## ✅ 验证清单

- [ ] 通过加入申请的成员有邀请码
- [ ] 管理员添加的成员有邀请码
- [ ] 自助加入的成员有邀请码
- [ ] 已存在的成员补充了邀请码
- [ ] 邀请码在组织管理面板正常显示
- [ ] 邀请码唯一且不重复

---

**修复时间**: 2025年11月20日  
**影响版本**: 所有版本  
**修复版本**: latest
