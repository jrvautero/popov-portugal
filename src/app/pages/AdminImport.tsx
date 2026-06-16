import { useState } from 'react';
import * as XLSX from 'xlsx';
import { supabase } from '../../lib/supabase';

export default function AdminImport() {
  const [profFile, setProfFile] = useState<File | null>(null);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [cnaefFile, setCnaefFile] = useState<File | null>(null);

  const [profLog, setProfLog] = useState<string[]>([]);
  const [formLog, setFormLog] = useState<string[]>([]);
  const [cnaefLog, setCnaefLog] = useState<string[]>([]);

  const [profLoading, setProfLoading] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [cnaefLoading, setCnaefLoading] = useState(false);

  const addProfLog = (msg: string) => setProfLog(prev => [...prev, msg]);
  const addFormLog = (msg: string) => setFormLog(prev => [...prev, msg]);
  const addCnaefLog = (msg: string) => setCnaefLog(prev => [...prev, msg]);


  // CNAEF PT-BR Mappings
  const cnaefN1Mapping: Record<string, string> = {
    "Educação": "Educação",
    "Artes e humanidade": "Artes e Humanidades",
    "Ciências Sociais, Comércio e Direito": "Ciências Sociais, Negócios e Direito",
    "Ciências, Matemática e Informática": "Ciências Exatas, Matemática e Computação",
    "Engenharia, Indústrias Transformadoras e Construção": "Engenharia, Produção e Construção",
    "Agricultura": "Agricultura e Recursos Naturais",
    "Saúde e Protecção Social": "Saúde e Bem-estar Social",
    "Serviços": "Serviços",
    "Desenvolvimento pessoal": "Desenvolvimento Pessoal"
  };

  const cnaefN2Mapping: Record<string, string> = {
    "Programas Gerais": "Programas Gerais",
    "Programas de Base": "Programas de Base",
    "Alfabetização": "Alfabetização",
    "Educação": "Educação",
    "Formação de Professores / Formadores e Ciências da Educação": "Formação de Professores e Ciências da Educação",
    "Artes": "Artes",
    "Humanidades": "Humanidades",
    "Ciências Sociais e do Comportamento": "Ciências Sociais e Comportamentais",
    "Informação e Jornalismo": "Comunicação e Jornalismo",
    "Ciências Empresariais": "Administração e Negócios",
    "Direito": "Direito",
    "Ciências da Vida": "Ciências Biológicas",
    "Ciências Físicas": "Ciências Físicas e Naturais",
    "Matemática e Estatística": "Matemática e Estatística",
    "Informática": "Computação e Informática",
    "Engenharia e Técnicas Afins": "Engenharia e Áreas Técnicas",
    "Indústrias Transformadoras": "Produção Industrial",
    "Arquitectura e Construção": "Arquitetura e Construção",
    "Agricultura, Silvicultura e Pescas": "Agricultura, Silvicultura e Pesca",
    "Ciências Veterinárias": "Medicina Veterinária",
    "Saúde": "Saúde",
    "Serviços Sociais": "Serviço Social",
    "Serviços Pessoais": "Serviços Pessoais",
    "Serviços de Transporte": "Transporte e Logística",
    "Protecção do Ambiente": "Meio Ambiente",
    "Serviços de Segurança": "Segurança",
    "Desconhecido ou não Especificado": "Não especificado"
  };

  const handleProfessionsImport = async () => {
    if (!profFile) return;
    setProfLoading(true);
    setProfLog([]);
    addProfLog('Iniciando importação de profissões...');

    try {
      const data = await profFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      addProfLog(`Lidas ${rows.length} linhas do arquivo.`);

      let profCount = 0;
      let itemCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const esco = row.esco?.toString().trim();
          if (!esco) continue;

          // Calcular isco_4dig
          const escoClean = esco.replace('.', '');
          const isco_4dig = escoClean.substring(0, 4);

          const prof = row.prof?.toString().trim() || '';
          const mymentor = row.mymentor?.toString().trim() || null;
          const onet = row.onet?.toString().trim() || null;
          const cnaef_unico = row.cnaef_unico?.toString().trim() || null;
          const description = row.description?.toString().trim() || null;
          const qnqs = row.qnqs?.toString().trim() || null;
          const riasec_r = parseFloat(row.riasec_r) || null;
          const riasec_i = parseFloat(row.riasec_i) || null;
          const riasec_a = parseFloat(row.riasec_a) || null;
          const riasec_s = parseFloat(row.riasec_s) || null;
          const riasec_e = parseFloat(row.riasec_e) || null;
          const riasec_c = parseFloat(row.riasec_c) || null;

          if (i === 0) {
            console.log("[DEBUG] keys do row:", Object.keys(row));
            console.log("[DEBUG] riasec_r raw:", row.riasec_r, "parsed:", riasec_r);
          }

          // Upsert occupation
          const { error: occError } = await supabase
            .from('occupations')
            .upsert({ esco, isco_4dig, prof, mymentor, onet, cnaef_unico, description, qnqs, riasec_r, riasec_i, riasec_a, riasec_s, riasec_e, riasec_c }, { onConflict: 'esco' });

          if (occError) {
            addProfLog(`⚠ Linha ${i + 1} falhou ao inserir profissão: ${occError.message}`);
            continue;
          }

          profCount++;

          // Insert occupation_items
          for (let j = 1; j <= 10; j++) {
            const itemValue = row[`item_${j}`];
            if (itemValue !== null && itemValue !== undefined && itemValue > 0) {
              const item_cod = parseInt(itemValue.toString());
              const { error: itemError } = await supabase
                .from('occupation_items')
                .upsert({ esco, item_cod }, { onConflict: 'esco,item_cod' });

              if (!itemError) {
                itemCount++;
              }
            }
          }

          if ((i + 1) % 50 === 0) {
            addProfLog(`${i + 1} de ${rows.length} profissões processadas...`);
          }
        } catch (err) {
          addProfLog(`⚠ Linha ${i + 1} falhou: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      addProfLog(`✓ ${profCount} profissões importadas, ${itemCount} vínculos profissão-item criados`);
    } catch (err) {
      addProfLog(`❌ Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setProfLoading(false);
    }
  };

  const handleTrainingsImport = async () => {
    if (!formFile) return;
    setFormLoading(true);
    setFormLog([]);
    addFormLog('Iniciando importação de formações...');

    try {
      const data = await formFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      addFormLog(`Lidas ${rows.length} linhas do arquivo.`);

      let formCount = 0;
      let iscoCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const name_search = row.name_search?.toString().trim();
          if (!name_search) continue;

          const qnq_original = row.QNQ?.toString().trim() || null;
          const qnq_label = qnq_original || null;

          const cnaef = row.cnaef ? parseInt(row.cnaef.toString()) : null;
          let cnaef_n1 = null;
          if (cnaef !== null) {
            if (cnaef === 90) {
              cnaef_n1 = 90;
            } else {
              cnaef_n1 = Math.floor(cnaef / 100);
            }
          }

          // Insert training
          const { data: insertedTraining, error: trainError } = await supabase
            .from('trainings')
            .insert({ name_search, qnq_original, qnq_label, cnaef, cnaef_n1 })
            .select('id')
            .single();

          if (trainError || !insertedTraining) {
            addFormLog(`⚠ Linha ${i + 1} falhou ao inserir formação: ${trainError?.message || 'sem id retornado'}`);
            continue;
          }

          formCount++;
          const training_id = insertedTraining.id;

          // Insert training_iscos
          const isco_cod_level4 = row.isco_cod_level4?.toString().trim();
          if (isco_cod_level4) {
            const iscoCodes = isco_cod_level4.split(',').map(c => c.trim()).filter(c => c.length > 0);
            for (const isco_4dig of iscoCodes) {
              const { error: iscoError } = await supabase
                .from('training_iscos')
                .upsert({ training_id, isco_4dig }, { onConflict: 'training_id,isco_4dig' });

              if (!iscoError) {
                iscoCount++;
              }
            }
          }

          if ((i + 1) % 200 === 0) {
            addFormLog(`${i + 1} de ${rows.length} formações processadas...`);
          }
        } catch (err) {
          addFormLog(`⚠ Linha ${i + 1} falhou: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      addFormLog(`✓ ${formCount} formações importadas, ${iscoCount} vínculos formação-ISCO criados`);
    } catch (err) {
      addFormLog(`❌ Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCnaefImport = async () => {
    if (!cnaefFile) return;
    setCnaefLoading(true);
    setCnaefLog([]);
    addCnaefLog('Iniciando importação de áreas CNAEF...');

    try {
      const data = await cnaefFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(sheet);

      addCnaefLog(`Lidas ${rows.length} linhas do arquivo.`);

      let areaCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const cod = row.cod ? parseInt(row.cod.toString()) : null;
          if (cod === null) continue;

          let nivel_1 = (row["Nível 1"] ?? row.nivel_1 ?? row["nivel_1"])?.toString().trim() || null;
          let nivel_2 = (row["Nível 2"] ?? row.nivel_2 ?? row["nivel_2"])?.toString().trim() || null;

          // Aplicar substituições PT-BR
          if (nivel_1) {
            nivel_1 = cnaefN1Mapping[nivel_1] || nivel_1;
          }
          if (nivel_2) {
            nivel_2 = cnaefN2Mapping[nivel_2] || nivel_2;
          }

          const { error: cnaefError } = await supabase
            .from('cnaef_areas')
            .upsert({ cod, nivel_1, nivel_2 }, { onConflict: 'cod' });

          if (cnaefError) {
            addCnaefLog(`⚠ Linha ${i + 1} falhou: ${cnaefError.message}`);
            continue;
          }

          areaCount++;
        } catch (err) {
          addCnaefLog(`⚠ Linha ${i + 1} falhou: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
        }
      }

      addCnaefLog(`✓ ${areaCount} áreas importadas com texto adaptado para português do Brasil`);
    } catch (err) {
      addCnaefLog(`❌ Erro: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    } finally {
      setCnaefLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] p-8">
      <h1 className="text-3xl font-bold text-white mb-2">Importação de Bases</h1>
      <p className="text-[#94A3B8] mb-8">
        Importe os arquivos de referência uma única vez. Use upsert, então pode re-importar sem erro.
      </p>

      <div className="space-y-6">
        {/* CARD 1 - Profissões */}
        <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
          <h2 className="text-xl font-bold text-white mb-2">Importar profissões</h2>
          <p className="text-[#94A3B8] text-sm mb-4">
            Aceita arquivo profissoes_para_itens.xlsx. Popula tabelas occupations e occupation_items.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setProfFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[#94A3B8] mb-4
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-[#334155] file:text-white
              hover:file:bg-[#475569] file:cursor-pointer"
            disabled={profLoading}
          />
          <button
            onClick={handleProfessionsImport}
            disabled={!profFile || profLoading}
            className="px-6 py-2.5 bg-[#2BA88C] text-white rounded-lg font-medium
              hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {profLoading ? 'Importando...' : 'Importar'}
          </button>

          {profLog.length > 0 && (
            <div className="mt-4 bg-[#0F172A] p-4 rounded-lg font-mono text-sm text-[#94A3B8] max-h-60 overflow-y-auto">
              {profLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 2 - Formações */}
        <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
          <h2 className="text-xl font-bold text-white mb-2">Importar formações</h2>
          <p className="text-[#94A3B8] text-sm mb-4">
            Aceita arquivo formacoes_para_profissoes_matriz_29012026.xlsx. Popula trainings e training_iscos.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setFormFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[#94A3B8] mb-4
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-[#334155] file:text-white
              hover:file:bg-[#475569] file:cursor-pointer"
            disabled={formLoading}
          />
          <button
            onClick={handleTrainingsImport}
            disabled={!formFile || formLoading}
            className="px-6 py-2.5 bg-[#2BA88C] text-white rounded-lg font-medium
              hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {formLoading ? 'Importando...' : 'Importar'}
          </button>

          {formLog.length > 0 && (
            <div className="mt-4 bg-[#0F172A] p-4 rounded-lg font-mono text-sm text-[#94A3B8] max-h-60 overflow-y-auto">
              {formLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}
        </div>

        {/* CARD 3 - CNAEF */}
        <div className="bg-[#1E293B] p-6 rounded-xl border border-[#334155]">
          <h2 className="text-xl font-bold text-white mb-2">Importar áreas CNAEF</h2>
          <p className="text-[#94A3B8] text-sm mb-4">
            Aceita arquivo CNAEF_CAE_cod.xlsx. Popula cnaef_areas com textos adaptados para PT-BR.
          </p>
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setCnaefFile(e.target.files?.[0] || null)}
            className="block w-full text-sm text-[#94A3B8] mb-4
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-medium
              file:bg-[#334155] file:text-white
              hover:file:bg-[#475569] file:cursor-pointer"
            disabled={cnaefLoading}
          />
          <button
            onClick={handleCnaefImport}
            disabled={!cnaefFile || cnaefLoading}
            className="px-6 py-2.5 bg-[#2BA88C] text-white rounded-lg font-medium
              hover:bg-[#259178] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cnaefLoading ? 'Importando...' : 'Importar'}
          </button>

          {cnaefLog.length > 0 && (
            <div className="mt-4 bg-[#0F172A] p-4 rounded-lg font-mono text-sm text-[#94A3B8] max-h-60 overflow-y-auto">
              {cnaefLog.map((log, idx) => (
                <div key={idx}>{log}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
