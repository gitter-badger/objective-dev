// Generated by CoffeeScript 1.9.2
var EOL, TODO, colors, debug, error, fs, info, logger, pipe, showCode;

logger = objective.logger, pipe = objective.pipe;

info = logger.info, error = logger.error, debug = logger.debug, TODO = logger.TODO;

colors = require('colors');

EOL = require('os').EOL;

TODO('Final stats after test (or test all)');

TODO('runs initiated by file changes may overlap, fix (perhaps {noOvertake} pipe on change watcher');

TODO('test timeouts error');

fs = require('fs');

showCode = function(file, line, col) {
  var i, j, lines, ref, results;
  lines = fs.readFileSync(file).toString().split(EOL);
  line = parseInt(line);
  results = [];
  for (i = j = 0, ref = lines.length - 1; 0 <= ref ? j <= ref : j >= ref; i = 0 <= ref ? ++j : --j) {
    if (!(i + dev.walkWidth > line)) {
      continue;
    }
    if (!(i - dev.walkWidth < line)) {
      continue;
    }
    if (line !== i + 1) {
      console.log(lines[i].grey);
    }
    if (line === i + 1) {
      results.push(console.log(lines[i].red));
    } else {
      results.push(void 0);
    }
  }
  return results;
};

module.exports = function() {
  debug('using default test reporter');
  pipe.on('dev.test.before.all', function(payload, next) {
    console.log();
    return next();
  });
  pipe.on('dev.test.after.all', function(payload, next) {
    return next();
  });
  return pipe.on('dev.test.after.each', function(arg, next) {
    var colNo, count, file, j, len, line, lineNo, m, ref, ref1, ref2, stack, test, testName, testPath;
    test = arg.test;
    try {
      testPath = test.node.path.slice(1);
      testPath[testPath.length - 1] = testPath[testPath.length - 1].bold;
      testName = testPath.join(' + ');
    } catch (_error) {}
    if (test.type !== 'test') {
      if (test.error != null) {
        TODO('linkable stack on console.click to sublime plugin got location');
        console.log("ERROR".red, ("in " + test.type).bold);
        stack = test.error.stack.split(EOL);
        console.log(stack[0].bold.red);
        count = 0;
        ref = stack.slice(1);
        for (j = 0, len = ref.length; j < len; j++) {
          line = ref[j];
          console.log(line.bold);
          try {
            if (line.match(/\)$/)) {
              ref1 = line.match(/\((.*):(\d+)\:(\d+)\)/), m = ref1[0], file = ref1[1], lineNo = ref1[2], colNo = ref1[3];
            } else {
              ref2 = line.match(/at\ (.*):(\d+)\:(\d+)$/), m = ref2[0], file = ref2[1], lineNo = ref2[2], colNo = ref2[3];
            }
            if (!(count >= dev.walkDepth)) {
              showCode(file, lineNo, colNo);
            }
          } catch (_error) {}
          count++;
        }
      }
      return next();
    }
    if (test.error == null) {
      process.stdout.write('*'.green);
      return next();
    }
    TODO('behave according to error type, assert fails, error walsk stack');
    console.log('FAILED '.red + testName);
    stack = test.error.stack.split(EOL);
    stack[0] = stack[0].bold.red;
    console.log(stack.join(EOL));
    return next();
  });
};