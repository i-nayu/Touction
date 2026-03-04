import "./Register.css";
import { useState } from "react";
import InputField from "../../Components/InputField/InputField";
import ConfirmButton from "../../Components/ConfirmButton/ConfirmButton";

function Register() {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess("");

    if (!username) {
      setError("ユーザー名を入力してください。");
      return;
    }

    try {
      setIsSubmitting(true);

      await new Promise((resolve) => {
        setTimeout(resolve, 800);
      });

      console.log("送信データ:", { username });
      setSuccess("アカウントを作成しました。ログインしてください。");
      setUsername("");
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
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="button-group">
            <ConfirmButton label="登録" type="submit" />
          </div>

        </div>
      </div>
    </form>
  </div>
);
}

export default Register;