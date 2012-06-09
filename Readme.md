About
=============
A simple asynchronous loader(CSS + JS) and AJAX engine.

Usage
------------
loader.js is the only static file which is required in the initial html structure, loaded by a script tag. The rest of static files will be loaded by the loader using the loadDefinition.json file. 

Example of a loadDefinition.json file:

	[
		"./js/test1.js",
		"./js/test2.js",
		"./css/base.css"
	]

If you don't want to perform the request required to load the definition file, you can pass it directly to the loader.

	Loader.setDefinition(["./js/test1.js", "./css/base.css"]);

The loadFiles function will download the resources and execute a callback once everything is ready.

	Loader.loadFiles(function() {
		// Everything has been loaded, we can initialize our web application.
	});

Author
----------
Tomas Perez - tom@0x101.com
http://www.tomasperez.com

License
-----------
Public Domain

No warranty expressed or implied. Use at your own risk.
