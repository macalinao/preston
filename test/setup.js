"use strict";

var async = require('async');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');

var restifier = require('../lib/');

module.exports = function setup(done) {
  var conn = mongoose.createConnection('mongodb://localhost:27017/testdb');
  var User = conn.model('User', new mongoose.Schema({
    name: {
      type: String,
      unique: true,
      required: true
    },
    password: {
      type: String,
      restricted: true
    },
    hobby: String,
    comments: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Comment'
    }]
  }));
  var Comment = conn.model('Comment', new mongoose.Schema({
    content: String
  }));

  var app = express();

  app.use(require('body-parser').json());
  restifier.setup(app);

  var UserModel = restifier.model(User).serve(app);
  var CommentModel = restifier.model(Comment).serve(app);
  var server = http.createServer(app);
  server.listen(9999);

  var users = {};

  async.each(['Bob', 'Tim', 'Frank', 'Freddie', 'Asdf'], function(item, next) {
    var user = users[item] = new User({
      name: item,
      password: item + 1,
      hobby: (item === 'Tim') ? null : item + 'sledding'
    });

    // Add comments for each user
    async.each(['Lol this is funny', 'test', 'asdf'], function(item, next2) {
      var comment = new Comment({
        content: item
      });
      user.comments.push(comment);
      comment.save(next2);
    }, function() {
      user.save(next);
    });
  }, done);

  return {
    app: app,
    conn: conn,
    server: server,
    User: UserModel
  };
};
