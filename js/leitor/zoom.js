// ============================================================
// ZOOM
// ============================================================

export function criarControleZoom({
    container,
    imagem,
    aoAlterarZoom = null
}) {

    let escala = 1;

    let posX = 0;
    let posY = 0;

    let ponteiros =
        new Map();

    let distanciaInicial =
        null;

    let escalaInicial =
        1;

    let arrastando =
        false;

    let ultimoX =
        0;

    let ultimoY =
        0;


    const ESCALA_MINIMA =
        1;

    const ESCALA_MAXIMA =
        5;


    // ========================================================
    // APLICAR TRANSFORMAÇÃO
    // ========================================================

    function aplicarTransformacao() {

        imagem.style.transform =
            `translate(${posX}px, ${posY}px) scale(${escala})`;


        if (aoAlterarZoom) {

            aoAlterarZoom(
                escala
            );

        }

    }


    // ========================================================
    // LIMITAR
    // ========================================================

    function limitarEscala(
        valor
    ) {

        return Math.min(
            ESCALA_MAXIMA,
            Math.max(
                ESCALA_MINIMA,
                valor
            )
        );
    }


    // ========================================================
    // ZOOM
    // ========================================================

    function definirEscala(
        novaEscala
    ) {

        escala =
            limitarEscala(
                novaEscala
            );


        if (escala === 1) {

            posX = 0;
            posY = 0;

        }


        aplicarTransformacao();

    }


    function aumentar() {

        definirEscala(
            escala + 0.25
        );

    }


    function diminuir() {

        definirEscala(
            escala - 0.25
        );

    }


    function resetar() {

        escala = 1;

        posX = 0;
        posY = 0;

        distanciaInicial =
            null;

        aplicarTransformacao();

    }


    // ========================================================
    // WHEEL
    // ========================================================

    container.addEventListener(
        "wheel",
        event => {

            if (
                !event.ctrlKey
            ) {
                return;
            }


            event.preventDefault();


            if (
                event.deltaY < 0
            ) {

                aumentar();

            }
            else {

                diminuir();

            }

        },
        {
            passive: false
        }
    );


    // ========================================================
    // PONTEIROS
    // ========================================================

    container.addEventListener(
        "pointerdown",
        event => {

            ponteiros.set(
                event.pointerId,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );


            if (
                ponteiros.size === 1
            ) {

                ultimoX =
                    event.clientX;

                ultimoY =
                    event.clientY;

                arrastando =
                    escala > 1;

            }


            if (
                ponteiros.size === 2
            ) {

                const pontos =
                    Array.from(
                        ponteiros.values()
                    );

                distanciaInicial =
                    distancia(
                        pontos[0],
                        pontos[1]
                    );

                escalaInicial =
                    escala;

                arrastando =
                    false;

            }

        }
    );


    container.addEventListener(
        "pointermove",
        event => {

            if (
                !ponteiros.has(
                    event.pointerId
                )
            ) {
                return;
            }


            ponteiros.set(
                event.pointerId,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );


            // ------------------------------------------------
            // PINÇA
            // ------------------------------------------------

            if (
                ponteiros.size === 2
            ) {

                const pontos =
                    Array.from(
                        ponteiros.values()
                    );

                const distanciaAtual =
                    distancia(
                        pontos[0],
                        pontos[1]
                    );


                if (
                    !distanciaInicial
                ) {
                    return;
                }


                const fator =
                    distanciaAtual /
                    distanciaInicial;


                escala =
                    limitarEscala(
                        escalaInicial *
                        fator
                    );


                if (
                    escala === 1
                ) {

                    posX = 0;
                    posY = 0;

                }


                aplicarTransformacao();

                return;
            }


            // ------------------------------------------------
            // ARRASTAR
            // ------------------------------------------------

            if (
                ponteiros.size === 1 &&
                arrastando &&
                escala > 1
            ) {

                const deltaX =
                    event.clientX -
                    ultimoX;

                const deltaY =
                    event.clientY -
                    ultimoY;


                posX +=
                    deltaX;

                posY +=
                    deltaY;


                ultimoX =
                    event.clientX;

                ultimoY =
                    event.clientY;


                aplicarTransformacao();

            }

        }
    );


    const finalizarPonteiro =
        event => {

            ponteiros.delete(
                event.pointerId
            );


            if (
                ponteiros.size < 2
            ) {

                distanciaInicial =
                    null;

            }


            if (
                ponteiros.size === 0
            ) {

                arrastando =
                    false;

            }

        };


    container.addEventListener(
        "pointerup",
        finalizarPonteiro
    );

    container.addEventListener(
        "pointercancel",
        finalizarPonteiro
    );


    // ========================================================
    // DUPLO CLIQUE
    // ========================================================

    container.addEventListener(
        "dblclick",
        event => {

            event.preventDefault();


            if (
                escala === 1
            ) {

                definirEscala(
                    2
                );

            }
            else {

                resetar();

            }

        }
    );


    // ========================================================
    // API
    // ========================================================

    return {

        aumentar,

        diminuir,

        resetar,

        definirEscala,

        obterEscala() {

            return escala;

        }

    };
}


// ============================================================
// DISTÂNCIA
// ============================================================

function distancia(
    pontoA,
    pontoB
) {

    const x =
        pontoA.x -
        pontoB.x;

    const y =
        pontoA.y -
        pontoB.y;


    return Math.sqrt(
        x * x +
        y * y
    );
}