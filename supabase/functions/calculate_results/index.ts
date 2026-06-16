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

const QNQ_HIGHER = ["Nível 4", "Nível 5", "Nível 6", "Nível 7"];

function hasHigherQNQ(qnqs: string | string[] | null | undefined): boolean {
  if (!qnqs) return false;
  const list = Array.isArray(qnqs) ? qnqs : [qnqs];
  return list.some((q) => QNQ_HIGHER.some((lvl) => q.includes(lvl)));
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function norm(a: number[]): number {
  return Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
}

function cosineSim(a: number[], b: number[]): number {
  const na = norm(a);
  const nb = norm(b);
  if (na === 0 || nb === 0) return 0;
  return dot(a, b) / (na * nb);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { session_id } = await req.json();
    if (!session_id) return json({ ok: false, error: "session_id obrigatório" }, 400);

    // Admin client bypasses RLS for writes
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify caller identity
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ ok: false, error: "Autorização necessária" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) return json({ ok: false, error: "Token inválido" }, 401);

    // Confirm session belongs to authenticated user
    const { data: session } = await admin
      .from("assessment_sessions")
      .select("id, student_id, status")
      .eq("id", session_id)
      .eq("student_id", user.id)
      .single();
    if (!session) return json({ ok: false, error: "Sessão não encontrada" }, 404);

    // ─── Fetch raw answers + occupation items in parallel ─────────────────────
    const [interestRes, intelRes, occItemsRes] = await Promise.all([
      admin
        .from("interest_answers")
        .select("item_cod, answer, interest_items!inner(fator)")
        .eq("session_id", session_id),
      admin
        .from("intelligence_answers")
        .select("item_ordem, answer, intelligence_items!inner(inteligencia_cod)")
        .eq("session_id", session_id),
      admin.from("occupation_items").select("esco, item_cod"),
    ]);

    const interestAnswers = interestRes.data ?? [];
    const intelAnswers = intelRes.data ?? [];
    const occupationItems = occItemsRes.data ?? [];

    // ─── RIASEC scores (0-100 normalised) ────────────────────────────────────
    const riasecAcc: Record<number, { sum: number; n: number }> = {};
    for (const ans of interestAnswers) {
      const fator = (ans.interest_items as { fator: number }).fator;
      if (!riasecAcc[fator]) riasecAcc[fator] = { sum: 0, n: 0 };
      riasecAcc[fator].sum += ans.answer;
      riasecAcc[fator].n++;
    }
    const riasecScores: Record<string, number> = {};
    for (const [fator, { sum, n }] of Object.entries(riasecAcc)) {
      riasecScores[fator] = Math.round((sum / (n * 5)) * 100);
    }

    // ─── Intelligence scores (0-100 normalised) ───────────────────────────────
    const intelAcc: Record<number, { sum: number; n: number }> = {};
    for (const ans of intelAnswers) {
      const cod = (ans.intelligence_items as { inteligencia_cod: number }).inteligencia_cod;
      if (!intelAcc[cod]) intelAcc[cod] = { sum: 0, n: 0 };
      intelAcc[cod].sum += ans.answer;
      intelAcc[cod].n++;
    }
    const intelScores: Record<string, number> = {};
    for (const [cod, { sum, n }] of Object.entries(intelAcc)) {
      intelScores[cod] = Math.round((sum / (n * 5)) * 100);
    }

    const sortedIntel = Object.entries(intelScores).sort((a, b) => b[1] - a[1]);
    const topStrengths = sortedIntel.slice(0, 3).map(([cod]) => Number(cod));
    const topChallenges = sortedIntel
      .slice(-3)
      .reverse()
      .map(([cod]) => Number(cod));

    // ─── Occupation scores (0-1) ──────────────────────────────────────────────
    const answerMap: Record<number, number> = {};
    for (const ans of interestAnswers) answerMap[ans.item_cod] = ans.answer;

    const occAcc: Record<string, { sum: number; n: number }> = {};
    for (const oi of occupationItems) {
      if (!occAcc[oi.esco]) occAcc[oi.esco] = { sum: 0, n: 0 };
      occAcc[oi.esco].sum += answerMap[oi.item_cod] ?? 1;
      occAcc[oi.esco].n++;
    }
    const occupationScores: Record<string, number> = {};
    for (const [esco, { sum, n }] of Object.entries(occAcc)) {
      occupationScores[esco] = parseFloat((sum / (n * 5)).toFixed(4));
    }

    // ─── Fetch all occupations (used for cosine + CNAEF) ─────────────────────
    const { data: allOccupationData, error: occErr } = await admin
      .from("occupations")
      .select("esco, cnaef_unico, qnqs, riasec_r, riasec_i, riasec_a, riasec_s, riasec_e, riasec_c");

    console.log("[DEBUG] occupationData total:", allOccupationData?.length, "err:", JSON.stringify(occErr));

    // ─── Cosine RIASEC reranking ──────────────────────────────────────────────
    // Aluno vector: chaves 1=R,2=I,3=A,4=S,5=E,6=C → normalizado 0-1
    const alunoVec = [
      (riasecScores["1"] ?? 0) / 100,
      (riasecScores["2"] ?? 0) / 100,
      (riasecScores["3"] ?? 0) / 100,
      (riasecScores["4"] ?? 0) / 100,
      (riasecScores["5"] ?? 0) / 100,
      (riasecScores["6"] ?? 0) / 100,
    ];

    const occByEsco: Record<string, typeof allOccupationData[0]> = {};
    for (const o of allOccupationData ?? []) occByEsco[o.esco] = o;

    let comRiasec = 0;
    let semRiasec = 0;
    let sampleLogged = false;

    for (const esco of Object.keys(occupationScores)) {
      const occ = occByEsco[esco];
      if (!occ || occ.riasec_r == null) {
        semRiasec++;
        continue;
      }
      comRiasec++;
      const profVec = [
        occ.riasec_r / 7,
        occ.riasec_i / 7,
        occ.riasec_a / 7,
        occ.riasec_s / 7,
        occ.riasec_e / 7,
        occ.riasec_c / 7,
      ];
      const cos = cosineSim(alunoVec, profVec);
      const oldScore = occupationScores[esco];
      occupationScores[esco] = parseFloat((oldScore * cos).toFixed(4));

      if (!sampleLogged) {
        console.log("[DEBUG] sample novo score:", esco, "atual:", oldScore, "cosine:", cos.toFixed(4), "novo:", occupationScores[esco]);
        sampleLogged = true;
      }
    }

    console.log("[DEBUG] occupations com riasec:", comRiasec, "sem:", semRiasec);

    // ─── CNAEF scores via occupations.cnaef_unico ────────────────────────────
    let cnaefN1Scores: Record<string, number> = {};
    let cnaefN2Scores: Record<string, number> = {};
    let top3Areas: string[] = [];

    // Top 200 after cosine reranking
    const sortedOccs = Object.entries(occupationScores)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200);

    if (sortedOccs.length > 0) {
      const topSet = new Set(sortedOccs.map(([esco]) => esco));

      console.log("[DEBUG] topSet size:", topSet.size, "sample:", JSON.stringify([...topSet].slice(0, 3)));

      const occupationData = (allOccupationData ?? []).filter((o) => topSet.has(o.esco));

      console.log("[DEBUG] topOccupations após filtro:", occupationData.length);

      if (occupationData.length > 0) {
        const cnaefN2Acc: Record<string, number[]> = {};
        const cnaefN1Acc: Record<string, number[]> = {};
        let filtradasQNQ = 0;

        for (const [esco, score] of sortedOccs) {
          const occ = occupationData.find((o) => o.esco === esco);
          if (!occ) continue;

          // QNQ filter — only count professions requiring higher education
          if (!hasHigherQNQ(occ.qnqs)) continue;
          filtradasQNQ++;

          const cnaefUnico = occ.cnaef_unico?.toString().trim();
          if (!cnaefUnico || cnaefUnico === "0" || cnaefUnico === "") continue;

          const n2 = parseInt(cnaefUnico, 10);
          if (isNaN(n2)) continue;
          const n1 = Math.floor(n2 / 100);
          if (n1 <= 0) continue;

          const n2Key = String(n2);
          const n1Key = String(n1);

          if (!cnaefN2Acc[n2Key]) cnaefN2Acc[n2Key] = [];
          cnaefN2Acc[n2Key].push(score as number);

          if (!cnaefN1Acc[n1Key]) cnaefN1Acc[n1Key] = [];
          cnaefN1Acc[n1Key].push(score as number);
        }

        console.log("[DEBUG] após QNQ filter:", filtradasQNQ);

        for (const [cod, scores] of Object.entries(cnaefN2Acc)) {
          cnaefN2Scores[cod] = parseFloat(
            (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4)
          );
        }
        for (const [cod, scores] of Object.entries(cnaefN1Acc)) {
          cnaefN1Scores[cod] = parseFloat(
            (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4)
          );
        }

        // Resolve area names for top 3
        const sortedAreas = Object.entries(cnaefN1Scores)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);

        if (sortedAreas.length > 0) {
          const areaCodes = sortedAreas.map(([cod]) => Number(cod));
          const { data: areaData } = await admin
            .from("cnaef_areas")
            .select("cod, nivel_1")
            .in("cod", areaCodes);

          const codToName: Record<number, string> = {};
          for (const area of areaData ?? []) codToName[area.cod] = area.nivel_1;
          top3Areas = sortedAreas.map(([cod]) => codToName[Number(cod)] ?? String(cod));
        }
      }
    }

    console.log("[DEBUG] payload cnaef_n1_scores:", JSON.stringify(cnaefN1Scores));
    console.log("[DEBUG] payload cnaef_n2_scores:", JSON.stringify(cnaefN2Scores));
    console.log("[DEBUG] payload top3_areas:", JSON.stringify(top3Areas));

    // ─── Persist results ──────────────────────────────────────────────────────
    console.log("[DEBUG] vai chamar update results, session_id:", session_id);
    const { data: upd, error: updErr } = await admin
      .from("results")
      .update({
        riasec_scores: riasecScores,
        intel_scores: intelScores,
        top_strengths: topStrengths,
        top_challenges: topChallenges,
        occupation_scores: occupationScores,
        cnaef_n1_scores: cnaefN1Scores,
        cnaef_n2_scores: cnaefN2Scores,
        top3_areas: top3Areas,
        generated_at: new Date().toISOString(),
      })
      .eq("session_id", session_id)
      .select();
    console.log("[DEBUG] update result data:", JSON.stringify(upd));
    console.log("[DEBUG] update result error:", JSON.stringify(updErr));

    if (updErr) {
      console.error("Erro ao salvar resultados:", updErr);
      return json({ ok: false, error: "Falha ao salvar resultados" }, 500);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Erro inesperado:", err);
    return json({ ok: false, error: "Erro interno" }, 500);
  }
});
