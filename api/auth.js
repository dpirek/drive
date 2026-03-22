import * as auth from '../utils/auth.js';

function getRoutePath(url = '') {
  const raw = String(url || '');
  const queryIndex = raw.indexOf('?');
  return queryIndex === -1 ? raw : raw.slice(0, queryIndex);
}


async function login({ username, password, response }) {
  if( username === 'dave' && password === 'zkouzka321') {
    auth.login(response, username, 'admin');
    return {
      username: username,
      email: 'dpirek@gmail.com',
      role: 'admin'
    };
  } else {
    return { error: 'invalid credentials' };
  }
}

async function authApi({ url, method, authUser, body, response }) {
  const routePath = getRoutePath(url);
  if( method === 'GET' && routePath === '/api/auth') {
    return authUser;
  } else if (method === 'POST' && routePath === '/api/login') {
    const { username, password } = body;
    return await login({ username, password, response });
  } else if (method === 'POST' && routePath === '/api/logout') {
    auth.logout(response);
    return { message: 'logged out' };
  }
  return { error: 'method not allowed' }
}

export { authApi };
