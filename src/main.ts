import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./_leafletWorkaround.ts";

import luck from "./_luck.ts";

/**
 * SECTION: GAMEPLAY PARAMETERS
 */

const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const CELL_SIZE = 0.0001;
const GRID_RADIUS = 25;

const winningToken: number = 256;
let playerMovement: Movement | null;

let playerCell = latLongToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
const cellTokens = new Map<string, number | null>();
const cellMarkers = new Map<string, L.Marker>();
const visibleCells = new Set<string>();
const cellRects = new Map<string, L.Rectangle>();
const cellStates = new Map<string, number | null>();
let playerToken: number | null;

/**
 * SECTION: HELPER FUNCTIONS
 */
type CellCoord = { x: number; y: number };

function latLongToCell(lat: number, lng: number): CellCoord {
  return {
    x: Math.floor(lng / CELL_SIZE),
    y: Math.floor(lat / CELL_SIZE),
  };
}

function cellToLatLong(cellX: number, cellY: number): L.LatLng {
  return leaflet.latLng(cellY * CELL_SIZE, cellX * CELL_SIZE);
}

function getCellKey(x: number, y: number): string {
  return `${x},${y}`;
}

/**
 * SECTION: CREATING MAP+CELLS
 */

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

const map = leaflet.map(mapDiv, {
  center: CLASSROOM_LATLNG,
  zoom: GAMEPLAY_ZOOM_LEVEL,
  minZoom: GAMEPLAY_ZOOM_LEVEL,
  maxZoom: GAMEPLAY_ZOOM_LEVEL,
  zoomControl: false,
  scrollWheelZoom: false,
});

map.on("moveend", () => {
  const center = map.getCenter();
  renderVisibleCells(center);
});

leaflet
  .tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  })
  .addTo(map);

const _playerMarker = leaflet.circleMarker(CLASSROOM_LATLNG, {
  radius: 8,
  color: "blue",
  fillColor: "deepskyblue",
  fillOpacity: 0.9,
}).addTo(map);

function renderVisibleCells(centerLatLng: L.LatLng) {
  const centerCell = latLongToCell(centerLatLng.lat, centerLatLng.lng);
  const newVisibleCells = new Set<string>();

  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const cellX = centerCell.x + dx;
      const cellY = centerCell.y + dy;
      const key = getCellKey(cellX, cellY);
      newVisibleCells.add(key);

      if (!visibleCells.has(key)) {
        generateCell(cellX, cellY);
        if (cellTokens.has(key)) {
          cellStates.set(key, cellTokens.get(key)!);
        }
      }
    }
  }
  for (const key of visibleCells) {
    if (!newVisibleCells.has(key)) {
      const marker = cellMarkers.get(key);
      if (marker) marker.remove();
      cellMarkers.delete(key);

      const rect = cellRects.get(key);
      if (rect) rect.remove();
      cellRects.delete(key);

      cellTokens.delete(key);
    }
  }

  visibleCells.clear();
  for (const key of newVisibleCells) visibleCells.add(key);
}

function generateCell(cellX: number, cellY: number) {
  const key = getCellKey(cellX, cellY);
  const cellOrigin = cellToLatLong(cellX, cellY);
  const cellBounds: L.LatLngBoundsExpression = [
    [cellOrigin.lat, cellOrigin.lng],
    [cellOrigin.lat + CELL_SIZE, cellOrigin.lng + CELL_SIZE],
  ];

  const rect = leaflet.rectangle(cellBounds, {
    color: "blue",
    weight: 1,
    fillOpacity: 0.1,
  }).addTo(map);

  cellRects.set(key, rect);

  let tokenValue: number | null;

  if (cellStates.has(key)) {
    tokenValue = cellStates.get(key)!;
  } else {
    tokenValue = getTokenValueForCell(cellX, cellY);
  }
  cellTokens.set(key, tokenValue);

  if (tokenValue) updateCellMarker(cellX, cellY);
  rect.addEventListener("click", () => handleCellClick(cellX, cellY));
}

function handleCellClick(cellX: number, cellY: number) {
  const distance = Math.abs(cellX - playerCell.x) +
    Math.abs(cellY - playerCell.y);

  if (distance > 3) {
    alert("Too far away to interact!");
    return;
  }

  const key = getCellKey(cellX, cellY);
  const tokenValue = cellTokens.get(key);

  if (!tokenValue) {
    alert("Cell is empty!");
    return;
  }

  if (!playerToken) {
    playerToken = tokenValue;
    cellTokens.set(key, null);
    cellStates.set(key, null);
    updateInventoryDisplay();
    updateCellMarker(cellX, cellY);
    return;
  }

  if (playerToken && tokenValue) {
    if (playerToken == tokenValue) {
      const newValue = playerToken * 2;
      playerToken = null;
      cellTokens.set(key, newValue);
      cellStates.set(key, newValue);
      updateInventoryDisplay();
      updateCellMarker(cellX, cellY);
    } else {
      playerToken = tokenValue;
      cellTokens.set(key, null);
      cellStates.set(key, null);
      updateInventoryDisplay();
      updateCellMarker(cellX, cellY);
    }
  }
}

function getTokenValueForCell(x: number, y: number): number | null {
  const r = luck(`cell:${x},${y}`);
  if (r < 0.8) return null;
  return 1;
}

/**
 * SECTION: CREATING INVENTORY
 */

const inventoryDiv = document.createElement("div");
inventoryDiv.id = "inventory";
inventoryDiv.style.position = "absolute";
inventoryDiv.style.top = "10px";
inventoryDiv.style.right = "10px";
inventoryDiv.style.padding = "50px";
inventoryDiv.style.background = "white";
inventoryDiv.style.border = "1px solid black";
inventoryDiv.style.fontWeight = "bold";
inventoryDiv.style.fontSize = "20px";
inventoryDiv.style.zIndex = "1000";
document.body.append(inventoryDiv);

/**
 * SECTION: UPDATING ELEMENTS
 */

function updateInventoryDisplay() {
  inventoryDiv.innerText = playerToken ? `Holding: ${playerToken}` : "Empty";
  checkWinCondition();
}

function updateCellMarker(cellX: number, cellY: number) {
  const key = getCellKey(cellX, cellY);
  const tokenValue = cellTokens.get(key);

  const oldMarker = cellMarkers.get(key);
  if (oldMarker) {
    oldMarker.remove();
  }

  if (tokenValue) {
    const origin = cellToLatLong(cellX, cellY);
    const center = leaflet.latLng(
      origin.lat + CELL_SIZE / 2,
      origin.lng + CELL_SIZE / 2,
    );

    const marker = leaflet.marker(center, {
      icon: leaflet.divIcon({
        className: "token-label",
        html: `<b>${tokenValue}</b>`,
        iconSize: [20, 20],
      }),
      interactive: false,
    }).addTo(map);

    cellMarkers.set(key, marker);
  }

  saveGame();
}

/**
 * SECTION: MOVEMENT
 */

interface Movement {
  onEnable(): void;
  onDisable(): void;
}

const controls = document.createElement("div");
controls.innerHTML = `
  <button id="move-north">↑</button>
  <button id="move-south">↓</button>
  <button id="move-west">←</button>
  <button id="move-east">→</button>
`;
controls.style.position = "absolute";
controls.style.bottom = "10px";
controls.style.left = "10px";
document.body.append(controls);

class ButtonControls implements Movement {
  private northHandler = () => this.movePlayer(0, 1);
  private southHandler = () => this.movePlayer(0, -1);
  private westHandler = () => this.movePlayer(-1, 0);
  private eastHandler = () => this.movePlayer(1, 0);

  onEnable() {
    (document.getElementById("move-north")! as HTMLButtonElement)
      .addEventListener("click", this.northHandler);
    (document.getElementById("move-south")! as HTMLButtonElement)
      .addEventListener("click", this.southHandler);
    (document.getElementById("move-west")! as HTMLButtonElement)
      .addEventListener("click", this.westHandler);
    (document.getElementById("move-east")! as HTMLButtonElement)
      .addEventListener("click", this.eastHandler);
    this.determineDisableButtons(false);
  }

  onDisable() {
    (document.getElementById("move-north")! as HTMLButtonElement)
      .removeEventListener("click", this.northHandler);
    (document.getElementById("move-south")! as HTMLButtonElement)
      .removeEventListener("click", this.southHandler);
    (document.getElementById("move-west")! as HTMLButtonElement)
      .removeEventListener("click", this.westHandler);
    (document.getElementById("move-east")! as HTMLButtonElement)
      .removeEventListener("click", this.eastHandler);
    this.determineDisableButtons(true);
  }

  movePlayer(dx: number, dy: number) {
    const targetCell = {
      x: playerCell.x + dx,
      y: playerCell.y + dy,
    };

    updatePlayerPosition(targetCell);
  }

  determineDisableButtons(b: boolean) {
    (document.getElementById("move-north")! as HTMLButtonElement).disabled = b;
    (document.getElementById("move-south")! as HTMLButtonElement).disabled = b;
    (document.getElementById("move-east")! as HTMLButtonElement).disabled = b;
    (document.getElementById("move-west")! as HTMLButtonElement).disabled = b;
  }
}

class GeoControls implements Movement {
  private watchId: number | null = null;
  onEnable() {
    if (!navigator.geolocation) {
      alert("Geolocation not found");
    }

    this.watchId = navigator.geolocation.watchPosition(
      (position) => this.updatePosition(position),
      (error) => console.error(error),
      { enableHighAccuracy: true, maximumAge: 1000 },
    );
  }
  onDisable() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
    }
  }

  private updatePosition(position: GeolocationPosition) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    const targetCell = latLongToCell(lat, lng);
    updatePlayerPosition(targetCell);
  }
}

function updatePlayerPosition(targetCell: CellCoord) {
  const cellOrigin = cellToLatLong(targetCell.x, targetCell.y);
  const newLatLng = leaflet.latLng(
    cellOrigin.lat + CELL_SIZE / 2,
    cellOrigin.lng + CELL_SIZE / 2,
  );

  playerCell = targetCell;
  _playerMarker.setLatLng(newLatLng);
  map.panTo(newLatLng);
}

const urlParams = new URLSearchParams(globalThis.location.search);
let movementMode: "buttons" | "geolocation" =
  (urlParams.get("movement") as "buttons" | "geolocation") || "buttons";

playerMovement = movementMode === "geolocation"
  ? new GeoControls()
  : new ButtonControls();

playerMovement.onEnable();

const switchButton = document.createElement("button");
switchButton.innerText = "Switch Movement";
switchButton.style.position = "absolute";
switchButton.style.bottom = "60px";
switchButton.style.left = "10px";
switchButton.style.zIndex = "1000";
document.body.append(switchButton);

switchButton.onclick = () => {
  const newMode = movementMode === "buttons" ? "geolocation" : "buttons";
  switchMovementMode(newMode);
  movementMode = newMode;
};

function switchMovementMode(mode: "buttons" | "geolocation") {
  if (playerMovement) {
    playerMovement.onDisable();
  }

  if (mode === "geolocation") {
    playerMovement = new GeoControls();
  } else {
    playerMovement = new ButtonControls();
  }

  playerMovement.onEnable();
}

/**
 * SECTION: MANAGING SAVED DATA
 */

function saveGame() {
  const data = {
    playerCell,
    playerToken,
    cellStates: Array.from(cellStates.entries()),
  };

  localStorage.setItem("game", JSON.stringify(data));
}

function loadGame() {
  const save = localStorage.getItem("game");
  if (!save) return;

  const data = JSON.parse(save);
  playerCell = data.playerCell;
  playerToken = data.playerToken;
  cellStates.clear();
  data.cellStates.forEach(([key, value]: [string, number | null]) =>
    cellStates.set(key, value)
  );

  updatePlayerPosition(playerCell);
  map.setView(cellToLatLong(playerCell.x, playerCell.y), GAMEPLAY_ZOOM_LEVEL);
}

const newGameButton = document.createElement("button");
newGameButton.innerText = "New Game";
newGameButton.style.position = "absolute";
newGameButton.style.bottom = "10px";
newGameButton.style.right = "10px";
document.body.append(newGameButton);

newGameButton.addEventListener("click", () => newGame());

function newGame() {
  localStorage.removeItem("game");
  cellStates.clear();
  cellTokens.clear();
  cellMarkers.forEach((marker) => marker.remove());
  cellMarkers.clear();
  cellRects.forEach((rect) => rect.remove());
  cellRects.clear();
  visibleCells.clear();

  playerToken = null;
  playerCell = latLongToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
  _playerMarker.setLatLng(CLASSROOM_LATLNG);

  renderVisibleCells(CLASSROOM_LATLNG);
  updateInventoryDisplay();
  map.setView(cellToLatLong(playerCell.x, playerCell.y), GAMEPLAY_ZOOM_LEVEL);
  alert("New game started!");
}

function checkWinCondition() {
  if (playerToken == winningToken) {
    alert("You win!");
  }
}

/**
 * SECTION: STARTING GAME
 */

loadGame();
renderVisibleCells(CLASSROOM_LATLNG);
updateInventoryDisplay();
