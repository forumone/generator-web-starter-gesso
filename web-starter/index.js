'use strict';
var generators = require('yeoman-generator'), 
  _ = require('lodash'),
  Promise = require('bluebird'),
  rp = require('request-promise'),
  semver = require('semver'),
  libxmljs = require("libxmljs"),
  glob = Promise.promisify(require('glob')),
  http = require('http'),
  fs = require('fs'),
  ygp = require('yeoman-generator-bluebird');

var DRUPAL_GESSO_URL = "https://updates.drupal.org/release-history/gesso/all";

module.exports = generators.Base.extend({
  initializing : {
    async : function() {
      ygp(this);
    },
    version : function() {
      var done = this.async();
      
      if (!this.options.parent) {
        // for test purposes
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
      var that = this;
      
      if (this.options.parent.answers.platform === 'drupal') {
        rp({url : DRUPAL_GESSO_URL})
        .then(function(response) {
          that.config.gessoDl = libxmljs.parseXml(response).get('//release/download_link').text();
        })
        .finally(function() {
          done();
        });
      }
      else {
        done();
      }
    }
  },
  prompting : function() {
    var done = this.async();
    var that = this;
    var config = _.extend({
      install_pattern_lab : true,
    }, this.config.getAll());
    this.promptAsync([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab',
      message: 'Does this project use Pattern Lab?',
      default: config.install_pattern_lab,
    },
    {
      type: 'confirm',
      name: 'install_pattern_lab_confirm',
      message: 'Install a fresh copy of Pattern Lab?',
      default: false,
      when: function(answers) {
        // if the user doesn't want to install pattern lab, this question is not
        // asked
        return answers.install_pattern_lab;
      }
    }]).then(function (answers) {
      that.config.set(answers);
      _.extend(that.config, answers);
    })
    .finally(function() {
      done();
    });
  },
  configuring : {
    gruntPatternlab : function() {
      var done = this.async();
      
      if (this.config.install_pattern_lab) {
        if (typeof this.options.getPlugin === "function" && this.options.getPlugin('grunt')) {
          // Add copy task for Pattern Lab
          var copy = this.options.getPlugin('grunt').getGruntTask('copy');
          copy.insertConfig('copy.patternlabStyleguide', this.fs.read(this.templatePath('tasks/patternlab/copy.js')));
          copy.loadNpmTasks('grunt-contrib-copy');
          this.options.addDevDependency('grunt-contrib-copy', '^0.8.0');
          
          // Watch task for Pattern Lab
          var watch = this.options.getPlugin('grunt').getGruntTask('watch');
          watch.insertConfig('watch.patternlab', this.fs.read(this.templatePath('tasks/patternlab/watch.js')));
          watch.loadNpmTasks('grunt-contrib-watch');
          watch.loadNpmTasks('grunt-simple-watch');
          this.options.addDevDependency('grunt-contrib-watch', '^0.6.1');
          this.options.addDevDependency('grunt-simple-watch', '^0.1.2');
          
          // Shell task for Pattern Lab
          var shell = this.options.getPlugin('grunt').getGruntTask('shell');
          shell.insertConfig('shell.patternlab', this.fs.read(this.templatePath('tasks/patternlab/shell.js')));
          shell.loadNpmTasks('grunt-shell');
          this.options.addDevDependency('grunt-shell', '^1.1.2');
          
          done();
        }
      }
      else {
        done();
      }
    }
  },
  writing : {
    theme : function() {
      var done = this.async();
      var that = this;
      var url = null;
      
      switch (this.options.parent.answers.platform) {
        case 'wordpress':
          url = 'https://api.github.com/repos/forumone/gesso-theme-wordpress/tarball/master';
          break;
        
        case 'drupal':
          url = this.config.gessoDl;
          break;
      }
      if (url && this.config.install_pattern_lab_confirm) {
        this.remoteAsync(url)
        .bind({})
        .then(function(remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd : remote.cachePath });
        })
        .then(function(files) {
          var remotePath = this.remotePath;
          
          _.each(files, function(file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath(that.options.parent.answers.theme_path + '/' + file)
            );
          });
        })
        .finally(function() {
          done();
        });
      }
      else {
        done();
      }
    },
    patternLab : function() {
      var done = this.async();
      var that = this;
      
      if (this.config.install_pattern_lab_confirm) {
        this.remoteAsync('dcmouyard', 'patternlab-php-gesso', 'master')
        .bind({})
        .then(function(remote) {
          this.remotePath = remote.cachePath;
          return glob('**', { cwd : remote.cachePath });
        })
        .then(function(files) {
          var remotePath = this.remotePath;
          
          _.each(files, function(file) {
            that.fs.copy(
              remotePath + '/' + file,
              that.destinationPath(that.options.parent.answers.theme_path + '/pattern-lab/' + file)
            );
          });
        })
        .finally(function() {
          done();
        });
      }
      else {
        done();
      }
    }
  }
});