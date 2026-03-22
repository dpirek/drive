function getQueryParams(url) {
  const queryParams = {};
  const queryIndex = url.indexOf('?');
  if (queryIndex !== -1) {
    const query = new URLSearchParams(url.substring(queryIndex + 1));
    query.forEach((value, key) => {
      queryParams[key] = value;
    });
  }
  return queryParams;
}

function getBaseUrl(url) {
  const queryIndex = url.indexOf('?');
  return queryIndex !== -1 ? url.substring(0, queryIndex) : url;
}

function route() {
  const routes = [];

  function buildRegex(routePath) {
    if (routePath === '*') {
      return { regex: /^.*$/, keys: [] };
    }

    const keys = [];
    const pattern = routePath.replace(/:([A-Za-z0-9_]+)\*/g, (_, key) => {
      keys.push(key);
      return '(.*)';
    }).replace(/:([A-Za-z0-9_]+)/g, (_, key) => {
      keys.push(key);
      return '([^/]+)';
    });

    return {
      regex: new RegExp(`^${pattern}$`),
      keys,
    };
  }

  return {
    add: (path, method, handler, type, auth = true, response = null) => {
      const { regex, keys } = buildRegex(path);
      routes.push({ path, method, handler, type, auth, response, regex, keys });
    },
    match: (url, method) => {
      const params = {};
      const queryParams = getQueryParams(url);
      
      url = getBaseUrl(url);

      const route = routes.find(r => {
        if (r.method && r.method !== method) return false;

        const match = url.match(r.regex);
        if (match) {
          r.keys.forEach((key, i) => {
            params[key] = match[i + 1];
          });
        }
        return match;
      });

      return route ? { 
        handler: route.handler, 
        params,
        queryParams,
        type: route.type,
        auth: route.auth,
        response: route.response ? route.response : null
      } : null;
    }
  };
}

export { route, getQueryParams, getBaseUrl };
