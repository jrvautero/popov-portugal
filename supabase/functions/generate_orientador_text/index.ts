import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) return json({ error: "session_id obrigatório" }, 400);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Autorização necessária" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return json({ error: "Token inválido" }, 401);

    // Confirm session belongs to authenticated user
    const { data: session } = await admin
      .from("assessment_sessions")
      .select("id, student_id")
      .eq("id", session_id)
      .eq("student_id", user.id)
      .single();
    if (!session) return json({ error: "Sessão não encontrada" }, 404);

    // Fetch result + reference tables in parallel
    const [resultRes, riasecRes, intelRes, cnaefRes] = await Promise.all([
      admin.from("results").select("*").eq("session_id", session_id).single(),
      admin.from("riasec_factors").select("cod, nome"),
      admin.from("intelligences").select("cod, nome"),
      admin.from("cnaef_areas").select("cod, nivel_1").eq("is_n1", true),
    ]);

    if (resultRes.error || !resultRes.data) {
      console.error("Erro ao buscar resultado:", resultRes.error);
      return json({ error: "Resultado não encontrado" }, 404);
    }

    const result = resultRes.data as {
      riasec_scores: Record<string, number>;
      intel_scores: Record<string, number>;
      cnaef_n1_scores: Record<string, number>;
      occupation_scores: Record<string, number>;
    };

    // Build name maps
    const riasecNameMap: Record<string, string> = {};
    for (const r of riasecRes.data ?? []) riasecNameMap[String(r.cod)] = r.nome;

    const intelNameMap: Record<string, string> = {};
    for (const r of intelRes.data ?? []) intelNameMap[String(r.cod)] = r.nome;

    const areaNameMap: Record<string, string> = {};
    for (const r of cnaefRes.data ?? []) areaNameMap[String(r.cod)] = r.nivel_1;

    // Derive top values
    const sortedRiasec = Object.entries(result.riasec_scores ?? {})
      .sort((a, b) => b[1] - a[1]);
    const top2Riasec = sortedRiasec.slice(0, 2).map(([cod, score]) => ({
      name: riasecNameMap[cod] ?? cod,
      pct: score,
    }));

    const sortedIntel = Object.entries(result.intel_scores ?? {})
      .sort((a, b) => b[1] - a[1]);
    const top3Intel = sortedIntel.slice(0, 3).map(([cod]) => intelNameMap[cod] ?? cod);

    const top3Areas = Object.entries(result.cnaef_n1_scores ?? {})
      .filter(([cod]) => !!areaNameMap[cod])
      .sort((a, b) => Number(b[1]) - Number(a[1]))
      .slice(0, 3)
      .map(([cod]) => areaNameMap[cod]);

    // Fetch top 5 profession names
    const top5EscoKeys = Object.entries(result.occupation_scores ?? {})
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([esco]) => esco);

    let top5Professions: string[] = [];
    if (top5EscoKeys.length > 0) {
      const { data: occData } = await admin
        .from("occupations")
        .select("esco, prof")
        .in("esco", top5EscoKeys);
      const occMap: Record<string, string> = {};
      for (const o of occData ?? []) occMap[o.esco] = o.prof;
      top5Professions = top5EscoKeys.map((e) => occMap[e]).filter(Boolean);
    }

    // Build prompt
    const riasecLine = top2Riasec
      .map((r) => `${r.name} (${r.pct}%)`)
      .join(", ");
    const intelLine = top3Intel.join(", ");
    const areasLine = top3Areas.join(", ");
    const profsLine = top5Professions.join(", ");

    const systemPrompt =
      "És um orientador profissional experiente. O teu papel é dar uma recomendação personalizada e humana a um(a) estudante com base no seu perfil vocacional. Escreves em português europeu, com tom informal e próximo (usar 'tu'). O texto tem duas partes: primeira analítica (interpreta o perfil RIASEC dominante, as inteligências fortes, e as 3 áreas formativas top), segunda inspiradora (encoraja o(a) estudante a explorar, mas sem clichés). Total: 5 parágrafos curtos. Não usar emojis. Não usar listas com bullets. Texto corrido.";

    const userPrompt = `Perfil do(a) estudante:

Top 2 fatores RIASEC: ${riasecLine}
Top 3 inteligências múltiplas: ${intelLine}
Top 3 áreas formativas: ${areasLine}
Top 5 profissões com maior afinidade: ${profsLine}

Escreve a recomendação em 5 parágrafos.`;

    // Call Anthropic API
    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicKey) {
      console.error("ANTHROPIC_API_KEY não configurada");
      return json({ error: "Configuração interna em falta" }, 500);
    }

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errBody = await anthropicRes.text();
      console.error("Erro Anthropic:", anthropicRes.status, errBody);
      return json({ error: "Falha ao gerar texto" }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const generatedText: string =
      anthropicData?.content?.[0]?.text ?? "";

    if (!generatedText) {
      console.error("Resposta Anthropic sem texto:", anthropicData);
      return json({ error: "Resposta inválida da API" }, 502);
    }

    // Save to results — UPDATE only, never insert (row already exists from calculate_results)
    const { error: updateError } = await admin
      .from("results")
      .update({ orientador_text: generatedText })
      .eq("session_id", session_id);

    if (updateError) {
      console.error("Erro ao salvar orientador_text:", updateError);
      return json({ error: "Falha ao guardar texto" }, 500);
    }

    return json({ text: generatedText });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return json({ error: "Erro interno" }, 500);
  }
});
