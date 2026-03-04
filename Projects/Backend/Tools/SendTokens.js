async function SendTokens({
    facade,          // SymbolFacade
    signerPrivateKey,// 配布元の秘密鍵
    mosaicId,        // 配布するモザイクID
    users            // 配布対象ユーザー [{ Address }, ...]
}) {
    // サイン用の KeyPairを作成
    const signer = facade.createAccount(signerPrivateKey);

    // innerTx（送信トランザクション） を作る
    const innerTxs = users.map(user => 
        facade.transactionFactory.create({
            type: 'transfer_transaction_v1',
            signerPublicKey: signer.publicKey,
            recipientAddress: user.Address,
            mosaics: [{ mosaicId: BigInt('0x' + mosaicId), amount: 1n }],
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