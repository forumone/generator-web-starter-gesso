{
      gesso : {
        files : (function(grunt) {
          var opts = grunt.file.readJSON(grunt.config.get('pkg').themePath + '/sass/sass-globbing.json');
          return Object.keys(opts).reduce(function(previous, current) {
            previous[grunt.config.get('pkg').themePath + '/sass/' + current] = grunt.config.get('pkg').themePath + '/sass/' + opts[current];
            return previous;
          }, {});
        })(grunt)
      }
    }