import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

type Stage = 'intro1' | 'stage1' | 'transition' | 'stage2' | 'conclusion';

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
      "Dez perguntas e nem suou. Bora.",
      "Já bateu dez. O ritmo ficou bom.",
      "Primeiras dez no bolso. Segue.",
      "Dez respondidas, nada mal.",
      "Olha você indo, dez já era."
    ],
    20: [
      "Bateu vinte. Quase metade.",
      "Você passou de vinte e ainda nem cansou.",
      "Vinte feitas. A metade está chegando.",
      "Vinte respondidas, o caminho começa a aparecer.",
      "Vinte no placar. Continue."
    ],
    30: [
      "Trinta perguntas. Mais da metade feita.",
      "Bateu trinta. A reta final já dá pra ver.",
      "Trinta no acumulado. Você sabe o que faz.",
      "Passou de trinta. A coisa anda.",
      "Trinta. Faltam só dezessete."
    ],
    40: [
      "Quarenta. Sete pra terminar a primeira parte.",
      "Bateu quarenta. A reta final começou.",
      "Quarenta respondidas. Quase lá.",
      "Sete perguntas e essa parte acaba.",
      "Quarenta. Já dá pra cheirar o fim da etapa."
    ]
  },
  stage2: {
    10: [
      "Dez na segunda etapa. Já passou de um terço.",
      "Bateu dez. Você não desistiu.",
      "Dez perguntas na nova parte. Mantém o ritmo.",
      "Dez respondidas, faltam dezoito.",
      "Já são dez nesta etapa. Continua."
    ],
    20: [
      "Vinte. Faltam só oito.",
      "Bateu vinte. A linha de chegada apareceu.",
      "Vinte respondidas, oito separam você do fim.",
      "Vinte feitas. Quase acabou.",
      "Vinte. Reta final de verdade agora."
    ]
  }
};

export default function Questionario() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stage, setStage] = useState<Stage>('intro1');
  const [sessionId, setSessionId] = useState<string | null>(null);

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
  const TOTAL_QUESTIONS = TOTAL_INTEREST + TOTAL_INTELLIGENCE;

  useEffect(() => {
    if (!user) return;

    const initQuestionario = async () => {
      // 1. Buscar sessão in_progress
      const { data: sessions } = await supabase
        .from('assessment_sessions')
        .select('*')
        .eq('student_id', user.id)
        .eq('status', 'in_progress')
        .order('started_at', { ascending: false })
        .limit(1);

      let currentSessionId: string;

      // 2. Se não existe, criar nova
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

      // 5. Determinar etapa e posição atual
      const intCount = Object.keys(intAnswersMap).length;
      const intelCount = Object.keys(intelAnswersMap).length;

      if (intCount === 0 && intelCount === 0) {
        // Nenhuma resposta - mostrar intro
        setStage('intro1');
      } else if (intCount < TOTAL_INTEREST) {
        // Etapa 1 parcial
        setStage('stage1');
      } else if (intelCount === 0) {
        // Etapa 1 completa, Etapa 2 não iniciada
        setStage('transition');
      } else if (intelCount < TOTAL_INTELLIGENCE) {
        // Etapa 2 parcial
        setStage('stage2');
      } else {
        // Todas respondidas
        setStage('conclusion');
      }

      setLoading(false);
    };

    initQuestionario();
  }, [user]);

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

    // Salvar no banco
    await supabase
      .from('interest_answers')
      .upsert({ session_id: sessionId, item_cod: itemCod, answer });

    // Aguardar 100ms e rolar para próxima pergunta não respondida
    setTimeout(() => {
      const nextUnanswered = interestItems.find(item => !updatedAnswers[item.cod]);

      if (nextUnanswered) {
        scrollToQuestion(`interest-${nextUnanswered.cod}`);
      } else {
        // Todas respondidas - ir para transição
        setStage('transition');
      }
    }, 100);
  };

  const handleIntelligenceAnswer = async (itemOrdem: number, answer: number) => {
    if (!sessionId) return;

    // Atualizar estado local imediatamente
    const updatedAnswers = { ...intelligenceAnswers, [itemOrdem]: answer };
    setIntelligenceAnswers(updatedAnswers);

    // Verificar e mostrar mensagem de incentivo
    const answeredCount = Object.keys(updatedAnswers).length;
    showEncouragementIfMilestone(answeredCount, false);

    // Salvar no banco
    await supabase
      .from('intelligence_answers')
      .upsert({ session_id: sessionId, item_ordem: itemOrdem, answer });

    // Aguardar 100ms e rolar para próxima pergunta não respondida
    setTimeout(() => {
      const nextUnanswered = intelligenceItems.find(item => !updatedAnswers[item.ordem_nova]);

      if (nextUnanswered) {
        scrollToQuestion(`intelligence-${nextUnanswered.ordem_nova}`);
      } else {
        // Todas respondidas - ir para conclusão
        setStage('conclusion');
      }
    }, 100);
  };

  const handleComplete = async () => {
    if (!sessionId) return;

    setCalculatingResults(true);
    setCalculationError(null);

    // Atualizar status da sessão
    await supabase
      .from('assessment_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Chamar Edge Function
    const { data, error } = await supabase.functions.invoke('calculate_results', {
      body: { session_id: sessionId }
    });

    if (error || !data?.ok) {
      // Edge Function ainda não existe (Bloco 7)
      setCalculationError('Função de cálculo ainda não disponível. Será implementada no próximo bloco.');
      setCalculatingResults(false);
      return;
    }

    // Sucesso - redirecionar
    navigate('/app/resultados');
  };

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
    return Object.keys(interestAnswers).length + Object.keys(intelligenceAnswers).length;
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
        <p className="text-[#94A3B8]">Carregando...</p>
      </div>
    );
  }

  if (calculatingResults) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#2BA88C] mb-4"></div>
        <p className="text-white text-lg">Estamos calculando seus resultados...</p>
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
            Voltar para o painel
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
        <div className="h-full px-6 flex items-center justify-between">
          <div className="text-xl font-bold text-white">POPOV</div>

          {/* Barra de progresso */}
          <div className="flex-1 max-w-xl mx-8">
            <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#2BA88C] transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-[#94A3B8] mt-1 text-center">
              {getTotalAnswered()} de {TOTAL_QUESTIONS} respondidas
            </p>
          </div>

          <button
            onClick={handleBackToDashboard}
            className="px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
          >
            Voltar para o painel
          </button>
        </div>
      </header>

      {/* MODAL DE CONFIRMAÇÃO DE SAÍDA */}
      {showExitModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1E293B] rounded-xl p-8 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Sair da avaliação?</h3>
            <p className="text-[#F1F5F9] mb-6">
              Suas respostas estão salvas. Você pode retomar de onde parou a qualquer momento.
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
          {/* TELA DE INTRODUÇÃO ETAPA 1 */}
          {stage === 'intro1' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Parte 1: Seus interesses</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Você verá 47 frases sobre atividades. Para cada uma, indique o quanto você gostaria de fazer aquela atividade. Não pense demais, sua primeira reação costuma ser a mais honesta.
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

                    <div className="flex flex-wrap gap-2">
                      {likertOptionsStage1.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleInterestAnswer(item.cod, option.value)}
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

          {/* TELA DE TRANSIÇÃO */}
          {stage === 'transition' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Você concluiu a primeira parte</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Agora vamos avaliar suas habilidades. São 28 perguntas, em torno de 10 minutos.
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

                    <div className="flex flex-wrap gap-2">
                      {likertOptionsStage2.map((option) => {
                        const isSelected = currentAnswer === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleIntelligenceAnswer(item.ordem_nova, option.value)}
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

          {/* TELA DE CONCLUSÃO */}
          {stage === 'conclusion' && (
            <div className="flex items-center justify-center min-h-[70vh]">
              <div className="bg-[#1E293B] rounded-xl p-10 max-w-2xl w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Você concluiu sua avaliação</h2>
                <p className="text-base text-[#F1F5F9] leading-relaxed mb-6">
                  Suas respostas foram salvas. Agora vamos calcular seus resultados.
                </p>
                <button
                  onClick={handleComplete}
                  className="w-full px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Concluir e ver resultados
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
