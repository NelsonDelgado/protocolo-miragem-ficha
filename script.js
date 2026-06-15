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
      ciencia3: 0,
      ciencia3_base: 0,
      ciencia3_espec: "",
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
    perfil: {
      aparencia: "",
      foto_img: "",
      personalidade: "",
      traumas: "",
      notas: "",
    },
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
// MÓDULO 0: AUTENTICAÇÃO E CONTROLE DE VIEW
// ==========================================
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const btnLogin = document.getElementById("btn-login");
const btnLogout = document.getElementById("btn-logout");
const userEmailEl = document.getElementById("user-email");

async function migrarDadosAntigosParaFirebase() {
  const CHAVE_BANCO = "protocoloMiragemAgentes";
  const dadosLocais = localStorage.getItem(CHAVE_BANCO);
  if (!dadosLocais) return; // Se não houver dados antigos, não faz nada

  try {
    const personagensAntigos = JSON.parse(dadosLocais);
    if (Array.isArray(personagensAntigos) && personagensAntigos.length > 0) {
      alert(
        "Detetámos fichas antigas no seu dispositivo! A migrá-las para a sua conta na nuvem...",
      );

      // Cria uma campanha especial para guardar as fichas velhas
      const campaignId = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      await setDoc(doc(db, "campaigns", campaignId), {
        name: "Arquivo Local (Fichas Antigas)",
        masterId: currentUser.uid,
        playerIds: [],
      });

      // Envia as fichas uma a uma para essa campanha
      for (const p of personagensAntigos) {
        const agenteMigrado = normalizarAgente(p);
        agenteMigrado.userId = currentUser.uid;
        agenteMigrado.campaignId = campaignId;
        await setDoc(
          doc(db, "agentes", String(agenteMigrado.id)),
          agenteMigrado,
        );
      }

      // Limpa a cache antiga para este código não voltar a rodar no futuro
      localStorage.removeItem(CHAVE_BANCO);
      alert(
        "Migração concluída com sucesso! As suas fichas antigas estão na campanha 'Arquivo Local'.",
      );
    }
  } catch (e) {
    console.error("Erro na migração:", e);
  }
}

if (loginView) {
  // Observador do estado de autenticação
  onAuthStateChanged(auth, (user) => {
    if (user) {
      currentUser = user;
      loginView.classList.add("hidden");
      dashboardView.classList.remove("hidden");
      userEmailEl.textContent = user.displayName || user.email;

      // Corre o migrador primeiro, e só depois liga os ouvintes da campanha
      migrarDadosAntigosParaFirebase().then(() => {
        setupCampaignListeners();
      });
    } else {
      currentUser = null;
      loginView.classList.remove("hidden");
      dashboardView.classList.add("hidden");
      unsubscribeCampaignListeners();
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
    agentsView.classList.add("hidden");
    campaignDashboard.classList.remove("hidden");
    currentCampaignId = null;
    isCurrentUserMaster = false;
  });

  window.abrirCampanha = (campaignId, isMaster) => {
    currentCampaignId = campaignId;
    isCurrentUserMaster = isMaster;
    if (agentsView) agentsView.classList.remove("hidden");
    if (campaignDashboard) campaignDashboard.classList.add("hidden");
    renderizarListaAgentes();
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

async function renderizarListaAgentes() {
  if (!currentCampaignId || !listaDiv) return;
  listaDiv.innerHTML = `<p style="color:#aaa; text-align:center;">A carregar agentes...</p>`;

  try {
    const q = query(
      collection(db, "agentes"),
      where("campaignId", "==", currentCampaignId),
    );

    const querySnapshot = await getDocs(q);

    listaDiv.className = "agents-grid";
    listaDiv.innerHTML = "";

    if (querySnapshot.empty) {
      listaDiv.innerHTML = `<p style="color:#aaa; text-align:center;">Nenhum agente registrado nesta campanha.</p>`;
      return;
    }

    querySnapshot.forEach((docSnap) => {
      const agente = docSnap.data();
      const wrapper = document.createElement("div");
      wrapper.className = "agent-card";

      const isOwner = agente.userId === currentUser.uid;
      const canEdit = isOwner || isCurrentUserMaster;

      const fotoHtml =
        agente.perfil && agente.perfil.foto_img
          ? `<img src="${agente.perfil.foto_img}" alt="Foto de ${agente.identidade.nome}">`
          : `<div style="color: #666; font-size: 11px; text-transform: uppercase; text-align: center; padding: 10px;">Sem Foto</div>`;

      const deleteButtonHtml = canEdit
        ? `<button class="agent-card-settings" onclick="deletarPersonagem('${agente.id}')" title="Apagar Agente">⚙️</button>`
        : "";

      const acessarButtonHtml = canEdit
        ? `<button class="agent-card-btn" onclick="abrirFicha('${agente.id}', true)">Acessar Ficha</button>`
        : `<button class="agent-card-btn" style="background: #444; color: #888; cursor: not-allowed;" disabled title="Acesso Restrito">Ficha Privada</button>`;

      const dataReg = new Date(agente.id).toLocaleDateString("pt-BR");

      wrapper.innerHTML = `
          <div class="agent-card-left">${fotoHtml}</div>
          <div class="agent-card-right">
            ${deleteButtonHtml}
            <h4 class="agent-card-name">${agente.identidade.nome || "Desconhecido"}</h4>
            <p class="agent-card-role">${agente.identidade.ocupacao || "Sem Ocupação"}</p>
            <p class="agent-card-date">Registrado em ${dataReg}</p>
            ${acessarButtonHtml}
          </div>
        `;
      listaDiv.appendChild(wrapper);
    });
  } catch (error) {
    console.error("Erro ao carregar lista de agentes:", error);
    listaDiv.innerHTML = `<p style="color:red; text-align:center;">Erro de permissões ao carregar fichas.</p>`;
  }
}

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
            } else if (
              agenteAtual[categoria][chave] !== undefined &&
              campo.value != agenteAtual[categoria][chave]
            ) {
              campo.value = agenteAtual[categoria][chave];
            }
          }
        }
      });

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
    });
  }

  formFicha.addEventListener("input", (evento) => {
    if (isReadOnly) return; // Impede gravação se tentar contornar HTML
    if (!agenteAtual) return;

    const elemento = evento.target;

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
