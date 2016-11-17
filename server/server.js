var loopback = require('loopback');
var boot = require('loopback-boot');

var app = module.exports = loopback();

app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    var baseUrl = app.get('url').replace(/\/$/, '');
    console.log('Web server listening at: %s', baseUrl);
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath;
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath);
    }
  });
};

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function(err) {
  if (err) throw err;

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start();
});


app.get('remoting').errorHandler = {
  handler: function(error, req, res, next) {
       // activate it default error handler
      //next();
        restErrorHandler(error, req, res, next,null);
      },
  disableStackTrace: true
};

// TODO : modifying header is not cool at all
function restErrorHandler(err, req, res, next, options) {
  var log = require('debug')('server:rest:errorHandler');
  var debug = require('debug')('strong-remoting:rest-adapter');
  options = options || {};
  if (typeof options.handler === 'function') {
    try {
      options.handler(err, req, res, defaultHandler);
    } catch (e) {
      defaultHandler(e);
    }
  } else {
    return defaultHandler();
  }

  function defaultHandler(handlerError) {
    if (handlerError) {
      // ensure errors that occurred during
      // the handler are reported
      err = handlerError;
    }
    if (typeof err === 'string') {
      err = new Error(err);
      err.status = err.statusCode = 500;
    }

    if (res.statusCode === undefined || res.statusCode < 400) {
      // TODO : modifying header is not cool at all
      //res.statusCode = err.statusCode || err.status || 500;
    }

    if (Array.isArray(err)) {
      var details = err.map(function(it) {
        var data = generateResponseError(it);
        delete data.statusCode;
        return data;
      });

      var msg = 'Failed with multiple errors, see `details` for more information.';
      err = new Error(msg);
      err.details = details;
    }
    var errorMessage = generateResponseError(err).message;
    try {
      var message = generateResponseError(err).message;
      if (message.indexOf(':') > -1 || message.indexOf('(') > -1) {
        message =  message.substring(message.indexOf(':')+1, message.indexOf('(') || message.indexOf('.')).split("`").join("").toLowerCase();
        if (message && message.length) {
          message = message.split(" ");
          message.forEach(function (v,k) {
            if (k!=0) {
              if (message[k-1] == message[k]) {
                message.splice(k ,1)
              }
            }
          });
          message = message.join(" ");
        }
      }
      errorMessage = message;
    } catch (e) {
      // nothing to handle
    }
    res.send({
      status : false,
      name: generateResponseError(err).name,
      message: errorMessage,
      statusCode: generateResponseError(err).statusCode
    });

    function generateResponseError(error) {
      debug('Error in %s %s: %s', req.method, req.url, error.stack);

      var data = {
        name: error.name,
        status: res.statusCode,
        message: error.message || 'An unknown error occurred',
      };

      for (var prop in error) {
        data[prop] = error[prop];
      }

      data.stack = error.stack;
      if (process.env.NODE_ENV === 'production' || options.disableStackTrace) {
        delete data.stack;
      }

      return data;
    }
  }
};
