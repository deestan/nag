var _ = require('underscore');

function nag(config, poll, next) {
  if (next === undefined) {
    next = poll;
    poll = config;
    config = {};
  }

  var attempts = 0;

  var wait = config.wait;
  if (wait === undefined)
    wait = 1000;

  var backoff = config.backoff;
  if (backoff && typeof backoff != 'function') {
    var givenBackoff = backoff;
    if (typeof givenBackoff == 'number')
      givenBackoff = { multiplier: givenBackoff };
    var multiplier = givenBackoff.multiplier;
    var maximum = givenBackoff.maximum || 1000 * 60 * 5;
    backoff = function(prevWait) {
      var wait = prevWait * multiplier;
      if (wait > maximum)
        return maximum;
      return wait;
    };
  }

  function doPoll() {
    attempts += 1;

    function failure(err) {
      if (config.canRetry && !config.canRetry(err))
        next(err);
        
      if (config.attempts && attempts >= config.attempts)
        return next(err);

      if (backoff)
        wait = backoff(wait);

      setTimeout(doPoll, wait);
    }

    try {
      poll(function(err, data) {
        if (!err) return next(err, data); // success
        failure(err);
      });
    } catch (ex) {
      failure(ex);
    }
  }
  
  doPoll();
}

function wrap(baseConfig) {
  return function nagWrapper(extraConfig, poll, next) {
    if (next === undefined) {
      next = poll;
      poll = extraConfig;
      extraConfig = {};
    };
    var config = _.extend(baseConfig, extraConfig);
    return nag(config, poll, next);
  };
}

// helpers
nag.backoff = wrap({ backoff: 2 });
nag.minute = wrap({ wait: 1000 * 60 });
nag.rabid = wrap({ wait: 0 });
nag.burst = wrap({ wait: 10, attempts: 1000 });
nag.patient = wrap({ wait: 1000 * 60,
                     backoff: { multiplier: 1.5, maximum: 1000 * 60 * 60 } });

module.exports = nag;
