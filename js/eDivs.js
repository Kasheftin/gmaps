define(["gmaps","knockout","underscore","./overlays/divOverlay"],function(gmaps,ko,_,DivOverlay) {

	var Marker = function(m,options) {
		var self = this;
		this.id = m.id;
		this.name = m.name;
		this.coords = m.coords;
		this.map = options.map;
		this.overlay = options.overlay;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.track = m.track;
		this.trackN = 0;
		this._marker = document.createElement("div");
		this._marker.className = "divMarker";
		this._marker.innerHTML = this.name;
		this.overlay.appendChild(this._marker);
		this._trackModel = new gmaps.Polyline({
			map: this.map
		});
		this.preparedCoords = null;
		this.updateCoordsRequired = true;
		this.coordsSubscribe = this.coords.subscribe(function() {
			self.updateCoordsRequired = true;
		})
	}

	Marker.prototype.move = function() {
		if (!this.optimizeGeoCalculations()) {
			this.preparedCoords = this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(this.coords().lat,this.coords().lng));
		}
		else if (this.updateCoordsRequired) {
			this.preparedCoords = this.overlay.performSimpleFakeCoordsCalculation(this.coords().lat,this.coords().lng);
			this.updateCoordsRequired = false;
		}
		var p = this.overlay.abs2rel(this.preparedCoords,this.map.getZoom());
		this._marker.style.top = Math.floor(p.y) + "px";
		this._marker.style.left = Math.floor(p.x) + "px";
	}
	Marker.prototype.destroy = function() {
		this.overlay.removeChild(this._marker);
		this.hideTrack();
		this._trackModel.setMap(null);
		this.coordsSubscribe.dispose();
	}
	Marker.prototype.drawTrack = function(key) {
		var path = this._trackModel.getPath();
		// Destroy last point that is the marker current position
		if (path.length > 0) path.pop();
		for (var i = this.trackN; i < this.track().length; i++) {
			if (this.track()[i].dt > key) break;
			path.push(new gmaps.LatLng(this.track()[i].lat,this.track()[i].lng));
		}
		this.trackN = i;
		// Add last point 
		path.push(new gmaps.LatLng(this.coords().lat,this.coords().lng));
	}
	Marker.prototype.hideTrack = function() {
		if (this.trackN === 0) return;
		var path = this._trackModel.getPath();
		path.clear();
		this.trackN = 0;
	}

	var DivsEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.appMarkers = options.markers;
		this.appCallback = options.callback;
		this.markers = [];
		this.overlay = new DivOverlay({
			map:this.map,
			onAdd: function() {
				self.appMarkers.valueHasMutated();	
				if (typeof self.appCallback === "function") {
					_.defer(self.appCallback);			
				}
			}
		});
		this.boundsListener = gmaps.event.addListener(this.map,"bounds_changed",function() {
			self.overlay.relayout();
			self.render();
		});
		this.zoomListener = gmaps.event.addListener(this.map,"zoom_changed",function() {
			_.each(self.markers,function(marker) {
				marker.updateCoordsRequired = true;
			});
		});
		this.syncSubscribe = ko.utils.sync({
			source: this.appMarkers,
			target: this.markers,
			onAdd: function(m) {
				return new Marker(m,{
					map: self.map,
					overlay: self.overlay,
					optimizeGeoCalculations: self.optimizeGeoCalculations
				});
			},
			onRemove: function(m) {
				m.destroy();
			}
		});
		this.optimizeGeoCalculationsSubscribe = this.optimizeGeoCalculations.subscribe(function() {
			_.each(self.markers,function(marker) {
				marker.updateCoordsRequired = true;
			});
			self.render();
		});
	}

	DivsEngine.prototype.render = function(key,callback) {
		var self = this;
		if (!key) key = this._lastKey;
		this._lastKey = key;
		if (this.overlay) {
			_.each(this.markers,function(marker) {
				marker.move();
				if (self.showTracks()) {
					marker.drawTrack(key);
				}
				else {
					marker.hideTrack();
				}
			});
		}
		if (typeof callback === "function") {
			callback();
		}
	}

	DivsEngine.prototype.resetTracks = function() {
		_.each(this.markers,function(marker) {
			marker.hideTrack();
		});
	}

	DivsEngine.prototype.destroy = function() {
		gmaps.event.removeListener(this.boundsListener);
		this.syncSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.overlay.setMap(null);
		this.optimizeGeoCalculationsSubscribe.dispose();
	}

	return DivsEngine;
})