import "./Tournament.css";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import PhotoButton from "../../Components/PhotoButton/PhotoButton";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";

type TournamentPhoto = {
  id: number;
  title: string;
  imageUrl: string;
  comment: string;
};

type TournamentApiPhoto = {
  PhotoID: number;
  PhotoPath: string;
  Comment: string;
};

type TournamentResponse = {
  expireTime: string | null;
  photos: TournamentApiPhoto[];
};

const INITIAL_VOTES_LEFT = 12;

function Tournament() {
  const navigate = useNavigate();
  const [deadlineTime, setDeadlineTime] = useState<string | number>("読み込み中...");
  const [votesLeft] = useState(INITIAL_VOTES_LEFT);
  const [photos, setPhotos] = useState<TournamentPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<TournamentPhoto | null>(null);
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

    
    async function DeadlineTime(expireTime: Date) {
        const now = new Date();
        const LeftTime = expireTime.getTime() - now.getTime();
        if(LeftTime <= 0){
            return "投票終了";
        }
        return LeftTime;
    }
    
  useEffect(()=> {
        async function fetchTournamentData() {
            try{
                const res = await fetch('/Tournament/PhotoList', {
                    method: 'GET',
                    credentials: 'include',
                });
                if(!res.ok){
                    toast.error("トーナメントデータの取得に失敗しました");
                    return;
                }
                const data: TournamentResponse = await res.json();
                if (data.expireTime) {
                  const deadlineTime = await DeadlineTime(new Date(data.expireTime));
                  setDeadlineTime(deadlineTime);
                } else {
                  setDeadlineTime("-");
                }

                const mappedPhotos: TournamentPhoto[] = (data.photos ?? []).map((photo: TournamentApiPhoto) => ({
                  id: photo.PhotoID,
                  title: photo.Comment?.trim() || `写真 ${photo.PhotoID}`,
                  imageUrl: photo.PhotoPath,
                  comment: photo.Comment ?? "",
                }));
                setPhotos(mappedPhotos);
            }catch(error){
                toast.error("通信エラー");
              } finally {
                setIsLoading(false);
            }
        }
        fetchTournamentData();
        }
    , []);

  function openQrModal(photo: TournamentPhoto) {
    setSelectedPhoto(photo);
    setSelectedQrFile(null);
    setIsQrModalOpen(true);
  }

  function closeQrModal() {
    setIsQrModalOpen(false);
    setSelectedPhoto(null);
    setSelectedQrFile(null);
  }

  async function extractQrTextFromFile(file: File) {
    const BarcodeDetectorConstructor = (
      window as Window & {
        BarcodeDetector?: new (options?: { formats?: string[] }) => {
          detect: (source: CanvasImageSource) => Promise<Array<{ rawValue?: string }>>;
        };
      }
    ).BarcodeDetector;

    if (!BarcodeDetectorConstructor) {
      throw new Error("このブラウザはQRコードの画像読取に対応していません");
    }

    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = imageBitmap.width;
    canvas.height = imageBitmap.height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("画像の読み取りに失敗しました");
    }

    context.drawImage(imageBitmap, 0, 0);
    imageBitmap.close();

    const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });
    const detectedCodes = await detector.detect(canvas);
    const qrText = detectedCodes[0]?.rawValue?.trim();

    if (!qrText) {
      throw new Error("QRコードを画像から読み取れませんでした");
    }

    return qrText;
  }

  async function handleQrUpload() {
    if (!selectedQrFile) {
      toast.error("QRコード画像を選択してください");
      return;
    }

    setIsUploadingQr(true);
    try {
      const qrText = await extractQrTextFromFile(selectedQrFile);

      const res = await fetch("/Tournament/Vote", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          photoId: selectedPhoto?.id ?? null,
          privateKey: qrText,
        }),
      });

      if (!res.ok) {
        toast.error("QRコード文字列の送信に失敗しました");
        return;
      }

      toast.success("QRコード文字列を送信しました");
      closeQrModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "通信エラー";
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
            <p className="status-value">{deadlineTime}</p>
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
          {!isLoading && photos.map((photo) => (
            <article className="photo-card" key={photo.id}>
            <PhotoButton 
                icon={photo.imageUrl} 
                label={photo.title}
                onClick={() => openQrModal(photo)} 
            />
            </article>
          ))}
        </div>
      </section>

      {isQrModalOpen && (
        <div className="qr-modal-backdrop" onClick={closeQrModal}>
          <section
            className="qr-modal"
            onClick={(event) => event.stopPropagation()}
            aria-modal="true"
            role="dialog"
          >
            <h2 className="qr-modal-title">秘密鍵QRコード画像を読み取る</h2>
            <p className="qr-modal-text">
              秘密鍵QRコード画像を選択して送信してください。
            </p>

            <div className="qr-file-input-wrap">
              <label htmlFor="qr-file" className="qr-file-label">ファイルを選択</label>
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
