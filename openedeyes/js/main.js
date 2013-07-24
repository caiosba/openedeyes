var OpenedEyes = Class.create({

  initialize : function(config) {
    if (this.name == 'openedeyes') throw('This is an abstract class!');
		else {
		  this.checkConfiguration(config);
      this.install();
		}
	},

  run : function() {
		this.preLoad();
		if (this.config.useDefaultInterface) this.createInterface();
	  this.requestData();
  },

  prettyName : 'OpenedEyes Main Class',

	name : 'openedeyes', // This must be an unique identifier for this visualizer

  dependencies : {
	  js : [],  // It's not necessary to add the <name>.js
		css : []
	},

  root : function() {
    return document.getElementById('openedeyes_' + this.name).src.replace(this.name + '.js','');
	},

  install : function() {
    var vis = this;
		
		$A(this.dependencies.css).each(function(css) {
      $$('head')[0].insert(
				new Element('link',
					{ 'rel' : 'stylesheet',
					  'type' : 'text/css',
					  'href' : vis.root() + '../stylesheets/' + css + '.css'
					})
			);
		});

		var loaded = $A(this.dependencies.js).clone();
    $A(this.dependencies.js).each(function(js) {
      $$('head')[0].insert(
				new Element('script',
					{ 'type' : 'text/javascript',
					  'src' : vis.root() + js + '.js'
					}).observe('load', function() { loaded = loaded.without(js); })
			);
		});
		
    var waitForDependencies = function() {
      if (loaded.length > 0) setTimeout(function() { waitForDependencies(); }, 100);
			else vis.run();
		}

		waitForDependencies();

	},

  preLoad : function() {
	},

  postLoad : function() {
    if (typeof(this.config.callback) == 'function') this.config.callback(this);
	}

});

// Module "Data"
var tempData = null;
var JSONPCallback = function(returnedValue) {
	tempData = returnedValue;
}
var ieHack = new Array();
var ieSetTimeoutHack = function() {
	var scope = ieHack.pop();
	eval("scope.JSONPReady()");
}
OpenedEyes.addMethods({

  dataTable : [],

  dataHeader : {},

	JSONPReady : function() {
			var vis = this;
			if (tempData == null) {
				if (navigator.appVersion.indexOf("MSIE") > -1) {
					ieHack.push(vis);
					setTimeout(function() { ieSetTimeoutHack() }, 100);
				} else setTimeout(function(obj) { obj.JSONPReady(); }, 100, this);
			} else {
		 		vis.successRequest(tempData);
        tempData = null;
        $('jsonp').remove();
			}
	},

  requestData : function() {

		var vis = this;

    var params = ((this.config.addParams instanceof Function) ? this.config.addParams.call(vis) : this.config.addParams);

		// JSONP Request
		if (vis.config.requestPath.match(/^http:\/\//)) {
			if (!vis.config.requestPath.match(/\?/)) vis.config.requestPath += '?'
			else if (!vis.config.requestPath.match(/&$/)) vis.config.requestPath += '&';
			var src = vis.config.requestPath + 'callback=JSONPCallback';
			for (var p in params) {
				src += '&' + encodeURIComponent(p) + '=' + encodeURIComponent(params[p]);
			}
			var script = new Element('script', { 'src' : src, 'type' : 'text/javascript', 'id' : 'jsonp' });
			$$('head')[0].insert(script);
			vis.JSONPReady();
		}
		
		// Ajax Request
		else {
  	  new Ajax.Request(vis.config.requestPath, {
  	 		method : vis.config.requestMethod,
  	 		
		 		parameters : params,
  	 		
		 		asynchronous : false,
  	 		
		 		onCreate : function() {
				},
		 		
  	 		onException: function(request, exception) {
  	 			alert(vis.t('Javascript exception: ') + exception.message);
  	 		},

		 		onFailure : function() {
  	 			alert(vis.t('Error on request'));
  	 		},
  	 		
		 		onSuccess : function(transport) {
  	 			var data = transport.responseText.evalJSON();
		 			vis.successRequest(data);
  	 		},
  	 		
		 		onComplete : function() {
  	 		}

  	 	});
		}
  },

	successRequest : function(data) {
	  if (data.error) alert(this.t('An error happenned: ') + data.error);
		else if (this.checkData(data)) this.preprocessData(data);
		else alert(this.t('Your dataset does not seem to be well formed'));
	},

  checkData : function(data) {
	  return true;
	},

  preprocessData : function(data) {
	  var vis = this;
	  this.dataTable = data.values;
	  $A(data.header).each(function(field) { vis.dataHeader[field] = null; });
	  for (entity in this.dataTable) {
	    for (field in this.dataTable[entity]) {
	    	if (isNaN(this.dataTable[entity][field])) {
	    		if (this.dataHeader[field] === null) this.dataHeader[field] = [];
	    		if (this.dataHeader[field].indexOf(this.dataTable[entity][field]) == -1)
						this.dataHeader[field].push(this.dataTable[entity][field]);
	    	} else {
	    		if (this.dataHeader[field] === null) this.dataHeader[field] = 0;
	    		this.dataHeader[field] += this.dataTable[entity][field];
	    	}
	    }
	  }
		this.postLoad();
  }
		
});

// Module "Config"
OpenedEyes.addMethods({

  updateConfig : function(config) {
		for (var key in config)
			this.config[key] = config[key];
	},

  defaultConfig : {
	  'position' : [0,0], // Left, Top
    'size' : [300,300], // Width, Height
		'background' : '#eeeeee',
		'strokeColor' : '#000000',
		'strokeWidth' : 0,
		'lang' : 'en',
		'requestMethod' : 'post',
		'addParams' : {},
		'requestPath' : '/',
		'opacity' : 1,
		'container' : 'openedeyescont',
		'useDefaultInterface' : false,
		'initialState' : {}, // Dimension : Variable
    'callback' : null,
    'colors' : [
      '#9bbfe6', '#3465a4', '#274873',
      '#abda7e', '#6fb829', '#2a5900',
      '#fcbc5c', '#f57900', '#995119',
      '#ad7fa8', '#75507b', '#5c3566',
      '#ef2929', '#cc0000', '#7a0000'
    ]
	},

  config : {},

  mandatoryConfig : ['requestPath','container'],

  checkConfiguration : function(config) {
		var vis = this;
    var allDefaultConfig = $H(this.defaultConfig).merge(this.customConfig); 
    var allMandatoryConfig = this.mandatoryConfig.concat(this.customMandatoryConfig); 
		allDefaultConfig.each(function(pair) {
			var i = pair.key;
			if (allMandatoryConfig.indexOf(i) > -1 && !config[i]) alert(i + vis.t(' is mandatory!'));
		  if (config[i]) vis.config[i] = config[i];
			else vis.config[i] = pair.value;
		});
	}

});

// Module "Visualization"
OpenedEyes.addMethods({

  currentState : {},
  
	updateVis : function(state) {
		for (var key in state)
			this.currentState[key] = currentState[key];
  },

  // Receives a color or list of color. If it's a color, returns it;
  // if it's a list of colors, returns a linear gradiente composed by these colors in the given height
  parseColor : function(ctx, color, height) {
		// For Canvas
	  if (ctx instanceof CanvasRenderingContext2D) {
		  if (color instanceof Array) {
	    	var nc = color.length;
	    	var lg = ctx.createLinearGradient(0,0,0,height);
	    	var inc = 1/(nc-1);
	    	var pos = 0;
        for (var i=0; i < nc; i++) {
	    		lg.addColorStop(pos,color[i]);
	    		pos += inc;
	    	}
        return lg;
	    } 
      else return color;
		}
	  // For Raphael SVG
		else if (ctx.canvas) {
			if (color instanceof Array)	return '270-' + color.join('-');
			else return color;
		}
		// For external SVG file
		else if (ctx.toString() == '[object SVGDocument]') {
		  if (color instanceof Array) {
	      var ns = 'http://www.w3.org/2000/svg';
		    var defs = ctx.createElementNS(ns, 'defs');
				var grad = ctx.createElementNS(ns, 'linearGradient');
				var id = 'grad' + Math.floor(Math.random()*100000);
				grad.setAttribute('id', id);
				grad.setAttribute('x1','0%');
				grad.setAttribute('x2','0%');
				grad.setAttribute('y1','0%');
				grad.setAttribute('y2','100%');
				var step = 100 / (color.length - 1);
				var pos = 0;
				for(var i=0; i < color.length; i++) {
				  var stop = ctx.createElementNS(ns, 'stop');
					stop.setAttribute('offset', pos + '%');
					stop.setAttribute('style', 'stop-color:' + color[i] + ';stop-opacity:1');
					grad.appendChild(stop);
					pos += step;
				}
				defs.appendChild(grad);
				defs.__proto__.toString = function() { return 'url(#' + id + ')';	}
				return defs;
      } else return color;
		}
		// Other stuff
		else {
		  return color;
		}
  },

  createInterface : function() {
	},

	colors : function() {
    return this.config.colors;
	},
	
  varAt : function(dimension) {
		if (!this.currentState[dimension]) return null;
		return this.currentState[dimension];
  },

  getNumericValue : function(str) {
    return parseFloat(str.replace('px',''));
  }

});

// Module "Translation"
OpenedEyes.addMethods({

  t : function(str) {
		if (this.config.lang == 'en' || !this.config.lang ||
			 ((!this.defaultTranslations[this.config.lang] || !this.defaultTranslations[this.config.lang][str]) &&
				(!this.translations[this.config.lang] || !this.translations[this.config.lang][str])))
			return str;
		else return ((this.translations[this.config.lang] != undefined && this.translations[this.config.lang][str]) ? this.translations[this.config.lang][str] : this.defaultTranslations[this.config.lang][str]);
	},

  translations : {},

  defaultTranslations : {
    'pt-br' : {
			'Error on request' : 'Erro na requisição',
			' is mandatory!' : ' é obrigatório!',
		  'Javascript exception: ' : 'Exceção Javascript: ',
			'An error happenned: ' : 'Um error ocorreu: ',
			'Loading...' : 'Carregando...',
      'Your dataset does not seem to be well formed' : 'O seu conjunto de dados parece estar mal formado',
      'Your browser does not support Canvas!' : 'O seu navegador não suporta Canvas!'
		}
	}

});
