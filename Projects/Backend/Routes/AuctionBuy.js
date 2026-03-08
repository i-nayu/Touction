import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// symbol-sdk v3
import { SymbolFacade } from 'symbol-sdk/symbol';

//関数読み込み
import DBPerf from '../Tools/DBPerf.js';
import SignAndAnnounce from '../Tools/SignAndAnnounce.js';
import SendTokens from '../Tools/SendTokens.js'; //複数の相手にまとめて送信する関数
import GetCurrencyMosaicId from '../Tools/GetCurrencyMosaicId.js';
import GetAddress from '../Tools/GetAddress.js';

// ==========================
// 環境変数の読み込み
// ==========================

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();




// =====================================================================
// 購入処理・送信API
// =====================================================================
router.post('/AuctionBuy', async (req, res) => {
    try {
        console.log("aquctionBuy-API is running");
        const nodeUrl = 'https://sym-test-01.opening-line.jp:3001';

        //終了日時
        const expireResult = await DBPerf("Get ExpireTime",
            "SELECT ExpireTime FROM Mosaic"
        );
        const now = new Date();
        const expireTime = expireResult[0]?.ExpireTime;
        const expire = new Date(expireTime);
        console.log("now:", now);
        console.log("expire:", expire);

        if (!expireTime || now <= expire) {
            return res.status(400).json({ message: "オークション期間中です" });
        }



        try {
            const { privateKey } = req.body;

            //必須項目チェック
            if (!privateKey) {
                console.log("[Auction] Not privateKey");
                return res.status(400).json({ message: "Bad Request: privateKey が不足しています" });
            }

            const buyAddress = GetAddress("testnet", privateKey); //入札者のアドレス
            const buyResult = await DBPerf("Get BidUserID",
                "SELECT UserID FROM Identify WHERE Address = ?",
                [buyAddress]
            );
            if (!buyResult.length) {
                return res.status(404).json({ message: "ユーザーが存在しません" });
            }
            const buyUserId = buyResult[0].UserID;


            //購入できるものを探す
            const userData = await DBPerf("Search amount",
                "SELECT p.PhotoID, p.PhotoPath, p.Amount, i.Address FROM Photos p JOIN Identify i ON p.UserID = i.UserID WHERE p.BidUserID = ?",
                [buyUserId]
            );
            if (!userData.length) {
                console.log("[AuctionBuy] Not Found: photos");
                return res.status(200).json({ message: "購入できる写真がありません" });
            }

            const users = userData.map(photo => ({
                address: photo.Address,
                amount: BigInt(photo.Amount) * 1_000_000n
            }));

            //購入トランザクションを作成
            const currencyMosaicId = await GetCurrencyMosaicId(nodeUrl);
            const facade = new SymbolFacade('testnet');
            console.log("[Auction Buy] Creating Send XYM Transaction...");
            const aggregateTx = await SendTokens({
                facade,
                signerPrivateKey: privateKey,
                mosaicId: currencyMosaicId,
                users
            });

            // 署名とアナウンス
            console.log("[Auction Buy] Announcing Send XYM Transaction...");

            const sendResult = await SignAndAnnounce(
                aggregateTx,
                privateKey,
                facade,
                nodeUrl,
                { waitForConfirmation: true }
            );
            console.log("[Auction Buy] Send XYM TX Hash:", sendResult.hash);
            console.log("[Auction Buy] Send XYM Token TX Announced Successfully!");

            // DB保存
            for (const photo of userData) {
                await DBPerf(
                    "Insert Into Bought",
                    "INSERT INTO Bought (PhotoID, UserID, PhotoPath, BoughtAmount) VALUES (?, ?, ?, ?)",
                    [photo.PhotoID, buyUserId, photo.PhotoPath, photo.Amount]
                );
            }


            // 登録成功
            res.status(200).json({
                message: "購入成功",
                userData
            });
        } catch (txErr) {
            console.log("Error: Auction Buy", txErr);
            return res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
        }

    } catch (err) {
        console.error("Error: AuctionBuy", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});

export default router;
