{
      gesso: {
        files : [{
          expand : true,
          cwd : '<%= pkg.themePath %>/sass/',
          src : [ '**/*.scss' ],
          dest : '<%= pkg.buildPath %>/css',
          ext : '.css'
        }],
        options : {
          sourceMap : true,
          outputStyle : 'nested',
          includePaths : [ 'bower_components' ],
          quiet : true
        }
      }
    }