"use strict";

const CACHE_NAME =
    "shivtrixYouTube-v7";


/*
    Only cache the local application shell.

    IMPORTANT:
    YouTube videos, YouTube thumbnails,
    Google APIs and other external resources
    are NOT downloaded into the PWA cache.
*/

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.png",
    "./icon-512.png"
];


/* =========================================================
   INSTALL
========================================================= */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)

                .then(
                    cache => Promise.all(APP_FILES.map(f => cache.add(f).catch(() => null)))
                )

                .then(
                    () =>
                        self.skipWaiting()
                )

        );

    }
);


/* =========================================================
   ACTIVATE
========================================================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches
                .keys()

                .then(
                    cacheNames => {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    cacheName =>
                                        cacheName !==
                                        CACHE_NAME
                                )

                                .map(
                                    cacheName =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        );

                    }
                )

                .then(
                    () =>
                        self.clients.claim()
                )

        );

    }
);


/* =========================================================
   FETCH
========================================================= */

self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !==
            "GET"
        ) {
            return;
        }


        const requestUrl =
            new URL(
                event.request.url
            );


        /*
            NEVER intercept external
            YouTube / Google resources.

            This keeps YouTube playback
            independent from the PWA cache.
        */

        const externalHosts = [

            "youtube.com",
            "www.youtube.com",

            "youtube-nocookie.com",
            "www.youtube-nocookie.com",

            "youtu.be",

            "googleapis.com",
            "www.googleapis.com",

            "ytimg.com",
            "i.ytimg.com",

            "googlevideo.com",

            "ggpht.com"

        ];


        const isExternalVideoResource =
            externalHosts.some(
                host =>
                    requestUrl.hostname === host ||
                    requestUrl.hostname.endsWith(
                        "." + host
                    )
            );


        if (
            isExternalVideoResource
        ) {

            return;

        }


        /*
            Only handle requests that belong
            to this PWA's own origin.
        */

        if (
            requestUrl.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
            Pages (index.html) are network-first so updates show up
            immediately; the cached copy is used when offline.
            Other local files (icons, manifest) are cache-first.
        */

        const isPage =
            event.request.mode === "navigate" ||
            requestUrl.pathname.endsWith(".html") ||
            requestUrl.pathname.endsWith("/");

        if (isPage) {

            event.respondWith(

                fetch(event.request)

                    .then(networkResponse => {

                        if (
                            networkResponse &&
                            networkResponse.status === 200
                        ) {

                            const copy = networkResponse.clone();

                            caches
                                .open(CACHE_NAME)
                                .then(cache =>
                                    cache.put(event.request, copy)
                                );

                        }

                        return networkResponse;

                    })

                    .catch(() =>
                        caches
                            .match(event.request, { ignoreSearch: true })
                            .then(cached =>
                                cached ||
                                caches.match("./index.html")
                            )
                    )

            );

            return;

        }


        event.respondWith(

            caches
                .match(event.request)

                .then(cachedResponse => {

                    if (cachedResponse) {

                        return cachedResponse;

                    }

                    return fetch(event.request)

                        .then(networkResponse => {

                            if (
                                networkResponse &&
                                networkResponse.status === 200
                            ) {

                                const copy = networkResponse.clone();

                                caches
                                    .open(CACHE_NAME)
                                    .then(cache =>
                                        cache.put(event.request, copy)
                                    );

                            }

                            return networkResponse;

                        })

                        .catch(() =>
                            new Response("", {
                                status: 503,
                                statusText: "Offline"
                            })
                        );

                })

        );

    }
);


/* =========================================================
   MESSAGE
========================================================= */

self.addEventListener(
    "message",
    event => {

        if (
            event.data &&
            event.data.type ===
            "SKIP_WAITING"
        ) {

            self.skipWaiting();

        }

    }
);
