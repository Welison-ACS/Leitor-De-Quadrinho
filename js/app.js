import {
    iniciarBiblioteca,
    renderizarBiblioteca,
    abrirRaizBiblioteca
} from "./biblioteca/biblioteca.js";

import {
    importarBiblioteca
} from "./biblioteca/importador.js";

import {
    iniciarLeitor,
    abrirLeitor
} from "./leitor/leitor.js";


// ============================================================
// ELEMENTOS
// ============================================================

const btnImportarQuadrinhos =
    document.getElementById(
        "btnImportarQuadrinhos"
    );


const btnImportarVazio =
    document.getElementById(
        "btnImportarVazio"
    );


const inputBiblioteca =
    document.getElementById(
        "inputBiblioteca"
    );


const modalImportando =
    document.getElementById(
        "modalImportando"
    );


const textoImportacao =
    document.getElementById(
        "textoImportacao"
    );


// ============================================================
// INICIAR
// ============================================================

async function iniciar() {

    iniciarBiblioteca({

        aoAbrirQuadrinho(
            quadrinhoId
        ) {

            abrirLeitor(
                quadrinhoId
            );

        }

    });


    iniciarLeitor({

        async aoFechar() {

            await renderizarBiblioteca();

        }

    });


    configurarEventos();


    await renderizarBiblioteca();


    registrarServiceWorker();
}


// ============================================================
// EVENTOS
// ============================================================

function configurarEventos() {

    btnImportarQuadrinhos.addEventListener(
        "click",
        selecionarBiblioteca
    );


    btnImportarVazio.addEventListener(
        "click",
        selecionarBiblioteca
    );


    inputBiblioteca.addEventListener(
        "change",
        processarBiblioteca
    );
}


// ============================================================
// SELECIONAR
// ============================================================

function selecionarBiblioteca() {

    inputBiblioteca.click();
}


// ============================================================
// PROCESSAR BIBLIOTECA
// ============================================================

async function processarBiblioteca(
    event
) {

    const arquivos =
        event.target.files;


    if (
        !arquivos ||
        arquivos.length === 0
    ) {

        return;

    }


    abrirModal(
        "Analisando estrutura da biblioteca..."
    );


    try {

        await importarBiblioteca(
            arquivos,
            atualizarTextoModal
        );


        await abrirRaizBiblioteca();

    }
    catch (erro) {

        console.error(
            erro
        );


        alert(
            erro.message ||
            "Não foi possível carregar a biblioteca."
        );

    }
    finally {

        fecharModal();


        inputBiblioteca.value =
            "";

    }
}


// ============================================================
// MODAL
// ============================================================

function abrirModal(
    mensagem
) {

    textoImportacao.textContent =
        mensagem;


    modalImportando.hidden =
        false;
}


function atualizarTextoModal(
    mensagem
) {

    textoImportacao.textContent =
        mensagem;
}


function fecharModal() {

    modalImportando.hidden =
        true;
}


// ============================================================
// SERVICE WORKER
// ============================================================

function registrarServiceWorker() {

    if (
        !(
            "serviceWorker"
            in navigator
        )
    ) {

        return;

    }


    window.addEventListener(
        "load",
        () => {

            navigator
                .serviceWorker
                .register(
                    "./service-worker.js"
                )
                .then(
                    registration => {

                        console.log(
                            "Service Worker:",
                            registration.scope
                        );

                    }
                )
                .catch(
                    erro => {

                        console.error(
                            "Erro no Service Worker:",
                            erro
                        );

                    }
                );

        }
    );
}


// ============================================================
// START
// ============================================================

iniciar();