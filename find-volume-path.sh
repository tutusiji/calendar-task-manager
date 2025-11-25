#!/bin/bash

# 查找 uploads_data volume 的实际路径并配置 Nginx

echo "======================================"
echo "配置 Nginx 访问 Docker Volume"
echo "======================================"
echo ""

# 1. 查找 volume 路径
echo "1. 查找 uploads_data volume 路径..."
VOLUME_NAME=$(docker volume ls | grep uploads_data | awk '{print $2}')

if [ -z "$VOLUME_NAME" ]; then
    echo "❌ 错误: 找不到 uploads_data volume"
    echo "请先启动 Docker 容器: docker-compose up -d"
    exit 1
fi

VOLUME_PATH=$(docker volume inspect $VOLUME_NAME --format '{{ .Mountpoint }}')
echo "✅ Volume 名称: $VOLUME_NAME"
echo "✅ Volume 路径: $VOLUME_PATH"
echo ""

# 2. 检查路径
if [ ! -d "$VOLUME_PATH" ]; then
    echo "❌ 错误: 路径不存在"
    exit 1
fi

# 3. 设置权限
echo "2. 设置文件权限..."
sudo chmod -R 755 "$VOLUME_PATH"
echo "✅ 权限已设置"
echo ""

# 4. 显示 Nginx 配置
echo "3. Nginx 配置建议:"
echo "======================================"
echo "在 souxy.com.conf 中，将 uploads location 修改为："
echo ""
echo "location ^~ /uploads/ {"
echo "    alias $VOLUME_PATH/;"
echo "    autoindex off;"
echo "    expires 30d;"
echo "    add_header Cache-Control \"public, max-age=2592000\";"
echo "}"
echo "======================================"
echo ""

# 5. 生成完整配置
cat > /tmp/nginx-volume-config.txt << EOF
# 将此配置添加到 /etc/nginx/sites-available/souxy.com.conf

location ^~ /uploads/ {
    alias $VOLUME_PATH/;
    autoindex off;
    expires 30d;
    add_header Cache-Control "public, max-age=2592000";
    add_header Access-Control-Allow-Origin *;
}
EOF

echo "完整配置已保存到: /tmp/nginx-volume-config.txt"
echo ""
echo "下一步操作："
echo "1. 编辑 Nginx 配置: sudo nano /etc/nginx/sites-available/souxy.com.conf"
echo "2. 将 alias 路径改为: $VOLUME_PATH/"
echo "3. 测试配置: sudo nginx -t"
echo "4. 重新加载: sudo nginx -s reload"
echo ""
