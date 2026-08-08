// ============================================================
// NAVEGAÇÃO
// ============================================================

export function configurarNavegacao({
    palco,
    aoAnterior,
    aoProximo,
    aoAlternarControles,
    podeNavegar
}) {

    let inicioX =
        null;

    let inicioY =
        null;

    let inicioTempo =
        null;


    // ========================================================
    // TECLADO
    // ========================================================

    window.addEventListener(
        "keydown",
        event => {

            if (
                !podeNavegar()
            ) {
                return;
            }


            switch (
                event.key
            ) {

                case "ArrowLeft":

                    event.preventDefault();

                    aoAnterior();

                    break;


                case "ArrowRight":

                    event.preventDefault();

                    aoProximo();

                    break;


                case "Escape":

                    aoAlternarControles(
                        true
                    );

                    break;

            }

        }
    );


    // ========================================================
    // SWIPE
    // ========================================================

    palco.addEventListener(
        "pointerdown",
        event => {

            if (
                !podeNavegar()
            ) {
                return;
            }


            inicioX =
                event.clientX;

            inicioY =
                event.clientY;

            inicioTempo =
                Date.now();

        }
    );


    palco.addEventListener(
        "pointerup",
        event => {

            if (
                inicioX === null ||
                inicioY === null
            ) {
                return;
            }


            if (
                !podeNavegar()
            ) {

                limpar();

                return;
            }


            const deltaX =
                event.clientX -
                inicioX;

            const deltaY =
                event.clientY -
                inicioY;

            const tempo =
                Date.now() -
                inicioTempo;


            const distanciaHorizontal =
                Math.abs(
                    deltaX
                );

            const distanciaVertical =
                Math.abs(
                    deltaY
                );


            const ehSwipe =
                distanciaHorizontal >= 55 &&
                distanciaHorizontal >
                    distanciaVertical * 1.3 &&
                tempo < 800;


            if (ehSwipe) {

                if (
                    deltaX < 0
                ) {

                    aoProximo();

                }
                else {

                    aoAnterior();

                }

            }


            limpar();

        }
    );


    // ========================================================
    // CLIQUE CENTRAL
    // ========================================================

    palco.addEventListener(
        "click",
        event => {

            if (
                event.target.closest(
                    "button"
                )
            ) {
                return;
            }


            if (
                !podeNavegar()
            ) {
                return;
            }


            aoAlternarControles();

        }
    );


    // ========================================================
    // LIMPAR
    // ========================================================

    function limpar() {

        inicioX =
            null;

        inicioY =
            null;

        inicioTempo =
            null;

    }
}