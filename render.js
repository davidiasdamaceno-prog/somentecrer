// render.js — lê o conteúdo (comum + da cidade) e monta a página.
// A cidade é definida em cada HTML antes deste script:
//   <script>window.CITY = "uberlandia";</script>
// Isso é o ponto de integração com o painel administrativo: o painel escreve
// nos arquivos content/comum.json e content/<cidade>/dados.json, e esta
// página sempre reflete o que estiver lá, sem precisar editar HTML.

(async function () {
  const CITY = window.CITY;

  async function carregarJSON(caminho) {
    const resp = await fetch(caminho + "?cache=" + Date.now());
    if (!resp.ok) throw new Error("Não consegui carregar " + caminho);
    return resp.json();
  }

  let comum, cidade;
  try {
    [comum, cidade] = await Promise.all([
      carregarJSON("content/comum.json"),
      carregarJSON(`content/${CITY}/dados.json`),
    ]);
  } catch (err) {
    console.error("Erro ao carregar conteúdo:", err);
    document.body.insertAdjacentHTML(
      "afterbegin",
      `<div style="background:#E23B2E;color:#fff;padding:12px;text-align:center;font-family:sans-serif">
        Não foi possível carregar o conteúdo do site. Tente recarregar a página.
      </div>`
    );
    return;
  }

  // Junta os dois. "links" existe nos dois arquivos e precisa mesclar.
  const DADOS = {
    ...comum,
    ...cidade,
    links: { ...(comum.links || {}), ...(cidade.links || {}) },
  };

  // ---------- Valores derivados ----------
  function transmissaoUrl() {
    return `https://www.youtube.com/embed/${DADOS.transmissao.youtubeVideoId}?modestbranding=1&rel=0`;
  }

  function mapaUrl() {
    const e = DADOS.endereco;
    const q = encodeURIComponent(`${e.rua}, ${e.bairro}, ${e.cidade} ${e.uf}`);
    return `https://www.google.com/maps?q=${q}&output=embed`;
  }

  function enderecoLinha() {
    const e = DADOS.endereco;
    let linha = `${e.rua} · ${e.bairro} · ${e.cidade} ${e.uf}`;
    if (e.cep) linha += ` · ${e.cep}`;
    return linha;
  }

  function rodapeLinha() {
    return `${enderecoLinha()} · ${DADOS.contato.telefone}`;
  }

  function proximoPrimeiroDomingo() {
    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mesAtual = hoje.getMonth();
    function primeiroDomingoDoMes(ano, mes) {
      const d = new Date(ano, mes, 1);
      const offset = (7 - d.getDay()) % 7;
      d.setDate(1 + offset);
      return d;
    }
    let alvo = primeiroDomingoDoMes(ano, mesAtual);
    if (alvo < hoje) alvo = primeiroDomingoDoMes(ano, mesAtual + 1);
    const meses = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
    return `${alvo.getDate()} de ${meses[alvo.getMonth()]}`;
  }

  function avisoData() {
    if (DADOS.aviso.tipo === "santaCeia") return proximoPrimeiroDomingo();
    return DADOS.aviso.data;
  }

  function formatarHora(h, min) {
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  }

  function estaAoVivoAgora() {
    const agora = new Date();
    const diaSemana = agora.getDay();
    const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
    return DADOS.cultos.some((c) => {
      if (c.d !== diaSemana) return false;
      const inicio = c.h * 60 + c.min - DADOS.transmissao.abreAntesMin;
      const fim = c.h * 60 + c.min + DADOS.transmissao.duracaoMin;
      return minutosAgora >= inicio && minutosAgora <= fim;
    });
  }

  // ---------- Preenchimento do cabeçalho ----------
  document.title = `${DADOS.igreja.razaoSocial} — ${DADOS.igreja.cidade}`;
  const elCidadeLogo = document.querySelector("[data-cidade-logo]");
  if (elCidadeLogo) elCidadeLogo.textContent = DADOS.igreja.cidadeUF;

  const elBotaoTroca = document.querySelector("[data-botao-troca-cidade]");
  if (elBotaoTroca) {
    elBotaoTroca.textContent = DADOS.igrejaIrma.rotulo;
    elBotaoTroca.href = DADOS.igrejaIrma.url;
  }

  // ---------- Hero: Ao Vivo ----------
  const aoVivoAgora = estaAoVivoAgora();
  const elHeroSub = document.querySelector("[data-hero-sub]");
  if (elHeroSub) elHeroSub.textContent = `Assista aos cultos de ${DADOS.igreja.cidade} onde você estiver`;

  const elSelo = document.querySelector("[data-selo-ao-vivo]");
  if (elSelo) {
    elSelo.className = "selo " + (aoVivoAgora ? "selo-ao-vivo" : "selo-fora-do-ar");
    elSelo.innerHTML = `<span class="selo-ponto"></span> ${aoVivoAgora ? "AO VIVO AGORA" : "FORA DO AR"}`;
  }

  const elIframe = document.querySelector("[data-iframe-transmissao]");
  if (elIframe) elIframe.src = transmissaoUrl();

  // ---------- Hero: Aviso ----------
  const elAvisoEtiqueta = document.querySelector("[data-aviso-etiqueta]");
  if (elAvisoEtiqueta) elAvisoEtiqueta.textContent = DADOS.aviso.etiqueta;
  const elAvisoTitulo = document.querySelector("[data-aviso-titulo]");
  if (elAvisoTitulo) elAvisoTitulo.textContent = DADOS.aviso.titulo;
  const elAvisoData = document.querySelector("[data-aviso-data]");
  if (elAvisoData) elAvisoData.textContent = avisoData();

  // ---------- Cards: Rádio ----------
  const elRadioPrograma = document.querySelector("[data-radio-programa]");
  if (elRadioPrograma) elRadioPrograma.textContent = DADOS.radio.programa;
  const elRadioFreq = document.querySelector("[data-radio-frequencia]");
  if (elRadioFreq) elRadioFreq.textContent = DADOS.radio.frequencia;
  const elRadioGrade = document.querySelector("[data-radio-grade]");
  if (elRadioGrade) elRadioGrade.textContent = DADOS.radio.grade;

  // ---------- Cards: Encontro Regional ----------
  const elPlaylistEncontros = document.querySelector("[data-link-playlist-encontros]");
  if (elPlaylistEncontros) elPlaylistEncontros.href = DADOS.links.playlistEncontros;

  // ---------- Cards: Encontro de Pastores ----------
  const elAno = document.querySelector("[data-pastores-ano]");
  if (elAno) elAno.textContent = DADOS.encontroPastores.ano;
  const elPastoresData = document.querySelector("[data-pastores-data]");
  if (elPastoresData) elPastoresData.textContent = DADOS.encontroPastores.data;
  const elAbrangencia = document.querySelector("[data-pastores-abrangencia]");
  if (elAbrangencia) elAbrangencia.textContent = DADOS.encontroPastores.abrangencia;

  // ---------- Horários dos cultos ----------
  function renderCultos(seletor, grupo) {
    const container = document.querySelector(seletor);
    if (!container) return;
    container.innerHTML = "";
    DADOS.cultos
      .filter((c) => c.grupo === grupo)
      .forEach((c) => {
        const linha = document.createElement("div");
        linha.className = "culto-linha";
        linha.innerHTML = `<span class="culto-rotulo">${c.rotulo}</span><span class="culto-hora">${formatarHora(c.h, c.min)}</span>`;
        container.appendChild(linha);
      });
  }
  renderCultos("[data-cultos-semana]", "semana");
  renderCultos("[data-cultos-domingo]", "domingo");

  // ---------- Como chegar / Contato ----------
  const elMapa = document.querySelector("[data-iframe-mapa]");
  if (elMapa) elMapa.src = mapaUrl();
  const elEndereco = document.querySelector("[data-endereco-linha]");
  if (elEndereco) elEndereco.textContent = enderecoLinha();
  const elTelefone = document.querySelector("[data-contato-telefone]");
  if (elTelefone) elTelefone.textContent = DADOS.contato.telefone;
  const elEmail = document.querySelector("[data-contato-email]");
  if (elEmail) elEmail.textContent = DADOS.contato.email;

  // ---------- Coluna direita da seção Participação ----------
  const elPlaylistSaudosa = document.querySelector("[data-link-playlist-saudosa]");
  if (elPlaylistSaudosa && DADOS.links.playlistSaudosa) {
    elPlaylistSaudosa.href = DADOS.links.playlistSaudosa;
  }

  // Galeria de fotos (só existe no HTML de Araguari)
  const galeriaEl = document.querySelector("[data-galeria]");
  if (galeriaEl && Array.isArray(DADOS.galeria) && DADOS.galeria.length) {
    let indiceAtual = 0;
    galeriaEl.innerHTML = `
      <div data-galeria-imagens></div>
      <div class="galeria-dots" data-galeria-dots></div>
    `;
    const imgsContainer = galeriaEl.querySelector("[data-galeria-imagens]");
    const dotsContainer = galeriaEl.querySelector("[data-galeria-dots]");

    DADOS.galeria.forEach((foto, i) => {
      const img = document.createElement("img");
      img.src = foto.src;
      img.alt = foto.alt || "";
      if (i === 0) img.classList.add("ativa");
      imgsContainer.appendChild(img);

      const dot = document.createElement("button");
      if (i === 0) dot.classList.add("ativa");
      dot.addEventListener("click", () => mostrarFoto(i));
      dotsContainer.appendChild(dot);
    });

    function mostrarFoto(i) {
      indiceAtual = i;
      imgsContainer.querySelectorAll("img").forEach((img, idx) => img.classList.toggle("ativa", idx === i));
      dotsContainer.querySelectorAll("button").forEach((dot, idx) => dot.classList.toggle("ativa", idx === i));
    }

    setInterval(() => {
      mostrarFoto((indiceAtual + 1) % DADOS.galeria.length);
    }, 5000);
  }

  // ---------- Dízimos e Ofertas ----------
  const elTitular = document.querySelector("[data-contrib-titular]");
  if (elTitular) elTitular.textContent = DADOS.contribuicao.titular;
  const elPixRotulo = document.querySelector("[data-contrib-pix-rotulo]");
  if (elPixRotulo) elPixRotulo.textContent = DADOS.contribuicao.pixRotulo;
  const elPixChave = document.querySelector("[data-contrib-pix-chave]");
  if (elPixChave) elPixChave.textContent = DADOS.contribuicao.pixChave;
  const elBanco = document.querySelector("[data-contrib-banco]");
  if (elBanco) elBanco.textContent = DADOS.contribuicao.banco;
  const elConta = document.querySelector("[data-contrib-conta]");
  if (elConta) elConta.textContent = DADOS.contribuicao.conta;

  const btnCopiarPix = document.querySelector("[data-btn-copiar-pix]");
  if (btnCopiarPix) {
    btnCopiarPix.addEventListener("click", () => {
      navigator.clipboard.writeText(DADOS.contribuicao.pixChave).then(() => {
        const textoOriginal = btnCopiarPix.textContent;
        btnCopiarPix.textContent = "Chave copiada ✓";
        setTimeout(() => { btnCopiarPix.textContent = textoOriginal; }, 2400);
      });
    });
  }

  // ---------- Rodapé ----------
  const elRodapeLinha = document.querySelector("[data-rodape-linha]");
  if (elRodapeLinha) elRodapeLinha.textContent = rodapeLinha();

  // ---------- Carrossel do topo (Ao Vivo / Aviso) ----------
  const pista = document.querySelector("[data-hero-pista]");
  const dots = document.querySelectorAll("[data-hero-dot]");
  let slot = 0;
  function irParaSlot(i) {
    slot = i;
    if (pista) pista.style.transform = `translateX(-${slot * 50}%)`;
    dots.forEach((d, idx) => d.classList.toggle("ativo", idx === slot));
  }
  dots.forEach((dot, i) => dot.addEventListener("click", () => irParaSlot(i)));
  setInterval(() => irParaSlot((slot + 1) % 2), 12000);

  // ---------- Scrollspy simples ----------
  const secoes = ["topo", "cultos", "participacao", "contribuir"];
  const linksMenu = document.querySelectorAll("nav.menu a");
  function atualizarMenuAtivo() {
    let atual = secoes[0];
    for (const id of secoes) {
      const el = document.getElementById(id);
      if (el && el.getBoundingClientRect().top < 160) atual = id;
    }
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 4) {
      atual = "contribuir";
    }
    linksMenu.forEach((a) => {
      a.classList.toggle("ativo", a.getAttribute("href") === "#" + atual);
    });
  }
  window.addEventListener("scroll", atualizarMenuAtivo);
  atualizarMenuAtivo();
})();
