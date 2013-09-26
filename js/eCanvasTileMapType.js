define(["gmaps","eventEmitter"],function(gmaps,EventEmitter) {

	var CanvasTileMapType = function() { }

	_.extend(CanvasTileMapType.prototype,EventEmitter.prototype);

	CanvasTileMapType.prototype.tileSize = new gmaps.Size(256,256);

	CanvasTileMapType.prototype.getTile = function(coord,zoom,ownerDocument) {
		var tile = {
			coord: coord,
			zoom: zoom,
			size: this.tileSize.width,
			offset: {
				x: coord.x*this.tileSize.width,
				y: coord.y*this.tileSize.height
			}
		};
		tile.canvas = ownerDocument.createElement("canvas");
		tile.canvas.style.pointerEvents = "none";
    	tile.canvas.style.webkitTransform = "translate3d(0,0,0)"; // turn on hw acceleration
	 	tile.canvas.style.imageRendering = "optimizeSpeed";
	 	tile.canvas.width = tile.size;
	 	tile.canvas.height = tile.size;
	 	tile.canvas.tile = tile;
	 	tile.context = tile.canvas.getContext("2d");
	 	tile.context.lineWidth = 3;
		this.emit("createTile",tile);
		return tile.canvas;
	}

	CanvasTileMapType.prototype.releaseTile = function(canvas) {
		this.emit("destroyTile",canvas.tile);
	}

	return CanvasTileMapType;
});