import {
    obterQuadrinhoAtivo,
    obterBlobPagina,
    atualizarEstadoLeitura
} from "../biblioteca/importador.js";

import {
    salvarProgresso
} from "../armazenamento/storage.js";

import {
    criarControleZoom
} from "./zoom.js";

import {
    configurarNavegacao
} from "./navegacao.js";


// ============================================================
// ELEMENTOS
// ============================================================

const appBiblioteca =
    document.getElementById(
        "appBiblioteca"
    );


const appLeitor =
    document.getElementById(
        "appLeitor"
    );


const titulo =
    document.getElementById(
        "leitorTitulo"
    );


const paginaTopo =
    document.getElementById(
        "leitorPaginaTopo"
    );


const paginaRodape =
    document.getElementById(
        "leitorPaginaRodape"
    );


const barraProgresso =
    document.getElementById(
        "barraProgressoLeitura"
    );


const palco =
    document.getElementById(
        "leitorPalco"
    );


const container =
    document.getElementById(
        "imagemContainer"
    );


const imagem =
    document.getElementById(
        "imagemPagina"
    );


const carregando =
    document.getElementById(
        "leitorCarregando"
    );


const btnAnterior =
    document.getElementById(
        "btnPaginaAnterior"
    );


const btnProximo =
    document.getElementById(
        "btnProximaPagina"
    );


const btnFechar =
    document.getElementById(
        "btnFecharLeitor"
    );


const btnZoomMais =
    document.getElementById(
        "btnZoomMais"
    );


const btnZoomMenos =
    document.getElementById(
        "btnZoomMenos"
    );


const btnResetZoom =
    document.getElementById(
        "btnResetZoom"
    );


// ============================================================
// ESTADO
// ============================================================

let quadrinhoAtual =
    null;


let paginaAtual =
    0;


let urlPaginaAtual =
    null;


let leitorAberto =
    false;


let carregandoPagina =
    false;


let callbackAoFechar =
    null;


// ============================================================
// ZOOM
// ============================================================

const zoom =
    criarControleZoom({

        container,

        imagem,

        aoAlterarZoom(
            escala
        ) {

            btnResetZoom.textContent =
                `${Math.round(
                    escala * 100
                )}%`;

        }

    });


// ============================================================
// NAVEGAÇÃO
// ============================================================

configurarNavegacao({

    palco,


    aoAnterior() {

        paginaAnterior();

    },


    aoProximo() {

        proximaPagina();

    },


    aoAlternarControles(
        mostrar = false
    ) {

        if (
            mostrar
        ) {

            appLeitor
                .classList
                .remove(
                    "controles-ocultos"
                );


            return;

        }


        appLeitor
            .classList
            .toggle(
                "controles-ocultos"
            );

    },


    podeNavegar() {

        return (
            leitorAberto &&
            zoom.obterEscala() === 1
        );

    }

});


// ============================================================
// INICIALIZAR
// ============================================================

export function iniciarLeitor({
    aoFechar
}) {

    callbackAoFechar =
        aoFechar;


    btnAnterior.addEventListener(
        "click",
        paginaAnterior
    );


    btnProximo.addEventListener(
        "click",
        proximaPagina
    );


    btnFechar.addEventListener(
        "click",
        fecharLeitor
    );


    btnZoomMais.addEventListener(
        "click",
        () => {

            zoom.aumentar();

        }
    );


    btnZoomMenos.addEventListener(
        "click",
        () => {

            zoom.diminuir();

        }
    );


    btnResetZoom.addEventListener(
        "click",
        () => {

            zoom.resetar();

        }
    );

}


// ============================================================
// ABRIR LEITOR
// ============================================================

export async function abrirLeitor(
    quadrinhoId
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (
        !quadrinho
    ) {

        alert(
            "Este quadrinho não está mais disponível. Selecione o arquivo ou pasta novamente."
        );


        return;

    }


    quadrinhoAtual =
        quadrinho;


    paginaAtual =
        Math.min(
            Math.max(
                quadrinho.paginaAtual ||
                0,
                0
            ),
            quadrinho.totalPaginas -
                1
        );


    leitorAberto =
        true;


    titulo.textContent =
        quadrinho.titulo;


    appBiblioteca.hidden =
        true;


    appLeitor.hidden =
        false;


    appLeitor
        .classList
        .remove(
            "controles-ocultos"
        );


    zoom.resetar();


    await carregarPagina();

}


// ============================================================
// FECHAR
// ============================================================

export async function fecharLeitor() {

    if (
        !leitorAberto
    ) {

        return;

    }


    salvarEstadoAtual();


    leitorAberto =
        false;


    liberarUrlPagina();


    imagem.removeAttribute(
        "src"
    );


    appLeitor.hidden =
        true;


    appBiblioteca.hidden =
        false;


    quadrinhoAtual =
        null;


    if (
        callbackAoFechar
    ) {

        await callbackAoFechar();

    }
}


// ============================================================
// CARREGAR PÁGINA
// ============================================================

async function carregarPagina() {

    if (
        !quadrinhoAtual ||
        carregandoPagina
    ) {

        return;

    }


    carregandoPagina =
        true;


    carregando.hidden =
        false;


    try {

        liberarUrlPagina();


        const blob =
            await obterBlobPagina(
                quadrinhoAtual.id,
                paginaAtual
            );


        urlPaginaAtual =
            URL.createObjectURL(
                blob
            );


        zoom.resetar();


        await carregarImagemUrl(
            urlPaginaAtual
        );


        salvarEstadoAtual();


        atualizarInterface();

    }
    catch (erro) {

        console.error(
            "Erro ao carregar página:",
            erro
        );


        alert(
            erro.message ||
            "Não foi possível carregar esta página."
        );

    }
    finally {

        carregando.hidden =
            true;


        carregandoPagina =
            false;

    }
}


// ============================================================
// CARREGAR IMAGEM
// ============================================================

function carregarImagemUrl(
    url
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            imagem.onload =
                () => {

                    resolve();

                };


            imagem.onerror =
                () => {

                    reject(
                        new Error(
                            "A imagem desta página não pôde ser aberta."
                        )
                    );

                };


            imagem.src =
                url;

        }
    );
}


// ============================================================
// PRÓXIMA
// ============================================================

async function proximaPagina() {

    if (
        !quadrinhoAtual ||
        carregandoPagina
    ) {

        return;

    }


    if (
        paginaAtual >=
        quadrinhoAtual.totalPaginas -
            1
    ) {

        return;

    }


    paginaAtual++;


    await carregarPagina();

}


// ============================================================
// ANTERIOR
// ============================================================

async function paginaAnterior() {

    if (
        !quadrinhoAtual ||
        carregandoPagina
    ) {

        return;

    }


    if (
        paginaAtual <= 0
    ) {

        return;

    }


    paginaAtual--;


    await carregarPagina();

}


// ============================================================
// SALVAR ESTADO
// ============================================================

function salvarEstadoAtual() {

    if (
        !quadrinhoAtual
    ) {

        return;

    }


    atualizarEstadoLeitura(
        quadrinhoAtual.id,
        paginaAtual
    );


    salvarProgresso(
        quadrinhoAtual.id,
        paginaAtual
    );
}


// ============================================================
// INTERFACE
// ============================================================

function atualizarInterface() {

    if (
        !quadrinhoAtual
    ) {

        return;

    }


    const paginaHumana =
        paginaAtual + 1;


    const total =
        quadrinhoAtual.totalPaginas;


    paginaTopo.textContent =
        `${paginaHumana} / ${total}`;


    paginaRodape.textContent =
        `Página ${paginaHumana} de ${total}`;


    const progresso =
        (
            paginaHumana /
            total
        ) *
        100;


    barraProgresso.style.width =
        `${progresso}%`;


    btnAnterior.disabled =
        paginaAtual <= 0;


    btnProximo.disabled =
        paginaAtual >=
        total - 1;
}


// ============================================================
// LIBERAR URL
// ============================================================

function liberarUrlPagina() {

    if (
        !urlPaginaAtual
    ) {

        return;

    }


    URL.revokeObjectURL(
        urlPaginaAtual
    );


    urlPaginaAtual =
        null;
}