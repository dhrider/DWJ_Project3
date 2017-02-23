
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////
var map

//////////////////////////////////////////////// OBJECTS ////////////////////////////////////////////////////
var Station = {
    init: function (address, availableBikeStands, availableBikes, bikeStands, name, position, status) {
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.bikeStands = bikeStands;
        this.name = name;
        this.position = position;
        this.status = status;
        this.marker = new google.maps.Marker({
            position: {
                lat: this.position[0],
                lng: this.position[1]
            },
            map: map,
            icon: '',
            title: this.name
        });

        google.maps.event.addListener(this.marker, 'click', function () {
            affichageHTMLStation(name, address, bikeStands, availableBikes);
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
        var array = [];
        $.ajax({
            url: 'https://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=15',
            method: 'GET',
            async: false,
            success: function (data) {
                for (var i = 0; i < data.records.length; i++)
                {
                    var element = data.records[i].fields;
                    var station = Object.create(Station);
                    station.init(
                        element.address,
                        element.available_bike_stands,
                        element.available_bikes,
                        element.bike_stands,
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
        var array = [];
        for (var i = 0; i < stations.length; i++) {
            array.push(stations[i].marker);
        }
        return array;
    }
};


//////////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////////////


// On initialise la carte sur PARIS
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 48.862725,
            lng: 2.287592000000018
        },
        zoom: 12
    });

    var stations = Object.create(Stations);
    stations.init();
    var markerCluster = new MarkerClusterer(map, stations.markers, {
        imagePath: 'assets/img/m'
    });

    //console.log(stations.markers);
}

function affichageHTMLStation(name, address, bike_stands, available_bikes) {
    var detail = document.getElementById("detailStation");
    detail.innerHTML =
        "Nom :" + name + "\n" +
        "Adresse : " + address + "\n" +
        "<br/>" +
        bike_stands + " places" + "\n" +
        available_bikes + " vélos disponibles"
    ;


}
