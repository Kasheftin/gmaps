define(["gmaps","./basicOverlay"],function(gmaps,BasicOverlay) {

	var DivOverlay = function(options) {
		this._map = options.map;
		this._mapDiv = this._map.getDiv();
		this._onAddCallback = options.onAdd;
		this.setMap(this._map);
	}

	DivOverlay.prototype = new BasicOverlay();

	DivOverlay.prototype.setContainerSize = function(w,h) {
		if (!this._container) return;
		this._container.style.width = 0;
		this._container.style.height = 0;
	}

	DivOverlay.prototype.setContainerOffset = function(l,t) {
		if (!this._container) return;
		this._container.style.left = Math.floor(l) + "px";
		this._container.style.top = Math.floor(t) + "px";
	}

	DivOverlay.prototype.clear = function() {
        if(!this._container) return;
       	this._container.innerHTML = "";
	}

	DivOverlay.prototype.onAdd = function() {
		this._container = document.createElement("div");
		this._container.style.position = "absolute";
		this._container.className = "divContainer";
		this.getPanes().floatPane.appendChild(this._container);
		this.relayout();
		if (typeof this._onAddCallback === "function")
			this._onAddCallback();
	}

	DivOverlay.prototype.onRemove = function() {
		if (!this._container) return;
		this._container.parentNode.removeChild(this._container);
	}

	DivOverlay.prototype.getContainer = function() {
		return this._container;
	}

	DivOverlay.prototype.appendChild = function(child) {
		if (!this._container) return;
		this._container.appendChild(child);
	}

	DivOverlay.prototype.removeChild = function(child) {
		if (!this._container) return;
		this._container.removeChild(child);
	}

	return DivOverlay;
});