var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName: 'users',
  hasTimeStamps: true,

  hashPassword: function(password, callback) {
    bcrypt.hash(password, null, null, function(err, hash) {
      if (err) {
        callback(err);
      }
      callback(null, hash);
    });
  },

  comparePassword: function(password, hash, callback) {
    bcrypt.compare(password, hash, function(err, result) {
      if (err) {
        callback(err);
      }
      callback(null, result);
    });
  }
});

module.exports = User;