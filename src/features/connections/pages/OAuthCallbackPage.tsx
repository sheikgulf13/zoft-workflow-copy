import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function OAuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const state = params.get("state") || undefined;
      if (code) {
        // Post to opener if exists (popup flow)
        if (window.opener) {
          window.opener.postMessage({ type: "OAUTH_CODE", code, state }, "*");
          window.close();
          return;
        }
        // Fallback: navigate back to connections with code in query
        const qs = new URLSearchParams({ code, ...(state ? { state } : {}) });
        navigate(`/connections?${qs.toString()}`, { replace: true });
      } else {
        navigate(`/connections`, { replace: true });
      }
    } catch {
      navigate(`/connections`, { replace: true });
    }
  }, [navigate]);

  return (
    <div className="container-page py-10 text-center text-theme-secondary">
      Completing authentication…
    </div>
  );
}


