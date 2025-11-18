# 邀请码系统设计文档

## 📋 概述

本系统实现了基于邀请码的组织成员管理机制，允许用户通过邀请码直接加入组织，或通过申请审批的方式加入。

**实现日期**: 2025年11月19日  
**版本**: v1.0

---

## 🎯 核心功能

### 1. 邀请码生成
- 每个用户拥有唯一的8位邀请码（16进制大写）
- 用户注册时自动生成
- 邀请码永久有效，不会改变

### 2. 三种注册方式

#### 方式一：通过邀请码注册（直接加入）
```
用户注册 → 选择已有组织 → 输入有效邀请码 → 直接成为成员
```
- ✅ 无需等待审批
- ✅ 立即可用所有组织功能
- ✅ 记录邀请关系
- ✅ 发送通知给邀请人

#### 方式二：申请加入（需要审批）
```
用户注册 → 选择已有组织 → 不输入邀请码 → 创建加入申请 → 等待审批
```
- ⏳ 需要组织创建人审批
- 📧 发送通知给组织创建人
- 🚫 审批前无法访问组织资源

#### 方式三：创建新组织
```
用户注册 → 输入新组织名称 → 成为组织所有者
```
- 👑 自动成为OWNER
- ✅ 立即可用

---

## 🗄️ 数据库设计

### Schema 修改

#### User 表
```prisma
model User {
  // ... 其他字段
  inviteCode    String?  @unique  // 用户唯一邀请码（8位16进制）
  
  // 关系
  invitedMembers         OrganizationMember[] @relation("MemberInviter")
  joinRequestsAsInviter  OrganizationJoinRequest[] @relation("JoinRequestInviter")
}
```

#### OrganizationMember 表
```prisma
model OrganizationMember {
  // ... 其他字段
  inviterId  String?  // 邀请人ID
  inviter    User?    @relation("MemberInviter", fields: [inviterId], references: [id])
}
```

#### OrganizationJoinRequest 表
```prisma
model OrganizationJoinRequest {
  // ... 其他字段
  inviterId  String?  // 邀请人ID（如果通过邀请码则记录）
  inviter    User?    @relation("JoinRequestInviter", fields: [inviterId], references: [id])
}
```

#### NotificationType 枚举
```prisma
enum NotificationType {
  // ... 其他类型
  USER_INVITED_JOINED  // 你邀请的用户已加入组织
}
```

### 迁移记录
- **迁移名称**: `20251118190313_add_invite_code_and_inviter`
- **生成脚本**: `scripts/generate-invite-codes.ts` - 为现有用户生成邀请码

---

## 🔌 API 接口

### 1. 获取邀请码
```typescript
GET /api/organizations/[id]/invite-code

// 响应
{
  "success": true,
  "data": {
    "inviteCode": "A1B2C3D4"
  }
}
```

**权限**: 需要是该组织的成员

### 2. 验证邀请码
```typescript
POST /api/organizations/[id]/invite-code/validate

// 请求
{
  "inviteCode": "A1B2C3D4"
}

// 响应
{
  "success": true,
  "data": {
    "valid": true,
    "inviterName": "张三"
  }
}
```

**权限**: 无需认证（公开接口）

### 3. 注册接口（已扩展）
```typescript
POST /api/auth/register

// 请求
{
  "username": "newuser",
  "password": "password123",
  "name": "新用户",
  "email": "user@example.com",
  "role": "前端开发",
  "organization": "科技公司",
  "organizationId": "org_id",  // 可选：已有组织ID
  "inviteCode": "A1B2C3D4"    // 可选：邀请码
}
```

**逻辑流程**:
```javascript
if (organizationId && inviteCode && 验证通过) {
  // 直接加入组织
  创建OrganizationMember(inviterId: 邀请人ID)
  设置currentOrganizationId
  创建个人项目
  发送通知给邀请人
} else if (organizationId && !inviteCode) {
  // 创建加入申请
  创建OrganizationJoinRequest(status: PENDING)
  发送通知给组织创建人
  // 不设置currentOrganizationId
} else {
  // 创建新组织
  创建Organization(role: OWNER)
  设置currentOrganizationId
  创建个人项目
}
```

### 4. 获取成员列表（已扩展）
```typescript
GET /api/organizations/[id]/members

// 响应
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "name": "张三",
      "email": "zhang@example.com",
      "avatar": "https://...",
      "role": "MEMBER",
      "joinedAt": "2025-11-19T10:00:00Z",
      "inviter": {           // 新增字段
        "id": "inviter_id",
        "name": "李四"
      }
    }
  ]
}
```

---

## 🎨 前端组件

### 1. 组织管理弹窗
**文件**: `components/organization-management-dialog.tsx`

**功能**:
- 显示用户所属的所有组织
- 每个组织卡片显示邀请码
- 点击复制邀请码到剪贴板
- 复制成功显示绿色对勾（3秒）

**关键代码**:
```typescript
// 状态管理
const [inviteCodes, setInviteCodes] = useState<Record<string, string>>({})
const [copiedCode, setCopiedCode] = useState<string | null>(null)

// 获取邀请码
for (const org of organizations) {
  const { inviteCode } = await organizationAPI.getInviteCode(org.id)
  setInviteCodes(prev => ({ ...prev, [org.id]: inviteCode }))
}

// 复制功能
const handleCopyInviteCode = async (orgId: string, orgName: string) => {
  await navigator.clipboard.writeText(inviteCodes[orgId])
  setCopiedCode(orgId)
  setTimeout(() => setCopiedCode(null), 3000)
}
```

**UI 展示**:
```
┌─────────────────────────────────┐
│ 组织名称              [已认证]  │
│ [所有者]             [当前空间] │
│                                 │
│ 👥 5 成员  💼 3 团队  📁 10 项目│
│ ─────────────────────────────── │
│ 邀请码: A1B2C3D4  [📋 复制]    │
└─────────────────────────────────┘
```

### 2. 注册页面
**文件**: `app/login/page.tsx`

**功能**:
- 选择已认证组织后显示邀请码输入框
- 输入8位时自动验证
- 显示验证状态（加载中/成功/失败）
- 显示邀请人姓名

**关键代码**:
```typescript
// 状态管理
const [registerData, setRegisterData] = useState({
  // ... 其他字段
  inviteCode: "",
})
const [isValidatingCode, setIsValidatingCode] = useState(false)
const [inviterName, setInviterName] = useState<string | null>(null)
const [codeError, setCodeError] = useState("")

// 自动验证
onChange={async (e) => {
  const code = e.target.value.toUpperCase()
  if (code.length === 8 && organizationId) {
    const result = await organizationAPI.validateInviteCode(organizationId, code)
    if (result.valid) {
      setInviterName(result.inviterName)
    } else {
      setCodeError("邀请码无效")
    }
  }
}}
```

**UI 展示**:
```
┌─────────────────────────────────┐
│ 邀请码 (选填)                   │
│ ┌─────────────────────────────┐ │
│ │ A1B2C3D4                    │ │
│ └─────────────────────────────┘ │
│ ✓ 邀请人: 张三                  │
│                                 │
│ 使用邀请码可直接加入组织，      │
│ 否则需要等待管理员审批          │
└─────────────────────────────────┘
```

### 3. 组织详情面板
**文件**: `components/organization-detail-dialog.tsx`

**功能**:
- 显示成员列表
- 每个成员显示邀请人信息

**UI 展示**:
```
┌─────────────────────────────────┐
│ 👤 张三                         │
│    zhang@example.com           │
│    邀请人: 李四                 │
└─────────────────────────────────┘
```

---

## 📧 通知系统

### 通知场景

#### 1. 通过邀请码加入
```typescript
// 发送给邀请人
{
  type: 'USER_INVITED_JOINED',
  title: '新成员加入',
  content: '{新用户姓名} 通过您的邀请码加入了组织',
  metadata: {
    newUserId: 'user_id',
    newUserName: '新用户',
    organizationId: 'org_id'
  }
}
```

#### 2. 申请加入组织
```typescript
// 发送给组织创建人
{
  type: 'ORG_JOIN_REQUEST',
  title: '新的加入申请',
  content: '{申请人姓名} 申请加入您的组织',
  metadata: {
    applicantId: 'user_id',
    applicantName: '申请人',
    organizationId: 'org_id'
  }
}
```

#### 3. 审批通过
```typescript
// 发送给申请人
{
  type: 'ORG_JOIN_APPROVED',
  title: '加入申请已通过',
  content: '您的加入申请已通过，可以开始使用组织功能',
  metadata: {
    organizationId: 'org_id',
    organizationName: '组织名称'
  }
}
```

---

## 🔐 安全考虑

### 1. 邀请码唯一性
- 使用 `@unique` 约束确保唯一性
- 生成时检查重复，直到找到唯一值

### 2. 权限控制
- 获取邀请码：必须是组织成员
- 验证邀请码：公开接口（用于注册）
- 成员列表：必须是组织成员

### 3. 邀请码格式
- 8位16进制大写字母+数字
- 使用 `crypto.randomBytes(4)` 生成
- 示例: `A1B2C3D4`, `FF00AA11`

---

## 🔄 数据流程图

### 注册流程
```
┌──────────────┐
│  用户注册    │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│ 选择组织？                        │
├─────┬────────┬──────────────────┤
│     │        │                  │
│ 已有│  新建  │     已有          │
│ +码│        │     -码          │
│     │        │                  │
▼     ▼        ▼                  ▼
┌───────┐ ┌───────┐       ┌──────────┐
│直接   │ │成为   │       │创建申请  │
│加入   │ │OWNER  │       │待审批    │
└───┬───┘ └───┬───┘       └────┬─────┘
    │         │                │
    ▼         ▼                ▼
┌───────┐ ┌───────┐       ┌──────────┐
│通知   │ │创建   │       │通知      │
│邀请人 │ │项目   │       │创建人    │
└───────┘ └───────┘       └──────────┘
```

### 邀请码验证流程
```
输入邀请码
     │
     ▼
检查格式（8位）
     │
     ▼
查询User表
     │
     ├──找不到──► 显示错误
     │
     ▼
检查组织成员关系
     │
     ├──不是成员──► 显示错误
     │
     ▼
显示成功 + 邀请人姓名
```

---

## 📊 统计信息

### 邀请关系追踪
```sql
-- 查询某用户邀请的所有成员
SELECT 
  om.userId,
  u.name,
  om.createdAt as joinedAt,
  o.name as organizationName
FROM OrganizationMember om
JOIN User u ON u.id = om.userId
JOIN Organization o ON o.id = om.organizationId
WHERE om.inviterId = 'inviter_user_id'
ORDER BY om.createdAt DESC;

-- 查询某组织的邀请统计
SELECT 
  inviter.name as inviterName,
  COUNT(*) as invitedCount
FROM OrganizationMember om
JOIN User inviter ON inviter.id = om.inviterId
WHERE om.organizationId = 'org_id'
  AND om.inviterId IS NOT NULL
GROUP BY om.inviterId, inviter.name
ORDER BY invitedCount DESC;
```

---

## 🚀 部署清单

### 1. 数据库迁移
```bash
# 运行迁移
npx prisma migrate deploy

# 为现有用户生成邀请码
npx tsx scripts/generate-invite-codes.ts
```

### 2. 环境变量
无需额外环境变量

### 3. 依赖检查
- ✅ Prisma Client 已更新
- ✅ Next.js API Routes 正常
- ✅ Clipboard API 支持（HTTPS必需）

---

## 🐛 已知问题和解决方案

### 问题1: 导入错误
**错误**: `Export verifyAuth doesn't exist in target module`

**原因**: 使用了不存在的 `verifyAuth` 函数

**解决**: 
```typescript
// ❌ 错误
import { verifyAuth } from '@/lib/middleware'

// ✅ 正确
import { authenticate } from '@/lib/middleware'
```

### 问题2: 邀请码重复
**预防措施**:
```typescript
let inviteCode = generateInviteCode()
let exists = await prisma.user.findUnique({ where: { inviteCode } })
while (exists) {
  inviteCode = generateInviteCode()
  exists = await prisma.user.findUnique({ where: { inviteCode } })
}
```

---

## 🧪 测试场景

### 1. 邀请码注册测试
```
1. 用户A获取邀请码: A1B2C3D4
2. 用户B注册时输入邀请码
3. ✓ 验证成功，显示"邀请人: 用户A"
4. 提交注册
5. ✓ 用户B直接加入组织
6. ✓ 用户A收到通知"用户B通过您的邀请码加入了组织"
```

### 2. 无邀请码注册测试
```
1. 用户C注册时选择组织但不输入邀请码
2. 提交注册
3. ✓ 创建加入申请（PENDING状态）
4. ✓ 组织创建人收到通知"用户C申请加入您的组织"
5. ✓ 用户C无法访问组织资源
```

### 3. 邀请码复制测试
```
1. 打开空间管理弹窗
2. ✓ 看到所有组织的邀请码
3. 点击复制按钮
4. ✓ 图标变为绿色对勾
5. ✓ Toast提示"已复制"
6. ✓ 3秒后图标恢复
7. 粘贴到其他地方
8. ✓ 邀请码正确
```

---

## 📝 维护指南

### 重新生成邀请码
```typescript
// scripts/regenerate-invite-code.ts
import { PrismaClient } from '@prisma/client'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

async function regenerateInviteCode(userId: string) {
  const newCode = randomBytes(4).toString('hex').toUpperCase()
  
  await prisma.user.update({
    where: { id: userId },
    data: { inviteCode: newCode }
  })
  
  console.log(`新邀请码: ${newCode}`)
}
```

### 批量导出邀请码
```typescript
// 导出所有用户的邀请码
const users = await prisma.user.findMany({
  select: {
    username: true,
    name: true,
    inviteCode: true,
    organizationMembers: {
      include: {
        organization: {
          select: { name: true }
        }
      }
    }
  }
})

// 生成CSV
const csv = users.map(u => 
  `${u.username},${u.name},${u.inviteCode},${u.organizationMembers.map(m => m.organization.name).join(';')}`
).join('\n')
```

---

## 📚 相关文档

- [Prisma Schema 设计](./prisma/schema.prisma)
- [API 文档](./API_DOCUMENTATION.md)
- [通知系统](./NOTIFICATION_SYSTEM.md)

---

## 👥 贡献者

- 设计: AI Assistant
- 实现日期: 2025年11月19日
- 版本: v1.0

---

## 📄 License

MIT License
