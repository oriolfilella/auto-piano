// src/components/Auth.tsx
"use client";
import { useState } from "react";
import { supabase } from "../utils/superbaseClient";

type AuthProps = {
  onGuest: () => void;
};

export default function Auth({ onGuest }: AuthProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) alert(error.message);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) alert(error.message);
      else alert("✅ ¡Registro exitoso! Ya puedes iniciar sesión.");
    }

    setLoading(false);
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-2">
          🎹 AutoPiano
        </h1>
        <p className="text-center text-gray-500 mb-8">
          {isLogin
            ? "Inicia sesión para ver tus partituras"
            : "Crea tu cuenta gratis"}
        </p>

        <form onSubmit={handleAuth} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 mt-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition disabled:bg-blue-300"
          >
            {loading ? "Cargando..." : isLogin ? "Entrar" : "Registrarse"}
          </button>
        </form>

        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-sm text-blue-600 hover:underline font-semibold"
          >
            {isLogin
              ? "¿No tienes cuenta? Regístrate aquí"
              : "¿Ya tienes cuenta? Inicia sesión"}
          </button>

          {/* 🔥 BOTÓN DE INVITADO */}
          <div className="relative flex py-4 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">O</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <button
            onClick={onGuest}
            className="w-full py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition border border-gray-300"
          >
            🕵️ Continuar como Invitado
          </button>
        </div>
      </div>
    </div>
  );
}
