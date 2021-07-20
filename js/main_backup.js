/*WA cities data and map*/

//function to instantiate the Leaflet map
function createMap(){
    //create the map
    var mymap = L.map('mapid', {
        center: [47.273015, -120.882275],
        zoom: 7
    });

    //add OSM base tilelayer
    L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    }).addTo(mymap);

    //call getData function
    getData(mymap);
};

//calculate the radius of each proportional symbol
function calcPropRadius(attValue) {
    //scale factor to adjust symbol size evenly
    var scaleFactor = 0.002;
    //area based on attribute value and scale factor
    var area = attValue * scaleFactor;
    //radius calculated based on area
    var radius = Math.sqrt(area/Math.PI);

    return radius;
};

function processData(data){
    //empty array to hold attributes
    var attributes = [];

    //properties of the first feature in the dataset
    var properties = data.features[0].properties;

    //push each attribute name into attributes array
    for (var attribute in properties){
        //only take attributes with population values
        if (attribute.indexOf("pop") > -1){
            attributes.push(attribute);
        };
    };

    //check result
    console.log(attributes);

    return attributes;
};

function Popup(properties, attribute, layer, radius){
    this.properties = properties;
    this.attribute = attribute;
    this.layer = layer;
    this.population = this.properties[attribute];
    this.content = "<p><b>City:</b> " + this.properties.name + "</p><p><b>" + this.attribute + ":</b> " + this.population + "</p>";

    this.bindToLayer = function(){
        this.layer.bindPopup(this.content, {
            offset: new L.Point(0,-radius)
        });
    };
};

function createPopup(properties, attribute, layer, radius){
    //add city to popup content string
    var popupContent = "<p><b>City:</b> " + properties.name + "</p><p><b>" + attribute + ":</b> " + properties[attribute] + "</p>";

    //replace the layer popup
    layer.bindPopup(popupContent, {
        offset: new L.Point(0,-radius)
    });
};

//Resize proportional symbols according to new attribute values
function updatePropSymbols(mymap, attribute, feature){
    mymap.eachLayer(function(layer){
        if (layer.feature && layer.feature.properties[attribute]){
        //access feature properties
        var props = layer.feature.properties;

        //update each feature's radius based on new attribute values
        var radius = calcPropRadius(props[attribute]);
        layer.setRadius(radius);

        createPopup(props, attribute, layer, radius);
        };
    });
};

function createSequenceControls(mymap, attributes){
    //create range input element (slider)
    $('#panel').append('<input class="range-slider" type="range">');
    //set slider attributes
    $('.range-slider').attr({
        max: 7,
        min: 0,
        value: 0,
        step: 1
    });
    $('#panel').append('<button class="skip" id="reverse">Reverse</button>');
    $('#panel').append('<button class="skip" id="forward">Skip</button>');
    $('#reverse').html('<img src="img/reverse.png">');
    $('#forward').html('<img src="img/forward.png">');
    //click listener for buttons
    $('.skip').click(function(){
        //get the old index value
        var index = $('.range-slider').val();
        //increment or decrement depending on button clicked
        if ($(this).attr('id') == 'forward'){
            index++;
            //if past the last attribute, wrap around to first attribute
            index = index > 7 ? 0 : index;
        } else if ($(this).attr('id') == 'reverse'){
            index--;
            //if past the first attribute, wrap around to last attribute
            index = index < 0 ? 7 : index;
        };
        //update slider
        $('.range-slider').val(index);
        //pass new attribute to update symbols
	updatePropSymbols(mymap, attributes[index]);
    });
    //input listener for slider
    $('.range-slider').on('input', function(){
        //get the new index value
        var index = $(this).val();
    });
};

//Update the legend with new attribute
function updateLegend(mymap, attribute){
    //create content for legend
    var content = attribute;
    //replace legend content
    $('#temporal-legend').html(content);
    //get the max, mean, and min values as an object
    var circleValues = getCircleValues(mymap, attribute);

    for (var key in circleValues){
        //get the radius
        var radius = calcPropRadius(circleValues[key]);

        //assign the cy and r attributes
        $('#'+key).attr({
            cy: 59 - radius,
            r: radius
        });
	//add legend text
        $('#'+key+'-text').text(Math.round(circleValues[key]*100)/100);
    };
};

//Calculate the max, mean, and min values for a given attribute
function getCircleValues(mymap, attribute){
    //start with min at highest possible and max at lowest possible number
    var min = Infinity,
        max = -Infinity;

    mymap.eachLayer(function(layer){
        //get the attribute value
        if (layer.feature){
            var attributeValue = Number(layer.feature.properties[attribute]);
            //test for min
            if (attributeValue < min){
                min = attributeValue;
            };
            //test for max
            if (attributeValue > max){
                max = attributeValue;
            };
        };
    });
    //set mean
    var mean = (max + min) / 2;
    //return values as an object
    return {
        max: max,
        mean: mean,
        min: min
    };
};

function createLegend(mymap, attributes){
    var LegendControl = L.Control.extend({
        options: {
            position: 'bottomright'
        },

        onAdd: function (mymap) {
            // create the control container with a particular class name
            var container = L.DomUtil.create('div', 'legend-control-container');
            //add temporal legend div to container
            $(container).append('<div id="temporal-legend">')
            //start attribute legend svg string
            var svg = '<svg id="attribute-legend" width="180px" height="180px">';

            //array of circle names to base loop on
            var circles = {
                max: 20,
                mean: 40,
                min: 60
                };

            //loop to add each circle and text to svg string
            for (var circle in circles){
                //circle string
                svg += '<circle class="legend-circle" id="' + circle + '" fill="#6eb66e" fill-opacity="0.8" stroke="#000000" cx="30"/>';

                //text string
                svg += '<text id="' + circle + '-text" x="65" y="' + circles[circle] + '"></text>';
            };
            //close svg string
            svg += "</svg>";

            //add attribute legend svg to container
            $(container).append(svg);
            return container;
        }
    });

    mymap.addControl(new LegendControl());
    updateLegend(mymap, attributes[0]);
};

//function to convert markers to circle markers
function pointToLayer(feature, latlng, attributes){
    //Determine which attribute to visualize with proportional symbols
    var attribute = attributes[0];
    //check
    console.log(attribute);
    //create marker options
    var options = {
        fillColor: "#6eb66e",
        color: "#000",
        weight: 1,
        opacity: 1,
        fillOpacity: 0.8
    };

    //For each feature, determine its value for the selected attribute
    var attValue = Number(feature.properties[attribute]);

    //Give each feature's circle marker a radius based on its attribute value
    options.radius = calcPropRadius(attValue);

    //create circle marker layer
    var layer = L.circleMarker(latlng, options);

    createPopup(feature.properties, attribute, layer, options.radius);

    //event listeners to open popup on hover
    layer.on({
        mouseover: function(){
            this.openPopup();
        },
        mouseout: function(){
            this.closePopup();
        },
        click: function(){
            $("#panel").html(panelContent);
        }
    });
    //return the circle marker to the L.geoJson pointToLayer option
    return layer;
};

//Add circle markers for point features to the map
function createPropSymbols(data, mymap, attributes){
    //create a Leaflet GeoJSON layer and add it to the map
    L.geoJson(data, {
        pointToLayer: function(feature, latlng){
            return pointToLayer(feature, latlng, attributes);
        }
    }).addTo(mymap);
};

//function to retrieve the data and place it on the map
function getData(mymap){
    //load the data
    $.ajax("data/WAcities.geojson", {
        dataType: "json",
        success: function(response){
	    //create an attributes array
	    var attributes = processData(response);

	    //call function to add map add-ons
            createPropSymbols(response, mymap, attributes);
	    createSequenceControls(mymap, attributes);
	    createLegend(mymap, attributes);
        }
    });
};


$(document).ready(createMap);