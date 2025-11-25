# 快速部署清单

**版本**: v1.2.0 - 任务颜色与进度功能  
**日期**: 2025-11-26

---

## ⚡ 快速部署（5 分钟）

### 自动部署

```bash
# 1. 提交代码
git add .
git commit -m "feat: task color and progress features"
git push origin main

# 2. 等待 GitHub Actions 完成（约3-5分钟）
# 3. 验证部署
curl https://souxy.com
```

### 手动部署

```bash
# 本地：构建并推送
.\build-and-push.ps1

# 服务器：更新应用
ssh root@server-ip
cd /opt/calendar-task-manager
docker-compose pull && docker-compose up -d
```

---

## ✅ 验证清单

- [ ] 容器状态正常：`docker-compose ps`
- [ ] 应用日志无错误：`docker-compose logs -f app`
- [ ] 数据库迁移成功：`docker exec calendar-app npx prisma migrate status`
- [ ] 访问应用正常：`https://souxy.com`
- [ ] 创建"日常"任务可见颜色选择器
- [ ] 创建"日常"任务可见进度滑块
- [ ] 任务条显示颜色和进度
- [ ] Hover 任务条显示数字百分比

---

## 🔑 关键信息

### 数据库变更

```sql
-- 自动执行，无需手动操作
ALTER TABLE "Task" ADD COLUMN "color" TEXT;
ALTER TABLE "Task" ADD COLUMN "progress" INTEGER NOT NULL DEFAULT 0;
```

### 重要提示

> ⚠️ **不需要重新打包数据库镜像**
>
> 数据库迁移会在应用启动时自动执行。

### 回滚命令

```bash
# 如有问题，快速回滚
cd /opt/calendar-task-manager
docker-compose down
git checkout HEAD~1
docker-compose up -d
```

---

## 📞 问题排查

```bash
# 查看日志
docker-compose logs -f

# 检查迁移
docker exec calendar-app npx prisma migrate status

# 重启应用
docker-compose restart app

# 进入数据库
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks
```

---

**详细文档**: 参见 `DEPLOY_2025.11.26_TASK_FEATURES.md`
