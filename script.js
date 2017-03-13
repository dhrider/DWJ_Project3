
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////

var map;
var numeroStation;
var markerCluster;
var stations = "";
var reservation = "";
var minutes = 19;
var secondes = 60;
var timer;
var stationReservee = false;
var nom = document.getElementById('nom');
var adresse = document.getElementById("adresse");
var emplacementLibre = document.getElementById("emplacementLibre");
var dispo = document.getElementById("dispo");
var btnReserver = document.getElementById("reserverVelo");
var btnAnnuler = document.getElementById("annuler");
var btnEffacer = document.getElementById("effacer");
var btnValider = document.getElementById("valider");
var timerReservation = document.getElementById('pied');
var canvas  = document.querySelector('#canvas');
var context = canvas.getContext('2d');
var diaporama = document.getElementsByTagName('ul');

//////////////////////////////////////////////// OBJECTS ////////////////////////////////////////////////////

var Station = {
    init: function (address, availableBikeStands, availableBikes, name, position, status, number) {
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

        if (this.status == 'CLOSED')
        {
            this.marker.icon = 'assets/img/closed.png';
        }
        else if (this.availableBikes == 0)
        {
            this.marker.icon = 'assets/img/full.png';
        }
        else if (this.availableBikeStands == 0)
        {
            this.marker.icon = 'assets/img/empty.png';
        }
        else
        {
            this.marker.icon = 'assets/img/open.png';
        }

        google.maps.event.addListener(this.marker, 'click', function () {
            if(!stationReservee)
            {
                if (status !== 'CLOSED')
                {
                    numeroStation = number;
                    Stations.afficheStationOuverte(name, address, availableBikeStands, availableBikes);
                }
                else
                {
                    Stations.afficheStationFermee();
                }
            }
            else
            {
                //alertBox();
                Stations.annulerReservationEnCours();

                if (status !== 'CLOSED')
                {
                    numeroStation = number;
                    Stations.afficheStationOuverte(name, address, availableBikeStands, availableBikes);
                }
                else
                {
                    Stations.afficheStationFermee();
                }
            }
        });
    },

    updateStation: function (availableBikeStands, availableBikes) {
        this.availableBikeStands += availableBikeStands;
        this.availableBikes += availableBikes;
        emplacementLibre.innerHTML = this.availableBikeStands;
        dispo.innerHTML = this.availableBikes;
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

    trouveStation: function (numero) {
        return this.stations.find(function (n) {
           return n.number === numero;
       });
    },

    reserveStation: function (station, reservation) {
        if (station && station.availableBikes !== 0)
        {
            stationReservee = true;
            station.updateStation(1, -1);
            this.setReservationTimer(station, minutes , secondes);

            reservation = Object.create(Reservation);
            reservation.init();
            reservation.id = numeroStation;
            reservation.name = station.name;
            reservation.address = station.address;
            reservation.availableBikeStands = station.availableBikeStands;
            reservation.availableBikes = station.availableBikes;
            reservation.timeStamp = Math.floor(Date.now() / 1000);

            this.saveBrowser(reservation);
        }
        else if (station.availableBikes == 0)
        {
            $('#reserverVelo').attr('disabled', true);
            timerReservation.innerHTML = "AUCUN VELO DISPONIBLE - RESERVATION IMPOSSIBLE !"
        }
    },

    setReservationTimer : function (station, min, sec) {
        var tmp =(min * 60 + sec) * 10;

        timer = setInterval(function (){
            min = Math.floor(tmp/600);
            sec = Math.floor((tmp-min*600)/10);

            timerReservation.innerHTML ="1 VELO RESERVE A LA STATION : " + station.name + " POUR " + min + " MIN "  + sec + " S ";

            if (tmp !== 0)
            {
                tmp--;
            }
            else
            {
                /*clearInterval(timer);
                station.updateStation(-1, 1);
                Stations.effacerReservation();
                stationReservee = false;
                localStorage.removeItem('reservation');*/
                Stations.annulerReservationEnCours(station);
            }

        },100);
    },

    saveBrowser: function (reservation) {
        localStorage.setItem('reservation', JSON.stringify(reservation));
    },

    effacerReservation: function () {

        $('#signature').attr('hidden', 'hidden');
        $('#reserverVelo').attr('disabled', false);
        timerReservation.innerHTML = "RESERVATION ANNULEE !";
    },

    annulerReservationEnCours: function () {
        alertBox();
        clearInterval(timer);
        Station.updateStation(-1, 1);
        Stations.effacerReservation();
        stationReservee = false;
        localStorage.removeItem('reservation');
    },

    afficheStationOuverte: function (name, address, availableBikeStands, availableBikes) {
        nom.innerHTML = name;
        adresse.innerHTML = address;
        emplacementLibre.innerHTML = availableBikeStands;
        dispo.innerHTML = availableBikes;
        timerReservation.innerHTML = "";

        $('#signature').attr('hidden', 'hidden');

        if (availableBikes !== 0)
            $('#reserverVelo').attr('disabled', false);
        else
            $('#reserverVelo').attr('disabled', true);
    },

    afficheStationFermee: function () {
        nom.innerHTML = " ";
        adresse.innerHTML = " ";
        emplacementLibre.innerHTML = " ";
        dispo.innerHTML = " ";
        timerReservation.innerHTML = "STATION FERMEE !";
        $('#reserverVelo').attr('disabled', true);
        $('#signature').attr('hidden', 'hidden');
    },

    stationAfterRefresh: function(stations, reservationSaved) {
        stationReservee = true;

        var  stationEnCoursReservation= stations.trouveStation(reservationSaved.id);

        stationEnCoursReservation.updateStation(1, -1);

        nom.innerHTML = reservationSaved.name;
        adresse.innerHTML = reservationSaved.address;
        emplacementLibre.innerHTML = reservationSaved.availableBikeStands;
        dispo.innerHTML = reservationSaved.availableBikes;

        var timeLeft = Math.floor(Date.now() / 1000) - reservationSaved.timeStamp;

        var divisor_for_minutes = timeLeft % (60 * 60);
        var min = Math.floor(divisor_for_minutes / 60);

        var divisor_for_seconds = divisor_for_minutes % 60;
        var sec = Math.ceil(divisor_for_seconds);

        stations.setReservationTimer(stationEnCoursReservation, (minutes - min), (secondes - sec));
    }

};

var Reservation = {
    init: function () {
        this.id = 0;
        this.name = "";
        this.address = "";
        this.availableBikeStands = 0;
        this.availableBikes = 0;
        this.timeStamp = 0;
        this.signature = "";
    }
};


//////////////////////////////////////////// CHARGEMNENT PAGE ///////////////////////////////////////////////


$(document).ready(function () {
    var $img = $('#carrousel img'), // on cible les images contenues dans le carrousel
        indexImg = $img.length - 1, // on définit l'index du dernier élément
        i = 0, // on initialise un compteur
        $currentImg = $img.eq(i); // enfin, on cible l'image courante, qui possède l'index i (0 pour l'instant)

    $img.css('display', 'none'); // on cache les images
    $currentImg.css('display', 'block'); // on affiche seulement l'image courante

    $(window).keydown(function(e){
        switch (e.keyCode) {
            case 37: // flèche gauche
                prev();
                break;
            case 39: // flèche droite
                next();
                break;
        }
    });

    $('#next').click(function(){ // image suivante
       next();
    });

    $('#prev').click(function(){ // image précédente
       prev();
    });

    function next() {
        $("#prev").show();
        i++; // on incrémente le compteur
        if( i < indexImg && i !== 2 )
        {

            $img.css('display', 'none'); // on cache les images
            $currentImg = $img.eq(i); // on définit la nouvelle image
            $currentImg.css('display', 'block'); // puis on l'affiche
        }
        else
        {
            $img.css('display', 'none'); // on cache les images
            $currentImg = $img.eq(i); // on définit la nouvelle image
            $currentImg.css('display', 'block'); // puis on l'affiche
            $("#next").hide();
            i = indexImg
        }
    }

    function prev() {
        i--; // on décrémente le compteur, puis on réalise la même chose que pour la fonction "suivante"

        if (i >= 0 && i !== 0)
        {
            $img.css('display', 'none');
            $currentImg = $img.eq(i);
            $currentImg.css('display', 'block');
            $("#next").show();
        }
        else
        {
            $img.css('display', 'none');
            $currentImg = $img.eq(i);
            $currentImg.css('display', 'block');
            $("#prev").hide();
            i = 0;
        }
    }

    $('#clearStorage').click(function () {
       localStorage.removeItem('reservation');
    });


    initMap();
});



//////////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////////////


function alertBox() {
    $('#alertBox').dialog({
        modal: true,
        height: 100,
        width: 250
    });
}

// On initialise la carte sur PARIS
function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 48.862725,
            lng: 2.287592000000018
        },
        zoom: 12
    });

    stations = Object.create(Stations);
    stations.init();

    markerCluster = new MarkerClusterer(map, stations.markers, {
        imagePath: 'assets/img/m'
    });

    //localStorage.removeItem('reservation');
    if (localStorage.getItem('reservation') !== null)
    {
        var save = JSON.parse(localStorage.getItem('reservation'));
        stations.stationAfterRefresh(stations,save);
    }
    else
    {
        nom.innerHTML = " ";
        adresse.innerHTML = " ";
        emplacementLibre.innerHTML = " ";
        dispo.innerHTML = " ";
        timerReservation.innerHTML = " ";
        stationReservee = false;
    }

    $('#reserverVelo').attr('disabled', true);

    btnReserver.addEventListener('click', function () {
        $('#reserverVelo').attr('disabled', true);
        $('#signature').removeAttr('hidden');
        timerReservation.innerHTML = " ";
        initDraw();
    });

    btnAnnuler.addEventListener('click', function () {
        stations.effacerReservation();
    });

    btnValider.addEventListener('click', function () {
        stations.reserveStation(stations.trouveStation(numeroStation),reservation);
        $('#signature').attr('hidden', 'hidden');
    });
}

function initDraw()
{
    clearCanvas();

    // Get a regular interval for drawing to the screen
    window.requestAnimFrame = (function (callback) {
        return  window.requestAnimationFrame ||
                window.webkitRequestAnimationFrame ||
                window.mozRequestAnimationFrame ||
                window.oRequestAnimationFrame ||
                window.msRequestAnimaitonFrame ||
                function (callback) {
                    window.setTimeout(callback, 1000/60);
                };
    })();

    // Set up the canvas
    context.strokeStyle = "#222222";
    context.lineWith = 2;

    btnEffacer.addEventListener('click', function () {
        clearCanvas();
    });

    // Set up mouse events for drawing
    var drawing = false;
    var mousePos = { x:0, y:0 };
    var lastPos = mousePos;

    // on définit
    canvas.addEventListener("mousedown", function (e) {
        drawing = true;
        lastPos = getMousePos(canvas, e);
    }, false);

    canvas.addEventListener("mouseup", function (e) {
        drawing = false;
    }, false);

    canvas.addEventListener("mousemove", function (e) {
        mousePos = getMousePos(canvas, e);
    }, false);


    // Set up touch events for mobile, etc
    canvas.addEventListener("touchstart", function (e) {
        mousePos = getTouchPos(canvas, e);
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousedown", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, false);

    canvas.addEventListener("touchend", function (e) {
        var mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    }, false);

    canvas.addEventListener("touchmove", function (e) {
        var touch = e.touches[0];
        var mouseEvent = new MouseEvent("mousemove", {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent);
    }, false);

    // Prevent scrolling when touching the canvas
    document.body.addEventListener("touchstart", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchend", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchmove", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);

    // Get the position of the mouse relative to the canvas
    function getMousePos(canvasDom, mouseEvent)
    {
        var rect = canvasDom.getBoundingClientRect(), // abs. size of element
            scaleX = canvasDom.width / rect.width,    // relationship bitmap vs. element for X
            scaleY = canvasDom.height / rect.height;  // relationship bitmap vs. element for Y

        return {
            x: (mouseEvent.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
            y: (mouseEvent.clientY - rect.top) * scaleY     // been adjusted to be relative to element
        }
    }

    // Get the position of a touch relative to the canvas
    function getTouchPos(canvasDom, touchEvent) {
        var rect = canvasDom.getBoundingClientRect(),
            scaleX = canvasDom.width / rect.width,    // relationship bitmap vs. element for X
            scaleY = canvasDom.height / rect.height;  // relationship bitmap vs. element for Y
        return {
            x: (touchEvent.touches[0].clientX - rect.left) * scaleX,
            y: (touchEvent.touches[0].clientY - rect.top) * scaleY
        };
    }

    // Draw to the canvas
    function renderCanvas()
    {
        if (drawing)
        {
            context.moveTo(lastPos.x, lastPos.y);
            context.lineTo(mousePos.x, mousePos.y);
            context.stroke();
            lastPos = mousePos;
        }
    }

    function clearCanvas() {
        canvas.width = canvas.width;
    }

    // Allow for animation
    (function drawLoop () {
        requestAnimFrame(drawLoop);
        renderCanvas();
    })();
}
