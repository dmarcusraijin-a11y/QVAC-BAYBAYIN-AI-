# BAYBAYIN AI

A local-first translator powered by the QVAC SDK. Translation models run on your device; the app does not send text to a hosted translation service.

## Requirements

- Node.js 24 or newer
- An internet connection for npm installation and the first download of each selected model

## Install

```sh
npm install
```

## Run

```sh
npm start
```

Open <http://localhost:4173>. Choose a language direction from the pairs in the bundled QVAC model catalog, enter text, and translate. A pair's model is downloaded the first time it is used and cached by the SDK; inference then runs locally. Text is sent only to the local server on the same machine.

The start command generates a worker containing only QVAC's NMT plugin, avoiding initialization of unrelated native addons.

The interface lists only language directions with an available bundled model. The set of pairs depends on the QVAC SDK model catalog and is not every language in the world.

## SDK

This app declares `@qvac/sdk` version `0.19.0`. It uses `loadModel` and `translate` with QVAC's on-device NMT models.

## License

MIT. See [LICENSE](LICENSE).