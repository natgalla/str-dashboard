// a way to keep the circle the same size on screen no matter what the zoom level is:
var proportionalCircles = function() {
  var myZoom = {
    start: map.getZoom(),
    end: map.getZoom()
  };

  map.on('zoomstart', function(e) {
    myZoom.start = map.getZoom();
  });

  map.on('zoomend', function(e) {
    myZoom.end = map.getZoom();
    var diff = myZoom.start - myZoom.end;
    var factor = 2;
    if (Math.abs(diff) > 1) {
      factor = Math.pow(2, Math.abs(diff));
    }
    if (diff > 0) {
        circle.setRadius(circle.getRadius() * factor);
    } else if (diff < 0) {
        circle.setRadius(circle.getRadius() / factor);
    }
  });
}
