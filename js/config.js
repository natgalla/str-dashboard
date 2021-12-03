// general settings
var datafile = 'data/cargoes.csv';
var minYear = 1634;
var maxYear = 1857;

// interface objects
var getCanvas;
var element;
var graphTitle;
var menu = $('#menu');
var controls = $('#controls');
var filters = $('.filter');
var filtersContainer = $('#filters');
var submitButton = $('#submitButton');
var graphContainer = $('#viz-container');
var mapContainer = $('#mapid');
var toggles = $('#toggles');
var mapToggle = $('#mapToggle');
var graphToggle = $('#graphToggle');
var loading = $('#loading');
var collapsedWidth = '35px';
var downloadButton = $('#download');

// map settings
var mapCenter = [55.039, 0.6212];
var helsingor = [56.039, 12.6212];
var defZoomLv = 4;
var minZoomLv = 2;
var maxZoomLv = 9;
var zoomLocation = 'bottomright';
var minCircleSize = 1000; // use a d3 scale to determine size
var maxCircleSize = minCircleSize * 100;
var fromColor = '#0571b0';
var toColor = '#ca0020';

// map bounds (prevent panning off the map)
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

// create the map
var map = L.map('mapid', {
  zoomControl: false,
  maxBounds: bounds,
  maxBoundsViscosity: 0.0
}).setView(mapCenter, defZoomLv);

// define basemap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}', {
   attribution: 'Tiles &copy; Esri &mdash; Source: Esri',
   maxZoom: maxZoomLv,
   minZoom: minZoomLv
}).addTo(map);

// location of zoom control
L.control.zoom({
 position: zoomLocation
}).addTo(map);

// create layer for graduated symbols
var circles = L.layerGroup()
map.addLayer(circles);
