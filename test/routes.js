'use strict';

var expect = require('chai').expect;
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var request = require('supertest');

var setup = require('./setup');

describe('routes', function() {
  var app, conn, User, Comment;

  beforeEach(function(done) {
    var ret = setup(done);
    app = ret.app;
    conn = ret.conn;
    User = ret.User;
    Comment = ret.Comment;
  });

  afterEach(function(done) {
    conn.db.dropDatabase(function(err) {
      done(err);
    });
  });

  describe('create', function() {
    it('should create a document', function(done) {
      User.id = 'name';
      request(app).post('/users')
        .send({
          name: 'Asdflol',
          hobby: 'Baseball'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.id).to.equal('Asdflol');
          expect(res.body.name).to.equal('Asdflol');
          done();
        });
    });

    it('should 409 if the document already exists', function(done) {
      User.id = 'name';
      request(app).post('/users')
        .send({
          name: 'Bob',
          hobby: 'Soccer'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(409);
          expect(res.body.message).to.match(/User already exists/);
          done();
        });
    });

    it('should create a subdocument', function(done) {
      User.id = 'name';
      request(app).post('/users/Bob/comments')
        .send({
          content: 'Test',
          reaction: 'asdf'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.content).to.equal('Test');
          User.model.findOne({
            name: 'Bob'
          }).exec(function(err, bob) {
            expect(res.body.author).to.equal(bob._id.toString());
            done();
          });
        });
    });

    it('should 409 if the subdocument already exists', function(done) {
      User.id = 'name';
      request(app).post('/users/Bob/comments')
        .send({
          content: 'exists',
          reaction: 'BobL'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(409);
          expect(res.body.message).to.match(/Comment already exists/);
          done();
        });
    });

    it('should have used appropriate middlewares', function(done) {
      User.id = 'name';
      request(app).post('/users')
        .send({
          content: 'exists',
          reaction: 'BobL'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.header['middleware-all']).to.equal('true');
          expect(res.header['middleware-query']).to.be.undefined;
          expect(res.header['middleware-create']).to.equal('true');
          expect(res.header['middleware-get']).to.be.undefined;
          expect(res.header['middleware-update']).to.be.undefined;
          expect(res.header['middleware-destroy']).to.be.undefined;
          done();
        });
    });
  });

  describe('get', function() {
    it('should get a document by id', function(done) {
      User.id = 'name';
      request(app).get('/users/Bob')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.name).to.equal('Bob');
          done();
        });
    });

    it('should 404 if the document was not found', function(done) {
      User.id = 'name';
      request(app).get('/users/DNE')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/User "DNE" not found/);
          done();
        });
    });

    it('should get a subdocument by id', function(done) {
      User.id = 'name';
      Comment.id = 'reaction';
      request(app).get('/users/Bob/comments/BobL')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.content).to.equal('Lol');
          expect(res.body.reaction).to.equal('BobL');
          User.model.findOne({
            name: 'Bob'
          }).exec(function(err, bob) {
            expect(res.body.author).to.equal(bob._id.toString());
            done();
          });
        });
    });

    it('should 404 if the subdocument was not found', function(done) {
      User.id = 'name';
      request(app).get('/users/Bob/comments/DNE')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/Comment "DNE" not found/);
          done();
        });
    });

    it('should have used appropriate middlewares', function(done) {
      User.id = 'name';
      request(app).get('/users/Bob')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.header['middleware-all']).to.equal('true');
          expect(res.header['middleware-query']).to.be.undefined;
          expect(res.header['middleware-create']).to.be.undefined;
          expect(res.header['middleware-get']).to.equal('true');
          expect(res.header['middleware-update']).to.be.undefined;
          expect(res.header['middleware-destroy']).to.be.undefined;
          done();
        });
    });

    describe('populate', function() {
      it('should not populate a restricted field', function(done) {
        User.restricted.push('contacts');
        request(app).get('/users/Bob')
          .query({
            populate: 'contacts  '
          })
          .end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(401);
            expect(res.body.message).to.match(/Cannot populate restricted field/);
            done();
          });
      });

      it('should error if the field does not exist', function(done) {
        request(app).get('/users/Bob')
          .query({
            populate: 'dne'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(400);
            expect(res.body.message).to.match(/does not exist/);
            done();
          });
      });

      it('should populate a field', function(done) {
        request(app).get('/users/Bob')
          .query({
            populate: 'contacts'
          }).end(function(err, res) {
            expect(err).to.be.null;
            expect(res.status).to.equal(200);
            expect(res.body.contacts.length).to.equal(4);
            done();
          });
      });
    });
  });

  describe('update', function() {
    it('should change a field', function(done) {
      User.id = 'name';
      request(app).put('/users/Bob')
        .send({
          hobby: 'Basketball'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.hobby).to.equal('Basketball');
          done();
        });
    });

    it('should 404 if the document was not found', function(done) {
      User.id = 'name';
      request(app).put('/users/DNE')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/User "DNE" not found/);
          done();
        });
    });

    it('should change a subdocument field', function(done) {
      User.id = 'name';
      request(app).put('/users/Bob/comments/BobL')
        .send({
          content: 'Android BobL is op'
        })
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.content).to.equal('Android BobL is op');
          done();
        });
    });

    it('should 404 if the subdocument was not found', function(done) {
      User.id = 'name';
      request(app).put('/users/Bob/comments/DNE')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/Comment "DNE" not found/);
          done();
        });
    });

    it('should have used appropriate middlewares', function(done) {
      User.id = 'name';
      request(app).put('/users/Bob')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.header['middleware-all']).to.equal('true');
          expect(res.header['middleware-query']).to.be.undefined;
          expect(res.header['middleware-create']).to.be.undefined;
          expect(res.header['middleware-get']).to.be.undefined;
          expect(res.header['middleware-update']).to.equal('true');
          expect(res.header['middleware-destroy']).to.be.undefined;
          done();
        });
    });
  });

  describe('destroy', function() {
    it('should delete the document', function(done) {
      User.id = 'name';
      request(app).delete('/users/Bob')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.success).to.be.true;
          User.model.findOne({
            name: 'Bob'
          }).exec(function(err, doc) {
            expect(doc).to.be.null;
            done();
          });
        });
    });

    it('should 404 if the document was not found', function(done) {
      User.id = 'name';
      request(app).delete('/users/DNE')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/User "DNE" not found/);
          done();
        });
    });

    it('should delete the subdocument', function(done) {
      User.id = 'name';
      request(app).delete('/users/Bob/comments/BobL')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(200);
          expect(res.body.success).to.be.true;
          User.model.findOne({
            name: 'Bob'
          }).exec(function(err, bob) {
            Comment.model.findOne({
              author: bob,
              reaction: 'BobL'
            }).exec(function(err, doc) {
              expect(doc).to.be.null;
              done();
            });
          });
        });
    });

    it('should 404 if the subdocument was not found', function(done) {
      User.id = 'name';
      request(app).delete('/users/Bob/comments/X')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.status).to.equal(404);
          expect(res.body.message).to.match(/Comment "X" not found/);
          done();
        });
    });

    it('should have used appropriate middlewares', function(done) {
      User.id = 'name';
      request(app).delete('/users/Bob')
        .end(function(err, res) {
          expect(err).to.be.null;
          expect(res.header['middleware-all']).to.equal('true');
          expect(res.header['middleware-query']).to.be.undefined;
          expect(res.header['middleware-create']).to.be.undefined;
          expect(res.header['middleware-get']).to.be.undefined;
          expect(res.header['middleware-update']).to.be.undefined;
          expect(res.header['middleware-destroy']).to.equal('true');
          done();
        });
    });
  });
});
