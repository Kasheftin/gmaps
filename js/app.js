define(["knockout","underscore"],function(ko,_) {

	var App = function() {
		this.isReady = ko.observable(false);
		this.amount = ko.observable(50);
		this.bounds = {
			tlLat: ko.observable(21.515),
			tlLng: ko.observable(9.213),
			brLat: ko.observable(21.415),
			brLng: ko.observable(9.313)
		}
		this.speed = ko.observable(0.001);
		this.angle = ko.observable(30);
		this.prob = ko.observable(0.1);
		this.showTracks = ko.observable(true);
		this.showBoundingBox = ko.observable(false);

		this.engines = ["native","divs","canvas"];
		this.engine = ko.observable(_.first(this.engines));
	}

	App.prototype.init = function(doc) {
		ko.applyBindings(this);
		this.isReady(true);
	}

	return App;
});