// TODO - original

var generate = require('shortid').generate
  , pipeline = objective.pipeline
  , warn = objective.logger.warn
  , objects // list of objects expected upon
  , dev = require('../')
  , deepcopy = require('deepcopy')
  , originalFunction = function() {}
  , debug = objective.logger.createDebug('dev:expector')
  ;

module.exports.objects = objects = {};


pipeline.on('dev.test.after.each', 'valudate expectations',

  module.exports.validate = function(args) {

  // Check that all expectations were met. 
  // Restore original functions where appropriate.

  var failed = [];

  var keeps = {}; // stubs and spies can be created in beforeAlls
                 // so they need to be left in place.
                // before.each ahead of next test removes 
               // those that are no longer ancestral.

  for (var id in objects) {

    var object = objects[id].object;
    var expected = objects[id].functions.expected;
    var type = objects[id].functions.type;
    var called = objects[id].functions.called;
    var original = objects[id].functions.original;
    var keepsObj = keeps[id] = {};

    for (var funcName in expected) {

      var remaining = []; // expectations uncalled
      var wascalled = [];    // calls that were made
      var classifier = type[funcName].classifier;
      var objectType = type[funcName].objectType;
      var matters = true;
      var keepsObjFn = keepsObj[funcName] = [];

      // filter out all but valid expectations

      for (var i = expected[funcName].length-1; i >= 0; i--) {
        if (expected[funcName][i].stubType == 'stub') {
          matters = false; // expectations before stub dont count
        }
        if (matters && expected[funcName][i].stubType == 'expectation')
          remaining.push(expected[funcName][i]);
        else
          keepsObjFn.unshift(expected[funcName][i]); // The entire stack of stubs and spies and
                                                    // and stubbed expectations survives into
                                                   // the next step. The before each then clears
                                                  // those it should.
      }

      if (called[funcName]) {
        for (var i = called[funcName].length-1; i >=0; i--) {
          if (called[funcName][i].stubType == 'expectation')
            wascalled.push(called[funcName][i]);
        }
      }

      objects[id].functions.expected[funcName] = remaining;
      objects[id].functions.called[funcName] = wascalled;

      // restore original function

      if (keepsObjFn.length == 0) {
        if (objectType == 'class' && classifier == 'prototype') {
          object.prototype[funcName] = original[funcName];
        } else {
          object[funcName] = original[funcName];
        }
      }

      if (remaining.length > 0) {
        failed.push((object.$$mockname || object.constructor.name) + '.' + funcName + '()')
      }
    }
  }

  if (failed.length > 0 && !args.test.node.skip && !args.test.node.pend) {

    if (!args.test.node.error) {
      var e = new Error('Missing call(s) to ' + failed.join(', '));
      e.name = 'ExpectationError';
      e.detail = {
        objects: deepcopy(objects) // objects are flushed, keep for stacks
      }
      args.test.node.error = e;
    }
  }

  // clear expectations ahead of next run

  for (var id in objects) {
    for (var funcName in objects[id].functions.expected ) {
      if (keeps[id][funcName].length > 0) objects[id].functions.expected[funcName] = keeps[id][funcName]
      else objects[id].functions.expected[funcName] = [];
      objects[id].functions.called[funcName] = [];
    }
  }


}, true);


pipeline.on('dev.test.before.each', 'purge expectations',

  module.exports.purge = function(args) {

    // validate() Has left expectations/stubs/spies in place that may still 
    //            be valid for this next test. This next test may be in a 
    //            new context so remove those stubs that are no longer ancestral.
    
    var testNode = args.test.node;
    
    var ancestral = function(originId, node) {
      if (node.id == originId) return true;
      if (node.parent) return ancestral(originId, node.parent);
      return false;
    }
    
    for (var id in objects) {

      var object = objects[id].object;
      var expected = objects[id].functions.expected;
      var original = objects[id].functions.original;
      var type = objects[id].functions.type;

      if (!expected) continue;

      for (var funcName in expected) {

        var keeps = [];
        var expectations = expected[funcName];
        var classifier = type[funcName].classifier;
        var objectType = type[funcName].objectType;

        if (!expectations) continue;

        if (expectations.length == 0) continue;

        for (var i = 0; i < expectations.length; i++) {

          var expectation = expectations[i];
          
          // if not ancestral, all the rest aren't either. 
          if (!ancestral(expectation.origin.node.id, testNode)) break;

          // if not a beforeAll, then it's a beforeEach, 
          // and will be recreated. Leave a gap for it.
          if (expectation.origin.type != 'beforeAll') {
            keeps.push(null);
          } else {
            keeps.push(expectation);
          }

        }

        // No expectations left
        if (keeps.length == 0) {
          if (objectType == 'class' && classifier == 'prototype') {
            object.prototype[funcName] = original[funcName];
          } else {
            object[funcName] = original[funcName];
          }
        } 

        while (keeps[keeps.length - 1] === null) keeps.pop(); 

        objects[id].functions.expected[funcName] = keeps;  
      }
    }
}, true);


pipeline.on('dev.test.after.all', 'flush expectations',

  module.exports.flush = function(args) {

    // Fully restore original functions and clear objects

    for (var id in objects) {

      var object = objects[id].object;
      var original = objects[id].functions.original;
      var type = objects[id].functions.type;

      for (var funcName in type) {

        var classifier = type[funcName].classifier;
        var objectType = type[funcName].objectType;

        if (objectType == 'class' && classifier == 'prototype') {
          object.prototype[funcName] = original[funcName];
        } else {
          object[funcName] = original[funcName];
        }
      }

      delete objects[id];
      objects[id] = {
        object: object,
        functions: {
          type: {},
          expected: {},
          called: {},
          original: {}
        }
      }
    }

}, true);



module.exports.create = function(object) {

  if (object.$$mockid) return object;
  return module.exports.createExpector(object);

}

module.exports.createExpector = function(object) {

  Object.defineProperty(object, '$$mockid', {
    enumerable: false,
    configurable: false,
    writable: false,
    value: generate()
  });

  var id = object.$$mockid;
  objects[id] = {
    object: object,
    functions: {
      type: {},
      expected: {},
      called: {},
      original: {}
    }
  }

  var stubbers = ['does', 'Does', 'mock', 'Mock', 'spy', 'Spy', 'stub', 'Stub'];
  stubbers.forEach(function(stubFn) {
    if (typeof object[stubFn] !== 'undefined') {
      var name;
      try {
        name = object.$$mockname ? object.$$mockname : object.constructor.name
      } catch (e) {}
      warn('Cannot create mocker (.%s) on \'%s\'', stubFn, name);
      return;
    }
    Object.defineProperty(object, stubFn, {
      enumarable: false,
      configurable: false,
      get: function() {
        if (!dev.runStep) {
          var e = new Error('Cannot use '+stubFn.toLowerCase()+'() out of test or hook.');
          e.name = 'ConfigurationError';
          // TODO, for stacks
          // e.thisAt = dev.runStep.step.info;
          throw e;
        }
        var type = dev.runStep.step.type
        if (type != 'afterEach' && type != 'afterAll') {
          if (stubFn == 'stub') return module.exports.mocker(stubFn, id);
          if (stubFn == 'Stub') return module.exports.mocker(stubFn, id);
          if (stubFn == 'spy') return module.exports.mocker(stubFn, id);
          if (stubFn == 'Spy') return module.exports.mocker(stubFn, id);
        }
        if (type != 'test' && type != 'beforeEach') {
          var e = new Error('Can only use '+stubFn.toLowerCase()+'() in test or beforeEach.');
          e.name = 'ConfigurationError';
          e.thisAt = dev.runStep.step.info;
          throw e;
        }
        return module.exports.mocker(stubFn, id);
      }
    });
  });
  return object;
}

module.exports.original = function() {
  return originalFunction;
}

module.exports.mocker = function(stubFn, id) {

  var classifier = stubFn.match(/^[A-Z]/) ? 'instance' : 'prototype';
  var object = objects[id].object;
  var functions = objects[id].functions;
  var objectType = object.prototype ? 'class' : 'instance';

  stubType = stubFn.toLowerCase();

  if (stubType == 'does' || stubType == 'mock') stubType = 'expectation';

  return function(list) {

    if (typeof list == 'object') {

      var expectation;
      var expectations = [];
      var returnType;

      for (var funcName in list) {
        (function(funcName){

          var e;

          var origin = dev.runStep || dev.walkStep;

          debug(
            'creating %s \'%s.%s()\' in \'%s\' step on node \'%s:%s\' with id %s',
            stubFn,
            object.$$mockname || 'object',
            funcName,
            origin.step.type,
            origin.step.node.type,
            origin.step.node.str || 'untitled',
            origin.step.node.id
          )

          expectation = {
            stubType: stubType,
            fn: list[funcName],
            created: module.exports.createInfo(4),
            origin: origin.step,
              // needed to find which stubs and spies
             // should survive the unstubbing if 
            // move to support stub and spy in beforeall
          };

          if (functions.type[funcName]) {
            var oT = functions.type[funcName].objectType;
            var cc = functions.type[funcName].classifier;
            if (oT !== objectType || cc !== classifier) {
              var e = new Error('Cannot change expectation type for function \''+funcName+'\'');
              e.name = 'ConfigurationError';
              e.thisAt = dev.runStep.step.info;
              throw e;
            }
          } else {
            functions.type[funcName] = {
              objectType: objectType,
              classifier: classifier
            }
          }

          expectations.push(expectation); // for as()
          functions.expected[funcName] = (functions.expected[funcName] || []);

          // filter() May have left gaps for expectations repeated in beforeEach hooks
          //          that were surrounded by expectations set in beforeAll hooks that
          //          will not be repeated. Push into the gaps.
          var gap;
          for (gap = 0; gap < functions.expected[funcName].length; gap++) {
            if (!functions.expected[funcName][gap]) break;
          }
          if (gap == functions.expected[funcName].length) {
            functions.expected[funcName].push(expectation);
          } else {
            functions.expected[funcName][gap] = expectation;
          }
          functions.called[funcName] = (functions.called[funcName] || []);

          var existing;
          var calling = function() {
            return module.exports.handleCall(funcName, id, arguments);
          }

          if (objectType == 'class' && classifier == 'prototype') {

            // expectation on class prototype (return .as for context)

            returnType = 'as';
            existing = object.prototype[funcName];
            if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
              return;
            }
            functions.original[funcName] = existing;
            object.prototype[funcName] = function() {
              // STUBBED_FUNCTION
              return calling.apply(this, arguments);
            }

          } else {

            // expectations on object / instance (return .with for properties)

            // returnType = 'with';
            existing = object[funcName];
            if (existing && existing.toString().match(/STUBBED_FUNCTION/)) {
              return;
            }
            functions.original[funcName] = existing;
            object[funcName] = function() {
              // STUBBED_FUNCTION
              return calling.apply(this, arguments);
            }
          }
        })(funcName);
      }
      if (returnType == 'as') {
        return {
          as: function(obj) {
            expectations.forEach(function(ex) {
              ex.context = obj;
            });
          }
        }
      } 
      return object;
      // else if (returnType == 'with') {
      //   return {
      //     with: function(obj) {
      //       console.log('pending with()');
      //     }
      //   }
      // }
    }
  }
}

module.exports.handleCall = function(funcName, id, args) {

  var expectations = objects[id].functions.expected[funcName];
  var called = objects[id].functions.called[funcName];
  var originalFn = objects[id].functions.original[funcName];
  var object = objects[id].object;
  var i //, result, copy, reversed;
  
  originalFunction = originalFn;

  // Find the first expectation


  // if there are any spies underneath, 
  // first call them, 
  // but dont call any spies that were stubbed
  var spies = [];
  var expectation;
  var stub;
  var position;
  // var reversed = expectations.reverse()
  for (i = expectations.length-1; i >= 0; i--) {
    if (expectations[i].stubType == 'stub') {
      stub = expectations[i];
      break;
    }
    if (expectations[i].stubType == 'spy') spies.unshift(expectations[i]);
    if (expectations[i].stubType == 'expectation') {
      expectation = expectations[i];
      position = i;
    }
  }

  if (expectation) {

    // there was an expectation that followed a stub,
    // or there was no stub.

    // mark as called and remove from expectations

    expectations.splice(position,1);
    expectation.called = module.exports.createInfo(5);
    called.push(expectation);

    // if there were spies call them first.

    if (spies.length > 0) spies.forEach(function(spy) {
      spy.fn.apply(expectation.context || object, args);
    });

    expectation.result = expectation.fn.apply(expectation.context || object, args);
    return expectation.result;

  } 

  else {

    // no waiting expectations, if there are expectations in called[]
    // then this should fail

    var tooManyCalls = false;
    for (var i = 0; i < called.length; i++) {

      if (called[i].stubType == 'expectation') {
        tooManyCalls = true;
        if (dev.runStep.step.node.error) {
          var existingError = dev.runStep.step.node.error;
          if (existingError.detail && existingError.detail.count) {
            existingError.detail.count++;
          }
          break;
        }
        var e = new Error('Unexpected call(s) to ' + (object.$$mockname || object.constructor.name) + '.' + funcName + '()');
        e.name = 'ExpectationError';
        e.detail = {
          thisObject: id,
          thisFunction: funcName,
          thisCall: {
            info: module.exports.createInfo(5)
          },
          count: 0,
          objects: deepcopy(objects) // objects are flushed, keep for stacks
        }
        dev.runStep.step.node.error = e;
        break;
      }
    }

    if (spies.length > 0) spies.forEach(function(spy) {
      spy.fn.apply(spy.context || object, args);
    });

    if (stub) {

      stub.called = module.exports.createInfo(5);
      called.push(stub);
      stub.result = stub.fn.apply(stub.context || object, args);
      return stub.result

    } else {

      if (tooManyCalls) {

        // Too many calls to expectation and no stub to send the
        // extra call to. Um? 
        // - Call original?
        // - Do nothing?
        // - Return result from earlier call?

      } else {
        // there were only spies, proeed to original
        try {
          return originalFn.apply(object, args);
        } catch (e) {
          throw e;
        }
      }
    }
  }
}

module.exports.createInfo = function(depth) {
  return objective.getCaller(depth)
}
