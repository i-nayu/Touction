import "./Register.css";
import { useState } from "react";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";

function Register() {
  const [userId, setUserId] = useState("");
  const [, setError] = useState("");
  const [, setSuccess] = useState("");
  const [, setIsSubmitting] = useState(false);
  const [qrCode, setQrCode] = useState("/qr.png");

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
    if (!userId) {
      setError("ユーザー名を入力してください。");
      return;
    }

    try {
      setIsSubmitting(true);

      await new Promise((resolve) => {
        setTimeout(resolve, 800);
      });

      console.log("送信データ:", { userId });
      const res = await fetch("/Register/Submit", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      console.log("サーバーからのレスポンス:", data);

      if (!res.ok) {
        setError("登録に失敗しました。もう一度お試しください。");
      } else {
        setQrCode(data.qrCode);
        setSuccess("アカウントを作成しました。ログインしてください。");
        setUserId("");
      }
    } catch (err) {
      setError("登録に失敗しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  };

return (
  <div className="register-page">
    <div className="register-tab">
      <h1>新規登録</h1>
    </div>

    <form onSubmit={handleSubmit}>
      <div className="register-container">
        <div className="register-form">
          <div className="input-group">
            <label htmlFor="username">ユーザー名を入力してください</label>
            <InputField
              name="username"
              placeholder="ユーザー名を入力"
              type="text"
              onChange={(e) => setUserId(e.target.value)}
            />
          </div>
          <div className="button-group">
            <ConfirmButton label="登録" type="submit" />
          </div>
        </div>
        {qrCode && (
          <img src={qrCode} alt="login qr" />
        )}
        <a href={qrCode} download="loginQR.png">
          <button>QRコードをダウンロード</button>
        </a>
        
      </div>
    </form>
  </div>
);
}

export default Register;