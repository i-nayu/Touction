import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
const app = express();

// ==========================
// __dirname 再生成（ESM用）
// ==========================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================
// 環境変数読み込み
// ==========================

// CommonJSでは __dirname がそのまま使えたが
// ESMでは上記処理が必要
dotenv.config({
  path: path.resolve(__dirname, '.env')
});


//ポート設定
const PORT = process.env.PORT || 5001;


// ==========================
// Routes自動マウント処理
// ==========================

// Routesディレクトリの絶対パス
const routesDir = path.join(__dirname, 'Routes');

// ディレクトリ内のファイル一覧取得
fs.readdirSync(routesDir).forEach(async (file) => {

  // .jsファイルのみ対象
  if (!file.endsWith('.js')) return;

  // ファイル名から拡張子を除去
  const routeName = path.basename(file, '.js');

  // エンドポイントを自動生成
  // 例: Register.js → /Register
  const routePath = `/${routeName}`;

  // ESMでは require は使えないため dynamic import
  const routeModule = await import(
    path.join(routesDir, file)
  );
  console.log('routeModule:', routeModule);

  // default export を取得
  const route = routeModule.default;

  // ルーティング登録
  app.use(routePath, route);

  console.log(`Route mounted: ${routePath}`);
});


// ==========================
// サーバー起動
// ==========================

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
