import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import helpers from '@turf/helpers';
import buffer from '@turf/buffer';
// import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

// const initMapbox = () => {
//   const mapElement = document.getElementById('map');

//   const fitMapToMarkers = (map, markers) => {
//     const bounds = new mapboxgl.LngLatBounds();
//     markers.forEach(marker => bounds.extend([ marker.lng, marker.lat ]));
//     map.fitBounds(bounds, { padding: 70, maxZoom: 15, duration: 0 });
//   };

//   if (mapElement) { // only build a map if there's a div#map to inject into
//     mapboxgl.accessToken = mapElement.dataset.mapboxApiKey;
//     const map = new mapboxgl.Map({
//       container: 'map',
//       style: 'mapbox://styles/nicovdb/ck7yt5run02jv1inzq58qhs03'
//     });

//     const markers = JSON.parse(mapElement.dataset.markers);
//     if (markers.length > 0) {
//       markers.forEach((marker) => {
//         const popup = new mapboxgl.Popup().setHTML(marker.infoWindow);

//         new mapboxgl.Marker()
//           .setLngLat([ marker.lng, marker.lat ])
//           .setPopup(popup)
//           .addTo(map);
//       });
//       fitMapToMarkers(map, markers);
//     }

//     var nothing = turf.featureCollection([]);
//     map.on('load', function() {
//       map.addSource('route', {
//         type: 'geojson',
//         data: nothing
//       });

//       map.addLayer({
//         id: 'routeline-active',
//         type: 'line',
//         source: 'route',
//         layout: {
//           'line-join': 'round',
//           'line-cap': 'round'
//         },
//         paint: {
//           'line-color': '#3887be',
//           'line-width': [
//             "interpolate",
//             ["linear"],
//             ["zoom"],
//             12, 3,
//             22, 12
//           ]
//         }
//       }, 'waterway-label');

//       map.addLayer({
//         id: 'routearrows',
//         type: 'symbol',
//         source: 'route',
//         layout: {
//           'symbol-placement': 'line',
//           'text-field': '▶',
//           'text-size': [
//             "interpolate",
//             ["linear"],
//             ["zoom"],
//             12, 24,
//             22, 60
//           ],
//           'symbol-spacing': [
//             "interpolate",
//             ["linear"],
//             ["zoom"],
//             12, 30,
//             22, 160
//           ],
//           'text-keep-upright': false
//         },
//         paint: {
//           'text-color': '#3887be',
//           'text-halo-color': 'hsl(55, 11%, 96%)',
//           'text-halo-width': 3
//         }
//       }, 'waterway-label');

//       const finished = JSON.parse(mapElement.dataset.finished);
//       if (finished) {
//         const coordinates = JSON.parse(mapElement.dataset.coordinates);
//         $.ajax({
//           method: 'GET',
//           url: assembleQueryURL(coordinates),
//         }).done(function(data) {
//           // Create a GeoJSON feature collection
//           var routeGeoJSON = turf.featureCollection([turf.feature(data.trips[0].geometry)]);

//           if (!data.trips[0]) {
//             routeGeoJSON = nothing;
//           } else {
//             // Update the `route` source by getting the route source
//             // and setting the data equal to routeGeoJSON
//             map.getSource('route')
//               .setData(routeGeoJSON);
//             console.log(routeGeoJSON)
//           }
//         });
//       };
//     });

//     function assembleQueryURL(coordinates) {
//       return 'https://api.mapbox.com/optimized-trips/v1/mapbox/driving/' + coordinates.join(';') + '?annotations=duration' + '&overview=full&steps=true&geometries=geojson&source=first&access_token=' + mapboxgl.accessToken;
//     }
//   }
// };

const initMapbox = () => {

  const fitMapToMarkers = (map, markers) => {
    let truckHash = {lng: truckLocation[0], lat: truckLocation[1] }
    let markersCopy = markers;
    markersCopy.push(truckHash);

    const bounds = new mapboxgl.LngLatBounds();
    markersCopy.forEach(marker => bounds.extend([ marker.lng, marker.lat ]));
    map.fitBounds(bounds, { padding: 100, maxZoom: 15, duration: 0 });
  };

  let truckLocation = [-0.5654924, 44.8592094];
  var warehouseLocation = [-0.5654924, 44.8592094];
  var lastQueryTime = 0;
  var lastAtRestaurant = 0;
  var keepTrack = [];
  var currentSchedule = [];
  var currentRoute = null;
  var pointHopper = {};
  var pause = true;
  var speedFactor = 50;

  const mapElement = document.getElementById('map');

  if (mapElement) {
    mapboxgl.accessToken = mapElement.dataset.mapboxApiKey;
    const markers = JSON.parse(mapElement.dataset.markers);


    // Initialize a map
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/nicovdb/ck7yt5run02jv1inzq58qhs03',
      center: [-0.5654924, 44.8592094],
      zoom: 9
    });

    var warehouse = turf.featureCollection([turf.point(warehouseLocation)]);

    // Create an empty GeoJSON feature collection for drop off locations
    var dropoffs = turf.featureCollection([]);

    // Create an empty GeoJSON feature collection, which will be used as the data source for the route before users add any new data
    var nothing = turf.featureCollection([]);

    map.on('load', function() {
      var marker = document.createElement('div');
      marker.classList = 'truck';

      // Create a new marker
      const truckMarker = new mapboxgl.Marker(marker)
        .setLngLat(truckLocation)
        .addTo(map);

      // Create a new marker
      markers.forEach((marker) => {
        const popup = new mapboxgl.Popup().setHTML(marker.infoWindow);
        const element = document.createElement('div');
          element.className = 'stop';
        new mapboxgl.Marker(element)
          .setLngLat([ marker.lng, marker.lat ])
          .setPopup(popup)
          .addTo(map);
      });

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
          'icon-image': ''
        }
      });

      map.addSource('route', {
        type: 'geojson',
        data: nothing
      });

      map.addLayer(
        {
          id: 'routeline-active',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#2F5174',
            'line-width': ['interpolate', ['linear'], ['zoom'], 12, 3, 22, 12]
          }
        },
        'waterway-label'
      );

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
          'text-color': '#2F5174',
          'text-halo-color': 'hsl(55, 11%, 96%)',
          'text-halo-width': 3
        }
      }, 'waterway-label');

       // Listen for a click on the map
      // map.on('load', function() {
        // When the map is clicked, add a new drop off point
        // and update the `dropoffs-symbol` layer

      markers.forEach((marker) => {
        newDropoff(marker);
        updateDropoffs(dropoffs);
      });
      fitMapToMarkers(map, markers);
    // });

    // Listen for a click on the map
    // map.on('click', function(e) {
    //   // When the map is clicked, add a new drop off point
    //   // and update the `dropoffs-symbol` layer
    //   newDropoff(map.unproject(e.point));
    //   console.log(map.unproject(e.point));
    //   updateDropoffs(dropoffs);
    // });

    });

    function newDropoff(coords) {
      // Store the clicked point as a new GeoJSON feature with
      // two properties: `orderTime` and `key`
      var pt = turf.point([coords.lng, coords.lat], {
        orderTime: Date.now(),
        key: Math.random()
      });
      dropoffs.features.push(pt);
      pointHopper[pt.properties.key] = pt;

      // Make a request to the Optimization API
      $.ajax({
        method: 'GET',
        url: assembleQueryURL()
      }).done(function(data) {
        // Create a GeoJSON feature collection
        var routeGeoJSON = turf.featureCollection([
          turf.feature(data.trips[0].geometry)
        ]);

        // If there is no route provided, reset
        if (!data.trips[0]) {
          routeGeoJSON = nothing;
        } else {
          // Update the `route` source by getting the route source
          // and setting the data equal to routeGeoJSON
          map.getSource('route').setData(routeGeoJSON);
        }

        //
        if (data.waypoints.length === 12) {
          window.alert(
            'Maximum number of points reached. '
          );
        }
      });
    }

    function updateDropoffs(geojson) {
      map.getSource('dropoffs-symbol').setData(geojson);
    }

    // Here you'll specify all the parameters necessary for requesting a response from the Optimization API
    function assembleQueryURL() {
      // Store the location of the truck in a variable called coordinates
      var coordinates = [truckLocation];
      var distributions = [];
      keepTrack = [truckLocation];

      // Create an array of GeoJSON feature collections for each point
      var restJobs = objectToArray(pointHopper);

      // If there are actually orders from this restaurant
      if (restJobs.length > 0) {
        // Check to see if the request was made after visiting the restaurant
        var needToPickUp =
          restJobs.filter(function(d, i) {
            return d.properties.orderTime > lastAtRestaurant;
          }).length > 0;

        // If the request was made after picking up from the restaurant,
        // Add the restaurant as an additional stop
        if (needToPickUp) {
          var restaurantIndex = coordinates.length;
          // Add the restaurant as a coordinate
          coordinates.push(warehouseLocation);
          // push the restaurant itself into the array
          keepTrack.push(pointHopper.warehouse);
        }

        restJobs.forEach(function(d, i) {
          // Add dropoff to list
          keepTrack.push(d);
          coordinates.push(d.geometry.coordinates);
          // if order not yet picked up, add a reroute
          if (needToPickUp && d.properties.orderTime > lastAtRestaurant) {
            distributions.push(
              restaurantIndex + ',' + (coordinates.length - 1)
            );
          }
        });
      }

    // Set the profile to `driving`
    // Coordinates will include the current location of the truck,
      return (
        'https://api.mapbox.com/optimized-trips/v1/mapbox/walking/' +
        coordinates.join(';') +
        '?overview=full&steps=true&geometries=geojson&source=first&access_token=' +
        mapboxgl.accessToken
      );
    }

    function objectToArray(obj) {
      var keys = Object.keys(obj);
      var routeGeoJSON = keys.map(function(key) {
        return obj[key];
      });
      return routeGeoJSON;
    }
  };
};

export { initMapbox };
