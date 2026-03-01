import crypto from 'crypto';

// ========== 暗号化 ==========
function encrypt(plainKey, plainText) {
  // ① 平文1から32byteの鍵を作る
  const key = crypto
    .createHash('sha256')
    .update(plainKey)
    .digest();

  // ② IV（12byteがGCM推奨）
  const iv = crypto.randomBytes(12);

  // ③ 暗号化
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final()
  ]);

  // ④ 認証タグ
  const authTag = cipher.getAuthTag();

  return {
    iv: iv.toString('hex'),
    data: encrypted.toString('hex'),
    tag: authTag.toString('hex')
  };
}

// ========== 復号化 ==========
function decrypt(plainKey, encryptedObj) {
  const key = crypto
    .createHash('sha256')
    .update(plainKey)
    .digest();

  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const encryptedText = Buffer.from(encryptedObj.data, 'hex');
  const authTag = Buffer.from(encryptedObj.tag, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedText),
    decipher.final()
  ]);

  return decrypted.toString('utf8');
}

export {
  encrypt,
  decrypt
};
