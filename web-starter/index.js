'use strict';

var generators = require('yeoman-generator');
var _ = require('lodash');
var Promise = require('bluebird');
var glob = Promise.promisify(require('glob'));
var pkg = require('../package.json');
var ygp = require('yeoman-generator-bluebird');

// TODO: Replace with const
var GESSO_DRUPAL_REPO = 'gesso';
var GESSO_BRANCH_DRUPAL_7 = '7.x-2.x';
var GESSO_BRANCH_DRUPAL_8 = '8.x-1.x';

var GESSO_WORDPRESS_REPO = 'gesso-wp';
var GESSO_BRANCH_WORDPRESS = 'master';

module.exports = generators.Base.extend({
  initializing: {
    async: function () {
      ygp(this);
      this.options.addDevDependency(pkg.name, '~' + pkg.version);
    },
    version: function () {
      if (!this.options.parent) {
        // for test purposes
        this.options.parent = {};
        this.options.parent.answers = {};
        this.options.parent.answers.platform = 'drupal';
      }
    },
  },
  prompting: function () {
    var that = this;

    return this.prompt([{
      type: 'confirm',
      name: 'install_gesso',
      message: 'Install a fresh copy of the gesso theme?',
      default: false,
    },
    ])
    .then(function (answers) {
      that.config.set(answers);

      // Expose the answers on the parent generator
      _.extend(that.options.parent.answers, { 'web-starter-gesso': answers });
    });
  },
  configuring: {
  },
  writing: {
    theme: function () {
      var that = this;
      var promise = Promise.resolve();

      if (this.config.get('install_gesso')) {
        switch (this.options.parent.answers.platform) {
          case 'wordpress':
            promise = this.remoteAsync('forumone', GESSO_WORDPRESS_REPO, GESSO_BRANCH_WORDPRESS);
            break;

          case 'drupal':
            promise = this.remoteAsync('forumone', GESSO_DRUPAL_REPO, GESSO_BRANCH_DRUPAL_7);
            break;

          case 'drupal8':
            promise = this.remoteAsync('forumone', GESSO_DRUPAL_REPO, GESSO_BRANCH_DRUPAL_8);
            break;

          default:
            break;
        }
      }

      var remotePath;

      return promise
      .then(function (remote) {
        if (remote) {
          remotePath = remote.cachePath;
          return glob('**', { cwd: remote.cachePath, dot: true });
        } else {
          return Promise.resolve([]);
        }
      })
      .then(function (files) {
        _.each(files, function (file) {
          that.fs.copy(
            remotePath + '/' + file,
            that.destinationPath(that.options.parent.answers.theme_path + '/' + file)
          );
        });
      });
    },
  },
});
