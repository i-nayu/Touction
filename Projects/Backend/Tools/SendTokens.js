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

    // innerTx（送信トランザクション） を作る
    const innerTxs = users.map(user =>
        facade.transactionFactory.createEmbedded({
            type: 'transfer_transaction_v1',
            signerPublicKey: signer.publicKey,
            recipientAddress: user.address,
            mosaics: [{ mosaicId: BigInt('0x' + mosaicId), amount: BigInt(user.amount) }]
        })
    );

    // トランザクションをまとめる
    const aggregateTx = facade.transactionFactory.create({
        type: 'aggregate_complete_transaction_v1',
        signerPublicKey: signer.publicKey,
        transactions: innerTxs,
        deadline: facade.network.fromDatetime(new Date()).addHours(2).timestamp
    });

    const multiplier = 100n;
    aggregateTx.fee = BigInt(aggregateTx.size) * multiplier;


    return aggregateTx;
}

export default SendTokens;