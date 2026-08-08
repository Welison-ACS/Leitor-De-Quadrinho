const CACHE_NAME =
    "leitor-quadrinhos-v4";


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


    "./js/leitor/leitor.js",

    "./js/leitor/navegacao.js",

    "./js/leitor/zoom.js",


    "./js/armazenamento/storage.js",


    "./assets/icons/icon.svg",

    "./assets/placeholder-capa.svg"

];


// ============================================================
// INSTALL
// ============================================================

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache => {

                        return cache.addAll(
                            APP_FILES
                        );

                    }
                )

        );


        self.skipWaiting();

    }
);


// ============================================================
// ACTIVATE
// ============================================================

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    nomes => {

                        return Promise.all(

                            nomes
                                .filter(
                                    nome =>
                                        nome !==
                                        CACHE_NAME
                                )
                                .map(
                                    nome =>
                                        caches.delete(
                                            nome
                                        )
                                )

                        );

                    }
                )

        );


        self.clients.claim();

    }
);


// ============================================================
// FETCH
// ============================================================

self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        event.respondWith(

            caches
                .match(
                    event.request
                )
                .then(
                    cache => {

                        if (
                            cache
                        ) {

                            return cache;

                        }


                        return fetch(
                            event.request
                        );

                    }
                )

        );

    }
);
