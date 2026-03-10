import "./Tournament.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PhotoButton from "../../Components/PhotoButton/PhotoButton";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";
import jsQR from "jsqr";

const INITIAL_VOTES_LEFT = 12;

function Tournament() {
  const navigate = useNavigate();
  const [votesLeft] = useState(INITIAL_VOTES_LEFT);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [expireTime, setExpireTime] = useState<string | number>("読み込み中...");
  const [selectedPhoto, setSelectedPhoto] = useState<any | null>(null);
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [selectedQrText, setSelectedQrText] = useState<string | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  // QR秘密鍵を sessionStorage から取得
  useEffect(() => {
    const qrFromSession = sessionStorage.getItem("qrCodeData");
    if (qrFromSession) {
      setSelectedQrText(qrFromSession);
    }
  }, []);

  async function DeadlineTime(expireTime: Date) {
    const now = new Date();
    const LeftTime = expireTime.getTime() - now.getTime();
    if (LeftTime <= 0) return "投票終了";
    return LeftTime;
  }

  useEffect(() => {
    async function fetchTournamentData() {
      try {
        const res = await fetch("/Tournament/PhotoList", {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) {
          toast.error("トーナメントデータの取得に失敗しました");
          return;
        }
        const data = await res.json();
        if (data.expireTime) {
          const expire = await DeadlineTime(new Date(data.expireTime));
          setExpireTime(expire);
        } else {
          setExpireTime("-");
        }
        setPhotos(data.photos);
      } catch (error) {
        toast.error("通信エラー");
      } finally {
        setIsLoading(false);
      }
    }
    fetchTournamentData();
  }, []);

  function openQrModal(photo: any) {
    setSelectedPhoto(photo);
    setSelectedQrFile(null);
    setIsQrModalOpen(true);
  }

  function closeQrModal() {
    setIsQrModalOpen(false);
    setSelectedPhoto(null);
    setSelectedQrFile(null);
  }

// File（QR画像）から文字列を取得する関数
async function decodeQRCodeFromFile(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvasの2Dコンテキストが取得できません"));
          return;
        }

        ctx.drawImage(image, 0, 0);

        // jsQRでQRコードを解析
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        resolve(code?.data || null);
      };
      image.onerror = () => reject(new Error("画像の読み込みに失敗しました"));
      image.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("ファイルの読み込みに失敗しました"));
    reader.readAsDataURL(file); // File を DataURL に変換
  });
}

  async function handleQrUpload() {
    if (!selectedPhoto) {
      toast.error("写真を選択してください");
      return;
    }

    // sessionStorageの秘密鍵がある場合はそれを使う
    const qrTextToSend =
      selectedQrText ?? (selectedQrFile ? await decodeQRCodeFromFile(selectedQrFile) : null);

    if (!qrTextToSend) {
      toast.error("QRコードまたは秘密鍵がありません");
      return;
    }

    setIsUploadingQr(true);
    try {
      const res = await fetch("/Tournament/Vote", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: selectedPhoto.id,
          privateKey: qrTextToSend,
        }),
      });

      if (!res.ok) {
        toast.error("秘密鍵の送信に失敗しました");
        return;
      }

      toast.success("秘密鍵を送信しました");

      // sessionStorageに保存（初回アップロードの場合のみ）
      if (!selectedQrText) {
        sessionStorage.setItem("qrCodeData", qrTextToSend);
        setSelectedQrText(qrTextToSend);
      }

      closeQrModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : "通信エラー";
      toast.error(message);
    } finally {
      setIsUploadingQr(false);
    }
  }

  return (
    <main className="tournament-page">
      <header className="tournament-tab">
        <h1 className="tournament-title">トーナメント投票</h1>
        <ConfirmButton label="オークション" type="button" onClick={() => navigate("/auction")} />
        <ConfirmButton label="購入一覧" type="button" onClick={() => navigate("/auction-buy")} />
        <ConfirmButton label="アップロード" type="button" onClick={() => navigate("/upload-photo")} />
      </header>

      <section className="status-row">
        <article className="status-card">
          <p className="status-label">残り時間</p>
          <p className="status-value">{expireTime}</p>
        </article>

        <article className="status-card">
          <p className="status-label">残り投票数</p>
          <p className="status-value">{votesLeft}</p>
        </article>
      </section>

      <section className="photo-section">
        <div>
          <h2 className="photo-section-title">投票する写真を選んでください</h2>
        </div>
        <div className="photo-grid">
          {isLoading && <p className="tournament-message">読み込み中...</p>}
          {!isLoading && photos.length === 0 && <p className="tournament-message">表示できる写真がありません</p>}
          {!isLoading &&
            photos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                <PhotoButton
                  icon={photo.imageUrl}
                  label={photo.title}
                  onClick={() => {
                    setSelectedPhoto(photo);
                    // 秘密鍵があればモーダルを開かず直接送信
                    if (selectedQrText) {
                      handleQrUpload();
                    } else {
                      openQrModal(photo);
                    }
                  }}
                />
              </article>
            ))}
        </div>
      </section>

      {/* QRモーダルは秘密鍵がない場合のみ表示 */}
      {!selectedQrText && isQrModalOpen && (
        <div className="qr-modal-backdrop" onClick={closeQrModal}>
          <section className="qr-modal" onClick={(event) => event.stopPropagation()} aria-modal="true" role="dialog">
            <h2 className="qr-modal-title">秘密鍵QRコード画像を読み取る</h2>
            <p className="qr-modal-text">秘密鍵QRコード画像を選択して送信してください。</p>

            <div className="qr-file-input-wrap">
              <label htmlFor="qr-file" className="qr-file-label">
                ファイルを選択
              </label>
              <input
                id="qr-file"
                className="qr-file-input"
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  setSelectedQrFile(file);
                }}
              />
            </div>
            {selectedQrFile && <p className="qr-file-name">選択中: {selectedQrFile.name}</p>}

            <div className="qr-modal-actions">
              <ConfirmButton label="閉じる" type="button" onClick={closeQrModal} />
              <ConfirmButton
                label={isUploadingQr ? "送信中..." : "サーバーに送信"}
                type="button"
                onClick={handleQrUpload}
              />
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default Tournament;