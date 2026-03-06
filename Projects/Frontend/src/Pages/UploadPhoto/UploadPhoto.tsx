import "./UploadPhoto.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";

function UploadPhoto() {
	const navigate = useNavigate();
	const [selectedQrFile, setSelectedQrFile] = useState<File | null>(null);
	const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
	const [comment, setComment] = useState("");
	const [message, setMessage] = useState("秘密鍵QRコード・写真・コメントを入力してください");
	const [isSubmitting, setIsSubmitting] = useState(false);

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

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (!selectedQrFile) {
			setMessage("秘密鍵QRコード画像を選択してください");
			return;
		}

		if (!selectedPhotoFile) {
			setMessage("アップロード写真を選択してください");
			return;
		}

		if (!comment.trim()) {
			setMessage("コメントを入力してください");
			return;
		}

		setIsSubmitting(true);
		try {
			const privateKey = await extractQrTextFromFile(selectedQrFile);

			const formData = new FormData();
			formData.append("privateKey", privateKey.trim());
			formData.append("comment", comment.trim());
			formData.append("photo", selectedPhotoFile);

			const res = await fetch("/Tournament/Upload", {
				method: "POST",
				credentials: "include",
				body: formData,
			});

			const data = await res.json().catch(() => null);
			if (!res.ok) {
				setMessage(data?.message ?? "アップロードに失敗しました");
				return;
			}

			setMessage("写真をアップロードしました");
			setSelectedPhotoFile(null);
			setSelectedQrFile(null);
			setComment("");
		} catch {
			setMessage("QRコード読み取りまたは通信に失敗しました");
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<main className="upload-photo-page">
			<header className="upload-photo-header">
				<h1 className="upload-photo-title">写真アップロード</h1>
				<div className="upload-photo-actions">
					<ConfirmButton label="トーナメント" type="button" onClick={() => navigate("/tournament")} />
					<ConfirmButton label="オークション" type="button" onClick={() => navigate("/auction")} />
				</div>
			</header>

			<section className="upload-photo-card">
				<form className="upload-photo-form" onSubmit={handleSubmit}>
					<div className="upload-photo-group">
						<label htmlFor="upload-photo-qr">1. 秘密鍵QRコード画像</label>
						<input
							id="upload-photo-qr"
							className="upload-photo-file-input"
							type="file"
							accept="image/*"
							onChange={(event) => {
								const file = event.target.files?.[0] ?? null;
								setSelectedQrFile(file);
							}}
						/>
						{selectedQrFile && <p className="upload-photo-file-name">選択中: {selectedQrFile.name}</p>}
						<p className="upload-photo-file-name">送信時にQRコードを自動で文字列化します</p>
					</div>

					<div className="upload-photo-group">
						<label htmlFor="upload-photo-image">2. アップロード写真</label>
						<input
							id="upload-photo-image"
							className="upload-photo-file-input"
							type="file"
							accept="image/*"
							onChange={(event) => {
								const file = event.target.files?.[0] ?? null;
								setSelectedPhotoFile(file);
							}}
						/>
						{selectedPhotoFile && <p className="upload-photo-file-name">選択中: {selectedPhotoFile.name}</p>}
					</div>

					<div className="upload-photo-group">
						<label htmlFor="upload-photo-comment">3. コメント</label>
						<textarea
							id="upload-photo-comment"
							className="upload-photo-textarea"
							rows={4}
							value={comment}
							onChange={(event) => setComment(event.target.value)}
							placeholder="写真のコメントを入力"
						/>
					</div>

					<div className="upload-photo-submit">
						<ConfirmButton label={isSubmitting ? "送信中..." : "送信"} type="submit" />
					</div>
					<p className="upload-photo-message">{message}</p>
				</form>
			</section>
		</main>
	);
}

export default UploadPhoto;
