// Generated by CoffeeScript 1.9.2
var bdd, expector, injector, tdd;

module.exports.bdd = bdd = require('./bdd');

module.exports.tdd = tdd = require('./tdd');

module.exports.injector = injector = require('./injector');

module.exports.expector = expector = require('./expector');

module.exports.before = function(config) {
  tdd.before(config);
  bdd.before(config);
  injector.before(config);
  return expector.before(config);
};