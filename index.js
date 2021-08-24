const HEX_SIZE = 48;
const VERT_HEX_OFFSET = 24;
const HORIZ_HEX_OFFSET = -10;
const HORIZ_MAP_OFFSET = 10;
const VERT_MAP_OFFSET = 40;
const HELIUM3_IN_MAP = 5;
// const MAX_HELIUM3_IN_MAP = 5; TODO: add max?
const RAISED_TILES_IN_MAP = 5;
const RAISED_OFFSET = -10;
const MOUNTAIN_TILES = 20;
const SEL_BRIGHTNESS_MIN = 80;
const SEL_BRIGHTNESS_MAX = 120;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 8;
const HELIUM3_INC = 10;

const map = [];
let loop = 0;
let selectedTile = [0, 0];
let helium3 = 500;
const cooldownTimers = {};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const tile = new Image(HEX_SIZE, HEX_SIZE);
tile.src = 'tile.png';
const tileDark = new Image(HEX_SIZE, HEX_SIZE);
tileDark.src = 'tile-dark.png';
const mountainTile = new Image(HEX_SIZE, HEX_SIZE);
mountainTile.src = 'mountain.png';
const helium3Tile = new Image(HEX_SIZE, HEX_SIZE);
helium3Tile.src = 'helium3.png';
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
const stars = [];

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

const drawStars = () => {
  let color = "white";
  stars.forEach(s => {
    ctx.fillStyle = color;
    color = color === "white" ? "gray" : "white";
    ctx.fillRect(s[0], s[1], 2, 2);
  });
};

const drawMap = () => {
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
          if (cell.type !== "mountain") {
            ctx.filter = `brightness(${selectionBrightness}%)`;
          } else {
            ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
          }
        } else {
          ctx.filter = "none";
        }
        if (i % 2 === 0) {
          if (cell.raised) {
            ctx.drawImage(tileDark, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          if (cell.aoi) {
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "helium3") {
            ctx.drawImage(helium3Tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "mountain") {
            ctx.drawImage(mountainTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
        } else {
          if (cell.raised) {
            ctx.drawImage(tileDark, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
          }
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          if (cell.aoi) {
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "helium3") {
            ctx.drawImage(helium3Tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "mountain") {
            ctx.drawImage(mountainTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
          }
        }
        // buildings
        if (cell.building) { // TODO: take offsets into account
          if (cell.building.commandCenter) {
            ctx.drawImage(ccTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          } else if (cell.building.turret) {
            ctx.drawImage(turretTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          } else if (cell.building.mine) {
            ctx.drawImage(mineTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
        }
      }
    })
  })
};

const drawUI = () => {
  const { cooldown: ccCooldown, cooldownRemaining: ccCooldownRemaining, cost: ccCost } = buildings.commandCenter;
  const { cooldown: turretCooldown, cooldownRemaining: turretCooldownRemaining, cost: turretCost } = buildings.turret;
  const { cooldown: mineCooldown, cooldownRemaining: mineCooldownRemaining, cost: mineCost } = buildings.mine;
  // cooldown
  ctx.fillStyle = "#333333";
  ctx.fillRect(100, 490, ((ccCooldown - ccCooldownRemaining) / ccCooldown) * 240 , 30);
  ctx.fillRect(100, 520, ((turretCooldown - turretCooldownRemaining) / turretCooldown) * 240 , 30);
  ctx.fillRect(100, 550, ((mineCooldown - mineCooldownRemaining) / mineCooldown) * 240 , 30);

  ctx.strokeStyle = "gray";
  ctx.fillStyle = "gray";
  // command center
  ctx.strokeRect(100, 490, 240, 30);
  ctx.fillRect(105, 495, 20, 20);
  // turret
  ctx.strokeRect(100, 520, 240, 30);
  ctx.fillRect(105, 525, 20, 20);
  // mine
  ctx.strokeRect(100, 550, 240, 30);
  ctx.fillRect(105, 555, 20, 20);
  // texts
  ctx.fillStyle = "black";
  ctx.font = "14px Arial";
  ctx.fillText("1", 110, 510);
  ctx.fillText("2", 110, 540);
  ctx.fillText("3", 110, 570);
  ctx.fillStyle = ccCooldownRemaining > 0 || helium3 < ccCost ? "gray" : "white";
  ctx.fillText(`Command Center (Cost: ${buildings.commandCenter.cost})`, 130, 510);
  ctx.fillStyle = turretCooldownRemaining > 0 || helium3 < turretCost ? "gray" : "white";
  ctx.fillText(`Turret (Cost: ${buildings.turret.cost})`, 130, 540);
  ctx.fillStyle = mineCooldownRemaining > 0 || helium3 < mineCost ? "gray" : "white";
  ctx.fillText(`Mine (Cost: ${buildings.mine.cost})`, 130, 570);

  // helium reserve
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`HELIUM-3: ${helium3}`, 600, 540);
}

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

const generateStarBackground = numberOfStars => {
    while (numberOfStars--) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      stars.push([x, y]);
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

  // allocate helium3 sources
  for (let i = 0; i < HELIUM3_IN_MAP; i++) {
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = {
      type: "helium3"
    }
  }
  // allocate raised tiles // disable for now
  for (let i = 0; i < RAISED_TILES_IN_MAP; i++) {
    let cell = map[Math.floor(Math.random() * height)][Math.floor(Math.random() * width)];
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = { ...cell,
      raised: true,
    }
  }

  // allocate mountain tiles
  for (let i = 0; i < MOUNTAIN_TILES; i++) {
    map[Math.floor(Math.random() * width)][Math.floor(Math.random() * height)] = {
      type: "mountain"
    };
  }
  drawMap();
};

const gatherResources = () => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.mine) {
        helium3 += HELIUM3_INC;
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
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawStars();
  drawMap();
  drawUI();
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
  if (helium3 >= buildings[buildingName].cost && buildings[buildingName].cooldownRemaining === 0) {
    map[selectedTile[0]][selectedTile[1]].building = { [buildingName]: buildings[buildingName], createdAt: loop };
    helium3 -= buildings[buildingName].cost;
    generateAoI();
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
        if (map[selectedTile[0]][selectedTile[1]].type !== "mountain") {
          build("commandCenter");
        }
      break;
      case 50: // 2
        if (map[selectedTile[0]][selectedTile[1]].aoi && map[selectedTile[0]][selectedTile[1]].type !== "mountain") {
          build("turret");
        }
      break;
      case 51: // 3
        if (map[selectedTile[0]][selectedTile[1]].aoi && map[selectedTile[0]][selectedTile[1]].type === "helium3") {
          build("mine");
        }
      break;
    }
  });
};

const initGame = () => {
  generateMap(MAP_WIDTH, MAP_HEIGHT);
  generateStarBackground(200);
  initInteraction();
  window.requestAnimationFrame(gameLoop);
};

window.addEventListener("load", () => {
  initGame();
})
