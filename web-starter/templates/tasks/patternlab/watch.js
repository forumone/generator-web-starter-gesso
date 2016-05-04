{
  files : [ '<%= pkg.themePath %>/pattern-lab/source/**/*' ],
  tasks : [ 'shell:patternlab' ],
  options : {
    livereload : true
  }
}