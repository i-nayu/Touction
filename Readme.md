# Touction

Touctionは、Symbolテストネットを使った写真トーナメント + オークションアプリです。
ユーザーは写真を投稿し、トーナメントで投票を受け、終了後にオークション入札・購入を行えます。

## できること

- ユーザー登録時にSymbolアカウントを自動生成
- 秘密鍵をQRコードで受け取り、以後は秘密鍵でログイン
- トーナメントへの写真投稿（1人1投稿）
- トーナメント投票（1人1票）
- オークション入札
- 落札後の購入実行（XYM送金 + 購入確定）

## ブロックチェーンを使う意義

- 投票や購入に関わる価値移転をSymbol上に記録することで、後から第三者でも検証できる透明性を確保できます。
- 運営DBだけに依存しないため、履歴の改ざん耐性を高められます。
- トーナメントごとのモザイクを発行する設計により、イベント単位で投票権を明確に分離できます。
- 落札後の支払い（XYM送金）とアプリ内の購入状態を対応付けることで、「送った/送っていない」の認識ズレを減らせます。
- 日常的な一覧表示や検索はDBで高速に処理しつつ、重要な価値移転だけをブロックチェーンで担保する役割分担ができます。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | React + TypeScript + Vite |
| バックエンド | Node.js + Express (ESM) |
| DB | MySQL 8 |
| ブロックチェーン | Symbol testnet (symbol-sdk v3) |

## ディレクトリ構成

```
Touction/
├── README.md
└── Projects/
    ├── docker-compose.yml
    ├── Backend/
    │   ├── Dockerfile
    │   ├── Server.js
    │   ├── package.json
    │   ├── DB/
    │   │   └── init.sql
    │   ├── Routes/
    │   │   ├── Register.js
    │   │   ├── Login.js
    │   │   ├── Tournament.js
    │   │   ├── Auction.js
    │   │   └── AuctionBuy.js
    |   ├── .env
    │   └── Tools/
    │   
    ├── Frontend/
    │   ├── package.json
    │   ├── vite.config.ts
    │   ├── public/
    │   └── src/
    │       ├── Components/
    │       └── Pages/
    └── nginx/
        └── default.conf
```

## 起動手順

### 1. 前提

- Docker Desktop（または Docker Engine + Compose）
- Node.js 20以上（フロントビルド用）

### 2. 環境変数を作成

以下を作成してください。

- `Projects/Backend/.env`

例:

```env
PORT=5001
TOURNAMENT_PRIVATE_KEY=AUTH_PRIVATE_KEY
DB_HOST=MySQLサーバのホスト名
DB_USER=MySQL接続ユーザー
DB_PASSWORD=MySQL接続パスワード
DB_NAME=使用するデータベース名
```

`TOURNAMENT_PRIVATE_KEY` は、トーナメント用モザイク作成・投票権配布に使うアカウントの秘密鍵です。
このアカウントにはテストネットXYMを十分に用意してください。

### 3. フロントエンドをビルド

```bash
cd Projects/Frontend
npm install
npm run build
```

### 4. Docker Composeで起動

```bash
cd ../
docker compose up --build
```

## アクセス先

| サービス | URL / ポート |
|---|---|
| フロント + リバースプロキシ (Nginx) | http://localhost |
| Backend (Express) | http://localhost:5001 |
| MySQL | localhost:3307 |
| Adminer | http://localhost:8080 |

## 画面ルート（Frontend）

| パス | 画面 |
|---|---|
| `/` | Register |
| `/login` | Login |
| `/tournament` | Tournament |
| `/upload-photo` | UploadPhoto |
| `/auction` | Auction |
| `/auction-buy` | AuctionBuy |

## DBテーブル

`Projects/Backend/DB/init.sql` で初期化されます。

| テーブル | 用途 |
|---|---|
| `Identify` | ユーザーのアドレス |
| `Mosaic` | トーナメント用モザイクと開催期間 |
| `Photos` | 投稿写真、入札、購入状態 |
| `Vote` | 投票済み・配布済みフラグ |
| `Bought` | 購入済み写真情報 |

## 補足

- ブロックチェーン接続先はSymbol testnetノード（コード内で固定URLを使用）です。
- トランザクション手数料不足時は、投票/購入APIが失敗します。
- 画像アップロードサイズはバックエンドで5MBに制限しています。
