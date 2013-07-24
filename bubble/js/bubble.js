// Abstract class that implements the Bubble Chart
var bubbleChart = Class.create(OpenedEyes, {

  initialize: function($super, config) {
	  if (this.prettyName == 'Bubble Chart') throw(this.t('This is an abstract class!'));
	  $super(config);
	},

  prettyName : 'Bubble Chart',

	name : 'bubble',
 
	dependencies : {
	  js : ['raphael'],
		css : ['bubble']
	},

	createInterface : function() {
		var vis = this;
    $(this.config.container).insert({ 'before' : '<div id="bubble-selects">' +
                '<label for="bubble-x">' + 'X' + '</label>' +
                '<select id="bubble-x" class="bubble-updatable"></select>' +
                '<label for="bubble-y">' + 'Y' + '</label>' +
                '<select id="bubble-y" class="bubble-updatable"></select>' +
                '<label for="bubble-size">' + this.t('Bubble size') + '</label>' +
                '<select id="bubble-size" class="bubble-updatable"></select>' +
                '<label for="bubble-color">' + this.t('Bubble color') + '</label>' +
                '<select id="bubble-color" class="bubble-updatable"></select>' +
                '</div>' });
		$$('.bubble-updatable').each(function(select) { select.observe('change', function(event) { 
				var state = {};
				var variable = this.readAttribute('id').replace('bubble-','');
				state[variable] = this.value;
		    vis.updateVis(state);
		  }); 
		});
  },

  postLoad : function() {
		var vis = this;
    var i = this.config.useDefaultInterface;
		$A(['x','y','size']).each(function(variable) {
			if (vis.config.initialState[variable] !== undefined) vis.currentState[variable] = vis.config.initialState[variable];
      for (field in vis.dataHeader) {
        if (!(vis.dataHeader[field] instanceof Array)) {
          if (i) $('bubble-' + variable).insert('<option value="' + field + '">' + field + '</option>');
			    if (vis.currentState[variable] === undefined) vis.currentState[variable] = field; 
        }
      }
			if (i) {
			  $('bubble-' + variable).insert('<option value="" class="unused">' + vis.t('Not use this dimension') + '</option>');
			  if (vis.config.initialState[variable] !== undefined) $('bubble-' + variable).value = vis.config.initialState[variable];
			}
    });
		if (vis.config.initialState.color !== undefined) vis.currentState.color = vis.config.initialState.color;
    for (field in vis.dataHeader) {
      if (vis.dataHeader[field] instanceof Array) {
        if (i) $('bubble-color').insert('<option value="' + field + '">' + field + '</option>');
			  if (vis.currentState.color === undefined) vis.currentState.color = field;
      }
    }
    if (i) {
			$('bubble-color').insert('<option value="" class="unused">' + vis.t('Not use this dimension') + '</option>');
		  if (vis.config.initialState.color !== undefined) $('bubble-color').value = vis.config.initialState.color;
		}
		this.drawGrid();
		this.drawBubbles();
	},

  rayOf : function(obj) {
		var ref = this.config.size[1];
		var dim = this.varAt('size');
		if (this.config.size[0] < this.config.size[1]) ref = this.config.size[0];
    if (dim != null) {
			if (obj[dim] <= 0) return 0;
			else return Math.sqrt((obj[dim]*(Math.pow(this.config.defaultBubbleSize, 2)*Math.PI))/this.dataHeader[dim] * Math.PI);
      // else return ((ref * obj[dim]) / this.dataHeader[dim]) / 2;
		}
		else return this.config.defaultBubbleSize;
  },

  minAndMaxValue : function(field) {
    var max = 0;
    var min = Infinity;
    var r_min = 0;
    var r_max = 0;
    for (var bubble in this.dataTable) {
			var r = this.rayOf(this.dataTable[bubble]);
      if (this.dataTable[bubble][field] < min && this.dataTable[bubble][field] > 0) {
        min = this.dataTable[bubble][field];
        if (r > r_min && r > 0) r_min = r;
      }
      if (this.dataTable[bubble][field] > max && this.dataTable[bubble][field] > 0) {
        max = this.dataTable[bubble][field];
        if (r > r_max && r > 0) r_max = r;
      }
    }
    if (max == min) return { 'min' : 0, 'max' : max * 2 };
		var ref = this.config.size[1];
		if (this.config.size[0] < this.config.size[1]) ref = this.config.size[0];
    var factor = (ref - r_min - r_max) / (max - min);
    return { 'max' : Math.ceil(max + r_max / factor),
             'min' : Math.floor(min - r_min / factor)
           }
  },

  maxValue : function(field) {
    return this.minAndMaxValue(field).max;
  },

  minValue : function(field) {
    return this.minAndMaxValue(field).min;
  },

  translations : {
	  'pt-br' : {
			'Bubble size' : 'Tamanho da bolha',
			'Bubble color' : 'Cor da bolha',
			'Remove bubble' : 'Remover bolha',
      'Not use this dimension' : 'Não utilizar esta dimensão',
      'Click on bubble to remove it' : 'Clique na bolha para removê-la',
      'This is an abstract class!' : 'Esta é uma classe abstrata!'
		}
  },

  drawGrid : function() {
    var w = this.config.size[0];
    var h = this.config.size[1];
		$(this.config.container).setStyle({ 'position' : 'relative', 'margin-bottom' : '100px' });
    $(this.config.container).insert('<div id="bubble-grid" style="left: 0px; top: 0px; width: ' + w + 'px; height: ' + h + 'px;"></div>');

    // X
    var x_var = this.varAt('x'); 
		if (x_var != null) {
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-x" style="left: 0px; top: ' + (h + 5) + 'px;">' + this.minValue(x_var) + '</span>');
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-x" style="left: ' + (w / 2) + 'px; top: ' + (h + 5) + 'px;">' + ((this.maxValue(x_var) + this.minValue(x_var)) / 2) + '</span>');
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-x" style="left: ' + (w - 5) + 'px; top: ' + (h + 5) + 'px;">' + this.maxValue(x_var) + ' (' + x_var + ')</span>');
		}

    // Y
    var y_var = this.varAt('y');
		if (y_var != null) {
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-y" style="right: ' + w + 'px; top: 0px;">' + this.maxValue(y_var) + ' (' + y_var + ')</span>');
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-y" style="right: ' + w + 'px; top: ' + (h / 2) + 'px;">' + ((this.maxValue(y_var) + this.minValue(y_var)) / 2) + '</span>');
      $('bubble-grid').insert('<span class="bubble-axis-value bubble-axis-y" style="right: ' + w + 'px; top: ' + (h - 20) + 'px;">' + this.minValue(y_var) + '</span>');
		}
  },

  bubbleColor : function(obj) {
    var dim = this.varAt('color');
		var colors = this.colors();
    if (dim == null) return colors[0];
    return colors[this.dataHeader[dim].indexOf(obj[dim]) % (colors.length)];
  },

  calculateValuesFor : function(bubble) {
		var r, x, y;
    var w = this.config.size[0];
    var h = this.config.size[1];
		r = this.rayOf(this.dataTable[bubble]);
    
		if (this.varAt('x') == null) x = w / 2;
		else x = (w / (this.maxValue(this.varAt('x')) - this.minValue(this.varAt('x')))) * (this.dataTable[bubble][this.varAt('x')] - this.minValue(this.varAt('x')));

		if (this.varAt('y') == null) y = h / 2; 
		else y = (h / (this.maxValue(this.varAt('y')) - this.minValue(this.varAt('y')))) * (this.maxValue(this.varAt('y')) - this.dataTable[bubble][this.varAt('y')]);
		
		return { 'x' : x, 'y' : y, 'r' : r };
	},

  customMandatoryConfig : [],

  customConfig : {
    'defaultBubbleSize' : 10
  }

});

var bubbleCanvasChart = Class.create(bubbleChart, {

  initialize: function($super, config) {
	  $super(config);
	},

  prettyName : 'Bubble Canvas Chart',

  removeBubble : function(bubble) {
    for (var field in this.dataHeader) {
      if (!isNaN(this.dataHeader[field]) && this.dataTable[bubble]) this.dataHeader[field] -= this.dataTable[bubble][field];
    }
    delete this.dataTable[bubble];
    this.updateVis();
  },

  updateVis : function(state) {
		var vis = this;
		for (var field in state)
			vis.currentState[field] = state[field];
    $(this.config.container).update();
    this.drawGrid();
    this.drawBubbles();
  },

  firstRun : true,

  showBalloon : function(name, x, y) {
		if ($('bubble-balloon')) $('bubble-balloon').remove();
    var data = this.dataTable[name];
    var list = new Element('ul');
    for (var field in data) {
      list.insert('<li><span>' + field + '</span>: <span>' + data[field] + '</span></li>');
    }
    var balloon = new Element('div', { 'id' : 'bubble-balloon' });
		balloon.setStyle({
			'left' : (parseInt(x) - 75) + 'px',
			'bottom' : (this.config.size[1] - parseInt(y)) + 'px'
		}).insert(list)
		  .insert({ 'top' : '<h3>' + name + '</h3>' })
			.insert({ 'bottom' : '<small>' + this.t('Click on bubble to remove it') + '</small>' });
    $('bubble-grid').insert(balloon);
  },

  drawBubbles : function() {
		var vis = this;
    // Set size and position of the canvas element
	  var canvas_cont = $(this.config.container);
	  canvas_cont.style.top    = this.config.position[1] + 'px';
	  canvas_cont.style.width  = this.config.size[0] + 'px';
	  canvas_cont.style.height = this.config.size[1] + 'px';
	  canvas_cont.style.left   = this.config.position[0] + 'px';
		$(this.config.container).insert({ 'top' : '<canvas id="bubble-canvas"></canvas>' });
	  var canvas = $('bubble-canvas');
	  
    // Does the browser support canvas?
	  if (canvas.getContext) {
	  	
      // Set size
	  	var w = this.config.size[0];
	  	var h = this.config.size[1];
	  	canvas.writeAttribute('width',w);
	  	canvas.writeAttribute('height',h);
	  	var ctx = canvas.getContext('2d');
	  	ctx.lineCap = 'round';
	  	ctx.lineJoin = 'round';
	  	
      // Render background
	  	ctx.fillStyle = 'white';
	  	if (this.config.background) ctx.fillStyle = this.parseColor(ctx,this.config.background,h);
	  	ctx.fillRect(0,0,w,h);

      // Set preferences - Just some visual concepts...
	  	ctx.fillStyle = 'black';
	  	ctx.strokeStyle = this.parseColor(ctx,this.config.strokeColor,h);
	  	if (this.config.strokeWidth != null) ctx.lineWidth = this.config.strokeWidth;
      ctx.globalAlpha = this.config.opacity;

	  	// Draw each bubble, start at the left
	  	for (var bubble in this.dataTable) {
	  	  ctx.fillStyle = this.bubbleColor(this.dataTable[bubble]);
				var values = vis.calculateValuesFor(bubble);
				var x = values.x;
				var y = values.y;
				var r = values.r;
        var d = 2 * Math.sqrt(2) * r;
        var l = r * Math.sqrt(2);
        var html = '<div class="bubble-remove" title="' + bubble + '" id="bubble-remove-' + bubble + '" style="width: ' + l + 'px; height:' + l + 'px; left: ' + (x - l/2) + 'px; top: ' + (y - l/2) + 'px"></div>';
        $(this.config.container).insert(html);
        ctx.beginPath();
        ctx.arc(x, y, r, 0-Math.PI/2, 360-Math.PI/2, false);
        ctx.stroke();
        ctx.fill();
        ctx.closePath();
				$$('.bubble-remove').each(function(a) {
					a.observe('click', function(event) {
						vis.removeBubble(this.readAttribute('title'));
					});
					a.observe('mouseover', function(event) {
            var pos = this.positionedOffset();
						vis.showBalloon(this.readAttribute('title'), pos[0], pos[1]);
					});
					a.observe('mouseout', function(event) {
				    if ($('bubble-balloon')) $('bubble-balloon').remove();
					});
				});
	    } 
      if (this.firstRun && typeof(this.config.callback) == 'function') {
				this.firstRun = false;
			  this.config.callback(this);
			}
	  } else {
	  	canvas.update(this.t('Your browser does not support Canvas!'));
	  }
  }

});

var bubbleSVGChart = Class.create(bubbleChart, {

  initialize: function($super, config) {
	  $super(config);
	},

  prettyName : 'Bubble SVG Chart',

  removeBubble : function(bubble) {
    var vis = this;
    var name = bubble.data('name');
    
		for (var field in this.dataHeader) {
      if (!isNaN(this.dataHeader[field]) && this.dataTable[name]) this.dataHeader[field] -= this.dataTable[name][field];
    }
    delete this.dataTable[name];

    this.bubblesSet.exclude(bubble);

	  bubble.animate({ opacity : 0 }, 2000, function() {
      this.remove();  
			vis.updateVis();
    });
	},

  updateVis : function(state) {
		var vis = this;
		
		for (var field in state)
			vis.currentState[field] = state[field];
    
		$('bubble-grid').remove();
		this.drawGrid();

    this.bubblesSet.forEach(function(circle) {
      var values = vis.calculateValuesFor(circle.data('name'));
			circle.animate({
				'cx' : values.x,
				'fill' : vis.bubbleColor(vis.dataTable[circle.data('name')]),
				'cy' : values.y,
				'r' : values.r
			}, 1000);
		});
  },

  bubblesSet : null,

  showBalloon : function(bubble) {
		if ($('bubble-balloon')) $('bubble-balloon').remove();
    var name = bubble.data('name');
    var data = this.dataTable[name];
    var list = new Element('ul');
    for (var field in data) {
      list.insert('<li><span>' + field + '</span>: <span>' + data[field] + '</span></li>');
    }
    var balloon = new Element('div', { 'id' : 'bubble-balloon' });
		balloon.setStyle({
			'left' : (parseInt(bubble.attr('cx')) - 75) + 'px',
			'bottom' : (this.config.size[1] - parseInt(bubble.attr('cy'))) + 'px'
		}).insert(list)
		  .insert({ 'top' : '<h3>' + name + '</h3>' })
			.insert({ 'bottom' : '<small>' + this.t('Click on bubble to remove it') + '</small>' });
    $('bubble-grid').insert(balloon);
  },

  drawBubbles : function() {
		var vis = this;
	  var svg_cont = $(this.config.container);
	  svg_cont.style.top   = this.config.position[1] + 'px';
	  svg_cont.style.left  = this.config.position[0] + 'px';
	  svg_cont.style.width = this.config.size[0] + 'px';
	  svg_cont.style.height = this.config.size[1] + 'px';
	  svg_cont.style.backgroundColor = this.config.background;

	  var w = this.config.size[0];
	  var h = this.config.size[1];

		var svg = Raphael(svg_cont,w,h);
		svg.rect(1,0,w,h).attr({ 'stroke-opacity' : 0, 'fill' : this.parseColor(svg, this.config.background, h) });
		this.bubblesSet = svg.set();
	  
	  // Draw each bubble, start at the left
	  for (var bubble in this.dataTable) {

			var values = vis.calculateValuesFor(bubble);
			var c = svg.circle(values.x, values.y, values.r);

      c.mouseover(function() {
			  vis.showBalloon(this);
				this.attr({ 'fill-opacity' : 0.3 });
			});

      c.mouseout(function() {
				if ($('bubble-balloon')) $('bubble-balloon').remove();
				this.attr({ 'fill-opacity' : 1 });
			});

			c.attr({
				'fill' : vis.bubbleColor(vis.dataTable[bubble]),
				'stroke' : vis.parseColor(svg, vis.config.strokeColor, h),
				'title' : bubble
			});

			c.click(function() {
				vis.removeBubble(this);
			});

      c.data('name', bubble);

			vis.bubblesSet.push(c);
		}
    
		if (typeof(this.config.callback) == 'function') this.config.callback(this);
  }

});
