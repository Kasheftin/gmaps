define(["knockout","underscore","gmaps","marker","eNative","eDivs","eCanvas","eCanvasTile","utils"],function(ko,_,gmaps,Marker,NativeEngine,DivsEngine,CanvasEngine,CanvasTileEngine) {

	window.requestAnimFrame = (function() {
		return  window.requestAnimationFrame       ||
		        window.webkitRequestAnimationFrame ||
		        window.mozRequestAnimationFrame    ||
		        function(callback) {
		          window.setTimeout(callback, 1000 / 60);
		        };
	})();

	var App = function() {
		var self = this;

		this.isReady = ko.observable(false);
		this.isVisible = ko.observable(false);
		this.amount = ko.observable(1);
		this.bounds = {
			tlLat: ko.observable(48.740),
			tlLng: ko.observable(19.140),
			brLat: ko.observable(48.718),
			brLng: ko.observable(19.222)
		}
		this.speed = ko.observable(0.01);
		this.angle = ko.observable(300);
		this.moveProb = ko.observable(1);
		this.holdProb = ko.observable(0.2);
		this.showTracks = ko.observable(true);
		this.showBounds = ko.observable(false);
		this.optimizeGeoCalculations = ko.observable(true);
		this.useSecondCanvas = ko.observable(true);
		this.prepareIcons = ko.observable(true);
		this.animate = ko.observable(true);
		this.fps = ko.observable(0);

		this.key = ko.observable(Math.floor((new Date).getTime()/60000)*60000);

		this.markers = ko.observableArray([]);
		this.amount.subscribe(function(cnt) {
			if (!(cnt > 0)) cnt = 0;
			var l = self.markers().length;
			if (l > cnt) {
				for (var i = cnt; i < l; i++)
					self.markers()[i].destroy();
				self.markers.splice(cnt,l);
			}
			var ar2push = [];
			for (var i = l; i < cnt; i++) {
				ar2push.push(new Marker(i,{
					bounds: self.bounds,
					speed: self.speed,
					angle: self.angle,
					moveProb: self.moveProb,
					holdProb: self.holdProb,
					animate: self.animate
				}));
			}
			ko.utils.arrayPushAll(self.markers,ar2push);
			self.run();
		});

		this.engines = ["native","divs","canvas","canvasTile"];
		this.engineName = ko.observable(_.first(this.engines));
		this.engine = null;
		this.engineName.subscribe(function(name) {
			if (self.engine) {
				self.engine.destroy();
				delete self.engine;
			}
			var opts = {
				markers: self.markers,
				map: self.map,
				showTracks: self.showTracks,
				optimizeGeoCalculations: self.optimizeGeoCalculations,
				useSecondCanvas: self.useSecondCanvas,
				prepareIcons: self.prepareIcons,
				callback: function() {
					self.run();
				}
			}
			if (name == "native") self.engine = new NativeEngine(opts);
			else if (name == "divs") self.engine = new DivsEngine(opts);
			else if (name == "canvas") self.engine = new CanvasEngine(opts);
			else if (name == "canvasTile") self.engine = new CanvasTileEngine(opts);
		});

		this.boundingBox = null;
		this.boundingBoxInitializer = ko.computed(function() {
			if (self.boundingBox) {
				self.boundingBox.setMap(null);
				delete self.boundingBox;
			}
			if (self.showBounds() && self.map) {
				self.boundingBox = new gmaps.Polygon({
					paths: [
						new gmaps.LatLng(self.bounds.tlLat(),self.bounds.tlLng()),
						new gmaps.LatLng(self.bounds.brLat(),self.bounds.tlLng()),
						new gmaps.LatLng(self.bounds.brLat(),self.bounds.brLng()),
						new gmaps.LatLng(self.bounds.tlLat(),self.bounds.brLng())
					],
					strokeWeight: 0,
					fillColor: "#336699",
					fillOpacity: "0.35",
					map: self.map
				});
			}
		});

		this.showTracks.subscribe(function() {
			self.run();
		});

		this.useSecondCanvas.subscribe(function() {
			self.run();
		});

		this.state = ko.observable("pause");
		this.state.subscribe(function(v) {
			if (v == "play") {
				self.run();
			}
		});
	}

	App.prototype.selectEngine = function(engineName) {
		this.engineName(engineName);
	}

	App.prototype.fitBounds = function() {
		if (!this.map) return;
		var bounds = new gmaps.LatLngBounds();
		bounds.extend(new gmaps.LatLng(this.bounds.tlLat(),this.bounds.tlLng()));
		bounds.extend(new gmaps.LatLng(this.bounds.brLat(),this.bounds.brLng()));
		this.map.fitBounds(bounds);
	}

	App.prototype.renderFrame = function(key,callback) {
		_.each(this.markers(),function(marker) {
			marker.move(key);
		});
		if (this.engine) {
			this.engine.render(key,function() {
				if (typeof callback === "function") {
					callback();
				}
			});
		}
		else if (typeof callback === "function") {
			callback();
		}
	}

	App.prototype.calculateFPS = function() {
		var dt = Math.floor((new Date).getTime()/1000);
		if (!this._fps) this._fps = 1;
		if (!this._fpsDt || this._fpsDt+1<dt) this._fpsDt = dt;
		if (this._fpsDt === dt) {
			this._fps++;
		}
		else {
			this.fps(this._fps);
			this._fps = 1;
			this._fpsDt = dt;
		}
	}

	App.prototype.run = function(force) {
		var self = this;
		if (this._running && !force) return;
		this._running = true;
		if (!this._keyUpdatedAt || force) {
			this._keyUpdatedAt = (new Date).getTime();
			this._key = this.key();
		}
		this.renderFrame(this.key(),function() {
			self.calculateFPS();
			if (self.state() == "play") {
				requestAnimFrame(function() {
					var lastUpdated = self._keyUpdatedAt;
					self._keyUpdatedAt = (new Date).getTime();
					self._key += self._keyUpdatedAt - lastUpdated;
					self.key(self._key);
					self._running = false;
					self.run();
				});
			}
			else {
				self._running = false;
				self._key = null;
				self._keyUpdatedAt = null;
			}
		});
	}

	App.prototype.play = function() {
		this.state("play");
	}

	App.prototype.pause = function() {
		this.state("pause");
	}

	App.prototype.resetMarkers = function() {
		_.each(this.markers(),function(marker) {
			marker.reset();
		});
		this.engine.resetTracks();
		this.run();
	}

	App.prototype.resetTracks = function() {
		_.each(this.markers(),function(marker) {
			marker.resetTrack();
		});
		if (this.engine && typeof this.engine.resetTracks === "function") {
			this.engine.resetTracks();
		}
		this.run();
	}

	App.prototype.init = function(doc) {
		var self = this;
		ko.applyBindings(this);
		this.isReady(true);
		this.map = new gmaps.Map(document.getElementById("map"),{
			zoom: 13,
			center: new gmaps.LatLng(this.bounds.tlLat(),this.bounds.tlLng()),
			mapTypeId: "terrain"
		});
		this.fitBounds();
		this.amount.valueHasMutated();
		this.engineName.valueHasMutated();
		gmaps.event.addListenerOnce(this.map,"idle",function() {
			self.isVisible(true);
			self.run();
		});
	}

	return App;
});