# D3: {game title goes here}

## D3.a: Core mechanics (token collection and crafting)

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players collect and craft tokens from nearby locations to finally make one of sufficiently high value?

### Steps A

- [x] copy main.ts to reference.ts for future reference
- [x] delete everything in main.ts
- [x] put a basic leaflet map on the screen
- [x] draw the player's location on the map
- [x] draw a rectangle representing one cell on the map
- [x] use loops to draw a whole grid of cells on the map
- [x] allow only nearby cells to be interacted with
- [x] put tokens on cells that have a random value
- [x] player can pick up token from cell and removes value from cell
- [x] display if player has token
- [x] crafting system where token doubles value

## D3.b: Globe-spanning Gameplay

Key technical challenge: Can you assemble a map-based user interface using the Leaflet mapping framework?
Key gameplay challenge: Can players move along the map with new cells appearing

### Steps B

- [x] Be able to move play, cell by cell
- [x] Create a dynamic grid that updates via moving
- [x] Add a victory condition

## D3.c: Object Persistence

Key technical challenge: Can I use the flyweight and memento patterns to remove and store data?
Key gameplay challenge: Can cells reload their token state when reappearing on screen?

### Steps C

- [x] Have objects persist through flyweight+memento patterns through map
- [x] Update gameplay conditions

## D3.d: Gameplay Across Real-world Space and Time

Key technical challenges: Can your software remember game state even when the page is closed? Is the player character’s in-game movement controlled by the real-world geolocation of their device?
Key gameplay challenge: Can the user test the game with multiple gameplay sessions, some involving real-world movement and some involving simulated movement?

### Steps D

- [x] Use facade pattern to implement movement for two control schemes via a shared interface
- [x] Be able to switch between two control schemes
- [x] Persist game state on page reloads
- [x] Button for new game
