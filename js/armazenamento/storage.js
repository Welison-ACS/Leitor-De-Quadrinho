const PREFIXO_PROGRESSO =
    "leitor-quadrinhos:progresso:";

const PREFIXO_METADADOS =
    "leitor-quadrinhos:metadados:";

const DB_CAPAS =
    "leitor-quadrinhos-interface";

const DB_CAPAS_VERSAO =
    1;

const STORE_CAPAS =
    "capas";


// ============================================================
// PROGRESSO
// ============================================================

export function obterProgresso(
    quadrinhoId
) {

    try {

        const valor =
            localStorage.getItem(
                PREFIXO_PROGRESSO +
                quadrinhoId
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
                Number.isFinite(
                    dados.ultimaLeitura
                )
                    ? dados.ultimaLeitura
                    : null

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


export function salvarProgresso(
    quadrinhoId,
    paginaAtual
) {

    try {

        const dados = {

            iniciado:
                true,

            paginaAtual:
                Number(
                    paginaAtual
                ) || 0,

            ultimaLeitura:
                Date.now()

        };


        localStorage.setItem(
            PREFIXO_PROGRESSO +
            quadrinhoId,
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


export function esquecerProgresso(
    quadrinhoId
) {

    try {

        localStorage.removeItem(
            PREFIXO_PROGRESSO +
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


// ============================================================
// METADADOS DE INTERFACE
//
// Aqui ficam somente preferências da interface. Nenhum arquivo
// do quadrinho é movido, renomeado ou excluído no aparelho.
// ============================================================

export function obterMetadados(
    itemId
) {

    try {

        const valor =
            localStorage.getItem(
                PREFIXO_METADADOS +
                itemId
            );


        if (!valor) {

            return {
                nomePersonalizado: null,
                oculto: false
            };

        }


        const dados =
            JSON.parse(
                valor
            );


        return {

            nomePersonalizado:
                typeof dados.nomePersonalizado ===
                    "string" &&
                dados.nomePersonalizado.trim()
                    ? dados.nomePersonalizado.trim()
                    : null,

            oculto:
                Boolean(
                    dados.oculto
                )

        };

    }
    catch (erro) {

        console.error(
            "Erro ao ler metadados:",
            erro
        );


        return {
            nomePersonalizado: null,
            oculto: false
        };

    }
}


function salvarMetadados(
    itemId,
    alteracoes
) {

    const atual =
        obterMetadados(
            itemId
        );


    const novo = {
        ...atual,
        ...alteracoes
    };


    try {

        localStorage.setItem(
            PREFIXO_METADADOS +
            itemId,
            JSON.stringify(
                novo
            )
        );

    }
    catch (erro) {

        console.error(
            "Erro ao salvar metadados:",
            erro
        );

    }
}


export function salvarNomePersonalizado(
    itemId,
    nome
) {

    const nomeLimpo =
        String(
            nome || ""
        ).trim();


    salvarMetadados(
        itemId,
        {
            nomePersonalizado:
                nomeLimpo ||
                null
        }
    );
}


export function definirOculto(
    itemId,
    oculto
) {

    salvarMetadados(
        itemId,
        {
            oculto:
                Boolean(
                    oculto
                )
        }
    );
}


// ============================================================
// CAPA PERSONALIZADA
//
// A única cópia persistente permitida aqui é a imagem escolhida
// manualmente pelo usuário como CAPA DA INTERFACE. As páginas dos
// quadrinhos continuam sempre nos arquivos/pastas originais.
// ============================================================

function abrirBancoCapas() {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const requisicao =
                indexedDB.open(
                    DB_CAPAS,
                    DB_CAPAS_VERSAO
                );


            requisicao.onupgradeneeded =
                evento => {

                    const db =
                        evento.target.result;


                    if (
                        !db.objectStoreNames.contains(
                            STORE_CAPAS
                        )
                    ) {

                        db.createObjectStore(
                            STORE_CAPAS,
                            {
                                keyPath: "id"
                            }
                        );

                    }

                };


            requisicao.onsuccess =
                () => {

                    resolve(
                        requisicao.result
                    );

                };


            requisicao.onerror =
                () => {

                    reject(
                        requisicao.error
                    );

                };

        }
    );
}


export async function salvarCapaPersonalizada(
    itemId,
    arquivo
) {

    if (
        !arquivo ||
        !(arquivo instanceof Blob)
    ) {

        throw new Error(
            "Selecione uma imagem válida para a capa."
        );

    }


    const db =
        await abrirBancoCapas();


    return new Promise(
        (
            resolve,
            reject
        ) => {

            const transacao =
                db.transaction(
                    STORE_CAPAS,
                    "readwrite"
                );


            transacao
                .objectStore(
                    STORE_CAPAS
                )
                .put({
                    id: itemId,
                    blob: arquivo,
                    atualizadoEm: Date.now()
                });


            transacao.oncomplete =
                () => {

                    db.close();
                    resolve();

                };


            transacao.onerror =
                () => {

                    const erro =
                        transacao.error;

                    db.close();
                    reject(
                        erro
                    );

                };

        }
    );
}


export async function obterCapaPersonalizada(
    itemId
) {

    try {

        const db =
            await abrirBancoCapas();


        return await new Promise(
            (
                resolve,
                reject
            ) => {

                const transacao =
                    db.transaction(
                        STORE_CAPAS,
                        "readonly"
                    );


                const requisicao =
                    transacao
                        .objectStore(
                            STORE_CAPAS
                        )
                        .get(
                            itemId
                        );


                requisicao.onsuccess =
                    () => {

                        const resultado =
                            requisicao.result;

                        db.close();

                        resolve(
                            resultado?.blob ||
                            null
                        );

                    };


                requisicao.onerror =
                    () => {

                        const erro =
                            requisicao.error;

                        db.close();
                        reject(
                            erro
                        );

                    };

            }
        );

    }
    catch (erro) {

        console.error(
            "Erro ao carregar capa personalizada:",
            erro
        );

        return null;

    }
}


export async function removerCapaPersonalizada(
    itemId
) {

    try {

        const db =
            await abrirBancoCapas();


        await new Promise(
            (
                resolve,
                reject
            ) => {

                const transacao =
                    db.transaction(
                        STORE_CAPAS,
                        "readwrite"
                    );


                transacao
                    .objectStore(
                        STORE_CAPAS
                    )
                    .delete(
                        itemId
                    );


                transacao.oncomplete =
                    () => resolve();


                transacao.onerror =
                    () => reject(
                        transacao.error
                    );

            }
        );


        db.close();

    }
    catch (erro) {

        console.error(
            "Erro ao restaurar capa automática:",
            erro
        );

    }
}
