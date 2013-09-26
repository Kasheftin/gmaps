define(["gmaps","underscore"],function(gmaps,_) {

	var MarkerBase = function() { }

	MarkerBase.prototype.initialize = function(m,options) {
		this.id = m.id;
		this.name = m.name;
		this.color = m.color;
		this.coords = m.coords;
		this.map = options.map;
		this.useSecondPolyline = options.useSecondPolyline;
		this.coloredTracks = options.coloredTracks;
		this.track = m.track;
		this.trackN = 0;
		this._trackModel = new gmaps.Polyline({
			map: this.map,
			strokeColor: options.coloredTracks()?this.color:"#000000"
		});
		this._trackStartModel = new gmaps.Polyline({
			map: this.map,
			strokeColor: options.coloredTracks()?this.color:"#000000"
		});
	}

	MarkerBase.prototype.move = function() { }

	MarkerBase.prototype.recolorTrack = function(isColored) {
		this._trackModel.setOptions({strokeColor:isColored?this.color:"#000000"});
		this._trackStartModel.setOptions({strokeColor:isColored?this.color:"#000000"});
	}

	MarkerBase.prototype.drawTrack = function(key) {
		this._trackModel.setMap(this.map);
		if (this.useSecondPolyline()) {
			this._trackStartModel.setMap(this.map);
			var path = this._trackStartModel.getPath();
			for (var i = this.trackN; i < this.track.data.length; i++) {
				if (this.track.data[i].dt >= key) break;
				path.push(new gmaps.LatLng(this.track.data[i].lat,this.track.data[i].lng));				
			}
			this.trackN = i;
			if (this.trackN > 0) {
				this._trackModel.setPath([
					new gmaps.LatLng(this.track.data[this.trackN-1].lat,this.track.data[this.trackN-1].lng),
					new gmaps.LatLng(this.coords.lat,this.coords.lng)
				]);
			}
		}
		else {
			var path = this._trackModel.getPath();
			// Destroy last point that is the markerBase current position
			if (path.length > 0) path.pop();
			for (var i = this.trackN; i < this.track.data.length; i++) {
				if (this.track.data[i].dt >= key) break;
				path.push(new gmaps.LatLng(this.track.data[i].lat,this.track.data[i].lng));
			}
			this.trackN = i;
			// Add last point 
			path.push(new gmaps.LatLng(this.coords.lat,this.coords.lng));			
		}
	}

	MarkerBase.prototype.resetTrack = function() {
		this._trackModel.setPath([]);
		this._trackStartModel.setPath([]);
		this.trackN = 0;
	}

	MarkerBase.prototype.hideTrack = function() {
		this._trackModel.setMap(null);
		this._trackStartModel.setMap(null);
	}

	MarkerBase.prototype.removeTrack = function() {
		this.resetTrack();
		this._trackModel.setMap(null);
		this._trackStartModel.setMap(null);
	}

	return MarkerBase;
});