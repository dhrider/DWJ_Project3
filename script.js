
//////////////////////////////////////////////// VARIABLES //////////////////////////////////////////////////

/////// variables globales ///////

// Pour la carte
var map;
var markerCluster;

// Pour la gestion de la réservation
var numeroStation;
var stations;
var reservation;
var stationReservee = false;

// Pour la gestion du timer de réservation
var timer;
var minutes = 19;
var secondes = 60;

// Pour la gestion du slider
var firstImage = false;
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
var btnRecentrer = document.getElementById('recentrer');

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
    reserveStation: function (station) {
        // on vérifie qu'on pass bien une station en argument et qu'il y a au moins UN vélo dispo
        if (station && station.availableBikes !== 0)
        {
            stationReservee = true; // on passe la variable de réservation à true => elle nous servira plus tard
            station.updateStation(1, -1); // on lance l'update de la station (ici +1 stand , -1 vélo)
            this.setReservationTimer(station, minutes, secondes);// on lance le timer

            station.marker.setAnimation(google.maps.Animation.BOUNCE);// on anime le marker de la station

            // On stocke la latitude + longitude du marker et le zoom actuel de la map
            localStorage.setItem('markerLat', station.marker.position.lat());
            localStorage.setItem('markerLng', station.marker.position.lng());
            localStorage.setItem('mapZoom', map.getZoom());

            // on crée l'objet Réservation et on l'init
            reservation = Object.create(Reservation);
            reservation.init(
                numeroStation,
                station.name,
                station.address,
                station.availableBikeStands,
                station.availableBikes,
                Math.floor(Date.now() / 1000)
            );

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
            timerReservation.innerHTML = "1 VELO RESERVE A LA STATION : " +
                station.name + " POUR " +
                min + " MIN " +
                sec + " S "
            ;

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
    saveBrowser: function (reserv) {
        localStorage.setItem('reservation', JSON.stringify(reserv));
    },

    // fonction d'effacement de l'affichage de la réservation lorsque
    // l'on clique sur le bouton "annuler" après avoir choisi une station
    effacerReservation: function () {
        $('#signature').attr('hidden', 'hidden'); // on cache  le bloc "signature"
        $('#centrerStationReservee').attr('hidden', 'hidden'); // on cache le bouton "recentrer"
        $('#reserverVelo').attr('disabled', false); // on ré-active le bouton "Reserver"
        timerReservation.innerHTML = "RESERVATION ANNULEE";
    },

    // fonction d'annulation de la réservation en cours
    annulerReservationEnCours: function () {
        clearInterval(timer); // on efface le timer en cours

        // on récupère la station qui est réservée avec l'id de réservation
        var stationAnnulee = stations.trouveStation(reservation.id);
        stationAnnulee.updateStation(-1, 1); // on update la station en cours (-1 stand, +1 vélo)
        stationAnnulee.marker.setAnimation(null); // on stoppe l'animation du marker

        stations.effacerReservation(); // on lance l'effacement au niveau affichage
        stationReservee = false; // on repasse notre variable de réservation à false

        // on supprime toutes les sauvegardes locales
        localStorage.removeItem('reservation');
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

    // fonction de gestion de l'affichage d'une station "fermée"
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
        stationReservee = true; // on repasse la variable de présence d'une réservation à true

        // On recrée un objet réservation avec l'id de la réservation sauvegardée
        reservation = Object.create(Reservation);
        reservation.restoreAfterRefresh(reservationSaved.id);

        // on récupère la station qui a été sauvegardée
        var stationEnCours = stations.trouveStation(reservation.id);
        stationEnCours.updateStation(1, -1);
        stationEnCours.marker.setAnimation(google.maps.Animation.BOUNCE);

        // on re-centre sur la station réservée
        map.setCenter(new google.maps.LatLng(localStorage.getItem('markerLat'),localStorage.getItem('markerLng')));
        map.setZoom(parseInt(localStorage.getItem('mapZoom')));

        // on ré-affiche le bouton de re-centrage
        $('#centrerStationReservee').removeAttr('hidden');

        // affichage de la station
        nom.innerHTML = reservationSaved.name;
        adresse.innerHTML = reservationSaved.address;
        emplacementLibre.innerHTML = reservationSaved.availableBikeStands;
        dispo.innerHTML = reservationSaved.availableBikes;

        // On calcule le temps écoulé entre le timestamp de la réservation et celui au moment du refresh
        var elapsedTime = Math.floor(Date.now() / 1000) - reservationSaved.timeStamp;

        // on calcule les minutes écoulées
        var divisor_for_minutes = elapsedTime % (60 * 60);
        var min = Math.floor(divisor_for_minutes / 60);

        // on calcule les secondes écoulées
        var divisor_for_seconds = divisor_for_minutes % 60;
        var sec = Math.ceil(divisor_for_seconds);

        // on reset le timer avec les nouvelles minutes et secondes
        stations.setReservationTimer(stationEnCours, (minutes - min), (secondes - sec));
    },

    // fonction alert
    alerteReservationEnCours: function () {
        // boite de dialogue
        $('#alertBox').dialog({
            resizable: false,
            modal: true,
            height: "auto",
            width: 250,
            buttons: {
                // si on clique sur OUI
                "OUI": function () {
                    Stations.annulerReservationEnCours(); // on appelle l'annulation de la réservation
                    $(this).dialog("close"); // on ferme la boite de dialogue
                },
                // si on clique sur NON
                "NON": function () {
                    $(this).dialog("close"); // on ferme la boite de dialogue
                }
            }
        });
    },

    // fonction de re-centrage sur la station réservée
    centerReservedStation: function () {
        // on récupère la station en fonction du numéro de réservation
        var stationEnCours = stations.trouveStation(reservation.id);
        // on anime le marker
        stationEnCours.marker.setAnimation(google.maps.Animation.BOUNCE);
        // on se replace et on zoom sur la station
        map.setCenter(new google.maps.LatLng(localStorage.getItem('markerLat'),localStorage.getItem('markerLng')));
        map.setZoom(parseInt(localStorage.getItem('mapZoom')));
    }
};

// Objet Réservation
var Reservation = {
    // initialisation
    init: function (id, name, address, availableBikeStands, availableBikes, timeStamp) {
        this.id = id;
        this.name = name;
        this.address = address;
        this.availableBikeStands = availableBikeStands;
        this.availableBikes = availableBikes;
        this.timeStamp = timeStamp;
    },

    // affection de l'id en fonction de l'id d'une station réservée
    restoreAfterRefresh: function (id) {
        this.id = id;
    }
};


//////////////////////////////////////////// CHARGEMNENT PAGE ///////////////////////////////////////////////


$(document).ready(function () {
    // on empèche le message "loading" de s'afficher en bas de page à cause de l'utilisation de jQuery Mobile
    $(".ui-loader").hide();

    /////// Variables utilisées pour la gestion du slider sur Desktop et mobile/tablette ///////

    var $img = $('#carrousel img'), // on cible les images contenues dans le carrousel
    indexImg = $img.length - 1, // on définit l'index du dernier élément
    i = 0, // on initialise un compteur
    $currentImg = $img.eq(i); // enfin, on cible l'image courante, qui possède l'index i (0 pour l'instant)

    $img.css('display', 'none'); // on cache les images
    $currentImg.css('display', 'block'); // on affiche seulement l'image courante


    /////// Gestion des évènements souris, clavier et doigt (mobile et tablette) ///////

    // détection de l'utilisation des flèches du clavier pour animer le slider
    $(window).keydown(function(e){
        switch (e.keyCode) {
            case 37: // flèche gauche
                if (!firstImage) // tant qu'on an pas atteint la 1ère image on autorise "prev()"
                    prev();
                break;
            case 39: // flèche droite
                if (!lastImage) // tant qu'on a pas atteint la dernière image on autorise "next()"
                    next();
                break;
        }
    });

    // Swipe sur mobile/tablette
    $('#diaporama_container').on({
        'swipeleft' : function () {
            if (!lastImage)
                next(); // donc image suivante
        },
        'swiperight' : function () {
            if (!firstImage)
                prev(); // donc image précédente
        }
    });

    // Au click sur le bouton "flèche droite"
    $('#next').click(function(){ // image suivante
       next();
    });
    // Au click sur le bouton "flèche droite"
    $('#prev').click(function(){ // image précédente
       prev();
    });

    //////// Fonctions que gèrent le slider /////////

    // Gestion de la flèche droite du slider
    function next() {
        $("#prev").show(); // on affiche le bouton "flèche gauche" qui est caché par défaut

        i++; // on incrémente le compteur

        if( i < indexImg && i !== 2 ) // on vérifie qu'il reste des images suivantes et qu'on est pas sur la dernière image
        {
            afficheImage(i); // on affiche l'image
            firstImage = false; // on passe la variable à false pour signaler qu'on est plus sur la 1ère image
        }
        else // sinon ca veut dire qu'on arrive sur le dernière image
        {
            afficheImage(i); // on l'affiche
            $("#next").hide(); // on cache le bouton "flèche droite" comme c'est la dernière
            i = indexImg; // on redéfinit i ce qui nous servira pour faire défiler dans l'autre sens
            lastImage =true; // on dit qu'on est sur la dernière image
        }
    }

    // gestion de la flèche gauche du slider
    function prev() {
        i--; // on décrémente le compteur, puis on réalise la même chose que pour la fonction "suivante"

        if (i >= 0 && i !== 0) // on vérifie qu'il reste des images avant et qu'on est pas sur la 1ère image
        {
            afficheImage(i); // on affiche
            $("#next").show(); // on réaffiche le bouton "flèche droite" puisqu'il y a à nouveau des images après
            lastImage = false; // on est plus sur ma dernière image
        }
        else // sinon on est sur la 1ère image
        {
            afficheImage(i); // on l'affiche
            $("#prev").hide(); // on cache le bouton "flèche gauche"
            i = 0; // on redéfinit i
            firstImage = true; // on dit qu'on est sur la 1ère image
        }
    }

    // gestion de l'affichage de l'image du slider
    function afficheImage(index) {
        $img.css('display', 'none'); // on cache les images
        $currentImg = $img.eq(index); // on définit la nouvelle image
        $currentImg.css('display', 'block'); // puis on l'affiche
    }

    // on lance l'initialisation de la map
    initMap();
});



//////////////////////////////////////////////// FUNCTIONS //////////////////////////////////////////////////

// On initialise la carte sur PARIS
function initMap() {
    // création de la map Google avec centrage sur Paris
    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 48.862725,
            lng: 2.287592000000018
        },
        zoom: 12 // valeur du zoom pour avoir tout Paris visible au démarrage
    });

    // on crée l'objet Stations "globales" et on l'initialise
    stations = Object.create(Stations);
    stations.init();

    // on crée les markerClusters qui permettent de regrouper les markers pour une meilleure lisibilité
    markerCluster = new MarkerClusterer(map, stations.markers, {
        imagePath: 'assets/img/m', // on définit le chemin contenant les images des markerClusters
        maxZoom: 15 // on définit la limite du zoom au delà duquel on ne regroupe plus les markers
    });

    // on vérifie s'il y a une sauvegarde locale d'une réservation
    if (localStorage.getItem('reservation') !== null) // si oui
    {
        // on récupère la sauvegarde
        var save = JSON.parse(localStorage.getItem('reservation'));
        // on affiche la carte avec la station réservée
        stations.stationAfterRefresh(stations,save);
    }
    else // sinon
    {
        // on vide les affichages
        nom.innerHTML = " ";
        adresse.innerHTML = " ";
        emplacementLibre.innerHTML = " ";
        dispo.innerHTML = " ";
        timerReservation.innerHTML = " ";
        stationReservee = false; // on définit qu'aucune station n'est réservée
    }

    $('#reserverVelo').attr('disabled', true); // on désactive le bouton de réservation

    ///////// Gestion des Listeners des boutons à leur "click" /////////////

    // bouton "Réserver"
    btnReserver.addEventListener('click', function () { // au click
        $('#reserverVelo').attr('disabled', true); // on désactive le bouton de réservation
        $('#signature').removeAttr('hidden'); // on affiche la DIV de "signature"
        initDraw(); // on initialise les fonctions de dessin du CANVAS
    });

    // bouton "Annuler"
    btnAnnuler.addEventListener('click', function () { // au click
        stations.effacerReservation(); // on lance la méthode d'effacement de la station
    });

    // bouton "Valider"
    btnValider.addEventListener('click', function () { // au click
        stations.reserveStation(stations.trouveStation(numeroStation)); // on lance la méthode de réservation
        $('#signature').attr('hidden', 'hidden'); // on cache la DIV de "signature"
        $('#centrerStationReservee').removeAttr('hidden'); // on affiche le bouton de recentrage de la map
    });

    // bouton "Recentrer"
    btnRecentrer.addEventListener('click', function () { // au click
       stations.centerReservedStation(); // on lance la méthode de recentrage
    });
}

// Fonction de gestion du dessin de la signature à la souris (Desktop) et touch (Mobile)
function initDraw()
{
    clearCanvas(); // on lance la fonction qui vide le canvas

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

    // définition du canvas
    context.strokeStyle = "#222222"; // couleur du trait
    context.lineWith = 2; // épaisseur du trait

    // Listener sur le bouton "Effacer"
    btnEffacer.addEventListener('click', function () { // au click
        clearCanvas(); // on efface le canvas
    });

    /////// Gestion du mouvement de l'écriture ///////////

    // Variables
    var drawing = false;
    var mousePos = { x:0, y:0 };
    var lastPos = mousePos;

    // Ecriture à la souris
    // Les listeners sur le canvas
    canvas.addEventListener("mousedown", function (e) { // au click sur la souris
        drawing = true; // début du dessin
        lastPos = getMousePos(canvas, e); // on récupère la position du curseur de la souris
    }, false);

    canvas.addEventListener("mouseup", function (e) { // au laché du bouton de la souris
        drawing = false; // fin du dessin
    }, false);

    canvas.addEventListener("mousemove", function (e) { // quand on bouge la souris
        mousePos = getMousePos(canvas, e); // on récupère la position du curseur de la souris
    }, false);


    // Ecriture au doigt (mobile/tablette)
    // Listeners
    canvas.addEventListener("touchstart", function (e) { // quand on touche l'écran avec le doigt
        mousePos = getTouchPos(canvas, e); // on récupère la position du doigt sur le canvas
        var touch = e.touches[0]; // on définit "le doigt" pour gèrer son déplacement
        var mouseEvent = new MouseEvent("mousedown", { // on simule un click de la souris en lancant l'event "mousedown"
            // on récupère les position x et y du doigt pour l'event
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent); // on dispatch l'event vers le canvas
    }, false);

    canvas.addEventListener("touchend", function (e) { // quand on ote le doigt de l'écran
        // on simule un "mouseup" en lancant un MouseEvent qu'on dispatch sur le canvas
        var mouseEvent = new MouseEvent("mouseup", {});
        canvas.dispatchEvent(mouseEvent);
    }, false);

    canvas.addEventListener("touchmove", function (e) { // quand on bouge le doigt sur l'écran
        var touch = e.touches[0]; // on définit "le doigt" pour gèrer son déplacement
        var mouseEvent = new MouseEvent("mousemove", { // on simule un "mousemove" en lancant l'event correspondant
            // on récupère les position x et y du doigt pour l'event
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        canvas.dispatchEvent(mouseEvent); // on dispatch l'event vers le canvas
    }, false);

    // On empèche le scrolling de la page si le doigt "sort" des limites du canvas
    document.body.addEventListener("touchstart", function (e) {
        if (e.target == canvas){
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchend", function (e) {
        if (e.target == canvas) {
            e.preventDefault();
        }
    }, false);
    document.body.addEventListener("touchmove", function (e) {
        if (e.target == canvas){
            e.preventDefault();
        }
    }, false);

    ///////// Fonctions de récupérations des positions sur le canvas /////////////////

    // Pour la souris
    function getMousePos(canvasDom, mouseEvent)
    {
        var rect = canvasDom.getBoundingClientRect(), // dimension absolu du canvas
            scaleX = canvasDom.width / rect.width,    // relationship bitmap vs. element for X
            scaleY = canvasDom.height / rect.height;  // relationship bitmap vs. element for Y

        return {
            x: (mouseEvent.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
            y: (mouseEvent.clientY - rect.top) * scaleY     // been adjusted to be relative to element
        }
    }

    // Pour "un doigt"
    function getTouchPos(canvasDom, touchEvent) {
        var rect = canvasDom.getBoundingClientRect(), // dimension absolu du canvas
            scaleX = canvasDom.width / rect.width,    // relationship bitmap vs. element for X
            scaleY = canvasDom.height / rect.height;  // relationship bitmap vs. element for Y
        return {
            x: (touchEvent.touches[0].clientX - rect.left) * scaleX,
            y: (touchEvent.touches[0].clientY - rect.top) * scaleY
        };
    }

    // On dessine sur le canvas
    function renderCanvas()
    {
        if (drawing) // si on dessine (mousedown ou touchstart)
        {
            context.moveTo(lastPos.x, lastPos.y);
            context.lineTo(mousePos.x, mousePos.y);
            context.stroke();
            lastPos = mousePos;
        }
    }

    // fonction d'effacement du canvas
    function clearCanvas() {
        canvas.width = canvas.width;
    }

    // Permet l'animation du tracé du dessin
    (function drawLoop () {
        requestAnimFrame(drawLoop);
        renderCanvas();
    })();
}
