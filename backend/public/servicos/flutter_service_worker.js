'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"assets/AssetManifest.bin": "be46c06b19a2092a2d7c2117cc899b94",
"assets/AssetManifest.bin.json": "225f828550b40325389683d5f8c7615e",
"assets/AssetManifest.json": "b926d4564230d25e5b9381e42945156a",
"assets/assets/adriano.jpg": "59bfdcab817d08eaa6575014c98b41da",
"assets/assets/agenda.png": "78c199dc753b81ef26fff7702c04b534",
"assets/assets/cemiterio.png": "00498d872f24f12df20617b3a9b7e9a5",
"assets/assets/ditd.png": "83a3a31124503bf013152447121ae8cd",
"assets/assets/estradas_rurais.png": "e08b8094e3fc3ad0ffdfc0245614702f",
"assets/assets/fabiano.png": "fedab4d89b95f2213b6d01da3e1c93b8",
"assets/assets/forms_garca.png": "ab0c15aa318d983e639c1e9bac4777a9",
"assets/assets/garca.png": "0620871789c4638766f34de24d90565c",
"assets/assets/home_semit.png": "ec3317e5e5d2c30de80050372d119410",
"assets/assets/infra.png": "8e7d0716cc2c0700165b5ef2f3f4d0b0",
"assets/assets/logo-iluminacao_publica.jpeg": "7cb253676b1222eb5ea09bed1692c5ee",
"assets/assets/logo-iluminacao_publica.png": "98f76fe77107d7a3e71d9a0ea76b28f7",
"assets/assets/Logo_agenda.png": "c5332dd097be24e83dd360bcac05d5bf",
"assets/assets/logo_app.png": "af7ba6ed0fec5f42f9ad1886bc645c27",
"assets/assets/Logo_form.png": "b8183e844c24caf9dde63f239e079cda",
"assets/assets/logo_semit2.png": "be5b44e99c44dacd2f01a2edd1df7dc9",
"assets/assets/monitoramento.png": "01e75d08e2c13aa827ea281d30fadc62",
"assets/assets/poles_data.json": "289cb57d8bce6a2457f13a8ce0ff7aeb",
"assets/assets/ricardo.jpg": "813a399e4b509f0c268c195f630c0675",
"assets/FontManifest.json": "bac65cd206885809b7d70246d77dfc47",
"assets/fonts/MaterialIcons-Regular.otf": "b2c5bb4a2d90d7953623ba47a59f2afc",
"assets/NOTICES": "777e1c266976785a9adf1cc44d7651fa",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/packages/flutter_map/lib/assets/flutter_map_logo.png": "208d63cc917af9713fc9572bd5c09362",
"assets/packages/material_design_icons_flutter/lib/fonts/materialdesignicons-webfont.ttf": "d10ac4ee5ebe8c8fff90505150ba2a76",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsOutlined.ttf": "61f6e54b249045e25282c33b2d241ba6",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsRounded.ttf": "5f16b7ef55e91a12e30dcc5f5af91507",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsSharp.ttf": "c839828dc68888894e5b266778df0c44",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"canvaskit/canvaskit.js": "728b2d477d9b8c14593d4f9b82b484f3",
"canvaskit/canvaskit.js.symbols": "bdcd3835edf8586b6d6edfce8749fb77",
"canvaskit/canvaskit.wasm": "7a3f4ae7d65fc1de6a6e7ddd3224bc93",
"canvaskit/chromium/canvaskit.js": "8191e843020c832c9cf8852a4b909d4c",
"canvaskit/chromium/canvaskit.js.symbols": "b61b5f4673c9698029fa0a746a9ad581",
"canvaskit/chromium/canvaskit.wasm": "f504de372e31c8031018a9ec0a9ef5f0",
"canvaskit/skwasm.js": "ea559890a088fe28b4ddf70e17e60052",
"canvaskit/skwasm.js.symbols": "e72c79950c8a8483d826a7f0560573a1",
"canvaskit/skwasm.wasm": "39dd80367a4e71582d234948adc521c0",
"favicon.png": "59e72f04738f40292e5a012ea3f69725",
"flutter.js": "83d881c1dbb6d6bcd6b42e274605b69c",
"flutter_bootstrap.js": "51d0696460fad63c7ed65084a88ed287",
"icons/Icon-192.png": "fd75dc3a35a5f3ec2e0d6e169e442d37",
"icons/Icon-512.png": "bf454785eefe44f834a3d7d4151fc8e9",
"icons/Icon-maskable-192.png": "352ecd790f3ff48e89754a2bd62ccae2",
"icons/Icon-maskable-512.png": "d89043050cdf49c41f978b2a2f08e395",
"index.html": "568890217f2cfc0b7801512906f15764",
"/": "568890217f2cfc0b7801512906f15764",
"main.dart.js": "ac4a67e3c4568197d5355c3ed95ff7ba",
"manifest.json": "4c5a682604e818f1b5ea4f6eb61c649e",
"version.json": "9c77ee11edf16359aab170152ae55c1d"};
// The application shell files that are downloaded before a service worker can
// start.
const CORE = ["main.dart.js",
"index.html",
"flutter_bootstrap.js",
"assets/AssetManifest.bin.json",
"assets/FontManifest.json"];

// During install, the TEMP cache is populated with the application shell files.
self.addEventListener("install", (event) => {
  self.skipWaiting();
  return event.waitUntil(
    caches.open(TEMP).then((cache) => {
      return cache.addAll(
        CORE.map((value) => new Request(value, {'cache': 'reload'})));
    })
  );
});
// During activate, the cache is populated with the temp files downloaded in
// install. If this service worker is upgrading from one with a saved
// MANIFEST, then use this to retain unchanged resource files.
self.addEventListener("activate", function(event) {
  return event.waitUntil(async function() {
    try {
      var contentCache = await caches.open(CACHE_NAME);
      var tempCache = await caches.open(TEMP);
      var manifestCache = await caches.open(MANIFEST);
      var manifest = await manifestCache.match('manifest');
      // When there is no prior manifest, clear the entire cache.
      if (!manifest) {
        await caches.delete(CACHE_NAME);
        contentCache = await caches.open(CACHE_NAME);
        for (var request of await tempCache.keys()) {
          var response = await tempCache.match(request);
          await contentCache.put(request, response);
        }
        await caches.delete(TEMP);
        // Save the manifest to make future upgrades efficient.
        await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
        // Claim client to enable caching on first launch
        self.clients.claim();
        return;
      }
      var oldManifest = await manifest.json();
      var origin = self.location.origin;
      for (var request of await contentCache.keys()) {
        var key = request.url.substring(origin.length + 1);
        if (key == "") {
          key = "/";
        }
        // If a resource from the old manifest is not in the new cache, or if
        // the MD5 sum has changed, delete it. Otherwise the resource is left
        // in the cache and can be reused by the new service worker.
        if (!RESOURCES[key] || RESOURCES[key] != oldManifest[key]) {
          await contentCache.delete(request);
        }
      }
      // Populate the cache with the app shell TEMP files, potentially overwriting
      // cache files preserved above.
      for (var request of await tempCache.keys()) {
        var response = await tempCache.match(request);
        await contentCache.put(request, response);
      }
      await caches.delete(TEMP);
      // Save the manifest to make future upgrades efficient.
      await manifestCache.put('manifest', new Response(JSON.stringify(RESOURCES)));
      // Claim client to enable caching on first launch
      self.clients.claim();
      return;
    } catch (err) {
      // On an unhandled exception the state of the cache cannot be guaranteed.
      console.error('Failed to upgrade service worker: ' + err);
      await caches.delete(CACHE_NAME);
      await caches.delete(TEMP);
      await caches.delete(MANIFEST);
    }
  }());
});
// The fetch handler redirects requests for RESOURCE files to the service
// worker cache.
self.addEventListener("fetch", (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  var origin = self.location.origin;
  var key = event.request.url.substring(origin.length + 1);
  // Redirect URLs to the index.html
  if (key.indexOf('?v=') != -1) {
    key = key.split('?v=')[0];
  }
  if (event.request.url == origin || event.request.url.startsWith(origin + '/#') || key == '') {
    key = '/';
  }
  // If the URL is not the RESOURCE list then return to signal that the
  // browser should take over.
  if (!RESOURCES[key]) {
    return;
  }
  // If the URL is the index.html, perform an online-first request.
  if (key == '/') {
    return onlineFirst(event);
  }
  event.respondWith(caches.open(CACHE_NAME)
    .then((cache) =>  {
      return cache.match(event.request).then((response) => {
        // Either respond with the cached resource, or perform a fetch and
        // lazily populate the cache only if the resource was successfully fetched.
        return response || fetch(event.request).then((response) => {
          if (response && Boolean(response.ok)) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      })
    })
  );
});
self.addEventListener('message', (event) => {
  // SkipWaiting can be used to immediately activate a waiting service worker.
  // This will also require a page refresh triggered by the main worker.
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
    return;
  }
  if (event.data === 'downloadOffline') {
    downloadOffline();
    return;
  }
});
// Download offline will check the RESOURCES for all files not in the cache
// and populate them.
async function downloadOffline() {
  var resources = [];
  var contentCache = await caches.open(CACHE_NAME);
  var currentContent = {};
  for (var request of await contentCache.keys()) {
    var key = request.url.substring(origin.length + 1);
    if (key == "") {
      key = "/";
    }
    currentContent[key] = true;
  }
  for (var resourceKey of Object.keys(RESOURCES)) {
    if (!currentContent[resourceKey]) {
      resources.push(resourceKey);
    }
  }
  return contentCache.addAll(resources);
}
// Attempt to download the resource online before falling back to
// the offline cache.
function onlineFirst(event) {
  return event.respondWith(
    fetch(event.request).then((response) => {
      return caches.open(CACHE_NAME).then((cache) => {
        cache.put(event.request, response.clone());
        return response;
      });
    }).catch((error) => {
      return caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((response) => {
          if (response != null) {
            return response;
          }
          throw error;
        });
      });
    })
  );
}
