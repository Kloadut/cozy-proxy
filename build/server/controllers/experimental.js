// Generated by CoffeeScript 1.9.1
var CozyInstance, router;

CozyInstance = require('../models/instance');

router = require('../lib/router');

module.exports.webfingerHostMeta = function(req, res) {
  if (req.params.ext !== 'json') {
    return res.send(404);
  }
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET');
  return CozyInstance.first(function(err, instance) {
    var host, hostmeta, template;
    if (err != null) {
      return next(err);
    }
    if (!(instance != null ? instance.domain : void 0)) {
      return next(new Error("Cozy's domain has not been registered"));
    }
    host = 'https://' + instance.domain;
    template = host + "/webfinger/json?resource={uri}";
    hostmeta = {
      links: {
        rel: 'lrdd',
        template: template
      }
    };
    return res.send(200, hostmeta);
  });
};

module.exports.webfingerAccount = function(req, res, next) {
  return CozyInstance.first(function(err, instance) {
    var OAUTH_VERSION, PROTOCOL_VERSION, accountInfo, authEndPoint, host, link, ref, routes;
    if (err != null) {
      return next(err);
    }
    if (!(instance != null ? instance.domain : void 0)) {
      return next(new Error('no instance'));
    }
    host = "https://" + instance.domain;
    if ((ref = req.params.module) === 'caldav' || ref === 'carddav') {
      routes = router.getRoutes();
      if (routes['sync'] != null) {
        return res.redirect(host + "/public/sync/");
      } else {
        return res.send(404, 'Application Sync is not installed.');
      }
    } else if (req.params.module === 'webfinger') {
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
          href: host + "/public/remotestorage/storage",
          rel: 'remotestorage',
          type: PROTOCOL_VERSION,
          properties: {
            'auth-method': OAUTH_VERSION,
            'auth-endpoint': host + "/apps/remotestorage/oauth/"
          }
        };
        authEndPoint = link.properties['auth-endpoint'];
        link.properties[OAUTH_VERSION] = authEndPoint;
        accountInfo.links.push(link);
      }
      return res.send(200, accountInfo);
    } else {
      return res.send(404);
    }
  });
};
