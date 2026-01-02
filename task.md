# 1. 手动打包 company 版本
docker build --build-arg ENV_TYPE=company -t calendar-task-manager:company-2026-1-1 .
docker save -o calendar-task-manager_company_2026-1-1.tar calendar-task-manager:company-2026-1-1
docker load -i calendar-task-manager_company_2026-1-1.tar

# 2. 手动打包 personal 版本
docker build --build-arg ENV_TYPE=personal -t calendar-task-manager:personal-2026-1-1 .
docker save -o calendar-task-manager_personal_2026-1-1.tar calendar-task-manager:personal-2026-1-1
docker load -i calendar-task-manager_personal_2026-1-1.tar

# 3. 修改 docker-compose.yml 中的 image 字段
# image: calendar-task-manager:company-2025-12-08

# 4. 启动容器
docker-compose down
docker-compose up -d



### 清理悬空镜像
sudo docker system prune



# 查看所有 calendar-task-manager 镜像
Windows：
docker images | Select-String "calendar-task-manager"
或
docker images --filter "reference=calendar-task-manager*"

Linux：
docker images | grep calendar-task-manager


删除镜像
docker rmi calendar-task-manager:company-2025-12-07


Windows 清理命令（PowerShell）
# 1. 清理未使用的镜像、容器、网络（推荐先用这个）
docker system prune -a

# 2. 清理构建缓存（最能释放空间）
docker builder prune -a
 docker builder prune -a -f

# 3. 同时清理所有（最彻底）
docker system prune -a && docker builder prune -a

# 4. 查看 Docker 占用的空间
docker system df



# 直接执行 SQL 命令
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks -c "ALTER TABLE \"Organization\" ADD COLUMN IF NOT EXISTS \"joinRequiresApproval\" BOOLEAN NOT NULL DEFAULT false; UPDATE \"Organization\" SET \"joinRequiresApproval\" = false;"
# 验证结果
docker exec -it calendar-postgres psql -U postgres -d calendar_tasks -c "SELECT id, name, \"joinRequiresApproval\" FROM \"Organization\";"