import "./AuctionBuy.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";

type BoughtPhoto = {
  PhotoID: number;
  UserID: number;
  PhotoPath: string;
  Amount: number;
};

type AuctionBuyResponse = {
  message?: string;
  userData?: BoughtPhoto[];
};

type AuctionBuyListResponse = {
  items?: BoughtPhoto[];
  boughtList?: BoughtPhoto[];
  userData?: BoughtPhoto[];
};

function normalizeBoughtList(data: unknown): BoughtPhoto[] {
  if (Array.isArray(data)) {
    return data as BoughtPhoto[];
  }

  if (data && typeof data === "object") {
    const typedData = data as AuctionBuyListResponse;
    if (Array.isArray(typedData.items)) {
      return typedData.items;
    }
    if (Array.isArray(typedData.boughtList)) {
      return typedData.boughtList;
    }
    if (Array.isArray(typedData.userData)) {
      return typedData.userData;
    }
  }

  return [];
}

function AuctionBuy() {
  const navigate = useNavigate();
  const [photos, setPhotos] = useState<BoughtPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("秘密鍵QRコード画像を選択して送信してください");
  const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
  const [isSendSucceeded, setIsSendSucceeded] = useState(false);

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

  async function handleSendQr() {
    if (!selectedQrFile) {
      setMessage("QRコード画像を選択してください");
      return;
    }

    setIsSendSucceeded(false);
    setPhotos([]);
    setIsLoading(true);
    try {
      const privateKey = await extractQrTextFromFile(selectedQrFile);

      const sendRes = await fetch("/AuctionBuy/AuctionBuy", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          privateKey,
        }),
      });

      const sendData: AuctionBuyResponse | null = await sendRes.json().catch(() => null);

      if (!sendRes.ok) {
        setMessage(sendData?.message ?? "秘密鍵の送信に失敗しました");
        return;
      }

      setIsSendSucceeded(true);
      setMessage(sendData?.message ?? "秘密鍵を送信しました");

      const listRes = await fetch("/AuctionBuy/List", {
        method: "GET",
        credentials: "include",
      });

      if (listRes.ok) {
        const listData: AuctionBuyListResponse = await listRes.json();
        setPhotos(normalizeBoughtList(listData));
        return;
      }

      setPhotos(normalizeBoughtList(sendData));
    } catch (error) {
      const nextMessage = error instanceof Error ? error.message : "通信エラー";
      setMessage(nextMessage);
      setIsSendSucceeded(false);
      setPhotos([]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="auction-buy-page">
      <header className="auction-buy-header">
        <h1 className="auction-buy-title">購入一覧</h1>
        <div className="auction-buy-actions">
          <ConfirmButton label="オークション" type="button" onClick={() => navigate("/auction")} />
        </div>
      </header>

      <section className="auction-buy-list-wrap">
        <div className="auction-buy-upload">
          <label htmlFor="auction-buy-qr" className="auction-buy-file-label">QRファイルを選択</label>
          <input
            id="auction-buy-qr"
            className="auction-buy-file-input"
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null;
              setSelectedQrFile(file);
            }}
          />
          {selectedQrFile && <p className="auction-buy-file-name">選択中: {selectedQrFile.name}</p>}
          <ConfirmButton
            label={isLoading ? "送信中..." : "秘密鍵を送信して取得"}
            type="button"
            onClick={handleSendQr}
          />
        </div>

        {isLoading && <p className="auction-buy-message">処理中...</p>}

        {!isLoading && !isSendSucceeded && <p className="auction-buy-message">{message}</p>}

        {!isLoading && isSendSucceeded && photos.length === 0 && (
          <p className="auction-buy-message">表示できる購入データがありません</p>
        )}

        {!isLoading && isSendSucceeded && photos.length > 0 && (
          <ul className="auction-buy-list">
            {photos.map((photo) => (
              <li className="auction-buy-item" key={photo.PhotoID}>
                <img
                  className="auction-buy-image"
                  src={photo.PhotoPath}
                  alt={`bought-${photo.PhotoID}`}
                />
                <div className="auction-buy-meta">
                  <p>PhotoID: {photo.PhotoID}</p>
                  <p>UserID: {photo.UserID}</p>
                  <p>購入額: {photo.Amount}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default AuctionBuy;