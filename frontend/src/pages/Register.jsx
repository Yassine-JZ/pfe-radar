import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères");
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas");
    setBusy(true);
    try {
      await register(fullName, email, password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth">
      <form className="card" onSubmit={onSubmit}>
        <h1>Créer un compte</h1>
        <label>
          Nom complet
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Mot de passe (8 caractères minimum)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <label>
          Confirmer le mot de passe
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" disabled={busy}>
          {busy ? "Création…" : "S'inscrire"}
        </button>
        <p className="hint">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </form>
    </main>
  );
}