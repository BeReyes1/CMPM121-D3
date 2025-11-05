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
const GRID_RADIUS = 100;

const playerCell = latLongToCell(CLASSROOM_LATLNG.lat, CLASSROOM_LATLNG.lng);
const cellTokens = new Map<string, number | null>();

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

function renderGrid(centerLatLng: L.LatLng) {
  const centerCell = latLongToCell(centerLatLng.lat, centerLatLng.lng);

  for (let dy = -GRID_RADIUS; dy <= GRID_RADIUS; dy++) {
    for (let dx = -GRID_RADIUS; dx <= GRID_RADIUS; dx++) {
      const cellX = centerCell.x + dx;
      const cellY = centerCell.y + dy;
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

      const tokenValue = getTokenValueForCell(cellX, cellY);
      cellTokens.set(key, tokenValue);

      if (tokenValue) {
        const center = leaflet.latLng(
          cellOrigin.lat + CELL_SIZE / 2,
          cellOrigin.lng + CELL_SIZE / 2,
        );
        leaflet.marker(center, {
          icon: leaflet.divIcon({
            className: "token-label",
            html: `<b>${tokenValue}</b>`,
            iconSize: [20, 20],
          }),
        }).addTo(map);
      }

      rect.addEventListener("click", () => handleCellClick(cellX, cellY));
    }
  }
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

  if (tokenValue) {
    alert(`Cell has a token of value ${tokenValue}.`);
  } else {
    alert(`Cell is empty.`);
  }
}

function getTokenValueForCell(x: number, y: number): number | null {
  const r = luck(`cell:${x},${y}`);
  if (r < 0.8) return null;
  if (r < 0.9) return 1;
  if (r < 0.98) return 2;
  return 7;
}

renderGrid(CLASSROOM_LATLNG);
