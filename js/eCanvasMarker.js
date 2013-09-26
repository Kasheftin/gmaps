define(["gmaps"],function(gmaps) {

	var Marker = function(m,options) {
		var self = this;
		this.id = m.id;
		this.name = m.name;
		this.color = m.color;
		this.coords = m.coords;
		this.track = m.track;
		this.map = options.map;
		this.prepareIcons = options.prepareIcons;
		this.simplifyTracks = options.simplifyTracks;
		this.simplifyTracksPrecision = 10;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.trackN = 0;
		this.trackK = 0;
		this.trackLastPrintedPoint = null;
		this.updateIconRequired = true;
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

	Marker.prototype._getXY = function(overlay,coords) {
		if (this.optimizeGeoCalculations()) {
			return overlay.ll2xy(coords.lat,coords.lng,this.map.getZoom());
		}
		else {
			return overlay.abs2rel(this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(coords.lat,coords.lng)),this.map.getZoom());
		}	
	}

	Marker.prototype._getP = function(overlay,coords) {
		if (this.optimizeGeoCalculations()) {
			return overlay.ll2p(coords.lat,coords.lng);
		}
		else {
			return this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(coords.lat,coords.lng));
		}	
	}

	Marker.prototype.draw = function(overlay,context,type,key) {
		if (type == "icon") {
			if (!overlay.llInViewport(this.coords)) return;
			if (this.updateIconRequired || !this.prepareIcons()) {
				this._prepareIcon();
				this.updateIconRequired = false;
			}
			var p = this._getXY(overlay,this.coords);
			context.drawImage(this.iconCanvas,p.x-this.iconCenter.x,p.y-this.iconCenter.y);
		}
		else if (type == "track") {
			for (var i=0; i<this.track.data.length && this.track.data[i].dt<=key; i++) {
				var t = this._getXY(overlay,this.track.data[i]);
				if (i>0) context.lineTo(t.x,t.y);
				else context.moveTo(t.x,t.y);
			}
			var p = this._getXY(overlay,this.coords);
			context.lineTo(p.x,p.y);
		}
		else if (type == "staticTrackUpdate") {
			// this.track.trackI should be the last point in this.track.data with dt less than current
			// that means this.track.data[this.track.trackI].dt < dt and this.track.data[this.track.trackI+1] >= dt;	
			if (this.trackK>=this.track.trackI) return;
			var p = this._getXY(overlay,this.track.data[this.trackN]);
			var startNewLine = false;
			context.moveTo(p.x,p.y);
			for (var i=this.trackK+1; i<=this.track.trackI; i++) {
				var p2 = this._getXY(overlay,this.track.data[i]);
				if ((i==this.trackN || !overlay.llInViewport(this.track.data[i-1])) && !overlay.llInViewport(this.track.data[i]) && (i==this.track.trackI || !overlay.llInViewport(this.track.data[i+1]))) {
					startNewLine = true;
					continue;
				}
				if (startNewLine || !this.simplifyTracks() || Math.pow(p2.x-p.x,2)+Math.pow(p2.y-p.y,2)>Math.pow(this.simplifyTracksPrecision,2)) {
					if (startNewLine)
						context.moveTo(p2.x,p2.y);
					else
						context.lineTo(p2.x,p2.y);
					p = p2;
					this.trackN = i;
					startNewLine = false;
				}
			}
			this.trackK = this.track.trackI;
		}
		else if (type == "trackEnd") {
			if (overlay.llInViewport(this.track.data[this.trackN]) || overlay.llInViewport(this.coords)) {
				var p1 = this._getXY(overlay,this.track.data[this.trackN]);
				var p2 = this._getXY(overlay,this.coords);
				context.moveTo(p1.x,p1.y);
				context.lineTo(p2.x,p2.y);
			}
		}
		else if (type == "getTrackBufferNewLines") {
			var lines = [];
			if (this.trackN>=this.track.trackI) return lines;
			for (var i = this.trackN+1; i<=this.track.trackI; i++) {
				lines.push({
					p1: this._getP(overlay,this.track.data[i-1]),
					p2: this._getP(overlay,this.track.data[i])
				});
			}
			this.trackN = this.track.trackI;
			return lines;
		}
		else if (type == "getStaticTrackUpdate") {
			var data = [];
			if (this.trackN>=this.track.trackI) return data;
			for (var  i = this.trackN>0?this.trackN+1:0; i<=this.track.trackI; i++) {
				data.push(this._getP(overlay,this.track.data[i]));
			}
			this.trackN = this.track.trackI;
			return data;
		}

/*
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
				var t = overlay.abs2rel(this.trackLastPrintedPoint ? this.trackLastPrintedPoint : this.preparedTrack[this.staticTrackN],this.map.getZoom());
				context.moveTo(p.x,p.y);
				context.lineTo(t.x,t.y);
			}
			else if (type == "staticTrackUpdate" && this.staticTrackN+1<this.preparedTrack.length) {
				var t = overlay.abs2rel(this.trackLastPrintedPoint ? this.trackLastPrintedPoint : this.preparedTrack[this.staticTrackN],this.map.getZoom());
				context.moveTo(t.x,t.y);
				for (var i = this.staticTrackN+1; i < this.preparedTrack.length; i++) {
					var t2 = overlay.abs2rel(this.preparedTrack[i],this.map.getZoom());
					if (!this.simplifyTracks() || Math.pow(t2.x-t.x,2)+Math.pow(t2.y-t.y,2)>this.simplifyTracksPrecision) {
						context.lineTo(t2.x,t2.y);
						t = t2;
						this.trackLastPrintedPoint = this.preparedTrack[i];
					}
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
*/
	}

	Marker.prototype.destroyTrack = function() {
		this.trackN = 0;
		this.trackK = 0;
	}

	Marker.prototype.resetTrack = function() {
		this.trackN = 0;
		this.trackK = 0;
	}

	Marker.prototype.destroy = function() {

	}

	return Marker;
});