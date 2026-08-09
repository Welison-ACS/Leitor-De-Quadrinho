import {
    obterBibliotecaRaiz,
    obterBlobCapaQuadrinho,
    obterPrimeiroQuadrinho,
    contarQuadrinhos,
    listarQuadrinhosAtivos
} from "./importador.js";

import {
    esquecerProgresso,
    obterMetadados,
    salvarNomePersonalizado,
    definirOculto,
    salvarCapaPersonalizada,
    obterCapaPersonalizada,
    removerCapaPersonalizada
} from "../armazenamento/storage.js";


// ============================================================
// ELEMENTOS
// ============================================================

const grid =
    document.getElementById(
        "bibliotecaGrid"
    );

const estadoVazio =
    document.getElementById(
        "estadoVazio"
    );

const tituloCategoriaAtual =
    document.getElementById(
        "tituloCategoriaAtual"
    );

const contador =
    document.getElementById(
        "contadorBiblioteca"
    );

const btnVoltar =
    document.getElementById(
        "btnVoltarCategoria"
    );

const breadcrumb =
    document.getElementById(
        "breadcrumbBiblioteca"
    );

const secaoContinuar =
    document.getElementById(
        "secaoContinuarLendo"
    );

const continuarGrid =
    document.getElementById(
        "continuarLendoGrid"
    );

const btnMostrarOcultos =
    document.getElementById(
        "btnMostrarOcultos"
    );


// ============================================================
// ESTADO
// ============================================================

let callbackAbrirQuadrinho =
    null;

let categoriaAtual =
    null;

let urlsTemporarias =
    [];

let mostrarOcultos =
    false;


const COMPARADOR =
    new Intl.Collator(
        "pt-BR",
        {
            numeric: true,
            sensitivity: "base"
        }
    );


// ============================================================
// INICIALIZAR
// ============================================================

export function iniciarBiblioteca({
    aoAbrirQuadrinho
}) {

    callbackAbrirQuadrinho =
        aoAbrirQuadrinho;


    btnVoltar.addEventListener(
        "click",
        voltarCategoria
    );


    btnMostrarOcultos.addEventListener(
        "click",
        async () => {

            mostrarOcultos =
                !mostrarOcultos;


            await renderizarBiblioteca();

        }
    );
}


export async function abrirRaizBiblioteca() {

    categoriaAtual =
        obterBibliotecaRaiz();


    await renderizarBiblioteca();
}


// ============================================================
// RENDERIZAR
// ============================================================

export async function renderizarBiblioteca() {

    limparUrls();

    grid.innerHTML =
        "";

    continuarGrid.innerHTML =
        "";


    const raiz =
        obterBibliotecaRaiz();


    if (!raiz) {

        categoriaAtual =
            null;

        estadoVazio.hidden =
            false;

        grid.hidden =
            true;

        secaoContinuar.hidden =
            true;

        btnVoltar.hidden =
            true;

        btnMostrarOcultos.hidden =
            true;

        tituloCategoriaAtual.textContent =
            "Biblioteca";

        contador.textContent =
            "Nenhuma biblioteca carregada";

        breadcrumb.innerHTML =
            "";

        return;
    }


    if (!categoriaAtual) {
        categoriaAtual = raiz;
    }


    estadoVazio.hidden =
        true;

    grid.hidden =
        false;


    atualizarCabecalho();
    atualizarBotaoOcultos();


    if (
        categoriaAtual === raiz
    ) {

        await renderizarContinuarLendo();

    }
    else {

        secaoContinuar.hidden =
            true;

    }


    const filhos =
        obterFilhosOrdenados(
            categoriaAtual
        );


    for (
        const item
        of filhos
    ) {

        if (
            estaOculto(
                item
            ) &&
            !mostrarOcultos
        ) {

            continue;

        }


        const card =
            item.tipo === "categoria"
                ? await criarCardCategoria(
                    item
                )
                : await criarCardQuadrinho(
                    item
                );


        if (
            estaOculto(
                item
            )
        ) {

            card.classList.add(
                "item-oculto"
            );

        }


        grid.appendChild(
            card
        );

    }
}


// ============================================================
// CONTINUAR LENDO
// ============================================================

async function renderizarContinuarLendo() {

    const itens =
        listarQuadrinhosAtivos()
            .filter(
                quadrinho =>
                    quadrinho.iniciado &&
                    quadrinho.paginaAtual <
                        quadrinho.totalPaginas - 1 &&
                    quadrinho.ultimaLeitura &&
                    !estaOcultoNoCaminho(
                        quadrinho
                    )
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.ultimaLeitura -
                    a.ultimaLeitura
            )
            .slice(
                0,
                6
            );


    if (
        itens.length === 0
    ) {

        secaoContinuar.hidden =
            true;

        return;
    }


    secaoContinuar.hidden =
        false;


    for (
        const quadrinho
        of itens
    ) {

        const card =
            document.createElement(
                "button"
            );

        card.type =
            "button";

        card.className =
            "continuar-card";


        const capa =
            document.createElement(
                "img"
            );

        capa.alt =
            obterNomeExibicao(
                quadrinho
            );

        capa.src =
            "./assets/placeholder-capa.svg";


        await aplicarCapa(
            capa,
            quadrinho
        );


        const info =
            document.createElement(
                "span"
            );

        info.className =
            "continuar-card-info";


        const obra =
            document.createElement(
                "small"
            );

        obra.textContent =
            obterNomeObra(
                quadrinho
            );


        const nome =
            document.createElement(
                "strong"
            );

        nome.textContent =
            obterNomeExibicao(
                quadrinho
            );


        const pagina =
            document.createElement(
                "span"
            );

        pagina.textContent =
            `Página ${quadrinho.paginaAtual + 1} de ${quadrinho.totalPaginas}`;


        const barra =
            document.createElement(
                "span"
            );

        barra.className =
            "continuar-progresso";


        const preenchimento =
            document.createElement(
                "span"
            );

        preenchimento.style.width =
            `${calcularProgresso(quadrinho)}%`;


        barra.appendChild(
            preenchimento
        );


        info.append(
            obra,
            nome,
            pagina,
            barra
        );


        card.append(
            capa,
            info
        );


        card.addEventListener(
            "click",
            () => abrirQuadrinho(
                quadrinho.id
            )
        );


        continuarGrid.appendChild(
            card
        );

    }
}


// ============================================================
// CARD DE CATEGORIA / OBRA
// ============================================================

async function criarCardCategoria(
    categoria
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "quadrinho-card categoria-card";


    const capaArea =
        document.createElement(
            "div"
        );

    capaArea.className =
        "quadrinho-capa-area";


    const capa =
        document.createElement(
            "img"
        );

    capa.className =
        "quadrinho-capa";

    capa.alt =
        obterNomeExibicao(
            categoria
        );

    capa.src =
        "./assets/placeholder-capa.svg";


    await aplicarCapa(
        capa,
        categoria
    );


    const badge =
        document.createElement(
            "div"
        );

    badge.className =
        "categoria-badge";

    badge.textContent =
        categoria.pai ===
            obterBibliotecaRaiz()
            ? "OBRA"
            : "COLEÇÃO";


    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "quadrinho-overlay";


    const abrir =
        document.createElement(
            "button"
        );

    abrir.type =
        "button";

    abrir.className =
        "quadrinho-abrir";

    abrir.textContent =
        "Abrir";


    overlay.appendChild(
        abrir
    );


    capaArea.append(
        capa,
        badge,
        overlay
    );


    const info =
        document.createElement(
            "div"
        );

    info.className =
        "quadrinho-info";


    const tituloLinha =
        document.createElement(
            "div"
        );

    tituloLinha.className =
        "quadrinho-titulo-linha";


    const titulo =
        document.createElement(
            "h3"
        );

    titulo.className =
        "quadrinho-titulo";

    titulo.textContent =
        obterNomeExibicao(
            categoria
        );

    titulo.title =
        titulo.textContent;


    const btnMenu =
        criarBotaoMenu();


    tituloLinha.append(
        titulo,
        btnMenu
    );


    const status =
        document.createElement(
            "div"
        );

    status.className =
        "quadrinho-status";


    const quantidade =
        contarQuadrinhosVisiveis(
            categoria
        );


    const textoQuantidade =
        document.createElement(
            "span"
        );

    textoQuantidade.textContent =
        quantidade === 1
            ? "1 história"
            : `${quantidade} histórias`;


    const seta =
        document.createElement(
            "span"
        );

    seta.className =
        "categoria-seta";

    seta.textContent =
        "›";


    status.append(
        textoQuantidade,
        seta
    );


    info.append(
        tituloLinha,
        status
    );


    const menu =
        criarMenuEdicao(
            categoria,
            false
        );


    card.append(
        capaArea,
        info,
        menu
    );


    card.addEventListener(
        "click",
        async () => {

            categoriaAtual =
                categoria;

            await renderizarBiblioteca();

        }
    );


    btnMenu.addEventListener(
        "click",
        event => abrirMenu(
            event,
            menu
        )
    );


    return card;
}


// ============================================================
// CARD DE HISTÓRIA
// ============================================================

async function criarCardQuadrinho(
    quadrinho
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "quadrinho-card";


    const capaArea =
        document.createElement(
            "div"
        );

    capaArea.className =
        "quadrinho-capa-area";


    const capa =
        document.createElement(
            "img"
        );

    capa.className =
        "quadrinho-capa";

    capa.alt =
        `Capa de ${obterNomeExibicao(quadrinho)}`;

    capa.src =
        "./assets/placeholder-capa.svg";


    await aplicarCapa(
        capa,
        quadrinho
    );


    if (
        quadrinho.formato !== "pasta"
    ) {

        const badge =
            document.createElement(
                "div"
            );

        badge.className =
            "formato-badge";

        badge.textContent =
            String(
                quadrinho.formato || ""
            ).toUpperCase();

        capaArea.appendChild(
            badge
        );

    }


    const overlay =
        document.createElement(
            "div"
        );

    overlay.className =
        "quadrinho-overlay";


    const abrir =
        document.createElement(
            "button"
        );

    abrir.type =
        "button";

    abrir.className =
        "quadrinho-abrir";

    abrir.textContent =
        quadrinho.iniciado
            ? "Continuar"
            : "Ler";


    overlay.appendChild(
        abrir
    );


    const progressoCapa =
        document.createElement(
            "div"
        );

    progressoCapa.className =
        "quadrinho-progresso-capa";


    const progressoInterno =
        document.createElement(
            "div"
        );

    progressoInterno.style.width =
        `${calcularProgresso(quadrinho)}%`;


    progressoCapa.appendChild(
        progressoInterno
    );


    // A imagem da capa precisa estar realmente dentro do card.
    // Esse append estava faltando na versão anterior.
    capaArea.append(
        capa,
        overlay,
        progressoCapa
    );


    const info =
        document.createElement(
            "div"
        );

    info.className =
        "quadrinho-info";


    const tituloLinha =
        document.createElement(
            "div"
        );

    tituloLinha.className =
        "quadrinho-titulo-linha";


    const titulo =
        document.createElement(
            "h3"
        );

    titulo.className =
        "quadrinho-titulo";

    titulo.textContent =
        obterNomeExibicao(
            quadrinho
        );

    titulo.title =
        titulo.textContent;


    const btnMenu =
        criarBotaoMenu();


    tituloLinha.append(
        titulo,
        btnMenu
    );


    const status =
        document.createElement(
            "div"
        );

    status.className =
        "quadrinho-status";


    const statusTexto =
        document.createElement(
            "span"
        );

    statusTexto.textContent =
        descobrirStatus(
            quadrinho
        );


    const paginas =
        document.createElement(
            "span"
        );

    paginas.textContent =
        `${quadrinho.totalPaginas} pág.`;


    status.append(
        statusTexto,
        paginas
    );


    info.append(
        tituloLinha,
        status
    );


    const menu =
        criarMenuEdicao(
            quadrinho,
            true
        );


    card.append(
        capaArea,
        info,
        menu
    );


    capaArea.addEventListener(
        "click",
        () => abrirQuadrinho(
            quadrinho.id
        )
    );


    btnMenu.addEventListener(
        "click",
        event => abrirMenu(
            event,
            menu
        )
    );


    return card;
}


// ============================================================
// CAPAS
// ============================================================

async function aplicarCapa(
    elementoImagem,
    item
) {

    try {

        const personalizada =
            await obterCapaPersonalizada(
                item.id
            );


        if (
            personalizada
        ) {

            definirSrcBlob(
                elementoImagem,
                personalizada
            );

            return;

        }


        const quadrinho =
            item.tipo === "quadrinho"
                ? item
                : obterPrimeiroQuadrinho(
                    item
                );


        if (!quadrinho) {
            return;
        }


        const blob =
            await obterBlobCapaQuadrinho(
                quadrinho.id
            );


        if (
            blob
        ) {

            definirSrcBlob(
                elementoImagem,
                blob
            );

        }

    }
    catch (erro) {

        console.error(
            "Erro ao carregar capa:",
            erro
        );

    }
}


function definirSrcBlob(
    elementoImagem,
    blob
) {

    const url =
        URL.createObjectURL(
            blob
        );


    urlsTemporarias.push(
        url
    );


    elementoImagem.src =
        url;
}


// ============================================================
// MENU DE EDIÇÃO
// ============================================================

function criarBotaoMenu() {

    const botao =
        document.createElement(
            "button"
        );

    botao.className =
        "quadrinho-menu";

    botao.type =
        "button";

    botao.textContent =
        "⋮";

    botao.title =
        "Opções";


    return botao;
}


function criarMenuEdicao(
    item,
    ehQuadrinho
) {

    const menu =
        document.createElement(
            "div"
        );

    menu.className =
        "card-menu-flutuante";

    menu.hidden =
        true;


    const btnRenomear =
        criarOpcaoMenu(
            "Renomear na biblioteca"
        );


    const btnCapa =
        criarOpcaoMenu(
            "Alterar capa"
        );


    const btnRestaurarCapa =
        criarOpcaoMenu(
            "Restaurar capa automática"
        );


    const oculto =
        estaOculto(
            item
        );


    const btnOcultar =
        criarOpcaoMenu(
            oculto
                ? "Mostrar na biblioteca"
                : "Ocultar da biblioteca",
            oculto
                ? ""
                : "perigo"
        );


    menu.append(
        btnRenomear,
        btnCapa,
        btnRestaurarCapa,
        btnOcultar
    );


    if (
        ehQuadrinho
    ) {

        const btnProgresso =
            criarOpcaoMenu(
                "Apagar progresso",
                "perigo"
            );


        btnProgresso.addEventListener(
            "click",
            async event => {

                event.stopPropagation();


                const confirmou =
                    window.confirm(
                        `Apagar o progresso de "${obterNomeExibicao(item)}"?`
                    );


                if (!confirmou) {
                    return;
                }


                esquecerProgresso(
                    item.id
                );

                item.iniciado =
                    false;

                item.paginaAtual =
                    0;

                item.ultimaLeitura =
                    null;


                await renderizarBiblioteca();

            }
        );


        menu.appendChild(
            btnProgresso
        );

    }


    btnRenomear.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const atual =
                obterNomeExibicao(
                    item
                );


            const novo =
                window.prompt(
                    "Nome exibido na biblioteca:\n\nDeixe vazio para voltar ao nome original.",
                    atual
                );


            if (
                novo === null
            ) {
                return;
            }


            salvarNomePersonalizado(
                item.id,
                novo
            );


            await renderizarBiblioteca();

        }
    );


    btnCapa.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const arquivo =
                await selecionarImagem();


            if (!arquivo) {
                return;
            }


            try {

                await salvarCapaPersonalizada(
                    item.id,
                    arquivo
                );


                await renderizarBiblioteca();

            }
            catch (erro) {

                console.error(
                    erro
                );

                alert(
                    erro.message ||
                    "Não foi possível salvar esta capa."
                );

            }

        }
    );


    btnRestaurarCapa.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            await removerCapaPersonalizada(
                item.id
            );


            await renderizarBiblioteca();

        }
    );


    btnOcultar.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            definirOculto(
                item.id,
                !oculto
            );


            await renderizarBiblioteca();

        }
    );


    return menu;
}


function criarOpcaoMenu(
    texto,
    classe = ""
) {

    const botao =
        document.createElement(
            "button"
        );

    botao.type =
        "button";

    botao.textContent =
        texto;


    if (classe) {
        botao.className = classe;
    }


    return botao;
}


function abrirMenu(
    event,
    menu
) {

    event.preventDefault();
    event.stopPropagation();


    const estavaAberto =
        !menu.hidden;


    fecharMenus();


    menu.hidden =
        estavaAberto;
}


function selecionarImagem() {

    return new Promise(
        resolve => {

            const input =
                document.createElement(
                    "input"
                );

            input.type =
                "file";

            input.accept =
                "image/*";

            input.hidden =
                true;


            input.addEventListener(
                "change",
                () => {

                    const arquivo =
                        input.files?.[0] ||
                        null;

                    input.remove();

                    resolve(
                        arquivo
                    );

                },
                {
                    once: true
                }
            );


            document.body.appendChild(
                input
            );

            input.click();

        }
    );
}


// ============================================================
// NOMES / OCULTOS
// ============================================================

function obterNomeExibicao(
    item
) {

    const metadados =
        obterMetadados(
            item.id
        );


    if (
        metadados.nomePersonalizado
    ) {

        return metadados.nomePersonalizado;

    }


    return item.tipo === "categoria"
        ? item.nome
        : item.titulo;
}


function estaOculto(
    item
) {

    return obterMetadados(
        item.id
    ).oculto;
}


function estaOcultoNoCaminho(
    item
) {

    let atual =
        item;


    while (
        atual
    ) {

        if (
            atual.id !== "categoria:raiz" &&
            estaOculto(
                atual
            )
        ) {

            return true;

        }


        atual =
            atual.pai;

    }


    return false;
}


function contarOcultos(
    no
) {

    if (!no) {
        return 0;
    }


    let total =
        no.id !== "categoria:raiz" &&
        estaOculto(
            no
        )
            ? 1
            : 0;


    if (
        no.tipo === "categoria"
    ) {

        for (
            const filho
            of no.filhos || []
        ) {

            total +=
                contarOcultos(
                    filho
                );

        }

    }


    return total;
}


function atualizarBotaoOcultos() {

    const quantidade =
        contarOcultos(
            obterBibliotecaRaiz()
        );


    btnMostrarOcultos.hidden =
        quantidade === 0;


    if (
        quantidade === 0
    ) {

        mostrarOcultos =
            false;

        return;

    }


    btnMostrarOcultos.textContent =
        mostrarOcultos
            ? "Ocultar itens ocultos"
            : `Mostrar ocultos (${quantidade})`;
}


function contarQuadrinhosVisiveis(
    categoria
) {

    if (
        mostrarOcultos
    ) {

        return contarQuadrinhos(
            categoria
        );

    }


    let total =
        0;


    for (
        const filho
        of categoria.filhos || []
    ) {

        if (
            estaOculto(
                filho
            )
        ) {
            continue;
        }


        if (
            filho.tipo === "quadrinho"
        ) {
            total++;
        }
        else {
            total += contarQuadrinhosVisiveis(
                filho
            );
        }

    }


    return total;
}


function obterFilhosOrdenados(
    categoria
) {

    return [
        ...(categoria.filhos || [])
    ].sort(
        (
            a,
            b
        ) => {

            if (
                a.tipo !== b.tipo
            ) {

                return a.tipo === "categoria"
                    ? -1
                    : 1;

            }


            return COMPARADOR.compare(
                obterNomeExibicao(
                    a
                ),
                obterNomeExibicao(
                    b
                )
            );

        }
    );
}


function obterNomeObra(
    quadrinho
) {

    const raiz =
        obterBibliotecaRaiz();


    let atual =
        quadrinho.pai;

    let obra =
        atual;


    while (
        atual &&
        atual.pai &&
        atual.pai !== raiz
    ) {

        atual =
            atual.pai;

        obra =
            atual;

    }


    if (
        obra &&
        obra !== raiz
    ) {

        return obterNomeExibicao(
            obra
        );

    }


    return "Biblioteca";
}


// ============================================================
// NAVEGAÇÃO / CABEÇALHO
// ============================================================

async function voltarCategoria() {

    if (
        !categoriaAtual ||
        !categoriaAtual.pai
    ) {
        return;
    }


    categoriaAtual =
        categoriaAtual.pai;


    await renderizarBiblioteca();
}


function atualizarCabecalho() {

    const raiz =
        obterBibliotecaRaiz();

    const ehRaiz =
        categoriaAtual === raiz;


    btnVoltar.hidden =
        ehRaiz;


    tituloCategoriaAtual.textContent =
        ehRaiz
            ? "Biblioteca"
            : obterNomeExibicao(
                categoriaAtual
            );


    const quantidade =
        obterFilhosOrdenados(
            categoriaAtual
        ).filter(
            item =>
                mostrarOcultos ||
                !estaOculto(
                    item
                )
        ).length;


    contador.textContent =
        quantidade === 1
            ? "1 item"
            : `${quantidade} itens`;


    renderizarBreadcrumb();
}


function renderizarBreadcrumb() {

    breadcrumb.innerHTML =
        "";


    if (!categoriaAtual) {
        return;
    }


    const caminho =
        [];

    let atual =
        categoriaAtual;


    while (atual) {

        caminho.unshift(
            atual
        );

        atual =
            atual.pai;

    }


    caminho.forEach(
        (
            categoria,
            indice
        ) => {

            if (
                indice > 0
            ) {

                const separador =
                    document.createElement(
                        "span"
                    );

                separador.className =
                    "breadcrumb-separador";

                separador.textContent =
                    "›";

                breadcrumb.appendChild(
                    separador
                );

            }


            const botao =
                document.createElement(
                    "button"
                );

            botao.type =
                "button";

            botao.className =
                "breadcrumb-item";

            botao.textContent =
                indice === 0
                    ? "Início"
                    : obterNomeExibicao(
                        categoria
                    );


            if (
                categoria === categoriaAtual
            ) {

                botao.classList.add(
                    "ativo"
                );

            }


            botao.addEventListener(
                "click",
                async () => {

                    categoriaAtual =
                        categoria;

                    await renderizarBiblioteca();

                }
            );


            breadcrumb.appendChild(
                botao
            );

        }
    );
}


// ============================================================
// STATUS / PROGRESSO
// ============================================================

function descobrirStatus(
    quadrinho
) {

    if (
        !quadrinho.iniciado
    ) {
        return "Não iniciado";
    }


    if (
        quadrinho.paginaAtual >=
        quadrinho.totalPaginas - 1
    ) {
        return "Concluído";
    }


    return `Página ${quadrinho.paginaAtual + 1} de ${quadrinho.totalPaginas}`;
}


function calcularProgresso(
    quadrinho
) {

    if (
        !quadrinho.iniciado ||
        !quadrinho.totalPaginas
    ) {
        return 0;
    }


    return Math.min(
        100,
        (
            (
                quadrinho.paginaAtual + 1
            ) /
            quadrinho.totalPaginas
        ) * 100
    );
}


function abrirQuadrinho(
    quadrinhoId
) {

    if (
        callbackAbrirQuadrinho
    ) {

        callbackAbrirQuadrinho(
            quadrinhoId
        );

    }
}


// ============================================================
// LIMPEZA
// ============================================================

function fecharMenus() {

    document
        .querySelectorAll(
            ".card-menu-flutuante"
        )
        .forEach(
            menu => {
                menu.hidden = true;
            }
        );
}


function limparUrls() {

    for (
        const url
        of urlsTemporarias
    ) {

        URL.revokeObjectURL(
            url
        );

    }


    urlsTemporarias =
        [];
}


document.addEventListener(
    "click",
    fecharMenus
);
