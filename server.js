import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { close, loadModel, translate } from '@qvac/sdk';
import * as qvacModels from '@qvac/sdk/models';

const port = Number(process.env.PORT || 4173);
const indexPath = fileURLToPath(new URL('./index.html', import.meta.url));
const modelByPair = new Map(
  qvacModels.models
    .filter(model => model.engine === 'nmtcpp-translation' && /^BERGAMOT_[A-Z]+_[A-Z]+$/.test(model.name))
    .map(model => {
      const [, from, to] = model.name.split('_');
      return [`${from.toLowerCase()}|${to.toLowerCase()}`, qvacModels[model.name]];
    })
);
const languageNames = {
  ar: 'العربية', az: 'Azərbaycanca', be: 'Беларуская', bg: 'Български', bn: 'বাংলা',
  bs: 'Bosanski', ca: 'Català', cs: 'Čeština', da: 'Dansk', de: 'Deutsch',
  el: 'Ελληνικά', en: 'English', es: 'Español', et: 'Eesti', fa: 'فارسی', fi: 'Suomi',
  fr: 'Français', gu: 'ગુજરાતી', he: 'עברית', hi: 'हिन्दी', hr: 'Hrvatski', hu: 'Magyar',
  id: 'Bahasa Indonesia', is: 'Íslenska', it: 'Italiano', ja: '日本語', kn: 'ಕನ್ನಡ',
  ko: '한국어', lt: 'Lietuvių', lv: 'Latviešu', ml: 'മലയാളം', ms: 'Bahasa Melayu',
  mt: 'Malti', nb: 'Norsk Bokmål', nn: 'Norsk nynorsk', nl: 'Nederlands', no: 'Norsk',
  pl: 'Polski', pt: 'Português', re: 'Reo', ro: 'Română', ru: 'Русский', sk: 'Slovenčina',
  sl: 'Slovenščina', sq: 'Shqip', sr: 'Српски', sv: 'Svenska', ta: 'தமிழ்', te: 'తెలుగు',
  th: 'ไทย', tr: 'Türkçe', uk: 'Українська', vi: 'Tiếng Việt', zh: '中文'
};
const languageCodes = new Set([...modelByPair.keys()].flatMap(pair => pair.split('|')));
const languages = [...languageCodes]
  .sort((first, second) => (languageNames[first] || first).localeCompare(languageNames[second] || second))
  .map(code => ({ code, name: languageNames[code] || code.toUpperCase() }));
const loadedModels = new Map();

function json(response, status, body) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store'
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 4000) throw new Error('Text is too long.');
  }
  return JSON.parse(body);
}

function getLoadedModel(pair, descriptor) {
  let loading = loadedModels.get(pair);
  if (!loading) {
    const [from, to] = pair.split('|');
    loading = loadModel({
      modelSrc: descriptor,
      modelConfig: { engine: 'Bergamot', from, to }
    });
    loadedModels.set(pair, loading);
    loading.catch(() => loadedModels.delete(pair));
  }
  return loading;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');

  if (url.pathname === '/api/languages' && request.method === 'GET') {
    const sourceCodes = new Set([...modelByPair.keys()].map(pair => pair.split('|')[0]));
    json(response, 200, {
      languages,
      sourceLanguages: languages.filter(language => sourceCodes.has(language.code)),
      pairs: [...modelByPair.keys()].map(pair => {
        const [from, to] = pair.split('|');
        return { from, to };
      })
    });
    return;
  }

  if (url.pathname === '/api/translate' && request.method === 'POST') {
    try {
      const { text, from, to } = await readJson(request);
      const normalizedText = typeof text === 'string' ? text.trim() : '';
      const pair = `${from}|${to}`;
      const descriptor = modelByPair.get(pair);
      if (!normalizedText || normalizedText.length > 500) {
        json(response, 400, { error: 'Enter text between 1 and 500 characters.' });
        return;
      }
      if (!descriptor) {
        json(response, 400, { error: 'That language direction is not available offline.' });
        return;
      }

      const modelId = await getLoadedModel(pair, descriptor);
      const result = translate({ modelId, text: normalizedText, from, to, stream: false });
      const translation = await result.text;
      json(response, 200, { translation, from, to });
    } catch (error) {
      console.error('Local QVAC translation failed:', error);
      json(response, 500, { error: error.message || 'Local translation failed.' });
    }
    return;
  }

  if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    try {
      const html = await readFile(indexPath);
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(html);
    } catch {
      response.writeHead(500);
      response.end('Could not load the application.');
    }
    return;
  }

  response.writeHead(404);
  response.end('Not found');
});

server.listen(port, '0.0.0.0', () => {
  console.log(`BAYBAYIN AI is ready at http://localhost:${port}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(async () => {
    await close();
    process.exit(0);
  }));
}