require.config({
	paths: {
		async: "/lib/async-0.1.1",
		domReady: "/lib/domReady-2.0.1",
		knockout: "/lib/knockout-2.3.0.min",
		underscore: "/lib/underscore-1.5.2.min",
		eventEmitter: "/lib/eventEmitter"
	},
	shim: {
		underscore: {
			exports: "_"
		}
	}
});

require(["domReady!","app"],function(doc,App) {
	var app = new App();
	app.init(doc);
});