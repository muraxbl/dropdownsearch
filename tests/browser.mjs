import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const root = new URL('../', import.meta.url);
const server = createServer(async (request, response) => {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (!/^\/(tests\/browser\.html|views\/js\/[a-z-]+\.js)$/.test(path)) { response.writeHead(404).end(); return; }
    try {
        response.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html');
        response.end(await readFile(new URL('.' + path, root)));
    } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
    const {stdout} = await promisify(execFile)(process.env.CHROME_PATH || 'google-chrome', ['--headless=new', '--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage', '--dump-dom', '--virtual-time-budget=4000', `http://127.0.0.1:${server.address().port}/tests/browser.html`], {timeout:20000, maxBuffer:1024 * 1024});
    const report = stdout.match(/<pre id="test-result">([^<]*)<\/pre>/)?.[1];
    if (!stdout.includes('data-test-result="pass"')) throw Error(report || 'Browser test did not finish');
    console.log(report);
} finally { server.closeAllConnections(); server.close(); }
