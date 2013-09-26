define(["gmaps","knockout","underscore","./overlays/canvasOverlay","eCanvasMarker"],function(gmaps,ko,_,CanvasOverlay,Marker) {

	var CanvasEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.useSecondCanvas = options.useSecondCanvas;
		this.coloredTracks = options.coloredTracks;
		this.prepareIcons = options.prepareIcons;
		this.simplifyTracks = options.simplifyTracks;
		this.appMarkers = options.markers;
		this.appCallback = options.callback;

		this.markers = [];
		this.syncSubscribe = ko.utils.sync({
			source: this.appMarkers,
			target: this.markers,
			onAdd: function(m) {
				return new Marker(m,{
					map: self.map,
					prepareIcons: self.prepareIcons,
					optimizeGeoCalculations: self.optimizeGeoCalculations,
					simplifyTracks: self.simplifyTracks
				});
			},
			onRemove: function(m) {
				m.destroy();
			},
			afterRemove: function() {
				self.resetTracks();
				self.render();
			}
		});

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
			self.resetTracks();
			self.render();
		});	
		this.useSecondCanvasSubscribe = this.useSecondCanvas.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.showTracksSubscribe = this.showTracks.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.optimizeGeoCalculationsSubscribe = this.optimizeGeoCalculations.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.simplifyTracksSubscribe = this.simplifyTracks.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.coloredTracksSubscribe = this.coloredTracks.subscribe(function() {
			self.resetTracks();
			self.render();
		});
	}

	CanvasEngine.prototype.render = function(key,callback) {
		var self = this;
		if (!key) key = this._lastKey;
		this._lastKey = key;

		if (this.staticOverlay && this.staticContext && this.useSecondCanvas() && this.showTracks()) {
			if (this.coloredTracks()) {
				_.each(this.markers,function(marker) {
					self.staticContext.strokeStyle = marker.color;
					self.staticContext.beginPath();
					marker.draw(self.staticOverlay,self.staticContext,"staticTrackUpdate",key);
					self.staticContext.stroke();
				});
			}
			else {
				this.staticContext.strokeStyle = "#000000";
				this.staticContext.beginPath();
				_.each(this.markers,function(marker) {
					marker.draw(self.staticOverlay,self.staticContext,"staticTrackUpdate",key);
				});
				this.staticContext.stroke();				
			}
		}

		if (this.overlay && this.context) {
			this.overlay.clear();
			if (this.showTracks()) {
				this.context.lineWidth = 3;
				if (this.coloredTracks()) {
					_.each(this.markers,function(marker) {
						self.context.beginPath();
						self.context.strokeStyle = marker.color;
						self.context.beginPath();
						marker.draw(self.overlay,self.context,self.useSecondCanvas()?"trackEnd":"track",key);
						self.context.stroke();
					});
				}
				else {
					this.context.strokeStyle = "#000000";
					this.context.beginPath();
					_.each(this.markers,function(marker) {
						marker.draw(self.overlay,self.context,self.useSecondCanvas()?"trackEnd":"track",key);
					});
					this.context.stroke();					
				}
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
		this.staticOverlay.clear();
		this.staticContext.lineWidth = 3;
	}

	CanvasEngine.prototype.destroy = function() {
		gmaps.event.removeListener(this.boundsListener);
		this.syncSubscribe.dispose();
		this.useSecondCanvasSubscribe.dispose();
		this.optimizeGeoCalculationsSubscribe.dispose();
		this.coloredTracksSubscribe.dispose();
		this.showTracksSubscribe.dispose();
		this.simplifyTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.resetTracks();
		this.overlay.setMap(null);
		this.staticOverlay.setMap(null);
	}

	return CanvasEngine;
})