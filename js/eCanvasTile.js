define(["gmaps","knockout","underscore","./overlays/canvasOverlay","eCanvasMarker","eventEmitter"],function(gmaps,ko,_,CanvasOverlay,Marker,EventEmitter) {

	var CanvasTileMapType = function() { }
	_.extend(CanvasTileMapType.prototype,EventEmitter.prototype);
	CanvasTileMapType.prototype.tileSize = new gmaps.Size(256,256);
	CanvasTileMapType.prototype.getTile = function(coord,zoom,ownerDocument) {
		var canvas = ownerDocument.createElement("canvas");
		canvas.style.pointerEvents = "none";
    	canvas.style.webkitTransform = "translate3d(0,0,0)"; // turn on hw acceleration
	 	canvas.style.imageRendering = "optimizeSpeed";
	 	canvas.width = this.tileSize.width;
	 	canvas.height = this.tileSize.height;
	 	canvas.zoom = zoom;
	 	canvas.coord = coord;
	 	canvas.context = canvas.getContext("2d");
	 	canvas.context.lineWidth = 3;
		this.emit("createTile",canvas);
		return canvas;
	}
	CanvasTileMapType.prototype.releaseTile = function(tile) {
		this.emit("destroyTile",tile);
	}

	var TrackBuffer = function(options) {
		var self = this;
		this.map = options.map;
		this.ct = options.ct;
		this.lines = [];
		this.tiles = {};
		this.zoom = 0;
		this.size = this.ct.tileSize.width;
		this.ct.on("createTile",function(tile) {
			self.zoom = tile.zoom;
			self.tiles[tile.coord.x+"_"+tile.coord.y] = tile;
			self.fillTile(tile);
		});
		this.ct.on("destroyTile",function(tile) {
			if (self.tiles[tile.coord.x+"_"+tile.coord.y])
				delete self.tiles[tile.coord.x+"_"+tile.coord.y];
		});
	}
	TrackBuffer.prototype._lineInTile = function(p1,p2,p,size) {
		if (p1.x>p.x+size && p2.x>p.x+size) return false;
		if (p1.y>p.y+size && p2.y>p.y+size) return false;
		if (p1.x<p.x && p2.x<p.x) return false;
		if (p1.y<p.y && p2.y<p.y) return false;
		return true;
	}
	TrackBuffer.prototype.drawLine = function(line) {
		var self = this;
		var p1 = {
			x: Math.floor(line.p1.x*(1<<self.zoom)),
			y: Math.floor(line.p1.y*(1<<self.zoom))
		}
		var p2 = {
			x: Math.floor(line.p2.x*(1<<self.zoom)),
			y: Math.floor(line.p2.y*(1<<self.zoom))	
		}
		_.each(this.tiles,function(tile) {
			var p = {
				x: tile.coord.x*self.size,
				y: tile.coord.y*self.size
			}
			if (self._lineInTile(p1,p2,p,self.size)) {
				tile.context.beginPath();
				tile.context.moveTo(p1.x-p.x,p1.y-p.y);
				tile.context.lineTo(p2.x-p.x,p2.y-p.y);
				tile.context.stroke();
			}
		});
	}
	TrackBuffer.prototype.fillTile = function(tile) {
		var self = this;
		var p = {
			x: tile.coord.x*self.size,
			y: tile.coord.y*self.size
		}
		tile.context.beginPath();
		_.each(this.lines,function(line) {
			var p1 = {
				x: Math.floor(line.p1.x*(1<<self.zoom)),
				y: Math.floor(line.p1.y*(1<<self.zoom))
			}
			var p2 = {
				x: Math.floor(line.p2.x*(1<<self.zoom)),
				y: Math.floor(line.p2.y*(1<<self.zoom))	
			}
			if (self._lineInTile(p1,p2,p,self.size)) {
				tile.context.moveTo(p1.x-p.x,p1.y-p.y);
				tile.context.lineTo(p2.x-p.x,p2.y-p.y);
			}
		});
		tile.context.stroke();
	}
	TrackBuffer.prototype.addLines = function(lines) {
		var self = this;
		_.each(lines,function(line) {
			self.drawLine(line);
			self.lines.push(line);
		});
	}
	TrackBuffer.prototype.reset = function() {
		_.each(this.tiles,function(tile) {
			tile.height = tile.height;				
			tile.context.lineWidth = 3;
		});
		this.lines = [];
	}

	var CanvasTileEngine = function(options) {
		var self = this;
		this.map = options.map;
		this.showTracks = options.showTracks;
		this.optimizeGeoCalculations = options.optimizeGeoCalculations;
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
					prepareIcons: self.prepareIcons,
					optimizeGeoCalculations: self.optimizeGeoCalculations
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

		this.canvasTileMapType = new CanvasTileMapType;
		this.trackBuffer = new TrackBuffer({
			map: this.map,
			ct: this.canvasTileMapType
		});
		this.map.overlayMapTypes.push(this.canvasTileMapType);

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
			if (self.overlay) {
				self.overlay.relayout();
			}
			self.render();
		});	
		this.showTracksSubscribe = this.showTracks.subscribe(function() {
			self.resetTracks();
			self.render();
		});
		this.optimizeGeoCalculationsSubscribe = this.optimizeGeoCalculations.subscribe(function() {
			_.each(self.markers,function(marker) {
				marker.updateCoordsRequired = true;
			});
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
				self.trackBuffer.addLines(marker.draw(self.overlay,self.context,"getTrackBufferNewLines",key));
			});
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
		this.showTracksSubscribe.dispose();
		_.each(this.markers,function(marker) {
			marker.destroy();
		});
		this.overlay.setMap(null);
		this.map.overlayMapTypes.removeAt(this.map.overlayMapTypes.indexOf(this.canvasTileMapType));
		this.optimizeGeoCalculationsSubscribe.dispose();
	}

	return CanvasTileEngine;
})