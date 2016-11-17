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
  User.afterRemote('create', function(context, member, next) {
 /*   var options = {
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
    });*/

    context.req.app.models.User.generateVerificationToken(member, function (err, token) {
      if (err) {
        return next(err);
      }

      member.verificationToken = token;
      member.save(function (err) {
        if (err) {
          next(err);
        }
        else {
          var verifyUrl = 'http://' + config.host + ':' + config.port + '/api/members/confirm?uid=' + member.id + '&redirect=/verified&token=' + token;

          async.waterfall([
            // find email template
            function (cbk) {
              var EmailTemplateModel = User.app.models.EmailTemplate;
              EmailTemplateModel.findOne({where:{slug:'SIGNUP', lang:'en-us'}}, function(err, template) {
                if (err) {
                  return cbk(err, null);
                }
                else {
                  return cbk(null, template);
                }
              });
            },
            // we send email to user regarding his registration and new password
            // we don't care if we fail at that point
            function (template, cbk) {
              if (template && template.id) {
                var options = {
                  to: member.email,
                  from: 'syon.virendra@gmail.com',
                  subject: template.subject || '',
                  text: template.description || '',
                  html: common.replaceEmailTemplateKeys(_.extend(member, {verifyUrl: verifyUrl}), template.description)
                };
                User.app.models.Email.send(options, function(err, mail) {
                  if (err) {
                    return cbk(err, mail);
                  }
                  else {
                    return cbk(null, mail);
                  }
                });
              }
              else {
                return cbk(null, null);
              }
            }
          ], function(err, user){
            if (err) {
              return next(err);
            }
            return next();
          });
        }
      });
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
    var SocialUserModel = User.app.models.SocialUser;
    assert(data && data.social_id, 'Social id is not supplied');
    // if email is supplied
    // then save the user if not already and make him login
    if (data.email) {
      User.findOne({where:{email:data.email.trim()}}, function(err, user){
        if (err) {
          return cb(err);
        }
        if (!user) {
          _.extend(userObj, data);
          // then user does not exists in our database save him
          if (data.hasOwnProperty('emailVerified'))
          userObj.emailVerified = data.emailVerified;
          else
          userObj.emailVerified = true;
          //trick is we don't know user password so we generate it
          userObj.password = '11@'+data.email.substring(0, data.email.indexOf('@'))+'CRC';
          // TODO : make sure you change this line because username must be unique
          userObj.username = data.name;
          //userObj.username = data.username || '11@'+data.email.substring(0, data.email.indexOf('@'))+'CRC';
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
              assert(user.emailVerified, 'login failed as the email has not been verified');
              user.createAccessToken(86400, function(err, res) {
                if (err) return cb(err);
                if (res.id) {
                  try {
                    res.accessToken = res.id;
                    delete res.id;
                  } catch (e) {
                    // nothing to handle
                  }
                }
                return cb(null, _.extend(_.extend(res, user), {type:'register'}));
              });
            }
            else {
              return cb(err, null);
            }
          });

        }
        // just make him login
        else {
          // through access token out of user
          assert(user && user.id, 'Could not login');
          if (user && user.id) {
            assert(user.emailVerified, 'login failed as the email has not been verified');
            user.createAccessToken(86400, function(err, res) {
              if (err) return cb(err);
              if (res.id) {
                try {
                  res.accessToken = res.id;
                  delete res.id;
                } catch (e) {
                  // nothing to handle
                }
              }
              return cb(null, _.extend(_.extend(res, user), {type:'login'}));
            });
          }
        }
      });
    }
    // save him into social table if not already
    // then try to search him in user table if not then ask for email again
    // else make him login
    else if (data.social_id) {
      async.parallel([
        // if the user in social table
        function(cbk) {
          SocialUserModel.findOne({where:{social_id:data.social_id}},cbk);
        },
        function(cbk) {
          User.findOne({where:{social_id:data.social_id}},cbk);
        }
      ], function (err, userSavedState) {
        if (err) {
          return cb(err);
        }
        var isSocialSaved = userSavedState && userSavedState[0] ? userSavedState[0] : null;
        var isUserSaved = userSavedState && userSavedState[1] ? userSavedState[1] : null;
        // if user is not saved in social table
        if (!isSocialSaved) {
          var socialObj = {
            social_id:data.social_id,
            response:data
          };
          SocialUserModel.create(socialObj, function(err, response) {
            if (err) return cb (err, null);
            return cb (null,_.extend(response.response, {type:'register'}));
          });
        }
        else if(isUserSaved && isUserSaved.id) {
          assert(isUserSaved.emailVerified, 'login failed as the email has not been verified');
          isUserSaved.createAccessToken(86400, function(err, res) {
            if (err) return cb(err);
            if (res.id) {
              try {
                res.accessToken = res.id;
                delete res.id;
              } catch (e) {
                // nothing to handle
              }
            }
            return cb(null, _.extend(_.extend(res, isUserSaved),{type:'login'}));
          });
        }
        else {
          return cb(null,null);
        }
      });
    }
    else {
      cb (null, {});
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
