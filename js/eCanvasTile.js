define(["gmaps","knockout","underscore","./overlays/canvasOverlay","eCanvasMarker","eCanvasTileMapType","eCanvasTileTrackBuffer"],function(gmaps,ko,_,CanvasOverlay,Marker,CanvasTileMapType,TrackBuffer) {

	var CanvasTileEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
		this.useSecondCanvas = options.useSecondCanvas;
		this.prepareIcons = options.prepareIcons;
		this.simplifyTracks = options.simplifyTracks;
		this.coloredTracks = options.coloredTracks;
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

		var callback = function() {
			self.appMarkers.valueHasMutated();
			if (typeof self.appCallback === "function") {
				_.defer(self.appCallback);			
			}			
		}
		var canvasTileMapTypeIsReady = false;
		var overlayIsReady = false;

		this.canvasTileMapType = new CanvasTileMapType;
		this.trackBuffer = new TrackBuffer({
			map: this.map,
			ct: this.canvasTileMapType,
			coloredTracks: this.coloredTracks,
			simplifyTracks: this.simplifyTracks,
			onReady: function() {
				canvasTileMapTypeIsReady = true;
				if (canvasTileMapTypeIsReady && overlayIsReady) 
					callback();
			}
		});
		this.map.overlayMapTypes.push(this.canvasTileMapType);
		this.overlay = new CanvasOverlay({
			map: this.map,
			onAdd: function() {
				self.context = self.overlay.getContext();
				overlayIsReady = true;
				if (canvasTileMapTypeIsReady && overlayIsReady) 
					callback();
			}
		});
		this.boundsListener = gmaps.event.addListener(self.map,"bounds_changed",function() {
			if (self.overlay) {
				self.overlay.relayout();
			}
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

	CanvasTileEngine.prototype.render = function(key,callback) {
		var self = this;
		if (!key) key = this._lastKey;
		this._lastKey = key;
		if (this.trackBuffer && this.showTracks() && this.useSecondCanvas()) {
			_.each(this.markers,function(marker) {
//				self.trackBuffer.addLines(marker.draw(self.overlay,self.context,"getTrackBufferNewLines",key));
				self.trackBuffer.appendLine(marker.id,marker.draw(self.overlay,self.context,"getStaticTrackUpdate",key),marker.color);
			});
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

	CanvasTileEngine.prototype.resetTracks = function() {
		_.each(this.markers,function(marker) {
			marker.resetTrack();
		});
		if (this.trackBuffer) {
			this.trackBuffer.reset();
		}
	}

	CanvasTileEngine.prototype.destroy = function() {
		gmaps.event.removeListener(this.boundsListener);
		this.syncSubscribe.dispose();
		this.useSecondCanvasSubscribe.dispose();
		this.optimizeGeoCalculationsSubscribe.dispose();
		this.showTracksSubscribe.dispose();
		this.simplifyTracksSubscribe.dispose();
		this.coloredTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.resetTracks();
		this.overlay.setMap(null);
		this.map.overlayMapTypes.removeAt(this.map.overlayMapTypes.indexOf(this.canvasTileMapType));
	}

	return CanvasTileEngine;
})