define(["gmaps","knockout","underscore","./overlays/canvasOverlay"],function(gmaps,ko,_,CanvasOverlay) {

	var Marker = function(m,options) {
		var self = this;
		this.id = m.id;
		this.name = m.name;
		this.coords = m.coords;
		this.map = options.map;
		this.prepareIcons = options.prepareIcons;
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
		this.updateIconRequired = false;
	}

	Marker.prototype._updateCoords = function() {
		this.preparedCoords = this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(this.coords().lat,this.coords().lng));
		this.updateCoordsRequired = false;
	}

	Marker.prototype.draw = function(overlay,context,type,key) {
		if (this.updateCoordsRequired) {
			this._updateCoords();
		}
		var p = overlay.abs2rel(this.preparedCoords,this.map.getZoom());
		if (type == "icon") {
			if (this.updateIconRequired || !this.prepareIcons()) {
				this._prepareIcon();
			}
			context.drawImage(this.iconCanvas,p.x-this.iconCenter.x,p.y-this.iconCenter.y);
		}
		else if (type == "track" || type == "trackEnd" || type == "staticTrackUpdate") {
			// Prepare track coords
			for (var i = this.trackN; i < this.track().length; i++) {
				var t = this.track()[i]		
				if (t.dt > key) break;
				this.preparedTrack.push(this.map.getProjection().fromLatLngToPoint(new gmaps.LatLng(t.lat,t.lng)));
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
				this.staticTrackN = i-1;
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

	var CanvasEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.useSecondCanvas = options.useSecondCanvas;
		this.prepareIcons = options.prepareIcons;
		this.appMarkers = options.markers;
		this.appCallback = options.callback;
		this.markers = [];

		this.staticOverlay = new CanvasOverlay({
			map:this.map,
			onAdd: function() {
				self.staticContext = self.staticOverlay.getContext();
				self.staticContext.lineWidth = 3;
			}
		});

		this.overlay = new CanvasOverlay({
			map: this.map,
			onAdd: function() {
				self.context = self.overlay.getContext();
				self.appMarkers.valueHasMutated();	
				if (typeof self.appCallback === "function") {
					_.defer(self.appCallback);			
				}
			}
		});

		this.boundsListener = gmaps.event.addListener(self.map,"bounds_changed",function() {
			if (self.staticOverlay)
				self.staticOverlay.relayout();
			if (self.overlay)
				self.overlay.relayout();
			self.resetStaticOverlay();
			self.render();
		});	
		this.syncSubscribe = ko.utils.sync({
			source: this.appMarkers,
			target: this.markers,
			onAdd: function(m) {
				return new Marker(m,{
					map: self.map,
					prepareIcons: self.prepareIcons
				});
			},
			onRemove: function(m) {
				m.destroy();
			}
		});
		this.useSecondCanvasSubscribe = this.useSecondCanvas.subscribe(function() {
			self.resetStaticOverlay();
			self.render();
		});
		this.showTracksSubscribe = this.showTracks.subscribe(function() {
			self.resetStaticOverlay();
			self.render();
		});
	}

	CanvasEngine.prototype.resetStaticOverlay = function() {
		_.each(this.markers,function(marker) {
			marker.staticTrackN = 0;
		});
		this.staticOverlay.clear();
		this.staticContext.lineWidth = 3;
	}

	CanvasEngine.prototype.render = function(key,callback) {
		var self = this;
		if (!key) key = this._lastKey;
		this._lastKey = key;

		if (this.staticOverlay && this.staticContext && this.useSecondCanvas() && this.showTracks()) {
			this.staticContext.beginPath();
			_.each(this.markers,function(marker) {
				marker.draw(self.staticOverlay,self.staticContext,"staticTrackUpdate",key);
			});
			this.staticContext.stroke();
		}

		if (this.overlay && this.context) {
			this.overlay.clear();
			if (this.showTracks()) {
				this.context.lineWidth = 3;
				this.context.beginPath();
				_.each(this.markers,function(marker) {
					marker.draw(self.overlay,self.context,self.useSecondCanvas()?"trackEnd":"track",key);
				});
				this.context.stroke();
			}
			_.each(this.markers,function(marker) {
				marker.draw(self.overlay,self.context,"icon",key);
			});
		}
		if (typeof callback === "function") {
			callback();
		}
	}

	CanvasEngine.prototype.resetTracks = function() {
		_.each(this.markers,function(marker) {
			marker.resetTrack();
		});
		this.resetStaticOverlay();
	}

	CanvasEngine.prototype.destroy = function() {
		gmaps.event.removeListener(this.boundsListener);
		this.syncSubscribe.dispose();
		this.useSecondCanvasSubscribe.dispose();
		this.showTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.overlay.setMap(null);
		this.resetStaticOverlay();
		this.staticOverlay.setMap(null);
	}

	return CanvasEngine;
})