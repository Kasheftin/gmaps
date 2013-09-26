define(["gmaps","knockout","underscore","eNativeMarker"],function(gmaps,ko,_,MarkerBase) {

	var Marker = function(m,options) {
		this.initialize(m,options);
		this._marker = new gmaps.Marker(new gmaps.LatLng(this.coords.lat,this.coords.lng));
		this._marker.setMap(this.map);
	}
	_.extend(Marker.prototype,MarkerBase.prototype);
	Marker.prototype.move = function() {
		this._marker.setPosition(new gmaps.LatLng(this.coords.lat,this.coords.lng));
	}
	Marker.prototype.destroy = function() {
		this.removeTrack();
		this._marker.setMap(null);
	}

	var NativeEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.useSecondPolyline = options.useSecondPolyline;
		this.coloredTracks = options.coloredTracks;
		this.markers = [];
		this.syncSubscribe = ko.utils.sync({
			source: options.markers,
			target: this.markers,
			onAdd: function(m) {
				return new Marker(m,{
					map: self.map,
					useSecondPolyline: self.useSecondPolyline,
					coloredTracks: self.coloredTracks
				});
			},
			onRemove: function(m) {
				m.destroy();
			}
		});
		this.useSecondPolylineSubscribe = this.useSecondPolyline.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.coloredTracksSubscribe = this.coloredTracks.subscribe(function(v) {
			self.recolorTracks(v);
		});
		// The reason of using defer is that otherway callback runs before initialized new NativeEngine var is returned to constructor
		if (typeof options.callback === "function") {
			_.defer(options.callback);			
		}
	}

	NativeEngine.prototype.render = function(key,callback) {
		var self = this;
		if (!key) key = this._lastKey;
		this._lastKey = key;
		_.each(this.markers,function(marker) {
			marker.move();
			if (self.showTracks()) {
				marker.drawTrack(key);
			}
			else {
				marker.hideTrack();
			}
		});
		if (typeof callback === "function") {
			callback();
		}
	}

	NativeEngine.prototype.resetTracks = function() {
		_.each(this.markers,function(marker) {
			marker.resetTrack();
		});
	}

	NativeEngine.prototype.recolorTracks = function(v) {
		_.each(this.markers,function(marker) {
			marker.recolorTrack(v);
		});
	}

	NativeEngine.prototype.destroy = function() {
		this.syncSubscribe.dispose();
		this.useSecondPolylineSubscribe.dispose();
		this.coloredTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
	}

	return NativeEngine;
})