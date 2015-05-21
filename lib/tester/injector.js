// Generated by CoffeeScript 1.9.2
var config, expector, fs, path;

path = require('path');

fs = require('fs');

config = void 0;

expector = require('./expector');

module.exports.before = function(conf) {
  return config = conf;
};

module.exports.load = function(name) {
  var caps, e, i, j, k, len, matches, modpath, parts, possible, recurse, ref, tries;
  if (name === 'Subject' || name === 'subject') {
    modpath = config.filename.replace(new RegExp("^" + dev.testDir), dev.sourceDir);
    modpath = modpath.replace('_spec.', '.');
    try {
      return expector.create(require(process.cwd() + path.sep + modpath));
    } catch (_error) {
      e = _error;
      console.log("Subject injection failed. " + (e.toString()));
      return {};
    }
  }
  if (name.match(/^[A-Z]/)) {
    caps = name.match(/[A-Z]/g);
    parts = name.split(/[A-Z]/);
    parts.shift();
    tries = ['', '', ''];
    for (i = j = 0, ref = caps.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
      if (i !== 0) {
        tries[0] += '_';
      }
      tries[0] += caps[i].toLowerCase();
      tries[0] += parts[i].toLowerCase();
      if (i !== 0) {
        tries[1] += '-';
      }
      tries[1] += caps[i].toLowerCase();
      tries[1] += parts[i].toLowerCase();
      if (i === 0) {
        tries[2] += caps[i].toLowerCase();
      }
      if (i > 0) {
        tries[2] += caps[i];
      }
      tries[2] += parts[i].toLowerCase();
    }
    matches = [];
    for (k = 0, len = tries.length; k < len; k++) {
      possible = tries[k];
      recurse = function(directory) {
        var file, files, l, len1, results, stat;
        files = fs.readdirSync(directory);
        results = [];
        for (l = 0, len1 = files.length; l < len1; l++) {
          file = files[l];
          stat = fs.lstatSync(directory + path.sep + file);
          if (!stat.isDirectory()) {
            if (file.match(new RegExp("^" + possible + "."))) {
              matches.push(directory + path.sep + file);
            }
            continue;
          }
          results.push(recurse(directory + path.sep + file));
        }
        return results;
      };
      recurse(process.cwd() + path.sep + dev.sourceDir);
    }
    if (matches.length === 1) {
      return expector.create(require(matches[0]));
    }
    if (matches.length === 0) {
      throw new Error('No injection match for #{name}');
    }
    if (matches.length > 1) {
      throw new Error('Multiple injection matches for #{name}');
    }
  }
  return expector.create(require(name));
};