define(function() {
	var Marker = function(i,generatorOptions) {
		this.id = i;
		this.name = "Marker #" + this.id;
		this.color = this.getRandomColor();
		this.generatorOptions = generatorOptions;
		this.coords = {
			lat: null,
			lng: null,
			angle: null,
			dt: null
		};
		this.track = {
			data: [],
			trackI: 0,
			maxDt: 0,
		}
	} 

	Marker.prototype.getRandomColor = function() {
		var letters = "0123456789ABCDEF".split("");
	    var color = "#";
 		for (var i = 0; i < 6; i++ )
	        color += letters[Math.round(Math.random() * 15)];
   		return color;
	}

	Marker.prototype.generateStartCoords = function(dt) {
		var g = this.generatorOptions;
		dt = Math.floor(dt/1000)*1000;
		this.track.data.push({
			lat: Math.min(g.bounds.tlLat(),g.bounds.brLat())+Math.random()*Math.abs(g.bounds.tlLat()-g.bounds.brLat()),
			lng: Math.min(g.bounds.tlLng(),g.bounds.brLng())+Math.random()*Math.abs(g.bounds.tlLng()-g.bounds.brLng()),
			angle: Math.random()*360,
			dt: dt			
		});
		this.track.maxDt = dt;
	}

	Marker.prototype.generateCoords = function(dt) {
		var g = this.generatorOptions;
		var last = this.track.data[this.track.data.length-1];
		for (var i = last.dt+1000; i < dt; i+=1000) {
			if (Math.random() > g.moveProb()) continue;
			var c = {
				lat: last.lat,
				lng: last.lng,
				angle: last.angle,
				dt: i
			}
			if (Math.random() < g.holdProb()) {
				this.track.data.push(c);
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
				this.track.data.push(c);
			}
			last = c;
		}
		this.track.maxDt = this.track.data[this.track.data.length-1].dt;
	}

	Marker.prototype.move = function(dt) {
		if (this.track.maxDt === 0) {
			this.generateStartCoords(dt);
		}
		if (this.track.maxDt < dt + 30000) {
			this.generateCoords(dt+60000);
		}
		// this.track.trackI should be the last point in this.track.data with dt less than current
		// that means this.track.data[this.track.trackI].dt < dt and this.track.data[this.track.trackI+1] >= dt;	
		if (this.track.trackI > 0) {
			for (var i = this.track.trackI; i < this.track.data.length && this.track.data[i].dt < dt; i++) { }
			this.track.trackI = i-1;
		}
		else {
			for (var i = this.track.data.length-1; i > 0 && this.track.data[i].dt >= dt; i--) { }
			this.track.trackI = i;
		}
		var from = this.track.data[this.track.trackI];
		var to = this.track.data[this.track.trackI+1];
		if (this.generatorOptions.animate()) {
			this.coords.lat = from.lat + (to.lat-from.lat)*(dt-from.dt)/(to.dt-from.dt);
			this.coords.lng = from.lng + (to.lng-from.lng)*(dt-from.dt)/(to.dt-from.dt);
			this.coords.dt = dt;
			this.coords.angle = from.angle + (to.angle-from.angle)*(dt-from.dt)/(to.dt-from.dt);
			while (this.coords.angle >360) this.coords.angle-=360;
			while (this.coords.angle < 0) this.coords.angle+=360;
		}
		else {
			this.coords.lat = from.lat;
			this.coords.lng = from.lng;
			this.coords.dt = from.dt;
			this.coords.angle = from.angle;
		}
	}

	Marker.prototype.reset = function() {
		this.track.data = [];
		this.track.maxDt = 0;
		this.track.trackI = 0;
	}

	Marker.prototype.destroyTrack = function() {
		this.track.data = [];
		this.track.data.push({
			lat: this.coords.lat,
			lng: this.coords.lng,
			angle: this.coords.angle,
			dt: this.coords.dt
		});
		this.track.maxDt = this.coords.dt;
		this.track.trackI = 0;
	}

	Marker.prototype.destroy = function() {

	}

	return Marker;
});