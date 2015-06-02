// Generated by CoffeeScript 1.9.2
var pipeline;

module.exports["default"] = require('./default');

pipeline = objective.pipeline;

pipeline.on('dev.test.after.all', function(payload) {
  var allFailed, duration, failed, fn, functions, i, j, len, len1, passed, pending, recurse, ref, skipped, totalHookDuration, totalTestDuration, tree, type;
  functions = payload.functions, tree = payload.tree;
  allFailed = false;
  for (i = 0, len = functions.length; i < len; i++) {
    fn = functions[i];
    if (fn.type !== 'test' && (fn.error != null)) {
      allFailed = true;
    }
  }
  totalHookDuration = totalTestDuration = 0;
  for (j = 0, len1 = functions.length; j < len1; j++) {
    ref = functions[j], duration = ref.duration, type = ref.type;
    if (type === 'test') {
      if (duration != null) {
        totalTestDuration += duration;
      }
      continue;
    }
    if (duration != null) {
      totalHookDuration += duration;
    }
  }
  failed = 0;
  passed = 0;
  skipped = 0;
  pending = 0;
  recurse = function(node, skipping) {
    var child, k, len2, ref1, results;
    if (skipping == null) {
      skipping = false;
    }
    if (node.type === 'it') {
      if (node.pending) {
        pending++;
      }
      if (node.skip || skipping || tree.only) {
        skipped++;
      }
      if (tree.only && node.only) {
        skipped--;
      }
      if (!(node.pending || node.skip || skipping)) {
        if (tree.only) {
          if (node.only) {
            if (node.error || allFailed) {
              failed++;
            } else {
              passed++;
            }
          }
        } else {
          if (node.error || allFailed) {
            failed++;
          } else {
            passed++;
          }
        }
      }
    }
    if (node.type === 'context') {
      if (node.skip) {
        skipping = true;
      }
    }
    if (node.children != null) {
      ref1 = node.children;
      results = [];
      for (k = 0, len2 = ref1.length; k < len2; k++) {
        child = ref1[k];
        results.push(recurse(child, skipping));
      }
      return results;
    }
  };
  recurse(tree);
  return payload.stats = {
    failed: failed,
    passed: passed,
    skipped: skipped,
    pending: pending,
    totalTestDuration: totalHookDuration,
    totalHookDuration: totalHookDuration
  };
});
