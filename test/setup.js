"use strict";

var async = require('async');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');

var restifier = require('../lib/');

module.exports = function setup(done) {
  var conn = mongoose.createConnection('mongodb://localhost:27017/testdb');
  var User = conn.model('User', new mongoose.Schema({
    name: String,
    password: {
      type: String,
      restricted: true
    }
  }));

  var app = express();

  var UserModel = restifier.model(User).serve(app);
  var server = http.createServer(app);
  server.listen(9999);

  async.each(['Bob', 'Tim', 'Frank', 'Freddie', 'Asdf'], function(item, next) {
    var user = new User({
      name: item,
      password: item + 1,
    });
    user.save(next);
  }, done);

  return {
    app: app,
    conn: conn,
    server: server,
    User: User,
    UserModel: UserModel
  };
};
