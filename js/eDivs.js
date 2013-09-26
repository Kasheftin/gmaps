define(["gmaps","knockout","underscore","eNativeMarker","./overlays/divOverlay"],function(gmaps,ko,_,MarkerBase,DivOverlay) {

	var Marker = function(m,options) {
		var self = this;
		this.initialize(m,options);
		this._marker = document.createElement("div");
		this._marker.className = "divMarker";
		this._marker.innerHTML = this.name;
		this.overlay = options.overlay;
		this.overlay.appendChild(this._marker);
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.preparedCoords = null;
	}
	_.extend(Marker.prototype,MarkerBase.prototype);
	Marker.prototype.move = function() {
		if (this.optimizeGeoCalculations()) {
			this.preparedCoords = this.overlay.ll2p(this.coords.lat,this.coords.lng);
		}
		else {
			this.preparedCoords = this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(this.coords.lat,this.coords.lng));
		}
		var p = this.overlay.abs2rel(this.preparedCoords,this.map.getZoom());
		if (!this._prevP || p.x!=this._prevP.x || p.y!=this._prevP.y) {
			this._marker.style.top = Math.floor(p.y) + "px";
			this._marker.style.left = Math.floor(p.x) + "px";
			this._prevP = p;
		}
	}
	Marker.prototype.destroy = function() {
		this.overlay.removeChild(this._marker);
		this.removeTrack();
	}

	var DivsEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.useSecondPolyline = options.useSecondPolyline;
		this.coloredTracks = options.coloredTracks;
		this.appMarkers = options.markers;
		this.appCallback = options.callback;
		this.markers = [];
		this.overlay = new DivOverlay({
			map:this.map,
			onAdd: function() {
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
					optimizeGeoCalculations: self.optimizeGeoCalculations,
					useSecondPolyline: self.useSecondPolyline,
					coloredTracks: self.coloredTracks
				});
			},
			afterAdd: function() {
			},
			onRemove: function(m) {
				m.destroy();
			}
		});
		this.optimizeGeoCalculationsSubscribe = this.optimizeGeoCalculations.subscribe(function() {
			self.render();
		});
		this.useSecondPolylineSubscribe = this.useSecondPolyline.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.coloredTracksSubscribe = this.coloredTracks.subscribe(function(v) {
			self.recolorTracks(v);
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
			marker.resetTrack();
		});
	}

	DivsEngine.prototype.recolorTracks = function(v) {
		_.each(this.markers,function(marker) {
			marker.recolorTrack(v);
		});
	}

	DivsEngine.prototype.destroy = function() {
		gmaps.event.removeListener(this.boundsListener);
		this.syncSubscribe.dispose();
		this.useSecondPolylineSubscribe.dispose();
		this.optimizeGeoCalculationsSubscribe.dispose();
		this.coloredTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.overlay.setMap(null);
	}

	return DivsEngine;
})