import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      if (!data.user) {
        setError('E-mail ou senha incorretos.');
        setLoading(false);
        return;
      }

      // Buscar role do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      // Redirecionar conforme role
      if (profile?.role === 'student') {
        navigate('/app');
      } else if (profile?.role === 'counselor') {
        navigate('/counselor');
      } else if (profile?.role === 'admin') {
        navigate('/admin');
      } else {
        // Fallback
        navigate('/app');
      }
    } catch (err) {
      setError('E-mail ou senha incorretos.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-start justify-center px-6 pt-16">
      <div className="w-full max-w-md bg-[#1E293B] rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Entrar no POPOV</h1>

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

          {/* Senha */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Senha</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
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
            disabled={!email || !password || loading}
            className="w-full mt-6 px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>

          {/* Link esqueci senha */}
          <p className="text-center text-[#94A3B8] text-sm mt-4">
            <a href="/forgot-password" className="hover:underline">Esqueci minha senha</a>
          </p>

          {/* Link para signup */}
          <p className="text-center text-[#94A3B8] text-sm mt-6">
            Não tem conta?{' '}
            <a href="/signup" className="text-white hover:underline">Criar conta</a>
          </p>
        </form>
      </div>
    </div>
  );
}
