import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';   // Cookie解析
import multer from 'multer';
import cron from 'node-cron';
import fs from 'fs';

// symbol-sdk v3
import { PrivateKey } from 'symbol-sdk';

//関数読み込み
import DBPerf from '../../Tools/DBPerf.js';
import VCM from '../../Tools/VCM.js';
import SaveIcon from '../../Tools/SaveIcon.js';
import { CreateTransferTx } from '../../Tools/CreateTransferTX.js';
import SignAndAnnounce from '../../Tools/SignAndAnnounce.js';
import LeftToken from '../../Tools/LeftToken.js';
import GetCurrencyMosaicId from '../../Tools/GetCurrencyMosaicId.js';
import GetAddress from '../../Tools/GetAddress.js';

// ==========================
// 環境変数の読み込み
// ==========================
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

router.use(express.json());

// cookieを使う
router.use(cookieParser());
dotenv.config({ path: path.join(__dirname, "..", ".env") });
const upload = multer({ storage: multer.memoryStorage() });

// =====================================================================
// HTML送信API
// =====================================================================
router.get('/', (req, res) => {
    console.log("/Tournament-API is running");

    // フロントエンドのビルド済みHTMLを返す
    res.sendFile(
        path.join(__dirname, "..", "..", "..", "", "Frontend", "dist", "index.html")
    );
}
);

// =====================================================================
// 画面表示API
// =====================================================================
router.get('/PhotoList', async (req, res) => {
    console.log("Tournament-/List-API is running");

    try {
        // バックエンドで定義するテーマと終了日時
        const theme = "知床";

        const photos = await DBPerf(
            "Get Photo List",
            `SELECT PhotoID, PhotoPath, Comment FROM Photos`,
            []
        );

        const expireTime = await DBPerf(
            "Get ExpireTime",
            `SELECT ExpireTime FROM Mosaic`,
            []
        );

        res.status(200).json({
            theme,
            expireTime,
            photos
        });

    } catch (err) {
        console.error("Error: Tournament-/List", err);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

// =====================================================================
// 写真追加API
// =====================================================================
router.post('/Upload', VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), upload.fields([{ name: "photo", maxCount: 1 }]), async (req, res) => {
    console.log("Tournament-/Upload-API is running");

    try {
        const userID = req.auth.userId;
        const { comment } = req.body;
        console.log("Received Upload request:", { userID, comment });
        if (!userID || !comment) {
            console.log("Missing required fields in Upload request");
            return res.status(400).json({ message: "UserID and Comment are required" });
        }

        if (!req.files?.photo) {
            console.log("Missing required fields in Upload request");
            return res.status(400).json({ message: "Photo is required" });
        }

        const PhotoPath = SaveIcon(req.files.photo[0], "photographs");
        console.log("Photo saved at:", PhotoPath);

        //写真投稿をDBに保存
        const result = await DBPerf(
            "INSERT Photos",
            "INSERT INTO Photos(UserID, PhotoPath, Comment) VALUES (?, ?, ?)",
            [userID, PhotoPath, comment]
        );

        res.status(201).json({
            message: "Uploaded successfully",
            photoId: result.insertId
        });
    } catch (err) {
        console.error("Error: Tournament-/Upload", err);
        res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }

});



// =====================================================================
// 投票処理API
// =====================================================================
router.post('/Vote', VCM('LOGIN_TOKEN', process.env.LOGIN_SECRET), async (req, res) => {
    console.log("Tournament-/Vote-API is running");

    const PhotoID = req.body.PhotoId;
    const privateKey = "";
    const userAddress = GetAddress("testnet", privateKey); //投票者のアドレス
    const serverAddress = GetAddress("testnet", process.env.TOURNAMENT_PRIVATE_KEY);
    const nodeUrl = 'https://sym-test-01.opening-line.jp:3001';


    try {
        //PhotoIDからaddressを取得
        const address = await DBPerf(
            "Get address",
            "SELECT I.Address FROM Photos P JOIN Identify I ON P.UserID = I.UserID WHERE P.PhotoID = ?; ",
            [PhotoID]
        );
        if (!address.length) {
            console.log("[Vote] Photo Not Found");
            return res.status(404).json({ message: "投票できる写真がありません" });
        }
        const SendToAddress = address[0].Address;

        const mosaicId = await DBPerf(
            "Get MosaicId",
            "SELECT MosaicId FROM Mosaic ",
            []
        );
        if (!mosaicId.length) {
            console.log("[Vote] MosaicId Not Found");
            return res.status(400).json({ message: "現在開催されているトーナメントがありません" });
        }
        const mosaicIdHex = mosaicId[0].MosaicID;

        //投票権があるかどうか
        try {
            const currentAmount = await LeftToken(userAddress, mosaicIdHex, nodeUrl);

            if (currentAmount < 1n) {
                console.log("No Vote to Right");
                return res.status(400).json({ message: "投票権がありません" });
            }


        } catch (txErr) {
            console.error("[Vote] Vote Get Error:", txErr);
            return res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
        }

        //投票（トークン送信）トランザクションを作成
        try {
            console.log("[Vote] Creating Vote To Server Transaction...");
            const { voteTx, keyPair, voteFacade } = CreateTransferTx({
                networkType: 'testnet',
                senderPrivateKey: privateKey,
                recipientRawAddress: SendToAddress,
                messageText: `Vote`,
                fee: 100_000n,
                mosaics: [
                    {
                        mosaicId: BigInt(`0x${mosaicIdHex}`),
                        amount: 1n
                    }
                ],
                deadlineHours: 2,
            });

            //投票の署名とアナウンス
            console.log("[Vote] Announcing Vote Transaction...");
            //手数料が足りているかどうか
            const currencyMosaicId = await GetCurrencyMosaicId(nodeUrl);
            const xymAmount = await LeftToken(userAddress, currencyMosaicId, nodeUrl);
            const transferFee = BigInt(voteTx.maxFee);
            if (xymAmount < transferFee) {
                throw new Error(`手数料用XYM不足です: 必要=${transferFee.toString()} / 保有=${xymAmount.toString()}`);
            }

            const voteResult = await SignAndAnnounce(
                voteTx,
                privateKey,
                voteFacade,
                'https://sym-test-01.opening-line.jp:3001',
                {
                    waitForConfirmation: true,
                    confirmationTimeoutMs: 180000,
                    pollIntervalMs: 2000
                }
            );

            console.log("[Vote] Vote To Server TX Hash:", voteResult.hash);
            console.log("[Vote] Vote To Server TX Announced Successfully!");

            res.json({
                message: "Vote To Server successful",
                txHash: voteResult.hash
            });
        } catch (txErr) {
            console.error("[Vote] Vote To Server TX Error:", txErr);
            return res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
        }

        

    } catch (txErr) {
        console.error("[Vote] Vote TX Error:", txErr);
        return res.status(500).json({ message: "Internal Server Error: サーバーエラーが発生しました。" });
    }
});

export default router;