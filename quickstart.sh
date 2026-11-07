#!/bin/bash

echo "🥭 Mango Astro - 快速启动脚本"
echo "================================"
echo ""

# 检查 Node.js 版本
echo "📋 检查 Node.js 版本..."
NODE_VERSION=$(node -v 2>&1)
if [ $? -ne 0 ]; then
    echo "❌ 错误: 未找到 Node.js，请先安装 Node.js 20+"
    exit 1
fi
echo "✅ Node.js 版本: $NODE_VERSION"

# 检查 npm
echo "📋 检查 npm..."
NPM_VERSION=$(npm -v 2>&1)
echo "✅ npm 版本: $NPM_VERSION"

# 安装依赖
echo ""
echo "📦 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 错误: 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装完成"

# 创建必要的目录
echo ""
echo "📁 创建目录结构..."
mkdir -p public/images/uploads
mkdir -p src/content/posts
echo "✅ 目录创建完成"

# 初始化 Git（如果尚未初始化）
if [ ! -d ".git" ]; then
    echo ""
    echo "🔧 初始化 Git 仓库..."
    read -p "是否初始化 Git 仓库？(y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git init
        git add .
        git commit -m "Initial commit: Mango Astro theme"
        echo "✅ Git 仓库初始化完成"
    fi
else
    echo "✅ Git 仓库已存在"
fi

# 启动开发服务器
echo ""
echo "🚀 启动开发服务器..."
echo "访问 http://localhost:4321 查看站点"
echo "访问 http://localhost:4321/admin 进入 CMS 后台"
echo ""
echo "按 Ctrl+C 停止服务器"
echo ""

npm run dev
