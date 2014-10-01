
module.exports = function(grunt) {

	var _jshintrc_options = grunt.file.readJSON("src/.jshintrc");

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		build: {
			options: {
				separator: ';'
			},
			html: {
				src:  [ "src/core.js", "src/Client.js", "src/Service.js" ],
				dest: "build/html/<%= pkg.name %>.js"
			},
			node: {
				src:  [ "src/core.js", "src/Remote.js", "src/Server.js", "src/Service.js" ],
				dest: "build/node/<%= pkg.name %>.js"
			}
		},
/*
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
				src:     "dist/resocket.io.js",
				options: _jshintrc_options
			}
		},
*/

		uglify: {
			all: {
				files: {
					"./build/html/resocket.io.min.js": [ "./build/html/resocket.io.js" ],
					"./build/node/resocket.io.min.js": [ "./build/node/resocket.io.js" ]
				},
				options: {
					preserveComments: false,
					sourceMap:        false,
					report:           "min",
					banner: "/*! RESocket.IO v<%= pkg.version %> | " +
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

// TODO: integrate jshint
	grunt.registerTask("default", [ "build:html", "build:node" ]);
	// grunt.registerTask("default", [ "build:html", "build:node", "uglify:html", "uglify:node" ]);

};

