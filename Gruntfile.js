
module.exports = function(grunt) {

	var _jshintrc_options = grunt.file.readJSON("src/.jshintrc");

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		concat: {
			options: {
				separator: ';'
			},
			dist: {
				src:  [ "src/**/*.js" ],
				dest: "dist/<%= pkg.name %>.js"
			}
		},

		jshint: {
			all: {
				src: [
					"src/*.js", "Gruntfile.js", "build/*.js"
				],
				options: {
					jshintrc: true
				}
			},
			dist: {
				src:     "dist/restsock.js",
				options: _jshintrc_options
			}
		},

		uglify: {
			all: {
				files: {
					"dist/restsock.min.js": [ "dist/restsock.js" ],
				},
				options: {
					preserveComments: false,
					sourceMap:        true,
					sourceMapName:    "dist/restsock.min.map",
					report:           "min",
					banner: "/*! RESTSock v<%= pkg.version %> | " +
							"(c) 2014 LazerUnicorns Ltd.      | ",
					compress: {
						hoist_funs: false,
						loops:      false,
						unused:     true
					}
				}
			}
		}

	});


	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-uglify");

	grunt.registerTask("default", [ "jshint", "concat", "uglify" ]);

};

