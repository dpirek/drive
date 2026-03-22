import fs from 'fs';
import url from 'url';
import path from 'path';
import { contentType } from './string.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATIC_ROOT = path.join(__dirname, '..', 'public');

function redirect(res, url) {
  res.writeHead(302, { 'Location': url });
  res.end();
}

function respondHtml(res, data) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html');
  res.end(data);
}

function respondJson(res, data, statusCode = 200) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(data));
}

function respondStatic(res, url, type = 'text/plain') {
  res.statusCode = 200;
  res.writeHead(200, {'Content-Type': contentType(url)});
  try {
    fs.accessSync(__dirname + url, fs.constants.R_OK);
  } catch(err) {
    res.statusCode = 404;
    return res.end('404 Not Found');
  }
  res.end(fs.readFileSync(__dirname + url));
}

function serverStatic(req, res) {
  try {
    let { pathname } = url.parse(req.url);
    res.writeHead(200, {'Content-Type': contentType(pathname)});

    if(pathname === '/') pathname = '/index.html';
    if(pathname === '/favicon.ico') return res.end();

    const fileContent = fs.readFileSync(STATIC_ROOT + pathname);
    
    if(fileContent === null) return res.end('not found');
    return res.end(fileContent);
  } catch (exception) {
    console.error('exception found..', exception);
  }
}

function serverIndex(req) {
  const file = fs.readFileSync(STATIC_ROOT + '/index.html');  
  return file.toString();
}

function isStaticRequest(req) {
  const { pathname } = url.parse(req.url);
  if (pathname === '/favicon.ico') return true;
  const staticFiles = ['.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.woff', '.map', '.wasm', '.json', '.svg', '.ico', '.html', '.pdf'];
  return staticFiles.some(ext => pathname.endsWith(ext));
}

function notFound(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/html');
  res.end('<h1>404 Not Found</h1><p>The page you are looking for does not exist.</p>');
}

function notFoundJson(res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not Found' }));
}

function notAuthorizedJson(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Unauthorized' }));
}

function notAuthorizedHtml(res) {
  res.statusCode = 401;
  res.setHeader('Content-Type', 'text/html');
  res.end(`
    <html>
    <head><title>401 Unauthorized</title></head>
    <body><h1>401 Unauthorized</h1>
    <p>You are not authorized to access this resource.</p>
    </body>
    </html>`);
}

async function parseBody(req) {
  return new Promise((resolve, reject) => {
    const requestBody = [];
    req.on('data', (chunk) => {
      requestBody.push(chunk);
    }).on('end', () => {
      const body = Buffer.concat(requestBody).toString();
      if (req.headers['content-type'] === 'application/json') {
        try {
          if (!body){
            return resolve({});
          } else {
            return resolve(JSON.parse(body));
          }
        } catch (e) {
          return reject(new Error('Invalid JSON'));
        }
      }
      resolve(body);
    });
  });
}

export {
  redirect,
  respondStatic,
  notFound,
  notFoundJson,
  notAuthorizedJson,
  notAuthorizedHtml,
  isStaticRequest,
  serverStatic,
  serverIndex,
  respondJson,
  respondHtml,
  parseBody
};
