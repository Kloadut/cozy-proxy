// Generated by CoffeeScript 1.9.0
var addGitHook, appsDir, configureNewRepo, exec, fs, gitBackend, logger, pushover, repos, spawn;

fs = require('fs-extra');

gitBackend = require('git-http-backend');

pushover = require('pushover');

exec = require('child_process').exec;

spawn = require('child_process').spawn;

logger = require('printit')({
  date: false,
  prefix: 'git:server'
});

appsDir = '/usr/local/cozy/apps';

repos = pushover(appsDir, {
  autocreate: false,
  checkout: true
});

addGitHook = function(appName, callback) {
  var appRepo;
  appRepo = appsDir + "/" + appName;
  logger.info("Adding Git `post-update` hook for " + appName);
  return fs.writeFile(appRepo + "/.git/hooks/post-update", "#!/bin/sh\nexport GIT_DIR=/usr/local/cozy/apps/" + appName + "/.git/\nexport GIT_WORK_TREE=/usr/local/cozy/apps/" + appName + "/\ngit reset --hard > /dev/null\ngit submodule update --init --recursive\ncozy-monitor versions | grep -q \"" + appName + ":\"\nif [ $? -eq 0 ];\nthen\n    cozy-monitor update " + appName + "\nelse\n    cozy-monitor deploy " + appName + "\n    git remote add origin $GIT_DIR\nfi", function(err) {
    if (err) {
      return callback(err);
    }
    return fs.chmod(appRepo + "/.git/hooks/post-update", "755", function(err) {
      return callback(err);
    });
  });
};

configureNewRepo = function(appName, callback) {
  var appRepo;
  appRepo = appsDir + "/" + appName;
  return fs.move(appRepo + ".git", appRepo, function(err) {
    if (err) {
      return callback(err);
    }
    return exec("git config receive.denyCurrentBranch ignore", {
      cwd: appRepo
    }, function(err) {
      if (err) {
        return callback(err);
      }
      return addGitHook(appName, callback);
    });
  });
};

fs.readdir(appsDir, function(err, apps) {
  var appName, appRepo, _i, _len, _results;
  if (err) {
    logger.error(err);
  }
  _results = [];
  for (_i = 0, _len = apps.length; _i < _len; _i++) {
    appName = apps[_i];
    if (appName === "home" || appName === "data-system" || appName === "proxy") {
      continue;
    }
    appRepo = appsDir + "/" + appName;
    if (fs.existsSync(appRepo + "/.git")) {
      exec("git config receive.denyCurrentBranch ignore", {
        cwd: appRepo
      }, function(err) {
        if (err) {
          return logger.error(err);
        }
      });
      _results.push(addGitHook(appName, function(err) {
        if (err) {
          return logger.error(err);
        }
      }));
    } else {
      _results.push(void 0);
    }
  }
  return _results;
});

module.exports.serveRepo = function(req, res, next) {
  var appName, appRepo;
  appName = req.params.name;
  appName = req.params.name.replace(/\.git/, "");
  if (!appName.match(/^[a-zA-Z0-9-]{2,30}$/)) {
    res.statusCode = 400;
    return res.end("Bad request");
  }
  appRepo = appsDir + "/" + appName;
  req.url = req.url.substring("/repo".length);
  req.url = req.url.replace(/\.git/, "");
  if (req.method === "POST") {
    repos.on("push", function(push) {
      if (!fs.existsSync(appRepo)) {
        return configureNewRepo(appName, function(err) {
          if (err) {
            return push.reject();
          } else {
            return push.accept();
          }
        });
      } else {
        return push.accept();
      }
    });
  }
  return repos.handle(req, res);
};
