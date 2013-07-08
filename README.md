# Nag

Nag is a small utility to handle automatic retries of an asynchronous operation.

It can:

* Wait a specified amount of time between each attempt.
* Retry a maximum number of times before giving up.
* Wait longer between each attempt (exponential backoff).

There are multiple similar modules out there, but this one strives to be less verbose
to invoke for the most common use cases.  Also, I really wanted to write one.

Module is a callable function.

## Example

```javascript
var nag = require('nag');
var net = require('net');

function checkRedisUp(next) {
  net.connect(6379); // will throw exception if not responding
  next();
};

child_process.spawn('redis-server');

nag(checkRedisUp, function() {
  console.log("redis operational");
});
```

## `nag([config], poll, next)`

The `poll` function must accept a standard `callback(err, data)` function as its only
parameter.

Will repeatedly call `poll` until it gives a successful callback, in which it will
call `next(null, data)` where `data` is whatever data `poll` yielded in its callback.

If a maximum number of attempts has been exceeded, it will call `next(err)` where `err`
is the error object of the last failed `poll` call.

If `poll` throws an exception, it is treated the same as an error callback.  E.g. if
`poll` throws the exception `ex`, it is treated exactly as if `poll` called `callback(ex)`.

### Config format:

```javascript
{
  wait: <default: 1000, number of miliseconds to wait between each attempt>,
  attempts: <default: infinite, number of attempts before giving up>,
  backoff: undefined <default - wait time is kept constant>
        || { multiplier: <default: 2, multiply wait time by this after each attempt>,
             maximum: <default: 60000, wait time will not exceed this> }
        || <multiplier - shorthand for above format>
        || <function taking current wait value and returning next wait value>,
  canRetry: undefined <default - all errors are retryable>
         || <function taking poll() error and returning whether it makes sense to retry>
}
```

## Preconfigured variants:

Some variants of `nag()` with different default behavior have been provided for convenience.
Arguments and config format are same as for `nag()`.

* `nag.backoff` - Waits 1 second after first attempt, 2 seconds after second, then 4 seconds, 8 seconds, and so on until a maximum of 60 seconds.
* `nag.minute` - Retries every minute.
* `nag.rabid` - Retries *immediately* after a failure (0 miliseconds between each attempt).
* `nag.burst` - 10 miliseconds between each attempt.  Gives up after 1000 failures.
* `nag.patient` - Waits 1 minute after first failure, and adds 50% to the wait time after each failure.  Max wait time is 1 hour.

## License

[MIT](http://opensource.org/licenses/MIT).  See file `LICENSE` for details.
