import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../hooks/useAuth";
import {
  Activity,
  Atom,
  BookOpen,
  BookText,
  Briefcase,
  Calculator,
  ClipboardList,
  ExternalLink,
  Eye,
  GraduationCap,
  Hammer,
  Heart,
  Music,
  Palette,
  RefreshCw,
  AlertCircle,
  BookOpenCheck,
  ChevronRight,
  Loader2,
  Menu,
  ChevronDown,
  Scale,
  Search,
  Sprout,
  Star,
  TrendingUp,
  User,
  Users,
  Wrench,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const RIASEC_BAR_COLORS = [
  "#2BA88C", "#3FB89D", "#5FC8AF", "#7FD8C1", "#9FE8D3", "#BFF8E5",
];

const RIASEC_ICONS: Record<string, React.ElementType> = {
  "1": Wrench,
  "2": Search,
  "3": Palette,
  "4": Users,
  "5": TrendingUp,
  "6": ClipboardList,
};

const RIASEC_NAMES: Record<string, string> = {
  "1": "Realista",
  "2": "Investigativo",
  "3": "Artístico",
  "4": "Social",
  "5": "Empreendedor",
  "6": "Convencional",
};

// Interpretações RIASEC adaptadas do documento para linguagem do 9.º ano.
// (A rever pelo Jaisso — baseadas nos textos originais do documento.)
const RIASEC_INTERP: Record<string, string> = {
  "1": "Gostas de pôr as mãos na massa e de ver resultados concretos. Preferes trabalhar com ferramentas, máquinas, plantas ou animais, e atividades mais práticas. És direto e bom a resolver problemas reais, mais do que a lidar só com teorias.",
  "2": "Gostas de perceber como as coisas funcionam e de descobrir o porquê. Curtes desafios, lógica, matemática e resolver problemas difíceis. És curioso(a), observador(a) e gostas de investigar e aprender.",
  "3": "Gostas de criar e de te expressares à tua maneira. Valorizas a imaginação, as ideias diferentes e a liberdade para fazer as coisas sem regras muito rígidas. Sentes-te bem quando podes mostrar o que pensas e sentes.",
  "4": "Gostas de ajudar, ensinar e estar com pessoas. Dás-te bem em grupo e comunicas com facilidade. Preocupas-te com o bem-estar dos outros e sentes-te útil quando podes apoiar alguém.",
  "5": "Gostas de liderar, convencer e pôr ideias em ação. Tens à-vontade para falar e influenciar os outros, e preferes desafios a rotinas. Curtes movimento, iniciativa e estar à frente das coisas.",
  "6": "És organizado(a), cuidadoso(a) e gostas de ter tudo em ordem. Dás-te bem com tarefas claras, com regras e com atenção ao detalhe. Preferes saber o que se espera de ti a situações confusas ou sem estrutura.",
};

const RIASEC_COLORS: Record<string, string> = {
  "1": "#4F8FFF",
  "2": "#6C5CE7",
  "3": "#EC4899",
  "4": "#2BA88C",
  "5": "#F59E0B",
  "6": "#94A3B8",
};

const INTEL_NAMES: Record<string, string> = {
  "1": "Linguística",
  "2": "Lógico-matemática",
  "3": "Espacial",
  "4": "Corporal-cinestésica",
  "5": "Musical",
  "6": "Interpessoal",
  "7": "Intrapessoal",
};

// "Como estudas melhor" — dicas por inteligência, do documento (linguagem de 9.º ano).
const ESTUDO_POR_INTEL: Record<string, { como: string; dicas: string[]; livres: string }> = {
  "1": { como: "Aprendes melhor a ler e a escrever.", dicas: ["Lê em voz alta a matéria que estás a estudar", "Tira notas quando o professor está a dar matéria", "Copia a matéria e escreve resumos"], livres: "Nos tempos livres: lê, escreve, junta-te a um clube do livro ou a um grupo de teatro." },
  "2": { como: "Aprendes melhor a resolver problemas e a usar raciocínio lógico.", dicas: ["Faz um esquema da matéria", "Organiza a matéria por categorias", "Cria tabelas e gráficos com a informação"], livres: "Nos tempos livres: faz puzzles e quebra-cabeças ou jogos lógicos e matemáticos." },
  "3": { como: "Aprendes melhor através daquilo que vês.", dicas: ["Procura imagens e vídeos sobre os temas", "Sublinha e resume com cores em esquemas e gráficos", "Cria posters, apresentações ou vídeos da matéria"], livres: "Nos tempos livres: jogos de montar (como Legos), fotografa o que te cativa, segue mapas em passeios." },
  "4": { como: "Aprendes melhor usando o corpo, com tarefas práticas e movimento.", dicas: ["Revê os apontamentos em movimento, anda pela sala", "Constrói algo com as mãos a partir da matéria", "Usa o teatro e a mímica para representar o que estudas"], livres: "Nos tempos livres: pratica desporto, dança ou junta-te a um grupo de teatro." },
  "5": { como: "Aprendes melhor com música, canções, rimas e ritmos.", dicas: ["Canta uma matéria mais difícil", "Cria um ritmo com palmas para memorizar", "Escolhe uma música de fundo para o estudo"], livres: "Nos tempos livres: toca um instrumento, ouve música, junta-te a um coro ou banda." },
  "6": { como: "Aprendes melhor em relação com os outros.", dicas: ["Explora as matérias e tira dúvidas com colegas", "Colabora em projetos de grupo", "Participa em debates sobre as matérias"], livres: "Nos tempos livres: junta-te a um grupo de debate, pratica desportos de equipa." },
  "7": { como: "Aprendes melhor a refletir e a trabalhar de forma independente.", dicas: ["Escreve um diário das tuas aprendizagens", "Trabalha sozinho num local sossegado", "Faz um pequeno resumo do que aprendeste no fim"], livres: "Nos tempos livres: ouve música, faz ioga, pinta, escreve, medita." },
};

const AREA_DESCRIPTIONS: Record<string, string> = {
  "0": "Esta área abrange formações ligadas ao ensino, à investigação pedagógica e ao desenvolvimento humano em todas as idades. Podes trabalhar em escolas, universidades, organizações educativas ou no desenvolvimento de materiais didáticos. As tuas competências de comunicação, paciência e empatia serão uma mais-valia para teres um impacto positivo na vida de outras pessoas.",
  "2": "Esta área inclui formações em artes visuais, música, literatura, história, filosofia e línguas. Podes trabalhar em criação artística, produção cultural, ensino, investigação ou comunicação. A tua sensibilidade estética, capacidade crítica e expressão criativa serão centrais no teu percurso profissional.",
  "3": "Esta área reúne formações em administração, economia, direito, jornalismo, sociologia e ciências do comportamento. Podes trabalhar em empresas privadas, organismos públicos, escritórios de advocacia ou organizações sociais. As tuas competências analíticas, comunicativas e de tomada de decisão guiarão o teu caminho.",
  "4": "Esta área abrange formações em matemática, física, química, biologia, estatística e tecnologias de informação. Podes trabalhar em investigação científica, desenvolvimento de software, análise de dados ou ensino. A tua curiosidade investigativa e o teu raciocínio lógico serão fundamentais.",
  "5": "Esta área inclui engenharias, arquitetura, construção e indústrias de transformação. Podes projetar produtos, edifícios e sistemas, ou trabalhar no fabrico e na implementação de soluções tecnológicas. A tua capacidade de resolver problemas práticos e de pensar de forma estruturada será essencial.",
  "6": "Esta área abrange formações em agronomia, veterinária, ciências ambientais, silvicultura e pescas. Podes trabalhar em explorações agrícolas, agroindústria, conservação ambiental ou investigação científica. O teu interesse pela natureza e pelos sistemas vivos será o motor do teu percurso.",
  "7": "Esta área reúne formações em medicina, enfermagem, fisioterapia, psicologia, nutrição e serviço social. Podes trabalhar em hospitais, clínicas, escolas, organizações sociais ou consultórios próprios, cuidando da saúde física e emocional das pessoas. A tua empatia e atenção ao próximo serão uma mais-valia.",
  "8": "Esta área abrange formações em turismo, hotelaria, restauração, transportes, segurança e proteção ambiental. Podes trabalhar em vários setores que ligam as pessoas a serviços essenciais ou de lazer. O teu sentido prático, a tua capacidade de organização e o atendimento ao cliente serão valorizados.",
};

const AREA_IMAGES: Record<string, string> = {
  "0": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  "2": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
  "3": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800",
  "4": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
  "5": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800",
  "6": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800",
  "7": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
  "8": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800",
};

const INTEL_IMAGES: Record<string, string> = {
  "1": "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=400",
  "2": "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400",
  "3": "https://images.unsplash.com/photo-1545987796-200677ee1011?w=400",
  "4": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400",
  "5": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400",
  "6": "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400",
  "7": "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400",
};

const CNAEF_ICONS: Record<string, React.ElementType> = {
  "0": GraduationCap,
  "2": Palette,
  "3": Scale,
  "4": Atom,
  "5": Hammer,
  "6": Sprout,
  "7": Heart,
  "8": Briefcase,
};

function buildMymentorUrl(mymentor: string | null | undefined): string | null {
  if (!mymentor) return null;
  const str = String(mymentor);
  const [intPart, decPart] = str.split(".");
  const intPadded = intPart.padStart(4, "0");
  const decClean = decPart ? decPart.replace(/0+$/, "") : "";
  if (!decClean) return null;
  return `https://www.mymentor.pt/explorar/profissoes/${intPadded}.${decClean}`;
}

const INTEL_ICONS: Record<string, React.ElementType> = {
  "1": BookText,
  "2": Calculator,
  "3": Eye,
  "4": Activity,
  "5": Music,
  "6": Users,
  "7": User,
};

const CCH_AREAS: Record<string, { nome: string; desc: string }> = {
  CT: {
    nome: "Ciências e Tecnologias",
    desc: "Centrada em matemática, física e química, e biologia e geologia. Abre caminho para engenharias, saúde, ciências e tecnologia.",
  },
  CSE: {
    nome: "Ciências Socioeconómicas",
    desc: "Liga a matemática e a economia às ciências sociais. Abre caminho para economia, gestão, contabilidade e áreas afins.",
  },
  LH: {
    nome: "Línguas e Humanidades",
    desc: "Centrada em português, línguas, história, geografia e filosofia. Abre caminho para direito, comunicação, ensino, relações internacionais e ciências sociais.",
  },
  AV: {
    nome: "Artes Visuais",
    desc: "Centrada no desenho, na geometria descritiva e na expressão visual. Abre caminho para arquitetura, design, artes plásticas e áreas criativas.",
  },
};

interface ResultData {
  session_id: string;
  riasec_scores: Record<string, number>;
  intel_scores: Record<string, number>;
  top_strengths: number[];
  top_challenges: number[];
  occupation_scores: Record<string, number>;
  cnaef_n1_scores: Record<string, number>;
  cnaef_n2_scores?: Record<string, number>;
  cch_area_scores?: Record<string, number>;
  cch_detailed?: Record<
    string,
    {
      disciplinas: {
        disciplina: string;
        peso: number;
        match: number;
        intel_cod: number | null;
        intel_nome: string | null;
        intel_score: number;
        nivel: string | null;
      }[];
      cursos: { nome: string; match: number }[];
      profissoes: { esco: string; prof: string; mymentor: string | null; match: number }[];
    }
  >;
  top3_areas: string[];
  generated_at: string;
  orientador_text?: string;
  personality_scores?: Record<string, { media: number; pct: number; banda: string }> | null;
  sintese_personalidade?: string | null;
}

const FATOR_NOMES: Record<string, string> = {
  E: "Extroversão",
  A: "Amabilidade",
  C: "Conscienciosidade",
  N: "Neuroticismo",
  I: "Intelecto / Abertura",
};
const FATOR_ORDEM = ["E", "A", "C", "N", "I"];
const PERS_DESCRICOES: Record<string, Record<string, string>> = {
  E: {
    Elevado:
      "Pessoa sociável, expressiva e enérgica; procura o convívio, fala com facilidade em grupo, sente-se à vontade a iniciar contactos e tende a liderar interações.",
    Médio:
      "Equilíbrio entre convívio e recolhimento; sociável em certos contextos, reservada noutros.",
    Baixo:
      "Orientação mais introvertida; prefere ambientes calmos e poucos interlocutores, gasta menos energia na interação social e tende a ouvir mais do que a tomar a palavra. Não indica falta de competência social, mas menor procura de estimulação social.",
  },
  A: {
    Elevado:
      "Pessoa empática e cooperativa; sintoniza com os sentimentos alheios, valoriza a harmonia e tende a confiar e a agir de forma solidária.",
    Médio:
      "Coopera mas mantém a defesa dos próprios interesses; empática de forma seletiva.",
    Baixo:
      "Orientação mais cética ou competitiva; centra-se mais nos próprios objetivos, é mais crítica face aos outros e menos movida pela necessidade de agradar. Pode traduzir-se em maior frontalidade e independência de juízo.",
  },
  C: {
    Elevado:
      "Pessoa organizada e fiável; planeia, cumpre prazos, mantém ordem, conclui o que inicia e atende ao detalhe.",
    Médio:
      "Organização situacional; estruturada nas tarefas que prioriza, mais flexível nas restantes.",
    Baixo:
      "Estilo mais espontâneo e flexível; menos apego a rotinas e planeamento, maior tendência para adiar ou desarrumar, mas também maior adaptabilidade a imprevistos. Em contexto escolar ou profissional, sinaliza necessidade de apoio à estruturação do trabalho.",
  },
  N: {
    Elevado:
      "Maior reatividade emocional; oscilações de humor mais frequentes, tendência a preocupar-se e a sentir-se em baixo, sensibilidade ao stress.",
    Médio:
      "Reatividade emocional moderada; gere a maioria das situações, perturba-se perante pressão significativa.",
    Baixo:
      "Elevada estabilidade emocional; mantém-se calmo e descontraído, recupera depressa de contrariedades, humor estável.",
  },
  I: {
    Elevado:
      "Pessoa imaginativa e curiosa; gosta de ideias abstratas, explora o novo e aprecia a criatividade e a reflexão.",
    Médio:
      "Combina interesse por novidade com preferência pelo concreto e familiar.",
    Baixo:
      "Orientação mais prática e concreta; prefere o conhecido e o aplicável, com menos atração por abstração ou experimentação. Não indica menor capacidade, mas menor preferência por conteúdos abstratos.",
  },
};

interface OccDetail {
  prof: string;
  nameProfissao: string;
  mymentor: string | null;
  cnaef_unico: string | null;
  isco_4dig: string | null;
  score: number;
}

interface OccupationRow {
  esco: string;
  prof: string;
}

interface AreaDetail {
  professions: { esco: string; prof: string }[];
  trainings: { name_search: string; qnq_label: string }[];
}

export default function Resultados() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();
  const [result, setResult] = useState<ResultData | null>(null);
  const [topOccupations, setTopOccupations] = useState<{ name: string; score: number; mymentor?: string | null }[]>([]);
  const [mymentorMap, setMymentorMap] = useState<Record<string, string | null>>({});
  const [cnaefN2NameMap, setCnaefN2NameMap] = useState<Record<string, string>>({});
  const [occDetailMap, setOccDetailMap] = useState<Record<string, OccDetail>>({});
  const [trainingsByIsco, setTrainingsByIsco] = useState<Record<string, { name: string; qnq_label: string }[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [riasecDescriptions, setRiasecDescriptions] = useState<Record<string, string>>({});
  const [profCursoSel, setProfCursoSel] = useState<{ area: string; curso: string } | null>(null);
  const [intelDescriptions, setIntelDescriptions] = useState<Record<string, string>>({});
  const [orientadorText, setOrientadorText] = useState<string>("");
  const [loadingOrientador, setLoadingOrientador] = useState(false);
  const [errorOrientador, setErrorOrientador] = useState<string | null>(null);
  const [sintesePersonalidade, setSintesePersonalidade] = useState<string>("");
  const areaNameMapRef = useRef<Record<string, string>>({});
  const [recalculating, setRecalculating] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [saldoCreditos, setSaldoCreditos] = useState<number | null>(null);
  const [indice, setIndice] = useState<{ id: string; label: string }[]>([]);
  const [activeSection, setActiveSection] = useState<string>("");
  const [menuHeaderAberto, setMenuHeaderAberto] = useState(false);
  const [seccoesAberto, setSeccoesAberto] = useState(false);
  const [profSel9, setProfSel9] = useState<{ mae: string; area: string; mymentor: string | null; filhas: { esco: string; prof: string; match: number; mymentor: string | null; cursos: { nome: string }[] }[] } | null>(null);
  const [profFilhaSel, setProfFilhaSel] = useState<string | null>(null);

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    if (!result) return;
    // A recomendação (IA) é parte do relatório completo: não corre no sintético.
    if (result.nivel === "sintetico") return;
    if (result.sintese_personalidade) {
      setSintesePersonalidade(result.sintese_personalidade);
    }
    if (result.orientador_text) {
      setOrientadorText(result.orientador_text);
      return;
    }
    async function generateOrientador() {
      setLoadingOrientador(true);
      setErrorOrientador(null);
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate_orientador_text",
          { body: { session_id: result!.session_id } }
        );
        if (error || !data?.text) {
          console.error("Erro ao gerar orientador_text:", error);
          setErrorOrientador(
            "Não foi possível gerar a análise neste momento. Tenta recarregar a página."
          );
        } else {
          setOrientadorText(data.text);
          if (data.sintese_personalidade) {
            setSintesePersonalidade(data.sintese_personalidade);
          }
        }
      } catch (err) {
        console.error("Erro inesperado ao gerar orientador_text:", err);
        setErrorOrientador(
          "Não foi possível gerar a análise neste momento. Tenta recarregar a página."
        );
      } finally {
        setLoadingOrientador(false);
      }
    }
    generateOrientador();
  }, [result]);

  // Índice lateral: construído a partir das secções realmente presentes no DOM
  // (marcadas com data-idx-label) e destaque da secção visível ao rolar.
  useEffect(() => {
    if (loading || !result) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-idx-label]"));
    setIndice(els.map((el) => ({ id: el.id, label: el.dataset.idxLabel || "" })));
    if (els.length === 0) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visiveis = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visiveis[0]) setActiveSection((visiveis[0].target as HTMLElement).id);
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [loading, result]);

  async function loadResults() {
    setLoading(true);
    setError(null);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      // Saldo de créditos (para o header).
      const { data: bal } = await supabase.rpc("credit_balance", { p_user: user.id });
      setSaldoCreditos(typeof bal === "number" ? bal : 0);

      const [sessionsRes, riasecRes, intelRes, cnaefRes, cnaefN2Res] = await Promise.all([
        supabase
          .from("assessment_sessions")
          .select("id")
          .eq("student_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false })
          .limit(1),
        supabase.from("riasec_factors").select("cod, descricao"),
        supabase.from("intelligences").select("cod, descricao"),
        supabase.from("cnaef_areas").select("cod, nivel_1").eq("is_n1", true),
        supabase.from("cnaef_areas").select("cod, nivel_2").eq("is_n1", false),
      ]);

      if (riasecRes.data) {
        const map: Record<string, string> = {};
        riasecRes.data.forEach((r: { cod: number; descricao: string }) => {
          map[String(r.cod)] = r.descricao;
        });
        setRiasecDescriptions(map);
      }

      if (intelRes.data) {
        const map: Record<string, string> = {};
        intelRes.data.forEach((r: { cod: number; descricao: string }) => {
          map[String(r.cod)] = r.descricao;
        });
        setIntelDescriptions(map);
      }

      const areaNameMap: Record<string, string> = {};
      if (cnaefRes.data) {
        cnaefRes.data.forEach((r: { cod: number; nivel_1: string }) => {
          areaNameMap[String(r.cod)] = r.nivel_1;
        });
      }
      areaNameMapRef.current = areaNameMap;

      if (cnaefN2Res.data) {
        const n2Map: Record<string, string> = {};
        cnaefN2Res.data.forEach((r: { cod: number; nivel_2: string }) => {
          n2Map[String(r.cod)] = r.nivel_2;
        });
        setCnaefN2NameMap(n2Map);
      }

      if (sessionsRes.error) {
        console.error("Erro ao buscar sessões:", sessionsRes.error);
        setError("Não foi possível carregar os teus resultados. Tenta recarregar a página. Se persistir, contacta o suporte.");
        setLoading(false);
        return;
      }

      if (!sessionsRes.data || sessionsRes.data.length === 0) {
        setError("Nenhuma avaliação concluída encontrada.");
        setLoading(false);
        return;
      }

      const sessionId = sessionsRes.data[0].id;
      const { data: resultRow, error: resultError } = await supabase
        .from("results")
        .select("*")
        .eq("session_id", sessionId)
        .single();

      if (resultError) {
        console.error("Erro ao buscar resultados:", resultError);
        setError("Não foi possível carregar os teus resultados. Tenta recarregar a página. Se persistir, contacta o suporte.");
        setLoading(false);
        return;
      }

      if (!resultRow) {
        setError("Resultado ainda não calculado.");
        setLoading(false);
        return;
      }

      const data = resultRow as ResultData;

      if (Object.entries(data.riasec_scores ?? {}).length === 0) {
        console.error("riasec_scores vazio:", data.riasec_scores);
        setError("Não foi possível carregar os teus resultados. Tenta recarregar a página. Se persistir, contacta o suporte.");
        setLoading(false);
        return;
      }

      if (Object.entries(data.intel_scores ?? {}).length === 0) {
        console.error("intel_scores vazio:", data.intel_scores);
        setError("Não foi possível carregar os teus resultados. Tenta recarregar a página. Se persistir, contacta o suporte.");
        setLoading(false);
        return;
      }

      setResult(data);

      // Top 50 occupation escos for RPC calls
      const occScores = data.occupation_scores as Record<string, number>;
      const top50Escos = Object.keys(occScores).length > 0
        ? Object.entries(occScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 50)
            .map(([esco]) => esco)
        : [];

      // Fetch top 200 occupations: names, mymentor, cnaef_unico for links + per-area professions
      const top200Escos = Object.keys(occScores).length > 0
        ? Object.entries(occScores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 200)
            .map(([esco]) => esco)
        : [];

      if (top200Escos.length > 0) {
        const { data: occData, error: occError } = await supabase
          .from("occupations")
          .select("esco, prof, mymentor, cnaef_unico, isco_4dig, name_profissao")
          .in("esco", top200Escos);

        if (occError) {
          console.error("Erro ao buscar profissões:", occError);
        } else if (occData) {
          const nameMap: Record<string, string> = {};
          const mmMap: Record<string, string | null> = {};
          const detailMap: Record<string, OccDetail> = {};
          (occData as (OccupationRow & { mymentor?: string | null; cnaef_unico?: string | null; isco_4dig?: string | null; name_profissao?: string | null })[]).forEach((o) => {
            nameMap[o.esco] = o.prof;
            mmMap[o.esco] = o.mymentor ?? null;
            detailMap[o.esco] = {
              prof: o.prof,
              // Nome a mostrar ao aluno, vindo da base. Se estiver vazio, a profissão
              // foi marcada para retirar e não se mostra. Não afeta o cálculo.
              nameProfissao: (o.name_profissao && o.name_profissao.trim()) ? o.name_profissao.trim() : "",
              mymentor: o.mymentor ?? null,
              cnaef_unico: o.cnaef_unico ?? null,
              isco_4dig: o.isco_4dig ?? null,
              score: occScores[o.esco] ?? 0,
            };
          });
          setMymentorMap(mmMap);
          setOccDetailMap(detailMap);
          const top10Escos = top50Escos.slice(0, 10);
          setTopOccupations(
            top10Escos
              .filter((e) => nameMap[e])
              .map((e) => ({ name: nameMap[e], score: Math.round(occScores[e] * 100), mymentor: mmMap[e] }))
          );

          // Collect unique isco_4dig from top 5 profs per each of the 3 areas for training lookup
          const areaNameMapCurrent = areaNameMapRef.current;
          const top3Cods = Object.entries(data.cnaef_n1_scores ?? {})
            .filter(([c]) => !!areaNameMapCurrent[c])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 3)
            .map(([c]) => c);

          const iscoSet = new Set<string>();
          // Profissões sugeridas no 9.º ano: precisam das formações do próprio ISCO.
          for (const det9 of Object.values(data.cch_detailed ?? {}) as Array<{ profissoes?: { esco: string }[] }>) {
            for (const p of det9?.profissoes ?? []) {
              const isco = detailMap[p.esco]?.isco_4dig;
              if (isco) iscoSet.add(isco);
            }
          }
          for (const c of top3Cods) {
            const n1 = parseInt(c, 10);
            Object.values(detailMap)
              .filter((occ) => {
                if (!occ.cnaef_unico) return false;
                const n2 = parseInt(occ.cnaef_unico, 10);
                return !isNaN(n2) && Math.floor(n2 / 100) === n1;
              })
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .forEach((occ) => { if (occ.isco_4dig) iscoSet.add(occ.isco_4dig); });
          }

          console.log("[DEBUG] iscoSet:", [...iscoSet]);
          if (iscoSet.size > 0) {
            try {
              const { data: tiData, error: tiErr } = await supabase
                .from("training_iscos")
                .select("isco_4dig, trainings(name_search, qnq_label)")
                .in("isco_4dig", [...iscoSet]);

              console.log("[DEBUG] tiData count:", tiData?.length, "error:", tiErr);
              console.log("[DEBUG] tiData sample:", JSON.stringify(tiData?.slice(0, 3)));

              if (tiData) {
                const QNQ_MESTRADO = "Nível 7";
                const QNQ_LICENCIATURA = "Nível 6";
                const byIsco: Record<string, { name: string; qnq_label: string }[]> = {};
                for (const ti of tiData) {
                  const t = ti.trainings as { name_search: string; qnq_label: string } | null;
                  if (!t) continue;
                  if (!t.qnq_label?.includes("Nível 6") && !t.qnq_label?.includes("Nível 7")) continue;
                  if (!byIsco[ti.isco_4dig]) byIsco[ti.isco_4dig] = [];
                  byIsco[ti.isco_4dig].push({ name: t.name_search, qnq_label: t.qnq_label });
                }
                for (const isco of Object.keys(byIsco)) {
                  byIsco[isco].sort((a, b) => (b.qnq_label === QNQ_MESTRADO ? 1 : 0) - (a.qnq_label === QNQ_MESTRADO ? 1 : 0));
                }
                console.log("[DEBUG] byIsco keys:", Object.keys(byIsco).length);
                setTrainingsByIsco(byIsco);
              }
            } catch (tiErr) {
              console.error("Erro ao buscar formações por isco:", tiErr);
            }
          } else {
            console.log("[DEBUG] iscoSet vazio — isco_4dig null em todas as profissões");
          }
        }
      }

      // (removido) A RPC get_area_details não existe e o seu resultado nunca era
      // usado no ecrã — os detalhes por área vêm de cch_detailed. Chamada eliminada.
    } catch (err) {
      console.error("Erro inesperado ao carregar resultados:", err);
      setError("Não foi possível carregar os teus resultados. Tenta recarregar a página. Se persistir, contacta o suporte.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    if (!result) return;
    setRecalculating(true);
    try {
      const { error: fnError } = await supabase.functions.invoke("calculate_results", {
        body: { session_id: result.session_id, modo: "recalcular" },
      });
      if (fnError) {
        console.error("Erro ao recalcular:", fnError);
        alert("Erro ao recalcular resultados.");
      } else {
        setOrientadorText("");
        setErrorOrientador(null);
        await loadResults();
      }
    } finally {
      setRecalculating(false);
    }
  }

  // Desbloquear o relatório completo: gasta 1 crédito.
  async function handleUnlock() {
    if (!result) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("calculate_results", {
        body: { session_id: result.session_id, modo: "desbloquear" },
      });
      if (fnError || !data?.ok) {
        setUnlockError("Não foi possível desbloquear agora. Tenta novamente.");
        return;
      }
      if (data.necessita_credito) {
        setUnlockError("Não tens créditos suficientes para desbloquear o relatório completo.");
        return;
      }
      setOrientadorText("");
      setErrorOrientador(null);
      await loadResults();
    } finally {
      setUnlocking(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-[#94A3B8]">
          <RefreshCw className="w-8 h-8 animate-spin" />
          <p className="text-sm">A carregar resultados...</p>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-6">
          <p className="text-[#94A3B8] text-sm">
            {error ?? "Resultado indisponível."}
          </p>
          <div className="flex flex-col gap-2">
            <button
              onClick={loadResults}
              className="text-sm text-[#2BA88C] hover:underline"
            >
              Recarregar
            </button>
            <button
              onClick={() => navigate("/app")}
              className="text-sm text-[#94A3B8] hover:text-[#F1F5F9] transition-colors"
            >
              Voltar ao início
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sortedRiasec = Object.entries(result.riasec_scores).sort((a, b) => b[1] - a[1]);
  const topRiasec = sortedRiasec[0];
  const secondRiasec = sortedRiasec[1];

  // ─── RESULTADO SINTÉTICO (grátis) ────────────────────────────────────────
  // Só pontuações por dimensão. Sem profissões, cursos, disciplinas ou texto.
  // Não gravável. Mostra a antevisão e o botão para desbloquear o completo.
  const renderHeaderCompleto = () => (
    <header className="bg-[#0F172A] border-b border-[#334155] sticky top-0 z-50">
      <div className="h-16 px-4 sm:px-6 flex items-center justify-between">
        <button onClick={() => navigate("/app")} className="text-2xl font-bold text-white">POPOV</button>

        {/* Desktop */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-3">
            <span className="text-white text-sm font-medium">{profile?.full_name || "Estudante"}</span>
            <span className="text-xs text-[#94A3B8] bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1 whitespace-nowrap">
              Créditos disponíveis: {saldoCreditos ?? 0}
            </span>
          </div>
          <span className="w-px h-5 bg-[#334155]" />
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/app")} className="text-[#94A3B8] text-sm hover:text-white transition-colors">
              Os meus testes
            </button>
            <a href="/app/perfil" className="text-[#94A3B8] text-sm hover:text-white transition-colors">
              O meu perfil
            </a>
          </div>
          <span className="w-px h-5 bg-[#334155]" />
          <div className="flex items-center gap-3">
            {result && (
              <button
                onClick={handleRecalculate}
                disabled={recalculating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#94A3B8] border border-[#334155] hover:border-[#2BA88C] hover:text-[#2BA88C] transition-colors disabled:opacity-50"
                title="Recalcular resultados com os dados mais recentes"
              >
                <RefreshCw className={`w-3 h-3 ${recalculating ? "animate-spin" : ""}`} />
                {recalculating ? "A recalcular..." : "Recalcular"}
              </button>
            )}
            <button onClick={handleSignOut} className="px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors">
              Sair
            </button>
          </div>
        </div>

        {/* Mobile */}
        <div className="flex lg:hidden items-center gap-2">
          <span className="text-xs text-[#94A3B8] bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1 whitespace-nowrap">
            Créditos: {saldoCreditos ?? 0}
          </span>
          <button onClick={() => setMenuHeaderAberto((v) => !v)} aria-label="Menu" className="text-[#94A3B8] p-1">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Painel mobile do header */}
      {menuHeaderAberto && (
        <div className="lg:hidden border-t border-[#334155] px-4 py-3">
          <p className="text-white text-sm font-medium pb-2 border-b border-[#334155] mb-2">
            {profile?.full_name || "Estudante"}
          </p>
          <button onClick={() => navigate("/app")} className="block w-full text-left text-[#94A3B8] text-sm py-2">
            Os meus testes
          </button>
          <a href="/app/perfil" className="block w-full text-left text-[#94A3B8] text-sm py-2">
            O meu perfil
          </a>
          {result && (
            <button
              onClick={handleRecalculate}
              disabled={recalculating}
              className="block w-full text-left text-[#94A3B8] text-sm py-2 disabled:opacity-50"
            >
              {recalculating ? "A recalcular..." : "Recalcular"}
            </button>
          )}
          <button onClick={handleSignOut} className="block w-full text-left text-[#94A3B8] text-sm py-2">
            Sair
          </button>
        </div>
      )}
    </header>
  );

  const renderIndiceMobile = () => {
    if (indice.length === 0) return null;
    const atual = indice.find((it) => it.id === activeSection) ?? indice[0];
    return (
      <div className="lg:hidden sticky top-16 z-40 bg-[#0F172A] border-b border-[#334155] px-4 py-2">
        <button
          onClick={() => setSeccoesAberto((v) => !v)}
          className="w-full flex items-center justify-between border border-[#334155] rounded-lg px-3 py-2 bg-[#1E293B]"
        >
          <span className="text-sm text-[#F1F5F9]">Secção: {atual?.label}</span>
          <ChevronDown className={`w-4 h-4 text-[#2BA88C] transition-transform ${seccoesAberto ? "rotate-180" : ""}`} />
        </button>
        {seccoesAberto && (
          <div className="mt-2 border border-[#334155] rounded-lg overflow-hidden">
            {indice.map((it) => {
              const ativo = it.id === activeSection;
              return (
                <button
                  key={it.id}
                  onClick={() => {
                    document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    setSeccoesAberto(false);
                  }}
                  className={`block w-full text-left text-sm px-3 py-2 border-t border-[#1E293B] first:border-t-0 ${
                    ativo ? "text-[#2BA88C] bg-[rgba(43,168,140,0.10)]" : "text-[#94A3B8]"
                  }`}
                >
                  {it.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderIndice = () => {
    if (indice.length === 0) return null;
    return (
      <aside className="hidden lg:block w-60 shrink-0 border-r border-[#334155]">
        <div className="sticky top-20 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[#94A3B8] pb-2 mb-3 border-b border-[#334155]">
            Secções
          </h3>
          <nav className="relative">
            {/* linha vertical contínua atrás dos pontos */}
            <span className="absolute left-[5px] top-2 bottom-2 w-px bg-[#334155]" aria-hidden="true" />
            {indice.map((it) => {
              const ativo = activeSection === it.id;
              return (
                <button
                  key={it.id}
                  onClick={() =>
                    document.getElementById(it.id)?.scrollIntoView({ behavior: "smooth", block: "start" })
                  }
                  className="group relative flex items-center gap-3 w-full text-left py-1.5 pl-0"
                >
                  <span
                    className={`relative z-10 w-[11px] h-[11px] rounded-full border-2 shrink-0 transition-colors ${
                      ativo
                        ? "bg-[#2BA88C] border-[#2BA88C]"
                        : "bg-[#0F172A] border-[#334155] group-hover:border-[#2BA88C]"
                    }`}
                  />
                  <span
                    className={`text-sm transition-colors ${
                      ativo
                        ? "text-[#2BA88C] font-medium"
                        : "text-[#94A3B8] group-hover:text-white"
                    }`}
                  >
                    {it.label}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  };

  const secaoPersonalidade = (completo: boolean) => {
    const ps = result.personality_scores;
    if (!ps || Object.keys(ps).length === 0) return null;
    const ordenado = FATOR_ORDEM
      .filter((f) => ps[f])
      .map((f) => ({ f, ...ps[f] }))
      .sort((a, b) => b.media - a.media);
    if (ordenado.length === 0) return null;
    const forte = ordenado[0];

    if (!completo) {
      return (
        <section className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3">A tua personalidade</h2>
          <p className="text-sm text-[#94A3B8] mb-4">
            A tua dimensão mais forte é{" "}
            <span className="text-[#F1F5F9] font-medium">{FATOR_NOMES[forte.f]}</span> (
            {forte.banda.toLowerCase()}). A leitura dos cinco traços e a síntese personalizada abrem no
            relatório completo.
          </p>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-[#F1F5F9]">{FATOR_NOMES[forte.f]}</span>
            <span className="text-[#94A3B8]">{forte.banda}</span>
          </div>
          <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
            <div className="h-full bg-[#2BA88C]" style={{ width: `${forte.pct}%` }} />
          </div>
        </section>
      );
    }

    return (
      <section id="sec-personalidade" data-idx-label="Personalidade" className="bg-[#1E293B] rounded-xl overflow-hidden mt-6 scroll-mt-24">
        <div className="h-1.5 bg-[#2BA88C]" />
        <div className="p-8">
          <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">A tua personalidade</h2>
          <p className="text-base text-[#94A3B8] mb-6">
            Leitura de autoconhecimento (Big Five). Não substitui uma avaliação com baremos validados, e
            nenhum polo é "bom" ou "mau".
          </p>

          {ordenado.map((d) => (
            <div key={d.f} className="mb-5">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-[#F1F5F9] font-medium">{FATOR_NOMES[d.f]}</span>
                <span className="text-[#94A3B8]">
                  {d.media.toFixed(2)} · {d.banda}
                </span>
              </div>
              <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[#2BA88C]" style={{ width: `${d.pct}%` }} />
              </div>
              <p className="text-sm text-[#94A3B8] leading-relaxed">
                {PERS_DESCRICOES[d.f]?.[d.banda]}
                {d.f === "N" &&
                  " (Neste traço, um valor alto significa menos estabilidade emocional.)"}
              </p>
            </div>
          ))}

          {sintesePersonalidade && (
            <div className="mt-8 border-t border-[#334155] pt-6 max-w-4xl">
              <h3 className="text-lg font-semibold text-[#F1F5F9] mb-3">Síntese</h3>
              {sintesePersonalidade.split("\n\n").map((para, i) => (
                <p key={i} className="text-base text-[#F1F5F9] leading-relaxed mb-4">
                  {para}
                </p>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  };

  if (result.nivel === "sintetico") {
    const riasecRows = Object.entries(result.riasec_scores).sort((a, b) => Number(b[1]) - Number(a[1]));
    const intelRows = Object.entries(result.intel_scores).sort((a, b) => Number(b[1]) - Number(a[1]));
    const params = new URLSearchParams(window.location.search);
    const pediuDesbloquear = params.get("desbloquear") === "1";

    const Barra = ({ label, value }: { label: string; value: number }) => (
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-[#F1F5F9] break-words pr-2">{label}</span>
          <span className="text-[#94A3B8] shrink-0">{Math.round(value)}%</span>
        </div>
        <div className="w-full h-2 bg-[#334155] rounded-full overflow-hidden">
          <div className="h-full bg-[#2BA88C]" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-[#0F172A]">
        <header className="h-16 bg-[#0F172A] border-b border-[#334155] sticky top-0 z-50">
          <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-3">
            <button onClick={() => navigate("/app")} className="text-2xl font-bold text-white shrink-0">POPOV</button>
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <span className="text-xs text-[#94A3B8] bg-[#1E293B] border border-[#334155] rounded-full px-3 py-1 whitespace-nowrap">
                <span className="hidden sm:inline">Créditos disponíveis: </span>
                <span className="sm:hidden">Créditos: </span>
                {saldoCreditos ?? 0}
              </span>
              <button
                onClick={() => navigate("/app")}
                className="shrink-0 px-3 sm:px-4 py-2 bg-[#334155] text-white rounded-lg text-sm font-medium hover:bg-[#475569] transition-colors"
              >
                <span className="hidden sm:inline">Voltar ao painel</span>
                <span className="sm:hidden">Voltar</span>
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Resultado resumido</h1>
          <p className="text-sm text-[#94A3B8] mb-8">
            Este é o teu resultado gratuito, com a tua pontuação em cada dimensão. O relatório completo desbloqueia as áreas, as disciplinas, as profissões, os cursos e a orientação.
          </p>

          <section className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">Os teus interesses</h2>
            {riasecRows.map(([cod, val]) => (
              <Barra key={cod} label={RIASEC_NAMES[cod] ?? cod} value={Number(val)} />
            ))}
          </section>

          <section className="bg-[#1E293B] border border-[#334155] rounded-lg p-6 mb-6">
            <h2 className="text-lg font-semibold text-white mb-4">As tuas inteligências</h2>
            {intelRows.map(([cod, val]) => (
              <Barra key={cod} label={INTEL_NAMES[cod] ?? cod} value={Number(val)} />
            ))}
          </section>

          {secaoPersonalidade(false)}

          {/* Antevisão + desbloqueio */}
          <section className="bg-[#1E293B] border border-[#2BA88C] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-3">O que traz o relatório completo</h2>
            <ul className="text-sm text-[#F1F5F9] space-y-2 mb-5 list-disc pl-5">
              <li>As áreas que mais combinam contigo, explicadas.</li>
              <li>As disciplinas e o teu alinhamento com elas.</li>
              <li>Profissões reais ligadas a cada área.</li>
              <li>Cursos do Superior que abrem essas profissões.</li>
              <li>Uma orientação escrita a partir dos teus resultados.</li>
            </ul>
            {unlockError && <p className="text-red-400 text-sm mb-3">{unlockError}</p>}
            <button
              onClick={handleUnlock}
              disabled={unlocking}
              className="px-6 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors disabled:opacity-60"
            >
              {unlocking ? "A desbloquear..." : "Desbloquear relatório completo (1 crédito)"}
            </button>
            {pediuDesbloquear && !unlocking && !unlockError && (
              <p className="text-xs text-[#94A3B8] mt-3">
                Carrega no botão para usares 1 crédito e abrir o relatório completo.
              </p>
            )}
          </section>
        </main>
      </div>
    );
  }


  const strengths = Array.isArray(result.top_strengths) ? result.top_strengths : [];
  const challenges = Array.isArray(result.top_challenges) ? result.top_challenges : [];

  const top3Areas = Array.isArray(result.top3_areas) ? result.top3_areas : [];
  const cnaefN1Scores = result.cnaef_n1_scores ?? {};
  const cnaefScoreValues = Object.values(cnaefN1Scores).map(Number);
  const maxAreaScore = cnaefScoreValues.length > 0 ? Math.max(...cnaefScoreValues) : 1;

  // ─── Vista do 9.º ano (3.º ciclo): áreas do Secundário ───────────────────
  // O backend só preenche cch_area_scores para alunos do 3.º ciclo.
  const cch = result.cch_area_scores;
  const isNinthYear = !!cch && Object.keys(cch).length > 0;

  if (isNinthYear) {
    const cchScores = cch as Record<string, number>;
    const ordered = Object.entries(cchScores).sort((a, b) => b[1] - a[1]);
    const detailed = result.cch_detailed ?? {};

    // Via ensino profissional (só 9.º ano, quando o perfil o sinaliza)
    const viaProfissional = !!result.prof_via_profissional;
    const profAreas: Array<{ cod: string; nome: string }> = Array.isArray(result.prof_areas) ? result.prof_areas : [];
    const profDetailed: Record<string, { nome: string; cursos: Array<{ nome: string; profissoes: string[] }> }> =
      result.prof_detailed ?? {};

    // Dados do radar (teia) — 4 áreas CCH em ordem fixa (estável)
    const CCH_ORDER = ["CT", "CSE", "LH", "AV"];
    const radarData = CCH_ORDER.filter((code) => code in cchScores).map((code) => ({
      area: CCH_AREAS[code]?.nome ?? code,
      code,
      value: cchScores[code],
    }));

    // Alinhamento da inteligência: cor + rótulo
    const nivelMeta: Record<string, { label: string; color: string }> = {
      forte: { label: "perto", color: "#2BA88C" },
      medio: { label: "intermédio", color: "#F59E0B" },
      fraco: { label: "longe", color: "#EF4444" },
    };

    const renderCchTick = ({ x, y, payload }: { x: number; y: number; payload: { index: number } }) => {
      const entry = radarData[payload.index];
      if (!entry) return null;
      const W = 120;
      const H = 44;
      return (
        <foreignObject x={x - W / 2} y={y - H / 2} width={W} height={H} style={{ overflow: "visible" }}>
          <div
            style={{
              backgroundColor: "#0F172A",
              border: "1px solid #334155",
              borderRadius: 6,
              padding: "4px 6px",
              textAlign: "center",
              width: W,
              boxSizing: "border-box",
            }}
          >
            <p style={{ fontSize: 10, color: "#F1F5F9", lineHeight: 1.2, margin: 0, marginBottom: 2 }}>
              {entry.area}
            </p>
            <p style={{ fontSize: 11, color: "#2BA88C", fontWeight: 700, margin: 0, lineHeight: 1 }}>
              {entry.value}%
            </p>
          </div>
        </foreignObject>
      );
    };

    return (
      <div className="min-h-screen bg-[#0F172A]">
        {/* Header */}
        {renderHeaderCompleto()}

        <div className="flex">
          {renderIndice()}
          <div className="flex-1 min-w-0">
        {renderIndiceMobile()}
        <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
          {/* Hero */}
          <section className="rounded-2xl bg-[#1E293B] border border-[#334155] p-8 space-y-4">
            <p className="text-xs uppercase tracking-widest text-[#2BA88C] font-medium">
              O teu próximo passo
            </p>
            {viaProfissional ? (
              <>
                <p className="text-[#94A3B8] leading-relaxed">
                  Estás no 9.º ano e vais escolher o teu caminho no Secundário. Há duas vias
                  possíveis, ambas te dão o 12.º ano. Com base no que gostas e na forma como
                  aprendes, mostramos-te as duas.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
                    <p className="text-[10px] uppercase tracking-wide text-[#2BA88C] mb-1">Via 1</p>
                    <p className="text-[#F1F5F9] font-bold mb-1">Científico-Humanístico</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Mais teórico, virado para a universidade. Quatro áreas, a que mais combina
                      contigo é {CCH_AREAS[ordered[0][0]]?.nome ?? ordered[0][0]}.
                    </p>
                  </div>
                  <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
                    <p className="text-[10px] uppercase tracking-wide text-[#2BA88C] mb-1">Via 2</p>
                    <p className="text-[#F1F5F9] font-bold mb-1">Ensino profissional</p>
                    <p className="text-xs text-[#94A3B8] leading-relaxed">
                      Mais prático, ligado a uma profissão, com estágio. Também podes seguir para o
                      superior depois.
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-[#2BA88C] bg-[#2BA88C]/[0.08] p-3">
                  <p className="text-sm text-[#F1F5F9] leading-relaxed">
                    O ensino profissional foi indicado por também estar associado a teu perfil, por
                    ser mais prático e ligado a uma profissão.
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-[#94A3B8] leading-relaxed">
                  Estás no 9.º ano e a tua próxima escolha é a área do Secundário. Com base
                  no que gostas e na forma como aprendes, estas são as quatro áreas dos Cursos
                  Científico-Humanísticos pela ordem que mais combina contigo. Não é uma
                  decisão fechada, é um ponto de partida para explorares.
                </p>
                <div className="rounded-xl border border-[#334155] bg-[#0F172A] p-4">
                  <p className="text-[10px] uppercase tracking-wide text-[#2BA88C] mb-1">
                    A que mais combina contigo
                  </p>
                  <p className="text-[#F1F5F9] text-lg font-bold">
                    {CCH_AREAS[ordered[0][0]]?.nome ?? ordered[0][0]}
                  </p>
                </div>
              </>
            )}
          </section>

          {/* Personalidade */}
          {secaoPersonalidade(true)}

          {/* Interesses (RIASEC) */}
          <section id="sec9-interesses" data-idx-label="Interesses" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-2">
              <Star style={{ width: 28, height: 28, color: "#2BA88C", flexShrink: 0 }} />
              <h2 className="text-2xl font-bold text-[#F1F5F9]">Os teus interesses</h2>
            </div>
            <p className="text-sm text-[#94A3B8] mb-6">
              A forma como gostas de lidar com as coisas e com as pessoas, do que tens mais para o que tens menos.
            </p>
            {(() => {
              const ordenadoRia = Object.entries(result.riasec_scores).sort((a, b) => Number(b[1]) - Number(a[1]));
              const maxRia = Number(ordenadoRia[0]?.[1]) || 1;
              const dominantes = ordenadoRia.slice(0, 2);
              return (
                <>
                  <div className="space-y-3 mb-8">
                    {ordenadoRia.map(([cod, sc], i) => {
                      const rel = Math.max(12, Math.round((Number(sc) / maxRia) * 100));
                      const forte = i < 2;
                      return (
                        <div key={cod}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm" style={{ color: forte ? "#F1F5F9" : "#94A3B8" }}>
                              {RIASEC_NAMES[cod] ?? cod}
                            </span>
                            {i === 0 && <span className="text-xs text-[#2BA88C]">o que tens mais</span>}
                            {i === ordenadoRia.length - 1 && <span className="text-xs text-[#64748B]">o que tens menos</span>}
                          </div>
                          <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${rel}%`, backgroundColor: forte ? "#2BA88C" : "#5f7d76" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {dominantes.map(([cod]) => {
                      const Icon = RIASEC_ICONS[cod] ?? BookOpen;
                      return (
                        <div
                          key={cod}
                          className="rounded-lg p-6"
                          style={{ backgroundColor: "rgba(43,168,140,0.08)", border: "1px solid #2BA88C" }}
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Icon style={{ width: 24, height: 24, color: "#2BA88C", flexShrink: 0 }} />
                            <h3 className="text-lg font-bold text-[#F1F5F9]">{RIASEC_NAMES[cod] ?? cod}</h3>
                          </div>
                          <p className="text-sm text-[#F1F5F9] leading-relaxed">{RIASEC_INTERP[cod]}</p>
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </section>

          {/* As tuas inteligências (resultado do teste) */}
          <section id="sec9-inteligencias" data-idx-label="Inteligências" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-2">
              <Calculator style={{ width: 28, height: 28, color: "#2BA88C", flexShrink: 0 }} />
              <h2 className="text-2xl font-bold text-[#F1F5F9]">As tuas inteligências</h2>
            </div>
            <p className="text-sm text-[#94A3B8] mb-6">
              As formas como o teu cérebro trabalha melhor, do que tens mais para o que tens menos. As três em que tens mais estão explicadas em baixo.
            </p>
            {(() => {
              const ordenadoInt = Object.entries(result.intel_scores ?? {}).sort((a, b) => Number(b[1]) - Number(a[1]));
              const maxInt = Number(ordenadoInt[0]?.[1]) || 1;
              const dominantesInt = ordenadoInt.slice(0, 3);
              return (
                <>
                  <div className="space-y-3 mb-8">
                    {ordenadoInt.map(([cod, sc], i) => {
                      const rel = Math.max(12, Math.round((Number(sc) / maxInt) * 100));
                      const forte = i < 3;
                      return (
                        <div key={cod}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm" style={{ color: forte ? "#F1F5F9" : "#94A3B8" }}>
                              {INTEL_NAMES[cod] ?? cod}
                            </span>
                            {i === 0 && <span className="text-xs text-[#2BA88C]">o que tens mais</span>}
                            {i === ordenadoInt.length - 1 && <span className="text-xs text-[#64748B]">o que tens menos</span>}
                          </div>
                          <div className="h-2 bg-[#334155] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${rel}%`, backgroundColor: forte ? "#2BA88C" : "#5f7d76" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="divide-y divide-[#334155]">
                    {dominantesInt.map(([cod]) => {
                      const Icon = INTEL_ICONS[cod] ?? BookOpen;
                      return (
                        <div key={cod} className="py-5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon style={{ width: 22, height: 22, color: "#2BA88C", flexShrink: 0 }} />
                            <h3 className="text-lg font-bold text-[#F1F5F9]">{INTEL_NAMES[cod] ?? cod}</h3>
                          </div>
                          {intelDescriptions[cod] && (
                            <p className="text-sm text-[#F1F5F9] leading-relaxed">{intelDescriptions[cod]}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}
          </section>

          {/* Radar (teia) das áreas CCH */}
          <section className="bg-[#1E293B] rounded-xl p-8">
            <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 flex flex-col gap-6">
                <div className="rounded-lg p-6" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <h3 className="text-base font-bold text-[#F1F5F9] mb-3 uppercase tracking-wide">
                    As tuas áreas
                  </h3>
                  <p className="text-sm text-[#94A3B8] leading-relaxed">
                    Estas são as quatro áreas do Secundário, pela ordem que mais combina
                    contigo. Em baixo vês cada uma em detalhe: as disciplinas que a definem.
                  </p>
                </div>
                <div className="rounded-lg p-6" style={{ backgroundColor: "rgba(255,255,255,0.03)" }}>
                  <div className="space-y-2">
                    {ordered.map(([code], i) => (
                      <div
                        key={code}
                        className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex items-center gap-3"
                      >
                        <span className="text-base font-bold tabular-nums shrink-0" style={{ color: i === 0 ? "#2BA88C" : "#94A3B8" }}>
                          #{i + 1}
                        </span>
                        <span className="text-sm text-[#F1F5F9] leading-tight flex-1 min-w-0">
                          {CCH_AREAS[code]?.nome ?? code}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hidden lg:block lg:col-span-2">
                <ResponsiveContainer width="100%" height={460}>
                  <RadarChart data={radarData} outerRadius="70%" margin={{ top: 60, right: 100, bottom: 60, left: 100 }}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="area" tick={renderCchTick as any} />
                    <PolarRadiusAxis angle={90} domain={[0, 115]} tick={false} axisLine={false} />
                    <Radar
                      name="Afinidade"
                      dataKey="value"
                      stroke="#2BA88C"
                      strokeWidth={2}
                      fill="rgba(43, 168, 140, 0.35)"
                      dot={{ r: 4, fill: "#2BA88C", stroke: "#0F172A", strokeWidth: 2 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0F172A",
                        border: "1px solid #334155",
                        borderRadius: "8px",
                        fontSize: 12,
                        color: "#F1F5F9",
                      }}
                      formatter={(value: number, _n: string, props: any) => [`${value}%`, props.payload?.area ?? "Área"]}
                      labelFormatter={() => ""}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>


          {/* Detalhe por área */}
          <section id="sec9-areas" data-idx-label="Áreas" className="space-y-6 scroll-mt-24">
            {ordered.map(([code, score], i) => {
              const meta = CCH_AREAS[code];
              const det = detailed[code];
              const disciplinas = (det?.disciplinas ?? [])
                .slice()
                .sort((a, b) => (b.match !== a.match ? b.match - a.match : b.peso - a.peso));
              const isTop = i === 0;
              return (
                <div
                  key={code}
                  className="rounded-xl overflow-hidden"
                  style={{
                    backgroundColor: isTop ? "rgba(43,168,140,0.08)" : "#1E293B",
                    border: isTop ? "1px solid #2BA88C" : "1px solid #334155",
                  }}
                >
                  <div className="p-6 lg:p-8">
                    {/* Cabeçalho da área */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl font-bold tabular-nums shrink-0" style={{ color: isTop ? "#2BA88C" : "#94A3B8" }}>
                        #{i + 1}
                      </span>
                      <BookOpenCheck style={{ width: 28, height: 28, color: "#2BA88C", flexShrink: 0 }} />
                      <h2 className="text-xl font-bold text-[#F1F5F9]">
                        {meta?.nome ?? code}
                      </h2>
                    </div>
                    <p className="text-sm text-[#94A3B8] leading-relaxed mb-6">{meta?.desc}</p>

                    <div className="grid grid-cols-1">
                      {/* Disciplinas + alinhamento de inteligência */}
                      <div className="rounded-lg p-5" style={{ backgroundColor: "#0F172A", border: "1px solid #334155" }}>
                        <div className="flex items-center gap-2 mb-1">
                          <BookText style={{ width: 18, height: 18, color: "#2BA88C", flexShrink: 0 }} />
                          <span className="text-sm uppercase tracking-wider font-semibold text-[#F1F5F9]">
                            Disciplinas
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-3">
                          As disciplinas que mais pesam nesta área.
                        </p>
                        {disciplinas.length === 0 ? (
                          <p className="text-sm text-[#94A3B8]">Sem dados.</p>
                        ) : (
                          <ul className="space-y-2.5">
                            {disciplinas.map((d) => (
                              <li key={d.disciplina}>
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-sm text-[#F1F5F9] leading-tight min-w-0 flex-1 break-words">
                                    {d.disciplina}
                                  </span>
                                  <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "#2BA88C" }}>
                                    {d.match}%
                                  </span>
                                </div>
                                <div className="w-full h-1.5 bg-[#1E293B] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#2BA88C]" style={{ width: `${d.match}%` }} />
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          {/* Via ensino profissional — depois das áreas, só quando o perfil o sinaliza */}
          {viaProfissional && (
            <section id="sec9-profissional" data-idx-label="Ensino profissional" className="space-y-4 scroll-mt-24">
              {/* Disclaimer */}
              <div className="rounded-2xl bg-[#1E293B] border border-[#2BA88C] p-6">
                <p className="text-xs uppercase tracking-widest text-[#2BA88C] font-medium mb-2">
                  Também podes seguir por aqui
                </p>
                <p className="text-[#F1F5F9] leading-relaxed">
                  Além das áreas do Secundário, há uma via que pode encaixar contigo: o{" "}
                  <span className="font-semibold">ensino profissional</span>. É mais prático e ligado
                  a uma profissão, tem estágio e também te dá o 12.º ano.
                </p>
              </div>

              {/* Áreas do profissional */}
              <div className="bg-[#1E293B] rounded-xl p-8">
                <h2 className="text-2xl font-bold text-[#F1F5F9] mb-2">Áreas no ensino profissional</h2>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Pela ordem que mais combina contigo. Em cada uma, alguns cursos práticos — toca num
                  para veres as profissões a que leva.
                </p>
                <div className="space-y-4">
                  {profAreas.map((area, i) => {
                    const det = profDetailed[area.cod];
                    const cursos = det?.cursos ?? [];
                    return (
                      <div key={area.cod} className="rounded-xl border border-[#334155] bg-[#0F172A] p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="text-[#2BA88C] text-lg font-bold">#{i + 1}</span>
                          <span className="text-[#F1F5F9] text-lg font-bold">{area.nome}</span>
                        </div>
                        <div className="flex flex-col gap-2">
                          {cursos.map((c, j) => {
                            const aberto = profCursoSel?.area === area.cod && profCursoSel?.curso === c.nome;
                            return (
                              <div key={j}>
                                <button
                                  onClick={() =>
                                    setProfCursoSel(aberto ? null : { area: area.cod, curso: c.nome })
                                  }
                                  className="w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
                                  style={{
                                    backgroundColor: aberto ? "#1E293B" : "#0F172A",
                                    borderColor: aberto ? "#2BA88C" : "#334155",
                                  }}
                                >
                                  <span className="text-sm text-[#F1F5F9]">{c.nome}</span>
                                  <span className="text-[#2BA88C] text-lg leading-none">{aberto ? "−" : "+"}</span>
                                </button>
                                {aberto && (
                                  <div className="mt-2 mb-1 px-4 py-3 rounded-lg bg-[#1E293B] border border-[#334155]">
                                    <p className="text-xs uppercase tracking-wide text-[#94A3B8] mb-2">
                                      Profissões a que leva
                                    </p>
                                    {c.profissoes.length > 0 ? (
                                      <div className="flex flex-col gap-1">
                                        {c.profissoes.map((p, k) => (
                                          <span key={k} className="text-sm text-[#F1F5F9]">· {p}</span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-sm text-[#64748B]">Sem profissões associadas.</span>
                                    )}
                                    <p className="text-xs text-[#64748B] mt-3">Nível 4 · ensino profissional</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {cursos.length === 0 && (
                            <span className="text-sm text-[#64748B]">Sem cursos nesta área.</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {/* Profissões sugeridas (cartões, fora das áreas) */}
          {(() => {
            const detalhe = result.cch_detailed ?? {};
            // 1. Reunir cada profissão (por esco) com a sua melhor afinidade e área.
            const mapProf = new Map<string, { esco: string; prof: string; mymentor: string | null; match: number; area: string; cursos: { nome: string }[] }>();
            ordered.forEach(([code]) => {
              const det = detalhe[code];
              const areaNome = CCH_AREAS[code]?.nome ?? code;
              (det?.profissoes ?? []).forEach((p) => {
                const ex = mapProf.get(p.esco);
                if (!ex || p.match > ex.match) {
                  // Formações da própria profissão, pelo ISCO dela (a filha real),
                  // e não as da área, que serviam para todas por igual.
                  const isco = occDetailMap[p.esco]?.isco_4dig ?? null;
                  // Uma formação pode existir em licenciatura e em mestrado com o
                  // mesmo nome. Mostra-se uma vez só.
                  const vistos = new Set<string>();
                  const cursos: { nome: string }[] = [];
                  for (const c of (isco ? (trainingsByIsco[isco] ?? []) : [])) {
                    const nome = c.name.trim();
                    if (nome && !vistos.has(nome)) { vistos.add(nome); cursos.push({ nome }); }
                  }
                  mapProf.set(p.esco, { esco: p.esco, prof: p.prof, mymentor: p.mymentor, match: p.match, area: areaNome, cursos });
                }
              });
            });
            // 2. Agrupar pela mãe (name_profissao). As profissões sem mãe (retiradas)
            //    são saltadas. O cálculo não muda; isto é só apresentação.
            const maes = new Map<string, {
              mae: string; match: number; area: string; mymentor: string | null;
              filhas: { esco: string; prof: string; match: number; mymentor: string | null; cursos: { nome: string }[] }[];
            }>();
            for (const p of mapProf.values()) {
              const det = occDetailMap[p.esco];
              const mae = det?.nameProfissao;
              if (!mae) continue; // sem mãe = profissão retirada, não se mostra
              const g = maes.get(mae);
              const filha = { esco: p.esco, prof: p.prof, match: p.match, mymentor: p.mymentor, cursos: p.cursos };
              if (!g) {
                maes.set(mae, { mae, match: p.match, area: p.area, mymentor: p.mymentor, filhas: [filha] });
              } else {
                g.filhas.push(filha);
                if (p.match > g.match) { g.match = p.match; g.area = p.area; g.mymentor = p.mymentor; }
              }
            }
            // 3. Ordenar mães por afinidade, mostrar as 5 primeiras; filhas ordenadas.
            const grupos = [...maes.values()]
              .map((g) => ({ ...g, filhas: g.filhas.sort((a, b) => b.match - a.match).slice(0, 3) }))
              .sort((a, b) => b.match - a.match)
              .slice(0, 5);
            if (grupos.length === 0) return null;
            const maxMatch = grupos[0].match || 1;
            return (
              <section id="sec9-profissoes" data-idx-label="Profissões" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase style={{ width: 28, height: 28, color: "#2BA88C", flexShrink: 0 }} />
                  <h2 className="text-2xl font-bold text-[#F1F5F9]">Profissões que podem ser para ti</h2>
                </div>
                <p className="text-sm text-[#94A3B8] mb-6">
                  Uma seleção de caminhos que combinam contigo. Toca numa para saber como se lá chega e onde estudar.
                </p>
                <div className="flex flex-col gap-3">
                  {grupos.map((g) => {
                    const rel = g.match / maxMatch;
                    const dot = rel >= 0.8 ? 11 : rel >= 0.55 ? 9 : 7;
                    const op = rel >= 0.8 ? 1 : rel >= 0.55 ? 0.75 : 0.5;
                    return (
                      <button
                        key={g.mae}
                        onClick={() => setProfSel9({ mae: g.mae, area: g.area, mymentor: g.mymentor, filhas: g.filhas })}
                        className="flex items-center gap-3 bg-[#0F172A] border border-[#334155] hover:border-[#2BA88C] rounded-xl p-4 text-left transition-colors"
                      >
                        <span
                          className="rounded-full bg-[#2BA88C] shrink-0"
                          style={{ width: dot, height: dot, opacity: op }}
                        />
                        <span className="text-sm text-[#F1F5F9] flex-1 min-w-0">{g.mae}</span>
                        <ChevronRight style={{ width: 18, height: 18, color: "#2BA88C", flexShrink: 0 }} />
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })()}

          {/* As tuas inteligências */}
          {/* A tua recomendação */}
          <section id="sec9-recomendacao" data-idx-label="Recomendação" className="bg-[#1E293B] rounded-xl overflow-hidden scroll-mt-24">
            <div className="h-1.5 bg-[#2BA88C]" />
            <div className="p-8">
              <div className="flex items-center gap-3 mb-3">
                <Star style={{ width: 32, height: 32, color: "#2BA88C", flexShrink: 0 }} />
                <h2 className="text-2xl font-bold text-[#F1F5F9]">A tua recomendação</h2>
              </div>
              <p className="text-sm text-[#94A3B8] mb-8">
                Análise personalizada sobre a escolha da tua área do Secundário.
              </p>

              {loadingOrientador && (
                <div className="flex items-center gap-3 py-8">
                  <Loader2 style={{ width: 32, height: 32, color: "#2BA88C" }} className="animate-spin" />
                  <span className="text-sm text-[#94A3B8]">A gerar análise personalizada...</span>
                </div>
              )}

              {errorOrientador && !loadingOrientador && (
                <div className="flex items-center gap-3 py-4">
                  <AlertCircle style={{ width: 24, height: 24, color: "#EF4444", flexShrink: 0 }} />
                  <span className="text-sm text-[#94A3B8]">{errorOrientador}</span>
                </div>
              )}

              {orientadorText && !loadingOrientador && (
                <div className="max-w-4xl">
                  {orientadorText.split("\n\n").map((para, idx) => (
                    <p key={idx} className="text-base text-[#F1F5F9] leading-relaxed mb-4">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Como estudas melhor */}
          <section id="sec9-estudo" data-idx-label="Como estudas melhor" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
            <div className="flex items-center gap-3 mb-2">
              <Calculator style={{ width: 28, height: 28, color: "#2BA88C", flexShrink: 0 }} />
              <h2 className="text-2xl font-bold text-[#F1F5F9]">Como estudas melhor</h2>
            </div>
            <p className="text-sm text-[#94A3B8] mb-6">
              As tuas três formas mais fortes dão-te pistas para estudares de um jeito que resulta melhor contigo.
            </p>
            {(() => {
              const dominantesInt = Object.entries(result.intel_scores ?? {})
                .sort((a, b) => Number(b[1]) - Number(a[1]))
                .slice(0, 3);
              return (
                <div className="divide-y divide-[#334155]">
                  {dominantesInt.map(([cod]) => {
                    const info = ESTUDO_POR_INTEL[cod];
                    const Icon = INTEL_ICONS[cod] ?? BookOpen;
                    if (!info) return null;
                    return (
                      <div key={cod} className="py-5 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon style={{ width: 22, height: 22, color: "#2BA88C", flexShrink: 0 }} />
                          <h3 className="text-lg font-bold text-[#F1F5F9]">{INTEL_NAMES[cod] ?? cod}</h3>
                        </div>
                        <p className="text-sm text-[#F1F5F9] mb-2">
                          Como tens mais em {(INTEL_NAMES[cod] ?? cod).toLowerCase()}, {info.como.charAt(0).toLowerCase() + info.como.slice(1)} Experimenta:
                        </p>
                        <ul className="space-y-1 mb-2">
                          {info.dicas.map((d, i) => (
                            <li key={i} className="text-sm text-[#94A3B8]">· {d}</li>
                          ))}
                        </ul>
                        <p className="text-xs text-[#94A3B8] italic">{info.livres}</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </section>

          <p className="text-xs text-[#94A3B8] leading-relaxed">
            Estas áreas foram escolhidas cruzando o que combina contigo com as
            disciplinas que abrem caminho a cada uma no Secundário.
          </p>
        </main>
          </div>
        </div>

        {/* Painel da profissão selecionada (mãe + filhas) */}
        {profSel9 && (() => {
          const filhas = profSel9.filhas;
          // Só se salta a lista de filhas quando o nome mostrado já é a própria
          // profissão. Se for um nome que agrupa, o aluno tem de ver qual é.
          const umaFilha = filhas.length === 1 && filhas[0].prof.trim() === profSel9.mae.trim();
          // Filha em detalhe: a selecionada; se só houver uma, essa, já aberta.
          const filhaAtiva = filhas.length === 1
            ? filhas[0]
            : (filhas.find((f) => f.esco === profFilhaSel) ?? null);
          const fecha = () => { setProfSel9(null); setProfFilhaSel(null); };
          return (
            <div
              className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/60 p-4"
              onClick={fecha}
            >
              <div
                className="bg-[#1E293B] border border-[#334155] rounded-2xl p-6 w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <h3 className="text-lg font-bold text-[#F1F5F9]">{profSel9.mae}</h3>
                  <button onClick={fecha} aria-label="Fechar" className="text-[#94A3B8] text-xl leading-none shrink-0">✕</button>
                </div>

                {/* Se o nome mostrado agrupa, dizer qual é a profissão real */}
                {!umaFilha && (
                  <div className="mb-4">
                    <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2">
                      {filhas.length === 1 ? "A que mais combina contigo" : "As que mais combinam contigo"}
                    </p>
                    <div className="flex flex-col gap-2">
                      {filhas.map((f) => {
                        const aberta = f.esco === filhaAtiva?.esco;
                        const unica = filhas.length === 1;
                        if (unica) {
                          return (
                            <div
                              key={f.esco}
                              className="rounded-lg border px-4 py-3"
                              style={{ backgroundColor: "rgba(43,168,140,0.06)", borderColor: "#2BA88C" }}
                            >
                              <span className="text-sm text-[#F1F5F9]">{f.prof}</span>
                            </div>
                          );
                        }
                        return (
                          <button
                            key={f.esco}
                            onClick={() => setProfFilhaSel(aberta ? null : f.esco)}
                            className="flex items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors"
                            style={{
                              backgroundColor: aberta ? "rgba(43,168,140,0.06)" : "#0F172A",
                              borderColor: aberta ? "#2BA88C" : "#334155",
                            }}
                          >
                            <span className="text-sm text-[#F1F5F9]">{f.prof}</span>
                            <ChevronRight style={{ width: 16, height: 16, color: "#2BA88C" }} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Detalhe da filha ativa (chega-se por aqui + formações + MyMentor) */}
                {filhaAtiva && (
                  <>
                    <div className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 mb-4">
                      <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-1">Chega-se por aqui</p>
                      <p className="text-sm text-[#F1F5F9]">{profSel9.area}</p>
                    </div>
                    {filhaAtiva.cursos.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-2">Formações sugeridas</p>
                        <div className="space-y-1">
                          {filhaAtiva.cursos.slice(0, 5).map((c, i) => (
                            <p key={i} className="text-sm text-[#F1F5F9]">· {c.nome}</p>
                          ))}
                        </div>
                      </div>
                    )}
                    {buildMymentorUrl(filhaAtiva.mymentor) && (
                      <a
                        href={buildMymentorUrl(filhaAtiva.mymentor)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 text-[#2BA88C] bg-[rgba(43,168,140,0.1)] border border-[#2BA88C] rounded-lg py-3 text-sm font-medium hover:bg-[rgba(43,168,140,0.18)] transition-colors"
                      >
                        <ExternalLink style={{ width: 16, height: 16 }} /> Ver no MyMentor
                      </a>
                    )}
                  </>
                )}

                {/* Mãe com várias filhas mas nenhuma escolhida ainda */}
                {!umaFilha && !filhaAtiva && (
                  <p className="text-sm text-[#64748B]">Escolhe uma das profissões acima para veres como se lá chega.</p>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
        {renderHeaderCompleto()}

      <div className="flex">
        {renderIndice()}
        <div className="flex-1 min-w-0">
      {renderIndiceMobile()}
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* Hero */}
        <section className="rounded-2xl bg-[#1E293B] border border-[#334155] p-8 space-y-2">
          <p className="text-xs uppercase tracking-widest text-[#94A3B8] font-medium">
            O teu perfil vocacional
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-[#F1F5F9]">
            {RIASEC_NAMES[topRiasec[0]] ?? topRiasec[0]}
            {secondRiasec && (
              <span className="text-[#94A3B8]">
                {" "}+ {RIASEC_NAMES[secondRiasec[0]] ?? secondRiasec[0]}
              </span>
            )}
          </h1>
          {top3Areas.length > 0 && (
            <p className="text-[#94A3B8] text-sm pt-1">
              Áreas formativas com maior afinidade:{" "}
              <span className="text-[#F1F5F9]">
                {top3Areas
                  .map((cod) => areaNameMapRef.current[String(cod)] ?? String(cod))
                  .join(" | ")}
              </span>
            </p>
          )}
        </section>

        {/* RIASEC */}
        <section id="sec-interesses" data-idx-label="Interesses" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-[#94A3B8] mb-6">
            Perfil de interesses RIASEC
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-6">

            {/* Coluna esquerda — barras */}
            <div className="lg:col-span-2 flex flex-col gap-2">
              {sortedRiasec.map(([cod, score], idx) => (
                <div key={cod} className="h-20 flex flex-col justify-center">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-[#F1F5F9] font-medium">{RIASEC_NAMES[cod] ?? cod}</span>
                    <span className="text-[#F1F5F9] font-bold tabular-nums">{score}%</span>
                  </div>
                  <div className="h-7 bg-[#334155] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${score}%`,
                        backgroundColor: RIASEC_BAR_COLORS[idx] ?? "#2BA88C",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Coluna direita — cards descritivos */}
            <div className="lg:col-span-3 flex flex-col gap-2">
              {sortedRiasec.map(([cod, _score], idx) => {
                const Icon = RIASEC_ICONS[cod] ?? BookOpen;
                const isDominant = idx === 0;
                return (
                  <div
                    key={cod}
                    className="h-20 flex items-center gap-4 rounded-lg px-4"
                    style={
                      isDominant
                        ? {
                            backgroundColor: "rgba(43, 168, 140, 0.15)",
                            border: "2px solid #2BA88C",
                          }
                        : {
                            backgroundColor: "#0F172A",
                            border: "1px solid #334155",
                          }
                    }
                  >
                    <Icon
                      style={{ width: 28, height: 28, color: "#F1F5F9", flexShrink: 0 }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#F1F5F9] leading-tight mb-0.5">
                        {RIASEC_NAMES[cod] ?? cod}
                      </p>
                      {riasecDescriptions[cod] && (
                        <p
                          className="text-xs text-[#94A3B8] leading-snug"
                          style={{
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {riasecDescriptions[cod]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Inteligências — Pontos Fortes e Desafios */}
        <section id="sec-inteligencias" data-idx-label="Pontos fortes" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">

            {/* Coluna esquerda — títulos descritivos */}
            <div className="lg:col-span-3 grid grid-rows-2 gap-4">
              <div className="h-48 flex flex-col justify-start overflow-hidden">
                <h3 className="text-base font-bold text-[#2BA88C] uppercase tracking-wider mb-3">
                  Os teus pontos fortes
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Estas são as áreas em que te destacas. São inerentes à tua personalidade e brilham sem esforço. Procurar uma profissão alinhada com elas vai ajudar-te a encontrar a tua vocação.
                </p>
              </div>
              <div className="h-48 flex flex-col justify-start overflow-hidden">
                <h3 className="text-base font-bold text-[#EF4444] uppercase tracking-wider mb-3">
                  Os teus desafios pessoais
                </h3>
                <p className="text-xs text-[#94A3B8] leading-relaxed">
                  Estas são as áreas com as quais te identificas menos. Ter áreas em que não te destacas não é algo negativo — conhecê-las pode ser uma oportunidade para identificar os teus pontos a melhorar.
                </p>
              </div>
            </div>

            {/* Coluna direita — grid 3×2 de cards */}
            <div className="lg:col-span-7">

              {/* Linha 1 — Pontos Fortes */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {strengths.map((cod) => {
                  const key = String(cod);
                  const Icon = INTEL_ICONS[key] ?? BookOpen;
                  const imgUrl = INTEL_IMAGES[key];
                  return (
                    <div
                      key={key}
                      className="relative h-48 rounded-lg overflow-hidden"
                      style={
                        imgUrl
                          ? { backgroundImage: `url(${imgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : { backgroundColor: "#0F172A" }
                      }
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: "rgba(43, 168, 140, 0.75)" }} />
                      <div className="relative z-10 h-full flex flex-col justify-end p-5">
                        <Icon style={{ width: 24, height: 24, color: "#fff", marginBottom: 8 }} />
                        <p className="text-lg font-bold text-white leading-tight mb-1">
                          {INTEL_NAMES[key] ?? key}
                        </p>
                        {intelDescriptions[key] && (
                          <p className="text-xs text-white leading-relaxed" style={{ opacity: 0.9 }}>
                            {intelDescriptions[key]}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Linha 2 — Desafios Pessoais */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
                {challenges.map((cod) => {
                  const key = String(cod);
                  const Icon = INTEL_ICONS[key] ?? BookOpen;
                  const imgUrl = INTEL_IMAGES[key];
                  return (
                    <div
                      key={key}
                      className="relative h-48 rounded-lg overflow-hidden"
                      style={
                        imgUrl
                          ? { backgroundImage: `url(${imgUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                          : { backgroundColor: "#0F172A" }
                      }
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: "rgba(239, 68, 68, 0.75)" }} />
                      <div className="relative z-10 h-full flex flex-col justify-end p-5">
                        <Icon style={{ width: 24, height: 24, color: "#fff", marginBottom: 8 }} />
                        <p className="text-lg font-bold text-white leading-tight mb-1">
                          {INTEL_NAMES[key] ?? key}
                        </p>
                        {intelDescriptions[key] && (
                          <p className="text-xs text-white leading-relaxed" style={{ opacity: 0.9 }}>
                            {intelDescriptions[key]}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          </div>
        </section>

        {/* Itinerários Profissionais */}
        {Object.keys(areaNameMapRef.current).length > 0 && (() => {
          const radarData = Object.entries(areaNameMapRef.current).map(([cod, name]) => ({
            area: name ?? cod,
            cod,
            value: Math.round((Number(cnaefN1Scores[cod] ?? 0) / maxAreaScore) * 100),
          }));

          const renderRadarTick = ({ x, y, payload }: { x: number; y: number; payload: { index: number } }) => {
            const entry = radarData[payload.index];
            if (!entry) return null;
            const Icon = CNAEF_ICONS[entry.cod] ?? BookOpen;
            const W = 110;
            const H = 52;
            return (
              <foreignObject x={x - W / 2} y={y - H / 2} width={W} height={H} style={{ overflow: "visible" }}>
                <div
                  style={{
                    backgroundColor: "#0F172A",
                    border: "1px solid #334155",
                    borderRadius: 6,
                    padding: "4px 6px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 5,
                    width: W,
                    boxSizing: "border-box",
                  }}
                >
                  <Icon style={{ width: 12, height: 12, color: "#94A3B8", flexShrink: 0, marginTop: 2 }} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 9, color: "#F1F5F9", lineHeight: 1.3, margin: 0, marginBottom: 2, wordBreak: "break-word" }}>
                      {entry.area}
                    </p>
                    <p style={{ fontSize: 10, color: "#2BA88C", fontWeight: 700, margin: 0, lineHeight: 1 }}>
                      {entry.value}%
                    </p>
                  </div>
                </div>
              </foreignObject>
            );
          };

          return (
            <section id="sec-itinerarios" data-idx-label="Itinerários" className="bg-[#1E293B] rounded-xl p-8 scroll-mt-24">
              <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8">

                {/* Coluna esquerda */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                  <div className="rounded-lg p-6" style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                    <h3 className="text-base font-bold text-[#F1F5F9] mb-3 uppercase tracking-wide">
                      Itinerários Profissionais
                    </h3>
                    <p className="text-sm text-[#94A3B8] leading-relaxed mb-3">
                      Neste gráfico estão marcados os itinerários formativos que mais combinam com o teu perfil, segundo as tuas aptidões, interesses e motivações.
                    </p>
                    <p className="text-sm text-[#94A3B8] leading-relaxed">
                      Revê com atenção — é aqui que podes encontrar o teu caminho. Nas próximas secções vamos ver cada um deles em detalhe.
                    </p>
                  </div>

                  <div className="rounded-lg p-6" style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                    <h4 className="text-xs uppercase tracking-wider text-[#2BA88C] font-semibold mb-4">
                      Itinerários Destacados
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(cnaefN1Scores)
                        .filter(([cod]) => !!areaNameMapRef.current[cod])
                        .sort((a, b) => Number(b[1]) - Number(a[1]))
                        .slice(0, 3)
                        .map(([cod, score]) => {
                          const name = areaNameMapRef.current[cod];
                          const pct = Math.round((Number(score) / maxAreaScore) * 100);
                          const Icon = CNAEF_ICONS[cod] ?? BookOpen;
                          return (
                            <div
                              key={cod}
                              className="bg-[#0F172A] border border-[#334155] rounded-lg p-3 flex items-center gap-3"
                            >
                              <Icon className="w-5 h-5 text-[#94A3B8] shrink-0" />
                              <span className="text-sm text-[#F1F5F9] leading-tight flex-1">{name}</span>
                              <span className="text-base text-[#2BA88C] font-bold tabular-nums shrink-0">
                                {pct}%
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Coluna direita — Radar */}
                <div className="hidden lg:block lg:col-span-2">
                  <ResponsiveContainer width="100%" height={600}>
                    <RadarChart
                      data={radarData}
                      outerRadius="80%"
                      margin={{ top: 60, right: 120, bottom: 60, left: 120 }}
                    >
                      <PolarGrid stroke="#334155" />
                      <PolarAngleAxis
                        dataKey="area"
                        tick={renderRadarTick as any}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        name="Afinidade"
                        dataKey="value"
                        stroke="#2BA88C"
                        strokeWidth={2}
                        fill="rgba(43, 168, 140, 0.35)"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0F172A",
                          border: "1px solid #334155",
                          borderRadius: "8px",
                          fontSize: 12,
                          color: "#F1F5F9",
                        }}
                        formatter={(value: number, _name: string, props: any) => [
                          `${value}%`,
                          props.payload?.area ?? "Área",
                        ]}
                        labelFormatter={() => ""}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Profissões */}
        {topOccupations.length > 0 && (
          <section id="sec-profissoes" data-idx-label="Profissões" className="space-y-4 scroll-mt-24">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-[#94A3B8]">
              Profissões com maior afinidade
            </h2>
            <p className="text-sm italic text-[#94A3B8] mb-3">
              Clica em cada profissão para saberes mais.
            </p>
            <div className="rounded-xl border border-[#334155] overflow-hidden">
              {topOccupations.map((occ, i) => {
                const url = buildMymentorUrl(occ.mymentor);
                const Row = url ? "a" : "div";
                return (
                  <Row
                    key={i}
                    {...(url ? { href: url, target: "_blank", rel: "noopener noreferrer" } : {})}
                    className={`group flex items-center justify-between px-5 py-3 bg-[#1E293B] hover:bg-[#27364a] transition-colors duration-150 cursor-pointer ${
                      i < topOccupations.length - 1 ? "border-b border-[#334155]" : ""
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#94A3B8] tabular-nums w-5 text-right">
                        {i + 1}
                      </span>
                      <span className="text-sm text-[#F1F5F9]">{occ.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-[#334155] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#2BA88C]"
                          style={{ width: `${occ.score}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#94A3B8] tabular-nums w-8 text-right">
                        {occ.score}%
                      </span>
                      {url && (
                        <ExternalLink
                          style={{ width: 16, height: 16, color: "#2BA88C", flexShrink: 0 }}
                          className="group-hover:text-[#F1F5F9] group-hover:scale-110 transition-all duration-150"
                        />
                      )}
                    </div>
                  </Row>
                );
              })}
            </div>
          </section>
        )}

        {topOccupations.length === 0 && (
          <section className="rounded-xl border border-[#334155] bg-[#1E293B] p-6 text-center">
            <p className="text-sm text-[#94A3B8]">
              As profissões serão mostradas depois de o administrador importar os dados das profissões.
            </p>
          </section>
        )}

        {/* Detalhe das 3 áreas de afinidade */}
        {Object.keys(areaNameMapRef.current).length > 0 && (() => {
          const derivedTop3 = Object.entries(cnaefN1Scores)
            .filter(([cod]) => !!areaNameMapRef.current[cod])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 3);

          if (derivedTop3.length === 0) return null;

          return (
            <section id="sec-areas" data-idx-label="Áreas" className="space-y-16 scroll-mt-24">
              {derivedTop3.map(([cod]) => {
                const Icon = CNAEF_ICONS[cod] ?? BookOpen;
                const areaName = areaNameMapRef.current[cod];
                const description = AREA_DESCRIPTIONS[cod];
                const imgUrl = AREA_IMAGES[cod];

                // N2 subareas for this N1 block
                // Deduplicate N2 scores (keep max per code), filter to this N1, named only
                const n2Raw: Record<string, number> = {};
                for (const [key, score] of Object.entries(result.cnaef_n2_scores ?? {})) {
                  const n2 = parseInt(key, 10);
                  if (isNaN(n2)) continue;
                  if (Math.floor(n2 / 100) !== parseInt(cod, 10)) continue;
                  if (!cnaefN2NameMap[key]) continue;
                  n2Raw[key] = Math.max(n2Raw[key] ?? 0, Number(score));
                }
                const n2MaxScore = Math.max(...Object.values(n2Raw), 0);
                const n2ForBlock = Object.entries(n2Raw)
                  .sort((a, b) => b[1] - a[1])
                  .map(([key, score]) => ({
                    name: cnaefN2NameMap[key],
                    pct: n2MaxScore > 0 ? Math.round((score / n2MaxScore) * 100) : 0,
                  }));

                // Top 5 professions for this N1 block from occDetailMap
                const profsForBlock = Object.entries(occDetailMap)
                  .filter(([, occ]) => {
                    if (!occ.cnaef_unico) return false;
                    const n2 = parseInt(occ.cnaef_unico, 10);
                    return !isNaN(n2) && Math.floor(n2 / 100) === parseInt(cod, 10);
                  })
                  .sort((a, b) => b[1].score - a[1].score)
                  .slice(0, 5);

                return (
                  <div key={cod}>
                    {/* Cabeçalho do bloco */}
                    <p className="text-xs uppercase tracking-wider text-[#94A3B8] mb-1">
                      Teu itinerário
                    </p>
                    <div className="flex items-center gap-3 mb-3">
                      <Icon style={{ width: 32, height: 32, color: "#2BA88C", flexShrink: 0 }} />
                      <h2 className="text-2xl font-bold text-[#F1F5F9]">{areaName}</h2>
                    </div>


                    {/* Grid 3 colunas */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                      {/* Coluna 1 — Descrição + imagem */}
                      <div className="flex flex-col gap-4">
                        {description && (
                          <p className="text-sm text-[#F1F5F9] leading-relaxed">{description}</p>
                        )}
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={areaName}
                            className="w-full h-48 rounded-lg object-cover"
                          />
                        )}
                      </div>

                      {/* Coluna 2 — Profissões relacionadas */}
                      <div
                        className="rounded-lg p-5"
                        style={{ backgroundColor: "#0F172A", border: "1px solid #334155" }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Briefcase style={{ width: 20, height: 20, color: "#2BA88C", flexShrink: 0 }} />
                          <span className="text-sm uppercase tracking-wider font-semibold text-[#F1F5F9]">
                            Profissões relacionadas
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-1">
                          Estas são algumas profissões que existem atualmente nesta área.
                        </p>
                        <p className="text-xs italic text-[#94A3B8] mb-3">
                          Clica em cada profissão para saberes mais.
                        </p>
                        {profsForBlock.length > 0 ? (
                          <ul className="space-y-2">
                            {profsForBlock.map(([esco, occ]) => {
                              const url = buildMymentorUrl(occ.mymentor);
                              const scorePct = Math.round(occ.score * 100);
                              return (
                                <li key={esco} className="flex items-center justify-between gap-2">
                                  {url ? (
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="group inline-flex items-center gap-1 text-sm text-[#F1F5F9] hover:text-[#2BA88C] hover:underline transition-colors duration-150 min-w-0 flex-1"
                                    >
                                      <span className="truncate">{occ.prof}</span>
                                      <ExternalLink
                                        style={{ width: 12, height: 12, color: "#2BA88C", flexShrink: 0 }}
                                        className="group-hover:text-[#F1F5F9] group-hover:scale-110 transition-all duration-150"
                                      />
                                    </a>
                                  ) : (
                                    <span className="text-sm text-[#F1F5F9] truncate flex-1">{occ.prof}</span>
                                  )}
                                  <span className="text-xs font-bold tabular-nums shrink-0" style={{ color: "#2BA88C" }}>
                                    {scorePct}%
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-[#94A3B8]">
                            Nenhum dado disponível.
                          </p>
                        )}
                      </div>

                      {/* Coluna 3 — Profissões futuras */}
                      <div
                        className="rounded-lg p-5"
                        style={{
                          backgroundColor: "rgba(43, 168, 140, 0.15)",
                          border: "1px solid #2BA88C",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Star style={{ width: 20, height: 20, color: "#F1F5F9", flexShrink: 0 }} />
                          <span className="text-sm uppercase tracking-wider font-semibold text-[#F1F5F9]">
                            Profissões futuras
                          </span>
                        </div>
                        <p className="text-xs text-[#94A3B8] mb-3">
                          Estas profissões emergentes ainda não são tão conhecidas. Atreves-te a ser pioneiro(a)?
                        </p>
                        <p className="text-sm text-[#94A3B8] italic">
                          Em breve — profissões emergentes em construção
                        </p>
                      </div>

                    </div>
                  </div>
                );
              })}
            </section>
          );
        })()}

        {/* Escolhe o teu caminho */}
        {Object.keys(areaNameMapRef.current).length > 0 && (() => {
          const derivedTop3 = Object.entries(cnaefN1Scores)
            .filter(([cod]) => !!areaNameMapRef.current[cod])
            .sort((a, b) => Number(b[1]) - Number(a[1]))
            .slice(0, 3);

          if (derivedTop3.length === 0) return null;

          return (
            <section id="sec-caminho" data-idx-label="Caminho" className="bg-[#1E293B] rounded-xl overflow-hidden scroll-mt-24">
              <div className="h-1.5 bg-[#2BA88C]" />
              <div className="p-6">
                {/* Cabeçalho */}
                <div className="flex items-center gap-3 mb-3">
                  <BookOpenCheck style={{ width: 32, height: 32, color: "#2BA88C", flexShrink: 0 }} />
                  <h2 className="text-2xl font-bold text-[#F1F5F9]">Escolhe o teu caminho</h2>
                </div>
                <p className="text-base text-[#94A3B8] leading-relaxed mb-5">
                  Agora que sabes quais são os teus itinerários recomendados, podes escolher o teu caminho. Aqui tens as profissões mais compatíveis em cada área e como podes aceder a elas.
                </p>

                {/* 3 cards em coluna */}
                <div className="space-y-4">
                  {derivedTop3.map(([cod, areaScore], cardIdx) => {
                    const Icon = CNAEF_ICONS[cod] ?? BookOpen;
                    const areaName = areaNameMapRef.current[cod];
                    const areaPct = Math.round((Number(areaScore) / maxAreaScore) * 100);
                    const n1 = parseInt(cod, 10);

                    // Top 5 professions for this N1 area
                    const profs = Object.entries(occDetailMap)
                      .filter(([, occ]) => {
                        if (!occ.cnaef_unico) return false;
                        const n2 = parseInt(occ.cnaef_unico, 10);
                        return !isNaN(n2) && Math.floor(n2 / 100) === n1;
                      })
                      .sort((a, b) => b[1].score - a[1].score)
                      .slice(0, 5);

                    const profMaxScore = profs.length > 0 ? profs[0][1].score : 1;

                    return (
                      <div
                        key={cod}
                        className="rounded-xl p-4"
                        style={{ backgroundColor: cardIdx === 0 ? "rgba(43,168,140,0.08)" : "#0F172A", border: cardIdx === 0 ? "1px solid #2BA88C" : "1px solid #334155" }}
                      >
                        {/* Cabeçalho do card */}
                        <div className="flex items-center gap-3 mb-3">
                          <Icon style={{ width: 24, height: 24, color: "#2BA88C", flexShrink: 0 }} />
                          <span className="text-lg font-bold text-[#F1F5F9]">{areaName}</span>
                          <span className="ml-auto text-base font-bold tabular-nums" style={{ color: "#2BA88C" }}>{areaPct}%</span>
                        </div>

                        {/* Profissões */}
                        {profs.length === 0 ? (
                          <p className="text-sm text-[#94A3B8]">Sem profissões disponíveis para esta área.</p>
                        ) : (
                          <div className="space-y-3">
                            {profs.map(([esco, occ], pi) => {
                              const profPct = profMaxScore > 0 ? Math.round((occ.score / profMaxScore) * 100) : 0;
                              const isco = occ.isco_4dig;
                              const formacoes = isco ? (trainingsByIsco[isco] ?? []) : [];
                              const formUrl = isco ? `https://www.mymentor.pt/explorar/formacoes?occupationCode=${isco}` : null;
                              const shown = formacoes.slice(0, 3);
                              const hasMore = formacoes.length > 3;

                              return (
                                <div key={esco} className="grid grid-cols-1 lg:grid-cols-2 gap-2 pb-2" style={{ borderBottom: pi < profs.length - 1 ? "1px solid #1E293B" : "none" }}>
                                  {/* Esquerda — profissão */}
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs text-[#94A3B8] tabular-nums mt-0.5 w-4 shrink-0">{pi + 1}.</span>
                                    <div>
                                      {buildMymentorUrl(occ.mymentor) ? (
                                        <a
                                          href={buildMymentorUrl(occ.mymentor)!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="group inline-flex items-center gap-1 text-sm font-medium text-[#F1F5F9] hover:text-[#2BA88C] hover:underline transition-colors"
                                        >
                                          {occ.prof}
                                          <ExternalLink style={{ width: 11, height: 11, color: "#2BA88C", flexShrink: 0 }} />
                                        </a>
                                      ) : (
                                        <span className="text-sm font-medium text-[#F1F5F9]">{occ.prof}</span>
                                      )}
                                      <span className="block text-xs font-bold tabular-nums mt-0.5" style={{ color: "#2BA88C" }}>{profPct}% match</span>
                                    </div>
                                  </div>

                                  {/* Direita — formações */}
                                  <div>
                                    {formacoes.length === 0 ? (
                                      <p className="text-xs text-[#94A3B8] italic">(sem formação Licenciatura/Mestrado)</p>
                                    ) : (
                                      <ul className="space-y-1">
                                        {shown.map((f, fi) => (
                                          <li key={fi}>
                                            {formUrl ? (
                                              <a
                                                href={formUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-[#2BA88C] hover:underline transition-colors"
                                              >
                                                · {f.name}
                                              </a>
                                            ) : (
                                              <span className="text-xs text-[#94A3B8]">· {f.name}</span>
                                            )}
                                          </li>
                                        ))}
                                        {hasMore && formUrl && (
                                          <li>
                                            <a
                                              href={formUrl}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-xs text-[#94A3B8] hover:text-[#2BA88C] transition-colors"
                                            >
                                              + Ver mais formações
                                            </a>
                                          </li>
                                        )}
                                      </ul>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          );
        })()}

        {/* A Tua Recomendação */}
        <section id="sec-recomendacao" data-idx-label="Recomendação" className="bg-[#1E293B] rounded-xl overflow-hidden scroll-mt-24">
          <div className="h-1.5 bg-[#2BA88C]" />
          <div className="p-8">
            <div className="flex items-center gap-3 mb-3">
              <Star style={{ width: 32, height: 32, color: "#2BA88C", flexShrink: 0 }} />
              <h2 className="text-2xl font-bold text-[#F1F5F9]">A tua recomendação</h2>
            </div>
            <p className="text-base text-[#94A3B8] mb-8">
              Análise personalizada gerada com base nas tuas respostas.
            </p>

            {loadingOrientador && (
              <div className="flex items-center gap-3 py-8">
                <Loader2 style={{ width: 32, height: 32, color: "#2BA88C" }} className="animate-spin" />
                <span className="text-sm text-[#94A3B8]">A gerar análise personalizada...</span>
              </div>
            )}

            {errorOrientador && !loadingOrientador && (
              <div className="flex items-center gap-3 py-4">
                <AlertCircle style={{ width: 24, height: 24, color: "#EF4444", flexShrink: 0 }} />
                <span className="text-sm text-[#94A3B8]">{errorOrientador}</span>
              </div>
            )}

            {orientadorText && !loadingOrientador && (
              <div className="max-w-4xl">
                {orientadorText.split("\n\n").map((para, i) => (
                  <p key={i} className="text-base text-[#F1F5F9] leading-relaxed mb-4">
                    {para}
                  </p>
                ))}
              </div>
            )}
          </div>
        </section>

        {secaoPersonalidade(true)}
      </main>
        </div>
      </div>
    </div>
  );
}
