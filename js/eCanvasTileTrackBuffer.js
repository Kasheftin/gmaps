define(function() {

	var TrackBuffer = function(options) {
		var self = this;
		this.map = options.map;
		this.ct = options.ct;
		this.coloredTracks = options.coloredTracks;
		this.simplifyTracks = options.simplifyTracks;
		this.simplifyTracksPrecision = 10;
		this.lines = {};
		this.tiles = {};
		this.newTilesIndex = {};
		this.zoom = 0;
		this.size = this.ct.tileSize.width;
		this.ct.on("destroyTile",function(tile) {
			if (self.tiles[tile.coord.x+"_"+tile.coord.y])
				delete self.tiles[tile.coord.x+"_"+tile.coord.y];
		});
		var createTileTimeout = null;
		this.ct.on("createTile",function(tile) {
			if (createTileTimeout) clearTimeout(createTileTimeout);
			self.tiles[tile.coord.x+"_"+tile.coord.y] = tile;
			self.newTilesIndex[tile.coord.x+"_"+tile.coord.y] = true;
			// all tiles in this.tiles has the same zoom so we save it directly into TrackBuffer
			self.zoom = tile.zoom;
			createTileTimeout = setTimeout(function() {
				createTileTimeout = null;
				self._refreshTilesBounds();
				self._drawLines(self.lines,"newTiles");
				self.newTilesIndex = {};
				self.isReady = true;
				if (typeof options.onReady === "function") 
					options.onReady();
			},100);
		});
	}

	TrackBuffer.prototype._refreshTilesBounds = function() {
		this.bounds = {minX:null,minY:null,maxX:null,maxY:null};
		for (var i in this.tiles) {
			if (this.tiles.hasOwnProperty(i)) {
				if (!this.bounds.minX || this.bounds.minX > this.tiles[i].coord.x) this.bounds.minX = this.tiles[i].coord.x;
				if (!this.bounds.maxX || this.bounds.maxX < this.tiles[i].coord.x) this.bounds.maxX = this.tiles[i].coord.x;
				if (!this.bounds.minY || this.bounds.minY > this.tiles[i].coord.y) this.bounds.minY = this.tiles[i].coord.y;
				if (!this.bounds.maxY || this.bounds.maxY < this.tiles[i].coord.y) this.bounds.maxY = this.tiles[i].coord.y;				
			}
		}
		this.bounds.maxX++;
		this.bounds.maxY++;
		this.bounds.minX *= this.size;
		this.bounds.maxX *= this.size;
		this.bounds.minY *= this.size;
		this.bounds.maxY *= this.size;
	}

	TrackBuffer.prototype._drawLines = function(lines,mode) {
		var tiles2fill = {};
		for (var id in lines) {
			if (lines.hasOwnProperty(id)) {
				var line = this.lines[id];
				if (!line || line.data.length==0) continue;
				var startIndex = mode=="newLines"?line.dataI:0;

				if (this.coloredTracks()) tiles2fill = {};

				for (var i = startIndex; i < line.data.length; i++) {
					var xy = {
						x: (line.data[i].x*(1<<this.zoom))>>0,
						y: (line.data[i].y*(1<<this.zoom))>>0
					}
					var nn = {
						x: (xy.x/this.size)>>0,
						y: (xy.y/this.size)>>0
					}
					if (i>startIndex) {
						if (this.simplifyTracks() && (i+1<line.data.length) && Math.pow(xy.x-xyPrev.x,2)+Math.pow(xy.y-xyPrev.y,2)<Math.pow(this.simplifyTracksPrecision,2)) continue;
						for (var xI = Math.min(nn.x,nnPrev.x), xN = Math.max(nn.x,nnPrev.x); xI <= xN; xI++) {
							if ((xI+1)*this.size<this.bounds.minX) continue;
							if (xI*this.size>this.bounds.maxX) break;
							for (var yI = Math.min(nn.y,nnPrev.y), yN = Math.max(nn.y,nnPrev.y); yI <= yN; yI++) {
								if ((yI+1)*this.size<this.bounds.minY) continue;
								if (yI*this.size>this.bounds.maxY) break;
								var t = this.tiles[xI+"_"+yI];
								if (!t) continue;
								if (mode=="newTiles" && !this.newTilesIndex[xI+"_"+yI]) continue;
								if (!tiles2fill[xI+"_"+yI]) {
									if (this.coloredTracks())
										t.context.strokeStyle = this.coloredTracks() ? line.color : "#000000";
									t.context.beginPath();
									tiles2fill[xI+"_"+yI] = true;
								}
								t.context.moveTo(xyPrev.x-t.offset.x,xyPrev.y-t.offset.y);
								t.context.lineTo(xy.x-t.offset.x,xy.y-t.offset.y);
							}
						}
					}
					var xyPrev = xy;
					var nnPrev = nn;
				}
				if (mode=="newLines") {
					line.dataI = line.data.length-1;
				}
				if (this.coloredTracks())
					for (var i in tiles2fill)
						this.tiles[i].context.stroke();
			}
		}
		if (!this.coloredTracks())
			for (var i in tiles2fill)
				this.tiles[i].context.stroke();
	}

	TrackBuffer.prototype.appendLine = function(id,data,color) {
		if (data.length == 0) return;
		if (!this.lines[id]) this.lines[id] = {data:[],dataI:0,color:color};
		for (var i = 0; i < data.length; i++)
			this.lines[id].data.push(data[i]);
		var ar = {};
		ar[id] = this.lines[id];
		this._drawLines(ar,"newLines");
	}

	TrackBuffer.prototype.reset = function() {
		_.each(this.tiles,function(tile) {
			tile.canvas.height = tile.canvas.height;				
			tile.context.lineWidth = 3;
		});
		this.lines = {};
	}

	return TrackBuffer;
});