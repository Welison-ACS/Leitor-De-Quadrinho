// ============================================================
// PDF
//
// PDF.js é carregado somente quando um PDF realmente é usado.
// As páginas são renderizadas em memória e entregues ao mesmo
// leitor de imagens usado pelos demais formatos.
// ============================================================

const PDFJS_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs";

const PDFJS_WORKER_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";


let moduloPdfPromise =
    null;


const documentosPdf =
    new WeakMap();


const capasPdf =
    new WeakMap();


async function obterModuloPdf() {

    if (
        !moduloPdfPromise
    ) {

        moduloPdfPromise =
            import(
                PDFJS_URL
            )
                .then(
                    modulo => {

                        modulo
                            .GlobalWorkerOptions
                            .workerSrc =
                                PDFJS_WORKER_URL;


                        return modulo;

                    }
                );

    }


    return moduloPdfPromise;
}


async function abrirDocumentoPdf(
    arquivo
) {

    if (
        documentosPdf.has(
            arquivo
        )
    ) {

        return documentosPdf.get(
            arquivo
        );

    }


    const promessa =
        (
            async () => {

                const pdfjs =
                    await obterModuloPdf();


                const dados =
                    await arquivo.arrayBuffer();


                const tarefa =
                    pdfjs.getDocument({
                        data: dados
                    });


                return await tarefa.promise;

            }
        )();


    documentosPdf.set(
        arquivo,
        promessa
    );


    return promessa;
}


export async function obterTotalPaginasPdf(
    arquivo
) {

    const documento =
        await abrirDocumentoPdf(
            arquivo
        );


    return documento.numPages;
}


export async function renderizarPaginaPdf(
    arquivo,
    indice,
    larguraMaxima = 2200
) {

    const documento =
        await abrirDocumentoPdf(
            arquivo
        );


    const numeroPagina =
        Number(
            indice
        ) + 1;


    if (
        numeroPagina < 1 ||
        numeroPagina > documento.numPages
    ) {

        throw new Error(
            "Página de PDF inválida."
        );

    }


    const pagina =
        await documento.getPage(
            numeroPagina
        );


    const viewportBase =
        pagina.getViewport({
            scale: 1
        });


    const larguraAlvo =
        Math.min(
            larguraMaxima,
            Math.max(
                1200,
                Math.round(
                    viewportBase.width *
                    Math.min(
                        3,
                        window.devicePixelRatio || 1.5
                    )
                )
            )
        );


    const escala =
        larguraAlvo /
        viewportBase.width;


    const viewport =
        pagina.getViewport({
            scale: escala
        });


    const canvas =
        document.createElement(
            "canvas"
        );


    canvas.width =
        Math.ceil(
            viewport.width
        );


    canvas.height =
        Math.ceil(
            viewport.height
        );


    const contexto =
        canvas.getContext(
            "2d",
            {
                alpha: false
            }
        );


    if (!contexto) {

        throw new Error(
            "Não foi possível preparar a página do PDF."
        );

    }


    contexto.fillStyle =
        "#ffffff";


    contexto.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    await pagina.render({
        canvasContext: contexto,
        viewport
    }).promise;


    const blob =
        await new Promise(
            (
                resolve,
                reject
            ) => {

                canvas.toBlob(
                    resultado => {

                        if (
                            resultado
                        ) {

                            resolve(
                                resultado
                            );

                        }
                        else {

                            reject(
                                new Error(
                                    "Não foi possível renderizar a página do PDF."
                                )
                            );

                        }

                    },
                    "image/jpeg",
                    0.94
                );

            }
        );


    pagina.cleanup();


    return blob;
}


export async function obterCapaPdf(
    arquivo
) {

    if (
        capasPdf.has(
            arquivo
        )
    ) {

        return capasPdf.get(
            arquivo
        );

    }


    const promessa =
        renderizarPaginaPdf(
            arquivo,
            0,
            1000
        );


    capasPdf.set(
        arquivo,
        promessa
    );


    return promessa;
}
