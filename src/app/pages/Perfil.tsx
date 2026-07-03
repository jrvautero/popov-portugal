import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

interface ProfileData {
  full_name: string;
  email: string;
  birth_date: string | null;
  education_level: string | null;
  city: string | null;
  state: string | null;
}

interface SchoolData {
  school_name: string | null;
  class_name: string | null;
}

export default function Perfil() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProfileData = async () => {
      // Carregar dados do perfil
      const { data: profileInfo } = await supabase
        .from('profiles')
        .select('full_name, email, birth_date, education_level, city, state')
        .eq('id', user.id)
        .single();

      if (profileInfo) {
        setProfileData(profileInfo);
      }

      // Carregar dados da escola (se existir)
      const { data: schoolInfo } = await supabase
        .from('student_schools')
        .select('class_name, schools(name)')
        .eq('student_id', user.id)
        .single();

      if (schoolInfo) {
        setSchoolData({
          school_name: (schoolInfo.schools as any)?.name || null,
          class_name: schoolInfo.class_name
        });
      }

      setLoading(false);
    };

    loadProfileData();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-[#94A3B8]">A carregar...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* HEADER */}
      <header className="bg-[#0F172A] border-b border-[#334155] sticky top-0 z-50">
        <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
          <button onClick={() => navigate('/app')} className="text-2xl font-bold text-white shrink-0">POPOV</button>

          {/* Desktop */}
          <div className="hidden sm:flex items-center gap-4">
            <span className="text-[#94A3B8] text-sm">{profile?.full_name || 'Estudante'}</span>
            <a
              href="/app"
              className="text-white text-sm hover:underline"
            >
              Voltar ao painel
            </a>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
            >
              Sair
            </button>
          </div>

          {/* Mobile */}
          <button
            onClick={handleSignOut}
            className="sm:hidden shrink-0 px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL */}
      <main className="max-w-2xl mx-auto p-8">
        <h1 className="text-2xl font-bold text-white mb-8">O teu perfil</h1>

        <div className="bg-[#1E293B] rounded-xl p-8">
          <div className="space-y-4">
            {/* Nome completo */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Nome completo</label>
              <p className="text-base text-white font-medium">{profileData?.full_name || 'Não indicado'}</p>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">E-mail</label>
              <p className="text-base text-white font-medium">{profileData?.email || 'Não indicado'}</p>
            </div>

            {/* Data de nascimento */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Data de nascimento</label>
              <p className="text-base text-white font-medium">
                {profileData?.birth_date ? formatDate(profileData.birth_date) : 'Não indicado'}
              </p>
            </div>

            {/* Idade */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Idade</label>
              <p className="text-base text-white font-medium">
                {profileData?.birth_date ? `${calculateAge(profileData.birth_date)} anos` : 'Não indicado'}
              </p>
            </div>

            {/* Nível de ensino */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Nível de ensino</label>
              <p className="text-base text-white font-medium">{profileData?.education_level || 'Não indicado'}</p>
            </div>

            {/* Localidade */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Localidade</label>
              <p className="text-base text-white font-medium">{profileData?.city || 'Não indicado'}</p>
            </div>

            {/* Distrito */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Distrito</label>
              <p className="text-base text-white font-medium">{profileData?.state || 'Não indicado'}</p>
            </div>

            {/* Escola */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Escola</label>
              <p className="text-base text-white font-medium">{schoolData?.school_name || 'Não indicado'}</p>
            </div>

            {/* Turma */}
            <div>
              <label className="block text-sm text-[#94A3B8] mb-1">Turma</label>
              <p className="text-base text-white font-medium">{schoolData?.class_name || 'Não indicado'}</p>
            </div>
          </div>

          {/* Botão Editar perfil */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={() => alert('Edição em desenvolvimento')}
              className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
            >
              Editar perfil
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
