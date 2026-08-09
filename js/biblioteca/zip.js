// ============================================================
// ZIP / CBZ
//
// Leitor simples para arquivos ZIP usados como quadrinhos.
//
// Métodos suportados:
//
// 0 = Stored
// 8 = Deflate
//
// CBZ é um ZIP convencional contendo imagens.
// ============================================================


// ============================================================
// ASSINATURAS ZIP
// ============================================================

const ASSINATURA_EOCD =
    0x06054b50;

const ASSINATURA_CENTRAL =
    0x02014b50;

const ASSINATURA_LOCAL =
    0x04034b50;


// ============================================================
// EXTENSÕES
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


const COMPARADOR_NATURAL =
    new Intl.Collator(
        "pt-BR",
        {
            numeric: true,
            sensitivity: "base"
        }
    );


// ============================================================
// LISTAR IMAGENS DO ZIP
// ============================================================

export async function listarImagensZip(
    arquivo
) {

    if (!(arquivo instanceof Blob)) {

        throw new Error(
            "Arquivo ZIP inválido."
        );

    }


    const eocd =
        await localizarEOCD(
            arquivo
        );


    if (
        eocd.totalEntradas === 0xffff ||
        eocd.offsetCentral === 0xffffffff ||
        eocd.tamanhoCentral === 0xffffffff
    ) {

        throw new Error(
            "Arquivos ZIP64 ainda não são suportados nesta versão."
        );

    }


    const centralBuffer =
        await arquivo
            .slice(
                eocd.offsetCentral,
                eocd.offsetCentral +
                    eocd.tamanhoCentral
            )
            .arrayBuffer();


    const view =
        new DataView(
            centralBuffer
        );


    const bytes =
        new Uint8Array(
            centralBuffer
        );


    const entradas =
        [];


    let offset =
        0;


    for (
        let indice = 0;
        indice < eocd.totalEntradas;
        indice++
    ) {

        if (
            offset + 46 >
            view.byteLength
        ) {

            break;

        }


        const assinatura =
            view.getUint32(
                offset,
                true
            );


        if (
            assinatura !==
            ASSINATURA_CENTRAL
        ) {

            throw new Error(
                "Estrutura ZIP inválida."
            );

        }


        const flags =
            view.getUint16(
                offset + 8,
                true
            );


        const metodo =
            view.getUint16(
                offset + 10,
                true
            );


        const tamanhoComprimido =
            view.getUint32(
                offset + 20,
                true
            );


        const tamanhoOriginal =
            view.getUint32(
                offset + 24,
                true
            );


        const tamanhoNome =
            view.getUint16(
                offset + 28,
                true
            );


        const tamanhoExtra =
            view.getUint16(
                offset + 30,
                true
            );


        const tamanhoComentario =
            view.getUint16(
                offset + 32,
                true
            );


        const offsetLocal =
            view.getUint32(
                offset + 42,
                true
            );


        const inicioNome =
            offset + 46;


        const fimNome =
            inicioNome +
            tamanhoNome;


        const nomeBytes =
            bytes.slice(
                inicioNome,
                fimNome
            );


        const utf8 =
            Boolean(
                flags &
                0x0800
            );


        const nome =
            decodificarNome(
                nomeBytes,
                utf8
            );


        const ehDiretorio =
            nome.endsWith(
                "/"
            );


        if (
            !ehDiretorio &&
            ehArquivoImagem(
                nome
            )
        ) {

            entradas.push({

                nome,

                flags,

                metodo,

                tamanhoComprimido,

                tamanhoOriginal,

                offsetLocal

            });

        }


        offset +=
            46 +
            tamanhoNome +
            tamanhoExtra +
            tamanhoComentario;

    }


    entradas.sort(
        (a, b) =>
            ordenarNatural(
                a?.nome,
                b?.nome
            )
    );


    return entradas;
}


// ============================================================
// EXTRAIR UMA ÚNICA PÁGINA
// ============================================================

export async function extrairEntradaZip(
    arquivo,
    entrada
) {

    if (
        entrada.flags &
        0x0001
    ) {

        throw new Error(
            "Este ZIP está protegido por senha."
        );

    }


    const headerBuffer =
        await arquivo
            .slice(
                entrada.offsetLocal,
                entrada.offsetLocal + 30
            )
            .arrayBuffer();


    const header =
        new DataView(
            headerBuffer
        );


    if (
        header.byteLength < 30 ||
        header.getUint32(
            0,
            true
        ) !== ASSINATURA_LOCAL
    ) {

        throw new Error(
            "Cabeçalho da página ZIP inválido."
        );

    }


    const tamanhoNome =
        header.getUint16(
            26,
            true
        );


    const tamanhoExtra =
        header.getUint16(
            28,
            true
        );


    const inicioDados =
        entrada.offsetLocal +
        30 +
        tamanhoNome +
        tamanhoExtra;


    const fimDados =
        inicioDados +
        entrada.tamanhoComprimido;


    const dadosComprimidos =
        arquivo.slice(
            inicioDados,
            fimDados
        );


    const mime =
        descobrirMime(
            entrada.nome
        );


    // ========================================================
    // STORE - SEM COMPRESSÃO
    // ========================================================

    if (
        entrada.metodo === 0
    ) {

        return new Blob(
            [
                dadosComprimidos
            ],
            {
                type: mime
            }
        );

    }


    // ========================================================
    // DEFLATE
    // ========================================================

    if (
        entrada.metodo === 8
    ) {

        if (
            !(
                "DecompressionStream"
                in window
            )
        ) {

            throw new Error(
                "Seu navegador não possui suporte à descompressão necessária para este ZIP."
            );

        }


        let descompressor;


        try {

            descompressor =
                new DecompressionStream(
                    "deflate-raw"
                );

        }
        catch (erro) {

            throw new Error(
                "Seu navegador não suporta o método DEFLATE usado por este ZIP."
            );

        }


        const stream =
            dadosComprimidos
                .stream()
                .pipeThrough(
                    descompressor
                );


        const buffer =
            await new Response(
                stream
            )
                .arrayBuffer();


        return new Blob(
            [
                buffer
            ],
            {
                type: mime
            }
        );

    }


    throw new Error(
        `Método de compressão ZIP não suportado: ${entrada.metodo}`
    );
}


// ============================================================
// LOCALIZAR FINAL DO ZIP
// ============================================================

async function localizarEOCD(
    arquivo
) {

    // EOCD pode ter comentário de no máximo 65.535 bytes.

    const tamanhoBusca =
        Math.min(
            arquivo.size,
            65535 + 22 + 20
        );


    const inicio =
        arquivo.size -
        tamanhoBusca;


    const buffer =
        await arquivo
            .slice(
                inicio
            )
            .arrayBuffer();


    const view =
        new DataView(
            buffer
        );


    for (
        let offset =
            view.byteLength - 22;
        offset >= 0;
        offset--
    ) {

        if (
            view.getUint32(
                offset,
                true
            ) !== ASSINATURA_EOCD
        ) {

            continue;

        }


        const totalEntradas =
            view.getUint16(
                offset + 10,
                true
            );


        const tamanhoCentral =
            view.getUint32(
                offset + 12,
                true
            );


        const offsetCentral =
            view.getUint32(
                offset + 16,
                true
            );


        return {

            totalEntradas,

            tamanhoCentral,

            offsetCentral

        };

    }


    throw new Error(
        "Não foi possível localizar a estrutura do arquivo ZIP/CBZ."
    );
}


// ============================================================
// IMAGEM?
// ============================================================

function ehArquivoImagem(
    nome
) {

    const nomeSeguro =
        String(
            nome ??
            ""
        );


    const nomeLimpo =
        nomeSeguro
            .split("?")[0]
            .split("#")[0];


    const ponto =
        nomeLimpo.lastIndexOf(
            "."
        );


    if (
        ponto === -1
    ) {

        return false;

    }


    const extensao =
        nomeLimpo
            .slice(
                ponto + 1
            )
            .toLowerCase();


    return EXTENSOES_IMAGEM.has(
        extensao
    );
}


// ============================================================
// MIME
// ============================================================

function descobrirMime(
    nome
) {

    const extensao =
        String(
            nome ??
            ""
        )
            .split(".")
            .pop()
            ?.toLowerCase();


    switch (
        extensao
    ) {

        case "jpg":
        case "jpeg":
            return "image/jpeg";


        case "png":
            return "image/png";


        case "webp":
            return "image/webp";


        case "gif":
            return "image/gif";


        case "bmp":
            return "image/bmp";


        case "avif":
            return "image/avif";


        default:
            return "application/octet-stream";

    }
}


// ============================================================
// DECODIFICAR NOME
// ============================================================

function decodificarNome(
    bytes,
    utf8
) {

    try {

        if (utf8) {

            return new TextDecoder(
                "utf-8"
            ).decode(
                bytes
            );

        }


        // Grande parte dos CBZ modernos já usa UTF-8.
        // Para arquivos antigos fazemos fallback também
        // para UTF-8 sem fatal error.

        return new TextDecoder(
            "utf-8",
            {
                fatal: false
            }
        ).decode(
            bytes
        );

    }
    catch {

        let resultado =
            "";


        for (
            const byte
            of bytes
        ) {

            resultado +=
                String.fromCharCode(
                    byte
                );

        }


        return resultado;

    }
}


// ============================================================
// ORDENAÇÃO NATURAL
// ============================================================

function ordenarNatural(
    a,
    b
) {

    return COMPARADOR_NATURAL.compare(
        String(a ?? ""),
        String(b ?? "")
    );
}
