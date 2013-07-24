// Abstract class
var Map = Class.create(OpenedEyes, {

  initialize: function($super, config) {
	  if (this.prettyName == 'Map') throw(this.t('This is an abstract class!'));
	  $super(config);
	},

  prettyName : 'Map',

	name : 'map',
 
	dependencies : {
	  js : [],
		css : ['map']
	},

  preLoad : function() {
    this.currentState = JSON.parse(JSON.stringify(this.config.initialState));
    $(this.config.container).insert(new Element('div', { 'id' : 'openedeyes-map-tooltip' }).hide());
  },

  postLoad : function() {
		if (this.currentState.regions == undefined) this.currentState.regions = $H(this.dataHeader).keys().first();
		if (this.currentState.bubbles == undefined) this.currentState.bubbles = $H(this.dataHeader).keys().first();
		this.renderMap();
	},

  renderMap : function() {
		var vis = this;
		var w = this.config.size[0];
		var h = this.config.size[1];
		$(this.config.container).setStyle({
			'left'     : this.config.position[0] + 'px',
			'top'      : this.config.position[1] + 'px',
			'width'    : w + 'px',
			'height'   : h + 'px',
			'position' : 'absolute'
		});

    // Create container
		var cont;
		switch(this.config.embedTag) {
			case 'iframe':
		    cont = new Element('iframe', {
		    	'id' : 'openedeyes-map',
		    	'width' : w,
		    	'height' : h,
		    	'src' : '../images/' + this.config.map + '.svg'
		    });
				break;
			case 'embed':
		    cont = new Element('embed', {
		    	'id' : 'openedeyes-map',
		    	'width' : w,
		    	'height' : h,
		    	'src' : '../images/' + this.config.map + '.svg',
					'type' : 'image/svg+xml' 
		    });
				break;
			case 'object':
		    cont = new Element('object', {
		    	'id' : 'openedeyes-map',
		    	'width' : w,
		    	'height' : h,
		    	'data' : '../images/' + this.config.map + '.svg',
					'type' : 'image/svg+xml' 
		    });
				break;
			default:
				alert(this.t('It is not an allowed value for the embed tag: ') + this.config.embedTag);
		}
		$(this.config.container).insert(cont);

		// Wait for SVG to load
		cont.observe('load', function() {
		  var svgDoc = (document.getElementById('openedeyes-map').contentDocument ? document.getElementById('openedeyes-map').contentDocument : document.getElementById('openedeyes-map').getSVGDocument());
			var svg = svgDoc.getElementById(vis.config.map);

		  // Scale map to fit into container
		  var svg_w = vis.origSVGWidth = svg.getAttribute('width');
		  var svg_h = vis.origSVGHeight = svg.getAttribute('height');
			var w_rel = w / svg_w;
			var h_rel = h / svg_h;
			var scale = ( (w_rel < h_rel) ? w_rel : h_rel );
			var g = svgDoc.getElementById('viewport');
			g.setAttribute('transform', 'scale(' + scale + ') ' + g.getAttribute('transform'));
			svg.setAttribute('width', w);
			svg.setAttribute('height', h);

		  // Set styles
	    var ns = 'http://www.w3.org/2000/svg';
		  var style = svgDoc.createElementNS(ns, 'style');
		  style.setAttributeNS(ns, 'type', 'text/css');
		  var rules = svgDoc.createTextNode('.region { fill: ' + vis.config.defaultRegionColor + '; stroke-width: ' + vis.config.strokeWidth + '; stroke: ' + vis.config.strokeColor + ' } .region:hover { fill: ' + vis.config.defaultRegionHoverColor + '; stroke: ' + vis.config.strokeHoverColor + ' }');
		  style.appendChild(rules);
      svg.appendChild(style);

      // Create background if necessary
			if (vis.config.background != 'transparent') {
				var bg = svgDoc.createElementNS(ns, 'rect');
				var bgColor = vis.parseColor(svgDoc, vis.config.background, h);
				bg.setAttribute('width', w);
				bg.setAttribute('height', h);
				bg.setAttribute('x', 0);
				bg.setAttribute('y', 0);
				bg.setAttribute('style', 'z-index: -1');
				bg.setAttribute('fill', bgColor);
				if (vis.config.background instanceof Array) svg.appendChild(bgColor);
				svg.insertBefore(bg, svgDoc.getElementById('viewport'));
			}

			// Show region name on mouse over
			if (vis.config.showLabels) {
			  var regions =	svgDoc.getElementsByClassName('region');
				for (var i=0; i < regions.length; i++) {
          regions[i].onmouseover = function(e) {
            $('openedeyes-map-tooltip').update(this.getAttribute('rel'));
            $('openedeyes-map-tooltip').setStyle({ 'left' : e.clientX + 'px', 'top' : e.clientY + 'px' });
            $('openedeyes-map-tooltip').show();
					}
          regions[i].onmouseout = function(e) {
            if ($('openedeyes-map-tooltip')) $('openedeyes-map-tooltip').hide();
					}
				}
			}

			// Call paint method
			vis.fillMap();
		});

	},

  minAndMaxValues : function(field) {
		var min = Infinity;
		var max = 0;
    for (var x in this.dataTable) {
		  var value = this.dataTable[x][field];
			if (value < min && value > 0) min = value;
			if (value > max) max = value;
		}
		return { 'min' : min, 'max' : max };
	},

  minValue : function(field) {
		return this.minAndMaxValues(field).min;
	},

  maxValue : function(field) {
		return this.minAndMaxValues(field).max;
	},

  firstRun : true,

  animateAttribute : function(svgDoc, svgEl, attr, newVal) {
		// SMIL
		/*
	  var ns = 'http://www.w3.org/2000/svg';
		var anim = svgDoc.createElementNS(ns, 'animate');
		anim.setAttribute('attributeName', attr);
		anim.setAttribute('attributeType', 'XML');
		anim.setAttribute('begin', '0s');
		anim.setAttribute('dur', '6s');
		anim.setAttribute('fill', 'freeze');
		anim.setAttribute('from', parseFloat(svgEl.getAttribute(attr)));
		anim.setAttribute('to', newVal);
    svgEl.appendChild(anim);
    */

		// Javascript-only
		var steps = 20;
		var oldVal = parseFloat(svgEl.getAttribute(attr));
		var step = (newVal - oldVal) / steps;
		var i = oldVal;
		var j = 0;
    var timer = window.setInterval(function() {
			i += step;
      svgEl.setAttribute(attr, i);
			j++;
		  if (j == steps) clearInterval(timer);
    }, 75);
	},

  translations : {
	  'pt-br' : {
      'It is not an allowed value for the embed tag: ' : 'Não é um valor válido para a tag de embed: ',
      'Is not a valid value for the range option: ' : 'Não é um valor válido para a opção range: ',
      'Do not use this dimension' : 'Não utilizar esta dimensão',
			'Bubbles' : 'Bolhas',
      'Could not identify region: ' : 'Não foi possível identificar a região: ',
      'This is an abstract class!' : 'Esta é uma classe abstrata!'
		}
  },

  customMandatoryConfig : ['map'],

  customConfig : {
    'defaultRegionColor' : '#ccc',
    'defaultRegionHoverColor' : '#eee',
		'strokeHoverColor' : '#000',
		'map' : '',
		'embedTag' : 'iframe',
		'background' : 'transparent',
		'range' : 'log10',
		'rangeLength' : 6,
		'showLegend' : false,
		'pointSize' : 1,
		'arcWidth' : 1,
		'arcColor' : '#000',
		'removeFromBalloon' : [],
		'showLabels' : false,
		'filter' : null
  },

  updateVis : function(state) {
		for (var field in state)
			this.currentState[field] = state[field];
		this.fillMap();
  }

});

// Choropleth map
var choroplethMap = Class.create(Map, {

  initialize: function($super, config) {
	  $super(config);
	},

  prettyName : 'Choropleth Map',

  range : [],

  logRange : function(base) {
		if (!base) base = 10;
		range = [];
		var min = this.minValue(this.varAt('regions'));
		var max = this.maxValue(this.varAt('regions'));
		var last = Math.pow(base, String(Math.floor(min)).length);
		range.push(last);
    while(last < max) {
			range.push(last * base);
			last *= base;
		}
		return range;
	},

	linearRange : function() {
		range = [];
		var min = this.minValue(this.varAt('regions'));
		var max = this.maxValue(this.varAt('regions'));
		var step = Math.ceil((Math.ceil(max) - Math.floor(min)) / this.config.rangeLength);
		for (var i=0; i < this.config.rangeLength; i++) {
			var value = Math.ceil(min) + (step * (i+1));
			if (value > $A(range).last() || range.length == 0) range.push(value);
		}
		return range;
	},

  showBalloon : function(trigger, e, dim) {
		if (this.config.useDefaultInterface && this.varAt(dim)) {
		  var vis = this;
      var id = trigger.getAttribute('id').replace('ref-','');
      $('openedeyes-map-balloon-title').update(trigger.getAttribute('rel'));
      $('openedeyes-map-balloon-value').update(vis.dataTable[id][vis.varAt(dim)]);
      $('openedeyes-map-balloon-flag').writeAttribute({ 'src' : vis.root() + '../images/' + vis.config.map + '/' + id + '.png' });
      $('openedeyes-map-balloon').setStyle({ 'left' : (e.clientX - vis.config.position[0] + 35) + 'px', 'top' : (e.clientY - vis.config.position[1] - 35) + 'px' });
      $('openedeyes-map-balloon').show();
		}
	},

  fillMap : function() {
		var svgDoc = (document.getElementById('openedeyes-map').contentDocument ? document.getElementById('openedeyes-map').contentDocument : document.getElementById('openedeyes-map').getSVGDocument());
	  var svg = svgDoc.getElementById(this.config.map);
    var vis = this;

    // Calculate range
		if (!this.varAt('regions')) {
			this.range = [];
		} else if (/^log[0-9]+$/.test(this.config.range)) {
			var base = this.config.range.match(/^log([0-9]+)$/)[1];
			this.range = this.logRange(base);
		} else if (this.config.range == 'linear') {
			this.range = this.linearRange();
		} else if (this.config.range instanceof Function) {
			this.range = this.config.range();
		} else alert(this.t('Is not a valid value for the range option: ') + this.config.range);
		
	  // Create balloon
		if (this.config.useDefaultInterface) {
			if (this.varAt('regions') || this.varAt('bubbles')) {
        if ($('openedeyes-map-balloon')) $('openedeyes-map-balloon').remove();
        var balloon = '<div id="openedeyes-map-balloon">' +
		      '<h3 id="openedeyes-map-balloon-title">&nbsp;</h3>' +
			  	'<p><span id="openedeyes-map-balloon-value"></span></p>' +
		    	'<small><img src="" alt="" id="openedeyes-map-balloon-flag" /></small>';
        $(this.config.container).insert(balloon);
			  $('openedeyes-map-balloon').hide();
			} else if (!this.varAt('regions') && !this.varAt('bubbles') && $('openedeyes-map-balloon')) $('openedeyes-map-balloon').remove();
		}
		
		// Iterate through each record
    for (var x in this.dataTable) {
			var color = this.config.defaultRegionColor;

			// Paint regions
			if (this.varAt('regions')) {
			  var value = this.dataTable[x][this.varAt('regions')];
				if (value > 0) {
			    var i = 0;
          while (value > this.range[i] && i < this.range.length) i++;
			    color = this.colors()[i % this.colors().length];
				  if (svgDoc.getElementById(x)) {
			      svgDoc.getElementById(x).onmouseover = function(e) {
				    	vis.showBalloon(this, e, 'regions');
			      }
			      svgDoc.getElementById(x).onmouseout = function() {
			        if ($('openedeyes-map-balloon')) $('openedeyes-map-balloon').hide();
				    }
				  } else alert(this.t('Could not identify region: ') + x);
				}
			}
			svgDoc.getElementById(x).setAttribute('style', 'fill: ' + color);

      // Show bubbles
			if (this.varAt('bubbles') && this.dataTable[x][this.varAt('bubbles')] > 0) {
	      var ns = 'http://www.w3.org/2000/svg';
				var dim = this.varAt('bubbles');
				var ref = ((this.config.size[0] < this.config.size[1]) ? this.config.size[0] : this.config.size[1]);
        var r = (Math.sqrt((Math.pow(ref,2) * this.dataTable[x][dim]) / this.dataHeader[dim]) / 2);
				var bbox = svgDoc.getElementById(x).getBBox();
				var cx = bbox.x + bbox.width / 2;
				var cy = bbox.y + bbox.height / 2;
				var c = svgDoc.getElementById('ref-' + x);
				if (!c) {
					c = svgDoc.createElementNS(ns, 'circle');
				  svgDoc.getElementById('viewport').appendChild(c);
          c.setAttribute('r', r);
				} else {
					this.animateAttribute(svgDoc, c, 'r', r);
				}
				c.setAttribute('cx', cx);
				c.setAttribute('cy', cy);
				c.setAttribute('rel', svgDoc.getElementById(x).getAttribute('rel'));
				c.setAttribute('id', 'ref-' + x);
				c.setAttribute('class', 'openedeyes-map-bubble');
				c.setAttribute('fill-opacity', 0.5);
				c.setAttribute('fill', $A(this.colors()).last());
				c.setAttribute('stroke', $A(this.colors()).last());
				c.setAttribute('stroke-width', this.config.strokeWidth);
			  c.onmouseover = function(e) {
					vis.showBalloon(this, e, 'bubbles');
			  }
			  c.onmouseout = function() {
			    if ($('openedeyes-map-balloon')) $('openedeyes-map-balloon').hide();
				}
			} else {
				var c = svgDoc.getElementById('ref-' + x);
				if (c) svgDoc.getElementById('viewport').removeChild(c);
			}
		}

		if (this.config.showLegend) this.renderLegend();

		if (this.firstRun) {
			this.firstRun = false;
      if (typeof(this.config.callback) == 'function') this.config.callback(this);
		}
	},

  renderLegend : function() {
		var vis = this;
		if ($('choropleth-map-legend')) $('choropleth-map-legend').remove();
		var ul = new Element('ul', { 'id' : 'choropleth-map-legend' });

    if (this.config.useDefaultInterface) {
			var sel = new Element('select', { 'id' : 'choropleth-map-legend-select' });
			for (var x in this.dataHeader)
				sel.insert(new Element('option', { 'value' : x }).update(x));
			sel.insert('<option value="" style="color: #ccc">' + this.t('Do not use this dimension') + '</option>');
			sel.value = this.varAt('regions') || "";
			sel.observe('change', function() { vis.updateVis({ 'regions' : this.value });	});
			ul.insert(sel);
		}

		var prev = 0;
		for (var i=0; i < this.range.length; i++) {
		  ul.insert('<li><div style="background-color: ' + this.colors()[i % this.colors().length] + '"></div><span>' + prev + ' ... ' + this.range[i] + '</span></li>');
			prev = this.range[i]; 
		}
		$(this.config.container).insert(ul);

    if (this.config.useDefaultInterface) {
			var div = new Element('div', { 'id' : 'choropleth-map-bubble-select' });
			div.insert(new Element('h4').update(this.t('Bubbles')));
			var sel = new Element('select');
			for (var x in this.dataHeader)
				sel.insert(new Element('option', { 'value' : x }).update(x));
			sel.insert('<option value="" style="color: #ccc">' + this.t('Do not use this dimension') + '</option>');
			sel.value = this.varAt('bubbles') || "";
			sel.observe('change', function() { vis.updateVis({ 'bubbles' : this.value });	});
			div.insert(sel);
		  $(this.config.container).insert(div);
		}
	},

});

// Great circles map
var greatCirclesMap = Class.create(Map, {

  initialize: function($super, config) {
	  $super(config);
	},

  prettyName : 'Great Circles Map',

	dependencies : {
	  js : ['latlon'],
		css : ['map']
	},

  referenceValues : {
    minX : -180,
    minY : -90,
    maxX : 180,
    maxY : 90
	},

  fromLatLonToPixels : function(lat, lon) {
		var svgDoc = (document.getElementById('openedeyes-map').contentDocument ? document.getElementById('openedeyes-map').contentDocument : document.getElementById('openedeyes-map').getSVGDocument());
		if (!this.referenceValues.transform) {
		  var transf = svgDoc.getElementById('viewport').getAttribute('transform');
      var regexp = new RegExp(/translate\((-?[0-9]+),(-?[0-9]+)\)/gi);
			this.referenceValues.transform = regexp.exec(transf);
		}
    var p = { 'x' : null, 'y' : null };
		p.x = (this.origSVGWidth * (lon - this.referenceValues.minX)) / (this.referenceValues.maxX - this.referenceValues.minX) - parseFloat(this.referenceValues.transform[1]);
		p.y = this.origSVGHeight - ((this.origSVGHeight * (lat - this.referenceValues.minY)) / (this.referenceValues.maxY - this.referenceValues.minY)) - parseFloat(this.referenceValues.transform[2]);
		return p;
  },

  fromPixelsToLatLon : function(x, y) {
    var lon = (x * (this.referencesValues.maxX - this.referencesValues.minX) / this.origSVGWidth) + this.referencesValues.minX;
    var lat = (((y - this.origSVGHeight) * (this.referencesValues.maxY - this.referencesValues.minY) / this.origSVGHeight) - this.referencesValues.minY) * (-1);
		return { 'lat' : lat, 'lon' : lon };
	},

  showBalloon : function(trigger, e) {
		if (this.config.useDefaultInterface && this.varAt('points')) {
      var id = trigger.getAttribute('id');
      $('openedeyes-map-balloon-title').update(id);
      $('openedeyes-map-balloon-value').update();
			for (dim in this.dataHeader) {
        if (!(this.config.removeFromBalloon.indexOf(dim) > -1)) $('openedeyes-map-balloon-value').insert(dim + ': ' + this.dataTable[id][dim] + '<br />');
			}
      $('openedeyes-map-balloon').setStyle({ 'left' : (e.clientX) + 'px', 'top' : (e.clientY - this.config.position[1]) + 'px' });
      $('openedeyes-map-balloon').show();
		}
	},

  renderLegend : function() {
		var vis = this;
		if ($('openedeyes-map-legend')) $('openedeyes-map-legend').remove();
		var ul = new Element('ul', { 'id' : 'openedeyes-map-legend' });
		for (var i=0; i < this.dataHeader[this.varAt('points')].length; i++)
		  ul.insert('<li><div style="background-color: ' + this.colors()[i % this.colors().length] + '"></div><span>' + this.dataHeader[this.varAt('points')][i] + '</span></li>');
		$(this.config.container).insert(ul);
  },

  fillMap : function() {
		var svgDoc = (document.getElementById('openedeyes-map').contentDocument ? document.getElementById('openedeyes-map').contentDocument : document.getElementById('openedeyes-map').getSVGDocument());
	  var svg = svgDoc.getElementById(this.config.map);
    var vis = this;

	  // Create balloon
		if (this.config.useDefaultInterface) {
			if (this.varAt('arcs') || this.varAt('points')) {
        if ($('openedeyes-map-balloon')) $('openedeyes-map-balloon').remove();
        var balloon = '<div id="openedeyes-map-balloon">' +
		      '<h3 id="openedeyes-map-balloon-title">&nbsp;</h3>' +
			  	'<p><span id="openedeyes-map-balloon-value"></span></p>' +
		    	'<small><img src="" alt="" id="openedeyes-map-balloon-flag" /></small>';
        $(this.config.container).insert(balloon);
			  $('openedeyes-map-balloon').hide();
			} else if (!this.varAt('arcs') && !this.varAt('points') && $('openedeyes-map-balloon')) $('openedeyes-map-balloon').remove();
		}
		
		// Iterate through each record
    for (var x in this.dataTable) {

			// Create arcs
			if (this.varAt('arcs') && (!this.config.filter || this.dataTable[x][this.config.filter[0]] == this.config.filter[1])) {
			  var dest = this.dataTable[x][this.varAt('arcs')];
			  if (dest != x) {
					var startCoords = new LatLon(this.dataTable[x].lat, this.dataTable[x].lon);
				  var startPixels = this.fromLatLonToPixels(this.dataTable[x].lat, this.dataTable[x].lon);
					var endCoords = new LatLon(this.dataTable[dest].lat, this.dataTable[dest].lon);
				  var endPixels = this.fromLatLonToPixels(this.dataTable[dest].lat, this.dataTable[dest].lon);
          var dist = startCoords.distanceTo(endCoords); // in KM
					var brng = startCoords.bearingTo(endCoords);
          var interval = 40;
					var step = dist / interval;
			    var path = 'M ' + startPixels.x + ',' + startPixels.y + ' ';
				  var prev = startPixels;
				  var hw = 0;

					for (var i=1; i < interval; i++) {
            var ll = startCoords.destinationPoint(brng, (step * i));
						var pt = this.fromLatLonToPixels(ll._lat, ll._lon);
						hw = pt.x - prev.x;
						prev = pt;
						if (Math.abs(hw) > this.origSVGWidth / 2) {
						  if (hw > 0) path += 'M ' + this.origSVGWidth + ',' + pt.y + ' ';
						  else  path += 'M 0,' + pt.y + ' ';
					  } else  path += 'L ' + pt.x + ',' + pt.y + ' ';
					}
					path += 'L ' + endPixels.x + ',' + endPixels.y;

					var ns = 'http://www.w3.org/2000/svg';
				  var a = svgDoc.getElementById(x + '---' + dest);
				  if (!a) {
					  a = svgDoc.createElementNS(ns, 'path');
				    svgDoc.getElementById('viewport').appendChild(a);
				  }
          a.setAttribute('d', path);
          a.setAttribute('id', x + '---' + dest);
				  a.setAttribute('stroke', this.config.arcColor);
				  a.setAttribute('stroke-width', this.config.arcWidth);
        	a.setAttribute('stroke-opacity', 0.6);
        	a.setAttribute('fill-opacity', 0);
				  a.setAttribute('class', 'great-circle');
				}
      } else {
			  var dest = this.dataTable[x][this.varAt('arcs')];
			  var a = svgDoc.getElementById(x + '---' + dest);
			  if (a) svgDoc.getElementById('viewport').removeChild(a);
			}

      // Create points
			if (this.varAt('points') && (!this.config.filter || this.dataTable[x][this.config.filter[0]] == this.config.filter[1])) {
	      var ns = 'http://www.w3.org/2000/svg';
				var dim = this.varAt('points');
				var ref = ((this.config.size[0] < this.config.size[1]) ? this.config.size[0] : this.config.size[1]);
        var r = this.config.pointSize;
				if (this.varAt('size')) {
					r = (this.dataTable[x][this.varAt('size')] * this.config.pointSize) / this.maxValue(this.varAt('size'));
				}
				var p = this.fromLatLonToPixels(this.dataTable[x].lat, this.dataTable[x].lon);
				var cx = p.x;
				var cy = p.y;
				var c = svgDoc.getElementById(x);
				if (!c) {
					c = svgDoc.createElementNS(ns, 'circle');
				  svgDoc.getElementById('viewport').appendChild(c);
				}
			
			  var colors = this.colors();	
				var color = colors[this.dataHeader[dim].indexOf(this.dataTable[x][dim]) % colors.length];

				c.setAttribute('r', r);
				c.setAttribute('cx', cx);
				c.setAttribute('cy', cy);
				c.setAttribute('id', x);
				c.setAttribute('class', 'openedeyes-map-bubble');
				c.setAttribute('fill-opacity', 0.5);
				c.setAttribute('fill', color);
				c.setAttribute('stroke', color);
				c.setAttribute('stroke-width', this.config.strokeWidth);
				c.onmouseover = function(e) {
					vis.showBalloon(this, e);
			  }
			  c.onmouseout = function() {
			    $('openedeyes-map-balloon').hide();
				}
			} else {
				var c = svgDoc.getElementById(x);
				if (c) svgDoc.getElementById('viewport').removeChild(c);
			}
		}

		if (this.config.showLegend) this.renderLegend();

		if (this.firstRun) {
			this.firstRun = false;
      if (typeof(this.config.callback) == 'function') this.config.callback(this);
		}
	}

});
