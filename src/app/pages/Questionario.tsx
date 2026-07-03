import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type Stage = 'selectType' | 'intro1' | 'stage1' | 'transition' | 'stage2' | 'conclusion';

interface InterestItem {
  cod: string;
  item_text: string;
}

interface IntelligenceItem {
  ordem_nova: number;
  item_text: string;
}

interface InterestAnswer {
  item_cod: string;
  answer: number;
}

interface IntelligenceAnswer {
  item_ordem: number;
  answer: number;
}

const incentivePool = {
  stage1: {
    10: [
      "Dez perguntas e nem deste por isso. Continua.",
      "Já vais em dez. Bom ritmo.",
      "Primeiras dez feitas. Segue.",
      "Dez respondidas, nada mal.",
      "Vais bem, dez já lá vão."
    ],
    20: [
      "Já vais em vinte. Quase a meio.",
      "Passaste das vinte e ainda nem cansaste.",
      "Vinte feitas. O meio está a chegar.",
      "Vinte respondidas, o caminho começa a aparecer.",
      "Vinte no marcador. Continua."
    ],
    30: [
      "Trinta perguntas. Mais de metade feita.",
      "Já vais em trinta. A reta final já se vê.",
      "Trinta no total. Sabes o que fazes.",
      "Passaste das trinta. Isto anda.",
      "Trinta. Faltam só dezassete."
    ],
    40: [
      "Quarenta. Sete para terminar a primeira parte.",
      "Já vais em quarenta. Começou a reta final.",
      "Quarenta respondidas. Quase lá.",
      "Sete perguntas e esta parte acaba.",
      "Quarenta. O fim desta etapa está à vista."
    ]
  },
  stage2: {
    10: [
      "Dez na segunda etapa. Já passaste de um terço.",
      "Já vais em dez. Não desististe.",
      "Dez perguntas na nova parte. Mantém o ritmo.",
      "Dez respondidas, faltam dezoito.",
      "Já são dez nesta etapa. Continua."
    ],
    20: [
      "Vinte. Faltam só oito.",
      "Já vais em vinte. A meta apareceu.",
      "Vinte respondidas, oito separam-te do fim.",
      "Vinte feitas. Quase a acabar.",
      "Vinte. Reta final a sério agora."
    ]
  }
};

export default function Questionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('intro1');
  const [resultMode, setResultMode] = useState<'3ciclo' | 'secundario'>('secundario');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Qual teste corre nesta sessão de ecrã: 'interesses' ou 'inteligencias'.
  // Vem do parâmetro ?teste=<code> que o painel passa (ex.: interesses_9).
  const testeParam = new URLSearchParams(window.location.search).get('teste') || '';
  const tipoTeste: 'interesses' | 'inteligencias' = testeParam.startsWith('inteligencias')
    ? 'inteligencias'
    : 'interesses';
  const [testRowId, setTestRowId] = useState<string | null>(null);

  const [interestItems, setInterestItems] = useState<InterestItem[]>([]);
  const [intelligenceItems, setIntelligenceItems] = useState<IntelligenceItem[]>([]);

  const [interestAnswers, setInterestAnswers] = useState<Record<string, number>>({});
  const [intelligenceAnswers, setIntelligenceAnswers] = useState<Record<number, number>>({});

  const [loading, setLoading] = useState(true);
  const [showExitModal, setShowExitModal] = useState(false);
  const [calculatingResults, setCalculatingResults] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);
  const [encouragementMessage, setEncouragementMessage] = useState<string | null>(null);
  const [encouragementVisible, setEncouragementVisible] = useState(false);
  const [encouragementPulsing, setEncouragementPulsing] = useState(false);
  const [milestonesShown, setMilestonesShown] = useState<Set<string>>(new Set());

  const questionRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const TOTAL_INTEREST = 47;
  const TOTAL_INTELLIGENCE = 28;
  // Total do teste a correr (não a soma dos dois).
  const TOTAL_QUESTIONS = tipoTeste === 'interesses' ? TOTAL_INTEREST : TOTAL_INTELLIGENCE;

  useEffect(() => {
    if (!user) return;

    const initQuestionario = async () => {
      // 1. A pessoa deve ter SEMPRE uma só sessão. Busca a última (qualquer estado).
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('*')
        .eq('student_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1);

      let currentSessionId: string;
      let existingMode: string | null = null;

      // 2. Só cria nova se a pessoa NUNCA teve sessão (evita sessões duplicadas).
      if (!sessions || sessions.length === 0) {
        const { data: newSession } = await supabase
          .from('assessment_sessions')
          .insert({ student_id: user.id })
          .select()
          .single();

        currentSessionId = newSession!.id;
        existingMode = (newSession as { result_mode?: string | null })?.result_mode ?? null;
      } else {
        // Reusa a sessão existente (mesma para responder, retomar e refazer).
        currentSessionId = sessions[0].id;
        existingMode = (sessions[0] as { result_mode?: string | null })?.result_mode ?? null;
      }

      setSessionId(currentSessionId);

      // Tipo de resultado: escolha já guardada, ou pré-seleção pela escolaridade do registo
      const { data: prof } = await supabase
        .from('profiles')
        .select('education_level')
        .eq('id', user.id)
        .single();
      const edu = prof?.education_level ?? '';
      const default3Ciclo =
        edu.includes('3.º ciclo') || edu.includes('3º ciclo') || edu.toLowerCase().includes('básico');
      setResultMode((existingMode as '3ciclo' | 'secundario') ?? (default3Ciclo ? '3ciclo' : 'secundario'));

      // 3. Carregar itens das tabelas de referência
      const { data: intItems } = await supabase
        .from('interest_items')
        .select('*')
        .order('cod', { ascending: true });

      const { data: intelItems } = await supabase
        .from('intelligence_items')
        .select('*')
        .order('ordem_nova', { ascending: true });

      setInterestItems(intItems || []);
      setIntelligenceItems(intelItems || []);

      // 4. Carregar respostas já dadas
      const { data: intAns } = await supabase
        .from('interest_answers')
        .select('item_cod, answer')
        .eq('session_id', currentSessionId);

      const { data: intelAns } = await supabase
        .from('intelligence_answers')
        .select('item_ordem, answer')
        .eq('session_id', currentSessionId);

      // Converter para Record
      const intAnswersMap: Record<string, number> = {};
      (intAns || []).forEach((a: InterestAnswer) => {
        intAnswersMap[a.item_cod] = a.answer;
      });

      const intelAnswersMap: Record<number, number> = {};
      (intelAns || []).forEach((a: IntelligenceAnswer) => {
        intelAnswersMap[a.item_ordem] = a.answer;
      });

      setInterestAnswers(intAnswersMap);
      setIntelligenceAnswers(intelAnswersMap);

      // 5. Determinar etapa e posição, conforme o teste a correr
      let intCount = Object.keys(intAnswersMap).length;
      let intelCount = Object.keys(intelAnswersMap).length;

      // Resolve o id do teste no catálogo.
      let resolvedTestId: string | null = null;
      let estaConcluido = false;
      if (testeParam) {
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
      }

      // REFAZER: ao reabrir um teste já concluído, a bateria inteira é reiniciada
      // (os dois testes). Mantém-se um único estado coerente: ambos a_meio,
      // respostas dos dois apagadas, resultado invalidado.
      if (estaConcluido && resolvedTestId) {
        // Guarda o completo antigo no histórico antes de o perder.
        await supabase.rpc('arquivar_resultado', { p_session: currentSessionId });

        // Apaga as respostas DOS DOIS testes.
        await supabase.from('interest_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('intelligence_answers').delete().eq('session_id', currentSessionId);
        await supabase.from('personality_responses').delete().eq('session_id', currentSessionId);
        setInterestAnswers({});
        setIntelligenceAnswers({});
        intCount = 0;
        intelCount = 0;

        // Reabre a sessão: status volta a in_progress (invalida o completo via gatilho).
        await supabase
          .from('assessment_sessions')
          .update({ status: 'in_progress', completed_at: null })
          .eq('id', currentSessionId);

        // Repõe OS DOIS testes do ano a a_meio.
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

      if (tipoTeste === 'interesses') {
        // Corre só o teste de interesses
        if (existingMode || resultMode) {
          setStage(intCount < TOTAL_INTEREST ? 'stage1' : 'conclusion');
        } else {
          setStage('selectType');
        }
      } else {
        // Corre só o teste de inteligências
        setStage(intelCount < TOTAL_INTELLIGENCE ? 'stage2' : 'conclusion');
      }

      setLoading(false);
    };

    initQuestionario();
  }, [user]);

  const confirmResultMode = async () => {
    if (!sessionId) return;
    await supabase
      .from('assessment_sessions')
      .update({ result_mode: resultMode })
      .eq('id', sessionId);
    setStage('intro1');
  };

  // Scroll para a primeira pergunta não respondida quando a etapa muda
  useEffect(() => {
    if (stage === 'stage1' && interestItems.length > 0) {
      setTimeout(() => {
        const firstUnanswered = interestItems.find(item => !interestAnswers[item.cod]);
        if (firstUnanswered) {
          scrollToQuestion(`interest-${firstUnanswered.cod}`);
        }
      }, 300);
    } else if (stage === 'stage2' && intelligenceItems.length > 0) {
      setTimeout(() => {
        const firstUnanswered = intelligenceItems.find(item => !intelligenceAnswers[item.ordem_nova]);
        if (firstUnanswered) {
          scrollToQuestion(`intelligence-${firstUnanswered.ordem_nova}`);
        }
      }, 300);
    }
  }, [stage, interestItems, intelligenceItems]);

  const scrollToQuestion = (questionKey: string) => {
    const element = questionRefs.current[questionKey];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const showEncouragementIfMilestone = (answeredCount: number, isStage1: boolean) => {
    const milestoneKey = `${isStage1 ? 'stage1' : 'stage2'}-${answeredCount}`;

    // Não mostrar se já foi exibido antes
    if (milestonesShown.has(milestoneKey)) return;

    let messagePool: string[] | null = null;

    if (isStage1) {
      // Etapa 1 - interesses
      if (answeredCount === 10) messagePool = incentivePool.stage1[10];
      else if (answeredCount === 20) messagePool = incentivePool.stage1[20];
      else if (answeredCount === 30) messagePool = incentivePool.stage1[30];
      else if (answeredCount === 40) messagePool = incentivePool.stage1[40];
    } else {
      // Etapa 2 - inteligências
      if (answeredCount === 10) messagePool = incentivePool.stage2[10];
      else if (answeredCount === 20) messagePool = incentivePool.stage2[20];
    }

    if (messagePool) {
      // Sortear uma mensagem aleatória do pool
      const randomIndex = Math.floor(Math.random() * messagePool.length);
      const message = messagePool[randomIndex];

      setMilestonesShown(prev => new Set([...prev, milestoneKey]));
      setEncouragementMessage(message);
      setEncouragementVisible(true);
      setEncouragementPulsing(true);

      // Desativar pulse após 600ms
      setTimeout(() => {
        setEncouragementPulsing(false);
      }, 600);

      // Começar a esconder após 5 segundos
      setTimeout(() => {
        setEncouragementVisible(false);
        // Remover a mensagem após a animação de saída (300ms)
        setTimeout(() => {
          setEncouragementMessage(null);
        }, 300);
      }, 5000);
    }
  };

  const handleInterestAnswer = async (itemCod: string, answer: number) => {
    if (!sessionId) return;

    // Atualizar estado local imediatamente
    const updatedAnswers = { ...interestAnswers, [itemCod]: answer };
    setInterestAnswers(updatedAnswers);

    // Verificar e mostrar mensagem de incentivo
    const answeredCount = Object.keys(updatedAnswers).length;
    showEncouragementIfMilestone(answeredCount, true);

    // Rolar para a próxima pergunta imediatamente, sem esperar pela gravação
    // (no mobile a rede atrasa o await e o scroll ficava preso atrás dele).
    setTimeout(() => {
      const nextUnanswered = interestItems.find(item => !updatedAnswers[item.cod]);

      if (nextUnanswered) {
        scrollToQuestion(`interest-${nextUnanswered.cod}`);
      } else {
        // Todas as de interesses respondidas - concluir este teste
        setStage('conclusion');
      }
    }, 100);

    // Salvar no banco (em paralelo, não bloqueia o scroll acima)
    await supabase
      .from('interest_answers')
      .upsert({ session_id: sessionId, item_cod: itemCod, answer });
  };

  const handleIntelligenceAnswer = async (itemOrdem: number, answer: number) => {
    if (!sessionId) return;

    // Atualizar estado local imediatamente
    const updatedAnswers = { ...intelligenceAnswers, [itemOrdem]: answer };
    setIntelligenceAnswers(updatedAnswers);

    // Verificar e mostrar mensagem de incentivo
    const answeredCount = Object.keys(updatedAnswers).length;
    showEncouragementIfMilestone(answeredCount, false);

    // Rolar para a próxima pergunta imediatamente, sem esperar pela gravação
    // (no mobile a rede atrasa o await e o scroll ficava preso atrás dele).
    setTimeout(() => {
      const nextUnanswered = intelligenceItems.find(item => !updatedAnswers[item.ordem_nova]);

      if (nextUnanswered) {
        scrollToQuestion(`intelligence-${nextUnanswered.ordem_nova}`);
      } else {
        // Todas respondidas - ir para conclusão
        setStage('conclusion');
      }
    }, 100);

    // Salvar no banco (em paralelo, não bloqueia o scroll acima)
    await supabase
      .from('intelligence_answers')
      .upsert({ session_id: sessionId, item_ordem: itemOrdem, answer });
  };

  const [allTestsDone, setAllTestsDone] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [proximoTesteCode, setProximoTesteCode] = useState<string | null>(null);

  // Marca este teste como concluído e avalia se a bateria do ano está completa.
  const handleComplete = async () => {
    if (!sessionId || !user) return;
    setFinalizing(true);

    // 1. Marca o teste atual como concluído.
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

    // 2. Ano-alvo a partir da escolaridade (mesma regra do painel).
    const { data: prof } = await supabase
      .from('profiles')
      .select('education_level')
      .eq('id', user.id)
      .single();
    const edu = (prof?.education_level ?? '').toLowerCase();
    const ano =
      edu.includes('3.º ciclo') || edu.includes('3º ciclo') || edu.includes('básico') ? 9 : 12;

    // 3. Todos os testes do ano concluídos? E qual o próximo por fazer?
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
      (prog || []).filter((p: { estado: string }) => p.estado === 'concluido')
        .map((p: { test_id: string }) => p.test_id)
    );
    const lista = (catalogo || []) as { id: string; code: string; ordem: number }[];
    const todos = lista.length > 0 && lista.every((t) => concluidos.has(t.id));

    // Próximo teste por fazer (o primeiro do ano que ainda não está concluído).
    const proximo = lista.find((t) => !concluidos.has(t.id));
    setProximoTesteCode(proximo?.code ?? null);

    setAllTestsDone(todos);
    setFinalizing(false);
    setStage('conclusion');
  };

  // Vai direto para o próximo teste (fluxo em linha reta, sem passar pelo painel).
  const irParaProximoTeste = () => {
    if (!proximoTesteCode) {
      navigate('/app');
      return;
    }
    // Recarrega a página do questionário com o novo teste.
    window.location.href = proximoTesteCode.startsWith('personalidade')
      ? `/app/questionario-personalidade?teste=${encodeURIComponent(proximoTesteCode)}`
      : `/app/questionario?teste=${encodeURIComponent(proximoTesteCode)}`;
  };

  // Gera o resultado (sintético, grátis) e leva ao painel/resultados.
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

  // Quando o teste chega à conclusão, marca-o concluído e avalia a bateria.
  const completedRef = useRef(false);
  useEffect(() => {
    if (stage === 'conclusion' && !completedRef.current) {
      completedRef.current = true;
      handleComplete();
    }
  }, [stage]);

  const handleBackToDashboard = () => {
    const totalAnswered = Object.keys(interestAnswers).length + Object.keys(intelligenceAnswers).length;

    if (totalAnswered > 0) {
      setShowExitModal(true);
    } else {
      navigate('/app');
    }
  };

  const confirmExit = () => {
    setShowExitModal(false);
    navigate('/app');
  };

  const getTotalAnswered = () => {
    return tipoTeste === 'interesses'
      ? Object.keys(interestAnswers).length
      : Object.keys(intelligenceAnswers).length;
  };

  const getActiveQuestionKey = (): string | null => {
    if (stage === 'stage1') {
      const firstUnanswered = interestItems.find(item => !interestAnswers[item.cod]);
      return firstUnanswered ? `interest-${firstUnanswered.cod}` : null;
    } else if (stage === 'stage2') {
      const firstUnanswered = intelligenceItems.find(item => !intelligenceAnswers[item.ordem_nova]);
      return firstUnanswered ? `intelligence-${firstUnanswered.ordem_nova}` : null;
    }
    return null;
  };

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

  if (calculationError) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-8">
        <div className="bg-[#1E293B] rounded-xl p-10 max-w-md text-center">
          <p className="text-white mb-6">{calculationError}</p>
          <button
            onClick={() => navigate('/app')}
            className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
          >
            Voltar ao painel
          </button>
        </div>
      </div>
    );
  }

  const progressPercentage = (getTotalAnswered() / TOTAL_QUESTIONS) * 100;
  const activeQuestionKey = getActiveQuestionKey();

  const likertOptionsStage1 = [
    { value: 1, label: 'Não gosto nada' },
    { value: 2, label: 'Gosto pouco' },
    { value: 3, label: 'Indiferente' },
    { value: 4, label: 'Gosto' },
    { value: 5, label: 'Gosto muito' }
  ];

  const likertOptionsStage2 = [
    { value: 1, label: 'Nada como eu' },
    { value: 2, label: 'Pouco como eu' },
    { value: 3, label: 'Mais ou menos' },
    { value: 4, label: 'Bastante como eu' },
    { value: 5, label: 'Totalmente como eu' }
  ];

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* HEADER */}
      <header className="h-20 bg-[#0F172A] border-b border-[#334155] fixed top-0 left-0 right-0 z-50">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
          <button onClick={handleBackToDashboard} className="text-xl font-bold text-white shrink-0">POPOV</button>

          {/* Barra de progresso */}
          <div className="flex-1 min-w-0 max-w-xl mx-2 sm:mx-8">
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2BA88C] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 text-center truncate">
              {getTotalAnswered()} de {TOTAL_QUESTIONS} respondidas
            </p>
          </div>

          <button
            onClick={handleBackToDashboard}
            className="shrink-0 px-3 sm:px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
          >
            <span className="hidden sm:inline">Voltar ao painel</span>
            <span className="sm:hidden">Sair</span>
          </button>
        </div>
      </header>

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA */}
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
                onClick={confirmExit}
                className="px-4 py-2 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
              >
                Sim, voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BANNER DE INCENTIVO */}
      {encouragementMessage && (
        <div
          className={`
            fixed top-20 left-1/2 -translate-x-1/2
            max-w-2xl w-[90%]
            bg-[#2BA88C] border-l-4 border-white p-5 shadow-2xl
            transition-all duration-300
            z-50
            ${encouragementVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
            ${encouragementPulsing ? 'animate-pulse' : ''}
          `}
        >
          <p className="text-white text-lg font-medium text-center">{encouragementMessage}</p>
        </div>
      )}

      {/* ÁREA PRINCIPAL */}
      <div className="pt-20">
        {/* CONTEÚDO */}
        <main className="max-w-4xl mx-auto p-8">
          {/* ENTRADA: ESCOLHA DO TIPO DE RESULTADO */}
          {stage === 'selectType' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-2">Que orientação queres?</h2>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Já vem escolhida com base no teu nível de ensino. Podes mudar se quiseres. As perguntas do teste são as mesmas — só muda o resultado no fim.
                </p>

                <div className="space-y-3 mb-6">
                  {([
                    {
                      key: 'secundario',
                      titulo: 'Secundário / Superior',
                      desc: 'Profissões e áreas de formação com mais afinidade contigo.',
                    },
                    {
                      key: '3ciclo',
                      titulo: '9.º ano — áreas do Secundário',
                      desc: 'As áreas do Secundário (Ciências e Tecnologias, Socioeconómicas, Línguas e Humanidades, Artes Visuais) que mais combinam contigo.',
                    },
                  ] as const).map((opt) => {
                    const sel = resultMode === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setResultMode(opt.key)}
                        className="w-full text-left rounded-lg p-5 transition-colors"
                        style={{
                          backgroundColor: sel ? 'rgba(43,168,140,0.12)' : '#0F172A',
                          border: sel ? '2px solid #2BA88C' : '1px solid #334155',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-base font-bold text-[#F1F5F9]">{opt.titulo}</span>
                          {sel && (
                            <span className="text-xs font-semibold text-[#2BA88C]">Selecionado</span>
                          )}
                        </div>
                        <p className="text-sm text-[#94A3B8]">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={confirmResultMode}
                  className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                >
                  Começar
                </button>
              </div>
            </div>
          )}

          {/* TELA DE INTRODUÇÃO ETAPA 1 */}
          {stage === 'intro1' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Parte 1: Os teus interesses</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Vais ver 47 frases sobre atividades. Para cada uma, indica o quanto gostarias de fazer essa atividade. Não penses demasiado — a primeira reação costuma ser a mais sincera.
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

          {/* ETAPA 1 - LISTA DE TODAS AS PERGUNTAS DE INTERESSES */}
          {stage === 'stage1' && (
            <div className="space-y-6 py-8">
              {interestItems.map((item, index) => {
                const questionKey = `interest-${item.cod}`;
                const isActive = questionKey === activeQuestionKey;
                const currentAnswer = interestAnswers[item.cod];

                return (
                  <div
                    key={item.cod}
                    ref={(el) => { questionRefs.current[questionKey] = el; }}
                    className={`
                      rounded-xl p-8 transition-all duration-300
                      ${isActive ? 'bg-[#1E293B] border-l-4 border-[#2BA88C] opacity-100' : 'bg-[#1E293B] opacity-40'}
                    `}
                  >
                    <p className="text-sm text-[#94A3B8] mb-2">
                      Pergunta {index + 1} de {TOTAL_INTEREST}
                    </p>
                    <p className="text-lg text-white mb-6 leading-relaxed">
                      {item.item_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {likertOptionsStage1.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleInterestAnswer(item.cod, option.value)}
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

          {/* TELA DE TRANSIÇÃO */}
          {stage === 'transition' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Concluíste a primeira parte</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Agora vamos avaliar as tuas competências. São 28 perguntas, cerca de 10 minutos.
                </p>
                <button
                  onClick={() => setStage('stage2')}
                  className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* ETAPA 2 - LISTA DE TODAS AS PERGUNTAS DE INTELIGÊNCIAS */}
          {stage === 'stage2' && (
            <div className="space-y-6 py-8">
              {intelligenceItems.map((item, index) => {
                const questionKey = `intelligence-${item.ordem_nova}`;
                const isActive = questionKey === activeQuestionKey;
                const currentAnswer = intelligenceAnswers[item.ordem_nova];

                return (
                  <div
                    key={item.ordem_nova}
                    ref={(el) => { questionRefs.current[questionKey] = el; }}
                    className={`
                      rounded-xl p-8 transition-all duration-300
                      ${isActive ? 'bg-[#1E293B] border-l-4 border-[#2BA88C] opacity-100' : 'bg-[#1E293B] opacity-40'}
                    `}
                  >
                    <p className="text-sm text-[#94A3B8] mb-2">
                      Pergunta {index + 1} de {TOTAL_INTELLIGENCE}
                    </p>
                    <p className="text-lg text-white mb-6 leading-relaxed">
                      {item.item_text}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                      {likertOptionsStage2.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleIntelligenceAnswer(item.ordem_nova, option.value)}
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

          {/* TELA DE CONCLUSÃO DO TESTE */}
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
