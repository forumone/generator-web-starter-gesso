'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  libxmljs = require("libxmljs"),
  request = require("request"),
  glob = Promise.promisify(require('glob')),
  http = require('http'),
  fs = require('fs'),
  Download = require('download');

var DRUPAL_GESSO_URL = "https://updates.drupal.org/release-history/gesso/all";

module.exports = generators.Base.extend({
  initializing : {
    version : function() {
      if(!this.options.parent) {
        //for test purposes 
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
      var that = this;
      if(this.options.parent.answers.platform === 'drupal') {
        request({url : DRUPAL_GESSO_URL}, function(error, response, body) {
          if (!error && response.statusCode === 200) {
            that.config.gessoDl = libxmljs.parseXml(body).get('//release/download_link').text();
          }
          else {
            console.log('ERROR unable to retrieve gesso version number from Drupal: ' + DRUPAL_GESSO_URL);
          }
        });
      }
      else if (this.options.parent.answers.platform === 'wordpress') {
        //TODO https://github.com/forumone/gesso-theme-wordpress
      }
    }
  },
  prompting : function() {
    var done = this.async();
    var that = this;
    that.prompt([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false,
    }], function (answers) {
      _.extend(that.config, answers);
      done();
    });
  },
  writing : {
    settings : function() {
      if(this.options.parent.answers.platform === 'drupal') {
        if(this.config.install_gesso) {
          // https://github.com/kevva/download
          new Download({extract: true}).get(this.config.gessoDl, 'public/themes/').dest('.').run();
        }
      }
      else if (this.options.parent.answers.platform === 'wordpress') {
        //TODO 
      }
    }
  }
});