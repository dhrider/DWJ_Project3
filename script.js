
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////

var map;
var numeroStation;
var markerCluster;
var stationReservee;
var chrono;
var nom = document.getElementById('nom');
var adresse = document.getElementById("adresse");
var emplacementLibre = document.getElementById("emplacementLibre");
var dispo = document.getElementById("dispo");
var btnReserver = document.getElementById("reserverVelo");
var timerReservation = document.getElementById('timer');
var canvas = document.querySelector('#canvas');

//////////////////////////////////////////////// OBJECTS ////////////////////////////////////////////////////

var Station = {
    init: function (address, availableBikeStands, availableBikes, name, position, status,number) {
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.name = name;
        this.position = position;
        this.status = status;
        this.number = number;
        this.reservee = false;
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
        else if (this.availableBikes == 0) {
            this.marker.icon = 'assets/img/full.png';
        }
        else if (this.availableBikeStands == 0) {
            this.marker.icon = 'assets/img/empty.png';
        }
        else {
            this.marker.icon = 'assets/img/open.png';
        }

        google.maps.event.addListener(this.marker, 'click', function () {
            if (status !== 'CLOSED')
            {
                affichageHTMLStation(name, address, availableBikes, availableBikeStands);
                numeroStation = number;
                timerReservation.innerHTML = "";
                $('button').attr('disabled', false);
            }
            else
            {
                timerReservation.innerHTML = "STATION FERMEE !";
                $('button').attr('disabled', false);
            }
        });
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
            url: 'https://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=1500',
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
                        element.name,
                        element.position,
                        element.status,
                        element.number
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
    },

    reserveStation: function (numero) {
       stationReservee = this.stations.find(function (n) {
           return n.number === numero;
       });

       stationReservee.reservee = true;

       return stationReservee;
    },

    updateStation: function (station) {
        if (station.reservee)
        {
            if (station && station.availableBikes !== 0) {
                updateAffichageHTML(station.availableBikeStands += 1, station.availableBikes -= 1);
                this.setReservationTimer(station);
            }
            else if (station.availableBikes == 0) {
                $('button').attr('disabled', true);
                timerReservation.innerHTML = "AUCUN VELO DISPONIBLE - RESERVATION IMPOSSIBLE !"
            }
        }
        else
        {
            updateAffichageHTML(station.availableBikeStands -= 1, station.availableBikes += 1);
            station.reservee = false;
        }
    },

    setReservationTimer : function (station) {
        var min = 0,sec = 15,dse = 0;
        var tmp =(min * 60 + sec) * 10 + dse;

        chrono = setInterval(function (){
            min = Math.floor(tmp/600);
            sec = Math.floor((tmp-min*600)/10);
            dse = tmp -((min * 60) + sec) * 10;
            timerReservation.innerHTML ="1 VELO RESERVE A LA STATION : " + station.name + " POUR " + min + " MIN "  + sec + " S ";
            if (tmp !== 0)
            {
                tmp--;
            }
            else
            {
                clearInterval(chrono);
                annulerReservation();
                updateAffichageHTML(station.availableBikeStands -= 1, station.availableBikes += 1);
            }
            },
            100
        );
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

    markerCluster = new MarkerClusterer(map, stations.markers, {
        imagePath: 'assets/img/m'
    });

    btnReserver.addEventListener('click', function () {
        stations.updateStation(stations.reserveStation(numeroStation));
        $('button').attr('disabled', true);
    });

    nom.innerHTML = " ";
    adresse.innerHTML = " ";
    emplacementLibre.innerHTML = " ";
    dispo.innerHTML = " ";
    timerReservation.innerHTML = " ";

    $('button').attr('disabled', true);


}

function affichageHTMLStation(name, address, availablebikes, availableBikeStands) {
    nom.innerHTML = name;
    adresse.innerHTML = address;
    emplacementLibre.innerHTML = availableBikeStands;
    dispo.innerHTML = availablebikes;
}

function updateAffichageHTML(availableBikeStands, availableBikes) {
    emplacementLibre.innerHTML = availableBikeStands;
    dispo.innerHTML = availableBikes;

}

function annulerReservation() {
    $('button').attr('disabled', false);
    timerReservation.innerHTML = "RESERVATION ANNULEE !";
}
