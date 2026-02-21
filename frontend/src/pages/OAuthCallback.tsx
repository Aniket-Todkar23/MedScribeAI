import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { appointmentService } from "../services/appointmentService";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

/**
 * This page handles the Google OAuth redirect.
 * Opens in a popup — exchanges the code, saves tokens, then closes itself.
 */
const OAuthCallback: React.FC = () => {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const error = params.get("error");
      if (error) {
        setStatus("error");
        setMessage(decodeURIComponent(error));
        return;
      }

      // Google redirects → backend forwards raw code → frontend exchanges it
      // via the authenticated POST /appointments/google/callback endpoint
      // which both exchanges the code AND saves tokens to the doctor's DB row.
      const code = params.get("code");
      if (code) {
        try {
          await appointmentService.exchangeGoogleCode(code);
          setStatus("success");
          setMessage("Google Calendar connected successfully!");
          if (window.opener) {
            window.opener.postMessage({ type: "google-oauth-success" }, "*");
          }
          setTimeout(() => window.close(), 2000);
        } catch {
          setStatus("error");
          setMessage("Failed to connect Google Calendar. The code may have expired.");
        }
        return;
      }

      setStatus("error");
      setMessage("No authorization code received.");
    };

    handleCallback();
  }, [params]);

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16, backgroundColor: "#F8FAFC",
    }}>
      {status === "loading" && (
        <>
          <Loader2 size={40} className="animate-spin" style={{ color: "#0F766E" }} />
          <p style={{ color: "#475569", fontSize: 16 }}>Connecting Google Calendar…</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle size={48} style={{ color: "#059669" }} />
          <p style={{ color: "#059669", fontSize: 18, fontWeight: 700 }}>{message}</p>
          <p style={{ color: "#94A3B8", fontSize: 14 }}>This window will close automatically.</p>
        </>
      )}
      {status === "error" && (
        <>
          <XCircle size={48} style={{ color: "#DC2626" }} />
          <p style={{ color: "#DC2626", fontSize: 16, fontWeight: 600 }}>{message}</p>
          <button
            onClick={() => window.close()}
            style={{
              padding: "10px 24px", borderRadius: 10, fontSize: 14, fontWeight: 600,
              backgroundColor: "#0F766E", color: "white", border: "none", cursor: "pointer", marginTop: 8,
            }}
          >
            Close
          </button>
        </>
      )}
    </div>
  );
};

export default OAuthCallback;
