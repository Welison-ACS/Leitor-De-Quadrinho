const CACHE_NAME =
    "leitor-quadrinhos-v6";


const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/global.css",
    "./css/biblioteca.css",
    "./css/leitor.css",
    "./js/app.js",
    "./js/biblioteca/biblioteca.js",
    "./js/biblioteca/importador.js",
    "./js/biblioteca/zip.js",
    "./js/biblioteca/pdf.js",
    "./js/leitor/leitor.js",
    "./js/leitor/navegacao.js",
    "./js/leitor/zoom.js",
    "./js/armazenamento/storage.js",
    "./assets/icons/icon.svg",
    "./assets/placeholder-capa.svg"
];


self.addEventListener(
    "install",
    event => {

        event.waitUntil(
            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )
        );

        self.skipWaiting();
    }
);


self.addEventListener(
    "activate",
    event => {

        event.waitUntil(
            caches
                .keys()
                .then(
                    nomes =>
                        Promise.all(
                            nomes
                                .filter(
                                    nome =>
                                        nome !== CACHE_NAME
                                )
                                .map(
                                    nome =>
                                        caches.delete(
                                            nome
                                        )
                                )
                        )
                )
        );

        self.clients.claim();
    }
);


// Rede primeiro. O cache é atualizado automaticamente, inclusive
// para o módulo PDF.js quando ele for utilizado pela primeira vez.
self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !== "GET"
        ) {
            return;
        }


        event.respondWith(
            fetch(
                event.request
            )
                .then(
                    resposta => {

                        if (
                            resposta &&
                            resposta.status === 200
                        ) {

                            const copia =
                                resposta.clone();

                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(
                                    cache =>
                                        cache.put(
                                            event.request,
                                            copia
                                        )
                                )
                                .catch(
                                    () => {}
                                );

                        }


                        return resposta;

                    }
                )
                .catch(
                    async () => {

                        const respostaCache =
                            await caches.match(
                                event.request
                            );


                        if (
                            respostaCache
                        ) {
                            return respostaCache;
                        }


                        throw new Error(
                            "Recurso indisponível offline."
                        );

                    }
                )
        );
    }
);
