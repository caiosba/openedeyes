var parallelCoordinatesChart = Class.create(OpenedEyes, {

  initialize: function($super, config) {
    $super(config);
  },

  prettyName : 'Parallel Coordinates Chart',

  name : 'parallel_coordinates',
 
  dependencies : {
    js : ['scriptaculous/scriptaculous', 'scriptaculous/builder', 'scriptaculous/effects', 'scriptaculous/dragdrop', 'scriptaculous/controls', 'scriptaculous/slider', 'scriptaculous/sound','md5'],
    css : ['parallel_coordinates']
  },

  customConfig : {
    'activeLine' : '',
    'activeBars' : [],
    'bars' : {},
		'autoUpdate' : false
  },

  customMandatoryConfig : ['bars', 'activeBars', 'activeLine'],

  drawGrid : function() {
    $(this.config.container).update(
      '<div id="parallel-coordinates-mask" style="display:none"></div>' +
      '<div id="parallel-coordinates-diagram"></div>' +
      '<div id="parallel-coordinates-canvas"><canvas id="parallel-coordinates-line"></canvas></div>'
    );
  },

  clearCache : function() {
		if (localStorage) {
		  var sure = confirm(this.t('Are you sure you want to clear the cache?'));
		  if (sure) localStorage.clear();
		}
	},

  storeCache : function() {
		vis = this;
		if (!this.dataHash) this.dataHash = calcMD5(JSON.stringify(this.config.addParams.call(vis)));
		localStorage[this.dataHash] = JSON.stringify(this.dataTable);
	},

  updateVis : function(state) {
		var vis = this;
 		for (var field in state)
			this.currentState[field] = state[field];
		var canvas = $('parallel-coordinates-line')
	  canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);
		$('parallel-coordinates-diagram').update();
		this.dataHash = calcMD5(JSON.stringify(this.config.addParams.call(vis)));
		if (localStorage && localStorage[this.dataHash]) {
			this.dataTable = JSON.parse(localStorage[this.dataHash]);
			this.postLoad();
		}	else this.requestData();
  },

  // Default interface
  createInterface : function() {
		var vis = this;
    $(this.config.container).insert(
      '<form id="parallel-coordinates-actions">' +
      '  <p id="parallel-coordinates-actions-header">' +
      '    <span id="parallel-coordinates-move-control" class="parallel-coordinates-default-option" title="' + this.t('Move') + '">' + this.t('Move') + '</span>' + 
      '    <span id="parallel-coordinates-hide-control" class="parallel-coordinates-default-option" title="' + this.t('Show') + '/' + this.t('Hide') + '" rel="hide">' + this.t('Hide') + '</span>' +
      '    <span id="parallel-coordinates-controller-title">' + this.t('Control') + '</span>' +
      '  </p>' +
      '  <div id="parallel-coordinates-control-body">' +
      '  <div id="parallel-coordinates-default-options">' +
			'  <input type="checkbox" id="parallel-coordinates-auto-update" ' + (this.config.autoUpdate ? 'checked="checked" ' : '') + '/><label for="parallel-coordinates-auto-update">' + this.t('Auto Update') + '</label><br />' +
			'  <a href="#" onclick="return false" id="parallel-coordinates-clear-cache">' + this.t('Clear cache') + '</a>' +
      '  </div>' +
      '  <div id="parallel-coordinates-slider"><div id="parallel-coordinates-slider-handle" title="' + this.t('Slide') + '"></div></div>' +
      '  <span id="parallel-coordinates-transparency">0%</span>' +
      '  <script type="text/javascript">' +
      '    new Control.Slider("parallel-coordinates-slider-handle", "parallel-coordinates-slider", {' +
      '      onSlide: function(v) {' +
      '        $("parallel-coordinates-diagram").style.opacity = 1 - v;' +
      '        $("parallel-coordinates-transparency").update(parseInt(v*100) + "%");' +
      '      }' +
      '    });' +
      ' </script>' +
      ' <p id="parallel-coordinates-fields-header"></p>' +
      ' <ul id="parallel-coordinates-lines-list">' +
			'   <li id="parallel-coordinates-remove-line" title="' + this.t('Remove the active line') + '">-</li>' +
			'   <li id="parallel-coordinates-add-line" title="' + this.t('Add a new line') + '">+</li>' +
			' </ul>' +
      ' <p style="clear:both;" />' +
      '  <ul id="parallel-coordinates-options-list"></ul>' +
      ' <a href="#" id="parallel-coordinates-link-update">&uarr; ' + this.t('Update') + '</a>' +
      ' </div>' +
      '</form>'
    );
    
		// Hide and show control
		$('parallel-coordinates-hide-control').observe('click', function() {
      var body = $('parallel-coordinates-control-body');
      var control = $('parallel-coordinates-hide-control');
      if (control.readAttribute('rel') == 'hide') {
        body.hide();
        control.writeAttribute('rel','show');
        control.update(vis.t('Show'));
      } 
      else {
        body.show();
        control.writeAttribute('rel','hide');
        control.update(vis.t('Hide'));
      }
    });
		
		// Update
		$('parallel-coordinates-link-update').observe('click', function() { vis.updateVis(); });
		
		// Auto update
		$('parallel-coordinates-auto-update').observe('click', function() { vis.updateConfig({ 'autoUpdate' : this.checked }); });
		
		// Remove a line
		$('parallel-coordinates-remove-line').observe('click', function() {
			var id = vis.config.activeLine;
			if ($H(vis.currentState).keys().length > 1) {
			  delete vis.currentState[id];
			  vis.activateLine($H(vis.currentState).keys().pop());
			  $('parallel-coordinates-line-' + id).remove();
				vis.updateVis();
			} else {
			  alert(vis.t('You must have at least one line'));
			}
		});

		// Add a line
		$('parallel-coordinates-add-line').observe('click', function() {
			var id = prompt(vis.t('Give a unique name to this new line'));
			if (!id || $H(vis.currentState).keys().indexOf(id) > -1) alert(vis.t('Give a unique name to this new line'));
			else {
			  vis.currentState[id] = JSON.parse(JSON.stringify(vis.currentState[vis.config.activeLine]));
			  vis.dataTable[id] = JSON.parse(JSON.stringify(vis.dataTable[vis.config.activeLine]));
				var c = vis.colors();
				var n = c.length;
				var i = vis.nextColor;
				vis.lineColors[id] = [c[i%n], c[(i+1)%n], c[(i+2)%n]];
				vis.nextColor = (i+3)%n;
				vis.addLine(id);
				vis.updateVis();
			}
		});
		
		// Clear cache
		$('parallel-coordinates-clear-cache').observe('click', function() { vis.clearCache(); });

		for (var id in this.currentState)
      this.addLine(id);

		this.buildOptionsList();
  },

  activateLine : function(id) {
    $$('.parallel-coordinates-active')[0].removeClassName('parallel-coordinates-active');
		$('parallel-coordinates-line-' + id).toggleClassName('parallel-coordinates-active');
		this.updateConfig({ 'activeLine' : id });
    for (var j = 0; j < this.config.activeBars.length; j++) {
		  var s = this.config.activeBars[j];
			$('parallel-coordinates-' + s + '-' + this.currentState[id][s] + '-op').checked = true;
		}
	},

  addLine : function(id) {
		var vis = this;
		var li = new Element('li', { 'rel' : id, 'id' : 'parallel-coordinates-line-' + id, 'class' : 'parallel-coordinates-line-button', 'title' : this.t('Click to manipulate this line'), 'style' : 'background-color: ' + this.lineColors[id][0] });
    $('parallel-coordinates-lines-list').insert({ 'top' : li });
		if (id == vis.config.activeLine) li.addClassName('parallel-coordinates-active');
		li.observe('click', function() { vis.activateLine(this.readAttribute('rel')); });
  },

  preLoad : function() {
		var vis = this;
    this.drawGrid();
    this.currentState = JSON.parse(JSON.stringify(this.config.initialState));
		var i = 0;
		var colors = vis.colors();
		for (var id in this.currentState) {
			vis.lineColors[id] = [];
			for (var j=0; j < 3; j++) {
			  vis.lineColors[id].push(colors[i]);
				i++;
				if (i == colors.length) i = 0;
			}
		}
		this.nextColor = i;
  },

  postLoad : function() {
    this.buildDiagram();
    this.drawLines();
    this.storeCache();
	},

  reorderColumns : function() {
		var vis = this;
		var list = $$('#parallel-coordinates-options-list li');
		vis.config.activeBars = [];
		list.each(function(element, index) {
			var value = element.readAttribute('rel');
			if ($('parallel-coordinates-show-' + value).checked) {
			  vis.config.activeBars.push(value);
				for (var id in vis.currentState) {
				  if (!vis.currentState[id][value]) vis.currentState[id][value] = vis.config.bars[value][0];
				}
			}
		});
		if (this.config.autoUpdate) this.updateVis();
	},

  buildOptionsList : function() {
		var vis = this;
    var list = $('parallel-coordinates-options-list');
		var bars = this.config.activeBars.clone();
		var allBars = $H(this.config.bars).keys();
    for (var i = 0; i < allBars.length; i++) {
			var bar = allBars[i];
		  if (bars.indexOf(bar) == -1) bars.push(bar);
		}
    for (var i = 0; i < bars.length; i++) {
			var bar = bars[i];
      var item = '<li id="parallel-coordinates-' + bar + '" rel="' + bar + '"><input type="checkbox" ';
      if (this.config.activeBars.indexOf(bar) > -1) item += 'checked="checked" ';
      item += 'id="parallel-coordinates-show-' + bar + '" /> ' +
              '<label for="parallel-coordinates-show-' + bar + '">' + bar + '</label></li>';
      list.insert(item);
			$('parallel-coordinates-show-' + bar).observe('click', function() { vis.reorderColumns(); });
    }
    
    Sortable.create('parallel-coordinates-options-list', { 
      onChange : function() { 
        vis.reorderColumns();
      } 
    });
    
    new Draggable('parallel-coordinates-actions', { 
      scroll: window,
      handle: 'parallel-coordinates-move-control'
    });
  },

  buildDiagram : function() {
    var vis = this;
    // Calculate some values based on the initial settings
    var col_h = this.config.size[1] - 30;
    var col_w = col_h;
    var col_t = 20;
    var op_h = this.config.size[1]/4;
    var ini_l = col_w;
    
    var n = this.config.activeBars.length;

    var cont = $('parallel-coordinates-diagram');
    var mask = $('parallel-coordinates-mask');

    // Set position and size of the container and the mask
    cont.style.top    = mask.style.top    = this.config.position[1] + 'px';
    cont.style.left   = mask.style.left   = this.config.position[0] + 'px';
    cont.style.height = mask.style.height = this.config.size[1]     + 'px';
    cont.style.width  = mask.style.width  = (n+1) * col_w      + 'px';
    var left = ini_l;

    // Total value
    cont.update('<h2>Total</h2><h3 id="parallel-coordinates-total">' + this.dataTable[this.config.activeLine].total + '</h3>');
    $('parallel-coordinates-total').style.top = this.config.size[1]/2-20 + 'px';
    
    // Each column
    for (var i = 0; i < this.config.activeBars.length; i++) {
      var s = this.config.activeBars[i];
      var item = this.config.bars[s];
      var col = '<div class="parallel-coordinates-col" id="parallel-coordinates-' + s + '" style="left:' + left + 'px;height:' + col_h + 'px;width:' + (col_w - 30) + 'px">' +
                '<h2 title="' + s + '">' + s + '</h2></div>';
      cont.insert(col);
			col = $('parallel-coordinates-' + s); 
      
      // Each option
      var pos_top = ((col_h - 20)/item.length)/2;
      
      for (var j=0; j < item.length; j++) {
        var v = item[j];
        var op = '<div class="parallel-coordinates-option" id="parallel-coordinates-' + s + '-' + v + '" style="top: ' + pos_top + 'px;">' + 
                 '<div id="parallel-coordinates-' + s + '-' + v + '-value" class="parallel-coordinates-value"';
        op += '></div><div class="parallel-coordinates-form">';
        if (this.config.useDefaultInterface) {
          op += '<input type="radio" name="parallel-coordinates-' + s + '-op" id="parallel-coordinates-' + s + '-' + v + '-' + 'op" value="' + v + '" rel="' + s + '"';
          if (this.currentState[this.config.activeLine][s] == v) op += 'checked="checked" ';
          op += ' />'
        }
        op += '<label title="' + s + '" for="parallel-coordinates-' + s + '-' + v + '-' + 'op" id="parallel-coordinates-' + s + '-' + v + '-label"';
        if (this.currentState[this.config.activeLine][s] == v) op += 'class="parallel-coordinates-selected"'
        op += '>' + v + '</label></div></div>';
        pos_top += ((col_h - 20)/item.length);
        col.insert(op);
				if (this.config.useDefaultInterface) {
				  $('parallel-coordinates-' + s + '-' + v + '-' + 'op').observe('click', function() {
				    vis.currentState[vis.config.activeLine][this.readAttribute('rel')] = this.value;
				  	if (vis.config.autoUpdate) vis.updateVis();
				  });
				}
      }

      left += (col_w + 10);
    }
  },

  lineColors : {},

	firstRun : true,

  drawLines : function() {
    var n = this.config.activeBars.length;
    
    // Set size and position of the canvas element
    var col_h = this.config.size[1] - 30;
    var col_w = col_h;
    var col_t = 20;
    var op_h = this.config.size[1]/4;
    var ini_l = col_w;
    var canvas_cont = $('parallel-coordinates-canvas');
    canvas_cont.style.top    = this.config.position[1] + 'px';
    canvas_cont.style.width  = n*col_w + n*10 + 'px';
    canvas_cont.style.height = this.config.size[1] + 'px';
    canvas_cont.style.left   = this.config.position[0] + 'px';
    var canvas = $('parallel-coordinates-line');
    
    // Does the browser support canvas?
    if (canvas.getContext) {

      // Set size
      var w = (n+1)*col_w;
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

      // Draw each line
      for (var id in this.currentState) {
        var line = this.currentState[id];
        // Set preferences - Just some visual concepts...
        ctx.fillStyle = 'black';
        ctx.fillStyle = this.parseColor(ctx,this.lineColors[id][0],h);
        ctx.strokeStyle = this.parseColor(ctx,this.lineColors[id][1],h);
        if (this.config.strokeWidth != null) ctx.lineWidth = this.config.strokeWidth;

        // Set initial point
        ctx.beginPath();
        var xo = 0;
        var yo = (this.config.size[1]-op_h)/2;
        ctx.moveTo(xo,yo);
        var x,y;

        // Set points from left to right
        var m = 0;
        var bars = [];
        for (var j = 0; j < this.config.activeBars.length; j++) {
          var i = this.config.activeBars[j];
          var item = this.config.activeBars[i];
          bars.push(i);
          x = this.getNumericValue($('parallel-coordinates-' + i).style.left);
          x += 1;
          y = this.getNumericValue($('parallel-coordinates-' + i + '-' + this.currentState[id][i]).style.top);
          var aux = (op_h-(this.dataTable[id][i]*op_h/this.dataTable[id].total))/2+y;
          y = aux;
          ctx.lineTo(x,y);
          // Inserts value
          $('parallel-coordinates-' + i + '-' + this.currentState[id][i] + '-value').insert(' <span style="color: ' + this.lineColors[id][2]  + '">' + this.dataTable[id][i] + '</span>');
          m++;
        }

        // Set points from right to left
        for (var j = bars.length-1; j >=0; j--) {
          var i = bars[j];
          var item = this.config.activeBars[bars[j]];
          x = this.getNumericValue($('parallel-coordinates-' + i).style.left);
          x += 1;
          y = this.getNumericValue($('parallel-coordinates-' + i + '-' + this.currentState[id][i]).style.top);
          var aux = (op_h-(this.dataTable[id][i]*op_h/this.dataTable[id].total))/2+y;
          y = aux;
          y += this.dataTable[id][i]*op_h/this.dataTable[id].total;
          ctx.lineTo(x,y);
        }
        
        // Go back to the initial point
        ctx.lineTo(xo,yo+op_h);
        
        // End, just stroke and fill
        ctx.stroke();
        ctx.fill();
      };
      if (this.firstRun && typeof(this.config.callback) == 'function') {
				this.firstRun = false;
			  this.config.callback(this);
			}
    // Canvas not supported
    } else {
      canvas.update(this.t('Your browser does not support Canvas!'));
    }
  },

  translations : {
    'pt-br' : {
      'Show' : 'Exibir',
      'Hide' : 'Ocultar',
      'Slide' : 'Deslizar',
      'Control' : 'Controle',
      'Move' : 'Mover',
      'Update' : 'Atualizar',
			'Auto Update' : 'Atualizar automaticamente',
      'Click to manipulate this line' : 'Clique para manipular esta linha',
      'Remove the active line' : 'Remover a linha ativa',
      'You must have at least one line' : 'Você deve ter ao menos uma linha',
      'Add a new line' : 'Adicionar uma nova linha',
      'Give a unique name to this new line' : 'Dê um nome único para esta nova linha',
      'Are you sure you want to clear the cache?' : 'Você tem certeza que deseja limpar o cache?',
      'Clear cache' : 'Limpar o cache'
    }
  }
});
