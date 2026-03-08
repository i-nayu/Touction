/*==========Manual)==========
# Input
facade: 
signerPrivateKey: 送信者の秘密鍵
mosaicId: 
users: 送信対象のアドレスと送信したいモザイク量

# Output
生成したトランザクションを返す

# Detail
複数のトランザクションをまとめて作成する関数
トランザクション作成のみ
モザイク量は固定
========== Manual ==========*/
import { PrivateKey } from 'symbol-sdk';
import { SymbolFacade } from 'symbol-sdk/symbol';

async function SendTokens({
    privateKey,// 配布元の秘密鍵
    mosaicId,        // 配布するモザイクID
    users            // 配布対象ユーザー [{ address }, ...]
}) {
    // Facade 初期化
    const facade = new SymbolFacade('testnet');

    // サイン用の KeyPairを作成
    const signer = facade.createAccount(privateKey);

    console.log("mosaicId:", mosaicId);
    console.log("type:", typeof mosaicId);

    // innerTx（送信トランザクション） を作る
    const innerTxs = users.map(user => {
        if (!user.address) throw new Error('address missing');
        if (user.amount === undefined) throw new Error('amount missing');

        const mosaicIdBigInt = BigInt(
            mosaicId.startsWith('0x')
                ? mosaicId
                : '0x' + mosaicId
        );
        console.log("mosaicIdBigInt:", mosaicIdBigInt);

        return facade.transactionFactory.createEmbedded({
            type: 'transfer_transaction_v1',
            signerPublicKey: signer.publicKey,
            recipientAddress: user.address,
            mosaics: [{
                mosaicId: mosaicIdBigInt,
                amount: BigInt(user.amount)
            }]
        });
    });
    console.log(innerTxs.length)

    // トランザクションをまとめる
    if (innerTxs.length === 0) throw new Error('No transactions to aggregate');
    const networkTimestamp = facade.network.fromDatetime(
        new Date(Date.now() + 2 * 60 * 60 * 1000)
    );

    const deadline = BigInt(networkTimestamp.timestamp);

    const aggregateTx = facade.transactionFactory.create({
        type: 'aggregate_complete_transaction_v1',
        signerPublicKey: signer.publicKey,
        transactions: innerTxs,
        deadline
    });

    aggregateTx.fee = BigInt(aggregateTx.size) * 100n;


    return aggregateTx;
}

export default SendTokens;