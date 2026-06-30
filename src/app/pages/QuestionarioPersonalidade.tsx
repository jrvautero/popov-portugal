import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type Stage = 'intro1' | 'stage1' | 'conclusion';

interface PersonalityItem {
  id: number;
  ordem: number;
  texto_pt: string;
}

// Encaminha cada teste para o componente certo (personalidade tem rota própria).
const rotaTeste = (code: string) =>
  code.startsWith('personalidade')
    ? `/app/questionario-personalidade?teste=${encodeURIComponent(code)}`
    : `/app/questionario?teste=${encodeURIComponent(code)}`;

const likertOptions = [
  { value: 1, label: 'Discordo totalmente' },
  { value: 2, label: 'Discordo' },
  { value: 3, label: 'Neutro' },
  { value: 4, label: 'Concordo' },
  { value: 5, label: 'Concordo totalmente' },
];

const TOTAL_QUESTIONS = 20;

export default function QuestionarioPersonalidade() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('intro1');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testRowId, setTestRowId] = useState<string | null>(null);

  const [items, setItems] = useState<PersonalityItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [allTestsDone, setAllTestsDone] = useState(false);
  const [proximoTesteCode, setProximoTesteCode] = useState<string | null>(null);
  const [calculatingResults, setCalculatingResults] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const testeParam = new URLSearchParams(window.location.search).get('teste') || 'personalidade_12';
  const questionRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!user) return;

    const init = async () => {
      // 1. Uma só sessão por pessoa: reusa a última; só cria se nunca existiu.
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('id')
        .eq('student_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1);

      let currentSessionId: string;
      if (!sessions || sessions.length === 0) {
        const { data: newSession } = await supabase
          .from('assessment_sessions')
          .insert({ student_id: user.id })
          .select()
          .single();
        currentSessionId = newSession!.id;
      } else {
        currentSessionId = sessions[0].id;
      }
      setSessionId(currentSessionId);

      // 2. Itens por ordem (baralhada na BD) e respostas já dadas.
      const { data: itemRows } = await supabase
        .from('personality_items')
        .select('id, ordem, texto_pt')
        .order('ordem', { ascending: true });
      setItems((itemRows || []) as PersonalityItem[]);

      const { data: ans } = await supabase
        .from('personality_responses')
        .select('item_id, resposta')
        .eq('session_id', currentSessionId);
      const ansMap: Record<number, number> = {};
      (ans || []).forEach((a: { item_id: number; resposta: number }) => {
        ansMap[a.item_id] = a.resposta;
      });
      setAnswers(ansMap);

      // 3. Id do teste no catálogo e se já está concluído.
      let resolvedTestId: string | null = null;
      let estaConcluido = false;
      const { data: tRow } = await supabase
        .from('tests')
        .select('id')
        .eq('code', testeParam)
        .single();
      resolvedTestId = tRow?.id ?? null;
      setTestRowId(resolvedTestId);

      if (resolvedTestId) {
        const { data: prog } = await supabase
          .from('test_progress')
          .select('estado')
          .eq('user_id', user.id)
          .eq('test_id', resolvedTestId)
          .maybeSingle();
        estaConcluido = prog?.estado === 'concluido';
      }

      // 4. REFAZER: reabrir um teste concluído reinicia a bateria inteira
      // (interesses + inteligências + personalidade), como nos outros testes.
      if (estaConcluido && resolvedTestId) {
        await supabase.rpc('arquivar_resultado', { p_session: currentSessionId });

        await supabase.from('interest_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('intelligence_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('personality_responses').delete().eq('session_id', currentSessionId);
        setAnswers({});

        await supabase
          .from('assessment_sessions')
          .update({ status: 'in_progress', completed_at: null })
          .eq('id', currentSessionId);

        const { data: prof } = await supabase
          .from('profiles')
          .select('education_level')
          .eq('id', user.id)
          .single();
        const eduR = (prof?.education_level ?? '').toLowerCase();
        const anoR =
          eduR.includes('3.º ciclo') || eduR.includes('3º ciclo') || eduR.includes('básico') ? 9 : 12;
        const { data: catR } = await supabase
          .from('tests')
          .select('id')
          .eq('ano_alvo', anoR)
          .eq('ativo', true);
        for (const t of (catR || []) as { id: string }[]) {
          await supabase.from('test_progress').upsert(
            {
              user_id: user.id,
              test_id: t.id,
              session_id: currentSessionId,
              estado: 'a_meio',
              iniciado_em: new Date().toISOString(),
              concluido_em: null,
            },
            { onConflict: 'user_id,test_id' }
          );
        }
      } else if (resolvedTestId) {
        // Entrada normal: marca a_meio se ainda não estava concluído.
        await supabase.from('test_progress').upsert(
          {
            user_id: user.id,
            test_id: resolvedTestId,
            session_id: currentSessionId,
            estado: 'a_meio',
            iniciado_em: new Date().toISOString(),
          },
          { onConflict: 'user_id,test_id' }
        );
      }

      const respondidas = Object.keys(estaConcluido ? {} : ansMap).length;
      setStage(respondidas < TOTAL_QUESTIONS ? 'stage1' : 'conclusion');
      setLoading(false);
    };

    init();
  }, [user]);

  // Scroll para a primeira por responder.
  useEffect(() => {
    if (stage === 'stage1' && items.length > 0) {
      setTimeout(() => {
        const firstUnanswered = items.find((item) => !answers[item.id]);
        if (firstUnanswered && questionRefs.current[firstUnanswered.id]) {
          questionRefs.current[firstUnanswered.id]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [stage, items]);

  const handleAnswer = async (itemId: number, value: number) => {
    if (!sessionId) return;
    const novo = { ...answers, [itemId]: value };
    setAnswers(novo);

    await supabase
      .from('personality_responses')
      .upsert({ session_id: sessionId, item_id: itemId, resposta: value });

    if (Object.keys(novo).length >= TOTAL_QUESTIONS) {
      setStage('conclusion');
    } else {
      const proxima = items.find((item) => !novo[item.id]);
      if (proxima && questionRefs.current[proxima.id]) {
        setTimeout(() => {
          questionRefs.current[proxima.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  };

  const completedRef = useRef(false);
  useEffect(() => {
    if (stage === 'conclusion' && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
  }, [stage]);

  const handleComplete = async () => {
    if (!sessionId || !user) return;
    setFinalizing(true);

    if (testRowId) {
      await supabase.from('test_progress').upsert(
        {
          user_id: user.id,
          test_id: testRowId,
          session_id: sessionId,
          estado: 'concluido',
          concluido_em: new Date().toISOString(),
        },
        { onConflict: 'user_id,test_id' }
      );
    }

    const { data: prof } = await supabase
      .from('profiles')
      .select('education_level')
      .eq('id', user.id)
      .single();
    const edu = (prof?.education_level ?? '').toLowerCase();
    const ano =
      edu.includes('3.º ciclo') || edu.includes('3º ciclo') || edu.includes('básico') ? 9 : 12;

    const { data: catalogo } = await supabase
      .from('tests')
      .select('id, code, ordem')
      .eq('ano_alvo', ano)
      .eq('ativo', true)
      .order('ordem', { ascending: true });
    const { data: prog } = await supabase
      .from('test_progress')
      .select('test_id, estado')
      .eq('user_id', user.id);
    const concluidos = new Set(
      (prog || [])
        .filter((p: { estado: string }) => p.estado === 'concluido')
        .map((p: { test_id: string }) => p.test_id)
    );
    const lista = (catalogo || []) as { id: string; code: string; ordem: number }[];
    const todos = lista.length > 0 && lista.every((t) => concluidos.has(t.id));
    const proximo = lista.find((t) => !concluidos.has(t.id));

    setProximoTesteCode(proximo?.code ?? null);
    setAllTestsDone(todos);
    setFinalizing(false);
  };

  const irParaProximoTeste = () => {
    if (!proximoTesteCode) {
      navigate('/app');
      return;
    }
    window.location.href = rotaTeste(proximoTesteCode);
  };

  const handleGenerateResult = async () => {
    if (!sessionId) return;
    setCalculatingResults(true);
    setCalculationError(null);

    await supabase
      .from('assessment_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    const { data, error } = await supabase.functions.invoke('calculate_results', {
      body: { session_id: sessionId, modo: 'sintetico' },
    });

    if (error || !data?.ok) {
      setCalculationError('Não foi possível calcular agora. Tenta novamente dentro de momentos.');
      setCalculatingResults(false);
      return;
    }
    navigate('/app/resultados');
  };

  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = (totalAnswered / TOTAL_QUESTIONS) * 100;
  const activeId = items.find((item) => !answers[item.id])?.id ?? null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <p className="text-[#94A3B8]">A carregar...</p>
      </div>
    );
  }

  if (calculatingResults) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2BA88C] mb-4"></div>
        <p className="text-white text-lg">Estamos a calcular os teus resultados...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* HEADER */}
      <header className="h-20 bg-[#0F172A] border-b border-[#334155] fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-6 flex items-center justify-between">
          <div className="text-xl font-bold text-white">POPOV</div>
          <div className="flex-1 max-w-xl mx-8">
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2BA88C] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 text-center">
              {totalAnswered} de {TOTAL_QUESTIONS} respondidas
            </p>
          </div>
          <button
            onClick={() => setShowExitModal(true)}
            className="px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
          >
            Voltar ao painel
          </button>
        </div>
      </header>

      {/* MODAL DE SAÍDA */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Sair da avaliação?</h3>
            <p className="text-[#F1F5F9] mb-6">
              As tuas respostas estão guardadas. Podes retomar de onde paraste quando quiseres.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 bg-[#334155] text-white rounded-lg font-medium hover:bg-[#475569] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => navigate('/app')}
                className="px-4 py-2 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
              >
                Sim, voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pt-20">
        <main className="max-w-4xl mx-auto p-8">
          {/* INTRODUÇÃO */}
          {stage === 'intro1' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">A tua personalidade</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Vais ver 20 frases sobre a tua forma de ser. Para cada uma, indica o quanto concordas
                  contigo. Não há respostas certas ou erradas — responde com sinceridade e sem pensar
                  demasiado.
                </p>
                <button
                  onClick={() => setStage('stage1')}
                  className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                >
                  Começar
                </button>
              </div>
            </div>
          )}

          {/* PERGUNTAS */}
          {stage === 'stage1' && (
            <div className="space-y-6 py-8">
              {items.map((item, index) => {
                const isActive = item.id === activeId;
                const currentAnswer = answers[item.id];
                return (
                  <div
                    key={item.id}
                    ref={(el) => { questionRefs.current[item.id] = el; }}
                    className={`
                      rounded-xl p-8 transition-all duration-300
                      ${isActive ? 'bg-[#1E293B] border-l-4 border-[#2BA88C] opacity-100' : 'bg-[#1E293B] opacity-40'}
                    `}
                  >
                    <p className="text-sm text-[#94A3B8] mb-2">
                      Pergunta {index + 1} de {TOTAL_QUESTIONS}
                    </p>
                    <p className="text-lg text-white mb-6 leading-relaxed">{item.texto_pt}</p>
                    <div className="flex flex-wrap gap-2">
                      {likertOptions.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(item.id, option.value)}
                            className={`
                              px-4 py-2 rounded-full text-sm font-medium transition-all
                              ${isSelected
                                ? 'bg-[rgba(43,168,140,0.2)] border-2 border-[#2BA88C] text-white'
                                : 'bg-[#0F172A] border border-[#334155] text-[#94A3B8] hover:bg-[#334155] hover:border-[#2BA88C]'
                              }
                            `}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* CONCLUSÃO */}
          {stage === 'conclusion' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <div className="flex items-center gap-2 mb-6">
                  <Check size={22} className="text-[#2BA88C]" />
                  <h2 className="text-2xl font-bold text-white">Teste concluído</h2>
                </div>

                {finalizing ? (
                  <p className="text-[#94A3B8]">A guardar...</p>
                ) : allTestsDone ? (
                  <>
                    <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                      Concluíste todos os testes. Já podes ver os teus resultados.
                    </p>
                    {calculationError && (
                      <p className="text-red-400 text-sm mb-4">{calculationError}</p>
                    )}
                    <button
                      onClick={handleGenerateResult}
                      disabled={calculatingResults}
                      className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {calculatingResults ? 'A calcular...' : 'Ver os meus resultados'}
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                      As tuas respostas foram guardadas. Falta um teste para veres os teus resultados. Vamos a ele.
                    </p>
                    <button
                      onClick={irParaProximoTeste}
                      className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                    >
                      Fazer o próximo teste
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
