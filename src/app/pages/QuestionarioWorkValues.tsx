import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Check, GripVertical } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type Stage = 'intro1' | 'stage1' | 'conclusion';

interface WvItem {
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

// ─── Bloco arrastável ────────────────────────────────────────────────────
const TIPO_BLOCO = 'valor';

function BlocoValor({
  item,
  index,
  mover,
}: {
  item: WvItem;
  index: number;
  mover: (de: number, para: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: TIPO_BLOCO,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  const [, drop] = useDrop({
    accept: TIPO_BLOCO,
    hover: (dragged: { index: number }) => {
      if (dragged.index !== index) {
        mover(dragged.index, index);
        dragged.index = index;
      }
    },
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`
        flex items-center gap-4 bg-[#1E293B] border rounded-xl p-5 cursor-grab active:cursor-grabbing
        transition-all
        ${isDragging ? 'opacity-40 border-[#2BA88C]' : 'border-[#334155] hover:border-[#2BA88C]'}
      `}
    >
      <span className="w-8 h-8 rounded-full bg-[#2BA88C] text-white text-sm font-bold flex items-center justify-center shrink-0">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-white font-semibold">{item.nome}</p>
        <p className="text-sm text-[#94A3B8]">{item.descricao}</p>
      </div>
      <GripVertical size={20} className="text-[#94A3B8] shrink-0" />
    </div>
  );
}

const TOTAL_VALORES = 6;

export default function QuestionarioWorkValues() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('intro1');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [testRowId, setTestRowId] = useState<string | null>(null);

  // A ordem atual dos blocos (índice 0 = mais importante).
  const [ordem, setOrdem] = useState<WvItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [finalizing, setFinalizing] = useState(false);
  const [allTestsDone, setAllTestsDone] = useState(false);
  const [proximoTesteCode, setProximoTesteCode] = useState<string | null>(null);
  const [showExitModal, setShowExitModal] = useState(false);

  const testeParam = new URLSearchParams(window.location.search).get('teste') || 'work_values_12';

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

      // 2. Itens (6 valores) e ordem já guardada, se houver.
      const { data: itemRows } = await supabase
        .from('wv_items')
        .select('cod, nome, descricao')
        .order('cod', { ascending: true });
      const itens = (itemRows || []) as WvItem[];

      const { data: ans } = await supabase
        .from('wv_answers')
        .select('item_cod, posicao')
        .eq('session_id', currentSessionId);

      let ordemInicial = itens;
      let jaRespondeu = false;
      if (ans && ans.length === TOTAL_VALORES) {
        // repõe a ordem guardada
        const posByCod: Record<number, number> = {};
        (ans as { item_cod: number; posicao: number }[]).forEach((a) => {
          posByCod[a.item_cod] = a.posicao;
        });
        ordemInicial = [...itens].sort((a, b) => (posByCod[a.cod] ?? 99) - (posByCod[b.cod] ?? 99));
        jaRespondeu = true;
      }
      setOrdem(ordemInicial);

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
        setOrdem(itens);
        jaRespondeu = false;

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

      setStage(jaRespondeu && estaConcluido ? 'conclusion' : 'intro1');
      setLoading(false);
    };

    init();
  }, [user]);

  // Mover um bloco de uma posição para outra.
  const mover = (de: number, para: number) => {
    setOrdem((prev) => {
      const nova = [...prev];
      const [movido] = nova.splice(de, 1);
      nova.splice(para, 0, movido);
      return nova;
    });
  };

  // Confirmar a ordem: grava posição 1-6 de cada valor.
  const confirmarOrdem = async () => {
    if (!sessionId) return;
    setFinalizing(true);
    for (let i = 0; i < ordem.length; i++) {
      await supabase
        .from('wv_answers')
        .upsert({ session_id: sessionId, item_cod: ordem[i].cod, posicao: i + 1 });
    }
    setStage('conclusion');
    await handleComplete();
  };

  const handleComplete = async () => {
    if (!sessionId || !user) return;

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
              A tua ordenação só fica guardada quando confirmares. Podes voltar quando quiseres.
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
        <main className="max-w-3xl mx-auto p-8">
          {/* INTRODUÇÃO */}
          {stage === 'intro1' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">O que valorizas no trabalho</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Vais ver 6 coisas que as pessoas valorizam no trabalho. Arrasta os blocos e
                  ordena-os: no topo o mais importante para ti, em baixo o menos importante.
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

          {/* ORDENAÇÃO */}
          {stage === 'stage1' && (
            <DndProvider backend={HTML5Backend}>
              <div className="py-8">
                <h2 className="text-xl font-bold text-white mb-1">Ordena do mais para o menos importante</h2>
                <p className="text-sm text-[#94A3B8] mb-6">Arrasta os blocos. O 1 é o que mais valorizas.</p>
                <div className="space-y-3">
                  {ordem.map((item, index) => (
                    <BlocoValor key={item.cod} item={item} index={index} mover={mover} />
                  ))}
                </div>
                <button
                  onClick={confirmarOrdem}
                  disabled={finalizing}
                  className="mt-8 w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-60"
                >
                  {finalizing ? 'A guardar...' : 'Confirmar a minha ordem'}
                </button>
              </div>
            </DndProvider>
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
                      A tua ordem foi guardada. Segue para o próximo teste.
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
