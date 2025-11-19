🔄 重新部署步骤:
1️⃣ 本地重新构建镜像
 git reset --hard origin/master

# 进入项目目录
cd D:\CodeLab\calendar-task-manager

# 重新构建镜像
docker build -t calendar-task-manager:latest .

# 导出镜像
docker save -o calendar-app.tar calendar-task-manager:latest


2️⃣ 上传到服务器
# 上传新镜像
scp calendar-app.tar root@你的服务器IP:/opt/calendar-task-manager/


3️⃣ 服务器端更新
# SSH 连接到服务器
ssh root@你的服务器IP

# 进入项目目录
cd /opt/calendar-task-manager

# 执行更新脚本(如果已创建)
./update.sh

# 或者手动执行:
# 1. 备份数据库
docker exec calendar-postgres pg_dump -U postgres calendar_tasks > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 停止并删除旧容器
docker stop calendar-app
docker rm calendar-app

# 3. 删除旧镜像
docker rmi calendar-task-manager:latest

# 4. 加载新镜像
docker load -i calendar-app.tar

# 5. 启动新容器


# 6. 查看日志
docker logs -f calendar-app