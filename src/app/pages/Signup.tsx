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
    'Ensino Básico — 3.º ciclo (7.º ao 9.º ano)',
    'Ensino Secundário — 10.º ano',
    'Ensino Secundário — 11.º ano',
    'Ensino Secundário — 12.º ano',
    'Ensino Superior',
    'Já concluí o Ensino Superior',
    'Outro'
  ];

  const distritos = [
    'Aveiro',
    'Beja',
    'Braga',
    'Bragança',
    'Castelo Branco',
    'Coimbra',
    'Évora',
    'Faro',
    'Guarda',
    'Leiria',
    'Lisboa',
    'Portalegre',
    'Porto',
    'Santarém',
    'Setúbal',
    'Viana do Castelo',
    'Vila Real',
    'Viseu',
    'Região Autónoma dos Açores',
    'Região Autónoma da Madeira'
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
      newErrors.fullName = 'O nome completo deve ter pelo menos 3 caracteres';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      newErrors.email = 'E-mail inválido';
    }

    if (password.length < 8) {
      newErrors.password = 'A palavra-passe deve ter pelo menos 8 caracteres';
    }

    if (!birthDate) {
      newErrors.birthDate = 'Indica a data de nascimento';
    } else {
      const birthYear = new Date(birthDate).getFullYear();
      const currentYear = new Date().getFullYear();
      if (birthYear < 1940 || birthYear > currentYear - 5) {
        newErrors.birthDate = `O ano de nascimento deve estar entre 1940 e ${currentYear - 5}`;
      }
    }

    if (!educationLevel) {
      newErrors.educationLevel = 'Seleciona o nível de ensino';
    }

    if (!state) {
      newErrors.state = 'Seleciona o distrito';
    }

    if (city.trim().length < 2) {
      newErrors.city = 'A localidade deve ter pelo menos 2 caracteres';
    }

    if (signupType === 'school') {
      if (!schoolId) newErrors.schoolId = 'Seleciona uma escola';
      if (!className.trim()) newErrors.className = 'Indica a turma';
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
      // 1. Criar utilizador
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) {
        // Mapear erros
        if (authError.message.includes('User already registered') || authError.message.includes('already exists')) {
          setGeneralError('Este e-mail já está registado. Tenta entrar.');
        } else if (authError.message.includes('Password should be at least')) {
          setGeneralError('A palavra-passe deve ter pelo menos 8 caracteres.');
        } else if (authError.message.includes('Invalid email')) {
          setGeneralError('E-mail inválido.');
        } else {
          setGeneralError('Não foi possível criar a conta. Tenta novamente dentro de instantes.');
        }
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setGeneralError('Não foi possível criar a conta. Tenta novamente dentro de instantes.');
        setLoading(false);
        return;
      }

      // 2. Criar perfil
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
        setGeneralError('Conta criada, mas ocorreu um erro ao configurar o perfil. Contacta o suporte.');
        setLoading(false);
        return;
      }

      // 3. Se registo por escola, criar associação
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
      setGeneralError('Não foi possível criar a conta. Tenta novamente dentro de instantes.');
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

          {/* Palavra-passe */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Palavra-passe</label>
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

          {/* Nível de ensino */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Nível de ensino atual</label>
            <select
              value={educationLevel}
              onChange={(e) => setEducationLevel(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            >
              <option value="">Seleciona...</option>
              {educationLevels.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            {errors.educationLevel && <p className="text-[#EF4444] text-sm mt-1">{errors.educationLevel}</p>}
          </div>

          {/* Distrito */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Distrito</label>
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            >
              <option value="">Seleciona...</option>
              {distritos.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.state && <p className="text-[#EF4444] text-sm mt-1">{errors.state}</p>}
          </div>

          {/* Localidade */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">Localidade</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white placeholder-[#94A3B8] focus:outline-none focus:border-[#2BA88C]"
              disabled={loading}
            />
            {errors.city && <p className="text-[#EF4444] text-sm mt-1">{errors.city}</p>}
          </div>

          {/* Tipo de registo */}
          <div>
            <label className="block text-sm font-medium text-white mb-3">Tipo de registo</label>
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
                <span className="text-white">Sou estudante (registo individual)</span>
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
                <span className="text-white">Estou a registar-me através de uma escola</span>
              </label>
            </div>
          </div>

          {/* Campos condicionais para escola */}
          {signupType === 'school' && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Escola */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">Seleciona a tua escola</label>
                {schools.length === 0 ? (
                  <p className="text-[#94A3B8] text-sm">Ainda não há escolas registadas. Seleciona "Sou estudante" ou aguarda.</p>
                ) : (
                  <select
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0F172A] border border-[#334155] rounded-lg text-white focus:outline-none focus:border-[#2BA88C]"
                    disabled={loading}
                  >
                    <option value="">Seleciona...</option>
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
                  placeholder="Ex.: Turma A"
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
            {loading ? 'A criar...' : 'Criar conta'}
          </button>

          {/* Aviso beta */}
          <p className="text-[#94A3B8] text-sm text-center mt-4">Acesso gratuito durante a fase beta.</p>

          {/* Link para login */}
          <p className="text-center text-[#94A3B8] text-sm mt-6">
            Já tens conta?{' '}
            <a href="/login" className="text-white hover:underline">Entrar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
