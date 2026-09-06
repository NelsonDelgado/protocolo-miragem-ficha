// ==========================================
// CONFIGURAÇÕES E BANCO DE DADOS (FIREBASE)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  onSnapshot,
  where,
  arrayUnion,
  writeBatch,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

import { REGRAS } from "./regras.js?v=26";

const firebaseConfig = {
  // Dados de autenticacao firebase
  apiKey: "AIzaSyAgFIBWXG8rS0QrQLppRYK7L8saDc4apuc", // API Key
  authDomain: "protocolo-miragem.firebaseapp.com",
  projectId: "protocolo-miragem",
  storageBucket: "protocolo-miragem.firebasestorage.app",
  messagingSenderId: "809809431579",
  appId: "1:809809431579:web:1d1c36bf24f73896e1fcbe",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Estado Global da Aplicação
let currentUser = null;
let currentCampaignId = null;
let isCurrentUserMaster = false;
let masterCampaignsUnsubscribe = null;
let playerCampaignsUnsubscribe = null;
let agentesUnsubscribe = null;
let campanhaDadosUnsubscribe = null;
const cacheAgentesCampanha = new Map();

function atualizarUrlEstado(campaignId, escudoAberto) {
  if (typeof window === "undefined" || !window.history) return;
  const url = new URL(window.location);
  if (campaignId) {
    url.searchParams.set("campaign", campaignId);
  } else {
    url.searchParams.delete("campaign");
  }
  if (escudoAberto) {
    url.searchParams.set("escudo", "true");
  } else {
    url.searchParams.delete("escudo");
  }
  window.history.replaceState({}, "", url);
}

function pararOuvintesCampanha() {
  if (agentesUnsubscribe) {
    agentesUnsubscribe();
    agentesUnsubscribe = null;
  }
  if (campanhaDadosUnsubscribe) {
    campanhaDadosUnsubscribe();
    campanhaDadosUnsubscribe = null;
  }
  cacheAgentesCampanha.clear();
}

// Sistema de "Debounce" para não estourar os limites gratuitos de banco de dados
let saveTimeout;
async function salvarAgenteNuvem(agente) {
  try {
    await setDoc(doc(db, "agentes", String(agente.id)), agente);
  } catch (e) {
    console.error("Erro ao salvar na nuvem:", e);
  }
}

function salvarAgenteDebounced(agente) {
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    salvarAgenteNuvem(agente);
  }, 1500); // Salva 1,5 segundos após o usuário parar de interagir
}

// Objeto base inicializa o "Atual" igual à Base predefinida nas regras
function criarAgenteEmBranco(nomeInicial) {
  const newId = Date.now();
  return {
    id: newId,
    userId: currentUser ? currentUser.uid : "desconhecido", // Vincula a ficha ao utilizador atual
    campaignId:
      typeof currentCampaignId !== "undefined" ? currentCampaignId : null, // Vincula a ficha à campanha atual
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
      dirigir2: 0,
      dirigir2_base: 0,
      dirigir2_espec: "",
      dirigir3: 0,
      dirigir3_base: 0,
      dirigir3_espec: "",
      atualidades: 20,
      atualidades_base: 20,
      ciencia: 0,
      ciencia_base: 0,
      ciencia_espec: "",
      ciencia2: 0,
      ciencia2_base: 0,
      ciencia2_espec: "",

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
      religiao: 5,
      religiao_base: 5,
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
      artes2: 0,
      artes2_base: 0,
      artes2_espec: "",
      artes3: 0,
      artes3_base: 0,
      artes3_espec: "",
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
    perfil: {
      aparencia: "",
      foto_img: "",
      personalidade: "",
      traumas: [],
      notas: "",
    },
    recursos: {
      poupanca: "",
      salario: "",
      bens_materiais: [],
      carga_leve: "",
      carga_moderada: "",
      carga_maxima: "",
    },
    inventario: { carga: 0, peso: "", equipamentos: [], descricao: "" },
    combate: { rd: "", defesa: "", db: "" },
    habilidades: {
      lista: [],
      transformacoes: "",
      marca: "",
      rituais: [],
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
  const combinado = combinarEstruturaPadrao(criarAgenteEmBranco(nome), agente || {});

  // Compatibilidade retroativa com fichas antigas (onde campos eram texto puro ou arrays de strings):
  
  // 1. Traumas Clínicos (Fobias, Manias, Ferimentos, Maldições)
  if (typeof combinado.perfil?.traumas === "string") {
    const raw = combinado.perfil.traumas.trim();
    if (raw) {
      const linhas = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      combinado.perfil.traumas = linhas.map((linha, idx) => {
        const partes = linha.split(/:\s*(.+)/);
        return {
          id: Date.now() + idx,
          nome: partes[0] ? partes[0].trim() : linha,
          tipo: "fobia",
          efeito: partes[1] ? partes[1].trim() : "",
        };
      });
    } else {
      combinado.perfil.traumas = [];
    }
  } else if (Array.isArray(combinado.perfil?.traumas)) {
    combinado.perfil.traumas = combinado.perfil.traumas.map((t, idx) => {
      if (typeof t === "string") {
        const partes = t.split(/:\s*(.+)/);
        return {
          id: Date.now() + idx,
          nome: partes[0] ? partes[0].trim() : t,
          tipo: "fobia",
          efeito: partes[1] ? partes[1].trim() : "",
        };
      }
      return t;
    });
  } else {
    combinado.perfil.traumas = [];
  }

  // 2. Habilidades e Poderes
  if (typeof combinado.habilidades?.lista === "string") {
    const raw = combinado.habilidades.lista.trim();
    if (raw) {
      const blocos = raw.split(/\r?\n(?=[A-Za-z0-9À-ÿ])/);
      combinado.habilidades.lista = blocos.map((bloco, idx) => {
        const partes = bloco.split(/:\s*(.+)/s);
        const nome = partes[0] ? partes[0].trim() : `Habilidade ${idx + 1}`;
        const desc = partes[1] ? partes[1].trim() : bloco.trim();
        return {
          id: Date.now() + idx,
          nome: nome,
          tipo: "habilidade",
          categoria: "Geral",
          custo: "-",
          requisito: "-",
          descricao: desc,
        };
      });
    } else {
      combinado.habilidades.lista = [];
    }
  } else if (Array.isArray(combinado.habilidades?.lista)) {
    combinado.habilidades.lista = combinado.habilidades.lista.map((h, idx) => {
      if (typeof h === "string") {
        const partes = h.split(/:\s*(.+)/s);
        return {
          id: Date.now() + idx,
          nome: partes[0] ? partes[0].trim() : h,
          tipo: "habilidade",
          categoria: "Geral",
          custo: "-",
          requisito: "-",
          descricao: partes[1] ? partes[1].trim() : h,
        };
      }
      return h;
    });
  } else {
    combinado.habilidades.lista = [];
  }

  // 3. Rituais
  if (typeof combinado.habilidades?.rituais === "string") {
    const raw = combinado.habilidades.rituais.trim();
    if (raw) {
      const blocos = raw.split(/\r?\n(?=[A-Za-z0-9À-ÿ])/);
      combinado.habilidades.rituais = blocos.map((bloco, idx) => {
        const partes = bloco.split(/:\s*(.+)/s);
        const nome = partes[0] ? partes[0].trim() : `Ritual ${idx + 1}`;
        const desc = partes[1] ? partes[1].trim() : bloco.trim();
        return {
          id: Date.now() + idx,
          nome: nome,
          circulo: "1º Círculo",
          aspecto: "Geral",
          custo: "-",
          alc: "-",
          target: "-",
          duracao: "-",
          desc: desc,
        };
      });
    } else {
      combinado.habilidades.rituais = [];
    }
  } else if (Array.isArray(combinado.habilidades?.rituais)) {
    combinado.habilidades.rituais = combinado.habilidades.rituais.map((r, idx) => {
      if (typeof r === "string") {
        const partes = r.split(/:\s*(.+)/s);
        return {
          id: Date.now() + idx,
          nome: partes[0] ? partes[0].trim() : r,
          circulo: "1º Círculo",
          aspecto: "Geral",
          custo: "-",
          alc: "-",
          target: "-",
          duracao: "-",
          desc: partes[1] ? partes[1].trim() : r,
        };
      }
      return r;
    });
  } else {
    combinado.habilidades.rituais = [];
  }

  return combinado;
}

// ==========================================
// MÓDULO 0: AUTENTICAÇÃO E CONTROLE DE VIEW
// ==========================================
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const userEmailEl = document.getElementById("user-email");

async function migrarDadosAntigosParaFirebase() {
  // Desativado para evitar o uso de localStorage
  return;
}

if (loginView) {
  // Observador do estado de autenticação
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      loginView.classList.add("hidden");
      dashboardView.classList.remove("hidden");
      userEmailEl.textContent = user.displayName || user.email;

      // Corre o migrador primeiro, e só depois liga os ouvintes da campanha
      await migrarDadosAntigosParaFirebase();
      setupCampaignListeners();

      // Restaura o estado a partir da URL se a página foi atualizada (refresh)
      const urlParams = new URLSearchParams(window.location.search);
      const urlCampaignId = urlParams.get("campaign");
      const urlEscudo = urlParams.get("escudo") === "true";

      if (urlCampaignId) {
        try {
          const campSnap = await getDoc(doc(db, "campaigns", urlCampaignId));
          if (campSnap.exists()) {
            const campData = campSnap.data();
            const isMaster = campData.masterId === user.uid;
            const isPlayer =
              Array.isArray(campData.playerIds) &&
              campData.playerIds.includes(user.uid);

            if (isMaster || isPlayer) {
              if (window.abrirCampanha) {
                window.abrirCampanha(urlCampaignId, isMaster);
              }
              if (isMaster && urlEscudo && window.abrirEscudoMestre) {
                window.abrirEscudoMestre();
              }
            } else {
              atualizarUrlEstado(null, false);
            }
          } else {
            atualizarUrlEstado(null, false);
          }
        } catch (e) {
          console.error("Erro ao restaurar campanha da URL:", e);
          atualizarUrlEstado(null, false);
        }
      }
    } else {
      currentUser = null;
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      pararOuvintesCampanha();
      unsubscribeCampaignListeners();
      atualizarUrlEstado(null, false);
    }
  });

  // Evento de Login
  btnLogin.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Erro na autenticação:", error);
      alert("Falha ao fazer login.");
    }
  });

  // Evento de Logout
  btnLogout.addEventListener("click", async () => {
    await signOut(auth);
  });
}

// ==========================================
// MÓDULO 1: DASHBOARD DE CAMPANHAS
// ==========================================
const campaignDashboard = document.getElementById("campaign-dashboard");
const agentsView = document.getElementById("agents-view");
const campaignListDiv = document.getElementById("campaign-list");
const btnCreateCampaign = document.getElementById("btn-create-campaign");
const inputCampaignName = document.getElementById("input-campaign-name");
const btnJoinCampaign = document.getElementById("btn-join-campaign");
const inputCampaignCode = document.getElementById("input-campaign-code");
const btnBackToCampaigns = document.getElementById("btn-back-to-campaigns");

// Funcões Globais para Campanhas
function unsubscribeCampaignListeners() {
  if (masterCampaignsUnsubscribe) {
    masterCampaignsUnsubscribe();
    masterCampaignsUnsubscribe = null;
  }
  if (playerCampaignsUnsubscribe) {
    playerCampaignsUnsubscribe();
    playerCampaignsUnsubscribe = null;
  }
  if (campaignListDiv) campaignListDiv.innerHTML = "";
}

function setupCampaignListeners() {
  if (!currentUser || !campaignListDiv) return;
  unsubscribeCampaignListeners(); // Garante que não haja ouvintes duplicados

  campaignListDiv.innerHTML = `<p style="color:#aaa; text-align:center;">A procurar campanhas...</p>`;
  const campaigns = new Map();

  function renderCampaignList() {
    if (campaigns.size === 0) {
      campaignListDiv.innerHTML = `<p style="color:#aaa; text-align:center;">Nenhuma campanha encontrada.</p>`;
      return;
    }

    campaignListDiv.innerHTML = "";
    // Ordena as campanhas por nome para uma exibição consistente
    const sortedCampaigns = [...campaigns.entries()].sort((a, b) =>
      a[1].name.localeCompare(b[1].name),
    );

    sortedCampaigns.forEach(([id, data]) => {
      const campaignEl = document.createElement("div");
      campaignEl.className = "agent-wrapper";
      const masterBadge = data.isMaster
        ? '<span style="color:gold;font-size:12px;">[MESTRE]</span>'
        : "";
      const deleteBtn = data.isMaster
        ? `<button class="agent-delete-btn" onclick="deletarCampanha('${id}')" style="margin-top: 5px;">Apagar</button>`
        : "";
      campaignEl.innerHTML = `
          <button class="agent-center-btn" onclick="abrirCampanha('${id}', ${data.isMaster})">
            ${data.name} ${masterBadge}
          </button>
          <small style="color:#777; margin-top: 5px;">Código: ${id}</small>
          ${deleteBtn}
        `;
      campaignListDiv.appendChild(campaignEl);
    });
  }

  // Query para campanhas onde o utilizador é Mestre
  const masterQuery = query(
    collection(db, "campaigns"),
    where("masterId", "==", currentUser.uid),
  );
  masterCampaignsUnsubscribe = onSnapshot(
    masterQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          campaigns.delete(change.doc.id);
        } else {
          campaigns.set(change.doc.id, {
            ...change.doc.data(),
            isMaster: true,
          });
        }
      });
      renderCampaignList();
    },
    (error) => {
      console.error("Erro ao procurar campanhas Mestre:", error);
      campaignListDiv.innerHTML = `<p style="color:red; text-align:center;">Erro ao conectar. Verifique as regras do Firebase.</p>`;
    },
  );

  // Query para campanhas onde o utilizador é Jogador
  const playerQuery = query(
    collection(db, "campaigns"),
    where("playerIds", "array-contains", currentUser.uid),
  );
  playerCampaignsUnsubscribe = onSnapshot(
    playerQuery,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === "removed") {
          campaigns.delete(change.doc.id);
        } else {
          // Adiciona apenas se já não estiver na lista como Mestre (evita duplicados)
          if (!campaigns.has(change.doc.id)) {
            campaigns.set(change.doc.id, {
              ...change.doc.data(),
              isMaster: false,
            });
          }
        }
      });
      renderCampaignList();
    },
    (error) => {
      console.error("Erro ao procurar campanhas Jogador:", error);
    },
  );
}

if (campaignDashboard) {
  btnCreateCampaign.addEventListener("click", async () => {
    const name = inputCampaignName.value.trim();
    if (!name) return alert("Dê um nome à campanha.");

    // Gera um código de 6 caracteres para a campanha
    const campaignId = Math.random().toString(36).substring(2, 8).toUpperCase();

    await setDoc(doc(db, "campaigns", campaignId), {
      name: name,
      masterId: currentUser.uid,
      playerIds: [],
    });

    inputCampaignName.value = "";
  });

  btnJoinCampaign.addEventListener("click", async () => {
    const code = inputCampaignCode.value.trim().toUpperCase();
    if (!code) return alert("Insira um código de campanha.");

    // Dá feedback visual de que está a carregar
    btnJoinCampaign.innerText = "A entrar...";
    btnJoinCampaign.disabled = true;

    try {
      const campaignRef = doc(db, "campaigns", code);

      // Ao invés de ler (o que é bloqueado), tentamos forçar a atualização direta.
      // Se a campanha não existir ou a regra barrar, cairá direto no catch abaixo.
      await updateDoc(campaignRef, { playerIds: arrayUnion(currentUser.uid) });

      alert("Entrou na campanha com sucesso!");
      inputCampaignCode.value = "";
    } catch (error) {
      console.error("Erro ao entrar:", error);
      alert(
        "Erro! Verifique se o código está correto (ou se já faz parte desta campanha).",
      );
    } finally {
      btnJoinCampaign.innerText = "Entrar na Campanha";
      btnJoinCampaign.disabled = false;
    }
  });

  btnBackToCampaigns.addEventListener("click", () => {
    pararOuvintesCampanha();
    if (window.fecharEscudoMestre) window.fecharEscudoMestre();
    agentsView.classList.add("hidden");
    campaignDashboard.classList.remove("hidden");
    currentCampaignId = null;
    isCurrentUserMaster = false;
    atualizarUrlEstado(null, false);
  });

  window.abrirCampanha = (campaignId, isMaster) => {
    currentCampaignId = campaignId;
    isCurrentUserMaster = isMaster;
    if (agentsView) agentsView.classList.remove("hidden");
    if (campaignDashboard) campaignDashboard.classList.add("hidden");
    atualizarUrlEstado(campaignId, false);
    iniciarOuvinteAgentes();
    if (isMaster) {
      iniciarOuvinteDadosCampanha();
    }
  };

  window.deletarCampanha = async (campaignId) => {
    if (
      confirm(
        "Tem a certeza que deseja apagar esta campanha? Todos os jogadores perderão o acesso.",
      )
    ) {
      try {
        await deleteDoc(doc(db, "campaigns", String(campaignId)));
      } catch (error) {
        console.error("Erro ao apagar campanha:", error);
        alert("Erro ao apagar campanha. Verifique as permissões.");
      }
    }
  };
}

// ==========================================
// MÓDULO 2: LISTA DE AGENTES (DENTRO DA CAMPANHA)
// ==========================================
const listaDiv = document.getElementById("lista-personagens");
const btnNovo = document.getElementById("btn-novo-personagem");
const inputNovoNome = document.getElementById("input-novo-nome");
const btnEscudoMestre = document.getElementById("btn-escudo-mestre");
const escudoMestreOverlay = document.getElementById("escudo-mestre-overlay");
const btnCloseEscudo = document.getElementById("btn-close-escudo");
const escudoMestreContent = document.getElementById("escudo-mestre-content");

if (btnEscudoMestre && escudoMestreOverlay && btnCloseEscudo) {
  window.abrirEscudoMestre = () => {
    if (!isCurrentUserMaster) return;
    escudoMestreOverlay.classList.remove("hidden");
    atualizarUrlEstado(currentCampaignId, true);
  };

  window.fecharEscudoMestre = () => {
    escudoMestreOverlay.classList.add("hidden");
    const sucessosModal = document.getElementById("escudo-sucessos-modal");
    const notasModal = document.getElementById("escudo-notas-modal");
    if (sucessosModal) sucessosModal.classList.add("hidden");
    if (notasModal) notasModal.classList.add("hidden");
    if (currentCampaignId) {
      atualizarUrlEstado(currentCampaignId, false);
    }
  };

  btnEscudoMestre.addEventListener("click", () => {
    window.abrirEscudoMestre();
  });
  btnCloseEscudo.addEventListener("click", () => {
    window.fecharEscudoMestre();
  });

  // Configuração dos Sub-Modais (Tabela de Sucessos e Notas)
  const btnShowSucessos = document.getElementById("btn-show-sucessos");
  const btnCloseSucessos = document.getElementById("btn-close-sucessos");
  const btnShowNotas = document.getElementById("btn-show-notas");
  const btnCloseNotas = document.getElementById("btn-close-notas");
  const sucessosModal = document.getElementById("escudo-sucessos-modal");
  const notasModal = document.getElementById("escudo-notas-modal");

  if (btnShowSucessos && sucessosModal) {
    btnShowSucessos.addEventListener("click", () => {
      sucessosModal.classList.remove("hidden");
      desenharTabelaSucessosEscudo();
    });
  }
  if (btnCloseSucessos && sucessosModal) {
    btnCloseSucessos.addEventListener("click", () => {
      sucessosModal.classList.add("hidden");
    });
  }

  if (btnShowNotas && notasModal) {
    btnShowNotas.addEventListener("click", () => {
      notasModal.classList.remove("hidden");
    });
  }
  if (btnCloseNotas && notasModal) {
    btnCloseNotas.addEventListener("click", () => {
      notasModal.classList.add("hidden");
    });
  }
}

function desenharTabelaSucessosEscudo() {
  const tabelaDiv = document.getElementById("escudo-tabela-sucessos");
  if (!tabelaDiv || tabelaDiv.children.length > 0) return; // Já desenhada

  let html = '<table class="success-table"><thead><tr><th class="axis">V \\ R</th>';
  for (let r = 1; r <= 20; r++) html += `<th class="axis">${r}</th>`;
  html += "</tr></thead><tbody>";
  for (let v = 1; v <= 20; v++) {
    html += `<tr><th class="axis">${v}</th>`;
    for (let r = 1; r <= 20; r++) {
      const fc = (v < 10 && r >= 19) || (v >= 10 && r === 20);
      let c = "success-falha",
        l = "F";
      if (fc) {
        c = "success-critica";
        l = "C";
      } else if (r <= Math.floor(v / 5)) {
        c = "success-extremo";
        l = "E";
      } else if (r <= Math.floor(v / 2)) {
        c = "success-bom";
        l = "B";
      } else if (r <= v) {
        c = "success-normal";
        l = "S";
      }
      html += `<td class="${c}">${l}</td>`;
    }
    html += `</tr>`;
  }
  html += "</tbody></table>";
  tabelaDiv.innerHTML = html;
}

function iniciarOuvinteDadosCampanha() {
  if (!currentCampaignId) return;
  if (campanhaDadosUnsubscribe) {
    campanhaDadosUnsubscribe();
    campanhaDadosUnsubscribe = null;
  }

  const iniciativaTextarea = document.getElementById("escudo-mestre-iniciativa");
  const notasTextarea = document.getElementById("escudo-mestre-notas");

  if (iniciativaTextarea) {
    let timeoutSalvarIniciativa;
    iniciativaTextarea.oninput = (e) => {
      clearTimeout(timeoutSalvarIniciativa);
      const val = e.target.value;
      timeoutSalvarIniciativa = setTimeout(async () => {
        if (!currentCampaignId) return;
        try {
          await updateDoc(doc(db, "campaigns", currentCampaignId), {
            iniciativaMestre: val,
          });
        } catch (error) {
          console.error("Erro ao salvar iniciativa no Firebase:", error);
        }
      }, 1000);
    };
  }

  if (notasTextarea) {
    let timeoutSalvarNotas;
    notasTextarea.oninput = (e) => {
      clearTimeout(timeoutSalvarNotas);
      const val = e.target.value;
      timeoutSalvarNotas = setTimeout(async () => {
        if (!currentCampaignId) return;
        try {
          await updateDoc(doc(db, "campaigns", currentCampaignId), {
            notasMestre: val,
          });
        } catch (error) {
          console.error("Erro ao salvar notas no Firebase:", error);
        }
      }, 1000);
    };
  }

  campanhaDadosUnsubscribe = onSnapshot(
    doc(db, "campaigns", currentCampaignId),
    (docSnap) => {
      if (!docSnap.exists()) return;
      const data = docSnap.data();

      if (iniciativaTextarea && document.activeElement !== iniciativaTextarea) {
        iniciativaTextarea.value = data.iniciativaMestre || "";
      }
      if (notasTextarea && document.activeElement !== notasTextarea) {
        notasTextarea.value = data.notasMestre || "";
      }
    },
    (error) => {
      console.error("Erro no ouvinte de dados da campanha:", error);
    },
  );
}

function iniciarOuvinteAgentes() {
  if (!currentCampaignId || !listaDiv) return;
  if (agentesUnsubscribe) {
    agentesUnsubscribe();
    agentesUnsubscribe = null;
  }

  listaDiv.innerHTML = `<p style="color:#aaa; text-align:center;">A carregar agentes...</p>`;

  const q = query(
    collection(db, "agentes"),
    where("campaignId", "==", currentCampaignId),
  );

  agentesUnsubscribe = onSnapshot(
    q,
    (snapshot) => {
      cacheAgentesCampanha.clear();
      snapshot.forEach((docSnap) => {
        cacheAgentesCampanha.set(docSnap.id, {
          docId: docSnap.id,
          ...docSnap.data(),
        });
      });
      renderizarUiAgentes();
    },
    (error) => {
      console.error("Erro ao carregar lista de agentes em tempo real:", error);
      listaDiv.innerHTML = `<p style="color:red; text-align:center;">Erro de permissões ao carregar fichas.</p>`;
    },
  );
}

function renderizarUiAgentes() {
  if (!listaDiv) return;

  if (btnEscudoMestre) {
    if (isCurrentUserMaster) btnEscudoMestre.classList.remove("hidden");
    else btnEscudoMestre.classList.add("hidden");
  }

  if (cacheAgentesCampanha.size === 0) {
    listaDiv.className = "agents-grid";
    listaDiv.innerHTML = `<p style="color:#aaa; text-align:center;">Nenhum agente registrado nesta campanha.</p>`;
    if (escudoMestreContent) {
      escudoMestreContent.innerHTML = `<p style="color:#aaa; text-align:center; width:100%;">Nenhum agente registrado nesta campanha.</p>`;
    }
    return;
  }

  // 1. Renderiza lista de agentes normal na tela da campanha apenas quando necessário
  const existingAgentCards = listaDiv.querySelectorAll(".agent-card");
  let needsListaRerender = existingAgentCards.length !== cacheAgentesCampanha.size;
  if (!needsListaRerender) {
    for (const [docId] of cacheAgentesCampanha) {
      if (!document.getElementById(`agent-card-item-${docId}`)) {
        needsListaRerender = true;
        break;
      }
    }
  }

  if (needsListaRerender) {
    listaDiv.className = "agents-grid";
    listaDiv.innerHTML = "";

    cacheAgentesCampanha.forEach((agente, agenteDocId) => {
      const wrapper = document.createElement("div");
      wrapper.className = "agent-card";
      wrapper.id = `agent-card-item-${agenteDocId}`;

      const isOwner = currentUser && agente.userId === currentUser.uid;
      const canEdit = isOwner || isCurrentUserMaster;

      const fotoHtml =
        agente.perfil && agente.perfil.foto_img
          ? `<img src="${agente.perfil.foto_img}" alt="Foto de ${agente.identidade ? agente.identidade.nome : 'Agente'}">`
          : `<div style="color: #666; font-size: 11px; text-transform: uppercase; text-align: center; padding: 10px;">Sem Foto</div>`;

      const deleteButtonHtml = canEdit
        ? `<button class="agent-card-settings" onclick="deletarPersonagem('${agenteDocId}')" title="Apagar Agente">⚙️</button>`
        : "";

      const acessarButtonHtml = canEdit
        ? `<button class="agent-card-btn" onclick="abrirFicha('${agenteDocId}', true)">Acessar Ficha</button>`
        : `<button class="agent-card-btn" style="background: #444; color: #888; cursor: not-allowed;" disabled title="Acesso Restrito">Ficha Privada</button>`;

      const dataReg =
        agente.id && !isNaN(Number(agente.id))
          ? new Date(Number(agente.id)).toLocaleDateString("pt-BR")
          : "Data indisponível";

      wrapper.innerHTML = `
          <div class="agent-card-left">${fotoHtml}</div>
          <div class="agent-card-right">
            ${deleteButtonHtml}
            <h4 class="agent-card-name">${agente.identidade?.nome || "Desconhecido"}</h4>
            <p class="agent-card-role">${agente.identidade?.ocupacao || "Sem Ocupação"}</p>
            <p class="agent-card-date">Registrado em ${dataReg}</p>
            <div class="simple-card-actions">
              ${acessarButtonHtml}
            </div>
          </div>
        `;
      listaDiv.appendChild(wrapper);
    });
  }

  // 2. Renderiza os cartões dentro do Escudo do Mestre
  if (escudoMestreContent) {
    if (!isCurrentUserMaster) {
      escudoMestreContent.innerHTML = "";
      return;
    }

    // Remove cartões de agentes removidos
    const existingMasterCards = escudoMestreContent.querySelectorAll(".master-card");
    existingMasterCards.forEach((card) => {
      const cardDocId = card.id.replace("master-card-", "");
      if (!cacheAgentesCampanha.has(cardDocId)) {
        card.remove();
      }
    });

    cacheAgentesCampanha.forEach((agente, agenteDocId) => {
      const attr = agente.atributos || {};
      const st = agente.status || {};
      const ident = agente.identidade || {};
      const comb = agente.combate || {};

      const maxValPv = Number(st.pv_max) || 0;
      const pvMax = maxValPv > 0 ? maxValPv : 1;
      const pvCurrent = Number(st.pv) || 0;
      const pvPerc = Math.min(100, Math.max(0, (pvCurrent / pvMax) * 100));
      const isPvOver = maxValPv > 0 && pvCurrent > maxValPv;
      const pvOverText = isPvOver
        ? ` <span style="color:#ffd700; font-size:11px; text-shadow:0 0 3px #000;">(+${pvCurrent - maxValPv})</span>`
        : "";

      const maxValPd = Number(st.pd_max) || 0;
      const pdMax = maxValPd > 0 ? maxValPd : 1;
      const pdCurrent = Number(st.pd) || 0;
      const pdPerc = Math.min(100, Math.max(0, (pdCurrent / pdMax) * 100));
      const isPdOver = maxValPd > 0 && pdCurrent > maxValPd;
      const pdOverText = isPdOver
        ? ` <span style="color:#00ffff; font-size:11px; text-shadow:0 0 3px #000;">(+${pdCurrent - maxValPd})</span>`
        : "";

      let masterCard = document.getElementById(`master-card-${agenteDocId}`);

      if (masterCard) {
        // Atualiza in-place para não destruir o DOM nem congelar o browser
        const pvFill = masterCard.querySelector(".pv-fill");
        if (pvFill) {
          pvFill.style.width = `${pvPerc}%`;
          if (isPvOver) pvFill.classList.add("pv-overheal");
          else pvFill.classList.remove("pv-overheal");
        }
        const pvText = masterCard.querySelector(".mc-bar-text-pv");
        if (pvText) {
          pvText.innerHTML = `${pvCurrent} / ${st.pv_max || 0}${pvOverText}`;
        }
        const pvInput = masterCard.querySelector(`#mc-input-pv-${agenteDocId}`);
        if (pvInput && document.activeElement !== pvInput) {
          pvInput.value = pvCurrent;
        }

        const pdFill = masterCard.querySelector(".pd-fill");
        if (pdFill) {
          pdFill.style.width = `${pdPerc}%`;
          if (isPdOver) pdFill.classList.add("pd-overheal");
          else pdFill.classList.remove("pd-overheal");
        }
        const pdText = masterCard.querySelector(".mc-bar-text-pd");
        if (pdText) {
          pdText.innerHTML = `${pdCurrent} / ${st.pd_max || 0}${pdOverText}`;
        }
        const pdInput = masterCard.querySelector(`#mc-input-pd-${agenteDocId}`);
        if (pdInput && document.activeElement !== pdInput) {
          pdInput.value = pdCurrent;
        }
      } else {
        // Cria novo card caso ainda não exista
        const fotoHtml =
          agente.perfil && agente.perfil.foto_img
            ? `<img src="${agente.perfil.foto_img}" alt="Foto de ${ident.nome || 'Agente'}">`
            : `<div style="color: #666; font-size: 11px; text-transform: uppercase; text-align: center; padding: 10px;">Sem Foto</div>`;

        masterCard = document.createElement("div");
        masterCard.className = "master-card";
        masterCard.id = `master-card-${agenteDocId}`;

        masterCard.innerHTML = `
            <div class="mc-header">
              <div class="mc-foto">${fotoHtml}</div>
              <div class="mc-info">
                <h4 class="mc-name">${ident.nome || "Desconhecido"}</h4>
                <p class="mc-role">${ident.ocupacao || "Sem Ocupação"}</p>
                <p class="mc-level">NÍVEL: ${ident.total_niveis || "0"}</p>
              </div>
            </div>
            <div class="mc-attributes">
              <div><span>AGI</span><strong>${attr.agilidade || 0}</strong></div>
              <div><span>FOR</span><strong>${attr.forca || 0}</strong></div>
              <div><span>INT</span><strong>${attr.inteligencia || 0}</strong></div>
              <div><span>VIG</span><strong>${attr.vigor || 0}</strong></div>
              <div><span>COR</span><strong>${attr.corpo || 0}</strong></div>
              <div><span>CAR</span><strong>${attr.carisma || 0}</strong></div>
              <div><span>SAB</span><strong>${attr.sabedoria || 0}</strong></div>
            </div>
            <div class="mc-status-bars">
              <div class="mc-bar-container">
                <div class="mc-bar-label">VIDA</div>
                <div class="mc-bar-bg">
                  <div class="mc-bar-fill pv-fill ${isPvOver ? "pv-overheal" : ""}" style="width: ${pvPerc}%"></div>
                  <div class="mc-bar-text mc-bar-text-pv">${pvCurrent} / ${st.pv_max || 0}${pvOverText}</div>
                </div>
                <div class="mc-bar-controls">
                  <button type="button" class="mc-ctrl-btn pv-sub-big" title="Tirar 5 PV" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pv', -5)">-5</button>
                  <button type="button" class="mc-ctrl-btn pv-sub" title="Tirar 1 PV" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pv', -1)">-1</button>
                  <input type="number" class="mc-ctrl-input" id="mc-input-pv-${agenteDocId}" value="${pvCurrent}" min="0" onchange="definirStatusAgenteMestre('${agenteDocId}', 'pv', this.value)" onkeydown="if(event.key==='Enter') this.blur()" />
                  <button type="button" class="mc-ctrl-btn pv-add" title="Adicionar 1 PV" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pv', 1)">+1</button>
                  <button type="button" class="mc-ctrl-btn pv-add-big" title="Adicionar 5 PV" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pv', 5)">+5</button>
                </div>
              </div>
              <div class="mc-bar-container">
                <div class="mc-bar-label">DETERMINAÇÃO</div>
                <div class="mc-bar-bg">
                  <div class="mc-bar-fill pd-fill ${isPdOver ? "pd-overheal" : ""}" style="width: ${pdPerc}%"></div>
                  <div class="mc-bar-text mc-bar-text-pd">${pdCurrent} / ${st.pd_max || 0}${pdOverText}</div>
                </div>
                <div class="mc-bar-controls">
                  <button type="button" class="mc-ctrl-btn pd-sub-big" title="Tirar 5 PD" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pd', -5)">-5</button>
                  <button type="button" class="mc-ctrl-btn pd-sub" title="Tirar 1 PD" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pd', -1)">-1</button>
                  <input type="number" class="mc-ctrl-input" id="mc-input-pd-${agenteDocId}" value="${pdCurrent}" min="0" onchange="definirStatusAgenteMestre('${agenteDocId}', 'pd', this.value)" onkeydown="if(event.key==='Enter') this.blur()" />
                  <button type="button" class="mc-ctrl-btn pd-add" title="Adicionar 1 PD" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pd', 1)">+1</button>
                  <button type="button" class="mc-ctrl-btn pd-add-big" title="Adicionar 5 PD" onclick="alterarStatusAgenteMestre('${agenteDocId}', 'pd', 5)">+5</button>
                </div>
              </div>
            </div>
            <div class="mc-combat">
              <div><span>DEFESA</span><strong>${comb.defesa || 0}</strong></div>
              <div><span>RD</span><strong>${comb.rd || 0}</strong></div>
              <div><span>DB</span><strong>${comb.db || 0}</strong></div>
            </div>
            <div class="mc-footer">
              <button class="mc-btn-ficha" onclick="abrirFicha('${agenteDocId}', true)">Abrir Ficha do Agente</button>
            </div>
        `;
        escudoMestreContent.appendChild(masterCard);
      }
    });
  }
}

// Funções para alteração em tempo real pelo Mestre
window.alterarStatusAgenteMestre = async (agenteDocId, statKey, delta) => {
  const agente = cacheAgentesCampanha.get(agenteDocId);
  if (!agente) return;
  if (!agente.status) agente.status = {};
  const currentVal = Number(agente.status[statKey]) || 0;
  let novoVal = currentVal + delta;
  if (novoVal < 0) novoVal = 0;

  // Atualização imediata no cache local para resposta fluida sem congelamentos
  agente.status[statKey] = novoVal;
  renderizarUiAgentes();

  try {
    const agenteRef = doc(db, "agentes", String(agenteDocId));
    await updateDoc(agenteRef, {
      [`status.${statKey}`]: novoVal,
    });
  } catch (error) {
    console.error(`Erro ao atualizar ${statKey} do agente:`, error);
    alert(`Erro ao atualizar ${statKey.toUpperCase()}. Verifique as permissões.`);
  }
};

window.definirStatusAgenteMestre = async (agenteDocId, statKey, valorStr) => {
  const agente = cacheAgentesCampanha.get(agenteDocId);
  if (!agente) return;
  const num = parseInt(valorStr, 10);
  if (isNaN(num)) return;
  let novoVal = num;
  if (novoVal < 0) novoVal = 0;

  // Atualização imediata no cache local para resposta fluida sem congelamentos
  if (!agente.status) agente.status = {};
  agente.status[statKey] = novoVal;
  renderizarUiAgentes();

  try {
    const agenteRef = doc(db, "agentes", String(agenteDocId));
    await updateDoc(agenteRef, {
      [`status.${statKey}`]: novoVal,
    });
  } catch (error) {
    console.error(`Erro ao definir ${statKey} do agente:`, error);
    alert(`Erro ao definir ${statKey.toUpperCase()}. Verifique as permissões.`);
  }
};

window.renderizarListaAgentes = () => {
  iniciarOuvinteAgentes();
};



if (listaDiv && btnNovo) {
  btnNovo.addEventListener("click", async () => {
    const nome = inputNovoNome.value.trim();
    if (!nome) return alert("Por favor, digite um nome para o agente.");

    const novoAgente = criarAgenteEmBranco(nome);
    await salvarAgenteNuvem(novoAgente);
    abrirFicha(novoAgente.id);
  });

  window.abrirFicha = (id, canEdit = true) =>
    window.location.assign(`./ficha.html?id=${id}&readonly=${!canEdit}`);

  window.deletarPersonagem = async (id) => {
    if (
      confirm(
        "Excluir permanentemente este agente? As regras não permitem recuperação.",
      )
    ) {
      await deleteDoc(doc(db, "agentes", String(id)));
      renderizarListaAgentes();
    }
  };
}

// ==========================================
// MÓDULO 3: PÁGINA DA FICHA (EDIÇÃO)
// ==========================================
const formFicha = document.getElementById("form-ficha");

if (formFicha) {
  const urlParams = new URLSearchParams(window.location.search);
  const agenteId = Number(urlParams.get("id")); // Number() lê IDs gigantes de Date.now() com mais precisão do que parseInt
  const isReadOnly = urlParams.get("readonly") === "true";
  let agenteAtual = null;
  let pendingUpdates = {};
  let saveTimeoutFicha;

  const MELHORIAS_ARMAS = [
    { nome: "Mira Laser", peso: 0.5, desc: "+1 nos testes de ataque" },
    { nome: "Silenciador", peso: 0.5, desc: "Ataques furtivos" },
    { nome: "Mira Telescópica", peso: 1.0, desc: "Alcance dobrado" },
    { nome: "Cano Longo", peso: 1.0, desc: "+1d6 dano" }
  ];

  function calcularModificadorDeslocamento(traumas) {
    let mod = 0;
    if (!Array.isArray(traumas)) return mod;
    traumas.forEach(t => {
      if (t.tipo === 'ferimento') {
        const nome = t.nome.toLowerCase();
        if (nome.includes('perna')) {
          mod -= 3.0;
        } else if (nome.includes('rótula') || nome.includes('joelho')) {
          mod -= 2.0;
        } else if (nome.includes('pé') || nome.includes('tornozelo') || nome.includes('pe ')) {
          mod -= 1.5;
        }
      }
    });
    return mod;
  }

  function calcularEAtualizarCargaESpeed() {
  }

  function renderizarTraumas() {
    const container = document.getElementById("traumas-clinicos-container");
    if (!container) return;
    container.innerHTML = "";
    
    const traumas = Array.isArray(agenteAtual?.perfil?.traumas) ? agenteAtual.perfil.traumas : [];
    if (traumas.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-style: italic; font-size: 11px; margin: 0;">Nenhum trauma clínico registrado.</p>';
      return;
    }

    traumas.forEach((t, index) => {
      const card = document.createElement("div");
      card.className = "interactive-item-card";
      
      let badge = "Trauma";
      if (t.tipo === "ferimento") badge = "Ferimento Grave";
      else if (t.tipo === "mania") badge = "Mania";
      else if (t.tipo === "fobia") badge = "Fobia";
      else if (t.tipo === "maldicao") badge = "Maldição do Véu";
      else badge = "Fobia/Mania";
      const desc = t.efeito || t.descricao || "";

      card.innerHTML = `
        <div class="item-card-header">
          <span class="item-card-title">${t.nome}</span>
          ${isReadOnly ? "" : `
            <div class="item-card-actions">
              <button type="button" class="item-card-edit" onclick="window.editarTrauma(${index})">Editar</button>
              <button type="button" class="item-card-remove" onclick="window.removerTrauma(${index})">Remover</button>
            </div>
          `}
        </div>
        <div class="item-card-details">${badge}</div>
        ${desc ? `<div class="item-card-desc">${desc}</div>` : ""}
      `;
      container.appendChild(card);
    });
  }

  function renderizarEquipamentos() {
    const container = document.getElementById("inventario-equipamentos-lista");
    if (!container) return;
    container.innerHTML = "";

    const equipamentos = Array.isArray(agenteAtual?.inventario?.equipamentos) ? agenteAtual.inventario.equipamentos : [];
    if (equipamentos.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-style: italic; font-size: 11px; margin: 0;">Nenhum equipamento no inventário.</p>';
      return;
    }

    equipamentos.forEach((eq, index) => {
      const card = document.createElement("div");
      card.className = "interactive-item-card";

      const isArma = eq.tipo && (eq.tipo.toLowerCase().includes("cc") || eq.tipo.toLowerCase().includes("dist") || eq.tipo.toLowerCase().includes("arma"));
      const isAtaqueDisparo = isArma && eq.munMax > 0;
      
      let detailsStr = `Peso: ${eq.peso} kg`;
      if (eq.dano && eq.dano !== "-") detailsStr += ` | Dano: ${eq.dano}`;
      if (eq.fa && eq.fa !== "-") detailsStr += ` | Falha: ${eq.fa}`;

      let controlsHtml = `
        <div class="item-card-controls">
          <label>Qtd:
            <input type="number" min="1" value="${eq.qtd || 1}" ${isReadOnly ? "disabled" : ""} onchange="window.alterarQuantidadeEquipamento(${index}, this.value)" style="width: 40px;" />
          </label>
      `;

      if (isAtaqueDisparo) {
        controlsHtml += `
          <label>Munição:
            <input type="number" min="0" max="${eq.munMax}" value="${eq.mun || 0}" ${isReadOnly ? "disabled" : ""} onchange="window.alterarMunicaoEquipamento(${index}, this.value)" style="width: 45px;" />
            / ${eq.munMax}
          </label>
        `;
      }

      controlsHtml += `</div>`;

      let upgradesHtml = "";
      if (isArma && !isReadOnly) {
        upgradesHtml = `<div class="item-card-upgrades"><strong>Melhorias:</strong><br/>`;
        MELHORIAS_ARMAS.forEach(mel => {
          const checked = Array.isArray(eq.melhorias) && eq.melhorias.includes(mel.nome) ? "checked" : "";
          upgradesHtml += `
            <label style="margin-right: 8px; display: inline-block;">
              <input type="checkbox" ${checked} onchange="window.toggleUpgrade(${index}, '${mel.nome}', this.checked)" />
              ${mel.nome} (+${mel.peso}kg)
            </label>
          `;
        });
        upgradesHtml += `</div>`;
      } else if (isArma && Array.isArray(eq.melhorias) && eq.melhorias.length > 0) {
        upgradesHtml = `<div class="item-card-upgrades"><strong>Melhorias:</strong> ${eq.melhorias.join(", ")}</div>`;
      }

      card.innerHTML = `
        <div class="item-card-header">
          <span class="item-card-title">${eq.nome}</span>
          ${isReadOnly ? "" : `<button type="button" class="item-card-remove" onclick="window.removerEquipamento(${index})">Remover</button>`}
        </div>
        <div class="item-card-details">${detailsStr}</div>
        ${upgradesHtml}
        ${controlsHtml}
      `;
      container.appendChild(card);
    });
  }

  function renderizarBensMateriais() {
    const container = document.getElementById("recursos-bens_materiais-lista");
    if (!container) return;
    container.innerHTML = "";

    const bens = Array.isArray(agenteAtual?.recursos?.bens_materiais) ? agenteAtual.recursos.bens_materiais : [];
    if (bens.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-style: italic; font-size: 11px; margin: 0;">Nenhum bem material registrado.</p>';
      return;
    }

    bens.forEach((bem, index) => {
      const card = document.createElement("div");
      card.className = "interactive-item-card";

      const isMoradia = bem.tipo === "moradia";
      const detailsStr = isMoradia ? `Moradia | Custo: ${bem.preco || 0} Créditos` : `Veículo | Velocidade: ${bem.velocidade || "N/A"} | Custo: ${bem.preco || 0} Créditos`;

      let upgradesHtml = "";
      if (isMoradia && !isReadOnly) {
        upgradesHtml = `<div class="item-card-upgrades"><strong>Melhorias de Moradia:</strong><br/>`;
        REGRAS.melhoriasMoradia.forEach(mel => {
          const checked = Array.isArray(bem.upgrades) && bem.upgrades.includes(mel.nome) ? "checked" : "";
          upgradesHtml += `
            <label style="margin-right: 8px; display: inline-block;">
              <input type="checkbox" ${checked} onchange="window.toggleMoradiaUpgrade(${index}, '${mel.nome}', this.checked)" />
              ${mel.nome} (${mel.preco}¢)
            </label>
          `;
        });
        upgradesHtml += `</div>`;
      } else if (isMoradia && Array.isArray(bem.upgrades) && bem.upgrades.length > 0) {
        upgradesHtml = `<div class="item-card-upgrades"><strong>Melhorias:</strong> ${bem.upgrades.join(", ")}</div>`;
      }

      card.innerHTML = `
        <div class="item-card-header">
          <span class="item-card-title">${bem.nome}</span>
          ${isReadOnly ? "" : `<button type="button" class="item-card-remove" onclick="window.removerBemMaterial(${index})">Remover</button>`}
        </div>
        <div class="item-card-details">${detailsStr}</div>
        ${upgradesHtml}
      `;
      container.appendChild(card);
    });
  }

  function renderizarHabilidadesPoderes() {
    const container = document.getElementById("habilidades-lista-container");
    if (!container) return;
    container.innerHTML = "";

    const lista = Array.isArray(agenteAtual?.habilidades?.lista) ? agenteAtual.habilidades.lista : [];
    if (lista.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-style: italic; font-size: 11px; margin: 0;">Nenhuma habilidade ou poder registrado.</p>';
      return;
    }

    lista.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "interactive-item-card";

      const isPoder = item.tipo === "poder";
      let typeStr = isPoder
        ? `Poder de Incógnita - ${item.vertente}`
        : item.categoria === "Banda"
          ? `Habilidade de Banda (Equipe)`
          : `Habilidade - ${item.categoria}`;
      if (item.custo && item.custo !== "-") typeStr += ` | Custo: ${item.custo}`;

      let extraInfoHtml = "";
      if (isPoder && item.afinidade) {
        extraInfoHtml = `<div class="item-card-afinidade" style="font-size:10px; margin-top:2px;"><strong>Afinidade:</strong> ${item.afinidade}</div>`;
      } else if (!isPoder && item.requisito && item.requisito !== "-") {
        extraInfoHtml = `<div class="item-card-requisito" style="font-size:10px; margin-top:2px;"><strong>Requisito:</strong> ${item.requisito}</div>`;
      }

      card.innerHTML = `
        <div class="item-card-header">
          <span class="item-card-title">${item.nome}</span>
          ${isReadOnly ? "" : `
            <div class="item-card-actions">
              <button type="button" class="item-card-edit" onclick="window.editarHabilidadePoder(${index})">Editar</button>
              <button type="button" class="item-card-remove" onclick="window.removerHabilidadePoder(${index})">Remover</button>
            </div>
          `}
        </div>
        <div class="item-card-details">${typeStr}</div>
        <div class="item-card-desc">${item.descricao}</div>
        ${extraInfoHtml}
      `;
      container.appendChild(card);
    });
  }

  function renderizarRituais() {
    const container = document.getElementById("habilidades-rituais-lista");
    if (!container) return;
    container.innerHTML = "";

    const rituais = Array.isArray(agenteAtual?.habilidades?.rituais) ? agenteAtual.habilidades.rituais : [];
    if (rituais.length === 0) {
      container.innerHTML = '<p style="color: var(--muted); font-style: italic; font-size: 11px; margin: 0;">Nenhum ritual adicionado.</p>';
      return;
    }

    rituais.forEach((rit, index) => {
      const card = document.createElement("div");
      card.className = "interactive-item-card";

      let detailsStr = `Ritual ${rit.circulo} | Aspecto: ${rit.aspecto}`;
      if (rit.custo) detailsStr += ` | Custo: ${rit.custo}`;
      if (rit.alc && rit.alc !== "-") detailsStr += ` | Alcance: ${rit.alc}`;
      if (rit.target && rit.target !== "-") detailsStr += ` | Alvo: ${rit.target}`;
      if (rit.duracao && rit.duracao !== "-") detailsStr += ` | Duração: ${rit.duracao}`;

      card.innerHTML = `
        <div class="item-card-header">
          <span class="item-card-title">${rit.nome}</span>
          ${isReadOnly ? "" : `
            <div class="item-card-actions">
              <button type="button" class="item-card-edit" onclick="window.editarRitual(${index})">Editar</button>
              <button type="button" class="item-card-remove" onclick="window.removerRitual(${index})">Remover</button>
            </div>
          `}
        </div>
        <div class="item-card-details">${detailsStr}</div>
        <div class="item-card-desc">${rit.desc}</div>
      `;
      container.appendChild(card);
    });
  }

  function renderizarTudoInterativo() {
    renderizarTraumas();
    renderizarEquipamentos();
    renderizarBensMateriais();
    renderizarHabilidadesPoderes();
    renderizarRituais();
    calcularEAtualizarCargaESpeed();
  }

  let currentModalType = "";

  window.abrirModalSelecao = (tipo) => {
    if (isReadOnly) return;
    currentModalType = tipo;
    
    const modal = document.getElementById("regras-selecao-modal");
    const title = document.getElementById("modal-selecao-title");
    const searchInput = document.getElementById("modal-selecao-search");
    const filterSelect = document.getElementById("modal-selecao-filter");

    if (!modal) return;

    searchInput.value = "";
    searchInput.placeholder = "Fobia, Mania, Ferimento, Maldição, Habilidade, Poder, Ritual";
    filterSelect.innerHTML = '<option value="">Todos</option>';
    
    if (tipo === "fobia" || tipo === "mania" || tipo === "ferimento" || tipo === "maldicao") {
      if (tipo === "fobia") title.textContent = "Adicionar Fobia";
      else if (tipo === "mania") title.textContent = "Adicionar Mania";
      else if (tipo === "ferimento") title.textContent = "Adicionar Ferimento Grave";
      else if (tipo === "maldicao") title.textContent = "Adicionar Maldição do Véu";

      filterSelect.style.display = "block";
      filterSelect.innerHTML = "";
      const traumaOptions = [
        { val: "todas", label: "Todas as Opções" },
        { val: "fobia", label: "Fobias" },
        { val: "mania", label: "Manias" },
        { val: "ferimento", label: "Ferimentos Graves" },
        { val: "maldicao", label: "Maldições do Véu" }
      ];
      traumaOptions.forEach(optData => {
        const opt = document.createElement("option");
        opt.value = optData.val;
        opt.textContent = optData.label;
        filterSelect.appendChild(opt);
      });
      filterSelect.value = tipo;
    } else if (tipo === "habilidade") {
      title.textContent = "Adicionar Habilidade";
      filterSelect.style.display = "block";
      const cats = ["Combate", "Físico", "Intelectual", "Social", "Véu", "Banda"];
      cats.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        filterSelect.appendChild(opt);
      });
    } else if (tipo === "poder") {
      title.textContent = "Adicionar Poder de Incógnita";
      filterSelect.style.display = "block";
      const vertentes = ["Uncanny", "Paranoia", "Angústia", "Selvagem", "Nesting", "Erradicação", "Opressão", "Áurea"];
      vertentes.forEach(v => {
        const opt = document.createElement("option");
        opt.value = v;
        opt.textContent = v;
        filterSelect.appendChild(opt);
      });
    } else if (tipo === "ritual") {
      title.textContent = "Adicionar Ritual";
      filterSelect.style.display = "block";
      const circulos = ["Básico", "Soberano", "Absoluto"];
      circulos.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c;
        opt.textContent = c;
        filterSelect.appendChild(opt);
      });
    } else if (tipo === "equipamento") {
      title.textContent = "Adicionar Equipamento";
      filterSelect.style.display = "block";
      const cats = [
        { val: "armas", label: "Armas (Corpo a Corpo e Fogo)" },
        { val: "explosivos", label: "Explosivos" },
        { val: "gerais", label: "Equipamentos Gerais" },
        { val: "vestimentas", label: "Vestimentas e Proteções" },
        { val: "veu", label: "Equipamentos do Véu" }
      ];
      cats.forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.val;
        opt.textContent = c.label;
        filterSelect.appendChild(opt);
      });
    } else if (tipo === "moradia") {
      title.textContent = "Adicionar Moradia";
      filterSelect.style.display = "none";
    } else if (tipo === "veiculo") {
      title.textContent = "Adicionar Veículo";
      filterSelect.style.display = "none";
    }

    const btnCustom = document.getElementById("modal-selecao-btn-custom");
    if (btnCustom) {
      if (["fobia", "mania", "ferimento", "maldicao", "habilidade", "poder", "ritual"].includes(tipo)) {
        btnCustom.style.display = "flex";
        btnCustom.textContent = tipo === "ritual"
          ? "+ Criar Ritual Próprio"
          : (tipo === "habilidade"
            ? "+ Criar Habilidade Própria"
            : (tipo === "poder"
              ? "+ Criar Poder Próprio"
              : (tipo === "maldicao"
                ? "+ Criar Maldição Própria"
                : "+ Criar Próprio")));
        btnCustom.onclick = () => {
          modal.classList.add("hidden");
          if (tipo === "fobia" || tipo === "mania" || tipo === "ferimento" || tipo === "maldicao") {
            abrirEditorTrauma(-1, tipo);
          } else if (tipo === "habilidade" || tipo === "poder") {
            abrirEditorHabilidadePoder(-1, tipo);
          } else if (tipo === "ritual") {
            abrirEditorRitual(-1);
          }
        };
      } else {
        btnCustom.style.display = "none";
      }
    }

    filtrarItensModal();
    modal.classList.remove("hidden");
    setTimeout(() => {
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
    }, 60);
  };

  function normalizarTexto(str) {
    if (!str) return "";
    return String(str)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function filtrarItensModal() {
    const searchInput = document.getElementById("modal-selecao-search");
    const rawQuery = searchInput?.value || "";
    const filterVal = document.getElementById("modal-selecao-filter")?.value || "";
    const body = document.getElementById("modal-selecao-body");
    if (!body) return;
    body.innerHTML = "";

    let items = [];

    if (currentModalType === "fobia" || currentModalType === "mania" || currentModalType === "ferimento" || currentModalType === "maldicao") {
      const mode = (filterVal && ["fobia", "mania", "ferimento", "maldicao", "todas"].includes(filterVal)) ? filterVal : currentModalType;
      const modalTitle = document.getElementById("modal-selecao-title");
      if (modalTitle) {
        if (mode === "mania") modalTitle.textContent = "Adicionar Mania";
        else if (mode === "ferimento") modalTitle.textContent = "Adicionar Ferimento Grave";
        else if (mode === "maldicao") modalTitle.textContent = "Adicionar Maldição do Véu";
        else if (mode === "todas") modalTitle.textContent = "Adicionar Fobia, Mania, Ferimento ou Maldição";
        else modalTitle.textContent = "Adicionar Fobia";
      }

      const fobiaList = (REGRAS.fobias || []).map(f => ({
        id: f.id,
        nome: f.fobia,
        descricao: f.fobia_desc,
        detalhes: `Fobia (d100: #${f.id})`,
        tipo: "fobia",
        type: "fobia"
      }));

      const maniaList = (REGRAS.fobias || []).map(f => ({
        id: f.id,
        nome: f.mania,
        descricao: f.mania_desc,
        detalhes: `Mania (d100: #${f.id})`,
        tipo: "mania",
        type: "mania"
      }));

      const ferimentoList = (REGRAS.ferimentos || []).map(f => ({
        ...f,
        detalhes: `Ferimento Grave (d100: #${f.id})`,
        tipo: "ferimento",
        type: "ferimento"
      }));

      const maldicaoList = (REGRAS.maldicoes || []).map(m => ({
        id: m.id,
        nome: m.nome,
        descricao: m.efeito || m.desc,
        detalhes: `Maldição do Véu (d100: #${m.id})`,
        tipo: "maldicao",
        type: "maldicao"
      }));

      if (mode === "mania") items = maniaList;
      else if (mode === "ferimento") items = ferimentoList;
      else if (mode === "maldicao") items = maldicaoList;
      else if (mode === "todas") items = [...fobiaList, ...maniaList, ...ferimentoList, ...maldicaoList];
      else items = fobiaList;
    } else if (currentModalType === "habilidade") {
      items = REGRAS.habilidades.map(h => ({ ...h, type: "habilidade" }));
      if (filterVal) {
        items = items.filter(h => h.categoria === filterVal);
      }
    } else if (currentModalType === "poder") {
      items = REGRAS.poderes.map(p => ({ ...p, type: "poder" }));
      if (filterVal) {
        items = items.filter(p => p.vertente === filterVal);
      }
    } else if (currentModalType === "ritual") {
      items = REGRAS.rituais.map(r => ({ ...r, type: "ritual" }));
      if (filterVal) {
        items = items.filter(r => r.circulo === filterVal);
      }
    } else if (currentModalType === "equipamento") {
      const armas = REGRAS.armas.map(a => ({ ...a, eqType: "armas", category: "Arma" }));
      const explosivos = REGRAS.explosivos.map(e => ({ ...e, eqType: "explosivos", category: "Explosivo" }));
      const gerais = REGRAS.equipamentosGerais.map(g => ({ ...g, eqType: "gerais", category: "Geral" }));
      const vestimentas = REGRAS.vestimentas.map(v => ({ ...v, eqType: "vestimentas", category: "Vestimenta" }));
      const veu = REGRAS.equipamentosVeu.map(v => ({ ...v, eqType: "veu", category: "Véu" }));

      if (filterVal === "armas") items = armas;
      else if (filterVal === "explosivos") items = explosivos;
      else if (filterVal === "gerais") items = gerais;
      else if (filterVal === "vestimentas") items = vestimentas;
      else if (filterVal === "veu") items = veu;
      else {
        items = [...armas, ...explosivos, ...gerais, ...vestimentas, ...veu];
      }
    } else if (currentModalType === "moradia") {
      items = REGRAS.moradias.map(m => ({ ...m, type: "moradia" }));
    } else if (currentModalType === "veiculo") {
      items = REGRAS.veiculos.map(v => ({ ...v, type: "veiculo" }));
    }

    const queryNorm = normalizarTexto(rawQuery);
    if (queryNorm) {
      const termos = queryNorm.split(/\s+/).filter(Boolean);
      items = items.filter(item => {
        const pool = normalizarTexto([
          item.nome,
          item.descricao,
          item.desc,
          item.efeito,
          item.detalhes,
          item.categoria,
          item.vertente,
          item.circulo,
          item.aspecto,
          item.custo,
          item.requisito,
          item.afinidade,
          item.tipo,
          item.type,
          item.id != null ? `${item.id} #${item.id}` : ""
        ].filter(Boolean).join(" "));

        return termos.every(termo => pool.includes(termo));
      });
    }

    if (items.length === 0) {
      body.innerHTML = `
        <div style="text-align: center; padding: 28px 12px; color: var(--muted);">
          <p style="font-size: 14px; margin: 0 0 6px 0;">Nenhum item encontrado para <strong>"${escapeHtml(rawQuery)}"</strong>.</p>
          <p style="font-size: 12px; font-style: italic; margin: 0;">Podes usar o botão <strong>"+ Criar Próprio"</strong> acima para adicionares o teu próprio item!</p>
        </div>
      `;
      return;
    }

    items.forEach((item, idx) => {
      const row = document.createElement("div");
      row.className = "modal-list-item";

      let detailsStr = "";
      let descStr = item.descricao || item.desc || item.efeito || "";

      if (currentModalType === "habilidade") {
        detailsStr = `Categoria: ${item.categoria} | Custo: ${item.custo}`;
        if (item.requisito && item.requisito !== "-") detailsStr += ` | Requisito: ${item.requisito}`;
      } else if (currentModalType === "poder") {
        detailsStr = `Vertente: ${item.vertente} | Custo: ${item.custo}`;
        if (item.afinidade) detailsStr += ` | Afinidade: ${item.afinidade}`;
      } else if (currentModalType === "ritual") {
        detailsStr = `Circulo: ${item.circulo} | Aspecto: ${item.aspecto} | Custo: ${item.custo}`;
      } else if (currentModalType === "equipamento") {
        detailsStr = `${item.category} | Peso: ${item.peso} kg | Categoria: ${item.cat}`;
        if (item.dano) detailsStr += ` | Dano: ${item.dano}`;
      } else if (currentModalType === "moradia") {
        detailsStr = `Custo: ${item.preco} Créditos`;
      } else if (currentModalType === "veiculo") {
        detailsStr = `Tipo: ${item.tipo} | Velocidade: ${item.velocidade} | Custo: ${item.preco} Créditos`;
      } else if (item.detalhes) {
        detailsStr = item.detalhes;
      }

      row.innerHTML = `
        <div class="modal-list-item-header">
          <span class="modal-list-item-title">${item.nome}</span>
          <button type="button" class="modal-list-item-btn" id="modal-add-item-${idx}">+ Adicionar</button>
        </div>
        ${detailsStr ? `<div class="modal-list-item-details">${detailsStr}</div>` : ""}
        ${descStr ? `<div class="modal-list-item-desc">${descStr}</div>` : ""}
      `;

      body.appendChild(row);

      document.getElementById(`modal-add-item-${idx}`).onclick = () => {
        adicionarItem(item);
      };
    });
  }

  function adicionarItem(item) {
    if (isReadOnly || !agenteAtual) return;

    if (currentModalType === "fobia" || currentModalType === "mania" || currentModalType === "ferimento" || currentModalType === "maldicao") {
      if (!Array.isArray(agenteAtual.perfil.traumas)) agenteAtual.perfil.traumas = [];
      const itemTipo = item.tipo || item.type || currentModalType;
      agenteAtual.perfil.traumas.push({
        id: item.id,
        nome: item.nome,
        type: itemTipo,
        tipo: itemTipo,
        efeito: item.descricao || item.efeito || item.desc || ""
      });
      renderizarTraumas();
      calcularEAtualizarCargaESpeed();
      updateDoc(doc(db, "agentes", String(agenteId)), {
        "perfil.traumas": agenteAtual.perfil.traumas
      }).catch(e => console.error("Erro ao salvar trauma:", e));
    } else if (currentModalType === "equipamento") {
      if (!Array.isArray(agenteAtual.inventario.equipamentos)) agenteAtual.inventario.equipamentos = [];
      agenteAtual.inventario.equipamentos.push({
        id: item.id,
        nome: item.nome,
        tipo: item.tipo || item.category,
        peso: item.peso || 0,
        qtd: 1,
        mun: 0,
        munMax: parseInt(item.mun) || 0,
        melhorias: [],
        fa: item.fa || "-",
        dano: item.dano || "-"
      });
      renderizarEquipamentos();
      calcularEAtualizarCargaESpeed();
      salvarEquipamentosNuvem();
    } else if (currentModalType === "moradia") {
      if (!Array.isArray(agenteAtual.recursos.bens_materiais)) agenteAtual.recursos.bens_materiais = [];
      agenteAtual.recursos.bens_materiais.push({
        id: item.id,
        nome: item.nome,
        tipo: "moradia",
        preco: item.preco,
        upgrades: []
      });
      renderizarBensMateriais();
      salvarBensMateriaisNuvem();
    } else if (currentModalType === "veiculo") {
      if (!Array.isArray(agenteAtual.recursos.bens_materiais)) agenteAtual.recursos.bens_materiais = [];
      agenteAtual.recursos.bens_materiais.push({
        id: item.id,
        nome: item.nome,
        tipo: "veiculo",
        preco: item.preco,
        velocidade: item.velocidade || "N/A"
      });
      renderizarBensMateriais();
      salvarBensMateriaisNuvem();
    } else if (currentModalType === "habilidade") {
      if (!Array.isArray(agenteAtual.habilidades.lista)) agenteAtual.habilidades.lista = [];
      if (item.categoria === "Banda") {
        const totalBanda = agenteAtual.habilidades.lista.filter(x => x.categoria === "Banda").length;
        if (totalBanda >= 2) {
          return alert("Limite das Regras: Cada personagem pode ter no máximo 2 Habilidades de Banda.");
        }
      }
      agenteAtual.habilidades.lista.push({
        id: item.id,
        nome: item.nome,
        tipo: "habilidade",
        categoria: item.categoria,
        custo: item.custo,
        descricao: item.descricao,
        requisito: item.requisito || "-"
      });
      renderizarHabilidadesPoderes();
      calcularEAtualizarCargaESpeed();
      updateDoc(doc(db, "agentes", String(agenteId)), {
        "habilidades.lista": agenteAtual.habilidades.lista
      }).catch(e => console.error("Erro ao salvar habilidade:", e));
    } else if (currentModalType === "poder") {
      if (!Array.isArray(agenteAtual.habilidades.lista)) agenteAtual.habilidades.lista = [];
      agenteAtual.habilidades.lista.push({
        id: item.id,
        nome: item.nome,
        tipo: "poder",
        vertente: item.vertente,
        custo: item.custo,
        descricao: item.descricao,
        afinidade: item.afinidade || ""
      });
      renderizarHabilidadesPoderes();
      
      const numPoderes = agenteAtual.habilidades.lista.filter(x => x.tipo === "poder").length;
      const calculatedGC = 50 + numPoderes * 5;
      agenteAtual.status.gc = calculatedGC;
      const gcInput = document.getElementById("status-gc");
      if (gcInput) gcInput.value = calculatedGC;

      updateDoc(doc(db, "agentes", String(agenteId)), {
        "habilidades.lista": agenteAtual.habilidades.lista,
        "status.gc": calculatedGC
      }).catch(e => console.error("Erro ao salvar poder e GC:", e));
    } else if (currentModalType === "ritual") {
      if (!Array.isArray(agenteAtual.habilidades.rituais)) agenteAtual.habilidades.rituais = [];
      agenteAtual.habilidades.rituais.push({
        id: item.id,
        nome: item.nome,
        circulo: item.circulo,
        aspecto: item.aspecto,
        custo: item.custo,
        alc: item.alc,
        target: item.target,
        duracao: item.duracao,
        resistencia: item.resistencia,
        desc: item.desc
      });
      renderizarRituais();
      salvarRituaisNuvem();
    }

    document.getElementById("regras-selecao-modal").classList.add("hidden");
  }

  window.removerTrauma = (index) => {
    if (isReadOnly) return;
    agenteAtual.perfil.traumas.splice(index, 1);
    renderizarTraumas();
    calcularEAtualizarCargaESpeed();
    updateDoc(doc(db, "agentes", String(agenteId)), {
      "perfil.traumas": agenteAtual.perfil.traumas
    }).catch(e => console.error("Erro ao salvar traumas:", e));
  };

  window.removerEquipamento = (index) => {
    if (isReadOnly) return;
    agenteAtual.inventario.equipamentos.splice(index, 1);
    renderizarEquipamentos();
    calcularEAtualizarCargaESpeed();
    salvarEquipamentosNuvem();
  };

  window.alterarQuantidadeEquipamento = (index, value) => {
    if (isReadOnly) return;
    const val = parseInt(value) || 1;
    agenteAtual.inventario.equipamentos[index].qtd = val;
    calcularEAtualizarCargaESpeed();
    salvarEquipamentosNuvem();
  };

  window.alterarMunicaoEquipamento = (index, value) => {
    if (isReadOnly) return;
    const val = parseInt(value) || 0;
    agenteAtual.inventario.equipamentos[index].mun = val;
    salvarEquipamentosNuvem();
  };

  window.toggleUpgrade = (index, melNome, isChecked) => {
    if (isReadOnly) return;
    const eq = agenteAtual.inventario.equipamentos[index];
    if (!Array.isArray(eq.melhorias)) eq.melhorias = [];
    
    if (isChecked) {
      if (!eq.melhorias.includes(melNome)) eq.melhorias.push(melNome);
    } else {
      eq.melhorias = eq.melhorias.filter(m => m !== melNome);
    }
    
    renderizarEquipamentos();
    calcularEAtualizarCargaESpeed();
    salvarEquipamentosNuvem();
  };

  function salvarEquipamentosNuvem() {
    updateDoc(doc(db, "agentes", String(agenteId)), {
      "inventario.equipamentos": agenteAtual.inventario.equipamentos
    }).catch(e => console.error("Erro ao salvar equipamentos:", e));
  }

  window.removerBemMaterial = (index) => {
    if (isReadOnly) return;
    agenteAtual.recursos.bens_materiais.splice(index, 1);
    renderizarBensMateriais();
    salvarBensMateriaisNuvem();
  };

  window.toggleMoradiaUpgrade = (index, melNome, isChecked) => {
    if (isReadOnly) return;
    const bem = agenteAtual.recursos.bens_materiais[index];
    if (!Array.isArray(bem.upgrades)) bem.upgrades = [];

    if (isChecked) {
      if (!bem.upgrades.includes(melNome)) bem.upgrades.push(melNome);
    } else {
      bem.upgrades = bem.upgrades.filter(u => u !== melNome);
    }

    renderizarBensMateriais();
    salvarBensMateriaisNuvem();
  };

  function salvarBensMateriaisNuvem() {
    updateDoc(doc(db, "agentes", String(agenteId)), {
      "recursos.bens_materiais": agenteAtual.recursos.bens_materiais
    }).catch(e => console.error("Erro ao salvar bens materiais:", e));
  }

  window.removerHabilidadePoder = (index) => {
    if (isReadOnly) return;
    const item = agenteAtual.habilidades.lista[index];
    agenteAtual.habilidades.lista.splice(index, 1);
    
    renderizarHabilidadesPoderes();
    calcularEAtualizarCargaESpeed();

    if (item.tipo === "poder") {
      const numPoderes = agenteAtual.habilidades.lista.filter(x => x.tipo === "poder").length;
      const calculatedGC = 50 + numPoderes * 5;
      agenteAtual.status.gc = calculatedGC;
      const gcInput = document.getElementById("status-gc");
      if (gcInput) gcInput.value = calculatedGC;
      
      updateDoc(doc(db, "agentes", String(agenteId)), {
        "habilidades.lista": agenteAtual.habilidades.lista,
        "status.gc": calculatedGC
      }).catch(e => console.error("Erro ao salvar lista de habilidades e GC:", e));
    } else {
      updateDoc(doc(db, "agentes", String(agenteId)), {
        "habilidades.lista": agenteAtual.habilidades.lista
      }).catch(e => console.error("Erro ao salvar lista de habilidades:", e));
    }
  };

  window.removerRitual = (index) => {
    if (isReadOnly) return;
    agenteAtual.habilidades.rituais.splice(index, 1);
    renderizarRituais();
    salvarRituaisNuvem();
  };

  function salvarRituaisNuvem() {
    updateDoc(doc(db, "agentes", String(agenteId)), {
      "habilidades.rituais": agenteAtual.habilidades.rituais
    }).catch(e => console.error("Erro ao salvar rituais:", e));
  }

  function escapeHtml(str) {
    if (typeof str !== "string") return str == null ? "" : String(str);
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  let editingItemState = null;

  function fecharModalEditor() {
    const modal = document.getElementById("item-editor-modal");
    if (modal) modal.classList.add("hidden");
    editingItemState = null;
  }

  window.editarTrauma = (index) => {
    abrirEditorTrauma(index, null);
  };

  function abrirEditorTrauma(index, defaultTipo = "fobia") {
    if (isReadOnly || !agenteAtual) return;
    const isNew = index === -1;
    const item = !isNew && agenteAtual.perfil?.traumas?.[index]
      ? agenteAtual.perfil.traumas[index]
      : { tipo: defaultTipo || "fobia", nome: "", efeito: "" };

    editingItemState = { category: "trauma", index, isNew };

    const modal = document.getElementById("item-editor-modal");
    const title = document.getElementById("item-editor-title");
    const fields = document.getElementById("item-editor-fields");
    if (!modal || !fields) return;

    const itemTipo = item.tipo || item.type || defaultTipo || "fobia";
    if (title) {
      title.textContent = isNew ? "Adicionar Trauma ou Maldição" : "Editar (Fobia / Mania / Ferimento / Maldição)";
    }

    fields.innerHTML = `
      <div class="item-editor-group">
        <label for="editor-trauma-tipo">Tipo:</label>
        <select id="editor-trauma-tipo">
          <option value="fobia" ${itemTipo === "fobia" ? "selected" : ""}>Fobia</option>
          <option value="mania" ${itemTipo === "mania" ? "selected" : ""}>Mania</option>
          <option value="ferimento" ${itemTipo === "ferimento" ? "selected" : ""}>Ferimento Grave</option>
          <option value="maldicao" ${itemTipo === "maldicao" ? "selected" : ""}>Maldição do Véu</option>
        </select>
      </div>
      <div class="item-editor-group">
        <label for="editor-trauma-nome">Nome / Título:</label>
        <input type="text" id="editor-trauma-nome" value="${escapeHtml(item.nome || "")}" placeholder="Ex: Claustrofobia, Fratura Exposta, Maldição Vampiresca..." required />
      </div>
      <div class="item-editor-group">
        <label for="editor-trauma-efeito">Efeito / Descrição:</label>
        <textarea id="editor-trauma-efeito" rows="5" placeholder="Descreva os efeitos mecânicos ou narrativos..." required>${escapeHtml(item.efeito || item.descricao || "")}</textarea>
      </div>
    `;

    modal.classList.remove("hidden");
  }

  window.editarHabilidadePoder = (index) => {
    abrirEditorHabilidadePoder(index, null);
  };

  function abrirEditorHabilidadePoder(index, defaultTipo = "habilidade") {
    if (isReadOnly || !agenteAtual) return;
    const isNew = index === -1;
    const item = !isNew && agenteAtual.habilidades?.lista?.[index]
      ? agenteAtual.habilidades.lista[index]
      : { tipo: defaultTipo || "habilidade", nome: "", categoria: "Combate", vertente: "Tempo", custo: "-", requisito: "-", afinidade: "", descricao: "" };

    editingItemState = { category: "habilidade_poder", index, isNew };

    const modal = document.getElementById("item-editor-modal");
    const title = document.getElementById("item-editor-title");
    const fields = document.getElementById("item-editor-fields");
    if (!modal || !fields) return;

    const tipo = item.tipo || defaultTipo || "habilidade";
    const isPoder = tipo === "poder";
    if (title) {
      title.textContent = isNew
        ? (isPoder ? "Adicionar Poder de Incógnita" : "Adicionar Habilidade")
        : (isPoder ? "Editar Poder de Incógnita" : "Editar Habilidade");
    }

    fields.innerHTML = `
      <div class="item-editor-group">
        <label for="editor-hab-tipo">Tipo:</label>
        <select id="editor-hab-tipo">
          <option value="habilidade" ${!isPoder ? "selected" : ""}>Habilidade</option>
          <option value="poder" ${isPoder ? "selected" : ""}>Poder de Incógnita</option>
        </select>
      </div>
      <div class="item-editor-group">
        <label for="editor-hab-nome">Nome:</label>
        <input type="text" id="editor-hab-nome" value="${escapeHtml(item.nome || "")}" placeholder="Nome da Habilidade ou Poder..." required />
      </div>

      <div id="editor-sub-habilidade" style="display: ${isPoder ? "none" : "flex"}; flex-direction: column; gap: 12px;">
        <div class="item-editor-row">
          <div class="item-editor-group">
            <label for="editor-hab-categoria">Categoria:</label>
            <input type="text" id="editor-hab-categoria" list="lista-categorias-hab" value="${escapeHtml(item.categoria || "Combate")}" placeholder="Ex: Combate, Físico, Banda..." />
            <datalist id="lista-categorias-hab">
              <option value="Combate"></option>
              <option value="Físico"></option>
              <option value="Intelectual"></option>
              <option value="Social"></option>
              <option value="Véu"></option>
              <option value="Banda"></option>
            </datalist>
          </div>
          <div class="item-editor-group">
            <label for="editor-hab-custo">Custo:</label>
            <input type="text" id="editor-hab-custo" value="${escapeHtml(item.custo || "-")}" placeholder="Ex: 1 PM, 2 PE, -" />
          </div>
        </div>
        <div class="item-editor-group">
          <label for="editor-hab-requisito">Requisito:</label>
          <input type="text" id="editor-hab-requisito" value="${escapeHtml(item.requisito || "-")}" placeholder="Ex: Luta 50%, Intelectual..." />
        </div>
      </div>

      <div id="editor-sub-poder" style="display: ${isPoder ? "flex" : "none"}; flex-direction: column; gap: 12px;">
        <div class="item-editor-row">
          <div class="item-editor-group">
            <label for="editor-hab-vertente">Vertente:</label>
            <input type="text" id="editor-hab-vertente" list="lista-vertentes-poder" value="${escapeHtml(item.vertente || "Tempo")}" placeholder="Ex: Tempo, Mente, Sombra..." />
            <datalist id="lista-vertentes-poder">
              <option value="Uncanny"></option>
              <option value="Paranoia"></option>
              <option value="Angústia"></option>
              <option value="Selvagem"></option>
              <option value="Nesting"></option>
              <option value="Erradicação"></option>
              <option value="Opressão"></option>
              <option value="Áurea"></option>
              <option value="Alteração"></option>
              <option value="Cinética"></option>
              <option value="Dimensão"></option>
              <option value="Espaço"></option>
              <option value="Matéria"></option>
              <option value="Mente"></option>
              <option value="Sentidos"></option>
              <option value="Sombra"></option>
              <option value="Tempo"></option>
            </datalist>
          </div>
          <div class="item-editor-group">
            <label for="editor-hab-custo-poder">Custo:</label>
            <input type="text" id="editor-hab-custo-poder" value="${escapeHtml(item.custo || "-")}" placeholder="Ex: 1 PM, 2 PE, -" />
          </div>
        </div>
        <div class="item-editor-group">
          <label for="editor-hab-afinidade">Afinidade:</label>
          <input type="text" id="editor-hab-afinidade" value="${escapeHtml(item.afinidade || "")}" placeholder="Ex: Mente 3, -" />
        </div>
      </div>

      <div class="item-editor-group">
        <label for="editor-hab-descricao">Descrição / Efeito:</label>
        <textarea id="editor-hab-descricao" rows="5" placeholder="Descrição completa..." required>${escapeHtml(item.descricao || "")}</textarea>
      </div>
    `;

    const tipoSelect = document.getElementById("editor-hab-tipo");
    if (tipoSelect) {
      tipoSelect.onchange = () => {
        const nowPoder = tipoSelect.value === "poder";
        const subHab = document.getElementById("editor-sub-habilidade");
        const subPod = document.getElementById("editor-sub-poder");
        if (subHab) subHab.style.display = nowPoder ? "none" : "flex";
        if (subPod) subPod.style.display = nowPoder ? "flex" : "none";
        if (title) {
          title.textContent = isNew
            ? (nowPoder ? "Adicionar Poder de Incógnita" : "Adicionar Habilidade")
            : (nowPoder ? "Editar Poder de Incógnita" : "Editar Habilidade");
        }
      };
    }

    modal.classList.remove("hidden");
  }

  window.editarRitual = (index) => {
    abrirEditorRitual(index);
  };

  function abrirEditorRitual(index) {
    if (isReadOnly || !agenteAtual) return;
    const isNew = index === -1;
    const item = !isNew && agenteAtual.habilidades?.rituais?.[index]
      ? agenteAtual.habilidades.rituais[index]
      : { nome: "", circulo: "Básico", aspecto: "", custo: "", alc: "", target: "", duracao: "", resistencia: "-", desc: "" };

    editingItemState = { category: "ritual", index, isNew };

    const modal = document.getElementById("item-editor-modal");
    const title = document.getElementById("item-editor-title");
    const fields = document.getElementById("item-editor-fields");
    if (!modal || !fields) return;

    if (title) {
      title.textContent = isNew ? "Adicionar Ritual Personalizado" : "Editar Ritual";
    }

    fields.innerHTML = `
      <div class="item-editor-group">
        <label for="editor-rit-nome">Nome do Ritual:</label>
        <input type="text" id="editor-rit-nome" value="${escapeHtml(item.nome || "")}" placeholder="Nome do ritual..." required />
      </div>
      <div class="item-editor-row">
        <div class="item-editor-group">
          <label for="editor-rit-circulo">Círculo:</label>
          <input type="text" id="editor-rit-circulo" list="lista-circulos-rit" value="${escapeHtml(item.circulo || "Básico")}" placeholder="Ex: Básico, Soberano, Absoluto..." />
          <datalist id="lista-circulos-rit">
            <option value="Básico"></option>
            <option value="Soberano"></option>
            <option value="Absoluto"></option>
            <option value="1º Círculo"></option>
            <option value="2º Círculo"></option>
            <option value="3º Círculo"></option>
            <option value="4º Círculo"></option>
            <option value="5º Círculo"></option>
          </datalist>
        </div>
        <div class="item-editor-group">
          <label for="editor-rit-aspecto">Aspecto:</label>
          <input type="text" id="editor-rit-aspecto" value="${escapeHtml(item.aspecto || "")}" placeholder="Ex: Tempo, Mente, Sangue..." />
        </div>
      </div>
      <div class="item-editor-row">
        <div class="item-editor-group">
          <label for="editor-rit-custo">Custo:</label>
          <input type="text" id="editor-rit-custo" value="${escapeHtml(item.custo || "")}" placeholder="Ex: 1 PE, 2 PE + 1 PM..." />
        </div>
        <div class="item-editor-group">
          <label for="editor-rit-resistencia">Resistência:</label>
          <input type="text" id="editor-rit-resistencia" value="${escapeHtml(item.resistencia || "-")}" placeholder="Ex: Vontade anula, -" />
        </div>
      </div>
      <div class="item-editor-row">
        <div class="item-editor-group">
          <label for="editor-rit-alc">Alcance:</label>
          <input type="text" id="editor-rit-alc" value="${escapeHtml(item.alc || "")}" placeholder="Ex: Curto, Toque, Médio..." />
        </div>
        <div class="item-editor-group">
          <label for="editor-rit-target">Alvo:</label>
          <input type="text" id="editor-rit-target" value="${escapeHtml(item.target || "")}" placeholder="Ex: 1 pessoa, Você..." />
        </div>
      </div>
      <div class="item-editor-group">
        <label for="editor-rit-duracao">Duração:</label>
        <input type="text" id="editor-rit-duracao" value="${escapeHtml(item.duracao || "")}" placeholder="Ex: Instantâneo, Cena..." />
      </div>
      <div class="item-editor-group">
        <label for="editor-rit-desc">Descrição / Efeito:</label>
        <textarea id="editor-rit-desc" rows="6" placeholder="Descrição completa do ritual..." required>${escapeHtml(item.desc || item.descricao || "")}</textarea>
      </div>
    `;

    modal.classList.remove("hidden");
  }

  const setupItemEditor = () => {
    const modal = document.getElementById("item-editor-modal");
    const closeBtn = document.getElementById("item-editor-close");
    const cancelBtn = document.getElementById("item-editor-cancel");
    const form = document.getElementById("item-editor-form");

    if (closeBtn) closeBtn.onclick = fecharModalEditor;
    if (cancelBtn) cancelBtn.onclick = fecharModalEditor;
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) fecharModalEditor();
      };
    }

    if (form) {
      form.onsubmit = (e) => {
        e.preventDefault();
        if (isReadOnly || !agenteAtual || !editingItemState) return;

        const { category, index, isNew } = editingItemState;

        if (category === "trauma") {
          const tipo = document.getElementById("editor-trauma-tipo").value;
          const nome = document.getElementById("editor-trauma-nome").value.trim();
          const efeito = document.getElementById("editor-trauma-efeito").value.trim();
          if (!nome) return alert("Por favor, preencha o nome do trauma.");

          if (!Array.isArray(agenteAtual.perfil.traumas)) agenteAtual.perfil.traumas = [];
          const traumaObj = {
            id: isNew ? Date.now() : (agenteAtual.perfil.traumas[index]?.id || Date.now()),
            nome,
            tipo,
            type: tipo,
            efeito
          };

          if (isNew) {
            agenteAtual.perfil.traumas.push(traumaObj);
          } else {
            agenteAtual.perfil.traumas[index] = traumaObj;
          }

          renderizarTraumas();
          calcularEAtualizarCargaESpeed();
          updateDoc(doc(db, "agentes", String(agenteId)), {
            "perfil.traumas": agenteAtual.perfil.traumas
          }).catch(err => console.error("Erro ao salvar trauma:", err));

        } else if (category === "habilidade_poder") {
          const tipo = document.getElementById("editor-hab-tipo").value;
          const nome = document.getElementById("editor-hab-nome").value.trim();
          const descricao = document.getElementById("editor-hab-descricao").value.trim();
          if (!nome) return alert("Por favor, preencha o nome.");

          if (!Array.isArray(agenteAtual.habilidades.lista)) agenteAtual.habilidades.lista = [];

          if (tipo === "habilidade") {
            const categoria = document.getElementById("editor-hab-categoria").value.trim() || "Combate";
            const custo = document.getElementById("editor-hab-custo").value.trim() || "-";
            const requisito = document.getElementById("editor-hab-requisito").value.trim() || "-";

            if (categoria === "Banda") {
              const totalBanda = agenteAtual.habilidades.lista.filter((x, i) => x.categoria === "Banda" && (!isNew ? i !== index : true)).length;
              if (totalBanda >= 2) {
                return alert("Limite das Regras: Cada personagem pode ter no máximo 2 Habilidades de Banda.");
              }
            }

            const habObj = {
              id: isNew ? Date.now() : (agenteAtual.habilidades.lista[index]?.id || Date.now()),
              nome,
              tipo: "habilidade",
              categoria,
              custo,
              descricao,
              requisito
            };

            if (isNew) {
              agenteAtual.habilidades.lista.push(habObj);
            } else {
              agenteAtual.habilidades.lista[index] = habObj;
            }
          } else {
            const vertente = document.getElementById("editor-hab-vertente").value.trim() || "Tempo";
            const custo = document.getElementById("editor-hab-custo-poder").value.trim() || "-";
            const afinidade = document.getElementById("editor-hab-afinidade").value.trim() || "";

            const poderObj = {
              id: isNew ? Date.now() : (agenteAtual.habilidades.lista[index]?.id || Date.now()),
              nome,
              tipo: "poder",
              vertente,
              custo,
              descricao,
              afinidade
            };

            if (isNew) {
              agenteAtual.habilidades.lista.push(poderObj);
            } else {
              agenteAtual.habilidades.lista[index] = poderObj;
            }
          }

          renderizarHabilidadesPoderes();
          calcularEAtualizarCargaESpeed();

          const numPoderes = agenteAtual.habilidades.lista.filter(x => x.tipo === "poder").length;
          const calculatedGC = 50 + numPoderes * 5;
          agenteAtual.status.gc = calculatedGC;
          const gcInput = document.getElementById("status-gc");
          if (gcInput) gcInput.value = calculatedGC;

          updateDoc(doc(db, "agentes", String(agenteId)), {
            "habilidades.lista": agenteAtual.habilidades.lista,
            "status.gc": calculatedGC
          }).catch(err => console.error("Erro ao salvar habilidades e GC:", err));

        } else if (category === "ritual") {
          const nome = document.getElementById("editor-rit-nome").value.trim();
          const circulo = document.getElementById("editor-rit-circulo").value.trim() || "Básico";
          const aspecto = document.getElementById("editor-rit-aspecto").value.trim() || "-";
          const custo = document.getElementById("editor-rit-custo").value.trim() || "-";
          const alc = document.getElementById("editor-rit-alc").value.trim() || "-";
          const target = document.getElementById("editor-rit-target").value.trim() || "-";
          const duracao = document.getElementById("editor-rit-duracao").value.trim() || "-";
          const resistencia = document.getElementById("editor-rit-resistencia").value.trim() || "-";
          const desc = document.getElementById("editor-rit-desc").value.trim();
          if (!nome) return alert("Por favor, preencha o nome do ritual.");

          if (!Array.isArray(agenteAtual.habilidades.rituais)) agenteAtual.habilidades.rituais = [];

          const ritObj = {
            id: isNew ? Date.now() : (agenteAtual.habilidades.rituais[index]?.id || Date.now()),
            nome,
            circulo,
            aspecto,
            custo,
            alc,
            target,
            duracao,
            resistencia,
            desc
          };

          if (isNew) {
            agenteAtual.habilidades.rituais.push(ritObj);
          } else {
            agenteAtual.habilidades.rituais[index] = ritObj;
          }

          renderizarRituais();
          salvarRituaisNuvem();
        }

        fecharModalEditor();
      };
    }
  };

  const setupInteractiveButtons = () => {
    setupItemEditor();
    const addFobia = document.getElementById("btn-add-fobia");
    const addMania = document.getElementById("btn-add-mania");
    const addFerimento = document.getElementById("btn-add-ferimento");
    const addMaldicao = document.getElementById("btn-add-maldicao");
    
    const addHabilidade = document.getElementById("btn-add-habilidade");
    const addPoder = document.getElementById("btn-add-poder");
    
    const addRitual = document.getElementById("btn-add-ritual");

    if (addFobia) addFobia.onclick = () => abrirModalSelecao("fobia");
    if (addMania) addMania.onclick = () => abrirModalSelecao("mania");
    if (addFerimento) addFerimento.onclick = () => abrirModalSelecao("ferimento");
    if (addMaldicao) addMaldicao.onclick = () => abrirModalSelecao("maldicao");
    
    if (addHabilidade) addHabilidade.onclick = () => abrirModalSelecao("habilidade");
    if (addPoder) addPoder.onclick = () => abrirModalSelecao("poder");
    
    if (addRitual) addRitual.onclick = () => abrirModalSelecao("ritual");

    // Lógica para fechar o modal de seleção de regras
    const modalSelecao = document.getElementById("regras-selecao-modal");
    const closeSelecao = document.getElementById("modal-selecao-close");
    if (closeSelecao && modalSelecao) {
      closeSelecao.onclick = () => {
        modalSelecao.classList.add("hidden");
      };
      modalSelecao.onclick = (e) => {
        if (e.target === modalSelecao) {
          modalSelecao.classList.add("hidden");
        }
      };
    }

    // Lógica para busca e filtragem em tempo real no modal
    const searchInput = document.getElementById("modal-selecao-search");
    const filterSelect = document.getElementById("modal-selecao-filter");
    if (searchInput) {
      searchInput.oninput = () => filtrarItensModal();
    }
    if (filterSelect) {
      filterSelect.onchange = () => filtrarItensModal();
    }
  };

  // Lógica de Modo Escuro
  const btnDarkMode = document.getElementById("btn-dark-mode");
  
  function aplicarTema(tema) {
    if (tema === "dark") {
      document.body.classList.add("dark-theme");
      if (btnDarkMode) btnDarkMode.innerHTML = "☀️";
    } else {
      document.body.classList.remove("dark-theme");
      if (btnDarkMode) btnDarkMode.innerHTML = "🌙";
    }
  }

  // Verificar preferência do sistema
  const prefEscuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
  aplicarTema(prefEscuro ? "dark" : "light");

  if (btnDarkMode) {
    btnDarkMode.addEventListener("click", () => {
      const eEscuro = document.body.classList.contains("dark-theme");
      const novoTema = eEscuro ? "light" : "dark";
      aplicarTema(novoTema);
    });
  }
  function atualizarCampoDebounced(categoria, chave, valor) {
    pendingUpdates[`${categoria}.${chave}`] = valor;
    clearTimeout(saveTimeoutFicha);
    saveTimeoutFicha = setTimeout(async () => {
      const updates = { ...pendingUpdates };
      pendingUpdates = {}; // limpa para o próximo lote
      try {
        await updateDoc(doc(db, "agentes", String(agenteId)), updates);
      } catch (e) {
        console.error("Erro ao atualizar campo:", e);
        alert(
          "Falha ao salvar: Você não tem permissão para editar esta ficha ou o campo.",
        );
      }
    }, 1000);
  }

  function atualizarIndicadoresPericiaDiv5() {
    const periciaInputs = formFicha.querySelectorAll(".linha-pericia input[type='number']:not(.input-base-fixa)");
    periciaInputs.forEach((input) => {
      const val = parseInt(input.value, 10) || 0;
      const div5Span = input.nextElementSibling;
      if (div5Span && div5Span.classList.contains("pericia-div5")) {
        div5Span.textContent = `(${Math.floor(val / 5)})`;
      }
    });
  }

  function carregarFichaNaTela() {
    const docRef = doc(db, "agentes", String(agenteId));

    // O "onSnapshot" mantém a ficha atualizada em tempo real se o mestre alterar algo!
    onSnapshot(docRef, async (docSnap) => {
      if (!docSnap.exists()) {
        window.location.assign("./index.html");
        return;
      }

      const data = docSnap.data();

      // Verificação de Privacidade (Apenas dono ou mestre podem abrir a ficha)
      const isOwner = data.userId === currentUser.uid;
      let isMaster = false;

      if (data.campaignId) {
        try {
          const campSnap = await getDoc(doc(db, "campaigns", data.campaignId));
          if (
            campSnap.exists() &&
            campSnap.data().masterId === currentUser.uid
          ) {
            isMaster = true;
          }
        } catch (e) {
          console.error("Erro ao verificar status de mestre:", e);
        }
      }

      if (!isOwner && !isMaster) {
        alert(
          "Acesso Negado: Esta ficha é privada. Apenas o jogador que a criou ou o Mestre podem acessá-la.",
        );
        window.location.assign("./index.html");
        return;
      }

      agenteAtual = normalizarAgente(data);
      const todosInputs = formFicha.querySelectorAll("input, textarea, select");

      todosInputs.forEach((campo) => {
        if (isReadOnly) {
          campo.disabled = true; // Bloqueia todos os inputs, checkboxes, textareas
        }

        if (campo.type === "file") return;

        // Se o utilizador atual estiver a escrever neste exato campo, não o interrompemos
        if (campo === document.activeElement) return;

        const partes = campo.id.split("-");
        if (partes.length === 2) {
          const categoria = partes[0];
          const chave = partes[1];

          if (agenteAtual[categoria]) {
            if (campo.type === "checkbox") {
              const valorBooleano = !!agenteAtual[categoria][chave];
              if (campo.checked !== valorBooleano) {
                campo.checked = valorBooleano;
              }
            } else if (campo.tagName === "TEXTAREA") {
              const val = agenteAtual[categoria][chave];
              const stringVal = Array.isArray(val)
                ? val.map(item => typeof item === 'object' ? (item.nome || "") : item).filter(Boolean).join(", ")
                : (val || "");
              if (campo.value != stringVal) {
                campo.value = stringVal;
              }
            } else if (
              agenteAtual[categoria][chave] !== undefined &&
              campo.value != agenteAtual[categoria][chave]
            ) {
              campo.value = agenteAtual[categoria][chave];
            }
          }
        }
      });

      atualizarIndicadoresPericiaDiv5();

      // Atualizar a imagem da Marca em tempo real
      if (agenteAtual.habilidades && agenteAtual.habilidades.marca_img) {
        const marcaPreview = document.getElementById("marca-preview");
        const marcaPlaceholder = document.getElementById("marca-placeholder");
        if (
          marcaPreview &&
          marcaPreview.src !== agenteAtual.habilidades.marca_img
        ) {
          marcaPreview.src = agenteAtual.habilidades.marca_img;
          marcaPreview.style.display = "block";
          if (marcaPlaceholder) marcaPlaceholder.style.display = "none";
        }
      }

      // Atualizar a imagem da Foto em tempo real
      if (agenteAtual.perfil && agenteAtual.perfil.foto_img) {
        const fotoPreview = document.getElementById("foto-preview");
        const fotoPlaceholder = document.getElementById("foto-placeholder");
        if (fotoPreview && fotoPreview.src !== agenteAtual.perfil.foto_img) {
          fotoPreview.src = agenteAtual.perfil.foto_img;
          fotoPreview.style.display = "block";
          if (fotoPlaceholder) fotoPlaceholder.style.display = "none";
        }
      }

      if (isReadOnly) {
        // Desativa a capacidade de clicar na área da imagem para fazer upload
        const fotoContainer = document.getElementById("foto-container");
        if (fotoContainer) fotoContainer.onclick = null;
        const marcaContainer = document.getElementById("marca-container");
        if (marcaContainer) marcaContainer.onclick = null;
      }
      renderizarTudoInterativo();
    });
    setupInteractiveButtons();
    atualizarIndicadoresPericiaDiv5();
  }

  formFicha.addEventListener("input", (evento) => {
    if (isReadOnly) return; // Impede gravação se tentar contornar HTML
    if (!agenteAtual) return;

    const elemento = evento.target;

    if (elemento.closest && elemento.closest(".linha-pericia")) {
      const row = elemento.closest(".linha-pericia");
      const atualInput = row.querySelector("input[type='number']:not(.input-base-fixa)");
      const div5Span = row.querySelector(".pericia-div5");
      if (atualInput && div5Span) {
        const val = parseInt(atualInput.value, 10) || 0;
        div5Span.textContent = `(${Math.floor(val / 5)})`;
      }
    }

    // Impede de tentar salvar o caminho invisível da imagem. A foto já tem um script de save próprio
    if (elemento.type === "file") return;

    const partes = elemento.id.split("-");

    if (partes.length === 2) {
      const categoria = partes[0];
      const chave = partes[1];

      // Proteção: não atualizar os valores "base" dinamicamente, já que são inalteráveis
      if (chave.includes("_base")) return;

      const valorTratado =
        elemento.type === "number"
          ? Number(elemento.value)
          : elemento.type === "checkbox"
            ? elemento.checked
            : elemento.value;

      if (!agenteAtual[categoria]) agenteAtual[categoria] = {};
      agenteAtual[categoria][chave] = valorTratado;

      // Envia APENAS o campo específico para a nuvem para não apagar edições de outros (ex: Mestre)
      atualizarCampoDebounced(categoria, chave, valorTratado);
    }
  });

  // Upload de Imagem na Seção da Foto
  const fotoUpload = document.getElementById("foto-upload");
  const fotoPreview = document.getElementById("foto-preview");
  const fotoPlaceholder = document.getElementById("foto-placeholder");
  if (fotoUpload && fotoPreview) {
    fotoUpload.addEventListener("change", (evento) => {
      const file = evento.target.files[0];
      if (!file) return;

      if (fotoPlaceholder) {
        fotoPlaceholder.style.display = "block";
        fotoPlaceholder.innerText = "Processando...";
        fotoPreview.style.display = "none";
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar e comprimir
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          const base64Img = canvas.toDataURL("image/jpeg", 0.7);

          fotoPreview.src = base64Img;
          fotoPreview.style.display = "block";
          if (fotoPlaceholder) {
            fotoPlaceholder.style.display = "none";
            fotoPlaceholder.innerText = "Clique aqui para anexar a Foto";
          }

          if (!agenteAtual) return;
          if (!agenteAtual.perfil) agenteAtual.perfil = {};
          agenteAtual.perfil.foto_img = base64Img;

          updateDoc(doc(db, "agentes", String(agenteId)), {
            "perfil.foto_img": base64Img,
          }).catch((e) => {
            console.error("Erro ao salvar foto:", e);
            alert(
              "Falha ao salvar a imagem da Foto: Você não tem permissão para editar esta ficha.",
            );
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      evento.target.value = "";
    });
  }

  // Upload de Imagem na Seção da Marca
  const marcaUpload = document.getElementById("marca-upload");
  const marcaPreview = document.getElementById("marca-preview");
  const marcaPlaceholder = document.getElementById("marca-placeholder");
  if (marcaUpload && marcaPreview) {
    marcaUpload.addEventListener("change", (evento) => {
      const file = evento.target.files[0];
      if (!file) return;

      if (marcaPlaceholder) {
        marcaPlaceholder.style.display = "block";
        marcaPlaceholder.innerText = "Processando...";
        marcaPreview.style.display = "none";
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Redimensionar e comprimir
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");

          // Adiciona um fundo branco para evitar que imagens PNG transparentes fiquem com fundo preto no JPEG
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);

          ctx.drawImage(img, 0, 0, width, height);

          // Comprime para JPEG (formato universal) com qualidade de 70% para garantir tamanho mínimo
          const base64Img = canvas.toDataURL("image/jpeg", 0.7);

          marcaPreview.src = base64Img;
          marcaPreview.style.display = "block";
          if (marcaPlaceholder) {
            marcaPlaceholder.style.display = "none";
            marcaPlaceholder.innerText = "Clique aqui para anexar a Marca"; // Reseta o texto
          }

          if (!agenteAtual) return;
          if (!agenteAtual.habilidades) agenteAtual.habilidades = {};
          agenteAtual.habilidades.marca_img = base64Img;

          // Salva APENAS a imagem para não haver conflito de versão com textos
          updateDoc(doc(db, "agentes", String(agenteId)), {
            "habilidades.marca_img": base64Img,
          }).catch((e) => {
            console.error("Erro ao salvar marca:", e);
            alert(
              "Falha ao salvar a imagem da Marca: Você não tem permissão para editar esta ficha.",
            );
          });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file); // Lê a imagem e converte para texto Base64 compatível com LocalStorage
      evento.target.value = ""; // Limpa o input para permitir selecionar a mesma imagem novamente se necessário
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
      reader.onload = async (e) => {
        try {
          const dadosImportados = JSON.parse(e.target.result);
          dadosImportados.id = agenteId; // Mantém o ID atual para sobrescrever a ficha sendo editada

          // Garante que a ficha não mude de dono nem de campanha caso o JSON seja de outra sessão
          if (agenteAtual) {
            dadosImportados.campaignId = agenteAtual.campaignId;
            dadosImportados.userId = agenteAtual.userId;
          }

          await salvarAgenteNuvem(normalizarAgente(dadosImportados));
          alert("Ficha importada e atualizada com sucesso!");
          location.reload(); // Recarrega para aplicar os novos dados na tela
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

  // Força o salvamento imediato e volta para o menu principal
  window.voltarParaMenu = async function () {
    if (Object.keys(pendingUpdates).length > 0) {
      clearTimeout(saveTimeoutFicha);
      const updates = { ...pendingUpdates };
      pendingUpdates = {};
      await updateDoc(doc(db, "agentes", String(agenteId)), updates);
    }
    window.location.assign("./index.html");
  };

  // Apenas carrega a ficha após confirmar que o usuário está autenticado
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      carregarFichaNaTela();
    } else {
      window.location.assign("./index.html");
    }
  });
}
