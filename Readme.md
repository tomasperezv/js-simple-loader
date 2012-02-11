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
