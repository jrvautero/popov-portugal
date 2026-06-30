import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Info, ClipboardList, BarChart3, Lock, Check, Clock, Circle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type CardId = 'intro' | 'assessment' | 'results';

interface CardConfig {
  id: CardId;
  title: string;
  icon: typeof Info;
  locked: boolean;
}

interface TestRow {
  id: string;
  code: string;
  nome: string;
  ordem: number;
  ano_alvo: number;
}

type Estado = 'pendente' | 'a_meio' | 'concluido';

interface TestWithState extends TestRow {
  estado: Estado;
}

// Deriva o ano-alvo da bateria a partir da escolaridade do registo.
// 3.º ciclo / básico -> 9; tudo o resto -> 12.
function anoAlvoFromEdu(edu: string): number {
  const e = (edu || '').toLowerCase();
  if (e.includes('3.º ciclo') || e.includes('3º ciclo') || e.includes('básico')) return 9;
  return 12;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const [selectedCard, setSelectedCard] = useState<CardId>('intro');
  const [introVisited, setIntroVisited] = useState(false);
  const [loading, setLoading] = useState(true);

  const [anoAlvo, setAnoAlvo] = useState<number>(12);
  const [tests, setTests] = useState<TestWithState[]>([]);
  const [saldo, setSaldo] = useState<number>(0);
  const [nivelResultado, setNivelResultado] = useState<'sintetico' | 'completo' | null>(null);
  const [lastResultDate, setLastResultDate] = useState<string | null>(null);
  const [resultSessionId, setResultSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const visitedKey = `popov_visited_intro_${user.id}`;
    setIntroVisited(localStorage.getItem(visitedKey) === 'true');

    const loadData = async () => {
      // 1. Ano-alvo da bateria a partir da escolaridade
      const { data: prof } = await supabase
        .from('profiles')
        .select('education_level')
        .eq('id', user.id)
        .single();
      const ano = anoAlvoFromEdu(prof?.education_level ?? '');
      setAnoAlvo(ano);

      // 2. Catálogo de testes desse ano + progresso do aluno
      const { data: catalogo } = await supabase
        .from('tests')
        .select('id, code, nome, ordem, ano_alvo')
        .eq('ano_alvo', ano)
        .eq('ativo', true)
        .order('ordem', { ascending: true });

      const { data: progresso } = await supabase
        .from('test_progress')
        .select('test_id, estado')
        .eq('user_id', user.id);

      const estadoByTest: Record<string, Estado> = {};
      (progresso || []).forEach((p: { test_id: string; estado: Estado }) => {
        estadoByTest[p.test_id] = p.estado;
      });

      const lista: TestWithState[] = (catalogo || []).map((t: TestRow) => ({
        ...t,
        estado: estadoByTest[t.id] ?? 'pendente',
      }));
      setTests(lista);

      // 3. Saldo de créditos
      const { data: bal } = await supabase.rpc('credit_balance', { p_user: user.id });
      setSaldo(typeof bal === 'number' ? bal : 0);

      // 4. Último resultado (nível + data)
      const { data: allSessions } = await supabase
        .from('assessment_sessions')
        .select('id')
        .eq('student_id', user.id);

      if (allSessions && allSessions.length > 0) {
        const sessionIds = allSessions.map((s: { id: string }) => s.id);
        const { data: results } = await supabase
          .from('results')
          .select('session_id, generated_at, nivel')
          .in('session_id', sessionIds)
          .order('generated_at', { ascending: false });
        if (results && results.length > 0) {
          // Se existe algum resultado completo, é esse que conta (já foi desbloqueado).
          const completo = results.find((r: { nivel: string }) => r.nivel === 'completo');
          const escolhido = completo ?? results[0];
          setLastResultDate(escolhido.generated_at);
          setNivelResultado((escolhido.nivel as 'sintetico' | 'completo') ?? 'sintetico');
          setResultSessionId(escolhido.session_id);
        }
      }

      setLoading(false);
    };

    loadData();
  }, [user]);

  const todosConcluidos = tests.length > 0 && tests.every((t) => t.estado === 'concluido');
  const hasResults = nivelResultado !== null;

  const handleContinueIntro = () => {
    if (!user) return;
    localStorage.setItem(`popov_visited_intro_${user.id}`, 'true');
    setIntroVisited(true);
    setSelectedCard('assessment');
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const cards: CardConfig[] = [
    { id: 'intro', title: 'Sobre ti', icon: Info, locked: false },
    { id: 'assessment', title: 'Os teus testes', icon: ClipboardList, locked: !introVisited },
    { id: 'results', title: 'Os teus resultados', icon: BarChart3, locked: !todosConcluidos || !hasResults },
  ];

  const handleCardClick = (cardId: CardId) => {
    const card = cards.find((c) => c.id === cardId);
    if (card && !card.locked) setSelectedCard(cardId);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-PT');

  // Abre um teste concreto (passa o code para o questionário correr só esse).
  const abrirTeste = (code: string) => {
    navigate(
      code.startsWith('personalidade')
        ? `/app/questionario-personalidade?teste=${encodeURIComponent(code)}`
        : `/app/questionario?teste=${encodeURIComponent(code)}`
    );
  };

  // Ao clicar num teste: se está concluído, é um REFAZER -> pede confirmação
  // (avisa que apaga o resultado anterior e cobra 1 crédito). Senão, abre direto.
  const [refazerCode, setRefazerCode] = useState<string | null>(null);
  const temCompleto = nivelResultado === 'completo';

  const clicarTeste = (code: string, estado: Estado) => {
    if (estado === 'concluido') {
      setRefazerCode(code);
    } else {
      abrirTeste(code);
    }
  };

  // Gera o resultado sintético (se ainda não existir) e vai para os resultados.
  // Determinista: se já há resultado, navega direto; senão gera primeiro.
  const [gerando, setGerando] = useState(false);
  const [gerarErro, setGerarErro] = useState<string | null>(null);

  // Garante que a sessão do resultado está 'completed' (um Refazer anterior pode
  // tê-la deixado 'in_progress') e navega para o destino dado.
  const garantirSessaoEIr = async (target: string) => {
    if (resultSessionId) {
      const { error } = await supabase
        .from('assessment_sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', resultSessionId);
      if (error) {
        setGerarErro('Erro ao atualizar sessão: ' + JSON.stringify(error));
        return;
      }
    }
    navigate(target);
  };

  const gerarEIrParaResultados = async () => {
    if (!user) return;
    // Já existe resultado -> garante sessão 'completed' e navega.
    if (hasResults) {
      await garantirSessaoEIr('/app/resultados');
      return;
    }
    setGerando(true);
    setGerarErro(null);

    // Última sessão da pessoa.
    const { data: sess } = await supabase
      .from('assessment_sessions')
      .select('id')
      .eq('student_id', user.id)
      .order('started_at', { ascending: false })
      .limit(1);
    const sid = sess && sess.length > 0 ? sess[0].id : null;
    if (!sid) {
      setGerarErro('Não foi possível encontrar a tua sessão.');
      setGerando(false);
      return;
    }

    // Marca a sessão como concluída e gera o sintético (grátis).
    const { error: updSessErr } = await supabase
      .from('assessment_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sid);
    if (updSessErr) {
      setGerarErro('Erro ao atualizar sessão: ' + JSON.stringify(updSessErr));
      setGerando(false);
      return;
    }

    const { data, error } = await supabase.functions.invoke('calculate_results', {
      body: { session_id: sid, modo: 'sintetico' },
    });

    if (error || !data?.ok) {
      let det = '';
      try {
        const ctx = (error as { context?: Response })?.context;
        if (ctx && typeof ctx.json === 'function') {
          const body = await ctx.json();
          det = body?.detalhe || body?.error || '';
        }
      } catch {
        det = '';
      }
      if (!det) det = (data as { detalhe?: string })?.detalhe ?? error?.message ?? '';
      setGerarErro('Erro ao gerar: ' + det);
      setGerando(false);
      return;
    }
    navigate('/app/resultados');
  };

  const estadoLabel = (e: Estado) =>
    e === 'concluido' ? 'Concluído' : e === 'a_meio' ? 'Incompleto' : 'Por fazer';

  const estadoIcon = (e: Estado) =>
    e === 'concluido' ? Check : e === 'a_meio' ? Clock : Circle;

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
      <header className="h-16 bg-[#0F172A] border-b border-[#334155] sticky top-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">POPOV</div>
          <div className="flex items-center gap-4">
            <span className="text-[#94A3B8] text-sm">
              {saldo} {saldo === 1 ? 'crédito' : 'créditos'}
            </span>
            <span className="text-[#94A3B8] text-sm">{profile?.full_name || 'Estudante'}</span>
            <a href="/app/perfil" className="text-white text-sm hover:underline">
              O meu perfil
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
                    transition-all relative
                  `}
                >
                  {isLocked && <Lock size={16} className="absolute top-3 right-3 text-[#94A3B8]" />}
                  <div className="flex items-start gap-3">
                    <Icon size={16} className="text-[#94A3B8] mt-1" />
                    <div>
                      <h3 className="text-base font-semibold text-white">{card.title}</h3>
                      {isLocked && <p className="text-xs text-[#94A3B8] mt-2">Bloqueado</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* COLUNA PRINCIPAL */}
        <main className="flex-1 p-8 max-w-4xl">
          {/* SOBRE TI — aviso das regras da bateria */}
          {selectedCard === 'intro' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Sobre ti</h2>
              <div className="space-y-4 text-base text-[#F1F5F9] leading-relaxed">
                <p>
                  O POPOV é um programa de orientação que te ajuda a conhecer melhor os teus interesses, as tuas competências e possíveis percursos.
                </p>
                <p>
                  A tua avaliação é feita por testes, que podes fazer um de cada vez. Cada teste fica guardado: começas, paras quando quiseres e retomas mais tarde de onde ficaste. Não há respostas certas ou erradas.
                </p>
                <p>
                  Quando tiveres os testes concluídos, vês um resultado resumido, gratuito, com a tua pontuação em cada dimensão. O relatório completo, com áreas, disciplinas, profissões, cursos e orientação, precisa de um crédito.
                </p>
                <p>
                  Se mais tarde refizeres um teste, o relatório completo anterior deixa de estar disponível e gerar um novo relatório completo gasta outro crédito.
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

          {/* OS TEUS TESTES — lista da bateria do ano */}
          {selectedCard === 'assessment' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Os teus testes</h2>
              <p className="text-base text-[#94A3B8] leading-relaxed mb-6">
                Faz cada teste ao teu ritmo. Podes parar e retomar quando quiseres.
              </p>

              {tests.length === 0 ? (
                <p className="text-[#94A3B8]">Ainda não há testes disponíveis.</p>
              ) : (
                <div className="space-y-3">
                  {tests.map((t) => {
                    const EIcon = estadoIcon(t.estado);
                    const cor =
                      t.estado === 'concluido' ? '#2BA88C' : t.estado === 'a_meio' ? '#E0A33E' : '#94A3B8';
                    return (
                      <div
                        key={t.id}
                        className="bg-[#1E293B] border border-[#334155] rounded-lg p-5 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <EIcon size={18} style={{ color: cor }} />
                          <div className="min-w-0">
                            <h3 className="text-base font-semibold text-white break-words">{t.nome}</h3>
                            <p className="text-xs mt-1" style={{ color: cor }}>
                              {estadoLabel(t.estado)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => clicarTeste(t.code, t.estado)}
                          className="px-5 py-2 bg-[#2BA88C] text-white rounded-lg text-sm font-medium hover:bg-[#259178] transition-colors shrink-0"
                        >
                          {t.estado === 'concluido'
                            ? 'Refazer'
                            : t.estado === 'a_meio'
                            ? 'Retomar'
                            : 'Começar'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {todosConcluidos && (
                <div className="mt-6 bg-[#1E293B] border border-[#2BA88C] rounded-lg p-5">
                  <p className="text-white mb-3">Concluíste todos os testes. Já podes ver os teus resultados.</p>
                  <button
                    onClick={gerarEIrParaResultados}
                    disabled={gerando}
                    className="px-6 py-2 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-60"
                  >
                    {gerando ? 'A gerar...' : 'Ir para os resultados'}
                  </button>
                  {gerarErro && <p className="text-red-400 text-sm mt-3">{gerarErro}</p>}
                </div>
              )}
            </div>
          )}

          {/* OS TEUS RESULTADOS — sintético grátis / completo com crédito */}
          {selectedCard === 'results' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-6">Os teus resultados</h2>

              {!todosConcluidos ? (
                <p className="text-[#94A3B8]">
                  Ainda tens testes por terminar. Conclui todos os testes para veres os teus resultados.
                </p>
              ) : !hasResults ? (
                <p className="text-[#94A3B8]">Conclui os testes para gerar os teus resultados.</p>
              ) : (
                <div className="bg-[#1E293B] border border-[#334155] rounded-lg p-6">
                  {lastResultDate && (
                    <p className="text-white mb-4">
                      Resultados gerados em {formatDate(lastResultDate)}.
                    </p>
                  )}

                  {nivelResultado === 'completo' ? (
                    <button
                      onClick={() => garantirSessaoEIr('/app/resultados')}
                      className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                    >
                      Ver relatório completo
                    </button>
                  ) : (
                    <div>
                      <p className="text-[#F1F5F9] mb-2">
                        Tens disponível o resultado resumido, gratuito.
                      </p>
                      <p className="text-sm text-[#94A3B8] mb-5">
                        O relatório completo desbloqueia as áreas, as disciplinas, as profissões, os cursos e a orientação. Precisa de um crédito.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => garantirSessaoEIr('/app/resultados')}
                          className="px-6 py-3 bg-[#334155] text-white rounded-lg font-medium hover:bg-[#475569] transition-colors"
                        >
                          Ver resultado resumido
                        </button>
                        <button
                          onClick={() => garantirSessaoEIr('/app/resultados?desbloquear=1')}
                          className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                        >
                          {saldo > 0 ? 'Desbloquear relatório completo (1 crédito)' : 'Obter créditos'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* MODAL: confirmar refazer um teste */}
      {refazerCode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Refazer este teste?</h3>
            <p className="text-[#F1F5F9] mb-6 leading-relaxed">
              {temCompleto
                ? 'Vais responder de novo a este teste. O teu relatório completo atual será apagado e, para gerares um novo relatório completo, será cobrado 1 crédito.'
                : 'Vais responder de novo a este teste. Quando gerares o relatório completo, será cobrado 1 crédito.'}
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRefazerCode(null)}
                className="px-4 py-2 bg-[#334155] text-white rounded-lg font-medium hover:bg-[#475569] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const code = refazerCode;
                  setRefazerCode(null);
                  if (code) abrirTeste(code);
                }}
                className="px-4 py-2 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
              >
                Refazer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
