import {
    obterProgresso
} from "../armazenamento/storage.js";

import {
    listarImagensZip,
    extrairEntradaZip
} from "./zip.js";

import {
    obterTotalPaginasPdf,
    renderizarPaginaPdf,
    obterCapaPdf
} from "./pdf.js";


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


const NOMES_RAIZ_BIBLIOTECA =
    new Set([
        "quadrinhos",
        "quadrinho",
        "hq",
        "hqs",
        "comics",
        "biblioteca",
        "minha biblioteca",
        "meus quadrinhos",
        "biblioteca de quadrinhos"
    ]);


// ============================================================
// ORDENAÇÃO NATURAL SEGURA
// ============================================================

const COMPARADOR_NATURAL =
    new Intl.Collator(
        "pt-BR",
        {
            numeric: true,
            sensitivity: "base"
        }
    );


function compararNatural(
    valorA,
    valorB
) {

    return COMPARADOR_NATURAL.compare(
        String(valorA ?? ""),
        String(valorB ?? "")
    );
}


// ============================================================
// ESTADO DA SESSÃO
// ============================================================

let bibliotecaRaiz =
    null;


let nomeRaizSelecionada =
    "Quadrinhos";


let raizEhBiblioteca =
    true;


let categoriaBase =
    null;


const quadrinhosAtivos =
    new Map();


const categorias =
    new Map();


// ============================================================
// IMPORTAR BIBLIOTECA
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
        "Analisando estrutura da biblioteca..."
    );


    nomeRaizSelecionada =
        descobrirNomeRaiz(
            arquivos
        );


    raizEhBiblioteca =
        ehNomeGenericoBiblioteca(
            nomeRaizSelecionada
        );


    criarEstruturaRaiz();


    const imagensPorPasta =
        new Map();


    const arquivosLeitura =
        [];


    const primeirasPastas =
        new Set();


    // ========================================================
    // CLASSIFICAR ARQUIVOS
    // ========================================================

    for (
        const arquivo
        of arquivos
    ) {

        const caminhoRelativo =
            obterCaminhoRelativoSemRaiz(
                arquivo,
                nomeRaizSelecionada
            );


        if (
            !caminhoRelativo
        ) {

            continue;

        }


        const partes =
            caminhoRelativo
                .split("/")
                .filter(Boolean);


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
            diretorios.length > 0
        ) {

            primeirasPastas.add(
                diretorios[0]
            );

        }


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


        const extensao =
            obterExtensao(
                nomeArquivo
            );


        if (
            EXTENSOES_COMPACTADAS.has(
                extensao
            ) ||
            extensao === "pdf"
        ) {

            arquivosLeitura.push({
                arquivo,
                pastaRelativa,
                nomeArquivo,
                formato: extensao
            });

        }

    }


    // ========================================================
    // DESCOBRIR CATEGORIAS
    // ========================================================

    const caminhosCategorias =
        new Set([
            ""
        ]);


    // Pastas que são pais de uma história em imagens.
    for (
        const pastaHistoria
        of imagensPorPasta.keys()
    ) {

        adicionarCaminhoEAncestrais(
            caminhosCategorias,
            obterCaminhoPai(
                pastaHistoria
            )
        );

    }


    // Pastas que contêm ZIP, CBZ ou PDF.
    for (
        const item
        of arquivosLeitura
    ) {

        adicionarCaminhoEAncestrais(
            caminhosCategorias,
            item.pastaRelativa
        );

    }


    // Quando a pasta escolhida é a biblioteca geral, o primeiro
    // nível é SEMPRE tratado como obra. Isso impede que Superman,
    // Batman, Kim Possible etc. sejam achatados na tela principal.
    if (
        raizEhBiblioteca
    ) {

        for (
            const pasta
            of primeirasPastas
        ) {

            adicionarCaminhoEAncestrais(
                caminhosCategorias,
                pasta
            );

        }

    }


    // Uma pasta que contém páginas e também contém outras histórias
    // continua sendo categoria e ganha uma "Leitura principal".
    for (
        const pastaHistoria
        of imagensPorPasta.keys()
    ) {

        const prefixo =
            pastaHistoria
                ? pastaHistoria + "/"
                : "";


        const possuiDescendentes =
            Array.from(
                imagensPorPasta.keys()
            ).some(
                outra =>
                    outra !== pastaHistoria &&
                    outra.startsWith(
                        prefixo
                    )
            ) ||
            arquivosLeitura.some(
                item =>
                    item.pastaRelativa !== pastaHistoria &&
                    item.pastaRelativa.startsWith(
                        prefixo
                    )
            );


        if (
            possuiDescendentes
        ) {

            adicionarCaminhoEAncestrais(
                caminhosCategorias,
                pastaHistoria
            );

        }

    }


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
    // HISTÓRIAS BASEADAS EM PASTAS DE IMAGENS
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


        if (
            pastaHistoria === ""
        ) {

            categoriaPai =
                categoriaBase;

            titulo =
                "Leitura principal";

        }
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
        else {

            categoriaPai =
                garantirCategoria(
                    obterCaminhoPai(
                        pastaHistoria
                    )
                );

            titulo =
                obterNomeFinal(
                    pastaHistoria
                );

        }


        const caminhoIdentidade =
            obterCaminhoIdentidade(
                combinarCaminho(
                    pastaHistoria,
                    "@imagens"
                )
            );


        const quadrinho =
            criarQuadrinhoBase({
                formato: "pasta",
                titulo,
                caminho: pastaHistoria,
                caminhoIdentidade,
                totalPaginas: imagens.length,
                paginas: imagens,
                categoriaPai,
                idLegado: criarIdLegadoPasta(
                    pastaHistoria,
                    imagens
                )
            });


        registrarQuadrinho(
            quadrinho,
            categoriaPai
        );


        historiasCriadas++;

    }


    // ========================================================
    // ZIP / CBZ / PDF
    // ========================================================

    for (
        let indice = 0;
        indice < arquivosLeitura.length;
        indice++
    ) {

        const item =
            arquivosLeitura[
                indice
            ];


        atualizarMensagem(
            callbackProgresso,
            `Lendo ${indice + 1} de ${arquivosLeitura.length}: ${item.nomeArquivo}`
        );


        try {

            const categoriaPai =
                garantirCategoria(
                    item.pastaRelativa
                );


            const caminho =
                combinarCaminho(
                    item.pastaRelativa,
                    item.nomeArquivo
                );


            const caminhoIdentidade =
                obterCaminhoIdentidade(
                    caminho
                );


            let quadrinho;


            if (
                item.formato === "pdf"
            ) {

                const totalPaginas =
                    await obterTotalPaginasPdf(
                        item.arquivo
                    );


                if (
                    totalPaginas <= 0
                ) {

                    continue;

                }


                quadrinho =
                    criarQuadrinhoBase({
                        formato: "pdf",
                        titulo: removerExtensao(
                            item.nomeArquivo
                        ),
                        caminho,
                        caminhoIdentidade,
                        totalPaginas,
                        paginas: null,
                        arquivoPdf: item.arquivo,
                        categoriaPai
                    });

            }
            else {

                const entradas =
                    await listarImagensZip(
                        item.arquivo
                    );


                if (
                    entradas.length === 0
                ) {

                    continue;

                }


                quadrinho =
                    criarQuadrinhoBase({
                        formato: item.formato,
                        titulo: removerExtensao(
                            item.nomeArquivo
                        ),
                        caminho,
                        caminhoIdentidade,
                        totalPaginas: entradas.length,
                        paginas: entradas,
                        arquivoCompactado: item.arquivo,
                        categoriaPai,
                        idLegado: criarIdLegadoCompactado(
                            item.pastaRelativa,
                            item.arquivo
                        )
                    });

            }


            registrarQuadrinho(
                quadrinho,
                categoriaPai
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


    removerCategoriasVazias(
        bibliotecaRaiz
    );


    ordenarArvore(
        bibliotecaRaiz
    );


    if (
        historiasCriadas === 0
    ) {

        throw new Error(
            "Nenhum quadrinho compatível foi encontrado."
        );

    }


    atualizarMensagem(
        callbackProgresso,
        `${historiasCriadas} histórias encontradas.`
    );


    return bibliotecaRaiz;
}


// ============================================================
// RAIZ / CATEGORIAS / QUADRINHOS
// ============================================================

function criarEstruturaRaiz() {

    if (
        raizEhBiblioteca
    ) {

        bibliotecaRaiz = {
            id: "categoria:raiz",
            tipo: "categoria",
            nome: nomeRaizSelecionada,
            caminho: "",
            pai: null,
            filhos: [],
            virtual: true
        };


        categoriaBase =
            bibliotecaRaiz;


        categorias.set(
            "",
            categoriaBase
        );


        return;

    }


    bibliotecaRaiz = {
        id: "categoria:raiz",
        tipo: "categoria",
        nome: "Biblioteca",
        caminho: "__biblioteca__",
        pai: null,
        filhos: [],
        virtual: true
    };


    categoriaBase = {
        id: gerarIdCategoria(
            nomeRaizSelecionada
        ),
        tipo: "categoria",
        nome: nomeRaizSelecionada,
        caminho: "",
        pai: bibliotecaRaiz,
        filhos: [],
        obraRaizSelecionada: true
    };


    bibliotecaRaiz.filhos.push(
        categoriaBase
    );


    categorias.set(
        "",
        categoriaBase
    );
}


function criarQuadrinhoBase({
    formato,
    titulo,
    caminho,
    caminhoIdentidade,
    totalPaginas,
    paginas,
    arquivoCompactado = null,
    arquivoPdf = null,
    categoriaPai,
    idLegado = null
}) {

    const id =
        gerarIdEstavel(
            "quadrinho|" +
            caminhoIdentidade
        );


    const progressoNovo =
        obterProgresso(
            id
        );


    const progressoLegado =
        !progressoNovo.iniciado &&
        idLegado
            ? obterProgresso(
                idLegado
            )
            : null;


    const progresso =
        progressoLegado?.iniciado
            ? progressoLegado
            : progressoNovo;


    return {
        id,
        tipo: "quadrinho",
        formato,
        titulo,
        caminho,
        caminhoIdentidade,
        totalPaginas,
        paginas,
        arquivoCompactado,
        arquivoPdf,
        iniciado: progresso.iniciado,
        paginaAtual: limitarPagina(
            progresso.paginaAtual,
            totalPaginas
        ),
        ultimaLeitura: progresso.ultimaLeitura,
        pai: categoriaPai
    };
}


function registrarQuadrinho(
    quadrinho,
    categoriaPai
) {

    quadrinhosAtivos.set(
        quadrinho.id,
        quadrinho
    );


    categoriaPai.filhos.push(
        quadrinho
    );
}


export function obterBibliotecaRaiz() {

    return bibliotecaRaiz;
}


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


export function obterQuadrinhoAtivo(
    quadrinhoId
) {

    return quadrinhosAtivos.get(
        quadrinhoId
    ) || null;
}


export function listarQuadrinhosAtivos() {

    return Array.from(
        quadrinhosAtivos.values()
    );
}


export function obterPrimeiroQuadrinho(
    no
) {

    if (!no) {
        return null;
    }


    if (
        no.tipo === "quadrinho"
    ) {
        return no;
    }


    for (
        const filho
        of no.filhos || []
    ) {

        const resultado =
            obterPrimeiroQuadrinho(
                filho
            );


        if (resultado) {
            return resultado;
        }

    }


    return null;
}


export function contarQuadrinhos(
    no
) {

    if (!no) {
        return 0;
    }


    if (
        no.tipo === "quadrinho"
    ) {
        return 1;
    }


    return (
        no.filhos || []
    ).reduce(
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
// PÁGINAS / CAPAS
// ============================================================

export async function obterBlobPagina(
    quadrinhoId,
    indice
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (!quadrinho) {

        throw new Error(
            "Quadrinho não disponível nesta sessão."
        );

    }


    if (
        indice < 0 ||
        indice >= quadrinho.totalPaginas
    ) {

        throw new Error(
            "Página inválida."
        );

    }


    if (
        quadrinho.formato === "pasta"
    ) {

        return quadrinho.paginas[
            indice
        ];

    }


    if (
        quadrinho.formato === "zip" ||
        quadrinho.formato === "cbz"
    ) {

        return await extrairEntradaZip(
            quadrinho.arquivoCompactado,
            quadrinho.paginas[
                indice
            ]
        );

    }


    if (
        quadrinho.formato === "pdf"
    ) {

        return await renderizarPaginaPdf(
            quadrinho.arquivoPdf,
            indice
        );

    }


    throw new Error(
        "Formato de quadrinho não reconhecido."
    );
}


export async function obterBlobCapaQuadrinho(
    quadrinhoId
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (!quadrinho) {
        return null;
    }


    if (
        quadrinho.formato === "pdf"
    ) {

        return await obterCapaPdf(
            quadrinho.arquivoPdf
        );

    }


    return await obterBlobPagina(
        quadrinhoId,
        0
    );
}


export function atualizarEstadoLeitura(
    quadrinhoId,
    paginaAtual
) {

    const quadrinho =
        obterQuadrinhoAtivo(
            quadrinhoId
        );


    if (!quadrinho) {
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
// CATEGORIAS
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

        return categoriaBase;

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
        id: gerarIdCategoria(
            obterCaminhoIdentidade(
                caminho
            )
        ),
        tipo: "categoria",
        nome: obterNomeFinal(
            caminho
        ),
        caminho,
        pai,
        filhos: []
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


function procurarCategoriaPorId(
    categoria,
    id
) {

    if (
        categoria.id === id
    ) {
        return categoria;
    }


    for (
        const filho
        of categoria.filhos || []
    ) {

        if (
            filho.tipo !== "categoria"
        ) {
            continue;
        }


        const resultado =
            procurarCategoriaPorId(
                filho,
                id
            );


        if (resultado) {
            return resultado;
        }

    }


    return null;
}


function removerCategoriasVazias(
    categoria
) {

    categoria.filhos =
        (
            categoria.filhos || []
        ).filter(
            filho => {

                if (
                    filho.tipo === "quadrinho"
                ) {
                    return true;
                }


                removerCategoriasVazias(
                    filho
                );


                return filho.filhos.length > 0;

            }
        );
}


function ordenarArvore(
    categoria
) {

    if (
        !categoria ||
        !Array.isArray(
            categoria.filhos
        )
    ) {
        return;
    }


    categoria.filhos.sort(
        (
            a,
            b
        ) => {

            const tipoA =
                a?.tipo || "";

            const tipoB =
                b?.tipo || "";


            if (
                tipoA !== tipoB
            ) {

                if (
                    tipoA === "categoria"
                ) {
                    return -1;
                }


                if (
                    tipoB === "categoria"
                ) {
                    return 1;
                }

            }


            return compararNatural(
                tipoA === "categoria"
                    ? a?.nome
                    : a?.titulo,
                tipoB === "categoria"
                    ? b?.nome
                    : b?.titulo
            );

        }
    );


    for (
        const filho
        of categoria.filhos
    ) {

        if (
            filho?.tipo === "categoria"
        ) {

            ordenarArvore(
                filho
            );

        }

    }
}


// ============================================================
// CAMINHOS / NOMES
// ============================================================

function descobrirNomeRaiz(
    arquivos
) {

    const primeiro =
        arquivos.find(
            arquivo =>
                arquivo?.webkitRelativePath ||
                arquivo?.name
        );


    const caminho =
        normalizarCaminho(
            primeiro?.webkitRelativePath ||
            primeiro?.name ||
            "Quadrinhos"
        );


    return caminho
        .split("/")
        .filter(Boolean)[0] ||
        "Quadrinhos";
}


function obterCaminhoRelativoSemRaiz(
    arquivo,
    raiz
) {

    const caminhoCompleto =
        normalizarCaminho(
            arquivo?.webkitRelativePath ||
            arquivo?.name ||
            ""
        );


    const partes =
        caminhoCompleto
            .split("/")
            .filter(Boolean);


    if (
        partes[0] === raiz
    ) {

        partes.shift();

    }


    return partes.join(
        "/"
    );
}


function obterCaminhoIdentidade(
    caminhoRelativo
) {

    const caminho =
        normalizarCaminho(
            caminhoRelativo
        );


    if (
        raizEhBiblioteca
    ) {

        return caminho;

    }


    return combinarCaminho(
        nomeRaizSelecionada,
        caminho
    );
}


function gerarIdCategoria(
    caminhoIdentidade
) {

    return gerarIdEstavel(
        "categoria|" +
        caminhoIdentidade
    );
}


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


function obterCaminhoPai(
    caminho
) {

    const partes =
        normalizarCaminho(
            caminho
        )
            .split("/")
            .filter(Boolean);


    partes.pop();


    return partes.join(
        "/"
    );
}


function obterNomeFinal(
    caminho
) {

    const partes =
        normalizarCaminho(
            caminho
        )
            .split("/")
            .filter(Boolean);


    return partes[
        partes.length - 1
    ] || "Quadrinho";
}


function combinarCaminho(
    pasta,
    arquivo
) {

    const a =
        normalizarCaminho(
            pasta
        );

    const b =
        normalizarCaminho(
            arquivo
        );


    if (!a) {
        return b;
    }


    if (!b) {
        return a;
    }


    return a + "/" + b;
}


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
            /^\/+|\/+$/g,
            ""
        );
}


function normalizarNomeComparacao(
    nome
) {

    return String(
        nome || ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .toLowerCase()
        .replace(
            /[_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}


function ehNomeGenericoBiblioteca(
    nome
) {

    return NOMES_RAIZ_BIBLIOTECA.has(
        normalizarNomeComparacao(
            nome
        )
    );
}


// ============================================================
// COMPATIBILIDADE COM O PROGRESSO DA V5
// ============================================================

function criarIdLegadoPasta(
    caminho,
    arquivos
) {

    const assinatura = [
        "pasta",
        caminho,
        ...arquivos.map(
            arquivo => [
                arquivo?.webkitRelativePath ||
                    arquivo?.name ||
                    "",
                arquivo?.size || 0,
                arquivo?.lastModified || 0
            ].join(
                ":"
            )
        )
    ].join(
        "|"
    );


    return gerarHashFnv(
        assinatura,
        "hq-"
    );
}


function criarIdLegadoCompactado(
    pasta,
    arquivo
) {

    const assinatura = [
        "compactado",
        pasta,
        arquivo?.name || "",
        arquivo?.size || 0,
        arquivo?.lastModified || 0
    ].join(
        "|"
    );


    return gerarHashFnv(
        assinatura,
        "hq-"
    );
}


// ============================================================
// FORMATOS / ORDENAÇÃO
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


function obterExtensao(
    nome
) {

    const texto =
        String(
            nome || ""
        );


    const ponto =
        texto.lastIndexOf(
            "."
        );


    if (
        ponto === -1
    ) {
        return "";
    }


    return texto
        .slice(
            ponto + 1
        )
        .toLowerCase();
}


function removerExtensao(
    nome
) {

    return String(
        nome || ""
    ).replace(
        /\.[^/.]+$/,
        ""
    );
}


function ordenarArquivos(
    a,
    b
) {

    return compararNatural(
        a?.webkitRelativePath ||
            a?.name ||
            "",
        b?.webkitRelativePath ||
            b?.name ||
            ""
    );
}


function ordenarCaminhosPorNivel(
    a,
    b
) {

    const caminhoA =
        String(
            a ?? ""
        );

    const caminhoB =
        String(
            b ?? ""
        );


    const nivelA =
        caminhoA
            .split("/")
            .filter(Boolean)
            .length;


    const nivelB =
        caminhoB
            .split("/")
            .filter(Boolean)
            .length;


    if (
        nivelA !== nivelB
    ) {

        return nivelA - nivelB;

    }


    return compararNatural(
        caminhoA,
        caminhoB
    );
}


function gerarIdEstavel(
    texto
) {

    return gerarHashFnv(
        texto,
        "item-"
    );
}


function gerarHashFnv(
    texto,
    prefixo
) {

    const valor =
        String(
            texto || ""
        );


    let hash =
        2166136261;


    for (
        let i = 0;
        i < valor.length;
        i++
    ) {

        hash ^=
            valor.charCodeAt(
                i
            );


        hash =
            Math.imul(
                hash,
                16777619
            );

    }


    return (
        prefixo +
        (
            hash >>> 0
        ).toString(
            16
        )
    );
}


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


function atualizarMensagem(
    callback,
    mensagem
) {

    if (
        typeof callback === "function"
    ) {

        callback(
            mensagem
        );

    }
}
