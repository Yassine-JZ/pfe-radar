import { useCallback, useState } from "react";
import { uploadCv } from "../api";
import { useAuth } from "../auth/AuthContext";

const MAX_SIZE = 5 * 1024 * 1024;

export function useCvUpload() {
  const { token } = useAuth();
  const [status, setStatus] = useState("idle"); // idle | uploading | done | error
  const [cv, setCv] = useState(null);
  const [error, setError] = useState("");

  const fail = (message) => {
    setCv(null);
    setStatus("error");
    setError(message);
  };

  const upload = useCallback(
    async (file) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        return fail("Seuls les fichiers PDF sont acceptés");
      }
      if (file.size > MAX_SIZE) {
        return fail("Fichier trop lourd (5 Mo maximum)");
      }
      setStatus("uploading");
      setError("");
      try {
        const data = await uploadCv(file, token);
        setCv(data);
        setStatus("done");
      } catch (err) {
        fail(err instanceof TypeError ? "Impossible de joindre le serveur" : err.message);
      }
    },
    [token]
  );

  const reset = useCallback(() => {
    setCv(null);
    setStatus("idle");
    setError("");
  }, []);

  return { status, cv, error, upload, reset };
}