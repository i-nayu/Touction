import cron from 'node-cron';

// symbol-sdk v3
import { PrivateKey } from 'symbol-sdk';

//関数読み込み
import DBPerf from '../../Tools/DBPerf.js';
import { CreateMosaicTx } from '../../Tools/CreateMosaicTx.js';
import SignAndAnnounce from '../../Tools/SignAndAnnounce.js';
import CreateSupplyTx from '../../Tools/SupplyMosaic.js';
import SendTokens from '../../Tools/SendTokens.js'; //複数の相手にまとめて送信する関数
import GetCurrencyMosaicId from '../../Tools/GetCurrencyMosaicId.js';
import GetAddress from '../../Tools/GetAddress.js';
import LeftToken from '../../Tools/LeftToken.js';



// =====================================================================
// トーナメント作成API（7日ごと）
// =====================================================================
cron.schedule('0 0 */7 * *', async () => {
    try {
        const privateKey = new PrivateKey(process.env.TOURNAMENT_PRIVATE_KEY);

        // ===== Mosaic定義トランザクション作成 =====
        const { mosaicId, mosaicDefinitionTx, keyPair, createFacade } = CreateMosaicTx({
            networkType: 'testnet',
            senderPrivateKey: privateKey,
            transferable: true,
            deadlineHours: 24
        });

        //DBからアドレスを取得
        const users = await DBPerf("Get Users", "SELECT Address FROM Users", []);
        const userCount = users.length;
        if (userCount === 0) {
            console.log("[Create tournament] No users found. Skip.");
            return;
        }


        //供給変更トランザクションを作成
        console.log("[Create tournament] Creating Supply Change Transaction...");
        const { supplyTx, keyPair: supplyKeyPair, supplyFacade } = CreateSupplyTx({
            networkType: 'testnet',
            senderPrivateKey: privateKey,
            mosaicId: mosaicId,
            supply: BigInt(userCount),
            deadlineHours: 24
        });



        //投票権配布
        console.log("[Create tournament] Creating Send Voting Token Transaction...");
        const aggregateTx = await SendTokens({
            facade: supplyFacade,
            signerPrivateKey: privateKey,
            mosaicId: mosaicId,
            users: users
        });



        try {
            // =============================
            // まとめて手数料確認
            // =============================
            const nodeUrl = 'https://sym-test-01.opening-line.jp:3001';
            const serverAddress = GetAddress("testnet", process.env.TOURNAMENT_PRIVATE_KEY);
            const currencyMosaicId = await GetCurrencyMosaicId(nodeUrl);
            const xymAmount = BigInt(await LeftToken(serverAddress, currencyMosaicId, nodeUrl));

            const createFee = BigInt(mosaicDefinitionTx.maxFee);
            const supplyFee = BigInt(supplyTx.maxFee);
            const votingFee = BigInt(aggregateTx.maxFee);

            const totalFee = createFee + supplyFee + votingFee + 1_000_000n;

            console.log("====== Fee Check ======");
            console.log("Create Fee :", createFee.toString());
            console.log("Supply Fee :", supplyFee.toString());
            console.log("Voting Fee :", votingFee.toString());
            console.log("Total Fee  :", totalFee.toString());
            console.log("Balance    :", xymAmount.toString());

            if (xymAmount < totalFee) {
                throw new Error(
                    `手数料不足: 必要=${totalFee.toString()} / 保有=${xymAmount.toString()}`
                );
            }

            // =============================
            // それぞれのアナウンス
            // =============================

            //モザイク定義の署名とアナウンス
            try {
                console.log("[Create tournament] Announcing Mosaic Definition Transaction...");

                const definitionResult = await SignAndAnnounce(
                    mosaicDefinitionTx,
                    privateKey,
                    createFacade,
                    'https://sym-test-01.opening-line.jp:3001',
                    {
                        waitForConfirmation: true,
                        confirmationTimeoutMs: 180000,
                        pollIntervalMs: 2000
                    }
                );
                console.log("[Create tournament] Mosaic Definition TX Hash:", definitionResult.hash);
                console.log("[Create tournament] Mosaic Definition TX Announced Successfully!");
            } catch (txErr) {
                console.log("[Create tournament] Mosaic Definition TX Error", txErr);
                return;
            }


            //供給変更の署名とアナウンス
            try {
                console.log("[Create tournament] Announcing Supply Change Transaction...");


                const supplyResult = await SignAndAnnounce(
                    supplyTx,
                    privateKey,
                    supplyFacade,
                    'https://sym-test-01.opening-line.jp:3001',
                    {
                        waitForConfirmation: true,
                        confirmationTimeoutMs: 180000,
                        pollIntervalMs: 2000
                    }
                );
                console.log("[Create tournament] Supply Change TX Hash:", supplyResult.hash);
                console.log("[Create tournament] Supply Change TX Announced Successfully!");
            } catch (txErr) {
                console.log("[Create tournament] Supply Change TX Error", txErr);
                return;
            }

            // 署名とアナウンス
            try {
                console.log("[Create tournament] Announcing Send Voting Token Transaction...");

                const sendResult = await SignAndAnnounce(
                    aggregateTx,
                    privateKey,
                    supplyFacade,
                    'https://sym-test-01.opening-line.jp:3001',
                    { waitForConfirmation: true }
                );
                console.log("[Create tournament] Send Voting Token TX Hash:", sendResult.hash);
                console.log("[Create tournament] Send Voting Token TX Announced Successfully!");

                //作成時刻と終了時刻
                const now = new Date();
                const expire = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後

                // DB保存
                await DBPerf(
                    "Insert Into Mosaic",
                    "INSERT INTO Mosaic (MosaicID, CreateTime, ExpireTime) VALUES (?, ?, ?)",
                    [mosaicId, now, expire]
                );
                console.log(`[Create tournament] createTime:${now}`);
                console.log(`[Create tournament] expireTime:${expire}`);

            } catch (txErr) {
                console.log("[Create tournament] Send Voting Token TX Error", txErr);
                return;
            }

        } catch (txErr) {
            console.error("Error: Tournament-Announce", txErr);
        }


    } catch (err) {
        console.error("Error: Tournament-Cerate", err);
    }
});
