/*========== Manual ==========
# Input
type: ネットワークタイプ
originalPrivateKey: 秘密鍵

# Output
生成したアドレスを返す
========== Manual ==========*/

// symbol-sdk v3
import { SymbolFacade } from 'symbol-sdk/symbol';
import { PrivateKey } from 'symbol-sdk';

function GetAddress(type, originalPrivateKey) {
    const facade = new SymbolFacade(type);
    const privateKey = new PrivateKey(originalPrivateKey);

    // 公開鍵を取得
    const publicKey = facade.keyPairFromPrivateKey(privateKey).publicKey;

    // アドレス生成
    const address = facade.network.publicKeyToAddress(publicKey);

    console.log(address.toString());

    return address.toString();
}

export default GetAddress;

