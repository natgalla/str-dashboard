// initialize multi-select menus
$('.multi-select').select2();

// set up the viz wrapper in html
populateList('from', 'from_port', 'from_ports.csv');
populateList('to', 'to_port', 'to_ports.csv');
populateList('products', 'product_std', 'products.csv');

// escape key shows and hides the filter menu
document.addEventListener('keyup', function(e) {
  if ( e.keyCode == 27 || (e.keyCode == 9 && controls.hasClass('collapsed')) ) {
    expandCollapse();
  };
});

// menu button shows and hides the filter menu
menu.click(expandCollapse);

// submitting the form refreshes the map
submitButton.click(function() {
  if (controls.hasClass('collapsed')) {
    return false;
  } else {
    updateViz();
  }
});

// automatically update map when filter is added or removed
filters.change(function() {
  if (controls.hasClass('collapsed')) {
    return false;
  } else {
    updateViz();
  }
});

// show map, hide graph
mapToggle.click(function() {
  graphContainer.hide();
  mapContainer.show();
  newCanvas()
  $(this).prop('disabled', true );
  graphToggle.prop('disabled', false );
  downloadButton.addClass('hidden').removeClass('active');
});

// show graph, hide map
graphToggle.click(function() {
  mapContainer.hide();
  graphContainer.show();
  newCanvas()
  $(this).prop('disabled', true );
  mapToggle.prop('disabled', false );
  downloadButton.addClass('active').removeClass('hidden');
});

var getCanvas;

downloadButton.on('click', function () {
  var imageData = getCanvas.toDataURL("image/png");
  // Now browser starts downloading it instead of just showing it
  var newData = imageData.replace(/^data:image\/png/, "data:application/octet-stream");
  downloadButton.attr("download", graphTitle + ".png").attr("href", newData);
});

// run the default unfiltered viz on initial load in
updateViz();
