#!/bin/bash
# ========================================
# 数据库初始化脚本 - 2-init-database.sh
# ========================================

echo "=================================="
echo "初始化数据库"
echo "=================================="

# 检查配置文件
if [ ! -f "config/.env" ]; then
    echo "⚠️  警告: 未找到 config/.env 文件"
    echo "正在创建默认配置..."
    cat > config/.env << 'EOF'
POSTGRES_PASSWORD=postgres
DOCKER_IMAGE=calendar-task-manager:latest
EOF
    echo "✅ 已创建默认 .env 文件，请根据需要修改密码"
fi

# 检查数据库更新脚本
if [ ! -f "config/database-full-update.sql" ]; then
    echo "❌ 错误: 找不到 config/database-full-update.sql"
    exit 1
fi

# 启动数据库容器
echo ""
echo "🚀 启动数据库容器..."
cd config
docker-compose up -d postgres

if [ $? -ne 0 ]; then
    echo "❌ 数据库启动失败"
    exit 1
fi

# 等待数据库就绪
echo ""
echo "⏳ 等待数据库就绪 (最多30秒)..."
for i in {1..30}; do
    if docker exec calendar-postgres pg_isready -U postgres > /dev/null 2>&1; then
        echo "✅ 数据库已就绪"
        break
    fi
    echo -n "."
    sleep 1
done

# 检查数据库是否已创建
echo ""
echo "🔍 检查数据库..."
DB_EXISTS=$(docker exec calendar-postgres psql -U postgres -lqt | cut -d \| -f 1 | grep -w calendar_tasks | wc -l)

if [ "$DB_EXISTS" -eq "0" ]; then
    echo "📊 创建数据库 calendar_tasks..."
    docker exec calendar-postgres psql -U postgres -c "CREATE DATABASE calendar_tasks;"
fi

# 执行数据库更新脚本
echo ""
echo "📝 执行数据库更新脚本..."
docker exec -i calendar-postgres psql -U postgres -d calendar_tasks < database-full-update.sql

if [ $? -eq 0 ]; then
    echo "✅ 数据库更新成功"
else
    echo "❌ 数据库更新失败"
    exit 1
fi

# 验证数据库结构
echo ""
echo "🔍 验证数据库结构..."
docker exec calendar-postgres psql -U postgres -d calendar_tasks -c "\dt" | grep -E "User|Organization|Task|Project"

echo ""
echo "=================================="
echo "✅ 数据库初始化完成！"
echo "=================================="
echo ""
echo "下一步: 执行 ./3-start-app.sh 启动应用"
