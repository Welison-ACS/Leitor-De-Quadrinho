import {
    obterProgresso
} from "../armazenamento/storage.js";

import {
    listarImagensZip,
    extrairEntradaZip
} from "./zip.js";


// ============================================================
// FORMATOS
// ============================================================

const EXTENSOES_IMAGEM =
    new Set([
        "jpg",
        "jpeg",
        "png",
        "webp",
        "gif",
        "bmp",
        "avif"
    ]);


const EXTENSOES_COMPACTADAS =
    new Set([
        "zip",
        "cbz"
    ]);


// ============================================================
// ESTADO
// ============================================================

let bibliotecaRaiz =
    null;


const quadrinhosAtivos =
    new Map();


const categorias =
    new Map();


// ============================================================
// IMPORTAR BIBLIOTECA COMPLETA
// ============================================================

export async function importarBiblioteca(
    fileList,
    callbackProgresso = null
) {

    const arquivos =
        Array.from(
            fileList || []
        );


    if (
        arquivos.length === 0
    ) {

        throw new Error(
            "Nenhuma pasta foi selecionada."
        );

    }


    quadrinhosAtivos.clear();

    categorias.clear();


    atualizarMensagem(
        callbackProgresso,
        "Analisando estrutura de pastas..."
    );


    // ========================================================
    // DESCOBRIR PASTA RAIZ
    // ========================================================

    const primeiroCaminho =
        normalizarCaminho(
            arquivos[0].webkitRelativePath ||
            arquivos[0].name
        );


    const primeiraParte =
        primeiroCaminho
            .split("/")
            .filter(Boolean)[0];


    const nomeRaiz =
        primeiraParte ||
        "Quadrinhos";


    // ========================================================
    // RAIZ
    // ========================================================

    bibliotecaRaiz = {

        id:
            "categoria:raiz",

        tipo:
            "categoria",

        nome:
            nomeRaiz,

        caminho:
            "",

        pai:
            null,

        filhos:
            []

    };


    categorias.set(
        "",
        bibliotecaRaiz
    );


    // ========================================================
    // AGRUPAR IMAGENS POR PASTA
    // ========================================================

    const imagensPorPasta =
        new Map();


    const arquivosCompactados =
        [];


    for (
        const arquivo
        of arquivos
    ) {

        const caminhoCompleto =
            normalizarCaminho(
                arquivo.webkitRelativePath ||
                arquivo.name
            );


        let partes =
            caminhoCompleto
                .split("/")
                .filter(Boolean);


        // Remove a pasta raiz escolhida.
        if (
            partes[0] ===
            nomeRaiz
        ) {

            partes =
                partes.slice(1);

        }


        if (
            partes.length === 0
        ) {

            continue;

        }


        const nomeArquivo =
            partes[
                partes.length - 1
            ];


        const diretorios =
            partes.slice(
                0,
                -1
            );


        const pastaRelativa =
            diretorios.join(
                "/"
            );


        if (
            ehImagem(
                nomeArquivo
            )
        ) {

            if (
                !imagensPorPasta.has(
                    pastaRelativa
                )
            ) {

                imagensPorPasta.set(
                    pastaRelativa,
                    []
                );

            }


            imagensPorPasta
                .get(
                    pastaRelativa
                )
                .push(
                    arquivo
                );


            continue;

        }


        if (
            ehCompactado(
                nomeArquivo
            )
        ) {

            arquivosCompactados.push({

                arquivo,

                pastaRelativa,

                nomeArquivo

            });

        }

    }


    // ========================================================
    // DESCOBRIR QUAIS PASTAS PRECISAM VIRAR CATEGORIA
    // ========================================================

    const caminhosCategorias =
        new Set();


    // --------------------------------------------------------
    // Pastas que são pais de histórias em imagens.
    // --------------------------------------------------------

    for (
        const pastaHistoria
        of imagensPorPasta.keys()
    ) {

        const pai =
            obterCaminhoPai(
                pastaHistoria
            );


        adicionarCaminhoEAncestrais(
            caminhosCategorias,
            pai
        );

    }


    // --------------------------------------------------------
    // Pastas que contêm ZIP / CBZ.
    // --------------------------------------------------------

    for (
        const item
        of arquivosCompactados
    ) {

        adicionarCaminhoEAncestrais(
            caminhosCategorias,
            item.pastaRelativa
        );

    }


    // ========================================================
    // CASO ESPECIAL:
    //
    // Se uma pasta possui imagens diretas E também precisa
    // funcionar como categoria porque contém histórias abaixo,
    // ela continuará existindo como categoria.
    // ========================================================

    for (
        const pastaHistoria
        of imagensPorPasta.keys()
    ) {

        if (
            caminhosCategorias.has(
                pastaHistoria
            )
        ) {

            adicionarCaminhoEAncestrais(
                caminhosCategorias,
                pastaHistoria
            );

        }

    }


    // ========================================================
    // CRIAR CATEGORIAS
    // ========================================================

    const caminhosOrdenados =
        Array
            .from(
                caminhosCategorias
            )
            .filter(
                caminho =>
                    caminho !== ""
            )
            .sort(
                ordenarCaminhosPorNivel
            );


    for (
        const caminho
        of caminhosOrdenados
    ) {

        garantirCategoria(
            caminho
        );

    }


    // ========================================================
    // CRIAR HISTÓRIAS QUE SÃO PASTAS DE IMAGENS
    // ========================================================

    let historiasCriadas =
        0;


    for (
        const [
            pastaHistoria,
            imagens
        ]
        of imagensPorPasta
    ) {

        imagens.sort(
            ordenarArquivos
        );


        if (
            imagens.length === 0
        ) {

            continue;

        }


        let categoriaPai;


        let titulo;


        // ----------------------------------------------------
        // Imagens diretamente na raiz escolhida.
        // ----------------------------------------------------

        if (
            pastaHistoria === ""
        ) {

            categoriaPai =
                bibliotecaRaiz;


            titulo =
                nomeRaiz;

        }

        // ----------------------------------------------------
        // A própria pasta também contém filhos.
        //
        // Exemplo:
        //
        // Batman/
        // ├── 001.jpg
        // └── Volume 02/
        //
        // Nesse caso Batman continua categoria e criamos
        // "Leitura principal" dentro dela.
        // ----------------------------------------------------

        else if (
            caminhosCategorias.has(
                pastaHistoria
            )
        ) {

            categoriaPai =
                garantirCategoria(
                    pastaHistoria
                );


            titulo =
                "Leitura principal";

        }

        // ----------------------------------------------------
        // Caso normal:
        //
        // Superman/
        // └── História 01/
        //     ├── 001.jpg
        //     └── 002.jpg
        //
        // História 01 vira quadrinho.
        // ----------------------------------------------------

        else {

            const pai =
                obterCaminhoPai(
                    pastaHistoria
                );


            categoriaPai =
                garantirCategoria(
                    pai
                );


            titulo =
                obterNomeFinal(
                    pastaHistoria
                );

        }


        const assinatura =
            criarAssinaturaPasta(
                pastaHistoria,
                imagens
            );


        const id =
            gerarIdEstavel(
                assinatura
            );


        const progresso =
            obterProgresso(
                id
            );


        const quadrinho = {

            id,

            tipo:
                "quadrinho",

            formato:
                "pasta",

            titulo,

            caminho:
                pastaHistoria,

            totalPaginas:
                imagens.length,

            paginas:
                imagens,

            iniciado:
                progresso.iniciado,

            paginaAtual:
                limitarPagina(
                    progresso.paginaAtual,
                    imagens.length
                ),

            ultimaLeitura:
                progresso.ultimaLeitura,

            pai:
                categoriaPai

        };


        quadrinhosAtivos.set(
            id,
            quadrinho
        );


        categoriaPai.filhos.push(
            quadrinho
        );


        historiasCriadas++;

    }


    // ========================================================
    // CRIAR ZIP / CBZ
    // ========================================================

    for (
        let indice = 0;
        indice <
            arquivosCompactados.length;
        indice++
    ) {

        const item =
            arquivosCompactados[
                indice
            ];


        atualizarMensagem(
            callbackProgresso,
            `Lendo arquivo ${
                indice + 1
            } de ${
                arquivosCompactados.length
            }: ${item.nomeArquivo}`
        );


        try {

            const entradas =
                await listarImagensZip(
                    item.arquivo
                );


            if (
                entradas.length === 0
            ) {

                console.warn(
                    `Ignorado: ${item.nomeArquivo} não possui imagens.`
                );


                continue;

            }


            const categoriaPai =
                garantirCategoria(
                    item.pastaRelativa
                );


            const assinatura =
                criarAssinaturaCompactado(
                    item.pastaRelativa,
                    item.arquivo
                );


            const id =
                gerarIdEstavel(
                    assinatura
                );


            const progresso =
                obterProgresso(
                    id
                );


            const quadrinho = {

                id,

                tipo:
                    "quadrinho",

                formato:
                    obterExtensao(
                        item.nomeArquivo
                    ),

                titulo:
                    removerExtensao(
                        item.nomeArquivo
                    ),

                caminho:
                    combinarCaminho(
                        item.pastaRelativa,
                        item.nomeArquivo
                    ),

                totalPaginas:
                    entradas.length,

                paginas:
                    entradas,

                arquivoCompactado:
                    item.arquivo,

                iniciado:
                    progresso.iniciado,

                paginaAtual:
                    limitarPagina(
                        progresso.paginaAtual,
                        entradas.length
                    ),

                ultimaLeitura:
                    progresso.ultimaLeitura,

                pai:
                    categoriaPai

            };


            quadrinhosAtivos.set(
                id,
                quadrinho
            );


            categoriaPai.filhos.push(
                quadrinho
            );


            historiasCriadas++;

        }
        catch (erro) {

            console.error(
                `Não foi possível ler ${item.nomeArquivo}:`,
                erro
            );

        }

    }


    // ========================================================
    // LIMPAR CATEGORIAS VAZIAS
    // ========================================================

    removerCategoriasVazias(
        bibliotecaRaiz
    );


    // ========================================================
    // ORDENAR TUDO
    // ========================================================

    ordenarArvore(
        bibliotecaRaiz
    );


    atualizarMensagem(
        callbackProgresso,
        `${historiasCriadas} histórias encontradas.`
    );


    if (
        historiasCriadas === 0
    ) {

        throw new Error(
            "Nenhum quadrinho foi encontrado dentro da pasta selecionada."
        );

    }


    return bibliotecaRaiz;
}


// ============================================================
// OBTER RAIZ
// ============================================================

export function obterBibliotecaRaiz() {

    return bibliotecaRaiz;
}


// ============================================================
// OBTER CATEGORIA
// ============================================================

export function obterCategoria(
    id
) {

    if (
        !bibliotecaRaiz
    ) {

        return null;

    }


    return procurarCategoriaPorId(
        bibliotecaRaiz,
        id
    );
}


// ============================================================
// OBTER QUADRINHO
// ============================================================

export function obterQuadrinhoAtivo(
    quadrinhoId
) {

    return (
        quadrinhosAtivos.get(
            quadrinhoId
        ) ||
        null
    );
}


// ============================================================
// OBTER PRIMEIRO QUADRINHO DE UM NÓ
// ============================================================

export function obterPrimeiroQuadrinho(
    no
) {

    if (
        !no
    ) {

        return null;

    }


    if (
        no.tipo ===
        "quadrinho"
    ) {

        return no;

    }


    for (
        const filho
        of no.filhos
    ) {

        const resultado =
            obterPrimeiroQuadrinho(
                filho
            );


        if (
            resultado
        ) {

            return resultado;

        }

    }


    return null;
}


// ============================================================
// CONTAR QUADRINHOS
// ============================================================

export function contarQuadrinhos(
    no
) {

    if (
        !no
    ) {

        return 0;

    }


    if (
        no.tipo ===
        "quadrinho"
    ) {

        return 1;

    }


    return no.filhos.reduce(
        (
            total,
            filho
        ) =>
            total +
            contarQuadrinhos(
                filho
            ),
        0
    );
}


// ============================================================
// OBTER BLOB DA PÁGINA
// ============================================================

export async function obterBlobPagina(
    quadrinhoId,
    indice
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (
        !quadrinho
    ) {

        throw new Error(
            "Quadrinho não disponível nesta sessão."
        );

    }


    if (
        indice < 0 ||
        indice >=
            quadrinho.totalPaginas
    ) {

        throw new Error(
            "Página inválida."
        );

    }


    // ========================================================
    // PASTA NORMAL
    // ========================================================

    if (
        quadrinho.formato ===
        "pasta"
    ) {

        return quadrinho.paginas[
            indice
        ];

    }


    // ========================================================
    // ZIP / CBZ
    // ========================================================

    if (
        quadrinho.formato ===
            "zip" ||
        quadrinho.formato ===
            "cbz"
    ) {

        return await extrairEntradaZip(
            quadrinho.arquivoCompactado,
            quadrinho.paginas[
                indice
            ]
        );

    }


    throw new Error(
        "Formato de quadrinho não reconhecido."
    );
}


// ============================================================
// ATUALIZAR ESTADO
// ============================================================

export function atualizarEstadoLeitura(
    quadrinhoId,
    paginaAtual
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (
        !quadrinho
    ) {

        return;

    }


    quadrinho.iniciado =
        true;


    quadrinho.paginaAtual =
        paginaAtual;


    quadrinho.ultimaLeitura =
        Date.now();
}


// ============================================================
// GARANTIR CATEGORIA
// ============================================================

function garantirCategoria(
    caminho
) {

    caminho =
        normalizarCaminho(
            caminho
        );


    if (
        caminho === ""
    ) {

        return bibliotecaRaiz;

    }


    if (
        categorias.has(
            caminho
        )
    ) {

        return categorias.get(
            caminho
        );

    }


    const caminhoPai =
        obterCaminhoPai(
            caminho
        );


    const pai =
        garantirCategoria(
            caminhoPai
        );


    const categoria = {

        id:
            "categoria:" +
            caminho,

        tipo:
            "categoria",

        nome:
            obterNomeFinal(
                caminho
            ),

        caminho,

        pai,

        filhos:
            []

    };


    categorias.set(
        caminho,
        categoria
    );


    pai.filhos.push(
        categoria
    );


    return categoria;
}


// ============================================================
// CATEGORIA POR ID
// ============================================================

function procurarCategoriaPorId(
    categoria,
    id
) {

    if (
        categoria.id ===
        id
    ) {

        return categoria;

    }


    for (
        const filho
        of categoria.filhos
    ) {

        if (
            filho.tipo !==
            "categoria"
        ) {

            continue;

        }


        const resultado =
            procurarCategoriaPorId(
                filho,
                id
            );


        if (
            resultado
        ) {

            return resultado;

        }

    }


    return null;
}


// ============================================================
// REMOVER CATEGORIAS VAZIAS
// ============================================================

function removerCategoriasVazias(
    categoria
) {

    categoria.filhos =
        categoria.filhos.filter(
            filho => {

                if (
                    filho.tipo ===
                    "quadrinho"
                ) {

                    return true;

                }


                removerCategoriasVazias(
                    filho
                );


                return (
                    filho.filhos.length >
                    0
                );

            }
        );
}


// ============================================================
// ORDENAR ÁRVORE
// ============================================================

function ordenarArvore(
    categoria
) {

    categoria.filhos.sort(
        (
            a,
            b
        ) => {

            // Categorias primeiro.
            if (
                a.tipo !==
                b.tipo
            ) {

                return a.tipo ===
                    "categoria"
                    ? -1
                    : 1;

            }


            return a.nome.localeCompare(
                b.nome,
                undefined,
                {
                    numeric: true,
                    sensitivity: "base"
                }
            );

        }
    );


    for (
        const filho
        of categoria.filhos
    ) {

        if (
            filho.tipo ===
            "categoria"
        ) {

            ordenarArvore(
                filho
            );

        }

    }
}


// ============================================================
// ADICIONAR CAMINHO + PAIS
// ============================================================

function adicionarCaminhoEAncestrais(
    conjunto,
    caminho
) {

    caminho =
        normalizarCaminho(
            caminho
        );


    conjunto.add(
        caminho
    );


    while (
        caminho !== ""
    ) {

        caminho =
            obterCaminhoPai(
                caminho
            );


        conjunto.add(
            caminho
        );

    }
}


// ============================================================
// IMAGEM
// ============================================================

function ehImagem(
    nome
) {

    return EXTENSOES_IMAGEM.has(
        obterExtensao(
            nome
        )
    );
}


// ============================================================
// COMPACTADO
// ============================================================

function ehCompactado(
    nome
) {

    return EXTENSOES_COMPACTADAS.has(
        obterExtensao(
            nome
        )
    );
}


// ============================================================
// ASSINATURA PASTA
// ============================================================

function criarAssinaturaPasta(
    caminho,
    arquivos
) {

    return [

        "pasta",

        caminho,

        ...arquivos.map(
            arquivo => {

                return [

                    arquivo.webkitRelativePath ||
                        arquivo.name,

                    arquivo.size,

                    arquivo.lastModified

                ].join(
                    ":"
                );

            }
        )

    ].join(
        "|"
    );
}


// ============================================================
// ASSINATURA ZIP / CBZ
// ============================================================

function criarAssinaturaCompactado(
    pasta,
    arquivo
) {

    return [

        "compactado",

        pasta,

        arquivo.name,

        arquivo.size,

        arquivo.lastModified

    ].join(
        "|"
    );
}


// ============================================================
// ID ESTÁVEL
// ============================================================

function gerarIdEstavel(
    texto
) {

    let hash =
        2166136261;


    for (
        let i = 0;
        i < texto.length;
        i++
    ) {

        hash ^=
            texto.charCodeAt(
                i
            );


        hash =
            Math.imul(
                hash,
                16777619
            );

    }


    return (
        "hq-" +
        (
            hash >>> 0
        ).toString(
            16
        )
    );
}


// ============================================================
// ORDENAÇÃO DE ARQUIVOS
// ============================================================

function ordenarArquivos(
    a,
    b
) {

    const nomeA =
        a.webkitRelativePath ||
        a.name;


    const nomeB =
        b.webkitRelativePath ||
        b.name;


    return nomeA.localeCompare(
        nomeB,
        undefined,
        {
            numeric: true,
            sensitivity: "base"
        }
    );
}


// ============================================================
// ORDENAÇÃO DE CAMINHOS POR PROFUNDIDADE
// ============================================================

function ordenarCaminhosPorNivel(
    a,
    b
) {

    const nivelA =
        a
            .split("/")
            .filter(Boolean)
            .length;


    const nivelB =
        b
            .split("/")
            .filter(Boolean)
            .length;


    if (
        nivelA !== nivelB
    ) {

        return nivelA -
            nivelB;

    }


    return a.localeCompare(
        b,
        undefined,
        {
            numeric: true,
            sensitivity: "base"
        }
    );
}


// ============================================================
// CAMINHO PAI
// ============================================================

function obterCaminhoPai(
    caminho
) {

    caminho =
        normalizarCaminho(
            caminho
        );


    if (
        caminho === ""
    ) {

        return "";

    }


    const partes =
        caminho
            .split("/")
            .filter(Boolean);


    partes.pop();


    return partes.join(
        "/"
    );
}


// ============================================================
// ÚLTIMO NOME
// ============================================================

function obterNomeFinal(
    caminho
) {

    const partes =
        normalizarCaminho(
            caminho
        )
            .split("/")
            .filter(Boolean);


    return (
        partes[
            partes.length - 1
        ] ||
        "Quadrinho"
    );
}


// ============================================================
// COMBINAR CAMINHO
// ============================================================

function combinarCaminho(
    pasta,
    arquivo
) {

    if (
        !pasta
    ) {

        return arquivo;

    }


    return (
        pasta +
        "/" +
        arquivo
    );
}


// ============================================================
// NORMALIZAR CAMINHO
// ============================================================

function normalizarCaminho(
    caminho
) {

    return String(
        caminho || ""
    )
        .replace(
            /\\/g,
            "/"
        )
        .replace(
            /^\/+/,
            ""
        )
        .replace(
            /\/+$/,
            ""
        );
}


// ============================================================
// EXTENSÃO
// ============================================================

function obterExtensao(
    nome
) {

    const ponto =
        nome.lastIndexOf(
            "."
        );


    if (
        ponto === -1
    ) {

        return "";

    }


    return nome
        .slice(
            ponto + 1
        )
        .toLowerCase();
}


// ============================================================
// REMOVER EXTENSÃO
// ============================================================

function removerExtensao(
    nome
) {

    return nome.replace(
        /\.[^/.]+$/,
        ""
    );
}


// ============================================================
// LIMITAR PÁGINA
// ============================================================

function limitarPagina(
    pagina,
    total
) {

    if (
        total <= 0
    ) {

        return 0;

    }


    return Math.min(
        Math.max(
            Number(
                pagina
            ) || 0,
            0
        ),
        total - 1
    );
}


// ============================================================
// CALLBACK
// ============================================================

function atualizarMensagem(
    callback,
    mensagem
) {

    if (
        typeof callback ===
        "function"
    ) {

        callback(
            mensagem
        );

    }
}