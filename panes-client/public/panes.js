//$debug = true;

// ==== Start configuring ====
config = {
  key: "2304203402340234",                /* Your public key */
  remote: "webpanes.heroku.com:3000",     /* Your webpanes server */
  https: false,                           /* Are you on HTTPS? */
  pane_selector: ".pane",                 /* CSS class for pane elements */
  default_cache_expiration: 172800 * 1000 /* 48 hours in milliseconds */
}
// ==== Stop configuring ====

$(function() {
  
  var Panes = function() {
    
    this.vars = {
      public_key: config.key,  
      remote: config.remote,  
      https: config.https,    
      pane_selector: config.pane_selector   
    };
    
    this.functions = {
    
      initialize: function() {
        
        // Add iframe for remote load
        var iframe_id = 'panes-iframe';
        var el = document.createElement("iframe");
        el.setAttribute('id', iframe_id);
        document.body.appendChild(el);
        el.setAttribute('style', 'display: none');
        
        this.iframe = $('#' + iframe_id)[0];
        
        // Receive cross-browser postMessage events
        $.receiveMessage(this.receive,
          "http" + (config.https ? "s" : "") + "://" + config.remote
        );
        
        this.URL = unescape(this.current_page_url());
        
        var panes = this.panes();
        
        $(window).bind("$panes-ready", function() {
          Panes.load(function(response) {
            
            for (var i = 0; i < panes.length; i++)
              this.populate(panes[i], response);

          });
        });
        
        $(window).bind("$synthesized", function() {
          
          var unloaded_panes = 0;
          
          for (var i = 0; i < panes.length; i++) {
            $(panes[i]).addClass('loading').text('Loading...');          
            var status = Panes.populate(panes[i]);
            if (status === false) unloaded_panes += 1;
          }
          
          if (unloaded_panes > 0) {
            // Load the iframe
            Panes.iframe.setAttribute('src', "" + Panes.iframe_url());
          }
        });
      },
    
      load: function(callback) {
        if (this.active_request) return;
        
        this.active_request = this.Request.new(this.remote, this.URL, this.https, this.public_key);
        this.active_request.frame = this.iframe;
        this.active_request.send(callback);
      },
      
      receive: function(event) {
        var obj = event.data.toObject();
        if (typeof obj.status != "undefined") {
          if (obj.status == "ready") {
            $(window).trigger("$panes-ready");
            return;
          }
        }
        
        // This is a request response
        Panes.active_request.receive(obj);
        
        Panes.active_request = null;
      },
      
      populate: function(pane, response) {
        
        if (!Panes.active_request || !response) {
          // try to load from cache
          if (Panes.cache_contains(this.URL)) {
            response = Panes.cache(this.URL);
          } else {
            return false;
          }
        }
        
        if (typeof response.panes == "undefined")
          response.panes = [];
        
        $(pane).html(
          (response.status.code == 200) ? response.panes[$(pane).attr('id')] : "Failed to load.<br />Reason: " + response.status.message
        );
        
        recache = response.status.code != 200;
        
        if (typeof response.panes[$(pane).attr('id')] == "undefined") {
          $(pane).text('Error while loading, please refresh the page.');
          recache = true;
        }
        $(pane).removeClass('loading');
        
        if (recache) Panes.cache(this.URL, '');
      },
      
      panes: function() {
        return $(this.pane_selector);
      },
      
      current_page_url: function() {
        var s = window.parent.document.location.href;
        var query = window.parent.document.location.search;
        s = s.replace('http:\/\/', '');
        s = s.replace(query, '');
        s = s.trim();             // trim whitespace
        s = s.replace(/\/$/, ''); // remove trailing / for 1:1 comparisons
        s += query;               // add querystring back
        s = encodeURIComponent(s);
        return s;
      },
      
      iframe_url: function() {
        var schema = this.https ? "https://" : "http://";
        return schema + this.remote + '/iframe';
      },
      
      cache: function(key, set_value) {
        if (!key) return $.jStorage.index();
        
        if (set_value === '' || set_value === null) {
          $.jStorage.deleteKey(key);
        }
        
        if (set_value) {
          $.jStorage.set(key, set_value);
          
          ttl = config.default_cache_expiration; // 48 hours in milliseconds
          if (set_value.status) {
            ttl = set_value.status.cache_for * 1000;
          }
          $.jStorage.setTTL(key, ttl);
        } else {
          return $.jStorage.get(this.URL);
        }
      },
      
      cache_contains: function(key) {
        return $.inArray(key, this.cache()) > -1;
      }
    
    };
    
    
    // ==== Classes ====
    this.classes = {
    
      // Encapsulates request to remote endpoint
      Request: function() {
        
        this.functions = {
              
          initialize: function(remote, URL, https, public_key) {
            if (remote == "" || typeof(remote) == "undefined") return null;
            
            this.remote = remote;
            this.https = https || false;
            this.URL = URL || "";
            this.public_key = public_key;
            
            if (typeof($debug) != "undefined") console.log("--> request initialized with URL: " + this.request_url());
          },
      
          request_url: function(specific_pane) {
            var s = "";
            s += (this.https ? "https" : "http") + "://";
            s += this.remote;
            
            // URL param 1: key
            s += "/" + this.public_key;
            
            // URL param 2: current page
            s += "/" + this.URL;
        
            if (typeof(specific_pane) != "undefined" && specific_pane != "")
              s += "/" + specific_pane;
          
            return s;
          },
          
          send: function(callback) {
            this.callback = callback;
            this.get(this.request_url());
          },
          
          receive: function(obj) {
            this.callback.apply(Panes, [obj]);
            if (obj.status.resource == this.URL)
              Panes.cache(this.URL, obj);
          },
          
          // HTTP Methods
          get: function(path) {
            // Caching
            if (Panes.cache_contains(this.URL)) {
              var cacheHit = Panes.cache(this.URL);
              this.receive(cacheHit);
              return;
            }
            
            // Cache hit failed, head out to 
            $.postMessage(
              { "get" : path },
              Panes.iframe_url(),
              this.frame.contentWindow
            );
          }
        
        };
                
      }
    
    };
    
    
    // Faked-out class structure
    $synthesize(this);
  };
  
  Panes = new Panes();
  
  $(window).trigger("$synthesized");
  
});

// Synthesize
$synthesize = function(obj) {
  for (var v in obj.vars) { obj[v] = obj.vars[v];}
  for (var f in obj.functions) { obj[f] = obj.functions[f]; }  
  for (var c in obj.classes) { obj[c] = $synthesize(new obj.classes[c]); }
  
  if (typeof(obj.initialize) == "function") {
    obj.initialize();
  }
  
  if (typeof(obj["new"]) != "function") {
    obj.new = function() {
      obj.initialize.apply(this, arguments);
      return obj;
    }
  }

  return obj;
};

// http://blog.stevenlevithan.com/archives/faster-trim-javascript
String.prototype.trim = function() {
  str = this;
	str = str.replace(/^\s+/, '');
	for (var i = str.length - 1; i >= 0; i--) {
		if (/\S/.test(str.charAt(i))) {
			str = str.substring(0, i + 1);
			break;
		}
	}
	return str;
}

// http://seattlesoftware.wordpress.com/2008/01/16/javascript-query-string/
String.prototype.toObject = function() {

      // The return is a collection of key/value pairs

      var queryStringDictionary = {};

      // Gets the query string, starts with '?'

      var querystring = decodeURI(this);

      // document.location.search is empty if no query string

      if (!querystring) {
          return {};
      }

      // '&' seperates key/value pairs

      var pairs = querystring.split("&");

      // Load the key/values of the return collection

      for (var i = 0; i < pairs.length; i++) {
          var keyValuePair = pairs[i].split("=");
          queryStringDictionary[keyValuePair[0]] 
                  = keyValuePair[1];
      }

      // Return the key/value dictionary
      
      var explodeArrayKeys = function(dict) {
        var cpy = {};
        for (k in dict) {
          
          var value = unescape(dict[k]);
          value = value.replace(/\+/g, ' ');
          
          if (k.indexOf('[') > 0) {
            var first = k.split('[')[0];
            var second = k.split('[')[1].replace(']', '');
            if (typeof cpy[first] == "undefined") cpy[first] = {};
            cpy[first][second] = value;
          } else {
            cpy[k] = value;
          }
        }
        return cpy;
      }

      return explodeArrayKeys(queryStringDictionary);
}