define(["gmaps","knockout","underscore","./overlays/canvasOverlay","eCanvasMarker"],function(gmaps,ko,_,CanvasOverlay,Marker) {

	var CanvasEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.useSecondCanvas = options.useSecondCanvas;
		this.prepareIcons = options.prepareIcons;
		this.appMarkers = options.markers;
		this.appCallback = options.callback;

		this.markers = [];
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
			},
			afterRemove: function() {
				self.resetStaticOverlay();
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
			self.resetStaticOverlay();
			self.render();
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