import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Info, ClipboardList, BarChart3, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type CardId = 'intro' | 'assessment' | 'results';

interface CardConfig {
  id: CardId;
  title: string;
  icon: typeof Info;
  locked: boolean;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [selectedCard, setSelectedCard] = useState<CardId>('intro');
  const [introVisited, setIntroVisited] = useState(false);
  const [hasResults, setHasResults] = useState(false);
  const [hasInProgressSession, setHasInProgressSession] = useState(false);
  const [lastResultDate, setLastResultDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Verificar localStorage para intro visitado
    const visitedKey = `popov_visited_intro_${user.id}`;
    const visited = localStorage.getItem(visitedKey) === 'true';
    setIntroVisited(visited);

    // Carregar estado das sessões e resultados
    const loadData = async () => {
      // Verificar se existe sessão in_progress
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id, status')
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      setHasInProgressSession(sessions && sessions.length > 0);

      // Buscar todas as sessions do usuário para verificar results
      const { data: allSessions } = await supabase
        .from('assessment_sessions')
        .select('id')
        .eq('student_id', user.id);

      if (allSessions && allSessions.length > 0) {
        const sessionIds = allSessions.map(s => s.id);

        // Verificar se existe results para essas sessions
        const { data: results } = await supabase
          .from('results')
          .select('generated_at')
          .in('session_id', sessionIds)
          .order('generated_at', { ascending: false })
          .limit(1);

        if (results && results.length > 0) {
          setHasResults(true);
          setLastResultDate(results[0].generated_at);
        }
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const handleContinueIntro = () => {
    if (!user) return;
    const visitedKey = `popov_visited_intro_${user.id}`;
    localStorage.setItem(visitedKey, 'true');
    setIntroVisited(true);
    setSelectedCard('assessment');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const cards: CardConfig[] = [
    {
      id: 'intro',
      title: 'Sobre você',
      icon: Info,
      locked: false
    },
    {
      id: 'assessment',
      title: 'Faça sua avaliação',
      icon: ClipboardList,
      locked: !introVisited
    },
    {
      id: 'results',
      title: 'Seus resultados',
      icon: BarChart3,
      locked: !hasResults
    }
  ];

  const handleCardClick = (cardId: CardId) => {
    const card = cards.find(c => c.id === cardId);
    if (card && !card.locked) {
      setSelectedCard(cardId);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-[#94A3B8]">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* HEADER */}
      <header className="h-16 bg-[#0F172A] border-b border-[#334155] sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">POPOV</div>
          <div className="flex items-center gap-4">
            <span className="text-[#94A3B8] text-sm">{profile?.full_name || 'Estudante'}</span>
            <a
              href="/app/perfil"
              className="text-white text-sm hover:underline"
            >
              Meu perfil
            </a>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex flex-col md:flex-row">
        {/* COLUNA LATERAL - Cards */}
        <aside className="w-full md:w-[280px] p-4">
          <div className="flex md:flex-col gap-3 overflow-x-auto md:overflow-visible">
            {cards.map((card) => {
              const Icon = card.icon;
              const isActive = selectedCard === card.id;
              const isLocked = card.locked;

              return (
                <div
                  key={card.id}
                  onClick={() => handleCardClick(card.id)}
                  className={`
                    min-w-[200px] md:min-w-0 h-[110px] rounded-lg p-4
                    ${isLocked ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                    ${isActive && !isLocked ? 'bg-[#334155] border-2 border-[#2BA88C]' : 'bg-[#1E293B]'}
                    transition-all hover:${!isLocked ? 'bg-[#334155]' : ''}
                    relative
                  `}
                >
                  {isLocked && (
                    <Lock size={16} className="absolute top-3 right-3 text-[#94A3B8]" />
                  )}

                  <div className="flex items-start gap-3">
                    <Icon size={16} className="text-[#94A3B8] mt-1" />
                    <div>
                      <h3 className="text-base font-semibold text-white">{card.title}</h3>
                      {isLocked && (
                        <p className="text-xs text-[#94A3B8] mt-2">Bloqueado</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* COLUNA PRINCIPAL - Conteúdo */}
        <main className="flex-1 p-8 max-w-4xl">
          {selectedCard === 'intro' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Sobre você</h2>

              <div className="space-y-4 text-base text-[#F1F5F9] leading-relaxed">
                <p>
                  O POPOV é um programa de orientação que ajuda você a conhecer melhor seus interesses, habilidades e possíveis caminhos profissionais.
                </p>
                <p>
                  Você vai responder dois questionários: um sobre seus interesses e outro sobre suas habilidades. Não existem respostas certas ou erradas, apenas as que mais se parecem com você.
                </p>
                <p>
                  No final, você verá um relatório com áreas profissionais que combinam com seu perfil, profissões reais associadas e formações disponíveis para chegar lá.
                </p>
              </div>

              <button
                onClick={handleContinueIntro}
                className="mt-6 px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
              >
                Continuar
              </button>
            </div>
          )}

          {selectedCard === 'assessment' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Faça sua avaliação</h2>

              <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                A avaliação tem duas partes: a primeira sobre seus interesses (47 perguntas) e a segunda sobre suas habilidades (28 perguntas). Tempo total estimado: 25 a 40 minutos. Você pode pausar e retomar quando quiser.
              </p>

              {hasInProgressSession ? (
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 mb-6">
                  <p className="text-white mb-4">Você já começou uma avaliação.</p>
                  <button
                    onClick={() => navigate('/app/questionario')}
                    className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                  >
                    Continuar avaliação
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate('/app/questionario')}
                  className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                >
                  Iniciar avaliação
                </button>
              )}
            </div>
          )}

          {selectedCard === 'results' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Seus resultados</h2>

              {hasResults && lastResultDate ? (
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
                  <p className="text-white mb-4">
                    Sua última avaliação foi concluída em {formatDate(lastResultDate)}.
                  </p>
                  <button
                    onClick={() => navigate('/app/resultados')}
                    className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                  >
                    Ver relatório completo
                  </button>
                </div>
              ) : (
                <p className="text-[#94A3B8]">Você ainda não completou sua avaliação.</p>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
