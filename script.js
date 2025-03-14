// Evangelion-Inspired Ramadan Moon & Sun Tracker
// Main JavaScript file

// Variables
let scene, camera, renderer, globe, moon, sun;
let userLocation = { lat: 0, lng: 0 };
let moonPhase = 0;
let isNewMoonApproaching = false;
let terminalLines = [];
let locationMarker;
let locationName = "UNKNOWN";
let orbitControls = false;
let orbitAngle = 0;
let currentInput = ""; // Store user's current terminal input
let countryData = {}; // Will store country code -> name mapping
let cityData = {}; // Will store city data by country code
let commandHistory = []; // Store command history
let historyIndex = -1; // Current position in command history
let audioContext; // Web Audio API context
let audioSource; // Audio source node
let songPlaying = false; // Track if the iftar song is playing
let iftarCountdownInterval; // Interval for updating the iftar countdown
let maghribTime; // Store Maghrib/Iftar time
let sunsetTime; // Store sunset time
let sunriseTime; // Store sunrise time
let cinematicMode = true; // Enable cinematic camera mode by default
let cinematicViewTimer = null; // Timer for switching cinematic views
let currentCinematicView = 0; // Current cinematic view index
let lastCinematicViewChange = 0; // Last time the view changed
let inCameraTransition = false; // Flag to track if a camera transition is in progress
let visualEffects = { // Store visual effects objects
  atField: null,
  comets: [],
  shootingStars: []
};
let clock = null; // THREE.Clock for animation timing

// Constants
const GLOBE_RADIUS = 1;
const MOON_RADIUS = 0.27;  // Increased from 0.2 to be more proportional
const SUN_RADIUS = 2.5;    // Increased from 0.5 to be more proportional but still visible at a distance
const MOON_DISTANCE = 4;   // Increased from 3 to give more space
const SUN_DISTANCE = 15;   // Increased from 7 to better simulate solar system scale
const MARKER_SIZE = 0.08;
const MARKER_HEIGHT = 0.04;
const IFTAR_SONG_DURATION = 90; // Duration of the song in seconds
const IFTAR_SONG_URL = "assets/asma.mp3"; // Use local file from assets directory
const PLAY_SONG_MINUTES_BEFORE_IFTAR = 5; // Play the song 5 minutes before iftar

// Initialize everything when the DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize all components
  initTerminal();
  initThreeJS();
  getUserLocation();
  getIslamicDate();
  getShamsiDate();
  getGregorianDate();
  updateClock();

  // Set up audio context
  setupAudioContext();

  // Set up the refresh location button
  document.getElementById("refresh-location").addEventListener("click", () => {
    addTerminalLine("REFRESHING LOCATION...");
    getUserLocation();
  });

  // Update the clock every second
  setInterval(updateClock, 1000);

  // Check for iftar time every minute
  setInterval(checkIftarTime, 60000);

  // Initial check for iftar time
  setTimeout(checkIftarTime, 3000);

  // Initialize cinematic camera mode
  initCinematicMode();
});

// Initialize cinematic camera mode
function initCinematicMode() {
  // Set initial cinematic mode state - enable it by default
  cinematicMode = true;
  orbitControls = false;
  inCameraTransition = false;
  
  // Initialize cinematic views
  currentCinematicView = 0;
  lastCinematicViewChange = Date.now();
  
  // Set initial camera position to the first cinematic view
  if (cinematicViews && cinematicViews.length > 0 && camera) {
    const firstView = cinematicViews[0];
    camera.position.copy(firstView.position);
    camera.lookAt(firstView.target);
  }
}

// Initialize the terminal with welcome messages
function initTerminal() {
  const terminalOutput = document.getElementById("terminal-output");

  addTerminalLine("NERV CELESTIAL TRACKING SYSTEM v1.0.0");
  addTerminalLine("ACCESSING MAGI DATABASE...");
  addTerminalLine("SYNCHRONIZING WITH SATELLITES...");
  addTerminalLine("LUNAR PHASE ANALYSIS INITIALIZED");
  addTerminalLine("AWAITING NEURAL COMMAND INPUT...");
  addTerminalLine("TYPE 'help' FOR AVAILABLE COMMANDS", "success");

  // Make cursor blink
  setInterval(() => {
    const cursor = document.querySelector(".cursor");
    cursor.style.opacity = cursor.style.opacity === "0" ? "1" : "0";
  }, 500);

  // Set up keyboard event listener
  document.addEventListener("keydown", handleKeyDown);

  // Initialize terminal input
  updateTerminalInput();

  // Initialize country and city data
  fetchCountryData();
}

// Handle keyboard input
function handleKeyDown(event) {
  // Handle enter key
  if (event.key === "Enter") {
    processCommand();
    return;
  }

  // Handle backspace
  if (event.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
    updateTerminalInput();
    return;
  }

  // Handle arrow up for previous command
  if (event.key === "ArrowUp") {
    if (commandHistory.length > 0 && historyIndex > 0) {
      historyIndex--;
      currentInput = commandHistory[historyIndex];
      updateTerminalInput();
    }
    return;
  }

  // Handle arrow down for next command
  if (event.key === "ArrowDown") {
    if (historyIndex < commandHistory.length - 1) {
      historyIndex++;
      currentInput = commandHistory[historyIndex];
      updateTerminalInput();
    } else if (historyIndex === commandHistory.length - 1) {
      // If at the end of history, clear the input
      historyIndex = commandHistory.length;
      currentInput = "";
      updateTerminalInput();
    }
    return;
  }

  // Ignore other control keys
  if (event.ctrlKey || event.altKey || event.metaKey || event.key.length > 1) {
    return;
  }

  // Add character to input
  currentInput += event.key;
  updateTerminalInput();
}

// Update the terminal input display
function updateTerminalInput() {
  const userInputEl = document.querySelector(
    ".terminal-input-line .user-input"
  );
  userInputEl.textContent = currentInput;
}

// Process user command
function processCommand() {
  const command = currentInput.trim().toLowerCase();

  if (command) {
    // Echo the command to the terminal
    addTerminalLine(`NERV@COMMANDER:~$ ${command}`);

    // Add command to history if it's not empty and not the same as the last command
    if (
      command &&
      (commandHistory.length === 0 ||
        commandHistory[commandHistory.length - 1] !== command)
    ) {
      commandHistory.push(command);
    }
    // Reset history index to point to end of history
    historyIndex = commandHistory.length;

    // Process the command
    if (command === "help") {
      showHelp();
    } else if (command === "countries") {
      showCountries(1); // Show first page by default
    } else if (command.match(/^countries\s+\d+$/)) {
      const page = parseInt(command.split(" ")[1]);
      showCountries(page);
    } else if (command.startsWith("cities ")) {
      const countryCode = command.substring(7).trim();
      showCities(countryCode);
    } else if (command.startsWith("setloc ")) {
      const locationInput = command.substring(7).trim();
      setLocation(locationInput);
    } else if (command === "iplocate") {
      getIPBasedLocation();
    } else if (command === "calendar") {
      // Force refresh all calendar displays
      getGregorianDate();
      getShamsiDate();
      getIslamicDate();
      addTerminalLine("CALENDAR SYSTEMS REFRESHED", "success");
    } else if (command === "test-iftar") {
      addTerminalLine("TESTING IFTAR AUDIO SEQUENCE", "warning");
      if (audioContext) {
        playIftarSong();
      } else {
        addTerminalLine(
          "AUDIO CONTEXT NOT INITIALIZED. CLICK ANYWHERE ON THE PAGE FIRST.",
          "error"
        );
      }
    } else if (command === "toggle-cinematic") {
      toggleCinematicMode(!cinematicMode);
    } else if (command === "toggle-orbit") {
      toggleOrbitMode(!orbitControls);
    } else {
      addTerminalLine(`UNKNOWN COMMAND: ${command}`, "error");
      addTerminalLine("TYPE 'help' FOR AVAILABLE COMMANDS", "warning");
    }
  }

  // Clear input
  currentInput = "";
  updateTerminalInput();
}

// Show help information
function showHelp() {
  addTerminalLine("AVAILABLE COMMANDS:", "success");
  addTerminalLine("help - Display this help information");
  addTerminalLine("countries [page] - List available countries");
  addTerminalLine("cities [country-code] - List cities in a country");
  addTerminalLine("setloc [city-code or city-name] - Set your location");
  addTerminalLine("  Examples: 'setloc us1' or 'setloc New York' or 'setloc Tokyo, Japan'");
  addTerminalLine("iplocate - Attempt to locate based on IP address");
  addTerminalLine("calendar - Refresh calendar displays");
  addTerminalLine("test-iftar - Test the iftar notification sound");
  addTerminalLine("toggle-cinematic - Toggle cinematic camera mode");
  addTerminalLine("toggle-orbit - Toggle orbit camera mode");
  addTerminalLine("song-url [url] - Set custom iftar song URL");
  addTerminalLine("reset-song - Reset to default iftar song");
  addTerminalLine("orbit [on/off] - Toggle orbit camera mode");
}

// Set a custom song URL
function setSongUrl(url) {
  // Function removed as per requirements
}

// Reset to default song URL
function resetSongUrl() {
  // Function removed as per requirements
}

// Add line to terminal
function addTerminalLine(text, className = "") {
  terminalLines.push(`<div class="terminal-line ${className}">${text}</div>`);

  // Keep terminal at max 30 lines
  if (terminalLines.length > 30) {
    terminalLines.shift();
  }

  updateTerminal();
}

// Type text with a typewriter effect
function typeTerminalText(text, className = "") {
  let index = 0;
  const speed = 30; // Typing speed in milliseconds
  const chars = text.split("");
  const terminalLine = document.createElement("div");
  terminalLine.className = `terminal-line ${className}`;
  document.getElementById("terminal-output").appendChild(terminalLine);

  function typeChar() {
    if (index < chars.length) {
      terminalLine.textContent += chars[index];
      index++;

      // Get the terminal container which is the scrollable element
      const terminalContainer = document.querySelector(".terminal");

      // Scroll to the bottom after each character
      terminalContainer.scrollTop = terminalContainer.scrollHeight;

      setTimeout(typeChar, speed);
    }
  }

  typeChar();
}

// Update the terminal with all current lines
function updateTerminal() {
  const terminalOutput = document.getElementById("terminal-output");
  terminalOutput.innerHTML = terminalLines.join("");

  // Get the terminal container which is the scrollable element
  const terminalContainer = document.querySelector(".terminal");

  // Use three different approaches to ensure scrolling works reliably across browsers

  // 1. Direct property setting
  terminalContainer.scrollTop = terminalContainer.scrollHeight;

  // 2. Use requestAnimationFrame for next paint cycle
  requestAnimationFrame(() => {
    terminalContainer.scrollTop = terminalContainer.scrollHeight;
  });

  // 3. Use setTimeout as a backup
  setTimeout(() => {
    terminalContainer.scrollTop = terminalContainer.scrollHeight;
  }, 10);
}

// Get the user's geolocation
function getUserLocation() {
  addTerminalLine("ATTEMPTING TO ACQUIRE USER LOCATION...");

  // Show loading state in UI
  document.getElementById("latitude").textContent = "LOADING...";
  document.getElementById("longitude").textContent = "LOADING...";
  document.getElementById("location-name").textContent =
    "ACQUIRING LOCATION...";

  // Add loading class for visual effect
  document.getElementById("latitude").classList.add("loading");
  document.getElementById("longitude").classList.add("loading");
  document.getElementById("location-name").classList.add("loading");

  // Disable refresh button during operation
  const refreshButton = document.getElementById("refresh-location");
  refreshButton.disabled = true;
  refreshButton.classList.add("disabled");

  // First try to get location using IP
  addTerminalLine("TRYING IP-BASED GEOLOCATION FIRST...");
  fetch("https://ipapi.co/json/")
    .then((response) => response.json())
    .then((data) => {
      if (data.latitude && data.longitude) {
        userLocation.lat = data.latitude;
        userLocation.lng = data.longitude;

        // Update the UI with coordinates
        document.getElementById("latitude").textContent = formatCoordinate(
          userLocation.lat,
          true
        );
        document.getElementById("longitude").textContent = formatCoordinate(
          userLocation.lng,
          false
        );

        // Remove loading classes
        document.getElementById("latitude").classList.remove("loading");
        document.getElementById("longitude").classList.remove("loading");

        // Re-enable refresh button
        refreshButton.disabled = false;
        refreshButton.classList.remove("disabled");

        // Set location name
        locationName = data.city
          ? `${data.city}, ${data.country_name}`
          : data.country_name;
        document.getElementById("location-name").textContent = locationName;
        document.getElementById("location-name").classList.remove("loading");

        addTerminalLine(`IP LOCATION ACQUIRED: ${locationName}`, "success");

        // Update globe and fetch data for the new location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }

        // Fetch prayer times and celestial data for the new location
        getPrayerTimes(userLocation.lat, userLocation.lng);
        getCelestialData(userLocation.lat, userLocation.lng);
        getIslamicDate();
        getShamsiDate();
        getGregorianDate();

        // Force an immediate check for iftar time with the new location
        setTimeout(checkIftarTime, 1000);

        // Update the globe view to center on user's location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }
      } else {
        // IP geolocation failed, try browser geolocation
        addTerminalLine(
          "IP GEOLOCATION FAILED, TRYING BROWSER GEOLOCATION...",
          "warning"
        );
        tryBrowserGeolocation();
      }
    })
    .catch((error) => {
      // IP geolocation error, try browser geolocation
      addTerminalLine(`IP GEOLOCATION ERROR: ${error.message}`, "error");
      addTerminalLine("FALLING BACK TO BROWSER GEOLOCATION...", "warning");
      tryBrowserGeolocation();
    });
}

// Try to get location using browser geolocation
function tryBrowserGeolocation() {
  addTerminalLine("ATTEMPTING BROWSER GEOLOCATION...");

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation.lat = position.coords.latitude;
        userLocation.lng = position.coords.longitude;

        // Remove loading classes
        document.getElementById("latitude").classList.remove("loading");
        document.getElementById("longitude").classList.remove("loading");

        // Re-enable refresh button
        const refreshButton = document.getElementById("refresh-location");
        refreshButton.disabled = false;
        refreshButton.classList.remove("disabled");

        // Update UI with coordinates
        document.getElementById("latitude").textContent = formatCoordinate(
          userLocation.lat,
          true
        );
        document.getElementById("longitude").textContent = formatCoordinate(
          userLocation.lng,
          false
        );

        addTerminalLine(
          `LOCATION ACQUIRED: ${formatCoordinate(
            userLocation.lat,
            true
          )}, ${formatCoordinate(userLocation.lng, false)}`,
          "success"
        );

        // Perform reverse geocoding to get location name
        getReverseGeocode(userLocation.lat, userLocation.lng);

        // Once we have the location, fetch prayer times and celestial data
        getPrayerTimes(userLocation.lat, userLocation.lng);
        getCelestialData(userLocation.lat, userLocation.lng);
        getIslamicDate();
        getShamsiDate();
        getGregorianDate();

        // Force an immediate check for iftar time with the new location
        setTimeout(checkIftarTime, 1000);

        // Update the globe view to center on user's location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }
      },
      (error) => {
        addTerminalLine(`GEOLOCATION ERROR: ${error.message}`, "error");
        // Try IP-based geolocation as fallback
        getIPBasedLocation();
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  } else {
    addTerminalLine("GEOLOCATION NOT SUPPORTED BY BROWSER", "error");
    // Try IP-based geolocation as fallback
    getIPBasedLocation();
  }
}

// Use Mecca as default location
function useDefaultLocation() {
  userLocation.lat = 21.4225;
  userLocation.lng = 39.8262;

  // Remove loading classes
  document.getElementById("latitude").classList.remove("loading");
  document.getElementById("longitude").classList.remove("loading");
  document.getElementById("location-name").classList.remove("loading");

  // Re-enable refresh button
  const refreshButton = document.getElementById("refresh-location");
  refreshButton.disabled = false;
  refreshButton.classList.remove("disabled");

  // Update UI with coordinates
  document.getElementById("latitude").textContent = formatCoordinate(
    userLocation.lat,
    true
  );
  document.getElementById("longitude").textContent = formatCoordinate(
    userLocation.lng,
    false
  );

  // Set default location name
  locationName = "MECCA (DEFAULT)";
  document.getElementById("location-name").textContent = locationName;
  addTerminalLine(`USING DEFAULT LOCATION: ${locationName}`, "warning");

  // Still fetch data with default location
  getPrayerTimes(userLocation.lat, userLocation.lng);
  getCelestialData(userLocation.lat, userLocation.lng);
  getIslamicDate();
  getShamsiDate();
  getGregorianDate();

  // Force an immediate check for iftar time with the default location
  setTimeout(checkIftarTime, 1000);

  // Create marker for default location
  if (globe) {
    positionGlobeToLocation(userLocation.lat, userLocation.lng);
    createLocationMarker(userLocation.lat, userLocation.lng);
  }
}

// Function to perform reverse geocoding using a public API
function getReverseGeocode(lat, lng) {
  addTerminalLine("PERFORMING REVERSE GEOCODING...");

  // Show loading state
  document.getElementById("location-name").textContent = "GEOCODING...";
  document.getElementById("location-name").classList.add("loading");

  // Using the OpenCage Geocoding API
  const apiKey = "4eb5e2ffe02f479da1c4455e32c1e0c3"; // Free public API key
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${apiKey}&language=en`;

  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      // Remove loading state
      document.getElementById("location-name").classList.remove("loading");

      if (data.results && data.results.length > 0) {
        const result = data.results[0];

        // Extract relevant location information
        const components = result.components;
        let displayName = "";

        if (components.city) {
          displayName = components.city;
        } else if (components.town) {
          displayName = components.town;
        } else if (components.village) {
          displayName = components.village;
        } else if (components.county) {
          displayName = components.county;
        }

        // Add country
        if (components.country) {
          displayName += displayName
            ? `, ${components.country}`
            : components.country;
        }

        locationName = displayName || "UNKNOWN LOCATION";
        document.getElementById("location-name").textContent = locationName;
        addTerminalLine(`LOCATION IDENTIFIED: ${locationName}`, "success");

        // Update globe and fetch data for the new location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }

        // Fetch prayer times and celestial data for the new location
        getPrayerTimes(userLocation.lat, userLocation.lng);
        getCelestialData(userLocation.lat, userLocation.lng);
        getIslamicDate();
        getShamsiDate();
        getGregorianDate();

        // Force an immediate check for iftar time with the new location
        setTimeout(checkIftarTime, 1000);

        // Update the globe view to center on user's location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }
      } else {
        locationName = "UNIDENTIFIED LOCATION";
        document.getElementById("location-name").textContent = locationName;
        addTerminalLine("UNABLE TO IDENTIFY LOCATION NAME", "warning");
      }
    })
    .catch((error) => {
      document.getElementById("location-name").classList.remove("loading");
      document.getElementById("location-name").textContent =
        "GEOCODING ERROR";

      locationName = "GEOCODING ERROR";
      document.getElementById("location-name").textContent = locationName;
      addTerminalLine(`GEOCODING ERROR: ${error.message}`, "error");
    });
}

// Format coordinate to degrees, minutes, seconds
function formatCoordinate(coord, isLatitude) {
  const absolute = Math.abs(coord);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = Math.floor((minutesNotTruncated - minutes) * 60);

  const direction = isLatitude
    ? coord >= 0
      ? "N"
      : "S"
    : coord >= 0
    ? "E"
    : "W";

  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

// Initialize the Three.js scene
function initThreeJS() {
  // Create scene
  scene = new THREE.Scene();

  // Create clock for animation timing
  clock = new THREE.Clock();

  // Create camera
  camera = new THREE.PerspectiveCamera(
    45, // Field of view
    document.getElementById("globe-canvas").clientWidth /
      document.getElementById("globe-canvas").clientHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  camera.position.z = 5;

  // Create renderer with better quality settings
  renderer = new THREE.WebGLRenderer({ 
    alpha: true, 
    antialias: true,
    logarithmicDepthBuffer: true 
  });
  renderer.setSize(
    document.getElementById("globe-canvas").clientWidth,
    document.getElementById("globe-canvas").clientHeight
  );
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  document.getElementById("globe-canvas").appendChild(renderer.domElement);

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0x404050, 1);
  scene.add(ambientLight);

  // Add directional light (simulating sun)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
  directionalLight.position.set(5, 3, 5);
  scene.add(directionalLight);

  // Create Earth globe
  createGlobe();

  // Create Moon
  createMoon();

  // Create Sun
  createSun();

  // Add stars
  createStars();
  
  // Add celestial phenomena (comets, shooting stars)
  createCelestialPhenomena();

  // Start animation loop
  animate();

  // Handle window resize
  window.addEventListener("resize", onWindowResize);
}

// Create Earth globe with wireframe overlay
function createGlobe() {
  // Create sphere geometry with more segments for better detail
  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);

  // Create a group to hold the Earth and its grid
  const earthGroup = new THREE.Group();
  scene.add(earthGroup);
  
  // Create a separate group for the grid and wireframe elements
  const gridGroup = new THREE.Group();
  earthGroup.add(gridGroup);

  // Create Earth texture material with high-quality textures
  const textureLoader = new THREE.TextureLoader();
  
  // Load Earth textures with Evangelion-inspired color scheme
  const earthTexture = textureLoader.load(
    "/static/textures/earth_daymap.jpg"
  );
  
  // Load bump map for terrain elevation
  const bumpMap = textureLoader.load(
    "/static/textures/earth_normal_map.jpg"
  );
  
  // Load specular map for water reflections
  const specularMap = textureLoader.load(
    "/static/textures/earth_specular_map.jpg"
  );

  // Create Earth material with Evangelion-inspired colors
  const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: bumpMap,
    bumpScale: 0.05,
    specularMap: specularMap,
    specular: new THREE.Color(0x2222ff), // Blue-ish specular highlights
    shininess: 15,
  });

  // Create Earth mesh
  globe = new THREE.Mesh(geometry, earthMaterial);
  earthGroup.add(globe);

  // Create atmosphere glow effect
  const atmosphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.02, 64, 64);
  const atmosphereMaterial = new THREE.MeshPhongMaterial({
    color: 0x0088ff,
    transparent: true,
    opacity: 0.1,
    side: THREE.BackSide,
  });
  const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
  earthGroup.add(atmosphere);

  // Create wireframe overlay with Evangelion-inspired colors
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffaa, // Teal color similar to NERV terminal displays
    wireframe: true,
    transparent: true,
    opacity: 0.2,
  });

  // Create wireframe overlay
  const wireframe = new THREE.Mesh(geometry, wireframeMaterial);
  wireframe.scale.multiplyScalar(1.01); // Slightly larger to avoid z-fighting
  gridGroup.add(wireframe);

  // Add latitude/longitude grid to the grid group
  addGrid(gridGroup);
  
  // Store the earth group and grid group for animation
  globe.userData.group = earthGroup;
  globe.userData.gridGroup = gridGroup;
}

// Add latitude/longitude grid to the globe
function addGrid(earthGroup) {
  const material = new THREE.LineBasicMaterial({
    color: 0x00ffaa, // Match the wireframe color
    transparent: true,
    opacity: 0.3,
  });

  // Add latitude lines
  for (let lat = -80; lat <= 80; lat += 20) {
    const radius = GLOBE_RADIUS * Math.cos((lat * Math.PI) / 180);
    const height = GLOBE_RADIUS * Math.sin((lat * Math.PI) / 180);

    const points = [];
    for (let i = 0; i <= 100; i++) {
      const theta = (i / 100) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          radius * Math.cos(theta),
          height,
          radius * Math.sin(theta)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    earthGroup.add(line); // Add to earth group instead of scene
  }

  // Add longitude lines
  for (let lng = 0; lng < 360; lng += 20) {
    const points = [];
    for (let lat = -90; lat <= 90; lat += 5) {
      const phi = ((90 - lat) * Math.PI) / 180;
      const theta = (lng * Math.PI) / 180;

      points.push(
        new THREE.Vector3(
          GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta),
          GLOBE_RADIUS * Math.cos(phi),
          GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta)
        )
      );
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, material);
    earthGroup.add(line); // Add to earth group instead of scene
  }
  
  // Add NERV-style hexagon pattern overlay
  addNervHexPattern(earthGroup);
}

// Add NERV-style hexagon pattern overlay to the globe
function addNervHexPattern(earthGroup) {
  const hexMaterial = new THREE.LineBasicMaterial({
    color: 0xff3300, // Orange-red color similar to NERV warning indicators
    transparent: true,
    opacity: 0.15,
  });
  
  // Create a few strategic hexagons at key locations
  const hexLocations = [
    { lat: 35.6762, lng: 139.6503 }, // Tokyo
    { lat: 40.7128, lng: -74.0060 }, // New York
    { lat: 51.5074, lng: -0.1278 },  // London
    { lat: 21.4225, lng: 39.8262 },  // Mecca
    { lat: -33.8688, lng: 151.2093 } // Sydney
  ];
  
  hexLocations.forEach(loc => {
    // Convert lat/lng to 3D position
    const phi = ((90 - loc.lat) * Math.PI) / 180;
    const theta = (loc.lng * Math.PI) / 180;
    
    const x = -GLOBE_RADIUS * Math.sin(phi) * Math.cos(theta);
    const y = GLOBE_RADIUS * Math.cos(phi);
    const z = GLOBE_RADIUS * Math.sin(phi) * Math.sin(theta);
    
    // Create hexagon
    const hexPoints = [];
    const hexSize = 0.1;
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      hexPoints.push(new THREE.Vector3(
        hexSize * Math.cos(angle),
        hexSize * Math.sin(angle),
        0
      ));
    }
    
    const hexGeometry = new THREE.BufferGeometry().setFromPoints(hexPoints);
    const hexagon = new THREE.Line(hexGeometry, hexMaterial);
    
    // Position and orient the hexagon on the globe surface
    hexagon.position.set(x, y, z);
    hexagon.lookAt(0, 0, 0);
    hexagon.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 6); // Rotate to make flat edges horizontal
    
    // Add to group
    earthGroup.add(hexagon);
  });
}

// Create moon with wireframe material
function createMoon() {
  const geometry = new THREE.SphereGeometry(MOON_RADIUS, 16, 16);

  const moonTextureLoader = new THREE.TextureLoader();
  
  // Load moon textures with Evangelion-inspired color scheme
  const moonTexture = moonTextureLoader.load(
    "/static/textures/moon.jpg"
  );
  
  // Create outer wireframe
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ffff,
    wireframe: true,
    transparent: true,
    opacity: 0.7,
  });

  // Create solid core
  const coreMaterial = new THREE.MeshPhongMaterial({
    map: moonTexture,
    shininess: 5,
  });

  moon = new THREE.Group();

  const moonCore = new THREE.Mesh(geometry, coreMaterial);
  moon.add(moonCore);

  const moonWireframe = new THREE.Mesh(geometry, wireframeMaterial);
  moonWireframe.scale.multiplyScalar(1.1);
  moon.add(moonWireframe);

  // Position moon
  updateMoonPosition(0); // Initial position

  scene.add(moon);
}

// Create sun with glow effect
function createSun() {
  const geometry = new THREE.SphereGeometry(SUN_RADIUS, 32, 32);

  // Create material with emissive property to make it glow
  const material = new THREE.MeshPhongMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 1.2,  // Increased intensity
    transparent: true,
    opacity: 0.9,
  });

  // Create wireframe overlay
  const wireframeMaterial = new THREE.MeshBasicMaterial({
    color: 0xff4800,
    wireframe: true,
    transparent: true,
    opacity: 0.5,
  });

  sun = new THREE.Group();

  const sunCore = new THREE.Mesh(geometry, material);
  sun.add(sunCore);

  const sunWireframe = new THREE.Mesh(geometry, wireframeMaterial);
  sunWireframe.scale.multiplyScalar(1.1);
  sun.add(sunWireframe);

  // Position sun
  updateSunPosition(0); // Initial position

  scene.add(sun);
}

// Create a starfield background
function createStars() {
  const starsGeometry = new THREE.BufferGeometry();
  const starsMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.8,
  });

  const starsVertices = [];
  for (let i = 0; i < 1000; i++) {
    const x = (Math.random() - 0.5) * 100;
    const y = (Math.random() - 0.5) * 100;
    const z = (Math.random() - 0.5) * 100;
    starsVertices.push(x, y, z);
  }

  starsGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starsVertices, 3)
  );
  const stars = new THREE.Points(starsGeometry, starsMaterial);
  scene.add(stars);
}

// Update the moon's position based on current time
function updateMoonPosition(timeOffset = 0) {
  const now = new Date();

  // Use current date/time to determine moon position
  // This is a simplified calculation and not astronomically accurate
  const epochDate = new Date(2000, 0, 6, 18, 14, 0); // Known new moon
  const synodic = 29.530588853; // Synodic month in days
  const elapsed = (now - epochDate) / (1000 * 60 * 60 * 24); // Days since epoch
  const cyclePosition = (elapsed % synodic) / synodic; // Position in cycle (0 to 1)
  
  // Calculate angle for moon position
  const moonAngle = cyclePosition * Math.PI * 2;

  // Position moon in orbit
  moon.position.x = Math.sin(moonAngle) * MOON_DISTANCE;
  moon.position.y = Math.sin(moonAngle * 0.5) * MOON_DISTANCE * 0.3; // Slight tilt
  moon.position.z = Math.cos(moonAngle) * MOON_DISTANCE;

  // Rotate moon
  moon.rotation.y += 0.01;
}

// Update the sun's position based on current time
function updateSunPosition(timeOffset = 0) {
  const now = new Date();
  const hourOfDay = now.getHours() + now.getMinutes() / 60;

  // Calculate sun angle (day/night cycle)
  const sunAngle = (hourOfDay / 24) * Math.PI * 2;

  // Position sun
  sun.position.x = Math.sin(sunAngle) * SUN_DISTANCE;
  sun.position.y = Math.sin(sunAngle) * SUN_DISTANCE * 0.2; // Slight tilt for seasons
  sun.position.z = Math.cos(sunAngle) * SUN_DISTANCE;
}

// Animation loop for Three.js scene
function animate() {
  requestAnimationFrame(animate);

  // Get delta time for smooth animations
  const delta = clock ? clock.getDelta() : 0.016;
  const time = Date.now() * 0.001;

  // Rotate the entire earth group (globe + grid) slowly
  if (globe && globe.userData.group) {
    globe.userData.group.rotation.y += 0.001;
  }

  // Update celestial positions
  updateMoonPosition();
  updateSunPosition();
  
  // Update comets
  if (visualEffects && visualEffects.comets) {
    visualEffects.comets.forEach(comet => {
      // Update orbit position
      comet.orbit.angle += comet.orbit.speed * comet.orbit.direction;
      
      // Calculate position
      const x = Math.cos(comet.orbit.angle) * comet.orbit.radius;
      const z = Math.sin(comet.orbit.angle) * comet.orbit.radius;
      const y = Math.sin(comet.orbit.angle * 0.5) * comet.orbit.radius * Math.sin(comet.orbit.tilt);
      
      // Update position
      comet.mesh.position.set(x, y, z);
      
      // Make comet face along its orbit
      const tangent = new THREE.Vector3(
        -Math.sin(comet.orbit.angle) * comet.orbit.direction,
        Math.cos(comet.orbit.angle * 0.5) * 0.5 * Math.sin(comet.orbit.tilt) * comet.orbit.direction,
        Math.cos(comet.orbit.angle) * comet.orbit.direction
      );
      
      comet.mesh.lookAt(comet.mesh.position.clone().add(tangent));
    });
  }
  
  // Update shooting stars
  if (visualEffects && visualEffects.shootingStars) {
    for (let i = visualEffects.shootingStars.length - 1; i >= 0; i--) {
      const star = visualEffects.shootingStars[i];
      const elapsed = Date.now() - star.startTime;
      
      if (elapsed >= star.duration) {
        // Remove expired shooting star
        scene.remove(star.mesh);
        visualEffects.shootingStars.splice(i, 1);
      } else {
        // Fade out based on elapsed time
        const progress = elapsed / star.duration;
        star.mesh.material.opacity = 1 - progress;
      }
    }
  }

  // Handle cinematic camera mode
  if (cinematicMode && !orbitControls && !inCameraTransition) {
    const now = Date.now();
    // Change view every 25-35 seconds
    if (now - lastCinematicViewChange > getRandomViewDuration()) {
      console.log("Switching to next cinematic view");
      switchToNextCinematicView();
      lastCinematicViewChange = now;
    }
  }

  // Orbital camera mode
  if (orbitControls) {
    orbitAngle += 0.001;

    // Keep camera at a distance but circle around to see the moon
    const orbitDistance = 7;
    camera.position.x = Math.sin(orbitAngle) * orbitDistance;
    camera.position.z = Math.cos(orbitAngle) * orbitDistance;

    // Make camera look at globe center
    camera.lookAt(0, 0, 0);
  }

  // Render scene
  renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
  camera.aspect =
    document.getElementById("globe-canvas").clientWidth /
    document.getElementById("globe-canvas").clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(
    document.getElementById("globe-canvas").clientWidth,
    document.getElementById("globe-canvas").clientHeight
  );
}

// Position the globe to show a specific location
function positionGlobeToLocation(lat, lng) {
  // Temporarily disable orbit mode
  const wasOrbitEnabled = orbitControls;
  orbitControls = false;

  // Convert lat/lng to 3D position on globe
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;

  // Set the grid rotation to center the location, but keep the earth texture fixed
  // Animate rotation for smoother effect
  const currentRotation = globe.userData.gridGroup.rotation.y;
  const targetRotation = -theta;
  const rotationDuration = 1500;
  const rotationStartTime = Date.now();

  function updateRotation() {
    const elapsed = Date.now() - rotationStartTime;
    const progress = Math.min(elapsed / rotationDuration, 1);

    // Easing function
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    // Only rotate the grid group, not the entire earth group
    globe.userData.gridGroup.rotation.y =
      currentRotation + (targetRotation - currentRotation) * eased;

    if (progress < 1) {
      requestAnimationFrame(updateRotation);
    }
  }

  updateRotation();

  // Calculate target position for camera - move closer to see location better
  const zoomLevel = 3.8; // Closer than before (was 5)
  const target = new THREE.Vector3(
    -Math.sin(phi) * Math.cos(theta) * zoomLevel,
    Math.cos(phi) * zoomLevel,
    Math.sin(phi) * Math.sin(theta) * zoomLevel
  );

  // Animate camera position to target
  const currentPos = camera.position.clone();
  const duration = 2000; // milliseconds
  const startTime = Date.now();

  function updateCamera() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : -1 + (4 - 2 * progress) * progress;

    camera.position.x = currentPos.x + (target.x - currentPos.x) * eased;
    camera.position.y = currentPos.y + (target.y - currentPos.y) * eased;
    camera.position.z = currentPos.z + (target.z - currentPos.z) * eased;

    camera.lookAt(0, 0, 0);

    if (progress < 1) {
      requestAnimationFrame(updateCamera);
    } else {
      // After the camera is positioned, create or update the location marker
      // Wait a bit to make sure the grid has finished rotating
      setTimeout(() => {
        createLocationMarker(lat, lng);
      }, 500);
      
      // Hold on location for a moment to clearly see it
      setTimeout(() => {
        // Zoom out a bit for better perspective
        const zoomOutDuration = 1500;
        const zoomOutStart = Date.now();
        const zoomOutTarget = new THREE.Vector3(
          target.x * 1.5,
          target.y * 1.5,
          target.z * 1.5
        );

        function zoomOut() {
          const elapsed = Date.now() - zoomOutStart;
          const progress = Math.min(elapsed / zoomOutDuration, 1);

          // Simple linear interpolation for zoom out
          camera.position.x =
            target.x + (zoomOutTarget.x - target.x) * progress;
          camera.position.y =
            target.y + (zoomOutTarget.y - target.y) * progress;
          camera.position.z =
            target.z + (zoomOutTarget.z - target.z) * progress;

          camera.lookAt(0, 0, 0);

          if (progress < 1) {
            requestAnimationFrame(zoomOut);
          } else {
            // When animation completes, re-enable orbit mode if it was enabled before
            setTimeout(() => {
              if (wasOrbitEnabled) {
                toggleOrbitMode(true);
                addTerminalLine("RESUMING ORBITAL VIEW MODE", "info");
              }
            }, 1000); // Wait 1 second before enabling orbit mode
          }
        }

        zoomOut();
      }, 2000); // Hold on location for 2 seconds
    }
  }

  updateCamera();
}

// Fetch prayer times using the Aladhan API
function getPrayerTimes(lat, lng) {
  const today = new Date();
  const date = `${today.getDate()}-${
    today.getMonth() + 1
  }-${today.getFullYear()}`;

  addTerminalLine("FETCHING PRAYER TIME DATA...");

  // Show loading state for prayer times
  const prayerTimes = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
  prayerTimes.forEach((prayer) => {
    document.getElementById(`time-${prayer}`).textContent = "LOADING...";
    document.getElementById(`time-${prayer}`).classList.add("loading");
  });

  // Also show loading state for sunrise and sunset
  document.getElementById("time-sunrise").textContent = "LOADING...";
  document.getElementById("time-sunrise").classList.add("loading");
  document.getElementById("time-sunset").textContent = "LOADING...";
  document.getElementById("time-sunset").classList.add("loading");

  fetch(
    `https://api.aladhan.com/v1/timings/${date}?latitude=${lat}&longitude=${lng}&method=2`
  )
    .then((response) => response.json())
    .then((data) => {
      // Remove loading classes
      prayerTimes.forEach((prayer) => {
        document.getElementById(`time-${prayer}`).classList.remove("loading");
      });
      document.getElementById("time-sunrise").classList.remove("loading");
      document.getElementById("time-sunset").classList.remove("loading");

      if (data.code === 200 && data.data && data.data.timings) {
        const timings = data.data.timings;

        document.getElementById("time-fajr").textContent = timings.Fajr;
        document.getElementById("time-dhuhr").textContent = timings.Dhuhr;
        document.getElementById("time-asr").textContent = timings.Asr;
        document.getElementById("time-maghrib").textContent = timings.Maghrib;
        document.getElementById("time-isha").textContent = timings.Isha;

        // Set sunrise and sunset times
        document.getElementById("time-sunrise").textContent = timings.Sunrise;
        document.getElementById("time-sunset").textContent = timings.Sunset;

        // Store Maghrib time (iftar time)
        maghribTime = timings.Maghrib;

        // Store Sunset time (should be same as Maghrib in most calculation methods)
        sunsetTime = timings.Sunset;
        sunriseTime = timings.Sunrise;

        // Check if we need to play the song soon
        checkIftarTime();

        addTerminalLine("PRAYER TIME DATA SYNCHRONIZED", "success");
      } else {
        prayerTimes.forEach((prayer) => {
          document.getElementById(`time-${prayer}`).textContent = "ERROR";
        });
        document.getElementById("time-sunrise").textContent = "ERROR";
        document.getElementById("time-sunset").textContent = "ERROR";
        addTerminalLine("ERROR FETCHING PRAYER TIMES", "error");
      }
    })
    .catch((error) => {
      // Remove loading classes
      prayerTimes.forEach((prayer) => {
        document.getElementById(`time-${prayer}`).classList.remove("loading");
        document.getElementById(`time-${prayer}`).textContent = "ERROR";
      });
      document.getElementById("time-sunrise").classList.remove("loading");
      document.getElementById("time-sunset").classList.remove("loading");
      document.getElementById("time-sunrise").textContent = "ERROR";
      document.getElementById("time-sunset").textContent = "ERROR";

      addTerminalLine(`ERROR FETCHING PRAYER TIMES: ${error.message}`, "error");
    });
}

// Get Hijri (Islamic) date
function getIslamicDate() {
  const today = new Date();
  const date = `${today.getDate()}-${
    today.getMonth() + 1
  }-${today.getFullYear()}`;

  addTerminalLine("FETCHING HIJRI DATE...");

  // Show loading state
  document.getElementById("hijri-date").textContent = "LOADING...";
  document.getElementById("ramadan-day").textContent = "LOADING...";
  document.getElementById("hijri-date").classList.add("loading");
  document.getElementById("ramadan-day").classList.add("loading");

  fetch(`https://api.aladhan.com/v1/gToH/${date}`)
    .then((response) => response.json())
    .then((data) => {
      // Remove loading classes
      document.getElementById("hijri-date").classList.remove("loading");
      document.getElementById("ramadan-day").classList.remove("loading");

      if (data.code === 200 && data.data) {
        const hijri = data.data.hijri;

        document.getElementById(
          "hijri-date"
        ).textContent = `${hijri.day}/${hijri.month.number}/${hijri.year}`;

        // Check if it's Ramadan
        if (hijri.month.number === 9) {
          document.getElementById("ramadan-day").textContent = hijri.day;
          addTerminalLine(`RAMADAN DAY ${hijri.day} CONFIRMED`, "success");
        } else {
          document.getElementById("ramadan-day").textContent = "N/A";
          addTerminalLine("OUTSIDE RAMADAN MONTH", "info");
        }

        addTerminalLine(
          `HIJRI DATE: ${hijri.day} ${hijri.month.en} ${hijri.year}`,
          "success"
        );
      } else {
        document.getElementById("hijri-date").textContent = "ERROR";
        document.getElementById("ramadan-day").textContent = "ERROR";
        addTerminalLine("ERROR FETCHING HIJRI DATE", "error");
      }
    })
    .catch((error) => {
      document.getElementById("hijri-date").classList.remove("loading");
      document.getElementById("ramadan-day").classList.remove("loading");

      document.getElementById("hijri-date").textContent = "ERROR";
      document.getElementById("ramadan-day").textContent = "ERROR";
      addTerminalLine(`ERROR FETCHING HIJRI DATE: ${error.message}`, "error");
    });
}

// Get Shamsi (Persian/Solar Hijri) date
function getShamsiDate() {
  addTerminalLine("CALCULATING SHAMSI DATE...");

  // Show loading state
  document.getElementById("shamsi-date").textContent = "LOADING...";
  document.getElementById("shamsi-month").textContent = "LOADING...";
  document.getElementById("shamsi-season").textContent = "LOADING...";
  document.getElementById("shamsi-date").classList.add("loading");
  document.getElementById("shamsi-month").classList.add("loading");
  document.getElementById("shamsi-season").classList.add("loading");

  try {
    const today = new Date();

    // Persian calendar months
    const persianMonths = [
      "Farvardin",
      "Ordibehesht",
      "Khordad",
      "Tir",
      "Mordad",
      "Shahrivar",
      "Mehr",
      "Aban",
      "Azar",
      "Dey",
      "Bahman",
      "Esfand",
    ];

    // Seasons in Persian calendar
    const persianSeasons = {
      Farvardin: "Spring",
      Ordibehesht: "Spring",
      Khordad: "Spring",
      Tir: "Summer",
      Mordad: "Summer",
      Shahrivar: "Summer",
      Mehr: "Autumn",
      Aban: "Autumn",
      Azar: "Autumn",
      Dey: "Winter",
      Bahman: "Winter",
      Esfand: "Winter",
    };

    // Function to update UI with the Shamsi date
    function updateShamsiUI(year, month, day) {
      document.getElementById(
        "shamsi-date"
      ).textContent = `${day}/${month}/${year}`;
      document.getElementById("shamsi-month").textContent =
        persianMonths[month - 1];
      document.getElementById("shamsi-season").textContent =
        persianSeasons[persianMonths[month - 1]];

      // Remove loading classes
      document.getElementById("shamsi-date").classList.remove("loading");
      document.getElementById("shamsi-month").classList.remove("loading");
      document.getElementById("shamsi-season").classList.remove("loading");

      addTerminalLine(
        `SHAMSI DATE: ${day} ${persianMonths[month - 1]} ${year}`,
        "success"
      );
    }

    // Try to get Persian date from API first
    fetch("https://api.keybit.ir/time/")
      .then((response) => response.json())
      .then((data) => {
        if (data && data.date && data.date.shamsi && data.date.shamsi.numeric) {
          // Parse the date parts from API
          const dateString = data.date.shamsi.numeric.split("/");
          const year = parseInt(dateString[0]);
          const month = parseInt(dateString[1]);
          const day = parseInt(dateString[2]);

          updateShamsiUI(year, month, day);
          addTerminalLine("SHAMSI DATE RETRIEVED FROM API", "success");
        } else {
          throw new Error("API data format invalid");
        }
      })
      .catch((error) => {
        console.log("Using local algorithm as API fallback:", error);

        // Accurate Gregorian to Persian date conversion algorithm as fallback
        function gregorianToJalali(gy, gm, gd) {
          const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
          let jy, jm, jd, gy2, days;

          gy2 = gm > 2 ? gy + 1 : gy;
          days =
            355666 +
            365 * gy +
            Math.floor((gy2 + 3) / 4) -
            Math.floor((gy2 + 99) / 100) +
            Math.floor((gy2 + 399) / 400) +
            gd +
            g_d_m[gm - 1];
          jy = -1595 + 33 * Math.floor(days / 12053);
          days %= 12053;
          jy += 4 * Math.floor(days / 1461);
          days %= 1461;

          if (days > 365) {
            jy += Math.floor((days - 1) / 365);
            days = (days - 1) % 365;
          }

          if (days < 186) {
            jm = 1 + Math.floor(days / 31);
            jd = 1 + (days % 31);
          } else {
            jm = 7 + Math.floor((days - 186) / 30);
            jd = 1 + ((days - 186) % 30);
          }

          return [jy, jm, jd];
        }

        const gregorianYear = today.getFullYear();
        const gregorianMonth = today.getMonth() + 1;
        const gregorianDay = today.getDate();

        // Convert to Persian (Jalali) calendar
        const [persianYear, persianMonth, persianDay] = gregorianToJalali(
          gregorianYear,
          gregorianMonth,
          gregorianDay
        );

        updateShamsiUI(persianYear, persianMonth, persianDay);
        addTerminalLine("SHAMSI DATE CALCULATED LOCALLY", "warning");
      });
  } catch (error) {
    // Remove loading classes
    document.getElementById("shamsi-date").classList.remove("loading");
    document.getElementById("shamsi-month").classList.remove("loading");
    document.getElementById("shamsi-season").classList.remove("loading");

    document.getElementById("shamsi-date").textContent = "ERROR";
    document.getElementById("shamsi-month").textContent = "ERROR";
    document.getElementById("shamsi-season").textContent = "ERROR";

    addTerminalLine(`ERROR CALCULATING SHAMSI DATE: ${error.message}`, "error");
    console.error("Error calculating Shamsi date:", error);
  }
}

// Get Gregorian calendar data
function getGregorianDate() {
  addTerminalLine("CALCULATING GREGORIAN DATE...");

  // Show loading state
  document.getElementById("gregorian-date").textContent = "LOADING...";
  document.getElementById("day-of-year").textContent = "LOADING...";
  document.getElementById("week-number").textContent = "LOADING...";
  document.getElementById("gregorian-date").classList.add("loading");
  document.getElementById("day-of-year").classList.add("loading");
  document.getElementById("week-number").classList.add("loading");

  try {
    const today = new Date();
    const day = today.getDate();
    const month = today.getMonth() + 1;
    const year = today.getFullYear();

    // Calculate day of year
    const dayOfYear = getDayOfYear(today);

    // Calculate week number (ISO week number)
    const getISOWeek = (date) => {
      const d = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
      );
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    };

    const weekNumber = getISOWeek(today);

    // Update UI
    document.getElementById(
      "gregorian-date"
    ).textContent = `${day}/${month}/${year}`;
    document.getElementById("day-of-year").textContent = dayOfYear;
    document.getElementById("week-number").textContent = weekNumber;

    // Remove loading classes
    document.getElementById("gregorian-date").classList.remove("loading");
    document.getElementById("day-of-year").classList.remove("loading");
    document.getElementById("week-number").classList.remove("loading");

    addTerminalLine(`GREGORIAN DATE: ${day}/${month}/${year}`, "success");
  } catch (error) {
    // Remove loading classes
    document.getElementById("gregorian-date").classList.remove("loading");
    document.getElementById("day-of-year").classList.remove("loading");
    document.getElementById("week-number").classList.remove("loading");

    document.getElementById("gregorian-date").textContent = "ERROR";
    document.getElementById("day-of-year").textContent = "ERROR";
    document.getElementById("week-number").textContent = "ERROR";

    addTerminalLine(
      `ERROR CALCULATING GREGORIAN DATE: ${error.message}`,
      "error"
    );
  }
}

// Fetch celestial data (moon phase, positions, etc.)
function getCelestialData(lat, lng) {
  addTerminalLine("QUERYING CELESTIAL DATABASE...");

  // This is a placeholder. In reality, you'd want to use a proper astronomy API
  // For now, we'll simulate the data
  simulateCelestialData();
}

// Simulate celestial data (for demonstration purposes)
function simulateCelestialData() {
  const now = new Date();

  // Show loading states
  document.getElementById("sun-distance").textContent = "LOADING...";
  document.getElementById("sun-azimuth").textContent = "LOADING...";
  document.getElementById("sun-altitude").textContent = "LOADING...";
  document.getElementById("moon-distance").textContent = "LOADING...";
  document.getElementById("moon-azimuth").textContent = "LOADING...";
  document.getElementById("moon-altitude").textContent = "LOADING...";
  document.getElementById("moon-illumination").textContent = "LOADING...";
  document.getElementById("moon-phase").textContent = "CALCULATING...";

  // Add loading classes
  const celestialElements = [
    "sun-distance",
    "sun-azimuth",
    "sun-altitude",
    "moon-distance",
    "moon-azimuth",
    "moon-altitude",
    "moon-illumination",
    "moon-phase",
  ];

  celestialElements.forEach((id) => {
    document.getElementById(id).classList.add("loading");
  });

  // Use more accurate moon phase calculation
  // This is a simplified algorithm for moon phase calculation
  // Based on the synodic month (29.53 days)
  const epochDate = new Date(2000, 0, 6, 18, 14, 0); // Known new moon
  const synodic = 29.530588853; // Synodic month in days
  const elapsed = (now - epochDate) / (1000 * 60 * 60 * 24); // Days since epoch
  const cyclePosition = (elapsed % synodic) / synodic; // Position in cycle (0 to 1)
  moonPhase = cyclePosition * Math.PI * 2; // Fractional part represents phase as radians

  // Remove loading classes after a short delay (simulating API call)
  setTimeout(() => {
    celestialElements.forEach((id) => {
      document.getElementById(id).classList.remove("loading");
    });

    // Display moon phase
    let phaseText = "";
    let phaseEmoji = "";
    if (moonPhase < 0.025 || moonPhase > 0.975) {
      phaseText = "NEW MOON";
      phaseEmoji = "🌑";
      isNewMoonApproaching = true;
    } else if (moonPhase < 0.25) {
      phaseText = "WAXING CRESCENT";
      phaseEmoji = "🌒";
      isNewMoonApproaching = false;
    } else if (moonPhase < 0.3) {
      phaseText = "FIRST QUARTER";
      phaseEmoji = "🌓";
      isNewMoonApproaching = false;
    } else if (moonPhase < 0.475) {
      phaseText = "WAXING GIBBOUS";
      phaseEmoji = "🌔";
      isNewMoonApproaching = false;
    } else if (moonPhase < 0.525) {
      phaseText = "FULL MOON";
      phaseEmoji = "🌕";
      isNewMoonApproaching = false;
    } else if (moonPhase < 0.7) {
      phaseText = "WANING GIBBOUS";
      phaseEmoji = "🌖";
      isNewMoonApproaching = false;
    } else if (moonPhase < 0.8) {
      phaseText = "LAST QUARTER";
      phaseEmoji = "🌗";
      isNewMoonApproaching = false;
    } else {
      phaseText = "WANING CRESCENT";
      phaseEmoji = "🌘";
      isNewMoonApproaching = true;
    }

    document.getElementById(
      "moon-phase"
    ).textContent = `${phaseText} ${phaseEmoji}`;

    // Show warning if new moon is approaching
    const newMoonWarning = document.getElementById("new-moon-warning");
    if (isNewMoonApproaching) {
      newMoonWarning.classList.add("active");
    } else {
      newMoonWarning.classList.remove("active");
    }

    // Simulate celestial distances and positions with more accurate calculations
    // These are still approximations, but better than completely random values
    const astronomicalUnit = 149597870.7; // AU in km
    const sunDistance = astronomicalUnit; // Average Earth-Sun distance (1 AU)

    // Earth-moon distance varies between 356,500 km and 406,700 km
    const moonDistanceMin = 356500;
    const moonDistanceMax = 406700;
    const moonDistanceVariation = moonDistanceMax - moonDistanceMin;

    // Calculate moon distance - varies based on phase
    // Closest at new moon and full moon, furthest at quarters
    const moonDistanceFactor = Math.abs(Math.sin(moonPhase * Math.PI * 2));
    const moonDistance =
      moonDistanceMin + moonDistanceVariation * moonDistanceFactor;

    // Calculate and display celestial data
    document.getElementById(
      "sun-distance"
    ).textContent = `${sunDistance.toLocaleString()} KM`;
    document.getElementById("moon-distance").textContent = `${Math.round(
      moonDistance
    ).toLocaleString()} KM`;

    // Simulate azimuth and altitude based on time of day and location
    const hour = now.getHours() + now.getMinutes() / 60;

    // Sun calculations - simple approximation
    const sunAltitude = Math.sin((hour / 24) * 2 * Math.PI - Math.PI / 2) * 90;
    const sunAzimuth = (hour / 24) * 360;

    // Moon calculations - offset from sun by moonPhase * 360 degrees
    const moonAzimuth = (sunAzimuth + moonPhase * 360) % 360;
    // Moon altitude is shifted from sun by phase
    const moonAltitudeShift = moonPhase * 12; // Hours shift
    const moonDayProgress = (hour + moonAltitudeShift / 24) % 1;
    const moonAltitude = Math.sin((moonDayProgress * 2 - 1) * Math.PI) * 80;

    document.getElementById("sun-azimuth").textContent = `${sunAzimuth.toFixed(
      1
    )}°`;
    document.getElementById(
      "sun-altitude"
    ).textContent = `${sunAltitude.toFixed(1)}°`;
    document.getElementById(
      "moon-azimuth"
    ).textContent = `${moonAzimuth.toFixed(1)}°`;
    document.getElementById(
      "moon-altitude"
    ).textContent = `${moonAltitude.toFixed(1)}°`;

    // Moon illumination depends on phase (0 at new, 100% at full)
    const illumination = Math.sin(moonPhase * Math.PI) * 100;
    document.getElementById("moon-illumination").textContent = `${Math.abs(
      illumination
    ).toFixed(1)}%`;

    // Update moon appearance in the 3D scene
    if (moon) {
      updateMoonAppearance(moonPhase);
    }

    addTerminalLine("CELESTIAL DATA ACQUISITION COMPLETE", "success");
  }, 1500);
}

// Update the moon's appearance based on phase
function updateMoonAppearance(phase) {
  // The moon's light part should always face the sun
  // At new moon (phase 0), the dark side faces us
  // At full moon (phase 0.5), the light side faces us

  // Calculate rotation of the moon to show proper phase
  const phaseAngle = phase * Math.PI * 2;

  // In a real celestial mechanics simulation, this would be more complex
  // For now, simply rotate the moon to simulate phases
  moon.rotation.y = phaseAngle;

  // Adjust moon material to show dark/light sides
  // Get the materials
  const moonCore = moon.children[0];

  // We would ideally adjust the moon texture mapping here to
  // accurately show the proper phase from Earth's perspective
  // This is a simplified version
}

// Update the clock display
function updateClock() {
  const now = new Date();
  const timeString = now.toTimeString().slice(0, 8);
  document.getElementById("local-time").textContent = `TIME: ${timeString}`;
}

// Utility function to get day of year
function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

// Create a location marker at the specified lat/lng on the globe
function createLocationMarker(lat, lng) {
  // Create marker group if it doesn't exist
  if (!globe.userData) {
    globe.userData = {};
  }
  
  if (!globe.userData.markerGroup) {
    globe.userData.markerGroup = new THREE.Group();
    globe.add(globe.userData.markerGroup);
  }

  // If a marker already exists, remove it
  if (locationMarker) {
    globe.userData.markerGroup.remove(locationMarker);
  }

  // Convert lat/lng to 3D position
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;

  const x = -(GLOBE_RADIUS + 0.01) * Math.sin(phi) * Math.cos(theta);
  const y = (GLOBE_RADIUS + 0.01) * Math.cos(phi);
  const z = (GLOBE_RADIUS + 0.01) * Math.sin(phi) * Math.sin(theta);

  // Create a more prominent marker
  const markerGeometry = new THREE.SphereGeometry(0.025, 16, 16);
  const markerMaterial = new THREE.MeshBasicMaterial({
    color: 0xff3333,
    transparent: true,
    opacity: 0.8
  });
  locationMarker = new THREE.Mesh(markerGeometry, markerMaterial);
  locationMarker.position.set(x, y, z);
  globe.userData.markerGroup.add(locationMarker);
  
  // Create AT Field effect
  createATFieldEffect(x, y, z);
  
  // Add a pulsing animation to the marker
  let scale = 1.0;
  let growing = false;
  
  function animateMarker() {
    if (!locationMarker) return;
    
    if (growing) {
      scale += 0.01;
      if (scale >= 1.3) growing = false;
    } else {
      scale -= 0.01;
      if (scale <= 1.0) growing = true;
    }
    
    locationMarker.scale.set(scale, scale, scale);
    requestAnimationFrame(animateMarker);
  }
  
  animateMarker();
}

// Create AT Field hexagonal pattern effect for selected locations
function createATFieldEffect(x, y, z) {
  // Remove existing AT Field if present
  if (visualEffects.atField) {
    scene.remove(visualEffects.atField);
    visualEffects.atField = null;
  }
  
  // Create AT Field group
  const atFieldGroup = new THREE.Group();
  
  // Create a hexagonal pattern of translucent orange planes
  const numHexagons = 12;
  const baseSize = 0.3;
  const hexColor = 0xff7700;
  
  for (let i = 0; i < numHexagons; i++) {
    // Create hexagon geometry
    const hexGeometry = new THREE.CircleGeometry(baseSize * (1 - i * 0.06), 6);
    const hexMaterial = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: 0.5 - i * 0.03,
      side: THREE.DoubleSide
    });
    
    const hexagon = new THREE.Mesh(hexGeometry, hexMaterial);
    
    // Position hexagon in front of selected location
    const normalVector = new THREE.Vector3(x, y, z).normalize();
    hexagon.position.copy(normalVector.multiplyScalar(GLOBE_RADIUS + 0.02 + i * 0.02));
    
    // Orient hexagon to face outward from globe
    hexagon.lookAt(0, 0, 0);
    hexagon.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI / 6); // Rotate to make flat edges horizontal
    
    // Add to group
    atFieldGroup.add(hexagon);
  }
  
  // Store the AT Field effect
  visualEffects.atField = atFieldGroup;
  
  // Add to scene
  scene.add(atFieldGroup);
  
  // Animate the AT Field for 2 seconds then fade out
  let opacity = 1.0;
  let expanding = true;
  
  function animateATField() {
    if (!visualEffects.atField) return;
    
    // Handle expansion for 1 second
    if (expanding) {
      atFieldGroup.scale.multiplyScalar(1.03);
      
      if (atFieldGroup.scale.x > 2.0) {
        expanding = false;
      }
    } else {
      // Then handle fade out
      opacity -= 0.02;
      
      if (opacity <= 0) {
        scene.remove(atFieldGroup);
        visualEffects.atField = null;
        return;
      }
      
      // Update all hexagon opacities
      atFieldGroup.children.forEach((hexagon, i) => {
        hexagon.material.opacity = Math.max(0, (0.5 - i * 0.03) * opacity);
      });
    }
    
    requestAnimationFrame(animateATField);
  }
  
  animateATField();
}

// Function to set location by coordinates and update UI/globe
function setLocationByCoordinates(lat, lng, displayName) {
  userLocation.lat = lat;
  userLocation.lng = lng;
  locationName = displayName;

  // Update the UI
  document.getElementById("latitude").textContent = formatCoordinate(
    userLocation.lat,
    true
  );
  document.getElementById("longitude").textContent = formatCoordinate(
    userLocation.lng,
    false
  );
  document.getElementById("location-name").textContent = locationName;

  // Update the globe position
  positionGlobeToLocation(userLocation.lat, userLocation.lng);

  // Create and add a marker at the location
  createLocationMarker(userLocation.lat, userLocation.lng);

  // Get new prayer times
  getPrayerTimes(userLocation.lat, userLocation.lng);

  // Get new celestial data
  getCelestialData(userLocation.lat, userLocation.lng);

  // Force an immediate check for iftar time with the new location
  setTimeout(checkIftarTime, 1000);

  addTerminalLine(`LOCATION SET TO: ${locationName}`, "success");
}

// Get user location using IP address
function getIPBasedLocation() {
  addTerminalLine("ATTEMPTING IP-BASED GEOLOCATION...");

  // Use ipapi.co for IP-based geolocation
  fetch("https://ipapi.co/json/")
    .then((response) => response.json())
    .then((data) => {
      if (data && data.latitude && data.longitude) {
        // Set user location
        userLocation.lat = data.latitude;
        userLocation.lng = data.longitude;

        // Update UI
        document.getElementById("latitude").textContent = formatCoordinate(
          userLocation.lat,
          true
        );
        document.getElementById("longitude").textContent = formatCoordinate(
          userLocation.lng,
          false
        );

        // Set location name
        const locationDisplay = data.city
          ? `${data.city}, ${data.country_name}`
          : data.country_name;
        document.getElementById("location-name").textContent = locationDisplay;
        locationName = locationDisplay;

        addTerminalLine(
          `LOCATION IDENTIFIED: ${locationDisplay}`,
          "success"
        );

        // Update prayer times and other data
        getPrayerTimes(userLocation.lat, userLocation.lng);
        getCelestialData(userLocation.lat, userLocation.lng);
        getIslamicDate();
        getShamsiDate();
        getGregorianDate();

        // Force an immediate check for iftar time with the new location
        setTimeout(checkIftarTime, 1000);

        // Update the globe view to center on user's location
        if (globe) {
          positionGlobeToLocation(userLocation.lat, userLocation.lng);
          createLocationMarker(userLocation.lat, userLocation.lng);
        }
      } else {
        addTerminalLine("IP GEOLOCATION FAILED", "error");
        addTerminalLine(
          "USING DEFAULT LOCATION (MECCA, SAUDI ARABIA)",
          "warning"
        );
        useDefaultLocation();
      }
    })
    .catch((error) => {
      addTerminalLine(`GEOLOCATION ERROR: ${error.message}`, "error");
      addTerminalLine(
        "USING DEFAULT LOCATION (MECCA, SAUDI ARABIA)",
        "warning"
      );
      useDefaultLocation();
    });
}

// Set up the Web Audio API context
function setupAudioContext() {
  // Create audio context only on user interaction to comply with autoplay policies
  document.addEventListener("click", initAudioContext, { once: true });
}

function initAudioContext() {
  try {
    // Create audio context
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    addTerminalLine("AUDIO SYNCHRONIZATION COMPLETE", "success");

    // Set audio source
    const audioElement = document.getElementById("iftar-audio");
    audioElement.src = IFTAR_SONG_URL;
    audioElement.load();

    // Preload the audio
    audioElement.addEventListener("canplaythrough", () => {
      addTerminalLine("AUDIO ASSET LOADED", "success");
    });
  } catch (error) {
    addTerminalLine(`AUDIO INITIALIZATION ERROR: ${error.message}`, "error");
  }
}

// Play the Iftar song with Evangelion-style effects
function playIftarSong() {
  if (songPlaying || !audioContext) return;

  addTerminalLine("IFTAR APPROACHING - INITIATING AUDIO SEQUENCE", "warning");

  const audioElement = document.getElementById("iftar-audio");

  // Make sure the audio source is set
  if (!audioElement.src || audioElement.src === "") {
    audioElement.src = IFTAR_SONG_URL;
    audioElement.load();
  }

  // Connect the audio element to the audio context
  audioSource = audioContext.createMediaElementSource(audioElement);

  // Create Evangelion-style audio effects

  // 1. Distortion for the "radio" effect
  const distortion = audioContext.createWaveShaper();
  function makeDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; ++i) {
      const x = (i / n_samples) * 2 - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
  distortion.curve = makeDistortionCurve(20);
  distortion.oversample = "4x";

  // 2. Filter for frequency characteristics
  const filter = audioContext.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 1800;
  filter.Q.value = 0.7;

  // Add a second filter for more complex sound shaping
  const highpassFilter = audioContext.createBiquadFilter();
  highpassFilter.type = "highpass";
  highpassFilter.frequency.value = 700;
  highpassFilter.Q.value = 0.5;

  // 3. Reverb for space effect
  const convolver = audioContext.createConvolver();

  // Create impulse response for the convolver (simulated room)
  const impulseLength = audioContext.sampleRate * 1.5; // Shorter for tighter effect
  const impulse = audioContext.createBuffer(
    2,
    impulseLength,
    audioContext.sampleRate
  );

  // Fill the buffer with white noise that decays exponentially
  for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
    const impulseData = impulse.getChannelData(channel);
    for (let i = 0; i < impulseLength; i++) {
      // Add slight metallic resonances for that Eva mecha sound
      const resonance = Math.sin(i * 0.01) * 0.05;
      // Add unique decay pattern to each channel for stereo width
      const decay = Math.pow(1 - i / impulseLength, 1.8 + channel * 0.4);
      impulseData[i] = (Math.random() * 2 - 1) * decay + resonance * decay;
    }
  }

  convolver.buffer = impulse;

  // 4. Create periodic static/noise
  const staticGain = audioContext.createGain();
  staticGain.gain.value = 0.015; // Reduced from 0.03 to be less intrusive

  const staticOsc = audioContext.createOscillator();
  staticOsc.type = "sawtooth";
  staticOsc.frequency.value = 0.2; // Very slow oscillation

  const staticNode = audioContext.createScriptProcessor(4096, 1, 1);
  staticNode.onaudioprocess = function (e) {
    const output = e.outputBuffer.getChannelData(0);
    let prevSample = 0;
    for (let i = 0; i < output.length; i++) {
      // Create colored noise instead of white noise for a more nuanced effect
      // This adds temporal coherence to the noise, making it less harsh
      const noise = prevSample * 0.7 + (Math.random() * 0.3 - 0.15);
      // Add occasional glitches for Evangelion feel
      const glitchFactor = Math.random() > 0.995 ? 0.4 : 0;
      output[i] = noise + glitchFactor;
      prevSample = noise;
    }
  };

  // 5. Create a gain node to control the overall volume
  const gainNode = audioContext.createGain();

  // Start with zero gain and fade in for smooth entry
  const now = audioContext.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.8, now + 1.5);

  // Connect nodes: audioSource -> distortion -> filter -> highpassFilter -> convolver -> gain -> destination
  audioSource.connect(distortion);
  distortion.connect(filter);
  filter.connect(highpassFilter);
  highpassFilter.connect(convolver);

  // Create stereo panner for more immersive effect
  const stereoPanner = audioContext.createStereoPanner();
  convolver.connect(stereoPanner);
  stereoPanner.connect(gainNode);

  // Create LFO for subtle panning movement
  const panningLFO = audioContext.createOscillator();
  panningLFO.frequency.value = 0.1; // Very slow panning
  const panningGain = audioContext.createGain();
  panningGain.gain.value = 0.3; // Limit panning amount

  panningLFO.connect(panningGain);
  panningGain.connect(stereoPanner.pan);

  // Occasional "communication glitch" effect
  const glitchInterval = setInterval(() => {
    // Only apply glitch effects sometimes
    if (Math.random() > 0.7 && songPlaying) {
      // Quick filter frequency modulation for "transmission glitch" effect
      const now = audioContext.currentTime;
      filter.frequency.setValueAtTime(filter.frequency.value, now);
      filter.frequency.linearRampToValueAtTime(
        filter.frequency.value * 1.5,
        now + 0.1
      );
      filter.frequency.linearRampToValueAtTime(1800, now + 0.3);

      // Brief gain reduction
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.05);
      gainNode.gain.linearRampToValueAtTime(0.8, now + 0.2);
    }
  }, 3000);

  // Connect static/noise generator
  staticOsc.connect(staticGain);
  staticNode.connect(staticGain);
  staticGain.connect(gainNode);

  // Connect the final output
  gainNode.connect(audioContext.destination);

  // Start oscillators
  staticOsc.start();
  panningLFO.start();

  // Begin playback
  audioElement
    .play()
    .then(() => {
      songPlaying = true;

      // Show the iftar notification
      const iftarNotification = document.getElementById("iftar-notification");
      iftarNotification.classList.add("active");

      // Start the iftar countdown
      startIftarCountdown(IFTAR_SONG_DURATION);

      // Add terminal message
      addTerminalLine(
        "AUDIO PLAYBACK INITIATED - IFTAR APPROACHING",
        "success"
      );

      // When the song ends
      audioElement.onended = function () {
        songPlaying = false;

        // Fade out
        const fadeOutTime = audioContext.currentTime;
        gainNode.gain.setValueAtTime(gainNode.gain.value, fadeOutTime);
        gainNode.gain.linearRampToValueAtTime(0, fadeOutTime + 0.5);

        // Schedule cleanup after fade out
        setTimeout(() => {
          // Clean up audio nodes
          staticOsc.stop();
          panningLFO.stop();
          staticNode.disconnect();
          audioSource.disconnect();
          gainNode.disconnect();
          distortion.disconnect();
          filter.disconnect();
          highpassFilter.disconnect();
          convolver.disconnect();
          staticGain.disconnect();
          stereoPanner.disconnect();
          panningLFO.disconnect();
          panningGain.disconnect();
          clearInterval(glitchInterval);

          // Hide notification when song ends
          iftarNotification.classList.remove("active");
          clearInterval(iftarCountdownInterval);
          document.getElementById("iftar-countdown").textContent =
            "IFTAR TIME!";
          addTerminalLine("IFTAR TIME REACHED", "success");

          // Show iftar notification for 10 more seconds then hide
          setTimeout(() => {
            iftarNotification.classList.remove("active");
          }, 10000);
        }, 500); // Wait for the fade-out to complete
      };
    })
    .catch((error) => {
      addTerminalLine(`AUDIO PLAYBACK ERROR: ${error.message}`, "error");
    });
}

// Start the countdown timer for iftar
function startIftarCountdown(durationSeconds) {
  let timeLeft = durationSeconds;
  const countdownElement = document.getElementById("iftar-countdown");

  // Clear any existing interval
  if (iftarCountdownInterval) {
    clearInterval(iftarCountdownInterval);
  }

  // Update countdown immediately
  updateCountdown();

  // Then update every second
  iftarCountdownInterval = setInterval(updateCountdown, 1000);

  function updateCountdown() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    countdownElement.textContent = `${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

    if (timeLeft <= 0) {
      clearInterval(iftarCountdownInterval);
      return;
    }

    timeLeft--;
  }
}

// Check if it's almost iftar time to play the song
function checkIftarTime() {
  if (!maghribTime || songPlaying) return;

  const now = new Date();
  const iftarParts = maghribTime.split(":");

  if (iftarParts.length !== 2) return;

  const iftarHour = parseInt(iftarParts[0], 10);
  const iftarMinute = parseInt(iftarParts[1], 10);

  // Create iftar time Date object for today
  const iftarTime = new Date(now);
  iftarTime.setHours(iftarHour, iftarMinute, 0, 0);

  // If iftar time has already passed today, don't trigger the song
  if (now > iftarTime) {
    // Reset at midnight
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);
    const nextMidnight = new Date(midnight);
    nextMidnight.setDate(nextMidnight.getDate() + 1);

    // If it's after iftar but before midnight, don't check until tomorrow
    if (now > iftarTime && now < nextMidnight) {
      return;
    }
  }

  // Calculate time until iftar in seconds
  const timeUntilIftarMs = iftarTime - now;
  const timeUntilIftarSeconds = Math.floor(timeUntilIftarMs / 1000);

  // Get earlier time to play the song - use our constant
  const PLAY_SONG_BEFORE_SECONDS = PLAY_SONG_MINUTES_BEFORE_IFTAR * 60;

  // Show iftar notification when iftar is approaching (within 15 minutes)
  if (timeUntilIftarSeconds > 0 && timeUntilIftarSeconds <= 15 * 60) {
    document.getElementById("iftar-notification").classList.add("active");
    // Start countdown
    startIftarCountdown(timeUntilIftarSeconds);
  } else {
    document.getElementById("iftar-notification").classList.remove("active");
  }

  // Modified condition: If time until iftar is LESS than or equal to our play window time
  // This ensures the song plays even if we jump directly to a time less than 5 minutes before iftar
  if (
    timeUntilIftarSeconds > 0 &&
    timeUntilIftarSeconds <= PLAY_SONG_BEFORE_SECONDS &&
    !songPlaying // Add an extra check to ensure we're not already playing
  ) {
    addTerminalLine(
      `IFTAR TIME APPROACHING IN ${Math.floor(timeUntilIftarSeconds / 60)}m ${
        timeUntilIftarSeconds % 60
      }s - INITIATING AUDIO SEQUENCE`,
      "warning"
    );
    playIftarSong();
  }

  // Debug info in console (can be removed in production)
  if (timeUntilIftarSeconds > 0 && timeUntilIftarSeconds < 300) {
    console.log(
      `Time until iftar: ${Math.floor(timeUntilIftarSeconds / 60)}m ${
        timeUntilIftarSeconds % 60
      }s`
    );
  }
}

// Function to fetch country data
function fetchCountryData() {
  // We'll use the restcountries.com API to get country data
  addTerminalLine("DOWNLOADING COUNTRY DATABASE...");

  fetch("https://restcountries.com/v3.1/all?fields=name,cca2")
    .then((response) => response.json())
    .then((data) => {
      // Process and store country data
      data.forEach((country) => {
        countryData[country.cca2.toLowerCase()] = country.name.common;
      });
      addTerminalLine("COUNTRY DATABASE SYNCHRONIZED", "success");
    })
    .catch((error) => {
      addTerminalLine(`ERROR LOADING COUNTRY DATA: ${error.message}`, "error");
    });
}

// Function to show list of countries
function showCountries(page) {
  if (Object.keys(countryData).length === 0) {
    addTerminalLine("COUNTRY DATABASE NOT AVAILABLE", "error");
    return;
  }

  addTerminalLine("AVAILABLE COUNTRIES:", "success");

  // Get sorted countries
  const countries = Object.entries(countryData).sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  // Display countries in a paginated format (10 at a time)
  const countriesPerPage = 10;
  const totalPages = Math.ceil(countries.length / countriesPerPage);

  addTerminalLine(
    `SHOWING PAGE ${page}/${totalPages} - USE 'countries <page>' FOR MORE`,
    "info"
  );

  // Show first page by default
  const pageCountries = countries.slice(
    (page - 1) * countriesPerPage,
    page * countriesPerPage
  );

  pageCountries.forEach(([code, name]) => {
    addTerminalLine(`${code.toUpperCase()}: ${name}`);
  });

  addTerminalLine("USE 'cities [country_code]' TO VIEW CITIES", "success");
}

// Function to fetch cities for a country
function showCities(countryCode) {
  if (!countryCode) {
    addTerminalLine("PLEASE SPECIFY A COUNTRY CODE", "error");
    addTerminalLine("EXAMPLE: cities us", "warning");
    return;
  }

  countryCode = countryCode.toLowerCase();

  if (!countryData[countryCode]) {
    addTerminalLine(`UNKNOWN COUNTRY CODE: ${countryCode}`, "error");
    addTerminalLine("USE 'countries' TO SEE AVAILABLE CODES", "warning");
    return;
  }

  const countryName = countryData[countryCode];
  addTerminalLine(`FETCHING CITIES FOR ${countryName.toUpperCase()}...`);

  // If we already have the data cached, use it
  if (cityData[countryCode]) {
    displayCities(countryCode);
    return;
  }

  // Use a fallback API and provide some default data for common countries
  // Default data for Austria if the API fails
  const fallbackCities = {
    at: [
      { name: "Vienna", lat: 48.2082, lng: 16.3738, population: 1911191 },
      { name: "Graz", lat: 47.0707, lng: 15.4395, population: 269997 },
      { name: "Linz", lat: 48.3059, lng: 14.2862, population: 200841 },
      { name: "Salzburg", lat: 47.8095, lng: 13.055, population: 150887 },
      { name: "Innsbruck", lat: 47.2682, lng: 11.3923, population: 124579 },
      { name: "Klagenfurt", lat: 46.6249, lng: 14.3072, population: 99110 },
      { name: "Villach", lat: 46.6111, lng: 13.8558, population: 61879 },
      { name: "Wels", lat: 48.1575, lng: 14.0289, population: 60478 },
      { name: "Sankt Pölten", lat: 48.2047, lng: 15.6256, population: 52145 },
      { name: "Dornbirn", lat: 47.4125, lng: 9.7417, population: 49278 },
    ],
  };

  // Check if we have fallback data for this country
  if (fallbackCities[countryCode]) {
    cityData[countryCode] = fallbackCities[countryCode].map((city, index) => {
      return {
        code: `${countryCode}${index + 1}`,
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        population: city.population,
      };
    });

    displayCities(countryCode);
    return;
  }

  // Using the GeoNames API as a fallback for other countries
  const username = "demo"; // Free demo account, limited usage

  // Use HTTPS for the API request to avoid mixed content issues
  fetch(
    `https://secure.geonames.org/searchJSON?country=${countryCode}&featureClass=P&maxRows=20&orderby=population&username=${username}`
  )
    .then((response) => {
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data && data.geonames && data.geonames.length > 0) {
        // Store the cities data
        cityData[countryCode] = data.geonames.map((city, index) => {
          return {
            code: `${countryCode}${index + 1}`,
            name: city.name,
            lat: city.lat,
            lng: city.lng,
            population: city.population,
          };
        });

        displayCities(countryCode);
      } else {
        // If no cities found in API response, throw an error to trigger the fallback
        throw new Error("No cities found in API response");
      }
    })
    .catch((error) => {
      addTerminalLine(`API ERROR: ${error.message}`, "warning");

      // Use a simplified approach to generate default cities
      // Generate major cities for any country where API fails
      addTerminalLine("USING FALLBACK CITY DATABASE...", "warning");

      // Create some generic city data based on the country's name
      const countryNameNoSpaces = countryName.replace(/\s+/g, "");
      cityData[countryCode] = [
        {
          code: `${countryCode}1`,
          name: `Capital of ${countryName}`,
          lat: 0,
          lng: 0,
          population: "Unknown",
        },
        {
          code: `${countryCode}2`,
          name: `${countryNameNoSpaces}ville`,
          lat: 0,
          lng: 0,
          population: "Unknown",
        },
        {
          code: `${countryCode}3`,
          name: `${countryName} City`,
          lat: 0,
          lng: 0,
          population: "Unknown",
        },
      ];

      displayCities(countryCode);
    });
}

// Display cities for a specific country
function displayCities(countryCode) {
  const countryName = countryData[countryCode];
  const cities = cityData[countryCode];

  addTerminalLine(`CITIES IN ${countryName.toUpperCase()}:`, "success");

  cities.forEach((city) => {
    addTerminalLine(
      `${city.code.toUpperCase()}: ${city.name} (Pop: ${
        city.population || "unknown"
      })`
    );
  });

  addTerminalLine("USE 'setloc [code]' TO SET YOUR LOCATION", "success");
}

// Set location using a city code or name
function setLocation(input) {
  // Check if input is a city code (e.g., "us1", "fr2")
  if (/^[a-z]{2}\d+$/.test(input)) {
    const countryCode = input.substring(0, 2);
    
    // If we have this country's cities data
    if (cityData[countryCode]) {
      const city = cityData[countryCode].find(city => city.code === input);
      if (city) {
        setLocationByCoordinates(
          parseFloat(city.lat), 
          parseFloat(city.lng), 
          `${city.name}, ${countryData[countryCode] || countryCode.toUpperCase()}`
        );
        return;
      }
    }
  }
  
  // If not a valid city code, try to geocode the input as a city name
  geocodeLocation(input);
}

// Function to geocode a location name to coordinates
function geocodeLocation(locationName) {
  addTerminalLine(`SEARCHING FOR LOCATION: ${locationName}...`);
  
  // Use OpenStreetMap Nominatim API for geocoding (free and reliable)
  fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationName)}&format=json&limit=1`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        const displayName = result.display_name;
        
        // Set the location using the coordinates and display name
        setLocationByCoordinates(lat, lon, displayName);
      } else {
        addTerminalLine(`LOCATION NOT FOUND: ${locationName}`, "error");
        addTerminalLine("TRY A DIFFERENT LOCATION NAME OR FORMAT", "warning");
        addTerminalLine("EXAMPLE: 'setloc New York' OR 'setloc Paris, France'", "warning");
      }
    })
    .catch(error => {
      addTerminalLine(`GEOCODING ERROR: ${error.message}`, "error");
      addTerminalLine("LOCATION SERVICE UNAVAILABLE", "error");
      addTerminalLine("TRY USING A CITY CODE INSTEAD", "warning");
      addTerminalLine("USE 'countries' TO SEE AVAILABLE COUNTRY CODES", "warning");
    });
}

// Toggle orbit camera mode
function toggleOrbitMode(enable) {
  orbitControls = enable === undefined ? !orbitControls : enable;
  
  // Disable cinematic mode when orbit is enabled
  if (enable) {
    cinematicMode = false;
    // Store current camera position for returning later
    camera.userData.lastPosition = camera.position.clone();
  } else {
    // Restore previous camera position if available
    if (camera.userData.lastPosition) {
      camera.position.copy(camera.userData.lastPosition);
      camera.lookAt(0, 0, 0);
    }
  }
}

// Toggle cinematic camera mode
function toggleCinematicMode(enable) {
  cinematicMode = enable === undefined ? !cinematicMode : enable;
  
  // Disable orbit controls when cinematic mode is enabled
  if (enable) {
    orbitControls = false;
    // Initialize with a random view
    switchToNextCinematicView();
    lastCinematicViewChange = Date.now();
    addTerminalLine("CINEMATIC CAMERA MODE ACTIVATED", "info");
  } else {
    addTerminalLine("CINEMATIC CAMERA MODE DEACTIVATED", "info");
  }
}

// Get random duration between 10-15 seconds for view changes
function getRandomViewDuration() {
  return (25000 + Math.random() * 10000); // 25-35 seconds in milliseconds
}

// Switch to next cinematic camera view
function switchToNextCinematicView() {
  // Don't switch views if we're in a manual camera transition
  if (inCameraTransition) return;
  
  // Check if we have valid views
  if (!cinematicViews || cinematicViews.length === 0) {
    console.error("No cinematic views defined");
    return;
  }
  
  // Get a random view that's different from the current one
  let nextView;
  do {
    nextView = Math.floor(Math.random() * cinematicViews.length);
  } while (nextView === currentCinematicView && cinematicViews.length > 1);
  
  currentCinematicView = nextView;
  console.log("Transitioning to view:", cinematicViews[currentCinematicView].name);
  transitionToCinematicView(cinematicViews[currentCinematicView]);
}

// Define cinematic object to hold views and settings
const cinematic = {
  views: [],
  currentView: 0,
  lastChange: 0
};

// Define cinematic camera views
const cinematicViews = [
  // Earth Close-up - dramatic viewing angle
  {
    position: new THREE.Vector3(1.8, 0.8, 1.8),
    target: new THREE.Vector3(0, 0, 0),
    name: "TACTICAL VIEW ALPHA",
    easing: "easeOutQuart"
  },
  // Moon Tracking - see moon orbiting earth
  {
    position: new THREE.Vector3(0, 3, 6),
    target: new THREE.Vector3(MOON_DISTANCE * 0.3, 0, 0),
    name: "LUNAR OBSERVATION MODE",
    easing: "easeInOutQuad"
  },
  // Sun and Earth - see earth illuminated by sun
  {
    position: new THREE.Vector3(8, 3, 8),
    target: new THREE.Vector3(0, 0, 0),
    name: "SOLAR ALIGNMENT VIEW",
    easing: "easeInOutQuad"
  },
  // Polar View - looking down at earth from above
  {
    position: new THREE.Vector3(0, 5, 0.1),
    target: new THREE.Vector3(0, 0, 0),
    name: "TACTICAL ZENITH POSITION",
    easing: "easeInOutSine"
  },
  // Celestial System - view of earth, moon and sun together
  {
    position: new THREE.Vector3(10, 5, 10),
    target: new THREE.Vector3(2, 0, 0),
    name: "CELESTIAL TRINITY ALIGNMENT",
    easing: "easeInOutExpo"
  },
  // Dramatic Angle - low angle view of earth and moon
  {
    position: new THREE.Vector3(3, -2, 5),
    target: new THREE.Vector3(0, 0, 0),
    name: "STRATEGIC OBSERVER MODE",
    easing: "easeOutQuart"
  },
  // Terminator Line - view of night/day boundary
  {
    position: new THREE.Vector3(-1, 0.5, 3),
    target: new THREE.Vector3(0, 0, 0),
    name: "TERMINATOR LINE OBSERVATION",
    easing: "easeInOutQuad"
  }
];

// Set the available cinematic views
cinematic.views = cinematicViews;

// Start in a random view
currentCinematicView = Math.floor(Math.random() * cinematicViews.length);
  
// Create HUD overlay
createHudOverlay();
  
// Initialize with current view
transitionToCinematicView(cinematicViews[currentCinematicView]);
lastCinematicViewChange = Date.now();

// Create NERV-style HUD overlay
function createHudOverlay() {
  // Create container for HUD elements
  const hudContainer = document.createElement('div');
  hudContainer.id = 'eva-hud-overlay';
  hudContainer.style.position = 'absolute';
  hudContainer.style.top = '0';
  hudContainer.style.left = '0';
  hudContainer.style.width = '100%';
  hudContainer.style.height = '100%';
  hudContainer.style.pointerEvents = 'none';
  hudContainer.style.fontFamily = 'monospace';
  hudContainer.style.color = '#00ffaa';
  hudContainer.style.textShadow = '0 0 5px rgba(0, 255, 170, 0.8)';
  hudContainer.style.zIndex = '10';
  
  // Add to DOM
  document.getElementById('globe-canvas').appendChild(hudContainer);
  
  // Create status readout panel
  const statusPanel = document.createElement('div');
  statusPanel.id = 'eva-status-panel';
  statusPanel.style.position = 'absolute';
  statusPanel.style.top = '20px';
  statusPanel.style.right = '20px';
  statusPanel.style.padding = '10px';
  statusPanel.style.border = '1px solid #00ffaa';
  statusPanel.style.backgroundColor = 'rgba(0, 20, 40, 0.7)';
  statusPanel.style.fontSize = '12px';
  statusPanel.style.lineHeight = '1.5';
  statusPanel.style.textAlign = 'right';
  statusPanel.innerHTML = `
    <div style="font-size:14px;margin-bottom:5px;color:#ff9900">NERV TACTICAL DISPLAY</div>
    <div id="eva-view-name">VIEW: INITIALIZING</div>
    <div id="eva-time-display">TIME: SYNCHRONIZING</div>
    <div id="eva-location-display">LOCATION: SCANNING</div>
    <div id="eva-moon-phase">MOON PHASE: CALCULATING</div>
  `;
  hudContainer.appendChild(statusPanel);
  
  // Start HUD update loop
  updateHud();
}

// Update HUD information
function updateHud() {
  // Update view name
  if (cinematicViews[currentCinematicView]) {
    document.getElementById('eva-view-name').textContent = `VIEW: ${cinematicViews[currentCinematicView].name}`;
  }
  
  // Update time display
  const now = new Date();
  const timeString = now.toTimeString().split(' ')[0];
  document.getElementById('eva-time-display').textContent = `TIME: ${timeString}`;
  
  // Update location display
  document.getElementById('eva-location-display').textContent = `LOCATION: ${locationName}`;
  
  // Update moon phase
  const phaseNames = [
    "NEW MOON", "WAXING CRESCENT", "FIRST QUARTER",
    "WAXING GIBBOUS", "FULL MOON", "WANING GIBBOUS",
    "LAST QUARTER", "WANING CRESCENT"
  ];
  const phaseIndex = Math.floor((moonPhase / (2 * Math.PI)) * 8) % 8;
  document.getElementById('eva-moon-phase').textContent = `MOON PHASE: ${phaseNames[phaseIndex]}`;
  
  // Continue updating
  requestAnimationFrame(updateHud);
}

// Transition to a specific cinematic view
function transitionToCinematicView(view, useCut = false) {
  if (!view) {
    console.error("View is undefined in transitionToCinematicView");
    return;
  }
  
  inCameraTransition = true;
  
  // Get current camera position and target
  const startPos = camera.position.clone();
  const startTarget = new THREE.Vector3(0, 0, 0);
  camera.getWorldDirection(startTarget);
  startTarget.multiplyScalar(100).add(camera.position);
  
  // Get target position and look at point
  const targetPos = view.getPosition ? view.getPosition() : (view.position || new THREE.Vector3(0, 0, 0));
  const targetLookAt = view.getLookAt ? view.getLookAt() : (view.target || new THREE.Vector3(0, 0, 0));
  
  // Generate a subtle random variation to prevent exact repetition
  const variation = 0.1;  // 10% variation
  const randomizedPos = {
    x: targetPos.x * (1 + (Math.random() * variation * 2 - variation)),
    y: targetPos.y * (1 + (Math.random() * variation * 2 - variation)),
    z: targetPos.z * (1 + (Math.random() * variation * 2 - variation))
  };
  
  // If using a cut transition, simply set the camera position and exit
  if (useCut) {
    camera.position.set(randomizedPos.x, randomizedPos.y, randomizedPos.z);
    camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
    inCameraTransition = false;
    return;
  }
  
  // Setup transition
  const duration = view.duration || 2000;
  const startTime = Date.now();
  
  function updateCameraTransition() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // Apply easing based on the view's easing function or default
    let easedProgress;
    switch (view.easing) {
      case "easeInOutQuad":
        easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        break;
      case "easeOutCubic":
        easedProgress = 1 - Math.pow(1 - progress, 3);
        break;
      case "easeInOutCubic":
        easedProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        break;
      case "easeInOutSine":
        easedProgress = -(Math.cos(Math.PI * progress) - 1) / 2;
        break;
      case "easeOutQuart":
        easedProgress = 1 - Math.pow(1 - progress, 4);
        break;
      case "easeInOutExpo":
        easedProgress = progress === 0 ? 0 : progress === 1 ? 1 : (2 - Math.pow(2, -20 * progress + 10)) / 2;
        break;
      default:
        easedProgress = progress;
    }
    
    // Interpolate camera position
    camera.position.x = startPos.x + (randomizedPos.x - startPos.x) * easedProgress;
    camera.position.y = startPos.y + (randomizedPos.y - startPos.y) * easedProgress;
    camera.position.z = startPos.z + (randomizedPos.z - startPos.z) * easedProgress;
    
    // Interpolate look at point
    const currentLookAt = new THREE.Vector3(
      startTarget.x + (targetLookAt.x - startTarget.x) * easedProgress,
      startTarget.y + (targetLookAt.y - startTarget.y) * easedProgress,
      startTarget.z + (targetLookAt.z - startTarget.z) * easedProgress
    );
    
    camera.lookAt(currentLookAt);
    
    if (progress < 1) {
      requestAnimationFrame(updateCameraTransition);
    } else {
      // Ensure final position is exactly as specified
      camera.position.set(randomizedPos.x, randomizedPos.y, randomizedPos.z);
      camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
      inCameraTransition = false;
    }
  }
  
  updateCameraTransition();
}

// Helper function to safely decode base64 strings
function safeAtob(str) {
  try {
    // Make sure the string has valid base64 characters
    // Replace any invalid characters with proper base64 padding
    const cleanedStr = str.replace(/[^A-Za-z0-9+/=]/g, '');
    
    // Ensure proper padding
    let paddedStr = cleanedStr;
    while (paddedStr.length % 4 !== 0) {
      paddedStr += '=';
    }
    
    return atob(paddedStr);
  } catch (e) {
    console.error("Error decoding base64 string:", e);
    return "";
  }
}

// Create random celestial phenomena (comets, shooting stars)
function createCelestialPhenomena() {
  // Create comets
  for (let i = 0; i < 3; i++) {
    createComet(i);
  }
  
  // Schedule shooting stars to appear randomly
  setInterval(createShootingStar, 10000); // Create a shooting star every 10 seconds
}

// Create a comet
function createComet(index) {
  // Create comet head
  const cometGeometry = new THREE.SphereGeometry(0.05, 16, 16);
  const cometMaterial = new THREE.MeshBasicMaterial({
    color: 0x88aaff,
    transparent: true,
    opacity: 0.8
  });
  
  const comet = new THREE.Mesh(cometGeometry, cometMaterial);
  
  // Create comet tail
  const tailGeometry = new THREE.BufferGeometry();
  const tailVertices = [];
  const tailColors = [];
  
  // Generate tail points
  const tailLength = 20 + Math.floor(Math.random() * 30); // 20-50 points
  
  for (let i = 0; i < tailLength; i++) {
    // Tail extends behind the comet
    tailVertices.push(0, 0, i * 0.04);
    
    // Fade out along the tail
    const opacity = 1 - (i / tailLength);
    tailColors.push(0.6, 0.8, 1, opacity);
  }
  
  tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tailVertices, 3));
  tailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(tailColors, 4));
  
  const tailMaterial = new THREE.PointsMaterial({
    size: 0.03,
    transparent: true,
    vertexColors: true,
    blending: THREE.AdditiveBlending
  });
  
  const tail = new THREE.Points(tailGeometry, tailMaterial);
  comet.add(tail);
  
  // Position comet in a wide orbit
  const orbitRadius = 15 + Math.random() * 10; // 15-25
  const orbitSpeed = 0.0001 + Math.random() * 0.0001; // 0.0001-0.0002
  const startAngle = Math.random() * Math.PI * 2;
  const orbitTilt = Math.random() * Math.PI / 2;
  const orbitDirection = Math.random() > 0.5 ? 1 : -1;
  
  // Store comet data
  const cometData = {
    mesh: comet,
    orbit: {
      radius: orbitRadius,
      speed: orbitSpeed,
      angle: startAngle,
      tilt: orbitTilt,
      direction: orbitDirection
    }
  };
  
  visualEffects.comets.push(cometData);
  scene.add(comet);
}

// Create a shooting star
function createShootingStar() {
  // Only create if we're not in a camera transition
  if (inCameraTransition) return;
  
  // Create shooting star geometry
  const geometry = new THREE.BufferGeometry();
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  });
  
  // Random starting position (far from Earth)
  const startDistance = 20 + Math.random() * 10;
  const startDir = new THREE.Vector3(
    Math.random() - 0.5,
    Math.random() - 0.5,
    Math.random() - 0.5
  ).normalize();
  
  const startPos = startDir.clone().multiplyScalar(startDistance);
  
  // Random end position
  const endOffset = new THREE.Vector3(
    (Math.random() - 0.5) * 5,
    (Math.random() - 0.5) * 5,
    (Math.random() - 0.5) * 5
  );
  const endPos = startPos.clone().sub(startDir.clone().multiplyScalar(5)).add(endOffset);
  
  // Create line
  const vertices = [
    startPos.x, startPos.y, startPos.z,
    endPos.x, endPos.y, endPos.z
  ];
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  
  const shootingStar = new THREE.Line(geometry, material);
  
  // Animation properties
  const duration = 1 + Math.random() * 1.5; // 1-2.5 seconds
  const shootingStarData = {
    mesh: shootingStar,
    startTime: Date.now(),
    duration: duration * 1000 // convert to ms
  };
  
  visualEffects.shootingStars.push(shootingStarData);
  scene.add(shootingStar);
}
