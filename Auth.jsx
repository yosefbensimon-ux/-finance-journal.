import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Auth() {
  const [mode, setMode] = useState("signin"); // signin | signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setInfo("נרשמת בהצלחה. אם נדרש אימות אימייל, בדוק/י את תיבת הדואר שלך.");
      }
    } catch (err) {
      setError(err.message || "אירעה שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F1F3F8", fontFamily: "'Assistant', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Assistant:wght@400;500;600;700&family=Frank+Ruhl+Libre:wght@700&display=swap');`}</style>
      <form onSubmit={handleSubmit} style={{ width: "100%", maxWidth: "22rem", background: "#fff", borderRadius: "0.9rem", border: "1px solid #E1E5EE", padding: "2rem 1.5rem", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "1.5rem" }}>
          <div style={{ width: "2.1rem", height: "2.1rem", borderRadius: "0.5rem", background: "#3B6FC7", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "'Frank Ruhl Libre', serif", color: "#fff", fontWeight: 700 }}>₪</span>
          </div>
          <h1 style={{ fontFamily: "'Frank Ruhl Libre', serif", fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>לוח הבקרה הפיננסי</h1>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1.25rem", background: "#EEF2FB", borderRadius: "0.5rem", padding: "0.25rem" }}>
          <button type="button" onClick={() => setMode("signin")} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.4rem", border: "none", cursor: "pointer", background: mode === "signin" ? "#fff" : "transparent", fontWeight: 600, fontSize: "0.85rem", color: "#1F2328" }}>כניסה</button>
          <button type="button" onClick={() => setMode("signup")} style={{ flex: 1, padding: "0.5rem", borderRadius: "0.4rem", border: "none", cursor: "pointer", background: mode === "signup" ? "#fff" : "transparent", fontWeight: 600, fontSize: "0.85rem", color: "#1F2328" }}>הרשמה</button>
        </div>

        <label style={{ fontSize: "0.75rem", color: "#5B6470" }}>אימייל</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />

        <label style={{ fontSize: "0.75rem", color: "#5B6470" }}>סיסמה</label>
        <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />

        {error && <div style={{ color: "#C5453D", fontSize: "0.8rem", margin: "0.5rem 0" }}>{error}</div>}
        {info && <div style={{ color: "#1E8E5A", fontSize: "0.8rem", margin: "0.5rem 0" }}>{info}</div>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: "0.75rem", borderRadius: "0.5rem", border: "none", background: "#3B6FC7", color: "#fff", fontWeight: 600, fontSize: "0.9rem", cursor: "pointer", marginTop: "0.75rem", opacity: loading ? 0.7 : 1 }}>
          {loading ? "רגע..." : mode === "signin" ? "כניסה" : "הרשמה"}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  borderRadius: "0.5rem",
  border: "1px solid #DFE3E7",
  background: "#F8F9FA",
  fontSize: "0.88rem",
  outline: "none",
  marginBottom: "0.9rem",
  marginTop: "0.3rem",
  fontFamily: "'Assistant', sans-serif",
};
