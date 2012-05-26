/**
 * @author tom@0x101.com
 *
 * Implementation of the a basic asynchronous loader:
 * This is the only static file which should present in the initial html structure, loaded by a script tag.
 * The rest of static files will be loaded by the loader using the loadDefinition.json file.
 * 
 * Example of use:
 *
 * 		<script src="./js/loader.js"></script>
 *		<script type="text/javascript">
 * 			Loader.loadFiles(function() {
 *				// Everything has been loaded, we can initialize our web application.
 *			});
 * 		</script>
 *
 */

/**
 * The Ajax engine performs basic ajax operations. 
 */
var AjaxEngine = {

	STATE_LOADED: 4,
	GET: 'get', 
	POST: 'post',

	appUrl: '',
	xhrs: [],

	definition: null,
	definitionPath: null,

	/**
	 * Depending on the state of the xhr object we can know if it finished pending operations and
	 * reuse it in that case.
	 * @return XMLHttpRequest  
	 */
	getXHR: function() {

		var xhr = null,
		xhrQueue = this.xhrs,
		length = xhrQueue.length;
		
		for(var i = 0; i < length; i++) {
			if (xhrQueue[i].readyState === this.STATE_LOADED) {
				xhr = xhrQueue[i];
			}
		}

		if (xhr === null) {
			xhr = new XMLHttpRequest();
			this.xhrs.push(xhr);
		}
		
		return xhr;
	},

	open: function(method, url, params, onSuccess, onError) {

		var self = this,
			xhr = this.getXHR(),
			strParams = Utils.URLEncode(params),
			xdr = false;
		
		if (this.appUrl !== '') {
			url = this.appUrl + url;
		}

		try {
			xhr.open(method, url, true);	
		} catch (e) {
			if (window.XDomainRequest) {
				// Fallback to XDomainRequest
				xhr = new XDomainRequest();
				xdr = true;
				xhr.open(method, url, true);	
			}
		}

		if (xhr) {

			if (!xdr) {
				xhr.onreadystatechange = function() { 
					self.processResponse.call(this, onSuccess);
				};
				this.setRequestHeaders(xhr, method, strParams.length);
			} else {
				xhr.onload = function() {
					// The fallback to XDomainRequest only support JSON responses.
					onSuccess( JSON.parse(this.responseText) );
				};
			}

			xhr.send(strParams);

		}
	},

	setRequestHeaders: function(xhr, method, length) {
		if (method === this.POST) {
			xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
		}
	},

	processResponse: function(onSuccess) {
		if (this.readyState === AjaxEngine.STATE_LOADED) {
			switch(this.status) {
				case 200:
				case 202:
					if (typeof onSuccess !== 'undefined') {
						var contentType = this.getResponseHeader('content-type')||'';
						if (contentType.indexOf('text/html') >= 0) {
							var result = this.responseText;
						} else {
							var result = JSON.parse(this.responseText);
						}
						onSuccess(result);
					}
					break;

				default:
					if (typeof onError !== 'undefined') {
						onError(this);
					}
					break;
			}
		}
	},

	/**
	 * Simple post request to a given url. Return the results to the onSuccess
	 * callback (as an object).
	 *
	 * @param String url  
	 * @param Object params
	 * @param Function onSuccess
	 * @param Function onError
	 */
	post: function(url, params, onSuccess, onError) {
		this.open(this.POST, url, params, onSuccess, onError);
	},

	/**
	 * Simple get request to a given url. Return the results to the onSuccess
	 * callback (as an object).
	 *
	 * @param String url  
	 * @param Object params  
	 * @param Function onSuccess
	 * @param Function onError
	 */
	get: function(url, params, onSuccess, onError) {
		this.open(this.GET, url, params, onSuccess, onError);
	}

};

/**
 *  The loader object is in charge of loading the static files defined in the
 *  loadDefinition.json file. It uses Ajax requests and dynamic DOM creation of
 *  elements for injecting the loaded files, for avoiding blocking.
 *
 *  Stores a reference to the pending files to be loaded and when all of them
 *  are ready the onSuccess passed to the loadFiles function is executed.
 */
var Loader = {

	CSS: 'css',
	JS: 'js',
	MAIN_PATH: './js/',

	loadQueue: [],
	onSuccess: null,
	definitionPath: null,
	
	/**
	 * Load the files defined in the json and call to the callback function when
	 * everything is ready.
	 *
	 * @param Function onSuccess  
	 */
	loadFiles: function(onSuccess) {

		var self = this;

		if (this.definition == null) {
			// First load the file with the definition of the dependences
			AjaxEngine.get(this.getDefinitionPath(), {}, function(definition) {
				self.definition = definition;
				self._load(definition, onSuccess);
			});
		} else {
			this._load(this.definition, onSuccess);
		}

	},

	_load: function(files, onSuccess) {
		// Update the load queue and prepare the onSuccess callback
		this.loadQueue = this.getLoadQueue(files);
		this.onSuccess = onSuccess;

		var nFiles = files.length;
		for (var i = 0; i < nFiles; i++) {
			this.loadFile(files[i]);
		}
	},

	setDefinitionPath: function(definitionPath) {
		this.definitionPath = definitionPath;
	},

	setDefinition: function(definition) {
		this.definition = definition;
	},

	getDefinitionPath: function() {
		return this.definitionPath !== null ? this.definitionPath : this.MAIN_PATH + './loadDefinition.json'
	},

	/**
	 * Generates the queue in charge of storing the pending files to be loaded,
	 * receiving the array defined in the json definition.
	 *
	 * @param Array files  
	 */
	getLoadQueue: function(files) {

		var result = [];
		var counter = 0;
		var filename = '';

		var nFiles = files.length;
		for (var i = 0; i < nFiles; i++) {
			filename = files[i];
			if (this.getExtension(filename) === this.JS) {
				result[counter] = filename; 
				counter++;
			}
		}

		return result;
	},
	
	/**
	 * When one of the files is ready we can update the status of the queue, and
	 * check if is anything else pending, if not we will call to the callback.
	 *
	 * @param String file  
	 * @param Function callback
	 */
	updateQueueState: function(file, onSuccess) {

		var nFiles = this.loadQueue.length;
		var position = -1;

		for (var i = 0; i < nFiles; i++) {
			if (this.loadQueue[i] === file) {
				position = i;
				break;
			}
		}

		// Remove the file from the queue
		if (position !== -1) {

			this.loadQueue.splice(position, 1);

			if (this.loadQueue.length === 0) {
				onSuccess();
			}
		}
	},

	/**
	 * Append a dynamic DOM element to the header.
	 *
	 * @param HTMLDOMElement element  
	 */
	appendToHead: function(element) {
		if (document.getElementsByTagName('head').length > 0) {
			document.getElementsByTagName('head')[0].appendChild(element);
		}
	},

	/**
	 * Bind the callback for a dynamic script tag.
	 *
	 * @param HTMLDOMElement element  
	 * @param Function callback
	 */
	attachCallback: function(element, callback) {
		if (element.readyState) {
			element.onreadystatechange = function() {
				if (element.readyState === 'loaded' || element.readyState === 'complete') {
					element.onreadystatechange = null;
					callback();
				}
			}
		} else {
			element.onload = callback;
		}
	},

	/**
	 * Add dynamically a script element.
	 *
	 * @param String filename  
	 * @param Function callback
	 */
	loadJS: function(filename, callback) {

		var script = document.createElement('script');
		script.type = 'text/javascript';

		var self = this;
		this.attachCallback(script, function() {
			self.updateQueueState(filename, self.onSuccess);
		});

		script.src = filename;
		this.appendToHead(script);
	},

	/**
	 * Add a css dynamically.  
	 *
	 * @param String filename
	 * @param Function callback
	 */
	loadCSS: function(filename, callback) {

		var element = document.createElement('link')

		element.setAttribute('rel', 'stylesheet');
		element.setAttribute('type', 'text/css');
		element.setAttribute('href', filename);

		this.appendToHead(element);
	},

	/**
	 * @param String filename  
	 * @return String
	 */
	getExtension: function(filename) {
		return filename.split('.').pop().toLowerCase();
	},

	/**
	 * Create a dynamic element for injecting a css or js file in the DOM.  
	 */
	loadFile: function(filename) {

		var extension = this.getExtension(filename);

		switch (extension) {

			case this.CSS:
				this.loadCSS(filename);
				break;

			case this.JS:
				this.loadJS(filename);
				break;
		}
	}
};

var Utils = {
	/**
	 * URL-encode parameters passed as an object,
	 * e.g. params = {a: 'value'} => 'a=value'
	 * @param Object params
	 * @author tom@0x101.com  
	 */
	URLEncode: function(params, separator) {

		if (typeof separator === 'undefined') {
			var separator = '&';
		}

		var result = '';
		for (var key in params) {
			if (params.hasOwnProperty(key)) {
				result += key + '=' + params[key] + separator;
			}
		}

		// Remove the last '&' from the string
		return result.substr(0, result.length-1);
	}
};

/**
 * @author tom@0x101.com 
 * Basic JSON support for cross-browser compatibility
 */
var JSON = JSON || {}; 
JSON.parse = JSON.parse || function (strObject) {  

	if (strObject === "") {
		var strObject = '""';
	}

	eval("var result = " + strObject + ";");

	return result;
};  
