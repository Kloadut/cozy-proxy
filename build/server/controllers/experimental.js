// Generated by CoffeeScript 1.7.1
module.exports.webfingerHostMeta = function(req, res) {
  var host, hostmeta, template;
  if (req.params.ext !== 'json') {
    return res.send(404);
  }
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET');
  host = 'https://' + req.get('host');
  template = "" + host + "/webfinger/json?resource={uri}";
  hostmeta = {
    links: {
      rel: 'lrdd',
      template: template
    }
  };
  return res.send(200, hostmeta);
};

module.exports.webfingerAccount = function(req, res) {
  var OAUTH_VERSION, PROTOCOL_VERSION, accountInfo, host, link, routes;
  if (req.params.module === 'caldav' || req.params.module === 'carddav') {
    return res.redirect('/public/sync/');
  } else if (req.params.module === 'webfinger') {
    host = 'https://' + req.get('host');
    OAUTH_VERSION = 'http://tools.ietf.org/html/rfc6749#section-4.2';
    PROTOCOL_VERSION = 'draft-dejong-remotestorage-01';
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET');
    accountInfo = {
      links: []
    };
    routes = router.getRoutes();
    if (routes['remotestorage']) {
      link = {
        href: "" + host + "/public/remotestorage/storage",
        rel: 'remotestorage',
        type: PROTOCOL_VERSION,
        properties: {
          'auth-method': OAUTH_VERSION,
          'auth-endpoint': "" + host + "/apps/remotestorage/oauth/"
        }
      };
      link.properties[OAUTH_VERSION] = link.properties['auth-endpoint'];
      accountInfo.links.push(link);
    }
    return res.send(200, accountInfo);
  } else {
    return res.send(404);
  }
};
