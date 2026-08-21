const API = "http://localhost:4000/api";


// =====================================================
// GET SELECTED LOCATION
// =====================================================

const storedLocation =
    sessionStorage.getItem(
        "disasterOSLocation"
    );


if (!storedLocation) {

    // User somehow opened dashboard directly

    window.location.href =
        "./index.html";

    throw new Error(
        "No DisasterOS location selected."
    );
}


const locationData =
    JSON.parse(storedLocation);


let selectedLat =
    Number(locationData.latitude);


let selectedLng =
    Number(locationData.longitude);


let selectedPlaceName =
    locationData.name ||
    "Selected Location";