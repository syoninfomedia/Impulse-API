// Copyright IBM Corp. 2014,2015. All Rights Reserved.
// Node module: loopback-example-user-management
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

var config = require('../../server/config.json');
var common = require('../../server/common.js');
var path = require('path');
var _ = require('lodash');
var assert = require('assert');
var async = require('async');
module.exports = function(User) {
  /******************* VALIDATION ******************/
  User.validatesInclusionOf('user_type', { in: ['1', '2'] });
  User.validatesInclusionOf('status', { in: ['0', '1'] });
  /******************* VALIDATION ENDS******************/

  /*********************** HOOKS *******************/


  User.observe('before save', function (context, next) {
    var key = context.instance ? 'instance' : context.data ? 'data' : '';
    context[key].user_type = parseInt(context[key].coach_id) ? 2 : 1;
    next();
  });


  //send verification email after registration
  User.afterRemote('create', function(context, user, next) {
    var options = {
      type: 'email',
      to: user.email,
      from: 'noreply@loopback.com',
      subject: 'Thanks for registering.',
      template: path.resolve(__dirname, '../../server/views/verify.ejs'),
      redirect: '/verified',
      user: user
    };
    user.verify(options, function(err, response) {
      if (err) {
        User.deleteById(user.id);
        return next(err);
      }
      return next(null);
    });
  });

  //send password reset link when requested
  User.on('resetPasswordRequest', function(info) {
    var url = 'http://' + config.host + ':' + config.port + '/reset-password';
    var html = 'Click <a href="' + url + '?access_token=' +
        info.accessToken.id + '">here</a> to reset your password';

    User.app.models.Email.send({
      to: info.email,
      from: info.email,
      subject: 'Password reset',
      html: html
    }, function(err) {
      if (err) return console.log('> error sending password reset email');
      console.log('> sending password reset email to:', info.email);
    });
  });

  /*********************** HOOKS ENDS*******************/

  /*********************** Remote Methods*******************/
  User.socialLogin = function(data, cb) {
    // Create the access token and return the Token
    var userObj = {} //stores user data if not already registered
    assert(data && data.email && data.username, 'Insufficient Data');
    if (data && data.email) {
      User.findOne({where:{email:data.email.trim()}}, function(err, user){
        if (err) {
          return cb(err);
        }
        if (!user) {
          _.extend(userObj, data);
          // then user does not exists in our database save him
          userObj.emailVerified = true;
          //trick is we don't know user password so we generate it
          userObj.password = '11@'+data.email.substring(0, data.email.indexOf('@'))+'CRC';
        }
        if (userObj.email) {
          async.waterfall([
            // register user
            function (cbk) {
              User.create(userObj, function(err, user) {
                if (err) {
                  return cbk(err, null);
                }
                else {
                  return cbk(null, user);
                }
              });
            },
            // find email template
            // we don't care if we fail at that point
            function (user, cbk) {
              if (user && user.id) {
                var EmailTemplateModel = User.app.models.EmailTemplate;
                EmailTemplateModel.findOne({where:{slug:'SOCIALSIGNUP', lang:'en-us'}}, function(err, template) {
                  if (err) {
                    return cbk(err, user, null);
                  }
                  else {
                    return cbk(null, user, template);
                  }
                });
              }
              else {
                return cbk(null, user || null, null);
              }
            },
            // we send email to user regarding his registration and new password
            // we don't care if we fail at that point
            function (user, template, cbk) {
              if (user && user.id && template && template.id && user.email) {
                var options = {
                  to: user.email,
                  from: 'syon.virendra@gmail.com',
                  subject: template.subject || '',
                  text: template.description || '',
                  html: common.replaceEmailTemplateKeys(userObj, template.description)
                };
                User.app.models.Email.send(options, function(err, mail) {
                  if (err) {
                    return cbk(err, user);
                  }
                  else {
                    return cbk(null, user);
                  }
                });
              }
              else {
                return cbk(null, user || null);
              }
            }
          ], function(err, user){
            // through access token out of user
            if (user && user.id) {
              user.createAccessToken(86400, function(err, res) {
                if (err) return cb(err);
                return cb(null,res);
              });
            }
            else {
              return cb(err);
            }
          });

        }
        // just make him login
        else {
          // through access token out of user
          assert(user && user.id, 'Could not login');
          if (user && user.id) {
            user.createAccessToken(86400, function(err, res) {
              if (err) return cb(err);
              return cb(null,res);
            });
          }
        }
      })
    }
  };

  /*********************** Remote Methods Ends*******************/
  //Create a remote method to add program with schedules and exercises
  User.remoteMethod('socialLogin', {
    isStatic: true,
    http: {path: '/socialLogin', verb: 'post'},
    accepts: [
      {arg: 'data', type: 'object', http: {source: 'body'}, required: true, description:'An object of model property name/value pairs' }
    ],
    returns: {root: true, type: 'object'},
    description: 'Social login with facebook and instagram'
  });

};
