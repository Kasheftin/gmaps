define(["gmaps","underscore"],function(gmaps,_) {

	var Marker = function(m,options) {
		var self = this;
		this.id = m.id;
		this.name = m.name;
		this.coords = m.coords;
		this.map = options.map;
		this.prepareIcons = options.prepareIcons;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.track = m.track;
		this.preparedCoords = null;
		this.preparedTrack = [];
		this.trackN = 0;
		this.staticTrackN = 0;
		this.updateIconRequired = true;
		this.updateCoordsRequired = true;
		this.coordsSubscribe = this.coords.subscribe(function() {
			self.updateCoordsRequired = true;
		});
	}

	Marker.prototype._prepareIcon = function() {
		this.iconSize = 30;
		this.iconCenter = {x:this.iconSize/2,y:this.iconSize};
		this.iconCanvas = document.createElement("canvas");
		this.iconCanvas.width = 180;
		this.iconCanvas.height = this.iconSize;

		var ic = this.iconCanvas.getContext("2d");

		// The icon
		ic.fillStyle = "#fc0d1b";
		ic.strokeStyle = "#800000";
		ic.beginPath();
		ic.moveTo(this.iconCenter.x,this.iconCenter.y);
		ic.arc(this.iconCenter.x,this.iconCenter.y,this.iconSize-1,Math.PI*4/3,Math.PI*5/3);
		ic.lineTo(this.iconCenter.x,this.iconCenter.y);
		ic.fill();
		ic.stroke();

		// The pilot's name
		ic.fillStyle = "#000000";
		ic.strokeStyle = "#ffffff";
		ic.lineWidth = 2;
		ic.font = "14px arial";
		ic.strokeText(this.name,this.iconCenter.x+5,this.iconCenter.y-8);
		ic.fillText(this.name,this.iconCenter.x+5,this.iconCenter.y-8);
	}

	Marker.prototype._getPreparedCoords = function(map,overlay,lat,lng) {
		if (this.optimizeGeoCalculations()) {
			return overlay.performSimpleFakeCoordsCalculation(lat,lng);
		}
		else {
			return map.getProjection().fromLatLngToPoint(new gmaps.LatLng(lat,lng));
		}		
	}

	Marker.prototype.draw = function(overlay,context,type,key) {
		if (this.updateCoordsRequired) {
			this.preparedCoords = this._getPreparedCoords(this.map,overlay,this.coords().lat,this.coords().lng);
			this.updateCoordsRequired = false;
		}
		var p = overlay.abs2rel(this.preparedCoords,this.map.getZoom());
		if (type == "icon") {
			if (this.updateIconRequired || !this.prepareIcons()) {
				this._prepareIcon();
				this.updateIconRequired = false;
			}
			context.drawImage(this.iconCanvas,p.x-this.iconCenter.x,p.y-this.iconCenter.y);
		}
		else if (type == "track" || type == "trackEnd" || type == "staticTrackUpdate" || type == "getTrackBufferNewLines") {
			// Prepare track coords
			for (var i = this.trackN; i < this.track().length; i++) {
				var t = this.track()[i]		
				if (t.dt > key) break;
				this.preparedTrack.push(this._getPreparedCoords(this.map,overlay,t.lat,t.lng));
			}
			this.trackN = i;

			if (type == "track") {
				context.moveTo(p.x,p.y);
				for (var i = this.preparedTrack.length-1; i>=0; i--) {
					var t = overlay.abs2rel(this.preparedTrack[i],this.map.getZoom());
					context.lineTo(t.x,t.y);
				}
			}
			else if (type == "trackEnd") {
				context.moveTo(p.x,p.y);
				var t = overlay.abs2rel(_.last(this.preparedTrack),this.map.getZoom());
				context.lineTo(t.x,t.y);
			}
			else if (type == "staticTrackUpdate" && this.staticTrackN+1<this.preparedTrack.length) {
				var t = overlay.abs2rel(this.preparedTrack[this.staticTrackN],this.map.getZoom());
				context.moveTo(t.x,t.y);
				for (var i = this.staticTrackN+1; i < this.preparedTrack.length; i++) {
					var t = overlay.abs2rel(this.preparedTrack[i],this.map.getZoom());
					context.lineTo(t.x,t.y);
				}
				this.staticTrackN = this.preparedTrack.length-1;
			}
			else if (type == "getTrackBufferNewLines") {
				var lines = [];
				if (this.staticTrackN+1<this.preparedTrack.length) {
					for (var i = this.staticTrackN+1; i < this.preparedTrack.length; i++) {
						var p1 = this.preparedTrack[i-1];
						var p2 = this.preparedTrack[i];
						lines.push({p1:p1,p2:p2});
					}
					this.staticTrackN = i-1;
				}
				return lines;
			}
		}
	}

	Marker.prototype.resetTrack = function() {
		this.preparedTrack = [];
		this.trackN = 0;
		this.staticTrackN = 0;
	}

	Marker.prototype.destroy = function() {
		this.coordsSubscribe.dispose();
	}

	return Marker;
});