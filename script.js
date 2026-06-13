// ==========================================
// CONFIGURAÇÕES E BANCO DE DADOS (LOCALSTORAGE)
// ==========================================
const CHAVE_BANCO = "protocoloMiragemAgentes";

function carregarBanco() {
  const dados = localStorage.getItem(CHAVE_BANCO);
  return dados ? JSON.parse(dados) : [];
}

function salvarBanco(personagens) {
  localStorage.setItem(CHAVE_BANCO, JSON.stringify(personagens));
}

// Objeto base inicializa o "Atual" igual à Base predefinida nas regras
function criarAgenteEmBranco(nomeInicial) {
  return {
    id: Date.now(),
    identidade: {
      nome: nomeInicial || "Agente Desconhecido",
      player: "",
      codinome: "",
      equipe: "",
      ocupacao: "",
      nivel: 1,
      xp: 0,
      habilidade: "",
      melhoria_pericia: "",
      habilidade_2: "",
      melhoria_pericia_2: "",
      aumento_atributo_cura: "",
      total_niveis: "",
    },
    status: { pv: 0, pv_max: 0, pd: 0, pd_max: 0, gc: 50 },
    atributos: {
      forca: 0,
      inteligencia: 0,
      carisma: 0,
      humanidade: 0,
      vigor: 0,
      corpo: 0,
      sabedoria: 0,
      agilidade: 0,
    },
    pericias: {
      // FÍSICAS
      acrobacia: 5,
      acrobacia_base: 5,
      arremessar: 20,
      arremessar_base: 20,
      atirar_leve: 0,
      atirar_leve_base: 0,
      atirar_pesada: 0,
      atirar_pesada_base: 0,
      atletismo: 15,
      atletismo_base: 15,
      escalar: 20,
      escalar_base: 20,
      fortitude: 10,
      fortitude_base: 10,
      furtividade: 20,
      furtividade_base: 20,
      luta_arma_leve: 15,
      luta_arma_leve_base: 15,
      luta_arma_pesada: 10,
      luta_arma_pesada_base: 10,
      luta_desarmado: 15,
      luta_desarmado_base: 15,
      nadar: 15,
      nadar_base: 15,
      prestidigitacao: 10,
      prestidigitacao_base: 10,
      reflexos: 0,
      reflexos_base: 0,
      sobrevivencia: 10,
      sobrevivencia_base: 10,
      iniciativa: 15,
      iniciativa_base: 15,

      // INTELECTUAIS
      dirigir: 0,
      dirigir_base: 0,
      dirigir_espec: "",
      atualidades: 20,
      atualidades_base: 20,
      ciencia: 0,
      ciencia_base: 0,
      ciencia_espec: "",
      computador: 15,
      computador_base: 15,
      credito: 0,
      credito_base: 0,
      crime: 0,
      crime_base: 0,
      geografia: 5,
      geografia_base: 5,
      historia: 5,
      historia_base: 5,
      saber_veu: 0,
      saber_veu_base: 0,
      lembrar: 25,
      lembrar_base: 25,
      medicina: 1,
      medicina_base: 1,
      reparos_eletricos: 0,
      reparos_eletricos_base: 0,
      reparos_mecanicos: 0,
      reparos_mecanicos_base: 0,

      // SOCIAIS
      acalmar: 30,
      acalmar_base: 30,
      adestramento: 10,
      adestramento_base: 10,
      intuicao: 10,
      intuicao_base: 10,
      artes: 0,
      artes_base: 0,
      artes_espec: "",
      fama: 0,
      fama_base: 0,
      intimidacao: 15,
      intimidacao_base: 15,
      charme: 15,
      charme_base: 15,
      labia: 10,
      labia_base: 10,
      encontrar: 15,
      encontrar_base: 15,
      observar: 20,
      observar_base: 20,
      ouvir: 20,
      ouvir_base: 20,
      primeiros_socorros: 30,
      primeiros_socorros_base: 30,
      psicanalise: 10,
      psicanalise_base: 10,
      usar_veu: 0,
      usar_veu_base: 0,
      vontade: 25,
      vontade_base: 25,
    },
    perfil: { aparencia: "", personalidade: "", traumas: "" },
    recursos: {
      patente: "",
      categoria: "",
      poupanca: "",
      salario: "",
      bens_materiais: "",
      carga_leve: "",
      carga_moderada: "",
      carga_maxima: "",
    },
    inventario: { carga: 0, peso: "", equipamentos: "", descricao: "" },
    combate: { rd: "", defesa: "", db: "" },
    habilidades: {
      lista: "",
      transformacoes: "",
      marca: "",
      rituais: "",
      marca_img: "",
    },
  };
}

function combinarEstruturaPadrao(padrao, agente) {
  const combinado = { ...padrao, ...agente };

  Object.keys(padrao).forEach((chave) => {
    if (
      padrao[chave] &&
      typeof padrao[chave] === "object" &&
      !Array.isArray(padrao[chave])
    ) {
      combinado[chave] = {
        ...padrao[chave],
        ...(agente && agente[chave] ? agente[chave] : {}),
      };
    }
  });

  return combinado;
}

function normalizarAgente(agente) {
  const nome = agente && agente.identidade ? agente.identidade.nome : "";
  return combinarEstruturaPadrao(criarAgenteEmBranco(nome), agente || {});
}

// ==========================================
// MÓDULO 1: PÁGINA INICIAL (DASHBOARD)
// ==========================================
const listaDiv = document.getElementById("lista-personagens");
const btnNovo = document.getElementById("btn-novo-personagem");
const inputNovoNome = document.getElementById("input-novo-nome");
const btnEntrarCirculo = document.getElementById("btn-entrar-circulo");
const painelAgentes = document.getElementById("painel-agentes");

if (listaDiv && btnNovo) {
  if (btnEntrarCirculo && painelAgentes) {
    btnEntrarCirculo.addEventListener("click", () => {
      painelAgentes.classList.toggle("hidden");
    });
  }

  function renderizarLista() {
    const personagens = carregarBanco();
    listaDiv.innerHTML = "";

    if (personagens.length === 0) {
      listaDiv.innerHTML =
        '<p style="color:#aaa; text-align:center; font-family:Georgia, serif; text-shadow: 1px 1px 2px #000;">Vazio. O círculo aguarda.</p>';
      return;
    }

    personagens.forEach((agente) => {
      const wrapper = document.createElement("div");
      wrapper.className = "agent-wrapper";

      wrapper.innerHTML = `
                <button class="agent-center-btn" onclick="abrirFicha(${agente.id})">${agente.identidade.nome}</button>
                <button class="agent-delete-btn" onclick="deletarPersonagem(${agente.id})">Remover</button>
            `;
      listaDiv.appendChild(wrapper);
    });
  }

  btnNovo.addEventListener("click", () => {
    const nome = inputNovoNome.value.trim();
    if (!nome) {
      alert("Por favor, digite um nome para o agente.");
      return;
    }

    const personagens = carregarBanco();
    const novoAgente = criarAgenteEmBranco(nome);
    personagens.push(novoAgente);
    salvarBanco(personagens);
    abrirFicha(novoAgente.id);
  });

  window.abrirFicha = function (id) {
    window.location.assign(`./ficha.html?id=${id}`);
  };
  window.deletarPersonagem = function (id) {
    if (confirm("Excluir permanentemente este agente?")) {
      let personagens = carregarBanco();
      personagens = personagens.filter((p) => p.id !== id);
      salvarBanco(personagens);
      renderizarLista();
    }
  };

  renderizarLista();

  // Importação de Ficha via JSON (Página Index)
  const inputImportar = document.getElementById("input-importar");
  if (inputImportar) {
    inputImportar.addEventListener("change", (evento) => {
      const file = evento.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dadosImportados = JSON.parse(e.target.result);
          dadosImportados.id = Date.now(); // Garante que a ficha importada tenha um ID único
          const personagens = carregarBanco();
          personagens.push(normalizarAgente(dadosImportados));
          salvarBanco(personagens);
          renderizarLista();
          alert("Ficha importada com sucesso!");
        } catch (err) {
          alert(
            "Erro ao importar a ficha. Verifique se o arquivo JSON é válido.",
          );
        }
        inputImportar.value = ""; // Limpa o input
      };
      reader.readAsText(file);
    });
  }
}

// ==========================================
// MÓDULO 2: PÁGINA DA FICHA (EDIÇÃO)
// ==========================================
const formFicha = document.getElementById("form-ficha");

if (formFicha) {
  const urlParams = new URLSearchParams(window.location.search);
  const agenteId = Number(urlParams.get("id")); // Number() lê IDs gigantes de Date.now() com mais precisão do que parseInt
  let agenteAtual = null;

  function carregarFichaNaTela() {
    const personagens = carregarBanco();
    agenteAtual = personagens.find((p) => p.id === agenteId);

    if (!agenteAtual) {
      window.location.assign("./index.html");
      return;
    }

    agenteAtual = normalizarAgente(agenteAtual);
    const index = personagens.findIndex((p) => p.id === agenteId);
    if (index !== -1) {
      personagens[index] = agenteAtual;
      salvarBanco(personagens);
    }

    const todosInputs = formFicha.querySelectorAll("input, textarea, select");

    todosInputs.forEach((campo) => {
      const partes = campo.id.split("-");
      if (partes.length === 2) {
        const categoria = partes[0];
        const chave = partes[1];

        if (
          agenteAtual[categoria] &&
          agenteAtual[categoria][chave] !== undefined
        ) {
          campo.value = agenteAtual[categoria][chave];
        }
      }
    });

    // Carregar preview da Imagem da Marca, se existir
    if (agenteAtual.habilidades && agenteAtual.habilidades.marca_img) {
      const marcaPreview = document.getElementById("marca-preview");
      const marcaPlaceholder = document.getElementById("marca-placeholder");
      if (marcaPreview) {
        marcaPreview.src = agenteAtual.habilidades.marca_img;
        marcaPreview.style.display = "block";
        if (marcaPlaceholder) marcaPlaceholder.style.display = "none";
      }
    }
  }

  formFicha.addEventListener("input", (evento) => {
    if (!agenteAtual) return;

    const elemento = evento.target;
    const partes = elemento.id.split("-");

    if (partes.length === 2) {
      const categoria = partes[0];
      const chave = partes[1];

      // Proteção: não atualizar os valores "base" dinamicamente, já que são inalteráveis
      if (chave.includes("_base")) return;

      const valorTratado =
        elemento.type === "number" ? Number(elemento.value) : elemento.value;

      if (!agenteAtual[categoria]) agenteAtual[categoria] = {};
      agenteAtual[categoria][chave] = valorTratado;

      const personagens = carregarBanco();
      const index = personagens.findIndex((p) => p.id === agenteId);
      if (index !== -1) {
        personagens[index] = agenteAtual;
        salvarBanco(personagens);
      }
    }
  });

  // Upload de Imagem na Seção da Marca
  const marcaUpload = document.getElementById("marca-upload");
  const marcaPreview = document.getElementById("marca-preview");
  const marcaPlaceholder = document.getElementById("marca-placeholder");
  if (marcaUpload && marcaPreview) {
    marcaUpload.addEventListener("change", (evento) => {
      const file = evento.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Img = e.target.result;
        marcaPreview.src = base64Img;
        marcaPreview.style.display = "block";
        if (marcaPlaceholder) marcaPlaceholder.style.display = "none";

        if (!agenteAtual) return;
        if (!agenteAtual.habilidades) agenteAtual.habilidades = {};
        agenteAtual.habilidades.marca_img = base64Img;

        const personagens = carregarBanco();
        const index = personagens.findIndex((p) => p.id === agenteId);
        if (index !== -1) {
          personagens[index] = agenteAtual;
          salvarBanco(personagens);
        }
      };
      reader.readAsDataURL(file); // Lê a imagem e converte para texto Base64 compatível com LocalStorage
    });
  }

  // Exportar Ficha (Download JSON)
  window.exportarFicha = function () {
    if (!agenteAtual) return;
    const dataStr = JSON.stringify(agenteAtual, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ficha_${agenteAtual.identidade.nome || "Agente_Desconhecido"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Importar Ficha Atual (Substitui os dados da ficha sendo editada)
  const inputImportarFicha = document.getElementById("importar-ficha-atual");
  if (inputImportarFicha) {
    inputImportarFicha.addEventListener("change", (evento) => {
      const file = evento.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const dadosImportados = JSON.parse(e.target.result);
          dadosImportados.id = agenteId; // Mantém o ID atual para sobrescrever a ficha sendo editada

          const personagens = carregarBanco();
          const index = personagens.findIndex((p) => p.id === agenteId);
          if (index !== -1) {
            personagens[index] = normalizarAgente(dadosImportados);
            salvarBanco(personagens);
            alert("Ficha importada e atualizada com sucesso!");
            location.reload(); // Recarrega para aplicar os novos dados na tela
          }
        } catch (err) {
          alert(
            "Erro ao importar a ficha. Verifique se o arquivo JSON é válido.",
          );
        }
        inputImportarFicha.value = "";
      };
      reader.readAsText(file);
    });
  }

  carregarFichaNaTela();
}

// ==========================================
// MÓDULO 3: TABELA DE SUCESSOS VISUAL
// ==========================================
function iniciarTabelaSucessos() {
  try {
    const tabelaSucessosDiv = document.getElementById("tabela-sucessos-visual");
    if (!tabelaSucessosDiv) return;

    // Evita duplicar caso já tenha sido desenhada
    if (tabelaSucessosDiv.querySelector("table")) return;

    tabelaSucessosDiv.innerHTML = ""; // Limpa qualquer resíduo

    function resultadoSucesso(valor, rolamento) {
      const falhaCritica = valor < 10 ? rolamento >= 19 : rolamento === 20;

      if (falhaCritica) return { letra: "C", classe: "success-critica" };
      if (rolamento > valor) return { letra: "F", classe: "success-falha" };
      if (rolamento <= Math.floor(valor / 5))
        return { letra: "E", classe: "success-extremo" };
      if (rolamento <= Math.floor(valor / 2))
        return { letra: "B", classe: "success-bom" };
      return { letra: "S", classe: "success-normal" };
    }

    const table = document.createElement("table");
    table.className = "success-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    const thCorner = document.createElement("th");
    thCorner.className = "axis";
    thCorner.textContent = "V \\ R";
    headerRow.appendChild(thCorner);

    for (let rolamento = 1; rolamento <= 20; rolamento++) {
      const th = document.createElement("th");
      th.textContent = rolamento;
      headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let valor = 1; valor <= 20; valor++) {
      const row = document.createElement("tr");
      const axis = document.createElement("th");
      axis.className = "axis";
      axis.textContent = valor;
      row.appendChild(axis);

      for (let rolamento = 1; rolamento <= 20; rolamento++) {
        const resultado = resultadoSucesso(valor, rolamento);
        const cell = document.createElement("td");
        cell.className = resultado.classe;
        cell.textContent = resultado.letra;
        row.appendChild(cell);
      }

      tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tabelaSucessosDiv.appendChild(table);
  } catch (err) {
    console.error("Erro ao desenhar a tabela de sucessos:", err);
  }
}

// Executa imediatamente
iniciarTabelaSucessos();

// Tenta executar novamente após a página carregar inteira (fallback seguro)
window.addEventListener("load", iniciarTabelaSucessos);
