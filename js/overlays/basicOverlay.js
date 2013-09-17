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

		var ne = this._bounds.getNorthEast();
		var sw = this._bounds.getSouthWest();

		this._tlCorner = new gmaps.LatLng(ne.lat(),sw.lng());
		this._brCorner = new gmaps.LatLng(sw.lat(),ne.lng());

		this._sqTlCorner = this._map.getProjection().fromLatLngToPoint(this._tlCorner);
		this._sqBrCorner = this._map.getProjection().fromLatLngToPoint(this._brCorner);

		var proj = this.getProjection();
		if (proj) {
			this._pxTlCorner = proj.fromLatLngToDivPixel(this._tlCorner);
			this.setContainerOffset(this._pxTlCorner.x,this._pxTlCorner.y);
		}
	}

	BasicOverlay.prototype.performSimpleFakeCoordsCalculation = function(lat,lng) {
		return {
			x: this._sqTlCorner.x+(lng-this._tlCorner.lng())/(this._brCorner.lng()-this._tlCorner.lng())*(this._sqBrCorner.x-this._sqTlCorner.x),
			y: this._sqTlCorner.y+(lat-this._tlCorner.lat())/(this._brCorner.lat()-this._tlCorner.lat())*(this._sqBrCorner.y-this._sqTlCorner.y)
		}
	}

	BasicOverlay.prototype.abs2rel = function(uniPx,zoom) {
		var scale = 1 << zoom;
		return { x: ((uniPx.x - this._sqTlCorner.x) * scale) >> 0, y: ((uniPx.y - this._sqTlCorner.y) * scale) >> 0 };
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