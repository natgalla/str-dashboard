// function removes old graph and updates it with new filters/aggregates
var newGraph = function(aggregate, startYear, endYear, param) {
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
    return parseInt(element.value[param])
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
         return yScale(d.value[param]) })
       .attr('width', barWidth )
       .attr('height', function(d) {return height - yScale(d.value[param]) } )
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


// function gets options from a selection list
var getOptions = function(id) {
  var optionsList = []
  var container = document.getElementById(id).selectedOptions;
  for (var i=0; i<container.length; i++) {
    optionsList.push(container[i].text);
  };
  return optionsList;
}


// function joins a list with commas adding 'and' before the last value
var joinList = function(list) {
  return [list.slice(0, -1).join(', '), list.slice(-1)[0]].join(list.length < 2 ? '' : ' and ');
}


// function capitalizes first letter of a string
var capitalizeFirst = function(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}


// function prepares a list to be displayed in a graph title
var graphLists = function(condition, inputList, alternateText) {
  if (condition) {
    return alternateText;
  } else {
    return joinList(inputList);
  }
}


// function counts shipments
var countShipments = function(records) {
  var p = [];
  records.forEach(function(record) {
    if ( p.indexOf(record.passage) == -1 ) {
      p.push(record.passage);
    }
  })
  return p.length
}


// function adds places to the map with graduated symbol
var mapPlaces = function(aggregate, direction, places, datum, param) {
  // ( would be more efficient to aggregate the data by port,
  // but this will probably take care of itself once we're querying data from the server )
  if ( places.indexOf(datum[direction + '_port']) < 0 ) {  // check if the data point is already on the map, skip it if so
    // set to/from specific variables
    var color;
    var verb;
    var item;
    var number;
    // create the place object with name and coordinates
    var place = {
      coord: [parseFloat(datum[direction + '_lat']), parseFloat(datum[direction + '_long'])],
      name: datum[direction + '_port']
    }
    // get cargo totals from the aggregated data
    aggregate.forEach( function(d) {
      if (d.key == place.name) {
        place.cargoes = d.value.cargoes
        place.shipments = d.value.shipments
        place.volume = d.value.volume
      }
    })

    if (direction == 'to') {
      color = toColor;
      verb = 'received';
    } else if (direction == 'from') {
      color = fromColor;
      verb = 'shipped';
    }
    if (param == 'volume') {
      item = 'm<sup>3</sup>';
      number = place[param].toFixed(2);
    } else {
      item = capitalizeFirst(param);
      number = place[param];
    }
    // create the new circle
    var newCircle = L.circle(place.coord, {
      color: color,
      fillColor: color,
      fillOpacity: 0.5,
      radius: dScale(place[param])
    })
    newCircle.bindPopup('<b>' + place.name + '</b><br>' + number + ' ' + item + ' ' + verb + '.');
    circles.addLayer(newCircle); // add new circle to circles layer
    places.push(place.name); // add place name to list of processed places so it won't be added again
  }
}


// aggregate data by given column name
var aggregateBy = function(data, column) {
  var agg = d3.nest()
    .key(function(d) { return d[column] })
    .rollup(function(v) { return {
        cargoes: v.length,
        volume: d3.sum(v, function(d) { return d.volume }),
        shipments: countShipments(v)
      }
    })
    .entries(data);
  return agg
}


// function adds a place to the map w/ graduated symbol based on whether it was sending or receiving
// and updates the graph
var updateViz = function() {
  if (window.location.protocol == 'file:') { // if working local, just show a few example features
    var marker = L.marker(helsingor).addTo(map); // marker example
    var circle = L.circle(helsingor, { // circle example
      color: 'red',
      fillColor: '#f03',
      fillOpacity: 0.5,
      radius: minCircleSize
    }).addTo(map);
    marker.bindPopup('<b>Helsing&oslash;r</b><br>Where the Sound Toll was levied.').openPopup();
    element = document.getElementById('mapid');
  } else {  // fetch data w/ D3 and map it
    // pull variables from the menu
    loading.fadeIn(200);
    var destinationPorts = getOptions('to');
    var originPorts = getOptions('from');
    var products = getOptions('products');
    var endYear = parseInt(document.getElementById('endYear').value);
    var startYear = parseInt(document.getElementById('startYear').value);
    var param = $('input[name=total]:checked').val();

    if (param == "shipments") {
      $("#shipmentsInfo").show();
      $("#cargoesInfo").hide();
      $("#volumeInfo").hide();
    } else if (param == "cargoes"){
      $("#shipmentsInfo").hide();
      $("#cargoesInfo").show();
      $("#volumeInfo").hide();
    } else {
      $("#shipmentsInfo").hide();
      $("#cargoesInfo").hide();
      $("#volumeInfo").show();
    }

    d3.tsv(datafile, function(data) { // fetch the data
      // Filter the data

      // restrict dates within bounds
      noStartYear = isNaN(startYear);
      noEndYear = isNaN(endYear);
      if (noStartYear || startYear < minYear ) {
        startYear = minYear;
        $('#startYear').val('');
      } else if (startYear > maxYear) {
        startYear = maxYear;
        endYear = maxYear;
      } else if (startYear > endYear) {
        startYear = endYear;
      }
      if (noEndYear || endYear > maxYear) {
        endYear = maxYear;
        $('#endYear').val('');
      } else if (endYear < minYear || endYear < startYear) {
        endYear = startYear;
      }

      if (startYear != minYear) {
        $('#startYear').val(startYear);
      }
      if (endYear != maxYear) {
        $('#endYear').val(endYear);
      }

      noDestinations = (destinationPorts.length === 0);
      noOrigins = (originPorts.length === 0);
      noProducts = (products.length === 0);
      if (!( startYear == minYear
            && endYear == maxYear
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
      var destinations = aggregateBy(data, 'to_port');
      var origins = aggregateBy(data, 'from_port');
      var allPorts = origins.concat(destinations)

      // Create aggregates: cargoes by Year
      var cargoesByYear = aggregateBy(data, 'year');

      // Create scale for circle size
      dScale = d3.scaleLinear().range([minCircleSize, maxCircleSize]);
      dDomain = d3.extent(allPorts, function(element){
        return parseInt(element.value[param])
      });
      dScale.domain(dDomain);

      var toPlaces = [];
      var fromPlaces = [];

      // Visualize data on map
      circles.clearLayers() // reset circles
      data.forEach( function(d) { // execute adding circles per data point
        mapPlaces(destinations, 'to', toPlaces, d, param);
        mapPlaces(origins, 'from', fromPlaces, d, param);
      });
      document.getElementById('products').selectedOptions = [];

      // create human-readable lists for use in the graph title
      var graphProducts = graphLists(noProducts, products, 'Timber')
      var graphFrom = graphLists(noOrigins, fromPlaces, 'The Baltic')
      var graphTo = graphLists(noDestinations, toPlaces, 'Iberia')
      var supplementary = '';
      var article = 'of';
      if (param == 'volume') {
        supplementary = ' (m<sup>3</sup>)'
      } else if (param == 'shipments') {
        article = 'containing';
      }
      // create the graph
      newGraph(cargoesByYear, startYear, endYear, param);
      graphTitle = capitalizeFirst(param) + supplementary + ' ' + article + ' ' + graphProducts + ' from ' + graphFrom + ' to ' + graphTo + ': ' + startYear + '-' + endYear;
      $('#viz-title').html(graphTitle);
      // create the downloadable canvas
      newCanvas();
      loading.fadeOut(200);
    });
  }
}


// function to show or hide the filter menu
var expandCollapse = function() {
  if (controls.hasClass('expanded')) {
    menu.html('&#9776');  // close icon changes to menu icon
    controls.removeClass('expanded').addClass('collapsed'); // class determines CSS positioning
    filtersContainer.fadeOut(); // prevents the form from being submitted while the menu is collapsed
    graphContainer.addClass('free').removeClass('fixed'); // centers graph when menu collapsed
    mapToggle.css({ // move graph/map buttons to collapsed menu
      'position': 'absolute',
      'top': 50,
      'right': 10,
    });
    graphToggle.css({ // move graph/map buttons to collapsed menu
      'position': 'absolute',
      'top': 80,
      'right': 10,
    });
    // map/graph shorthand -- should be replaced with icons
    mapToggle.text('M')
    graphToggle.text('G')
  } else {
    menu.html('<b>&#9747;</b>'); // menu icon changes to close icon
    controls.removeClass('collapsed').addClass('expanded') // class determines CSS positioning
    filtersContainer.show();
    graphContainer.addClass('fixed').removeClass('free');
    // toggles.removeClass('docked');
    mapToggle.css({ // put map/graph buttons back on the options list
      'position': 'static',
    });
    graphToggle.css({ // put map/graph buttons back on the options list
      'position': 'static',
    });
    mapToggle.text('Map')
    graphToggle.text('Graph')
  }
}

var newCanvas = function() {
  if ( mapContainer.is(':visible') ) {
    element = document.getElementById('mapid');
  } else {
    element = document.getElementById('viz-container');
  }
  html2canvas(element).then(function(canvas) {
   getCanvas = canvas;
  })
}
