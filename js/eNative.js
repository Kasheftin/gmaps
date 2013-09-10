define(["gmaps","knockout","underscore"],function(gmaps,ko,_) {
	var Ufo = function(m,map) {
		this.id = m.id;
		this.coords = m.coords;
		this._marker = new gmaps.Marker(new gmaps.LatLng(this.coords().lat,this.coords().lng));
		this._marker.setMap(map);
	}
	Ufo.prototype.move = function() {
		this._marker.setPosition(new gmaps.LatLng(this.coords().lat,this.coords().lng));
	}
	Ufo.prototype.destroy = function() {
		this._marker.setMap(null);
	}

	var NativeEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.markers = [];
		this.syncSubscribe = ko.utils.sync({
			source: options.markers,
			target: this.markers,
			onAdd: function(m) {
				return new Ufo(m,self.map);
			},
			onRemove: function(ufo) {
				ufo.destroy();
			}
		});
		options.markers.valueHasMutated();
	}

	NativeEngine.prototype.render = function(callback) {
		_.each(this.markers,function(marker) {
			marker.move();
		});
		if (typeof callback === "function") {
			callback();
		}
	}

	NativeEngine.prototype.destroy = function() {
		this.syncSubscribe.dispose();
	}

	return NativeEngine;
})