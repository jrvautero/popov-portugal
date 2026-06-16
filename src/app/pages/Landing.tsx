export default function Landing() {
  return (
    <div className="min-h-screen bg-[#0F172A] text-[#F1F5F9]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-[#0F172A]/80 backdrop-blur-md border-b border-[#334155]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-white">POPOV</div>
          <div className="flex items-center gap-6">
            <a href="#sobre" className="text-[#94A3B8] hover:text-white transition-colors">
              Sobre
            </a>
            <a
              href="/login"
              className="px-6 py-2.5 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
            >
              Entrar
            </a>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <h1 className="text-6xl font-bold text-white mb-4">POPOV</h1>
        <p className="text-xl text-[#94A3B8] mb-8">
          Programa de Orientação Profissional e Vocacional
        </p>
        <p className="text-lg text-white mt-8 mb-10 max-w-3xl mx-auto">
          Que pergunta sobre o seu futuro profissional você tem agora?
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <a
            href="/signup"
            className="px-8 py-3 bg-[#2BA88C] text-white rounded-lg font-medium hover:bg-[#259178] transition-colors"
          >
            Iniciar
          </a>
          <a
            href="/login"
            className="px-8 py-3 bg-[#334155] text-white rounded-lg font-medium hover:bg-[#475569] transition-colors"
          >
            Entrar
          </a>
        </div>
      </section>

      {/* SEÇÃO SOBRE O PROGRAMA */}
      <section id="sobre" className="max-w-7xl mx-auto px-6 mt-24 py-16">
        <h2 className="text-3xl font-bold text-center text-white mb-10">Sobre o Programa</h2>
        <div className="max-w-4xl mx-auto bg-[#1E293B] rounded-xl p-10 space-y-6">
          <p className="text-base leading-relaxed">
            O POPOV é um programa de orientação profissional e vocacional voltado para estudantes do Ensino Fundamental II e do Ensino Médio.
          </p>
          <p className="text-base leading-relaxed">
            Nosso objetivo é apoiar você na descoberta de áreas profissionais alinhadas aos seus interesses e habilidades, oferecendo um relatório personalizado com profissões e caminhos formativos reais.
          </p>
          <p className="text-base leading-relaxed">
            Você responde dois questionários breves e recebe um relatório com áreas profissionais alinhadas ao seu perfil, profissões reais e caminhos formativos disponíveis.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0F172A] border-t border-[#334155] mt-24">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center md:text-left">
            {/* Coluna 1 - Contato */}
            <div>
              <h4 className="font-semibold text-white mb-3">Contato</h4>
              <p className="text-[#94A3B8]">contato@popov.com.br</p>
            </div>
            {/* Coluna 2 - Sobre */}
            <div>
              <h4 className="font-semibold text-white mb-3">Sobre</h4>
              <div className="flex flex-col gap-2 text-[#94A3B8]">
                <a href="#" className="hover:text-white transition-colors">Termos de uso</a>
                <a href="#" className="hover:text-white transition-colors">Política de privacidade</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-[#334155] text-center text-[#94A3B8] text-sm">
            © 2026 POPOV — Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
