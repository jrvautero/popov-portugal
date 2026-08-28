import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type Stage = 'intro1' | 'stage1' | 'conclusion';

interface WsItem {
  cod: number;
  nome: string;
  descricao: string;
}

// Encaminha cada teste para o componente certo.
const rotaTeste = (code: string) =>
  code.startsWith('personalidade')
    ? `/app/questionario-personalidade?teste=${encodeURIComponent(code)}`
    : code.startsWith('work_styles')
    ? `/app/questionario-estilos?teste=${encodeURIComponent(code)}`
    : code.startsWith('work_values')
    ? `/app/questionario-valores?teste=${encodeURIComponent(code)}`
    : `/app/questionario?teste=${encodeURIComponent(code)}`;

const likertOptions = [
  { value: 1, label: 'Nada como eu' },
  { value: 2, label: 'Pouco como eu' },
  { value: 3, label: 'Mais ou menos' },
  { value: 4, label: 'Bastante como eu' },
  { value: 5, label: 'Totalmente como eu' },
];

const TOTAL_QUESTIONS = 16;

export default function QuestionarioWorkStyles() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('intro1');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testRowId, setTestRowId] = useState<string | null>(null);

  const [items, setItems] = useState<WsItem[]>([]);
  const [answers, setAnswers] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [allTestsDone, setAllTestsDone] = useState(false);
  const [proximoTesteCode, setProximoTesteCode] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const testeParam = new URLSearchParams(window.location.search).get('teste') || 'work_styles_12';
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

      // 2. Itens do teste (16 estilos) e respostas já dadas.
      const { data: itemRows } = await supabase
        .from('ws_items')
        .select('cod, nome, descricao')
        .order('cod', { ascending: true });
      setItems((itemRows || []) as WsItem[]);

      const { data: ans } = await supabase
        .from('ws_answers')
        .select('item_cod, answer')
        .eq('session_id', currentSessionId);
      const ansMap: Record<number, number> = {};
      (ans || []).forEach((a: { item_cod: number; answer: number }) => {
        ansMap[a.item_cod] = a.answer;
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

      // 4. REFAZER: reabrir um teste concluído reinicia a bateria inteira.
      if (estaConcluido && resolvedTestId) {
        await supabase.rpc('arquivar_resultado', { p_session: currentSessionId });

        await supabase.from('interest_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('intelligence_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('personality_responses').delete().eq('session_id', currentSessionId);
        await supabase.from('ws_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('wv_answers').delete().eq('session_id', currentSessionId);
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
        const firstUnanswered = items.find((item) => !answers[item.cod]);
        if (firstUnanswered && questionRefs.current[firstUnanswered.cod]) {
          questionRefs.current[firstUnanswered.cod]?.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
          });
        }
      }, 100);
    }
  }, [stage, items]);

  const handleAnswer = async (itemCod: number, value: number) => {
    if (!sessionId) return;
    const novo = { ...answers, [itemCod]: value };
    setAnswers(novo);

    if (Object.keys(novo).length >= TOTAL_QUESTIONS) {
      setStage('conclusion');
    } else {
      const proxima = items.find((item) => !novo[item.cod]);
      if (proxima && questionRefs.current[proxima.cod]) {
        setTimeout(() => {
          questionRefs.current[proxima.cod]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }

    await supabase
      .from('ws_answers')
      .upsert({ session_id: sessionId, item_cod: itemCod, answer: value });
  };

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
    const prioridadeTeste = (code: string) => {
      if (code.startsWith('interesses')) return 1;
      if (code.startsWith('work_styles')) return 2;
      if (code.startsWith('work_values')) return 3;
      if (code.startsWith('inteligencias')) return 4;
      if (code.startsWith('personalidade')) return 5;
      return 99;
    };
    const lista = ((catalogo || []) as { id: string; code: string; ordem: number }[])
      .sort((a, b) => ano === 12
        ? prioridadeTeste(a.code) - prioridadeTeste(b.code)
        : a.ordem - b.ordem);
    const todos = lista.length > 0 && lista.every((t) => concluidos.has(t.id));
    const proximo = lista.find((t) => !concluidos.has(t.id));

    setProximoTesteCode(proximo?.code ?? null);
    setAllTestsDone(todos);
    setFinalizing(false);
  };

  const completedRef = useRef(false);
  useEffect(() => {
    if (stage === 'conclusion' && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
  }, [stage]);

  const irParaProximoTeste = () => {
    if (!proximoTesteCode) {
      navigate('/app');
      return;
    }
    window.location.href = rotaTeste(proximoTesteCode);
  };

  const totalAnswered = Object.keys(answers).length;
  const progressPercentage = (totalAnswered / TOTAL_QUESTIONS) * 100;
  const activeId = items.find((item) => !answers[item.cod])?.cod ?? null;

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
      <header className="h-20 bg-[#0F172A] border-b border-[#334155] fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <button onClick={() => setShowExitModal(true)} className="text-xl font-bold text-white shrink-0">POPOV</button>
          <div className="flex-1 min-w-0 max-w-xl mx-2 sm:mx-8">
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2BA88C] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 text-center truncate">
              {totalAnswered} de {TOTAL_QUESTIONS} respondidas
            </p>
          </div>
          <button
            onClick={() => setShowExitModal(true)}
            className="shrink-0 px-3 sm:px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
          >
            <span className="hidden sm:inline">Voltar ao painel</span>
            <span className="sm:hidden">Sair</span>
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
                <h2 className="text-2xl font-bold text-white mb-6">Como preferes trabalhar</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Vais ver 16 formas de trabalhar. Para cada uma, indica o quanto se parece contigo.
                  Não há respostas certas ou erradas — responde com sinceridade.
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
                const isActive = item.cod === activeId;
                const currentAnswer = answers[item.cod];
                return (
                  <div
                    key={item.cod}
                    ref={(el) => { questionRefs.current[item.cod] = el; }}
                    className={`
                      rounded-xl p-8 transition-all duration-300
                      ${isActive ? 'bg-[#1E293B] border-l-4 border-[#2BA88C] opacity-100' : 'bg-[#1E293B] opacity-40'}
                    `}
                  >
                    <p className="text-sm text-[#94A3B8] mb-2">
                      Pergunta {index + 1} de {TOTAL_QUESTIONS}
                    </p>
                    <p className="text-lg text-white mb-1 leading-relaxed font-semibold">{item.nome}</p>
                    <p className="text-base text-[#CBD5E1] mb-6 leading-relaxed">{item.descricao}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {likertOptions.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleAnswer(item.cod, option.value)}
                            className={`
                              w-full text-center px-3 py-2 rounded-lg text-sm font-medium transition-all
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
                  <p className="text-base text-[#F1F5F9] leading-relaxed">
                    Concluíste todos os testes. Volta ao painel para veres os teus resultados.
                  </p>
                ) : (
                  <>
                    <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                      As tuas respostas foram guardadas. Segue para o próximo teste.
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
