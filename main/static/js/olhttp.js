currentFeature = null;
var map = null;
function featureSelected(evt) {
    var type = evt.feature.layer.name;
      var html = '<b>'+type+'</b><ul>';
    var html = '';
    for (var key in evt.feature.attributes) {
        html += '<li><b>'+ key + '</b>: ' + evt.feature.attributes[key]+"</li>";
    }
    document.getElementById("featuredetails").innerHTML = html;
}
function init() {
    map = new OpenLayers.Map("map", {'theme': null, 'controls':[new OpenLayers.Control.Navigation(), new OpenLayers.Control.ZoomPanel(), new OpenLayers.Control.Attribution()]});
    var gmap = new OpenLayers.Layer.OSM(); //"Hybrid", {type: google.maps.MapTypeId.HYBRID,numZoomLevels: 20});
    map.addLayer(gmap);
    map.zoomToExtent(new OpenLayers.Bounds(-11729873.484955,4795009.439204,-11635397.318007,4844005.574328));
    var layers = [];
    for (var key in LAYER_CONFIG) {
        var layer_info = LAYER_CONFIG[key];

        var layer = new OpenLayers.Layer.Vector(layer_info['title'], {
            strategies: [new OpenLayers.Strategy.Fixed(), new OpenLayers.Strategy.Save()],
            protocol: new OpenLayers.Protocol.HTTP({
                url: "/data/"+key,
                format: new OpenLayers.Format.GeoJSON()
            }),
            layerKey: key
        }); 
        if (LAYER_CONFIG[key].styleMap) {
            layer.styleMap = LAYER_CONFIG[key].styleMap;
        }    
        LAYER_CONFIG[key].layer = layer;
        map.addLayer(layer);
        layer.events.register('loadend', layer, register);
        layer.events.register('featureselected', null, featureSelected);
        layers.push(layer);
    }
    MyToolbar = OpenLayers.Class(OpenLayers.Control.Panel, {
        initialize: function(options) {
            OpenLayers.Control.Panel.prototype.initialize.apply(this, [options]);
            this.defaultControl = new OpenLayers.Control.SelectFeature(layers, {displayClass: 'olControlNavigation'});
            this.addControls( [this.defaultControl]);
            for (var layer in LAYER_CONFIG) {
                var info = LAYER_CONFIG[layer];
                this.addControls( [
                    new OpenLayers.Control.DrawFeature(info.layer, OpenLayers.Handler[info.type], {'displayClass': 'olControlDrawFeature'+info.type, 'title': LAYER_CONFIG[layer].title})
                ]);
                if (info.editable) {
                    this.addControls( [
                        new OpenLayers.Control.ModifyFeature(info.layer, {vertexRenderIntent: 'temporary'})
                    ]);
                }  
                this.displayClass = 'myToolbar';
            }
        },
        CLASS_NAME: 'MyToolbar'
    });
    var toolbar = new MyToolbar();
    map.addControl(new MyToolbar());
}
function register() {
    this.events.register('featureadded', this, added);
    this.events.register('beforefeaturemodified', this, added);
    this.events.unregister('loadend', this, register);
}
function added(evt) {
   if (currentFeature && currentFeature.state == "Insert" && currentFeature != evt.feature) {
        currentFeature.layer.removeFeatures(currentFeature);
    }   
    displayForm(evt.feature);
}

function displayForm(feature) {
    currentFeature = feature;
    var form = LAYER_CONFIG[feature.layer.layerKey].form;
    var formdom = document.forms[form];
    for (var i = 0; i < formdom.length; i++) {
        if (formdom[i].type == "submit") {continue;}
        if (currentFeature.attributes[formdom[i].name] != undefined) {
            formdom[i].value = currentFeature.attributes[formdom[i].name] || "";
        } else {
            formdom[i].value = "";
        }    
    }
    for (var key in LAYER_CONFIG) {
        document.getElementById(LAYER_CONFIG[key].form).parentNode.style.display = "none";
    }    
    document.getElementById(form).parentNode.style.display = "";
        
}    
function save() {
    var layer = currentFeature.layer.layerKey;
    var form = LAYER_CONFIG[layer].form;
    var formdom = document.forms[form];
    for (var i = 0; i < formdom.length; i++) {
        if (formdom[i].type == "submit") {continue;}
        currentFeature.attributes[formdom[i].name] = formdom[i].value;
    }
    currentFeature.layer.strategies[1].save([currentFeature]);
    document.getElementById(form).parentNode.style.display = "none";
    currentFeature = null;
}
function geocode(form) {
    var text = form.search_text.value;
    var geocoder = new google.maps.Geocoder(); 
    geocoder.geocode( {'address': text }, function(results, status) {
        if (results.length) {
            result = results[0];
            var ne = result.geometry.bounds.getNorthEast();
            var sw = result.geometry.bounds.getSouthWest();
            var bounds = [sw.lng(), sw.lat(), ne.lng(), ne.lat()];
            var bounds = OpenLayers.Bounds.fromArray(bounds);
            map.zoomToExtent(bounds.transform(
                new OpenLayers.Projection("EPSG:4326"),
                new OpenLayers.Projection("EPSG:900913")
            ));
        }
    });
}
