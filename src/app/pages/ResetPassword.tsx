import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (newPassword.length < 8) {
      newErrors.newPassword = 'A senha precisa ter pelo menos 8 caracteres';
    }

    if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError('');

    if (!validateForm()) return;

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        setGeneralError('Não foi possível redefinir a senha. Tente novamente.');
        setLoading(false);
        return;
      }

      // Redirecionar para login
      navigate('/login', { state: { message: 'Senha redefinida. Entre com a nova senha.' } });
    } catch (err) {
      setGeneralError('Não foi possível redefinir a senha. Tente novamente.');
      setLoading(false);
    }
  };

  const isFormValid = newPassword.length >= 8 && confirmPassword === newPassword;

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-start justify-center px-6 pt-16">
      <div className="w-full max-w-md bg-[#1E293B] rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Definir nova senha</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nova senha */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nova senha</label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-[#EF4444] text-sm mt-1">{errors.newPassword}</p>}
          </div>

          {/* Confirmar senha */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Confirmar nova senha</label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-white"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-[#EF4444] text-sm mt-1">{errors.confirmPassword}</p>}
          </div>

          {/* Erro geral */}
          {generalError && (
            <div className="bg-[#EF4444]/10 border border-[#EF4444] rounded-lg p-3">
              <p className="text-[#EF4444] text-sm">{generalError}</p>
            </div>
          )}

          {/* Botão */}
          <button
            type="submit"
            disabled={!isFormValid || loading}
            className="w-full mt-6 px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
