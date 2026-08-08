const PREFIXO =
    "leitor-quadrinhos:progresso:";


// ============================================================
// OBTER PROGRESSO
// ============================================================

export function obterProgresso(
    quadrinhoId
) {

    try {

        const chave =
            PREFIXO +
            quadrinhoId;


        const valor =
            localStorage.getItem(
                chave
            );


        if (!valor) {

            return {
                iniciado: false,
                paginaAtual: 0,
                ultimaLeitura: null
            };

        }


        const dados =
            JSON.parse(
                valor
            );


        return {

            iniciado:
                Boolean(
                    dados.iniciado
                ),

            paginaAtual:
                Number.isInteger(
                    dados.paginaAtual
                )
                    ? dados.paginaAtual
                    : 0,

            ultimaLeitura:
                dados.ultimaLeitura ||
                null

        };

    }
    catch (erro) {

        console.error(
            "Erro ao ler progresso:",
            erro
        );


        return {
            iniciado: false,
            paginaAtual: 0,
            ultimaLeitura: null
        };

    }
}


// ============================================================
// SALVAR PROGRESSO
// ============================================================

export function salvarProgresso(
    quadrinhoId,
    paginaAtual
) {

    try {

        const chave =
            PREFIXO +
            quadrinhoId;


        const dados = {

            iniciado:
                true,

            paginaAtual:
                paginaAtual,

            ultimaLeitura:
                Date.now()

        };


        localStorage.setItem(
            chave,
            JSON.stringify(
                dados
            )
        );

    }
    catch (erro) {

        console.error(
            "Erro ao salvar progresso:",
            erro
        );

    }
}


// ============================================================
// ESQUECER PROGRESSO
// ============================================================

export function esquecerProgresso(
    quadrinhoId
) {

    try {

        localStorage.removeItem(
            PREFIXO +
            quadrinhoId
        );

    }
    catch (erro) {

        console.error(
            "Erro ao remover progresso:",
            erro
        );

    }
}