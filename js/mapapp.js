// initialize multi-select menus
$('.multi-select').select2();

// javascript controls
var datafile = 'data/cargoes.csv';
var menu = $('#menu');
var controls = $('#controls');
var filters = $('#filters');
var submitButton = $('#submitButton');
var collapsedWidth = '35px';
var graphContainer = $('#viz-container');
var mapContainer = $('#mapid');
var mapToggle = $('#mapToggle');
var graphToggle = $('#graphToggle');
var minYear = 1634;
var maxYear = 1857;

// center of the map
var helsingor = [56.039, 12.6212];
var mapCenter = [55.039, 0.6212];

// basic map settings
var zoomLevel = 4
var circleSize = 1000 // use a d3 scale to determine size
var fromColor = '#0571b0';
var toColor = '#ca0020';

// set bounds (prevent panning off the map)
var southWest = L.latLng(-65.98155760646617, -280);
var northEast = L.latLng(89.99346179538875, 280);
var bounds = L.latLngBounds(southWest, northEast);

// graph settings
var height = 450;
var width = 800;
var padding = 50;
var defaultBarWidth = 20;
var svg, viz, xMin, yMin, xMax, yMax, bars;
var yScale = d3.scaleLinear().rangeRound([height, 0]);
var xScale = d3.scaleLinear().rangeRound([0, width]);
var maxTicks = 15;

// set up the viz wrapper in html
var newGraph = function(aggregate, startYear, endYear) {
  $('#viz-wrapper').empty(); // reset the graph

  var range = endYear - startYear; // set range based on user input
  var ticks;
  // prevent tick crowding
  if (range > maxTicks) {
    ticks = maxTicks + 2;
  } else {
    ticks = range + 2;
  }

  // set up the new graph
  svg = d3.select('#viz-wrapper')
                  .append('svg')
                  .attr('height', height + padding * 2)
                  .attr('width', width + padding * 2);

  viz = svg.append('g')
              .attr('id', 'viz')
              .attr('transform', 'translate(' + padding  + ',' + padding + ')');

  yMax = d3.max(aggregate, function(element) {
    return parseInt(element.value)
  });
  yMin = 0;

  // set scales
  yScale.domain([yMin, yMax]);
  xScale.domain([startYear - 1, endYear + 2]);

  // Add the X Axis
  viz.append('g')
   .attr('class', 'axis axis--x')
   .attr('transform', 'translate(0,' + height + ')')
   .call(d3.axisBottom(xScale).ticks(ticks).tickFormat(d3.format('d')).tickSizeOuter([0]))
   .selectAll('text')
   .attr('transform', function() {
           return 'rotate(-65)'
         })
   .style('text-anchor', 'end')
   .style('font-size', '10px')
   .attr('dx', '-10px')
   .attr('dy', '10px');

   // Add the Y Axis
   viz.append('g')
       .attr('class', 'axis axis--y')
       .call(d3.axisLeft(yScale).ticks(10));

   // define the bars and their positions
   bars = viz.selectAll('g.bars')
               .data(aggregate)
               .enter()
               .append('g')
               .attr('class', 'bar');

   var barWidth = width/(range+2) // set bar width relative to the amount of bars

   // add the bars to the graph
   bars.append('rect')
       .attr('x', function(d) {
         return xScale(parseInt(d.key))})
       .attr('y', function(d) {
         return yScale(d.value) })
       .attr('width', barWidth )
       .attr('height', function(d) {return height - yScale(d.value) } )
       .style('fill', '#006bff')
       .style('stroke', 'navy');
}


// populate option lists
var populateList = function(id, field, csv) {
  d3.csv('data/' + csv, function(data) {
    data.forEach(function(d) {
      $('#' + id).append('<option value=' + d[field] + '>' + d[field] + '</option>')
    })
  });
}
populateList('from', 'from_port', 'from_ports.csv');
populateList('to', 'to_port', 'to_ports.csv');
populateList('products', 'product_std', 'products.csv');

// create the map
var map = L.map('mapid', {
  zoomControl: false,
  maxBounds: bounds,
  maxBoundsViscosity: 0.0
}).setView(mapCenter, zoomLevel);

// create layer for graduated symbols
var circles = L.layerGroup()
map.addLayer(circles);

// Define basemap, zoom constraints
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
   attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
   maxZoom: 9,
   minZoom: 2
}).addTo(map);

// location of zoom control
L.control.zoom({
 position:'bottomright'
}).addTo(map);

// function gets options from a selection list
var getOptions = function(id) {
  var optionsList = []
  var container = document.getElementById(id).selectedOptions;
  for (var i=0; i<container.length; i++) {
    optionsList.push(container[i].text);
  };
  return optionsList;
}


// function adds a place to the map w/ graduated symbol based on whether it was sending or receiving

var updateViz = function() {
  if (window.location.protocol == 'file:') { // if working local, just show a few example features
    var marker = L.marker(helsingor).addTo(map); // marker example
    var circle = L.circle(helsingor, { // circle example
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: circleSize
    }).addTo(map);
    marker.bindPopup('<b>Helsing&oslash;r</b><br>Where the Sound Toll was levied.').openPopup();
  } else {  // fetch data w/ D3 and map it
    // pull variables from the menu
    var destinationPorts = getOptions('to');
    var originPorts = getOptions('from');
    var products = getOptions('products');
    var endYear = parseInt(document.getElementById('endYear').value);
    var startYear = parseInt(document.getElementById('startYear').value);

    d3.tsv(datafile, function(data) { // fetch the data
      // Filter the data
      noStartYear = isNaN(startYear);
      noEndYear = isNaN(endYear);
      if (noStartYear || startYear < minYear ) {
        startYear = minYear;
      } else if (startYear > endYear) {
        startYear = endYear;
      }
      if (noEndYear || endYear > maxYear) {
        endYear = maxYear;
      } else if (endYear < startYear) {
        endYear = startYear;
      }

      if (startYear == minYear) {
        $('#startYear').val('');
      } else {
        $('#startYear').val(startYear);
      }
      if (endYear == maxYear) {
        $('#endYear').val('');
      } else {
        $('#endYear').val(endYear);
      }
      noDestinations = (destinationPorts.length === 0 || (destinationPorts.length === 1 && destinationPorts[0] === ''));
      noOrigins = (originPorts.length === 0 || (originPorts.length === 1 && originPorts[0] === ''));
      noProducts = (products.length === 0 || (products.length === 1 && products[0] === ''));
      if (!( (noStartYear || startYear == minYear)
            && (noEndYear || endYear == maxYear)
            && noDestinations && noOrigins && noProducts)) { // skip filtering if there are no filters
        sample = [];
        data.forEach(function(d) {
          year = parseInt(d.year);
          if ( (year >= startYear)
              && (year <= endYear)
              && ( noDestinations || destinationPorts.indexOf(d.to_port) > -1)
              && ( noOrigins || originPorts.indexOf(d.from_port) > -1)
              && ( noProducts || products.indexOf(d.product_std) > -1)
              && ( sample.indexOf(d) == -1 )
             ) {
            sample.push(d);
          }
        })
        data = sample;
      }

      // Create aggregates: cargoes by port
      var destinations = d3.nest()
        .key(function(d) { return d.to_port })
        .rollup(function(v) { return v.length })
        .entries(data);
      var origins = d3.nest()
        .key(function(d) { return d.from_port })
        .rollup(function(v) { return v.length })
        .entries(data);
      var allPorts = origins.concat(destinations)

      // Create aggregates: cargoes by Year
      var cargoesByYear = d3.nest()
        .key(function(d) { return d.year; } )
        .rollup(function(v) { return v.length; })
        .entries(data);

      // Create scale for circle size
      dScale = d3.scaleLinear().range([circleSize, circleSize*100]);
      dDomain = d3.extent(allPorts, function(element){
        return parseInt(element.value)
      });
      dScale.domain(dDomain);

      // Visualize data on map
      var mapPlaces = function(direction, places, datum) {
        // ( would be more efficient to aggregate the data by port,
        // but this will probably take care of itself once we're querying data from the server )
        if ( places.indexOf(datum[direction + '_port']) < 0 ) {  // check if the data point is already on the map, skip it if so
          // set to/from specific variables
          var aggregate;
          var color;
          var verb;
          if (direction == 'to') {
            aggregate = destinations;
            color = toColor;
            verb = 'received';
          } else if (direction == 'from') {
            aggregate = origins;
            color = fromColor;
            verb = 'shipped';
          }

          // create the place object with name and coordinates
          var place = {
            coord: [parseFloat(datum[direction + '_lat']), parseFloat(datum[direction + '_long'])],
            name: datum[direction + '_port']
          }

          // get cargo totals from the aggregated data
          aggregate.forEach( function(d) {
            if (d.key == place.name) {
              place.cargoes = d.value
            }
          })

          // create the new circle
          var newCircle = L.circle(place.coord, {
            color: color,
            fillColor: color,
            fillOpacity: 0.5,
            radius: dScale(place.cargoes)
          })
          newCircle.bindPopup('<b>' + place.name + '</b><br>' + place.cargoes + ' cargoes ' + verb + '.');
          circles.addLayer(newCircle); // add new circle to circles layer
          places.push(place.name); // add place name to list of processed places so it won't be added again
        }
      }

      var toPlaces = [];
      var fromPlaces = [];

      circles.clearLayers() // reset circles
      data.forEach( function(d) { // execute adding circles per data point
        mapPlaces('to', toPlaces, d);
        mapPlaces('from', fromPlaces, d);
      });
      document.getElementById('products').selectedOptions = [];

      // create human-readable lists for use in the graph title
      var joinList = function(list) {
        return [list.slice(0, -1).join(', '), list.slice(-1)[0]].join(list.length < 2 ? '' : ' and ');
      }
      var graphLists = function(condition, inputList, alternateText) {
        if (condition) {
          return alternateText;
        } else {
          return joinList(inputList);
        }
      }
      var graphProducts = graphLists(noProducts, products, 'Timber')
      var graphFrom = graphLists(noOrigins, fromPlaces, 'The Baltic')
      var graphTo = graphLists(noDestinations, toPlaces, 'Iberia')
      // create the graph
      newGraph(cargoesByYear, startYear, endYear);
      $('#viz-title').html('Cargoes of ' + graphProducts + ' from ' + graphFrom + ' to ' + graphTo + ': ' + startYear + '-' + endYear)
    });
  }
}


var expandCollapse = function() { // function to show or hide the filter menu
  if (controls.hasClass('expanded')) {
    menu.html('&#9776');  // close icon changes to menu icon
    controls.removeClass('expanded').addClass('collapsed'); // class determines CSS positioning
    filters.fadeOut(); // prevents the form from being submitted while the menu is collapsed
    graphContainer.css({'margin-left': 'auto', // centers graph when menu collapsed
                        'margin-right': 'auto'});
    mapToggle.css({ // move graph/map buttons to collapsed menu
      'position': 'absolute',
      'top': 50,
      'right': 10,
    })
    graphToggle.css({
      'position': 'absolute',
      'top': 80,
      'right': 10
    })
    // map/graph shorthand -- should be replaced with icons
    mapToggle.text('M')
    graphToggle.text('G')
  } else {
    menu.html('<b>&#9747;</b>'); // menu icon changes to close icon
    controls.removeClass('collapsed').addClass('expanded') // class determines CSS positioning
    filters.show();
    graphContainer.css({'margin-left': '340px',
                        'margin-right': '0'});
    mapToggle.css({ // put map/graph buttons back on the options list
      'position': 'static',
    })
    graphToggle.css({
      'position': 'static',
    })
    mapToggle.text('Map')
    graphToggle.text('Graph')
  }
}

document.addEventListener('keyup', function(e) { // escape key shows and hides the filter menu
     if (e.keyCode == 27) {
        expandCollapse();
    };
  });
menu.click(expandCollapse); // menu button shows and hides the filter menu

// submitting the form refreshes the map
submitButton.click(function() {
  if (controls.hasClass('collapsed')) {
    return false;
  } else {
    updateViz();
  }
});

$('.filter').change(function() { // automatically update map when filter is added or removed
  if (controls.hasClass('collapsed')) {
    return false;
  } else {
    updateViz();
  }
});

// switch between map and graph
mapToggle.click(function() {
  graphContainer.hide();
  mapContainer.show();
  $(this).prop('disabled', true );
  graphToggle.prop('disabled', false );
});
graphToggle.click(function() {
  mapContainer.hide();
  graphContainer.show();
  $(this).prop('disabled', true );
  mapToggle.prop('disabled', false );
});

updateViz();
