'use strict';
const MANIFEST = 'flutter-app-manifest';
const TEMP = 'flutter-temp-cache';
const CACHE_NAME = 'flutter-app-cache';

const RESOURCES = {"canvaskit/canvaskit.js": "140ccb7d34d0a55065fbd422b843add6",
"canvaskit/canvaskit.js.symbols": "58832fbed59e00d2190aa295c4d70360",
"canvaskit/skwasm.js.symbols": "0088242d10d7e7d6d2649d1fe1bda7c1",
"canvaskit/skwasm_heavy.wasm": "8034ad26ba2485dab2fd49bdd786837b",
"canvaskit/skwasm.js": "1ef3ea3a0fec4569e5d531da25f34095",
"canvaskit/skwasm.wasm": "264db41426307cfc7fa44b95a7772109",
"canvaskit/skwasm_heavy.js": "413f5b2b2d9345f37de148e2544f584f",
"canvaskit/skwasm_heavy.js.symbols": "3c01ec03b5de6d62c34e17014d1decd3",
"canvaskit/chromium/canvaskit.js": "5e27aae346eee469027c80af0751d53d",
"canvaskit/chromium/canvaskit.js.symbols": "193deaca1a1424049326d4a91ad1d88d",
"canvaskit/chromium/canvaskit.wasm": "24c77e750a7fa6d474198905249ff506",
"canvaskit/canvaskit.wasm": "07b9f5853202304d3b0749d9306573cc",
"version.json": "9c77ee11edf16359aab170152ae55c1d",
"favicon.png": "59e72f04738f40292e5a012ea3f69725",
"index.html": "65e0e3adffa40478a925f8b6a4ddca77",
"/": "65e0e3adffa40478a925f8b6a4ddca77",
"assets/AssetManifest.bin.json": "a2ee6739491c54494b33cd2dd36efc10",
"assets/AssetManifest.bin": "0c959cf4b8dea81ef872aa68bbd4e013",
"assets/FontManifest.json": "50fcb17b0aecac28f1ecd6f1e6b15949",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsSharp.ttf": "c839828dc68888894e5b266778df0c44",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsRounded.ttf": "5f16b7ef55e91a12e30dcc5f5af91507",
"assets/packages/material_symbols_icons/lib/fonts/MaterialSymbolsOutlined.ttf": "61f6e54b249045e25282c33b2d241ba6",
"assets/packages/material_design_icons_flutter/lib/fonts/materialdesignicons-webfont.ttf": "3759b2f7a51e83c64a58cfe07b96a8ee",
"assets/packages/flutter_map/lib/assets/flutter_map_logo.png": "208d63cc917af9713fc9572bd5c09362",
"assets/packages/cupertino_icons/assets/CupertinoIcons.ttf": "33b7d9392238c04c131b6ce224e13711",
"assets/assets/logo-iluminacao_publica.jpeg": "7cb253676b1222eb5ea09bed1692c5ee",
"assets/assets/icon.png": "c175624a6a7ba7179541395eac64dc70",
"assets/assets/garca.png": "0620871789c4638766f34de24d90565c",
"assets/assets/cemiterio.png": "00498d872f24f12df20617b3a9b7e9a5",
"assets/assets/home_semit.png": "ec3317e5e5d2c30de80050372d119410",
"assets/assets/logo_app.png": "af7ba6ed0fec5f42f9ad1886bc645c27",
"assets/assets/logo-iluminacao_publica.png": "98f76fe77107d7a3e71d9a0ea76b28f7",
"assets/assets/ricardo.jpg": "813a399e4b509f0c268c195f630c0675",
"assets/assets/forms_garca.png": "ab0c15aa318d983e639c1e9bac4777a9",
"assets/assets/poles_data.json": "289cb57d8bce6a2457f13a8ce0ff7aeb",
"assets/assets/agenda.png": "78c199dc753b81ef26fff7702c04b534",
"assets/assets/adriano.jpg": "59bfdcab817d08eaa6575014c98b41da",
"assets/assets/infra.png": "8e7d0716cc2c0700165b5ef2f3f4d0b0",
"assets/assets/logo_semit2.png": "be5b44e99c44dacd2f01a2edd1df7dc9",
"assets/assets/monitoramento.png": "01e75d08e2c13aa827ea281d30fadc62",
"assets/assets/fabiano.png": "fedab4d89b95f2213b6d01da3e1c93b8",
"assets/assets/ditd.png": "83a3a31124503bf013152447121ae8cd",
"assets/assets/Logo_form.png": "b8183e844c24caf9dde63f239e079cda",
"assets/assets/estradas_rurais.png": "e08b8094e3fc3ad0ffdfc0245614702f",
"assets/assets/Logo_agenda.png": "c5332dd097be24e83dd360bcac05d5bf",
"assets/shaders/ink_sparkle.frag": "ecc85a2e95f5e9f53123dcaf8cb9b6ce",
"assets/AssetManifest.json": "70a4e7816fe56b1cffd37788c5e72b71",
"assets/fonts/MaterialIcons-Regular.otf": "0e15b15eb47801fcc5ac4518e3c3123b",
"assets/NOTICES": "1f401e82b019495702ce83621b2f2966",
"main.dart.js": "c86a21ba8e8d69da6a09eae9f49a49cf",
"icons/Icon-192.png": "fd75dc3a35a5f3ec2e0d6e169e442d37",
"icons/Icon-512.png": "bf454785eefe44f834a3d7d4151fc8e9",
"icons/Icon-maskable-192.png": "352ecd790f3ff48e89754a2bd62ccae2",
"icons/Icon-maskable-512.png": "d89043050cdf49c41f978b2a2f08e395",
"manifest.json": "4c5a682604e818f1b5ea4f6eb61c649e",
"flutter.js": "888483df48293866f9f41d3d9274a779",
"flutter_bootstrap.js": "50e92e3fa2ceacd7466063df077f3a99"};
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
