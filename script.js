
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////

// variables globales //
var map;
var numeroStation;
var markerCluster;
var timer;
var stations = "";
var reservation = "";
var minutes = 19;
var secondes = 60;
var stationReservee = false;
var fistImage = false;
var lastImage = false;

// variables des éléments d'affichage //
var nom = document.getElementById('nom');
var adresse = document.getElementById("adresse");
var emplacementLibre = document.getElementById("emplacementLibre");
var dispo = document.getElementById("dispo");
var timerReservation = document.getElementById('pied');

// Variables boutons //
var btnReserver = document.getElementById("reserverVelo");
var btnAnnuler = document.getElementById("annuler");
var btnEffacer = document.getElementById("effacer");
var btnValider = document.getElementById("valider");

// Variables du Canvas //
var canvas  = document.querySelector('#canvas');
var context = canvas.getContext('2d');

//////////////////////////////////////////////// OBJECTS ////////////////////////////////////////////////////

// Objet Station "unique"
var Station = {
    // initialisation à la création
    init: function (address, availableBikeStands, availableBikes, name, position, status, number) {
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.name = name;
        this.position = position;
        this.status = status;
        this.number = number;
        //this.reservee = false;
        this.marker = new google.maps.Marker({ // on initialise un nouveau marker lié à la station
            position: {
                lat: this.position[0],
                lng: this.position[1]
            },
            map: map,
            icon: '',
            title: this.name
        });
        // On définit l'îcone rattaché à la station
        if (this.status == 'CLOSED') // si la station est fermée
        {
            this.marker.icon = 'assets/img/closed.png';
        }
        else if (this.availableBikes == 0) // s'il n'y a pas de vélos disponibles
        {
            this.marker.icon = 'assets/img/full.png';
        }
        else if (this.availableBikeStands == 0) // s'il n'y a pas de stands disponibles
        {
            this.marker.icon = 'assets/img/empty.png';
        }
        else // si la station est ouverte
        {
            this.marker.icon = 'assets/img/open.png';
        }

        // on définit un Listener sur le click du marker de la station
        google.maps.event.addListener(this.marker, 'click', function () {
            if(!stationReservee) // s'il n'y a pas de station réservée
            {
                // et que la station est "ouverte" alors
                if (status !== 'CLOSED')
                {
                    // on stocke le numéro de la station
                    numeroStation = number;
                    // on affiche la station sélectionnée
                    Stations.afficheStationOuverte(name, address, availableBikeStands, availableBikes);
                }
                else // si la station est "fermée"
                {
                    // on adapte l'affiche
                    Stations.afficheStationFermee();
                }
            }
            else // si une station est déjà réservée
            {
                // on alerte et on donne le choix d'annuler ou non la réservation
                Stations.alerteReservationEnCours();
            }
        });
    },

    // fonction d'update de la station
    updateStation: function (availableBikeStands, availableBikes) {
        this.availableBikeStands += availableBikeStands; // on augmente le nombre de stands dispos
        this.availableBikes += availableBikes; // on augmente (ou on diminue) le nombre de vélos dispos (+1 ou -1 vélos)

        // on update l'affichage
        emplacementLibre.innerHTML = this.availableBikeStands;
        dispo.innerHTML = this.availableBikes;
    }
};

// Objet Stations englobant toutes les stations
var Stations = {
    // initialisation à la création
    init: function () {
        this.stations = this.recupStations();
        this.markers = this.createMarkers(this.stations);
    },

    // fonction de récupération des stations auprès de la ville de Paris
    recupStations: function () {
        // tableau qui contiendra les stations
        var array = [];
        // requête AJAX en 'GET' sur l'API de la ville de Paris
        $.ajax({
            url: 'https://opendata.paris.fr/api/records/1.0/search/?dataset=stations-velib-disponibilites-en-temps-reel&rows=1500',
            method: 'GET',
            async: false,
            success: function (data) {
                // on boucle sur les données
                for (var i = 0; i < data.records.length; i++)
                {
                    // variable recevant tous les champs de chaque éléments "station"
                    var element = data.records[i].fields;

                    // on crée une nouvelle station
                    var station = Object.create(Station);
                    // on l'initialise avec les champs de l'élément
                    station.init(
                        element.address,
                        element.available_bike_stands,
                        element.available_bikes,
                        element.name,
                        element.position,
                        element.status,
                        element.number
                    );
                    // on place la station dans le tableau
                    array.push(station);
                }
            }
        });
        // on retourne le tableau
        return array;
    },

    // fonction de création des Markers de la carte avec les stations en argument
    createMarkers: function (stations) {
        var array = [];
        for (var i = 0; i < stations.length; i++) {
            array.push(stations[i].marker);
        }
        return array;
    },

    // fonction de recherche de la station en fonction de son numéro puis on la retourne
    trouveStation: function (numero) {
        return this.stations.find(function (n) {
           return n.number === numero;
       });
    },

    // fonction de réservation de la station
    reserveStation: function (station, reservation) {
        // on vérifie qu'on pass bien une station en argument et qu'il y a au moins UN vélo dispo
        if (station && station.availableBikes !== 0)
        {
            stationReservee = true; // on passe la variable de réservation à true => elle nous servira plus tard
            station.updateStation(1, -1); // on lance l'update de la station (ici +1 stand , -1 vélo)
            this.setReservationTimer(station, minutes , secondes);// on lance le timer

            station.marker.setAnimation(google.maps.Animation.BOUNCE);

            localStorage.setItem('markerLat', station.marker.position.lat());
            localStorage.setItem('markerLng', station.marker.position.lng());
            localStorage.setItem('mapZoom', map.getZoom());

            // on crée l'objet Réservation et on l'init
            reservation = Object.create(Reservation);
            reservation.init();

            // on l'hydrate
            reservation.id = numeroStation;
            reservation.name = station.name;
            reservation.address = station.address;
            reservation.availableBikeStands = station.availableBikeStands;
            reservation.availableBikes = station.availableBikes;
            reservation.timeStamp = Math.floor(Date.now() / 1000); // on récupère le timestamp de la réservation

            // on lance la sauvegarde de la réservation => localstorage
            this.saveBrowser(reservation);
        }
    },

    // fonction de gestion du timer
    setReservationTimer : function (station, min, sec) {
        var tmp =(min * 60 + sec) * 10;
        // on crée un interval en 100ème de secondes
        timer = setInterval(function (){
            min = Math.floor(tmp/600);
            sec = Math.floor((tmp-min*600)/10);

            // on gère l'affichage du timer
            timerReservation.innerHTML ="1 VELO RESERVE A LA STATION : " + station.name + " POUR " + min + " MIN "  + sec + " S ";

            // tant que le timer n'est pas à zéro
            if (tmp > 0)
            {
                tmp--; // on décrémente
            }
            else // si timer == 0
            {
                // on lance l'annulation de la réservation en cours
                Stations.annulerReservationEnCours();
            }

        },100);
    },

    // fonction de sauvagarde en local de la réservation
    saveBrowser: function (reservation) {
        localStorage.setItem('reservation', JSON.stringify(reservation));
    },

    // fonction d'effacement de l'affichage de la réservation lorsque l'on clique sur le bouton "annuler" après avoir choisi une station
    effacerReservation: function () {
        $('#signature').attr('hidden', 'hidden');
        $('#reserverVelo').attr('disabled', false);
        timerReservation.innerHTML = "RESERVATION ANNULEE";
    },

    // fonction d'annulation de la réservation en cours
    annulerReservationEnCours: function (numeroStation) {
        clearInterval(timer); // on efface le timer en cours
        var stationAnnulee = stations.trouveStation(numeroStation);
        stationAnnulee.updateStation(-1, 1); // on update la station en cours (-1 stand, +1 vélo)
        stationAnnulee.marker.setAnimation(null);
        Stations.effacerReservation(); // on lance l'effacement au niveau affichage
        stationReservee = false; // on repasse notre variable de réservation à false
        localStorage.removeItem('reservation'); // on supprime la sauvegarde locale
        localStorage.removeItem('markerLat');
        localStorage.removeItem('markerLng');
        localStorage.removeItem('mapZoom');
    },

    // fonction des gestion de l'affichage d'une station "ouverte"
    afficheStationOuverte: function (name, address, availableBikeStands, availableBikes) {
        nom.innerHTML = name;
        adresse.innerHTML = address;
        emplacementLibre.innerHTML = availableBikeStands;
        dispo.innerHTML = availableBikes;
        timerReservation.innerHTML = "";

        $('#signature').attr('hidden', 'hidden'); // on cache le canvas signature dans le cas où il était visible

        // on vérifie si la station choisie possède ou non des vélos dispos
        if (availableBikes !== 0)
            $('#reserverVelo').attr('disabled', false); // si elle en possède on active le bouton de réservation
        else
        {
            $('#reserverVelo').attr('disabled', true); // sinon on le désactive
            timerReservation.innerHTML = "AUCUN VELO DISPONIBLE - RESERVATION IMPOSSIBLE !"
        }
    },

    // fonction des gestion de l'affichage d'une station "fermée"
    afficheStationFermee: function () {
        nom.innerHTML = " ";
        adresse.innerHTML = " ";
        emplacementLibre.innerHTML = " ";
        dispo.innerHTML = " ";
        timerReservation.innerHTML = "STATION FERMEE !";
        $('#reserverVelo').attr('disabled', true); // On désactive le bouton de réservation
        $('#signature').attr('hidden', 'hidden'); // on cache le canvas signature dans le cas où il était visible
    },

    // fonction de gestion de la réservation après rafraichissement de la page
    stationAfterRefresh: function(stations, reservationSaved) {
        stationReservee = true;
        numeroStation = reservationSaved.id;

        var stationEnCours = stations.trouveStation(numeroStation);

        stationEnCours.updateStation(1, -1);

        stationEnCours.marker.setAnimation(google.maps.Animation.BOUNCE);
        map.setCenter(new google.maps.LatLng(localStorage.getItem('markerLat'),localStorage.getItem('markerLng')));
        //map.setZoom(16);
        map.setZoom(parseInt(localStorage.getItem('mapZoom')));

        nom.innerHTML = reservationSaved.name;
        adresse.innerHTML = reservationSaved.address;
        emplacementLibre.innerHTML = reservationSaved.availableBikeStands;
        dispo.innerHTML = reservationSaved.availableBikes;

        var timeLeft = Math.floor(Date.now() / 1000) - reservationSaved.timeStamp;

        var divisor_for_minutes = timeLeft % (60 * 60);
        var min = Math.floor(divisor_for_minutes / 60);

        var divisor_for_seconds = divisor_for_minutes % 60;
        var sec = Math.ceil(divisor_for_seconds);

        stations.setReservationTimer(stationEnCours, (minutes - min), (secondes - sec));
    },

    // fonction alert
    alerteReservationEnCours: function () {
        $('#alertBox').dialog({
            resizable: false,
            modal: true,
            height: "auto",
            width: 250,
            buttons: {
                "OUI": function () {
                    Stations.annulerReservationEnCours(numeroStation);
                    $(this).dialog("close");
                },
                "NON": function () {
                    $(this).dialog("close");
                }
            }
        });
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
                if (!fistImage)
                    prev();
                break;
            case 39: // flèche droite
                if (!lastImage)
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
            afficheImage(i);
            fistImage = false;
        }
        else
        {
            afficheImage(i);
            $("#next").hide();
            i = indexImg;
            lastImage =true;
        }
    }

    function prev() {
        i--; // on décrémente le compteur, puis on réalise la même chose que pour la fonction "suivante"

        if (i >= 0 && i !== 0)
        {
            afficheImage(i);
            $("#next").show();
            lastImage = false;
        }
        else
        {
            afficheImage(i);
            $("#prev").hide();
            i = 0;
            fistImage = true;
        }
    }

    function afficheImage(index) {
        $img.css('display', 'none'); // on cache les images
        $currentImg = $img.eq(index); // on définit la nouvelle image
        $currentImg.css('display', 'block'); // puis on l'affiche
    }

    $('#clearStorage').click(function () {
       localStorage.removeItem('reservation');
    });
    


    initMap();
});



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

    stations = Object.create(Stations);
    stations.init();

    markerCluster = new MarkerClusterer(map, stations.markers, {
        imagePath: 'assets/img/m'
    });

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
