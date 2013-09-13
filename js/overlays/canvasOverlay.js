define(["gmaps","./basicOverlay"],function(gmaps,BasicOverlay) {

	var CanvasOverlay = function(options) {
		this._map = options.map;
		this._mapDiv = this._map.getDiv();
		this._onAddCallback = options.onAdd;
		this.setMap(this._map);
	}

	CanvasOverlay.prototype = new BasicOverlay();

	CanvasOverlay.prototype.setContainerSize = function(w,h) {
		if (!this._canvas) return;
		this._canvas.width = w;
		this._canvas.height = h;
	}

	CanvasOverlay.prototype.setContainerOffset = function(l,t) {
		if (!this._canvas) return;
		this._canvas.style.left = Math.floor(l) + "px";
		this._canvas.style.top = Math.floor(t) + "px";
	}

	CanvasOverlay.prototype.clear = function() {
        if(!this._canvas) return;
	    this._canvas.height = this._canvas.height;
	}

	CanvasOverlay.prototype.onAdd = function() {
		this._canvas = document.createElement("canvas");
		this._canvas.style.position = "absolute";
		this._canvas.style.pointerEvents = "none";
    	this._canvas.style.webkitTransform = "translate3d(0,0,0)"; // turn on hw acceleration
	 	this._canvas.style.imageRendering = "optimizeSpeed";
		this._context = this._canvas.getContext("2d");
		this.getPanes().floatPane.appendChild(this._canvas);
		this.relayout();
		if (typeof this._onAddCallback === "function")
			this._onAddCallback();
	}

	CanvasOverlay.prototype.onRemove = function() {
		if (!this._canvas) return;
		this._canvas.parentNode.removeChild(this._canvas);
	}

	CanvasOverlay.prototype.getCanvas = function() {
		return this._canvas;
	}

	CanvasOverlay.prototype.getContext = function() {
		return this._context;
	}

	CanvasOverlay.prototype.setProperties = function(properties) {
		console.log("set properties",this._context,properties);
		if (!this._context) return;
		for (var i in properties)
			if (properties.hasOwnProperty(i))
				this._context[i] = properties[i];
	}

	return CanvasOverlay;
});