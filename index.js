const HEX_SIZE = 48;
const VERT_HEX_OFFSET = 24;
const HORIZ_HEX_OFFSET = -10;
const URANIUM_IN_MAP = 5;
// const MAX_URANIUM_IN_MAP = 5; TODO: add max?
const RAISED_TILES_IN_MAP = 5;
const RAISED_OFFSET = -10;
const BLANK_TILES = 20;
const SEL_BRIGHTNESS_MIN = 80;
const SEL_BRIGHTNESS_MAX = 120;
const MAP_WIDTH = 15;
const MAP_HEIGHT = 10;
const URANIUM_INC = 10;

const map = [];
let loop = 0;
let selectedTile = [0, 0];
let uranium = 500;
const cooldownTimers = {};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const tile = new Image(HEX_SIZE, HEX_SIZE);
tile.src = 'tile.png';
const tileDark = new Image(HEX_SIZE, HEX_SIZE);
tileDark.src = 'tile-dark.png';
const uraniumTile = new Image(HEX_SIZE, HEX_SIZE);
uraniumTile.src = 'uranium.png';
const ccTile = new Image(HEX_SIZE, HEX_SIZE);
ccTile.src = 'command-center.png';
const mineTile = new Image(HEX_SIZE, HEX_SIZE);
mineTile.src = 'mine.png';
const turretTile = new Image(HEX_SIZE, HEX_SIZE);
turretTile.src = 'turret.png';
const aoiTile = new Image(HEX_SIZE, HEX_SIZE);
aoiTile.src = 'aoi-human.png';
let hOffset = 0;
let selectionBrightness = SEL_BRIGHTNESS_MIN;
let selectionBrightnessInc = 0.5;

const PLAYERS = {
  HUMAN: 1,
  CPU: 2
};

// buildings collection
const buildings = {
  commandCenter: {
    hp: 500,
    area: 4,
    cost: 300,
    cooldown: 30,
    cooldownRemaining: 0,
  },
  turret: {
    hp: 200,
    area: 2,
    cost: 200,
    cooldown: 5,
    cooldownRemaining: 0,
  },
  mine: {
    hp: 100,
    area: 1,
    cost: 100,
    cooldown: 10,
    cooldownRemaining: 0,
  }
};

const drawMap = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  // highlight effect
  selectionBrightness += selectionBrightnessInc;
  if (selectionBrightness >= SEL_BRIGHTNESS_MAX || selectionBrightness <= SEL_BRIGHTNESS_MIN) {
    selectionBrightnessInc = -selectionBrightnessInc;
  }

  // draw map
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell) {
        // tiles
        if (j > 0) {
          hOffset = HORIZ_HEX_OFFSET;
        }
        if (i === selectedTile[0] && j === selectedTile[1]) {
          ctx.filter = `brightness(${selectionBrightness}%)`;
        } else {
          ctx.filter = "none";
        }
        if (i % 2 === 0) {
          if (cell.raised) {
            ctx.drawImage(tileDark, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET);
          }
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0));
          if (cell.aoi) {
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0));
          }
          if (cell && cell.type === "uranium") {
            ctx.drawImage(uraniumTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0));
          }
        } else {
          if (cell.raised) {
            ctx.drawImage(tileDark, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j);
          }
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0));
          if (cell.aoi) {
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0));
          }
          if (cell && cell.type === "uranium") {
            ctx.drawImage(uraniumTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0));
          }
        }
        // buildings
        if (cell.building) { // TODO: take offsets into account
          if (cell.building.commandCenter) {
            ctx.drawImage(ccTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET);
          } else if (cell.building.turret) {
            ctx.drawImage(turretTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET);
          } else if (cell.building.mine) {
            ctx.drawImage(mineTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET);
          }
        }
      }
    })
  })
};

const generateAoI = (step = 0, currentAoIScore = 4) => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {

    // neibourhood algorithm (step 0)
    if (step === 0) {
      if (cell?.building) {
        if (cell.building.commandCenter) {
          cell.aoiScore = cell.building.commandCenter.area;
        } else if (cell.building.turret) {
          cell.aoiScore = cell.building.turret.area;
        } else if (cell.building.mine) {
          cell.aoiScore = cell.building.mine.area;
        }
        cell.aoi = PLAYERS.HUMAN;
      }
    } else if (step >= 1 && cell && cell.aoiScore === currentAoIScore) {
      if (map[i][j - 1] && !map[i][j - 1]?.aoiScore) {
        map[i][j - 1].aoiScore = cell.aoiScore - 1;
        map[i][j - 1].aoi = cell.aoi;
      }
      if (map[i][j + 1] && !map[i][j + 1]?.aoiScore) {
        map[i][j + 1].aoiScore = cell.aoiScore - 1;
        map[i][j + 1].aoi = cell.aoi;
      }
      if (i > 0 && map[i - 1][j] && !map[i - 1][j]?.aoiScore) {
        map[i - 1][j].aoiScore = cell.aoiScore - 1;
        map[i - 1][j].aoi = cell.aoi;
      }
      if (i < MAP_WIDTH && map[i + 1][j] && !map[i + 1][j]?.aoiScore) {
        map[i + 1][j].aoiScore = cell.aoiScore - 1;
        map[i + 1][j].aoi = cell.aoi;
      }
      if (i % 2 === 0) {
        if (i > 0 && map[i - 1][j + 1] && !map[i - 1][j + 1]?.aoiScore) {
          map[i - 1][j + 1].aoiScore = cell.aoiScore - 1;
          map[i - 1][j + 1].aoi = cell.aoi;
        }
        if (i < MAP_WIDTH && map[i + 1] && map[i + 1][j + 1] && !map[i + 1][j + 1]?.aoiScore) {
          map[i + 1][j + 1].aoiScore = cell.aoiScore - 1;
          map[i + 1][j + 1].aoi = cell.aoi;
        }
      } else { // TRICK: in odd columns we move two hexes up the bottom tiles to compensate offset
        if (i > 0 && map[i - 1][j - 1] && !map[i - 1][j - 1]?.aoiScore) {
          map[i - 1][j - 1].aoiScore = cell.aoiScore - 1;
          map[i - 1][j - 1].aoi = cell.aoi;
        }
        if (i < MAP_WIDTH && map[i + 1][j - 1] && !map[i + 1][j - 1]?.aoiScore) {
          map[i + 1][j - 1].aoiScore = cell.aoiScore - 1;
          map[i + 1][j - 1].aoi = cell.aoi;
        }
      }
    }
    });
  });
  if (currentAoIScore > 1) {
    generateAoI(step + 1, step > 0 ? currentAoIScore - 1 : currentAoIScore);
  }
};

const generateMap = (width, height) => {
  // initialize map
  for (let i = 0; i < width; i++) {
    map.push(Array(height).fill("blank"));
  }
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      map[i][j] = {};
    });
  });

  // allocate uranium sources
  for (let i = 0; i < URANIUM_IN_MAP; i++) {
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = {
      type: "uranium"
    }
  }
  // allocate raised tiles // disable for now
  for (let i = 0; i < RAISED_TILES_IN_MAP; i++) {
    let cell = map[Math.floor(Math.random() * height)][Math.floor(Math.random() * width)];
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = { ...cell,
      raised: true,
    }
  }

  // allocate blank tiles
  for (let i = 0; i < BLANK_TILES; i++) {
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = undefined;
  }
  drawMap();
};

const gatherResources = () => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.mine) {
        uranium += URANIUM_INC;
      }
    });
  });
};

const gameLogic = () => {
  gatherResources();
};

const gameLoop = () => {
  if (loop % 60 === 0) {
    gameLogic();
  }
  drawMap();
  loop++;
  window.requestAnimationFrame(gameLoop);
};

const startCooldown = buildingName => {
  buildings[buildingName].cooldownRemaining = buildings[buildingName].cooldown;
  cooldownTimers[buildingName] = setInterval(() => {
    buildings[buildingName].cooldownRemaining -= 1;
    if (buildings[buildingName].cooldownRemaining === 0) {
      clearInterval(cooldownTimers[buildingName]);
    }
  }, 1000);
}

const build = buildingName => {
  if (uranium >= buildings[buildingName].cost && buildings[buildingName].cooldownRemaining === 0) {
    map[selectedTile[0]][selectedTile[1]].building = { [buildingName]: buildings[buildingName], createdAt: loop };
    uranium -= buildings[buildingName].cost;
    startCooldown(buildingName);
  }
}

const initInteraction = () => {
  document.addEventListener("keydown", ev => {
    switch (ev.keyCode) {
      // arrows
      case 37:
        selectedTile[0] = selectedTile[0] > 0 ? selectedTile[0] - 1 : 0;
      break;
      case 38:
        selectedTile[1] = selectedTile[1] > 0 ? selectedTile[1] - 1 : 0;
      break;
      case 39:
        selectedTile[0] = selectedTile[0] < MAP_WIDTH - 1 ? selectedTile[0] + 1 : MAP_WIDTH - 1;
      break;
      case 40:
        selectedTile[1] = selectedTile[1] < MAP_HEIGHT - 1 ? selectedTile[1] + 1 : MAP_HEIGHT - 1;
      break;
      case 49: // 1
        build("commandCenter");
        generateAoI();
      break;
      case 50: // 2
        if (map[selectedTile[0]][selectedTile[1]].aoi) {
          build("turret");
          generateAoI();
        }
      break;
      case 51: // 3
        if (map[selectedTile[0]][selectedTile[1]].aoi && map[selectedTile[0]][selectedTile[1]].type === "uranium") {
          build("mine");
          generateAoI();
        }
      break;
    }
  });
};

const initGame = () => {
  generateMap(MAP_WIDTH, MAP_HEIGHT);
  initInteraction();
  window.requestAnimationFrame(gameLoop);
};

window.addEventListener("load", () => {
  initGame();
})
