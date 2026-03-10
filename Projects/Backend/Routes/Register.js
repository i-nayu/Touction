import express from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';   // Cookie解析
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode'; //QRコード生成

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

// Cookieをreq.cookiesで扱えるようにする
router.use(cookieParser());

// JSONボディを解析可能にする
router.use(express.json());

// =====================================================================
// 画面表示API
// =====================================================================
router.get('/', (req, res) => {
    console.log("/Register-API is running");

    // フロントエンドのビルド済みHTMLを返す
    res.sendFile(
        path.join(__dirname, "..", "..", "..", "Frontend", "dist", "index.html")
    );
}
);

// =====================================================================
// ユーザー登録処理
// =====================================================================
router.post('/Submit', async (req, res) => {
    console.log("Submit-API is running");
    try {
        //フロントからの入力値を取得
        const { userId } = req.body;

        //必須項目チェック
        if (!userId) {
            return res.status(400).json({ message: "Bad Request: userId が不足しています" })
        }

        // ユーザー重複チェック
        const exist = await DBPerf(
            "Duplicate Check For UserID",
            "SELECT * FROM Identify WHERE UserID = ?",
            [userId]
        );

        if (exist.length > 0) {
            return res.status(409).json({
                message: "Conflict: このユーザーIDはすでに使われています"
            });
        }

        // Symbolブロックチェーン用アカウント生成
        const facade = new SymbolFacade('testnet');

        const privateKey = PrivateKey.random();
        const account = facade.createAccount(privateKey);
        const address = account.address.toString();
        const privateKeyString = privateKey.toString();

        console.log("アドレス:", address);
        console.log("秘密鍵:", privateKeyString);


        // DB保存
        await DBPerf(
            "Insert Into Identify",
            "INSERT INTO Identify (UserID, Address) VALUES (?, ?)",
            [userId, address]
        );

        await DBPerf(
            "Insert Into Vote",
            "INSERT INTO Vote (UserID) VALUES (?)",
            [userId]
        );

        // 秘密鍵をQRコード化
        let qr;

        try {

            //QRコード生成 エラー訂正レベル: H(L, M, Q, Hの４段階)
            qr = await QRCode.toDataURL(privateKeyString, {errorCorrectionLevel: 'H'});

        } catch (qrError) {
            console.error("QRコード生成エラー:", qrError);

            return res.status(500).json({
                message: "QRコードの生成に失敗しました"
            });
        }


        // 登録成功
        res.status(200).json({
            qrCode: qr
        });

    } catch (err) {
        console.error("Error: Register-/Submit", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});


export default router;