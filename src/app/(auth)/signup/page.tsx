"use client";

import { useState } from "react";
import Link from "next/link";
import { signUp, signInWithGoogle } from "@/app/actions/auth";
import { Mail, Lock, User, Loader2, CheckCircle } from "lucide-react";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await signUp(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.success) {
      setSuccess(result.success);
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true);
    const result = await signInWithGoogle();
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="glass rounded-2xl p-8 border border-white/10 text-center">
        <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
        <h1 className="text-xl font-medium text-white mb-2">Fast geschafft!</h1>
        <p className="text-gray-400">{success}</p>
        <Link href="/login" className="text-gold-light hover:text-gold underline text-sm mt-4 inline-block">
          Zur Anmeldung
        </Link>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-8 border border-white/10">
      <h1 className="text-xl font-medium text-white text-center mb-6">Konto erstellen</h1>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            name="name"
            placeholder="Name"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
          />
        </div>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="email"
            name="email"
            placeholder="E-Mail"
            required
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="password"
            name="password"
            placeholder="Passwort (min. 6 Zeichen)"
            required
            minLength={6}
            className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/30 transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-gold to-gold-light text-navy font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Registrieren
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-[#0a1628] px-3 text-gray-500">oder</span>
        </div>
      </div>

      <button
        onClick={handleGoogle}
        disabled={loading}
        className="w-full py-3 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-colors flex items-center justify-center gap-3"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Mit Google registrieren
      </button>

      <p className="text-center text-gray-500 text-sm mt-6">
        Bereits ein Konto?{" "}
        <Link href="/login" className="text-gold-light hover:text-gold underline">
          Anmelden
        </Link>
      </p>

      <p className="text-center text-gray-600 text-xs mt-4">
        Mit der Registrierung akzeptierst du unsere{" "}
        <Link href="/datenschutz" className="underline">Datenschutzrichtlinie</Link>.
      </p>
    </div>
  );
}
