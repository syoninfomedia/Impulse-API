module.exports = function(server) {
  var remotes = server.remotes();
/*
  var opts = remotes.options || {};
  opts.errorHandler = {
    'handler': function restErrorHandler(err, req, res, next) {
      if (err) {
        var error = new Error();
        error.status = 500;
        error.message = 'Something went wrong';
        return next(error);
      }
      next(null);
    }
  }
  remotes.options =  opts;*/

  // modify all returned values
  remotes.after('**', function (ctx, next) {
    if (ctx.result.type == 'login' || ctx.result.type == 'register') {
      ctx.result = {
        status : true,
        data: ctx.result,
        type: ctx.result.type
      };
    } else {
      ctx.result = {
        status : true,
        data: ctx.result
      };
    }

    next();
  });
};
