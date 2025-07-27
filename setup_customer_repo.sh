#!/bin/bash

# 檢查參數
if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <customer-folder-name> <upstream-repo-url> <origin-repo-url>"
  exit 1
fi

CUSTOMER_FOLDER=$1
UPSTREAM_URL=$2
ORIGIN_URL=$3

echo "📁 建立資料夾: $CUSTOMER_FOLDER"
mkdir -p "$CUSTOMER_FOLDER"
cd "$CUSTOMER_FOLDER" || exit 1

echo "📦 初始化 Git repo"
git init

echo "🔗 設定 upstream: $UPSTREAM_URL"
git remote add upstream "$UPSTREAM_URL"
git fetch upstream

echo "🌿 建立 main 和 sandbox 分支"
git checkout -b main upstream/Client/${CUSTOMER_FOLDER}-PROD
git checkout -b sandbox upstream/Client/${CUSTOMER_FOLDER}-SB

echo "🔗 設定 origin: $ORIGIN_URL"
git remote add origin "$ORIGIN_URL"

echo "🚀 推送 main 和 sandbox 到 origin"
git push -u origin main
git push -u origin sandbox

echo "✅ 完成！你現在可以在 $CUSTOMER_FOLDER 中開發了"
