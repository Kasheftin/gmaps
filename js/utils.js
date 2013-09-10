define(["knockout"],function(ko) {
	ko.utils.sync = function(options) {
		if (typeof options !== "object" || !options.source || !options.target || !options.onAdd) {
			throw new Error("ko.utils.sync requires object with source and target (observable)Arrays and onAdd method");
		}
		if (!options.propName) {
			options.propName = "id";
		}
		return options.source.subscribe(function(items) {
	    	    var rev1 = {}, rev2 = {}, values2push = [];

	    	    if (items.length == 0) {
	    	    	var targetItems = ko.utils.unwrapObservable(options.target);
	    	    	if (targetItems.length == 0) return;
	    	    	if (typeof options.onRemove === "function") {
 	    	    	for (var i = 0, l = targetItems.length; i < l; i++) {
 	    	    		options.onRemove(targetItems[i]);
 	    	    	} 	    	    		
	    	    	}
	    		if (ko.isObservable(options.target)) {
	    			options.target([]);
	    		}
	    		else {
                                options.target.splice(0,options.target.length);
	    		}
  	    		return;
	    	    }

        	for (var i = 0, l = items.length; i < l; i++) {
        		var propValue = ko.utils.unwrapObservable(items[i][options.propName]);
        		rev1[propValue] = i;
        	}
        	var targetItems = ko.utils.unwrapObservable(options.target);
        	for (var i = 0, l = targetItems.length; i < l; i++) {
        		var propValue = ko.utils.unwrapObservable(targetItems[i][options.propName]);
        		rev2[propValue] = i;
        	}
        	for (var i = 0, l = items.length; i < l; i++) {
        		var propValue = ko.utils.unwrapObservable(items[i][options.propName]);
        		if (rev2[propValue] === undefined) {
        			values2push.push(options.onAdd(items[i]));
        			rev2[propValue] = targetItems.length;
        		}
        	}
        	if (values2push.length > 0) {
        		ko.utils.arrayPushAll(options.target,values2push);
        		if (typeof options.afterAdd === "function") {
        			options.afterAdd();
        		}
        	}
        	for (var l = targetItems.length, i = l-1; i >= 0; i--) {
        		var propValue = ko.utils.unwrapObservable(targetItems[i][options.propName]);
        		if (rev1[propValue] === undefined) {
        			if (typeof options.onRemove === "function") {
        				options.onRemove(targetItems[i]);
        			}
        			options.target.splice(i,1);
        		}
        	}
		});
	}
});