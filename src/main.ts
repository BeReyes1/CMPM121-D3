import leaflet from "leaflet";

// Style sheets
import "leaflet/dist/leaflet.css";
import "./style.css";

// Fix missing marker images
import "./_leafletWorkaround.ts";

import luck from "./_luck.ts";

const mapDiv = document.createElement("div");
mapDiv.id = "map";
document.body.append(mapDiv);

//Gameplay parameters
const CLASSROOM_LATLNG = leaflet.latLng(
  36.997936938057016,
  -122.05703507501151,
);
const GAMEPLAY_ZOOM_LEVEL = 19;
const CELL_SIZE = 0.0001;
const GRID_RADIUS = 25;

let playerCell = latLongToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
const cellTokens = new Map<string, number | null>();
const cellMarkers = new Map<string, L.Marker>();
const visibleCells = new Set<string>();
const cellRects = new Map<string, L.Rectangle>();
let playerToken: number | null;
const winningToken: number = 4;

//helper functions
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

//creating the map
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

  const tokenValue = getTokenValueForCell(cellX, cellY);
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
    updateInventoryDisplay();
    updateCellMarker(cellX, cellY);
    return;
  }

  if (playerToken && tokenValue) {
    if (playerToken == tokenValue) {
      const newValue = playerToken * 2;
      playerToken = null;
      cellTokens.set(key, newValue);
      updateInventoryDisplay();
      updateCellMarker(cellX, cellY);
    } else {
      playerToken = tokenValue;
      cellTokens.set(key, null);
      updateInventoryDisplay();
      updateCellMarker(cellX, cellY);
    }
  }
}

function getTokenValueForCell(x: number, y: number): number | null {
  const r = luck(`cell:${x},${y}`);
  if (r < 0.8) return null;
  if (r < 0.9) return 1;
  if (r < 0.98) return 2;
  return 7;
}

//creating inventory
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

//updating elements
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
}

//moving
function movePlayer(dx: number, dy: number) {
  const targetCell = {
    x: playerCell.x + dx,
    y: playerCell.y + dy,
  };

  const cellOrigin = cellToLatLong(targetCell.x, targetCell.y);
  const newLatLng = leaflet.latLng(
    cellOrigin.lat + CELL_SIZE / 2,
    cellOrigin.lng + CELL_SIZE / 2,
  );

  playerCell = targetCell;
  _playerMarker.setLatLng(newLatLng);
  map.panTo(newLatLng);
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
controls.style.zIndex = "1000";
document.body.append(controls);

(document.getElementById("move-north")! as HTMLButtonElement).onclick = () =>
  movePlayer(0, 1);
(document.getElementById("move-south")! as HTMLButtonElement).onclick = () =>
  movePlayer(0, -1);
(document.getElementById("move-west")! as HTMLButtonElement).onclick = () =>
  movePlayer(-1, 0);
(document.getElementById("move-east")! as HTMLButtonElement).onclick = () =>
  movePlayer(1, 0);

function checkWinCondition() {
  if (playerToken == winningToken) {
    alert("You win!");
  }
}

//starting game
renderVisibleCells(CLASSROOM_LATLNG);
updateInventoryDisplay();
