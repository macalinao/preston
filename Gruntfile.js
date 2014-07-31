module.exports = function(grunt) {
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-mocha-test');

  grunt.initConfig({
    mochaTest: {
      test: {
        options: {
          reporter: 'spec'
        },
        src: ['test/*.js']
      }
    },
    jsdoc: {
      dist: {
        src: ['README.md', 'lib/*.js', 'test/*.js'],
        options: {
          destination: 'docs',
          template: 'node_modules/ink-docstrap/template',
          configure: 'jsdoc.conf.json'
        }
      }
    }
  });

  grunt.registerTask('default', ['mochaTest', 'jsdoc']);
}
