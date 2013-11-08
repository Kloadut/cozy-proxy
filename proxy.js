// Generated by CoffeeScript 1.6.3
var Client, DeviceManager, InstanceManager, LocalStrategy, PasswordKeys, StatusChecker, UserManager, bcrypt, configurePassport, express, fs, helpers, httpProxy, middlewares, passport, passwordKeys, qs, randomstring,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

httpProxy = require('http-proxy');

express = require('express');

randomstring = require('randomstring');

bcrypt = require('bcrypt');

fs = require('fs');

qs = require('querystring');

passport = require('passport');

LocalStrategy = require('passport-local').Strategy;

Client = require('request-json').JsonClient;

helpers = require('./helpers');

middlewares = require('./middlewares');

PasswordKeys = require('./lib/password_keys');

StatusChecker = require('./lib/status');

UserManager = require('./models').UserManager;

DeviceManager = require('./models').DeviceManager;

InstanceManager = require('./models').InstanceManager;

passwordKeys = new PasswordKeys();

configurePassport = function(userManager) {
  passport.currentUser = null;
  passport.serializeUser = function(user, done) {
    return done(null, user._id);
  };
  passport.deserializeUser = function(id, done) {
    if ((passport.currentUser != null) && id === passport.currentUser._id) {
      return done(null, passport.currentUser);
    } else {
      return done(null, null);
    }
  };
  return passport.use(new LocalStrategy(function(email, password, done) {
    return userManager.all(function(err, users) {
      var checkResult;
      checkResult = function(err, res) {
        if (err) {
          console.log("bcrypt checking failed");
          return done(err, null);
        } else if (res) {
          passport.currentUser = users[0].value;
          passport.currentUser.id = users[0].value._id;
          return done(err, users[0].value);
        } else {
          return done(err, null);
        }
      };
      if (err) {
        console.log(err);
        return done(err, null);
      } else if (users === void 0 || !users) {
        return done(err, null);
      } else if (users && users.length === 0) {
        return done(err, null);
      } else {
        return bcrypt.compare(password, users[0].value.password, checkResult);
      }
    });
  }));
};

exports.CozyProxy = (function() {
  CozyProxy.prototype.proxyPort = 9104;

  CozyProxy.prototype.defaultPort = 9103;

  CozyProxy.prototype.routes = {};

  function CozyProxy() {
    this.webfingerAccount = __bind(this.webfingerAccount, this);
    this.webfingerHostMeta = __bind(this.webfingerHostMeta, this);
    this.resetPasswordAction = __bind(this.resetPasswordAction, this);
    this.resetPasswordView = __bind(this.resetPasswordView, this);
    this.forgotPasswordAction = __bind(this.forgotPasswordAction, this);
    this.registerAction = __bind(this.registerAction, this);
    this.logoutAction = __bind(this.logoutAction, this);
    this.loginAction = __bind(this.loginAction, this);
    this.authenticate = __bind(this.authenticate, this);
    this.authenticatedAction = __bind(this.authenticatedAction, this);
    this.registerView = __bind(this.registerView, this);
    this.loginView = __bind(this.loginView, this);
    this.showRoutesAction = __bind(this.showRoutesAction, this);
    this.resetRoutesAction = __bind(this.resetRoutesAction, this);
    this.authenticatedAction = __bind(this.authenticatedAction, this);
    this.redirectPublicAppAction = __bind(this.redirectPublicAppAction, this);
    this.redirectAppAction = __bind(this.redirectAppAction, this);
    this.redirectWithSlash = __bind(this.redirectWithSlash, this);
    this.redirectDeviceAction = __bind(this.redirectDeviceAction, this);
    this.startApp = __bind(this.startApp, this);
    this.ensureStarted = __bind(this.ensureStarted, this);
    this.defaultRedirectAction = __bind(this.defaultRedirectAction, this);
    this.replication = __bind(this.replication, this);
    this.enableSocketRedirection = __bind(this.enableSocketRedirection, this);
    this.app = express();
    this.server = httpProxy.createServer(this.app);
    this.proxy = this.server.proxy;
    this.proxy.source.port = 9104;
    this.userManager = new UserManager();
    this.deviceManager = new DeviceManager();
    this.instanceManager = new InstanceManager();
    configurePassport(this.userManager);
    this.app.enable('trust proxy');
    this.app.set('view engine', 'jade');
    this.app.use(express["static"](__dirname + '/public'));
    this.app.use(middlewares.selectiveBodyParser);
    this.app.use(express.cookieParser(randomstring.generate()));
    this.app.use(express.session({
      secret: randomstring.generate(),
      cookie: {
        maxAge: 30 * 86400 * 1000
      }
    }));
    this.app.use(passport.initialize());
    this.app.use(passport.session());
    this.configureLogs();
    this.app.use(function(err, req, res, next) {
      console.error(err.stack);
      return sendError(res, err.message);
    });
    this.enableSocketRedirection();
    this.setControllers();
    this.deviceManager.update();
  }

  CozyProxy.prototype.configureLogs = function() {
    var env, format, logFile;
    if (process.env.NODE_ENV === "development") {
      return this.app.use(express.logger('dev'));
    } else {
      format = '[:date] :method :url :status :response-time ms';
      env = process.env.NODE_ENV;
      if (!fs.existsSync('./log')) {
        fs.mkdirSync('log');
      }
      logFile = fs.createWriteStream("./log/" + env + ".log", {
        flags: 'w'
      });
      this.app.use(express.logger({
        stream: logFile,
        format: '[:date] :method :url :status :response-time ms'
      }));
      if (env === "production") {
        return console.log = function(text) {
          return logFile.write(text + '\n');
        };
      }
    }
  };

  CozyProxy.prototype.setControllers = function() {
    this.app.get("/routes", this.showRoutesAction);
    this.app.get("/routes/reset", this.resetRoutesAction);
    this.app.get('/register', this.registerView);
    this.app.post('/register', this.registerAction);
    this.app.get(/^\/login/, this.loginView);
    this.app.post('/login', this.loginAction);
    this.app.post('/login/forgot', this.forgotPasswordAction);
    this.app.get('/password/reset/:key', this.resetPasswordView);
    this.app.post('/password/reset/:key', this.resetPasswordAction);
    this.app.get('/logout', this.logoutAction);
    this.app.get('/authenticated', this.authenticatedAction);
    this.app.get('/status', this.statusAction);
    this.app.get('/.well-known/host-meta.?:ext', this.webfingerHostMeta);
    this.app.get('/.well-known/:module', this.webfingerAccount);
    this.app.all('/public/:name/*', this.redirectPublicAppAction);
    this.app.post('/device*', this.redirectDeviceAction);
    this.app.all('/apps/:name/*', this.redirectAppAction);
    this.app.all('/cozy/*', this.replication);
    this.app.get('/apps/:name*', this.redirectWithSlash);
    return this.app.all('/*', this.defaultRedirectAction);
  };

  CozyProxy.prototype.start = function(port) {
    if (port) {
      this.proxyPort = port;
    }
    return this.server.listen(process.env.PORT || this.proxyPort);
  };

  CozyProxy.prototype.stop = function() {
    return this.server.close();
  };

  /* helpers*/


  CozyProxy.prototype.sendSuccess = function(res, msg, code) {
    if (code == null) {
      code = 200;
    }
    return res.send({
      success: true,
      msg: msg
    }, code);
  };

  CozyProxy.prototype.sendError = function(res, msg, code) {
    if (code == null) {
      code = 500;
    }
    return res.send({
      error: true,
      msg: msg
    }, code);
  };

  /* Routes*/


  CozyProxy.prototype.enableSocketRedirection = function() {
    var _this = this;
    return this.server.on('upgrade', function(req, socket, head) {
      var port, slug;
      if (slug = _this.app._router.matchRequest(req).params.name) {
        req.url = req.url.replace("/apps/" + slug, '');
        port = _this.routes[slug].port;
      } else {
        port = _this.defaultPort;
      }
      if (port) {
        return _this.proxy.proxyWebSocketRequest(req, socket, head, {
          host: 'localhost',
          port: port
        });
      } else {
        return socket.end("HTTP/1.1 404 NOT FOUND \r\n" + "Connection: close\r\n", 'ascii');
      }
    });
  };

  CozyProxy.prototype.replication = function(req, res) {
    var authDevice, buffer,
      _this = this;
    buffer = httpProxy.buffer(req);
    authDevice = req.headers['authorization'].replace('Basic ', '');
    authDevice = new Buffer(authDevice, 'base64').toString('ascii');
    return this.deviceManager.isAuthenticated(authDevice.split(':')[0], authDevice.split(':')[1], function(isAuth) {
      var authProxy, basicCredentials, credentials;
      if (isAuth) {
        if (process.env.NODE_ENV === "production") {
          credentials = "" + process.env.NAME + ":" + process.env.TOKEN;
          basicCredentials = new Buffer(credentials).toString('base64');
          authProxy = "Basic " + basicCredentials;
          req.headers['authorization'] = authProxy;
        }
        return _this.proxy.proxyRequest(req, res, {
          host: "127.0.0.1",
          port: 5984,
          buffer: buffer
        });
      } else {
        return _this.sendError(res, "Request unauthorized", 401);
      }
    });
  };

  CozyProxy.prototype.defaultRedirectAction = function(req, res) {
    var buffer, url;
    if (req.isAuthenticated()) {
      buffer = httpProxy.buffer(req);
      return this.proxy.proxyRequest(req, res, {
        host: 'localhost',
        port: this.defaultPort,
        buffer: buffer
      });
    } else {
      url = "/login" + req.url;
      if (req.query.length) {
        url += "?" + (qs.stringify(req.query));
      }
      return res.redirect(url);
    }
  };

  CozyProxy.prototype.ensureStarted = function(slug, doStart, cb) {
    var _this = this;
    if (this.routes[slug] == null) {
      cb({
        code: 404,
        msg: 'app unknown'
      });
      return;
    }
    switch (this.routes[slug].state) {
      case 'broken':
        return cb({
          code: 500,
          msg: 'app broken'
        });
      case 'installing':
        return cb({
          code: 404,
          msg: 'app is still installing'
        });
      case 'installed':
        return cb(null, this.routes[slug].port);
      case 'stopped':
        if (!doStart) {
          return {
            code: 500,
            msg: 'wont start'
          };
        }
        return this.startApp(slug, function(err) {
          if (err != null) {
            return cb({
              code: 500,
              msg: "cannot start app : " + err
            });
          } else {
            return cb(null, _this.routes[slug].port);
          }
        });
      default:
        return cb({
          code: 500,
          msg: 'incorrect app state'
        });
    }
  };

  CozyProxy.prototype.startApp = function(slug, cb) {
    var client,
      _this = this;
    client = new Client("http://localhost:" + this.defaultPort + "/");
    return client.post("api/applications/" + slug + "/start", {}, function(err, _, data) {
      if (err != null) {
        cb(err);
      }
      if (data.error) {
        cb(data.msg);
      }
      _this.routes[slug] = data.app;
      return cb(null);
    });
  };

  CozyProxy.prototype.redirectDeviceAction = function(req, res) {
    var auth, authDevice, authenticator, buffer, sendRequest, user,
      _this = this;
    buffer = httpProxy.buffer(req);
    sendRequest = function() {
      var authProxy, basicCredentials, credentials, end;
      credentials = "" + process.env.NAME + ":" + process.env.TOKEN;
      basicCredentials = new Buffer(credentials).toString('base64');
      authProxy = "Basic " + basicCredentials;
      req.headers['authorization'] = authProxy;
      end = false;
      res.end = function() {
        return _this.deviceManager.update();
      };
      return _this.proxy.proxyRequest(req, res, {
        host: "127.0.0.1",
        port: 9101,
        buffer: buffer
      });
    };
    authenticator = passport.authenticate('local', function(err, user) {
      if (err) {
        console.log(err);
        return _this.sendError(res, "Server error occured.", 500);
      } else if (user === void 0 || !user) {
        return _this.sendError(res, "Wrong password", 401);
      } else {
        return sendRequest();
      }
    });
    user = {};
    authDevice = req.headers['authorization'].replace('Basic ', '');
    auth = new Buffer(authDevice, 'base64').toString('ascii');
    user.body = {
      username: auth.split(':')[0],
      password: auth.split(':')[1]
    };
    req.headers['authorization'] = void 0;
    return authenticator(user, res);
  };

  CozyProxy.prototype.redirectWithSlash = function(req, res) {
    return res.redirect(req.url + '/');
  };

  CozyProxy.prototype.redirectAppAction = function(req, res) {
    var appName, buffer, doStart, url,
      _this = this;
    if (!req.isAuthenticated()) {
      url = "/login" + req.url;
      if (req.query.length) {
        url += "?" + (qs.stringify(req.query));
      }
      return res.redirect(url);
    }
    buffer = httpProxy.buffer(req);
    appName = req.params.name;
    req.url = req.url.substring(("/apps/" + appName).length);
    doStart = -1 === req.url.indexOf('socket.io');
    return this.ensureStarted(appName, doStart, function(err, port) {
      if (err != null) {
        return res.send(err.code, err.msg);
      }
      return _this.proxy.proxyRequest(req, res, {
        host: 'localhost',
        port: port,
        buffer: buffer
      });
    });
  };

  CozyProxy.prototype.redirectPublicAppAction = function(req, res) {
    var appName, buffer, doStart,
      _this = this;
    buffer = httpProxy.buffer(req);
    appName = req.params.name;
    req.url = req.url.substring(("/public/" + appName).length);
    req.url = "/public" + req.url;
    doStart = -1 === req.url.indexOf('socket.io');
    return this.ensureStarted(appName, doStart, function(err, port) {
      if (err != null) {
        return res.send(err.code, err.msg);
      }
      return _this.proxy.proxyRequest(req, res, {
        host: 'localhost',
        port: port,
        buffer: buffer
      });
    });
  };

  CozyProxy.prototype.authenticatedAction = function(req, res) {
    return res.send({
      success: req.isAuthenticated()
    });
  };

  CozyProxy.prototype.resetRoutesAction = function(req, res) {
    console.log("GET reset/routes start route reseting");
    return this.resetRoutes(function(error) {
      if (error) {
        return res.send(error);
      } else {
        console.log("Reset routes succeeded");
        return send(200);
      }
    });
  };

  CozyProxy.prototype.showRoutesAction = function(req, res) {
    return res.send(this.routes);
  };

  CozyProxy.prototype.resetRoutes = function(callback) {
    var client,
      _this = this;
    this.routes = {};
    client = new Client("http://localhost:" + this.defaultPort + "/");
    return client.get("api/applications/", function(error, response, apps) {
      var app, err, _i, _len, _ref;
      if (error) {
        return callback(error);
      }
      if (apps.error != null) {
        return callback(new Error(apps.msg));
      }
      try {
        _ref = apps.rows;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          app = _ref[_i];
          _this.routes[app.slug] = {};
          if (app.port != null) {
            _this.routes[app.slug].port = app.port;
          }
          if (app.state != null) {
            _this.routes[app.slug].state = app.state;
          }
        }
        return callback();
      } catch (_error) {
        err = _error;
        return callback(err);
      }
    });
  };

  /* Authentication*/


  CozyProxy.prototype.loginView = function(req, res) {
    var _this = this;
    return this.userManager.all(function(err, users) {
      var name;
      if ((users != null ? users.length : void 0) > 0 && !err) {
        name = helpers.hideEmail(users[0].value.email);
        if (name != null) {
          name = name.charAt(0).toUpperCase() + name.slice(1);
        }
        return res.render('login', {
          username: name,
          title: 'Cozy Home - Sign in'
        });
      } else {
        return res.redirect('register');
      }
    });
  };

  CozyProxy.prototype.registerView = function(req, res) {
    return this.userManager.all(function(err, users) {
      if ((users == null) || users.length === 0) {
        return res.render('register', {
          title: 'Cozy Home - Sign up'
        });
      } else {
        return res.redirect('login');
      }
    });
  };

  CozyProxy.prototype.authenticatedAction = function(req, res) {
    return res.send({
      success: req.isAuthenticated()
    });
  };

  CozyProxy.prototype.authenticate = function(req, res) {
    var answer, authenticator,
      _this = this;
    answer = function(err) {
      if (err) {
        return _this.sendError(res, "Login failed");
      } else {
        return _this.sendSuccess(res, "Login succeeded");
      }
    };
    authenticator = passport.authenticate('local', function(err, user) {
      if (err) {
        console.log(err);
        return _this.sendError(res, "Server error occured.", 500);
      } else if (user === void 0 || !user) {
        return _this.sendError(res, "Wrong password", 400);
      } else {
        return passwordKeys.initializeKeys(req.body.password, function(err) {
          if (err) {
            console.log(err);
            return _this.sendError(res, "Keys aren't initialized", 500);
          } else {
            return req.logIn(user, {}, answer);
          }
        });
      }
    });
    return authenticator(req, res);
  };

  CozyProxy.prototype.loginAction = function(req, res) {
    req.body.username = "owner";
    return this.authenticate(req, res);
  };

  CozyProxy.prototype.logoutAction = function(req, res) {
    var _this = this;
    return passwordKeys.deleteKeys(function(err) {
      if (err) {
        return {
          success: false
        };
      } else {
        req.logOut();
        passport.currentUser = null;
        return res.send({
          success: true,
          msg: "Log out succeeded."
        });
      }
    });
  };

  CozyProxy.prototype.registerAction = function(req, res) {
    var createUser, email, password, user,
      _this = this;
    email = req.body.email;
    password = req.body.password;
    createUser = function(url) {
      var hash, user;
      hash = helpers.cryptPassword(password);
      user = {
        email: email,
        owner: true,
        password: hash.hash,
        salt: hash.salt,
        activated: true,
        docType: "User"
      };
      return _this.userManager.create(user, function(err, code, user) {
        if (err) {
          console.log(err);
          return _this.sendError(res, "Server error occured.", 500);
        } else {
          req.body.username = "owner";
          return _this.authenticate(req, res);
        }
      });
    };
    user = {
      email: email,
      password: password
    };
    if (this.userManager.isValid(user)) {
      return this.userManager.all(function(err, users) {
        if (err) {
          console.log(err);
          return _this.sendError(res, "Server error occured.", 500);
        } else if (users.length) {
          return _this.sendError(res, "User already registered.", 400);
        } else {
          return createUser();
        }
      });
    } else {
      return this.sendError(res, this.userManager.error, 400);
    }
  };

  CozyProxy.prototype.forgotPasswordAction = function(req, res) {
    var sendEmail,
      _this = this;
    sendEmail = function(instances, user, key) {
      var instance;
      console.log("send email");
      if (instances.length > 0) {
        instance = instances[0].value;
      } else {
        instance = {
          domain: "domain.not.set"
        };
      }
      return helpers.sendResetEmail(instance, user, key, function(err, result) {
        if (err) {
          console.log(err);
          return _this.sendError(res, "Email cannot be sent");
        } else {
          return _this.sendSuccess(res, "Reset email sent.");
        }
      });
    };
    return this.userManager.all(function(err, users) {
      var user;
      if (err) {
        console.log(err);
        return _this.sendError(res, "Server error occured.", 500);
      } else if (users.length === 0) {
        return res.send({
          error: true,
          msg: "No user set, register first error occured."
        }, 500);
      } else {
        user = users[0].value;
        _this.resetKey = randomstring.generate();
        return _this.instanceManager.all(function(err, instances) {
          if (err) {
            console.log(err);
            return _this.sendError(res, "Server error occured.", 500);
          } else {
            return sendEmail(instances, user, _this.resetKey);
          }
        });
      }
    });
  };

  CozyProxy.prototype.resetPasswordView = function(req, res) {
    if (this.resetKey === req.params.key) {
      return res.render('reset', {
        resetKey: req.params.key,
        title: 'Cozy Home - Reset password'
      });
    } else {
      return res.redirect('/');
    }
  };

  CozyProxy.prototype.resetPasswordAction = function(req, res) {
    var changeUserData, checkKey, key, newPassword,
      _this = this;
    key = req.params.key;
    newPassword = req.body.password;
    checkKey = function(user) {
      if (_this.resetKey === req.params.key) {
        return changeUserData(user);
      } else {
        return _this.sendError(res, "Key is not valid.", 400);
      }
    };
    changeUserData = function(user) {
      var data;
      if ((newPassword != null) && newPassword.length > 5) {
        data = {
          password: helpers.cryptPassword(newPassword).hash
        };
        return _this.userManager.merge(user, data, function(err) {
          if (err) {
            return _this.sendError(res, 'User cannot be updated');
          } else {
            _this.resetKey = "";
            return passwordKeys.resetKeys(function(err) {
              if (err) {
                return _this.sendError(res, "Server error occured", 500);
              } else {
                return _this.sendSuccess(res, "Password updated \                                        successfully");
              }
            });
          }
        });
      } else {
        return _this.sendError(res, 'Password is too short', 400);
      }
    };
    return this.userManager.all(function(err, users) {
      if (err) {
        console.log(err);
        return _this.sendError(res, "Server error occured.", 500);
      } else if (users.length === 0) {
        return _this.sendError(res, "No user registered.", 400);
      } else {
        return checkKey(users[0].value);
      }
    });
  };

  CozyProxy.prototype.statusAction = function(req, res) {
    var statusChecker;
    statusChecker = new StatusChecker();
    return statusChecker.checkAllStatus(function(err, status) {
      if (err) {
        return res.send(500);
      } else {
        return res.send(status);
      }
    });
  };

  CozyProxy.prototype.webfingerHostMeta = function(req, res) {
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
    return res.send(hostmeta);
  };

  CozyProxy.prototype.webfingerAccount = function(req, res) {
    var OAUTH_VERSION, PROTOCOL_VERSION, accountinfo, host, link;
    if (req.params.module === 'caldav' || req.params.module === 'carddav') {
      return res.redirect('/public/webdav/');
    } else if (req.params.module === 'webfinger') {
      host = 'https://' + req.get('host');
      OAUTH_VERSION = 'http://tools.ietf.org/html/rfc6749#section-4.2';
      PROTOCOL_VERSION = 'draft-dejong-remotestorage-01';
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', true);
      res.header('Access-Control-Allow-Methods', 'GET');
      accountinfo = {
        links: []
      };
      if (this.routes['remotestorage']) {
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
        accountinfo.links.push(link);
      }
      return res.send(accountinfo);
    } else {
      return res.send(404);
    }
  };

  return CozyProxy;

})();
