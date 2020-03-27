import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import helpers from '@turf/helpers';
import buffer from '@turf/buffer';
// import MapboxDirections from '@mapbox/mapbox-gl-directions/dist/mapbox-gl-directions';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';

const initMapbox = () => {
  const mapElement = document.getElementById('map');

  if (mapElement) {


    mapboxgl.accessToken = mapElement.dataset.mapboxApiKey;
    const markers = JSON.parse(mapElement.dataset.markers);


    // Initialize a map
    const map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/nicovdb/ck7yt5run02jv1inzq58qhs03',
      center: [1.7191036, 46.71109],
      zoom: 5
    });

    const fitMapToMarkers = (map, markers) => {
      let truckHash = {lng: truckLocation[0], lat: truckLocation[1] }
      let markersCopy = markers;
      markersCopy.push(truckHash);

      const bounds = new mapboxgl.LngLatBounds();
      markersCopy.forEach(marker => bounds.extend([ marker.lng, marker.lat ]));
      map.fitBounds(bounds, { padding: 100, maxZoom: 14, duration: 0 });
    };

    let truckLocation = [-0.5654924, 44.8592094];
    var lastQueryTime = 0;
    var lastAtRestaurant = 0;
    var keepTrack = [];
    var currentSchedule = [];
    var currentRoute = null;
    var pointHopper = {};
    var pause = true;
    var speedFactor = 50;

    navigator.geolocation.getCurrentPosition(updatePosition);
    function updatePosition(position) {
      truckLocation = [position.coords.longitude, position.coords.latitude];
    }

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

      let profile = "walking";
      setRoute(profile);

      const cycling = document.getElementById("cycling");
      const driving = document.getElementById("driving");
      const walking = document.getElementById("walking");

      cycling.addEventListener("click", (e) => {
        profile = "cycling";
        cycling.classList.remove("active");
        walking.classList.remove("active");
        driving.classList.remove("active");
        cycling.classList.add("active");
        setRoute(profile);
      });

      driving.addEventListener("click", (e) => {
        profile = "driving";
        cycling.classList.remove("active");
        walking.classList.remove("active");
        driving.classList.remove("active");
        driving.classList.add("active");
        setRoute(profile);
      });

      walking.addEventListener("click", (e) => {
        profile = "walking";
        cycling.classList.remove("active");
        walking.classList.remove("active");
        driving.classList.remove("active");
        walking.classList.add("active");
        setRoute(profile);
      });

      function setRoute(profile) {
        markers.forEach((marker) => {
          newDropoff(marker);
        });
        ajaxRequest(profile);
        updateDropoffs(dropoffs);
        fitMapToMarkers(map, markers);
      }
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
    }

    function ajaxRequest(profile) {
      $.ajax({
        method: 'GET',
        url: assembleQueryURL(profile)
      }).done(function(data) {
        console.log(data);
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

        const minutes = document.getElementById('minutes');
        const km = document.getElementById('km');
        console.log(data["trips"][0]);
        minutes.innerHTML = Math.round(data["trips"][0]["duration"]/60);
        km.innerHTML = (data["trips"][0]["distance"]/1000).toFixed(2);

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
    function assembleQueryURL(profile) {
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
          // coordinates.push(warehouseLocation);
          // push the restaurant itself into the array
          // keepTrack.push(pointHopper.warehouse);
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
        'https://api.mapbox.com/optimized-trips/v1/mapbox/' + profile + '/' +
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
