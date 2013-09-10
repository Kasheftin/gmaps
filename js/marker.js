define(["knockout","underscore"],function(ko,_) {
	var Marker = function(i,generatorOptions) {
		this.id = i;
		this.name = "Marker #" + this.id;
		this.generatorOptions = generatorOptions;
		this.coords = ko.observable({lat:null,lng:null,dt:null});
		this.track = [];
		this.maxDt = 0;
	} 

	Marker.prototype.generateStartCoords = function(dt) {
		var g = this.generatorOptions;
		dt = Math.floor(dt/1000)*1000;
		this.track.push({
			lat: Math.min(g.bounds.tlLat(),g.bounds.brLat())+Math.random()*Math.abs(g.bounds.tlLat()-g.bounds.brLat()),
			lng: Math.min(g.bounds.tlLng(),g.bounds.brLng())+Math.random()*Math.abs(g.bounds.tlLng()-g.bounds.brLng()),
			angle: Math.random()*360,
			dt: dt			
		});
		this.maxDt = dt;
	}

	Marker.prototype.generateCoords = function(dt) {
		var g = this.generatorOptions;
		var last = _.last(this.track);
		for (var i = last.dt+1000; i < dt; i+=1000) {
			if (Math.random() > g.moveProb()) continue;
			var c = _.extend({},last,{dt:i});
			if (Math.random() < g.holdProb()) {
				this.track.push(c);
			}
			else {
				var dist = (Math.random()/2+0.5)*g.speed();
				c.lat += dist*Math.cos(c.angle*Math.PI/180);
				c.lng += dist*Math.sin(c.angle*Math.PI/180);
				c.angle += (Math.random()-0.5)*g.angle();
				if (c.lat > Math.max(g.bounds.tlLat(),g.bounds.brLat())) c.lat = Math.max(g.bounds.tlLat(),g.bounds.brLat());
				if (c.lat < Math.min(g.bounds.tlLat(),g.bounds.brLat())) c.lat = Math.min(g.bounds.tlLat(),g.bounds.brLat());
				if (c.lng > Math.max(g.bounds.tlLng(),g.bounds.brLng())) c.lng = Math.max(g.bounds.tlLng(),g.bounds.brLng());
				if (c.lng < Math.min(g.bounds.tlLng(),g.bounds.brLng())) c.lng = Math.min(g.bounds.tlLng(),g.bounds.brLng());
				while (c.angle > 360) c.angle -= 360;
				while (c.angle < 0) c.angle += 360;
				this.track.push(c);
			}
			last = c;
		}
		this.maxDt = _.last(this.track).dt;
	}

	Marker.prototype.move = function(dt) {
		if (this.maxDt === 0) {
			this.generateStartCoords(dt);
		}
		if (this.maxDt < dt + 30000) {
			this.generateCoords(dt+60000);
		}
		for (var i = this.track.length-1; i > 0 && this.track[i].dt >= dt; i--) { }
		var from = this.track[i];
		var to = this.track[i+1];
		if (this.generatorOptions.animate()) {
			this.coords(_.extend({},from,{
				lat: from.lat + (to.lat-from.lat)*(dt-from.dt)/(to.dt-from.dt),
				lng: from.lng + (to.lng-from.lng)*(dt-from.dt)/(to.dt-from.dt),
				dt: dt
			}));
		}
		else {
			this.coords(from);
		}
	}

	Marker.prototype.reset = function() {
		this.track = [];
		this.maxDt = 0;
	}

	Marker.prototype.resetTrack = function() {

	}

	Marker.prototype.destroy = function() {

	}


/*
	App.prototype.generateCoords = function(marker) {
		var key = (new Date).getTime();
		if (!marker._base) {
			marker._base = {
				lat: Math.min(this.bounds.tlLat(),this.bounds.brLat())+Math.random()*Math.abs(this.bounds.tlLat()-this.bounds.brLat()),
				lng: Math.min(this.bounds.tlLng(),this.bounds.brLng())+Math.random()*Math.abs(this.bounds.tlLng()-this.bounds.brLng()),
				angle: 0,
//				angle: Math.random()*360,
				key: Math.floor(key/1000)*1000
			}
			marker._next = this.generateNextCoords(marker._base);
		}
		if (key-marker._base.key > 1000) {
			var b = _.extend({},marker._base);
			marker._base = _.extend({},marker._next);
			marker._base.key = Math.floor(key/1000)*1000;
			marker._next = this.generateNextCoords(b);
		}
		return {
			lat: marker._base.lat + (marker._next.lat-marker._base.lat)*(key-marker._base.key)/1000,
			lng: marker._base.lng + (marker._next.lng-marker._base.lng)*(key-marker._base.key)/1000
		}
	}
*/



	return Marker;
});