import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('E-mail inválido');
      return;
    }

    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (resetError) {
        setError('Não foi possível enviar o e-mail. Tente novamente.');
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch (err) {
      setError('Não foi possível enviar o e-mail. Tente novamente.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-start justify-center px-6 pt-16">
      <div className="w-full max-w-md bg-[#1E293B] rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-4">Recuperar senha</h1>
        <p className="text-[#94A3B8] mb-6">
          Digite seu e-mail e enviaremos um link para redefinir a senha.
        </p>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
                disabled={loading}
              />
            </div>

            {/* Erro */}
            {error && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444] rounded-lg p-3">
                <p className="text-[#EF4444] text-sm">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={!email || loading}
              className="w-full mt-6 px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Enviando...' : 'Enviar link de recuperação'}
            </button>

            {/* Link para login */}
            <p className="text-center text-[#94A3B8] text-sm mt-6">
              <a href="/login" className="hover:underline">Voltar para entrar</a>
            </p>
          </form>
        ) : (
          <div>
            <div className="bg-[#2BA88C]/10 border border-[#2BA88C] rounded-lg p-4 mb-6">
              <p className="text-[#2BA88C]">
                Enviamos um e-mail para {email}. Verifique sua caixa de entrada.
              </p>
            </div>
            <p className="text-center text-[#94A3B8] text-sm">
              <a href="/login" className="hover:underline">Voltar para entrar</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
