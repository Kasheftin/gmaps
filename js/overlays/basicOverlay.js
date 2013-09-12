define(["gmaps"],function(gmaps) {

	var BasicOverlay = function() { };

	BasicOverlay.prototype = new gmaps.OverlayView();

	BasicOverlay.prototype.setContainerSize = function(w,h) { }
	BasicOverlay.prototype.setContainerOffset = function(l,t) { }
	BasicOverlay.prototype.clear = function() { }
	BasicOverlay.prototype.onAdd = function() { }
	BasicOverlay.prototype.onRemove = function() { }
	BasicOverlay.prototype.draw = function() { }

	BasicOverlay.prototype.relayout = function() {
		if (!this._mapDiv || !this._map) return;
		if (this._width != this._mapDiv.offsetWidth || this._height != this._mapDiv.offsetHeight) {
			this._width = this._mapDiv.offsetWidth;
			this._height = this._mapDiv.offsetHeight;
			this.setContainerSize(this._width,this._height);
		}
		this._bounds = this._map.getBounds();
		this._corner = new gmaps.LatLng(this._bounds.getNorthEast().lat(), this._bounds.getSouthWest().lng());
		this._mapCorner = this._map.getProjection().fromLatLngToPoint(this._corner);

		var proj = this.getProjection();
		if (proj) {
			this._pxCorner = proj.fromLatLngToDivPixel(this._corner);
			this.setContainerOffset(this._pxCorner.x,this._pxCorner.y);
		}
	}

	BasicOverlay.prototype.abs2rel = function(uniPx,zoom) {
		var scale = 1 << zoom;
		return { x: ((uniPx.x - this._mapCorner.x) * scale) >> 0, y: ((uniPx.y - this._mapCorner.y) * scale) >> 0 };
	}

	BasicOverlay.prototype.getPixelCoordsNonOptimized = function(coords) {
		var proj = this.getProjection();
		return proj.fromLatLngToDivPixel(coords);
	} 

	BasicOverlay.prototype.inViewport = function(center,radius) {
		if (center.x + radius < 0 || center.x - radius > this._width) return false;
		if (center.y + radius < 0 || center.y - radius > this._height) return false;
		return true;
	}

	BasicOverlay.prototype.getCenter = function() {
		return {x:Math.floor(this._width/2),y:Math.floor(this._height/2)};
	}

	BasicOverlay.prototype.getHeight = function() {
		return this._height;
	}

	BasicOverlay.prototype.getWidth = function() {
		return this._width;
	}

	return BasicOverlay;
});