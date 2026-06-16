import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Signup() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [birthDate, setBirthDate] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [signupType, setSignupType] = useState<'individual' | 'school'>('individual');
  const [schoolId, setSchoolId] = useState('');
  const [className, setClassName] = useState('');

  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState('');

  const educationLevels = [
    'Ensino Fundamental II (6º ao 9º ano)',
    'Ensino Médio - 1ª série',
    'Ensino Médio - 2ª série',
    'Ensino Médio - 3ª série',
    'Cursinho pré-vestibular',
    'Ensino Superior (universitário)',
    'Já concluí o Ensino Superior',
    'Outro'
  ];

  const brazilianStates = [
    { code: 'AC', name: 'Acre' },
    { code: 'AL', name: 'Alagoas' },
    { code: 'AP', name: 'Amapá' },
    { code: 'AM', name: 'Amazonas' },
    { code: 'BA', name: 'Bahia' },
    { code: 'CE', name: 'Ceará' },
    { code: 'DF', name: 'Distrito Federal' },
    { code: 'ES', name: 'Espírito Santo' },
    { code: 'GO', name: 'Goiás' },
    { code: 'MA', name: 'Maranhão' },
    { code: 'MT', name: 'Mato Grosso' },
    { code: 'MS', name: 'Mato Grosso do Sul' },
    { code: 'MG', name: 'Minas Gerais' },
    { code: 'PA', name: 'Pará' },
    { code: 'PB', name: 'Paraíba' },
    { code: 'PR', name: 'Paraná' },
    { code: 'PE', name: 'Pernambuco' },
    { code: 'PI', name: 'Piauí' },
    { code: 'RJ', name: 'Rio de Janeiro' },
    { code: 'RN', name: 'Rio Grande do Norte' },
    { code: 'RS', name: 'Rio Grande do Sul' },
    { code: 'RO', name: 'Rondônia' },
    { code: 'RR', name: 'Roraima' },
    { code: 'SC', name: 'Santa Catarina' },
    { code: 'SP', name: 'São Paulo' },
    { code: 'SE', name: 'Sergipe' },
    { code: 'TO', name: 'Tocantins' }
  ];

  useEffect(() => {
    const fetchSchools = async () => {
      const { data } = await supabase
        .from('schools')
        .select('id, name')
        .eq('active', true)
        .order('name');
      setSchools(data || []);
    };
    fetchSchools();
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (fullName.trim().length < 3) {
      newErrors.fullName = 'Nome completo deve ter pelo menos 3 caracteres';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (password.length < 8) {
      newErrors.password = 'A senha precisa ter pelo menos 8 caracteres';
    }

    if (!birthDate) {
      newErrors.birthDate = 'Preencha a data de nascimento';
    } else {
      const birthYear = new Date(birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (birthYear < 1940 || birthYear > currentYear - 5) {
        newErrors.birthDate = `Ano de nascimento deve estar entre 1940 e ${currentYear - 5}`;
      }
    }

    if (!educationLevel) {
      newErrors.educationLevel = 'Selecione o nível educacional';
    }

    if (!state) {
      newErrors.state = 'Selecione o estado';
    }

    if (city.trim().length < 2) {
      newErrors.city = 'Cidade deve ter pelo menos 2 caracteres';
    }

    if (signupType === 'school') {
      if (!schoolId) newErrors.schoolId = 'Selecione uma escola';
      if (!className.trim()) newErrors.className = 'Preencha a turma';
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
      // 1. Criar usuário
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) {
        // Mapear erros
        if (authError.message.includes('User already registered') || authError.message.includes('already exists')) {
          setGeneralError('Este e-mail já está cadastrado. Tente entrar.');
        } else if (authError.message.includes('Password should be at least')) {
          setGeneralError('A senha precisa ter pelo menos 8 caracteres.');
        } else if (authError.message.includes('Invalid email')) {
          setGeneralError('E-mail inválido.');
        } else {
          setGeneralError('Não foi possível criar a conta. Tente novamente em alguns instantes.');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setGeneralError('Não foi possível criar a conta. Tente novamente em alguns instantes.');
        setLoading(false);
        return;
      }

      // 2. Criar profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        role: 'student',
        full_name: fullName,
        email,
        birth_date: birthDate,
        education_level: educationLevel,
        city,
        state
      });

      if (profileError) {
        setGeneralError('Conta criada, mas houve um erro ao configurar o perfil. Entre em contato com o suporte.');
        setLoading(false);
        return;
      }

      // 3. Se cadastro por escola, criar vínculo
      if (signupType === 'school' && schoolId && className) {
        await supabase.from('student_schools').insert({
          student_id: authData.user.id,
          school_id: schoolId,
          class_name: className
        });
      }

      // 4. Redirecionar
      navigate('/app');
    } catch (err) {
      setGeneralError('Não foi possível criar a conta. Tente novamente em alguns instantes.');
      setLoading(false);
    }
  };

  const isFormValid = fullName.trim().length >= 3 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    birthDate &&
    educationLevel &&
    state &&
    city.trim().length >= 2 &&
    (signupType === 'individual' || (schoolId && className.trim()));

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-start justify-center px-6 pt-16">
      <div className="w-full max-w-md bg-[#1E293B] rounded-xl p-8 shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Criar conta no POPOV</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome completo */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nome completo</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            />
            {errors.fullName && <p className="text-[#EF4444] text-sm mt-1">{errors.fullName}</p>}
          </div>

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
            {errors.email && <p className="text-[#EF4444] text-sm mt-1">{errors.email}</p>}
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
            {errors.password && <p className="text-[#EF4444] text-sm mt-1">{errors.password}</p>}
          </div>

          {/* Data de nascimento */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Data de nascimento</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            />
            {errors.birthDate && <p className="text-[#EF4444] text-sm mt-1">{errors.birthDate}</p>}
          </div>

          {/* Nível educacional */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nível educacional atual</label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {educationLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            {errors.educationLevel && <p className="text-[#EF4444] text-sm mt-1">{errors.educationLevel}</p>}
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Estado (UF)</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {brazilianStates.map((st) => (
                <option key={st.code} value={st.code}>{st.code} — {st.name}</option>
              ))}
            </select>
            {errors.state && <p className="text-[#EF4444] text-sm mt-1">{errors.state}</p>}
          </div>

          {/* Cidade */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Cidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            />
            {errors.city && <p className="text-[#EF4444] text-sm mt-1">{errors.city}</p>}
          </div>

          {/* Tipo de cadastro */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Tipo de cadastro</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="individual"
                  checked={signupType === 'individual'}
                  onChange={() => setSignupType('individual')}
                  className="w-4 h-4 text-[#2BA88C] bg-[#0F172A] border-[#334155]"
                  disabled={loading}
                />
                <span className="text-white">Sou estudante (cadastro individual)</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  value="school"
                  checked={signupType === 'school'}
                  onChange={() => setSignupType('school')}
                  className="w-4 h-4 text-[#2BA88C] bg-[#0F172A] border-[#334155]"
                  disabled={loading}
                />
                <span className="text-white">Estou cadastrando por uma escola</span>
              </label>
            </div>
          </div>

          {/* Campos condicionais para escola */}
          {signupType === 'school' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Escola */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Selecione sua escola</label>
                {schools.length === 0 ? (
                  <p className="text-[#94A3B8] text-sm">Nenhuma escola cadastrada ainda. Selecione 'Sou estudante' ou aguarde.</p>
                ) : (
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
                    disabled={loading}
                  >
                    <option value="">Selecione...</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>{school.name}</option>
                    ))}
                  </select>
                )}
                {errors.schoolId && <p className="text-[#EF4444] text-sm mt-1">{errors.schoolId}</p>}
              </div>

              {/* Turma */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Turma</label>
                <input
                  type="text"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                  placeholder="Ex: Turma A"
                  className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
                  disabled={loading}
                />
                {errors.className && <p className="text-[#EF4444] text-sm mt-1">{errors.className}</p>}
              </div>
            </div>
          )}

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
            {loading ? 'Criando...' : 'Criar conta'}
          </button>

          {/* Aviso beta */}
          <p className="text-[#94A3B8] text-sm text-center mt-4">Acesso gratuito durante a fase beta.</p>

          {/* Link para login */}
          <p className="text-center text-[#94A3B8] text-sm mt-6">
            Já tem conta?{' '}
            <a href="/login" className="text-white hover:underline">Entrar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
