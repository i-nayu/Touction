import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// symbol-sdk v3
import { SymbolFacade } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';

//関数読み込み
import DBPerf from '../Tools/DBPerf.js';
// ==========================
// 環境変数の読み込み
// ==========================

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();


// JSONボディを解析可能にする
router.use(express.json());

// =====================================================================
// 画面表示API
// =====================================================================
router.get('/', (req, res) => {
    console.log("/Auction-API is running");

    // フロントエンドのビルド済みHTMLを返す
    res.sendFile(
        path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html")
    );
}
);

// =====================================================================
// 画面表示API
// =====================================================================
router.get('/Auction', async (req, res) => {
    console.log("Auction-/Auction is running");

    try {
        const expireResult = await DBPerf(
            "Get expireTime",
            "SELECT ExpireTime FROM Mosaic LIMIT 1", []
        );
        const expireTime = expireResult[0]?.ExpireTime || null;

        // 写真リスト + 入札額を取得
        const photos = await DBPerf(
            "Get photos",
            "SELECT PhotoID, userID, PhotoPath, Amount FROM Photos ORDER BY Amount DESC",
            []
        );


        res.status(200).json({
            expireTime,
            photos
        });

    } catch (err) {
        console.error("Error: Auction-/Auction", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// =====================================================================
// 入札処理
// =====================================================================
router.post('/Bid', async (req, res) => {
    console.log("Bit-API is running");
    try {
        //フロントからの入力値を取得
        const { photoId, amount } = req.body;

        //必須項目チェック
        if (photoId == null || amount == null) {
            console.log("[Auction] Not photoId, amount");
            return res.status(400).json({ message: "Bad Request: photoId, amount が不足しています" });
        }

        if (typeof amount !== "number" || amount <= 0) {
            console.log("[Auction] Number Error: amount");
            return res.status(400).json({ message: "Error: amount は正の数字である必要があります" });
        }


        //金額の最大値計算
        const DBAmount = await DBPerf(
            "Get amount",
            "SELECT Amount FROM Photos WHERE PhotoID = ?",
            [photoId]
        );

        const currentAmount = DBAmount.length > 0 ? DBAmount[0].Amount : 0;


        if (currentAmount >= amount) {
            console.log("[Auction] Not Enough Money");
            return res.status(409).json({
                message: "Error: 金額が足りません"
            });
        }

        await DBPerf(
            "Update amount",
            "UPDATE Photos SET Amount = ? WHERE PhotoID = ?",
            [amount, photoId]
        );

        // 登録成功
        res.status(200).json({
            message: "入札成功!",
            amount: amount
        });

    } catch (err) {
        console.error("Error: Auction-/Bid", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});


export default router;