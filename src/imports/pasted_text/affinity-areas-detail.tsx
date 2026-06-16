TAREFA: Criar nova seção "DETALHE DAS 3 ÁREAS DE AFINIDADE" em /app/resultados, replicando o layout das páginas 6/7/8 do design de referência.

ANTES DE IMPLEMENTAR, ME LISTE:
1. Arquivos a modificar
2. Mudanças específicas
3. Queries adicionais necessárias
Aguarde minha confirmação.

LOCALIZAÇÃO:
Inserir nova seção APÓS "ITINERÁRIOS PROFISSIONAIS" e ANTES de "PROFISSÕES COM MAIOR AFINIDADE".

REMOVER a seção atual "TOP 3 ÁREAS DE AFINIDADE" (a que tem 3 cards verticais com profissões + formações agrupadas). Será substituída pela nova.

ESTRUTURA DA NOVA SEÇÃO:

3 blocos verticais empilhados, cada bloco para uma das 3 áreas TOP (derivadas de cnaef_n1_scores, top 3 ordenadas descendente, filtradas por areaNameMapRef.current).

Para cada área, criar um BLOCO com:

Cabeçalho do bloco:
- Pequeno texto "TU ITINERÁRIO" em text-xs uppercase tracking-wider #94A3B8 mb-1
- Linha flex items-center gap-3:
  - Ícone Lucide grande (32px) cor #2BA88C, conforme CNAEF_ICONS[cod]
  - Nome da área em text-2xl font-bold #F1F5F9

Layout do conteúdo: grid 3 colunas (lg:grid-cols-3 gap-6 mt-6)

COLUNA 1 — Texto descritivo + imagem:
- Bloco de texto: parágrafo com 3-4 frases (text-sm #F1F5F9 line-height relaxed)
- Imagem decorativa abaixo do texto: w-full h-48 rounded-lg object-cover, URL Unsplash baseada no cod
- Use o dicionário AREA_DESCRIPTIONS abaixo
- Use o dicionário AREA_IMAGES abaixo

COLUNA 2 — Profissões relacionadas:
- Fundo #0F172A border #334155 padding p-5 rounded-lg
- Linha de cabeçalho flex items-center gap-2 mb-3:
  - Ícone Lucide Briefcase 20px #2BA88C
  - Texto "PROFISSÕES RELACIONADAS" em text-sm uppercase tracking-wider font-semibold #F1F5F9
- Texto curto introdutório (text-xs #94A3B8 mb-3): "Estas são algumas profissões que existem atualmente nesta área."
- Lista de até 10 profissões (text-sm #F1F5F9), uma por linha
- Buscar via get_area_details existente, usar o campo professions

COLUNA 3 — Profissões futuras:
- Fundo #2BA88C com opacidade 0.15 via style backgroundColor: 'rgba(43, 168, 140, 0.15)'
- Border 1px #2BA88C
- Padding p-5 rounded-lg
- Linha de cabeçalho flex items-center gap-2 mb-3:
  - Ícone Lucide Star 20px #F1F5F9
  - Texto "PROFISSÕES FUTURAS" em text-sm uppercase tracking-wider font-semibold #F1F5F9
- Texto curto introdutório (text-xs #94A3B8 mb-3): "Estas profissões emergentes ainda não são tão conhecidas. Você se atreve a ser pioneiro(a)?"
- Lista de profissões futuras: por enquanto, placeholder único em text-sm #94A3B8 italic:
  "Em breve — profissões emergentes em construção"

DICIONÁRIO AREA_DESCRIPTIONS (em constante fora do componente):
const AREA_DESCRIPTIONS = {
  "0": "Esta área engloba formações voltadas ao ensino, à pesquisa pedagógica e ao desenvolvimento humano em todas as idades. Você poderá atuar em escolas, universidades, ONGs educacionais ou desenvolver materiais didáticos. Suas habilidades de comunicação, paciência e empatia serão diferenciais para impactar positivamente a vida de outras pessoas.",
  "2": "Esta área inclui formações em artes visuais, música, literatura, história, filosofia e idiomas. Você poderá trabalhar com criação artística, produção cultural, ensino, pesquisa ou comunicação. Sua sensibilidade estética, capacidade crítica e expressão criativa serão centrais na sua trajetória profissional.",
  "3": "Esta área reúne formações em administração, economia, direito, jornalismo, sociologia e ciências do comportamento. Você poderá atuar em empresas privadas, órgãos públicos, escritórios jurídicos ou organizações sociais. Suas habilidades analíticas, comunicativas e de tomada de decisão guiarão seu caminho.",
  "4": "Esta área abrange formações em matemática, física, química, biologia, estatística e tecnologia da informação. Você poderá trabalhar com pesquisa científica, desenvolvimento de software, análise de dados ou ensino. Sua curiosidade investigativa e raciocínio lógico serão fundamentais.",
  "5": "Esta área inclui engenharias, arquitetura, construção civil e indústrias de transformação. Você poderá projetar produtos, edifícios e sistemas, ou trabalhar na fabricação e implementação de soluções tecnológicas. Sua capacidade de resolver problemas práticos e pensar de forma estruturada será essencial.",
  "6": "Esta área engloba formações em agronomia, veterinária, ciências ambientais, silvicultura e pesca. Você poderá atuar em propriedades rurais, agroindústria, conservação ambiental ou pesquisa científica. Seu interesse pela natureza e por sistemas vivos será o motor da sua trajetória.",
  "7": "Esta área reúne formações em medicina, enfermagem, fisioterapia, psicologia, nutrição e serviço social. Você poderá trabalhar em hospitais, clínicas, escolas, ONGs ou consultórios próprios, cuidando da saúde física e emocional das pessoas. Sua empatia e atenção ao próximo serão diferenciais.",
  "8": "Esta área abrange formações em turismo, hotelaria, gastronomia, transporte, segurança e proteção ambiental. Você poderá atuar em diversos setores que conectam pessoas a serviços essenciais ou de lazer. Seu senso prático, capacidade de organização e atendimento ao cliente serão valorizados.",
};

DICIONÁRIO AREA_IMAGES (em constante fora do componente):
const AREA_IMAGES = {
  "0": "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=800",
  "2": "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=800",
  "3": "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800",
  "4": "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
  "5": "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800",
  "6": "https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800",
  "7": "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
  "8": "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800",
};

REGRAS:
- Sem emojis
- Sem inventar cores fora da paleta
- Não modificar outras seções
- Imports necessários: Briefcase, Star (já tem ou adicionar do lucide-react)
- A seção "TOP 3 ÁREAS DE AFINIDADE" atual (que tem profissões + formações agrupadas) DEVE SER REMOVIDA. Substituída pela nova.
- As 3 áreas usadas são as mesmas dos cards destacados (derivadas de cnaef_n1_scores, top 3, filtradas)
- As formações por nível (graduação, técnico etc.) saem desta seção — serão usadas em outra seção depois (página 9 "Elige tu propia aventura")