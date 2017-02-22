
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////
var map;
//////////////////////////////////////////////// OBJECTS ////////////////////////////////////////////////////
var Station = {
    init: function (address, availableBikeStands, availableBikes, bikeStands, name, position, status) {
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.bikeStands = bikeStands;
        this.name = name;
        this.position = position;
        this.marker = new google.maps.Marker({
            position: {
                lat: this.position[0],
                lng: this.position[1]
            },
            map: map,
            icon: '',
            title: this.name
        });
        if (this.status == 'CLOSED') {
            this.marker.icon = 'assets/img/closed.png';
        }
        else if (this.availableBike == 0) {
            this.marker.icon = 'assets/img/full.png';
        }
        else if (this.availableBikeStand == 0) {
            this.marker.icon = 'assets/img/empty.png';
        }
        else {
            this.marker.icon = 'assets/img/open.png';
        }
    }
};

var Stations = {
    init: function () {
        this.stations = this.recupStations();
        this.markers = this.createMarkers(this.stations);
    },

    recupStations: function () {
        array = [];
        $.ajax({
            url: 'https://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=10',
            method: 'GET',
            async: false,
            success: function (data) {
                for (var i = 0; i < data.records.length; i++)
                {
                    var element = data.records[i].fields;
                    var station = Object.create(Station);
                    station.init(
                        element.address,
                        element.availableBikeStands,
                        element.availableBikes,
                        element.bikeStands,
                        element.name,
                        element.position,
                        element.status
                    );
                    array.push(station);
                }
            }
        });
        return array;
    },

    createMarkers: function (stations) {

    }
};

initMap();

//////////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////////////

// On initialise la carte sur PARIS
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 48.862725
            , lng: 2.287592000000018
        }
        , zoom: 11
    });
    var stations = Object.create(Stations);
    stations.init();
    var detail = document.getElementById("station");
    //detail.innerHTML = stations.stations[0].name;
    console.log(stations.stations[0]);
}
