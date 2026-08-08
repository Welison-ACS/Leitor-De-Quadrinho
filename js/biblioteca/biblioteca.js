import {
    obterBibliotecaRaiz,
    obterBlobPagina,
    obterPrimeiroQuadrinho,
    contarQuadrinhos
} from "./importador.js";

import {
    esquecerProgresso
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


// ============================================================
// ESTADO
// ============================================================

let callbackAbrirQuadrinho =
    null;


let categoriaAtual =
    null;


let urlsTemporarias =
    [];


// ============================================================
// INICIAR
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
}


// ============================================================
// IR PARA RAIZ
// ============================================================

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


    const raiz =
        obterBibliotecaRaiz();


    // ========================================================
    // NADA IMPORTADO
    // ========================================================

    if (
        !raiz
    ) {

        categoriaAtual =
            null;


        estadoVazio.hidden =
            false;


        grid.hidden =
            true;


        btnVoltar.hidden =
            true;


        tituloCategoriaAtual.textContent =
            "Biblioteca";


        contador.textContent =
            "Nenhuma biblioteca carregada";


        breadcrumb.innerHTML =
            "";


        return;

    }


    if (
        !categoriaAtual
    ) {

        categoriaAtual =
            raiz;

    }


    estadoVazio.hidden =
        true;


    grid.hidden =
        false;


    atualizarCabecalho();


    // ========================================================
    // CARDS
    // ========================================================

    for (
        const item
        of categoriaAtual.filhos
    ) {

        let card;


        if (
            item.tipo ===
            "categoria"
        ) {

            card =
                await criarCardCategoria(
                    item
                );

        }
        else {

            card =
                await criarCardQuadrinho(
                    item
                );

        }


        grid.appendChild(
            card
        );

    }
}


// ============================================================
// CARD CATEGORIA
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


    // ========================================================
    // CAPA
    // ========================================================

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
        categoria.nome;


    capa.src =
        "./assets/placeholder-capa.svg";


    const primeiroQuadrinho =
        obterPrimeiroQuadrinho(
            categoria
        );


    if (
        primeiroQuadrinho
    ) {

        try {

            const blob =
                await obterBlobPagina(
                    primeiroQuadrinho.id,
                    0
                );


            const url =
                URL.createObjectURL(
                    blob
                );


            urlsTemporarias.push(
                url
            );


            capa.src =
                url;

        }
        catch (erro) {

            console.error(
                "Erro ao gerar capa da categoria:",
                erro
            );

        }

    }


    // ========================================================
    // INDICADOR DE PASTA
    // ========================================================

    const badge =
        document.createElement(
            "div"
        );


    badge.className =
        "categoria-badge";


    badge.textContent =
        "COLEÇÃO";


    // ========================================================
    // OVERLAY
    // ========================================================

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


    // ========================================================
    // INFO
    // ========================================================

    const info =
        document.createElement(
            "div"
        );


    info.className =
        "quadrinho-info";


    const titulo =
        document.createElement(
            "h3"
        );


    titulo.className =
        "quadrinho-titulo";


    titulo.textContent =
        categoria.nome;


    titulo.title =
        categoria.nome;


    const status =
        document.createElement(
            "div"
        );


    status.className =
        "quadrinho-status";


    const quantidade =
        contarQuadrinhos(
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
        titulo,
        status
    );


    card.append(
        capaArea,
        info
    );


    // ========================================================
    // ABRIR
    // ========================================================

    card.addEventListener(
        "click",
        async () => {

            categoriaAtual =
                categoria;


            await renderizarBiblioteca();

        }
    );


    return card;
}


// ============================================================
// CARD QUADRINHO
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


    // ========================================================
    // CAPA
    // ========================================================

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
        `Capa de ${quadrinho.titulo}`;


    capa.src =
        "./assets/placeholder-capa.svg";


    try {

        const blob =
            await obterBlobPagina(
                quadrinho.id,
                0
            );


        const url =
            URL.createObjectURL(
                blob
            );


        urlsTemporarias.push(
            url
        );


        capa.src =
            url;

    }
    catch (erro) {

        console.error(
            "Erro ao criar capa:",
            erro
        );

    }


    // ========================================================
    // BADGE DO FORMATO
    // ========================================================

    if (
        quadrinho.formato ===
            "zip" ||
        quadrinho.formato ===
            "cbz"
    ) {

        const badge =
            document.createElement(
                "div"
            );


        badge.className =
            "formato-badge";


        badge.textContent =
            quadrinho.formato
                .toUpperCase();


        capaArea.appendChild(
            badge
        );

    }


    // ========================================================
    // OVERLAY
    // ========================================================

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


    // ========================================================
    // PROGRESSO
    // ========================================================

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
        `${calcularProgresso(
            quadrinho
        )}%`;


    progressoCapa.appendChild(
        progressoInterno
    );


    capaArea.append(
        overlay,
        progressoCapa
    );


    // ========================================================
    // INFO
    // ========================================================

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
        quadrinho.titulo;


    titulo.title =
        quadrinho.titulo;


    const btnMenu =
        document.createElement(
            "button"
        );


    btnMenu.className =
        "quadrinho-menu";


    btnMenu.type =
        "button";


    btnMenu.textContent =
        "⋮";


    btnMenu.title =
        "Opções";


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


    // ========================================================
    // MENU
    // ========================================================

    const menu =
        document.createElement(
            "div"
        );


    menu.className =
        "card-menu-flutuante";


    menu.hidden =
        true;


    const btnApagarProgresso =
        document.createElement(
            "button"
        );


    btnApagarProgresso.type =
        "button";


    btnApagarProgresso.className =
        "perigo";


    btnApagarProgresso.textContent =
        "Apagar progresso";


    menu.appendChild(
        btnApagarProgresso
    );


    card.append(
        capaArea,
        info,
        menu
    );


    // ========================================================
    // ABRIR QUADRINHO
    // ========================================================

    capaArea.addEventListener(
        "click",
        () => {

            if (
                callbackAbrirQuadrinho
            ) {

                callbackAbrirQuadrinho(
                    quadrinho.id
                );

            }

        }
    );


    // ========================================================
    // MENU
    // ========================================================

    btnMenu.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            fecharMenus();


            menu.hidden =
                false;

        }
    );


    btnApagarProgresso.addEventListener(
        "click",
        async event => {

            event.stopPropagation();


            const confirmou =
                window.confirm(
                    `Apagar o progresso de "${quadrinho.titulo}"?`
                );


            if (
                !confirmou
            ) {

                return;

            }


            esquecerProgresso(
                quadrinho.id
            );


            quadrinho.iniciado =
                false;


            quadrinho.paginaAtual =
                0;


            quadrinho.ultimaLeitura =
                null;


            await renderizarBiblioteca();

        }
    );


    return card;
}


// ============================================================
// VOLTAR
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


// ============================================================
// CABEÇALHO
// ============================================================

function atualizarCabecalho() {

    const raiz =
        obterBibliotecaRaiz();


    const ehRaiz =
        categoriaAtual ===
        raiz;


    btnVoltar.hidden =
        ehRaiz;


    tituloCategoriaAtual.textContent =
        ehRaiz
            ? "Biblioteca"
            : categoriaAtual.nome;


    const quantidade =
        categoriaAtual.filhos.length;


    if (
        quantidade === 0
    ) {

        contador.textContent =
            "Nenhum item";


    }
    else if (
        quantidade === 1
    ) {

        contador.textContent =
            "1 item";


    }
    else {

        contador.textContent =
            `${quantidade} itens`;

    }


    renderizarBreadcrumb();
}


// ============================================================
// BREADCRUMB
// ============================================================

function renderizarBreadcrumb() {

    breadcrumb.innerHTML =
        "";


    if (
        !categoriaAtual
    ) {

        return;

    }


    const caminho =
        [];


    let atual =
        categoriaAtual;


    while (
        atual
    ) {

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
                    : categoria.nome;


            if (
                categoria ===
                categoriaAtual
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
// STATUS
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


    return (
        `Página ${
            quadrinho.paginaAtual + 1
        } de ${
            quadrinho.totalPaginas
        }`
    );
}


// ============================================================
// PROGRESSO
// ============================================================

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
                quadrinho.paginaAtual +
                1
            ) /
            quadrinho.totalPaginas
        ) *
        100
    );
}


// ============================================================
// MENUS
// ============================================================

function fecharMenus() {

    document
        .querySelectorAll(
            ".card-menu-flutuante"
        )
        .forEach(
            menu => {

                menu.hidden =
                    true;

            }
        );
}


// ============================================================
// LIBERAR URLs
// ============================================================

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


// ============================================================
// CLICK GLOBAL
// ============================================================

document.addEventListener(
    "click",
    fecharMenus
);