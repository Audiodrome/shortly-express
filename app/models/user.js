var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimeStamps: true,
  // defaults: {
    
  // },

  // addUser: function() {
  //   this.on('creating', function(model, attrs, options) {
  //     //store hash in database when user created for the
  //     //first time ()

  //   });
  // }
  hashPassword: function(password, callback) {
    bcrypt.hash(password, null, null, function(err, hash) {
      if (err) {
        callback(err);
      }
      callback(null, hash);
    });
  }
});

module.exports = User;