
module.exports = function(grunt) {

	var _jshintrc_options = grunt.file.readJSON("src/.jshintrc");

	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),

		concat: {

			options: {
				separator: ''
			},

			html: {
				src:  [ "src/core.js", "src/codec/BitON.js", "src/codec/JSON.js", "src/io/Client.js", "src/io/Service.js" ],
				dest: "build/html/RESTsocket.io.js"
			},

			node: {
				src:  [ "src/core.js", "src/codec/BitON.js", "src/codec/JSON.js", "src/io/Remote.js", "src/io/Server.js", "src/io/Service.js" ],
				dest: "build/node/RESTsocket.io.js"
			},

			example: {
				src:  [ "build/html/RESTsocket.io.js" ],
				dest: "example/public/RESTsocket.io.js"
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
				src:     "dist/restsocket.io.js",
				options: _jshintrc_options
			}
		},
*/

		uglify: {

			all: {

				files: {
					"./build/html/RESTsocket.io.min.js": [ "./build/html/RESTsocket.io.js" ],
					"./build/node/RESTsocket.io.min.js": [ "./build/node/RESTsocket.io.js" ]
				},

				options: {
					preserveComments: false,
					sourceMap:        false,
					report:           "min",
					banner: "/*! RESTsocket.IO v<%= pkg.version %>          *\n" +
							" *  distributed under MIT License *\n" +
							" *  (c) 2014 LazerUnicorns Ltd.   */\n\n",
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

	grunt.registerTask("default", [ "concat:html", "concat:node", "concat:example", "uglify" ]);

};

