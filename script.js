//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////

var map;
var indexStation;

//////////////////////////////////////////////// OBJECTS //////////////////////////////////////////////////

var Station = {
    initStation: function (address, availableBikeStands, availableBikes, bikeStands, name, position, status) {
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.bikeStands = bikeStands;
        this.name = name;
        this.position = position;
        if (status == "OPEN")
            this.status = true;
        else
            this.status = false;
        this.reservation = false;
    }
};

var Stations = {
    initStations: function () {
        indexStation = 0;
        this.station = [];
    },
    
    addStation: function (station) {
        this.station[indexStation] = station;
        indexStation += 1;
    }
};

var Reservation = {
    intitReservation: function () {
        this.idStations = 0;
        this.reservation = false;
    }
};

var stations = Object.create(Stations);
stations.initStations();


//////////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////////////

// On initialise la carte sur PARIS
function initMap()
{
    map = new google.maps.Map(document.getElementById('map'), {
        center: {lat: 48.862725, lng: 2.287592000000018},
        zoom: 11
    });

    ajaxGet("https://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=50",
        function (reponse)
        {
            var records = JSON.parse(reponse);
            records["records"].forEach(function (record) {
                var station = Object.create(Station);
                station.initStation(
                    record["fields"]["address"],
                    record["fields"]["available_bike_stands"],
                    record["fields"]["available_bikes"],
                    record["fields"]["bike_stands"],
                    record["fields"]["name"],
                    record["fields"]["position"],
                    record["fields"]["status"]
                );

                stations.addStation(station);
            });

            for (var i=0; i < stations.station.length; i++) {
                var LatLng = new google.maps.LatLng(stations.station[i].position[0], stations.station[i].position[1]);
                var marker = new google.maps.Marker({
                    position: LatLng
                });

                marker.setMap(map);
            }
        }
    );
}

// Exécute un appel AJAX GET
// Prend en paramètres l'URL cible et la fonction callback appelée en cas de succès
function ajaxGet(url, callback)
{
    var req = new XMLHttpRequest();
    req.open("GET", url);
    req.addEventListener("load", function () {
        if (req.status >= 200 && req.status < 400) {
            // Appelle la fonction callback en lui passant la réponse de la requête
            callback(req.responseText);
        } else {
            console.error(req.status + " " + req.statusText + " " + url);
        }
    });
    req.addEventListener("error", function () {
        console.error("Erreur réseau avec l'URL " + url);
    });
    req.send(null);
}