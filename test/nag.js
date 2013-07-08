var assert = require('assert');
var nag = require('../index.js');
var randy = require('randy');

describe("nag", function() {
  it("exists", function() {
    assert(nag);
  });

  it("can be called with the default config", function(done) {
    function yes(cb) { cb(); }
    nag(yes, done);
  });

  it("can give up after N attempts", function(done) {
    var attemptsPerformed = 0;
    function never(cb) {
      attemptsPerformed += 1;
      cb('nope');
    }
    var maxAttempts = randy.randInt(5, 10);
    nag({ wait: 0, attempts: maxAttempts }, never, function(err) {
      assert.equal(attemptsPerformed, maxAttempts);
      done();
    });
  });

  it("accepts the first success", function(done) {
    var attemptsPerformed = 0;
    function good3rd(cb) {
      attemptsPerformed += 1;
      if (attemptsPerformed == 3)
        return cb();
      cb('nope');
    }
    nag({ wait: 0, attempts: 5 }, good3rd, function(err) {
      assert(!err);
      assert.equal(attemptsPerformed, 3);
      done();
    });
  });

  it("returns last error after giving up", function(done) {
    var attemptsPerformed = 0;
    function never(cb) {
      attemptsPerformed += 1;
      cb('rejected:' + attemptsPerformed.toString());
    }
    nag({ wait: 0, attempts: 5 }, never, function(err) {
      assert.equal(err, "rejected:5");
      done();
    });
  });

  it("can have specified delay", function(done) {
    var minTimeForNext = Date.now();
    var attempt = 0;
    function never(cb) {
      assert(Date.now() > minTimeForNext);
      minTimeForNext = Date.now() + 100;
      cb('nope');
    }
    nag({ wait: 100, attempts: 3}, never, function() {
      done();
    });
  });

  it("can take a delay backoff function", function(done) {
    function delayCalc(prevDelay) {
      return prevDelay * 2;
    }
    var delay = 10;
    var minTimeForNext = Date.now();
    function never(cb) {
      assert(Date.now() > minTimeForNext);
      minTimeForNext = Date.now() + delay;
      delay = delayCalc(delay);
      cb('nope');
    }
    nag({ wait: 10, attempts: 7, backoff: delayCalc }, never, function() {
      done();
    });
  });

  it("can take a delay backoff config number", function(done) {
    function delayCalc(prevDelay) {
      return prevDelay * 2;
    }
    var delay = 10;
    var minTimeForNext = Date.now();
    function never(cb) {
      assert(Date.now() > minTimeForNext);
      minTimeForNext = Date.now() + delay;
      delay = delayCalc(delay);
      cb('nope');
    }
    nag({ wait: 10, attempts: 7, backoff: 2 }, never, function() {
      done();
    });
  });

  it("can take a delay backoff config object with maximum", function(done) {
    function delayCalc(prevDelay) {
      return Math.min(prevDelay * 2, 100);
    }
    var delay = 10;
    var minTimeForNext = Date.now();
    function never(cb) {
      assert(Date.now() > minTimeForNext);
      assert(Date.now() < maxTimeForNext);
      minTimeForNext = Date.now() + delay;
      maxTimeForNExt = minTimeForNext + 100;
      delay = delayCalc(delay);
      cb('nope');
    }
    nag({ wait: 10, attempts: 7, backoff: { multiplier: 2, maximum: 100 } }, never,
        function() {
          done();
        });
  });

  it("has at least one working helper", function(done) {
    var attempts = 0;
    function okThenJeez(cb) {
      attempts += 1;
      if (attempts > 30)
        return cb();
      cb('no');
    }
    nag.rabid(okThenJeez, done);
  });

  it("respects the canRetry setting", function(done) {
    function nonono(cb) {
      throw new Error("blaaargh");
    }
    function isThisRecoverable(err) {
      return !(err instanceof Error);
    }
    nag.rabid({ canRetry: isThisRecoverable }, nonono, function(err) {
      done();
    });
  });
});
