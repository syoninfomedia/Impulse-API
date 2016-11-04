module.exports = function(server) {
  // Install a `/` route that returns server status
  var router = server.loopback.Router();
  router.get('/', server.loopback.status());


  //verified
  router.get('/verified', function(req, res) {
    res.sendFile(req.app.get('views')+"/verified.html")
  });

  //show password reset form
  router.get('/reset-password', function(req, res, next) {
    if (!req.query || !req.query.access_token) {
      return res.sendStatus(401);
    }
    res.render('password-reset', {
      access_token: req.query.access_token
    });
  });

  //reset the user's pasword
  router.post('/reset-password', function(req, res, next) {
    if (!req.accessToken) return res.sendStatus(401);

    //verify passwords match
    if (!req.body.password ||
      !req.body.confirmation ||
      req.body.password !== req.body.confirmation) {
      return res.sendStatus(400, new Error('Passwords do not match'));
    }

    User.findById(req.accessToken.userId, function(err, user) {
      if (err) return res.sendStatus(404);
      user.updateAttribute('password', req.body.password, function(err, user) {
        if (err) return res.sendStatus(404);
        console.log('> password reset processed successfully');
        res.render('response', {
          title: 'Password reset success',
          content: 'Your password has been reset successfully',
          redirectTo: '/',
          redirectToLinkText: 'Log in'
        });
      });
    });
  });
  server.use(router);
};
