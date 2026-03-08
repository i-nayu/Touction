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

async function SendTokens({
    facade,          // SymbolFacade
    signerPrivateKey,// 配布元の秘密鍵
    mosaicId,        // 配布するモザイクID
    users            // 配布対象ユーザー [{ address }, ...]
}) {
    // サイン用の KeyPairを作成
    const signer = facade.createAccount(signerPrivateKey);

    // innerTx（送信トランザクション） を作る
    const innerTxs = users.map(user => 
        facade.transactionFactory.create({
            type: 'transfer_transaction_v1',
            signerPublicKey: signer.publicKey,
            recipientAddress: user.address,
            mosaics: [{ mosaicId: BigInt('0x' + mosaicId), amount: BigInt(user.amount) }],
            deadline: facade.network.fromDatetime(new Date()).addHours(2).timestamp
        })
    );

    // トランザクションをまとめる
    const aggregateTx = facade.transactionFactory.aggregate({
        type: 'aggregate_complete_transaction_v1',
        signerPublicKey: signer.publicKey,
        innerTransactions: innerTxs,
        fee: 1_000_000n,
        deadline: facade.network.fromDatetime(new Date()).addHours(2).timestamp
    });


    return aggregateTx;
}

export default SendTokens;