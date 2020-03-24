import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';

const initMapbox = () => {
  const mapElement = document.getElementById('map');

  // const fitMapToMarkers = (map, markers) => {
  //   const bounds = new mapboxgl.LngLatBounds();
  //   markers.forEach(marker => bounds.extend([ marker.lng, marker.lat ]));
  //   map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
  // };

  // if (mapElement) { // only build a map if there's a div#map to inject into
  //   mapboxgl.accessToken = mapElement.dataset.mapboxApiKey;
  //   const map = new mapboxgl.Map({
  //     container: 'map',
  //     style: 'mapbox://styles/nicovdb/ck7yt5run02jv1inzq58qhs03'
  //   });
  //   const markers = JSON.parse(mapElement.dataset.markers);
  //   if (markers.length > 0) {
  //     markers.forEach((marker) => {
  //       const popup = new mapboxgl.Popup().setHTML(marker.infoWindow);

  //       new mapboxgl.Marker()
  //         .setLngLat([ marker.lng, marker.lat ])
  //         .setPopup(popup)
  //         .addTo(map);
  //     });
  //     fitMapToMarkers(map, markers);
  //   }

  //   const finished = JSON.parse(mapElement.dataset.finished);
  //   if (finished) {
  //     console.log("nope");
  //   } else {
  //     console.log(finished);
  //   }
  // }


  var truckLocation = [-0.5800364, 44.841225,];
  // var warehouseLocation = [-83.083, 42.363];
  var lastQueryTime = 0;
  var lastAtRestaurant = 0;
  var keepTrack = [];
  var currentSchedule = [];
  var currentRoute = null;
  var pointHopper = {};
  var pause = true;
  var speedFactor = 50;

  // Add your access token
  mapboxgl.accessToken = 'pk.eyJ1Ijoibmljb3ZkYiIsImEiOiJjanJ0amx0bmgyZXBiNDludG5rbWxna280In0.3jr08ZGXFbJfpII7giRyMw';

  // Initialize a map
  var map = new mapboxgl.Map({
    container: 'map', // container id
    style: 'mapbox://styles/nicovdb/ck7yt5run02jv1inzq58qhs03', // stylesheet location
    center: truckLocation, // starting position
    zoom: 12 // starting zoom
  });

  // Create an empty GeoJSON feature collection for drop-off locations
  var dropoffs = turf.featureCollection([]);
  var nothing = turf.featureCollection([]);

  map.on('load', function() {
    var marker = document.createElement('div');
    marker.classList = 'truck';

    // Create a new marker ((truckMarker is not defined))
    var truckMarker = new mapboxgl.Marker(marker)
      .setLngLat(truckLocation)
      .addTo(map);

    const finished = JSON.parse(mapElement.dataset.finished);
    if (finished) {
      map.addSource('route', {
        type: 'geojson',
        data: nothing
      });

      map.addLayer({
        id: 'routeline-active',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#3887be',
          'line-width': [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 3,
            22, 12
          ]
        }
      }, 'waterway-label');

      map.addLayer({
        id: 'routearrows',
        type: 'symbol',
        source: 'route',
        layout: {
          'symbol-placement': 'line',
          'text-field': '▶',
          'text-size': [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 24,
            22, 60
          ],
          'symbol-spacing': [
            "interpolate",
            ["linear"],
            ["zoom"],
            12, 30,
            22, 160
          ],
          'text-keep-upright': false
        },
        paint: {
          'text-color': '#3887be',
          'text-halo-color': 'hsl(55, 11%, 96%)',
          'text-halo-width': 3
        }
      }, 'waterway-label');

      map.addLayer({
        id: 'dropoffs-symbol',
        type: 'symbol',
        source: {
          data: dropoffs,
          type: 'geojson'
        },
        layout: {
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
          'icon-image': 'marker-15',
        }
      });

      const coordinates = JSON.parse(mapElement.dataset.coordinates);
      coordinates.forEach((coords) => {
        var pt = turf.point(
            [coords[0], coords[1]],
            {
              orderTime: Date.now(),
              key: Math.random()
            }
          );
          dropoffs.features.push(pt);
          pointHopper[pt.properties.key] = pt;
      });
      map.getSource('dropoffs-symbol')
          .setData(dropoffs);

      $.ajax({
        method: 'GET',
        url: assembleQueryURL(coordinates),
      }).done(function(data) {
        // Create a GeoJSON feature collection
        var routeGeoJSON = turf.featureCollection([turf.feature(data.trips[0].geometry)]);

        // If there is no route provided, reset
        if (!data.trips[0]) {
          routeGeoJSON = nothing;
        } else {
          // Update the `route` source by getting the route source
          // and setting the data equal to routeGeoJSON
          map.getSource('route')
            .setData(routeGeoJSON);
        }

        if (data.waypoints.length === 12) {
          window.alert('Maximum number of points reached. Read more at docs.mapbox.com/api/navigation/#optimization.');
        }
      });
    };

    function assembleQueryURL(coordinates) {
      return 'https://api.mapbox.com/optimized-trips/v1/mapbox/walking/' + coordinates.join(';') + '?annotations=duration' + '&overview=full&steps=true&geometries=geojson&source=first&access_token=' + mapboxgl.accessToken;
    }
  });
};

export { initMapbox };
