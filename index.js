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
const GAME_STATES = {
  RUNNING: 0,
  WIN: 1,
  LOSE: 2
};

const map = [];
let loop = 0;
let IAStepNumber = 0;
let selectedTile = [0, 0];
let helium3 = 5000; // TODO: use final value
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
let selectionBrightnessInc = 1;
const stars = [];
let buildButtonPressed;
let pristineMap = true;
let gameState = GAME_STATES.RUNNING;
let debuggingMode = true;

const PLAYERS = {
  HUMAN: 1,
  CPU: 2,
  SELECTION: 3
};

const DIRECTION = {
  LEFT: -1,
  SAME: 0,
  RIGHT: 1
}

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
    range: 6,
    damage: 20
  },
  mine: {
    hp: 100,
    area: 1,
    cost: 100,
    cooldown: 10,
    cooldownRemaining: 0,
  },
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
          if (cell.invalidSelection) {
            ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
          } else if (cell.type !== "mountain") {
            ctx.filter = `brightness(${selectionBrightness}%)`;
          } else {
            ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
          }
        } else if (cell.aoi === PLAYERS.SELECTION) {
          ctx.filter = `sepia(1) hue-rotate(40deg) saturate(200%)`;
        } else {
          ctx.filter = "none";
        }
        if (i % 2 === 0) {
          if (cell.raised) {
            ctx.drawImage(tileDark, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
          if (cell.aoi || cell.invalidSelection) {
            let lastFilter = ctx.filter;
            if (cell.aoi === PLAYERS.CPU) {
              ctx.filter = `sepia(1) hue-rotate(80deg) saturate(140%)`;
            }
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
            ctx.filter = lastFilter;
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
          if (cell.aoi || cell.invalidSelection) {
            let lastFilter = ctx.filter;
            if (cell.aoi === PLAYERS.CPU) {
              ctx.filter = `sepia(1) hue-rotate(80deg) saturate(120%)`;
            }
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + (cell.raised ? RAISED_OFFSET : 0) + VERT_MAP_OFFSET);
            ctx.filter = lastFilter;
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
            if (debuggingMode) {
              ctx.fillStyle = "black";
              ctx.font = "12px Arial";
              ctx.fillText(cell.building.commandCenter.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            }
          } else if (cell.building.turret) {
            ctx.drawImage(turretTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            if (debuggingMode) {
              ctx.fillStyle = "black";
              ctx.font = "12px Arial";
              ctx.fillText(cell.building.turret.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            }
          } else if (cell.building.mine) {
            ctx.drawImage(mineTile, HEX_SIZE * i + (hOffset * i), HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            if (debuggingMode) {
              ctx.fillStyle = "black";
              ctx.font = "12px Arial";
              ctx.fillText(cell.building.mine.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            }
          }
        }
      }
    })
  })
};

const drawUI = () => {
  if (gameState === GAME_STATES.RUNNING) {
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
  } else if (gameState === GAME_STATES.WIN) {
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("YOU WIN!", 110, 510);
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to restart the game", 310, 510);
  } else if (gameState === GAME_STATES.LOSE) {
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("YOU LOSE!", 110, 510);
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to restart the game", 310, 510);
  }
}

const resetAoI = () => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (!cell.building) {
        cell.aoi = undefined;
        cell.aoiScore = 0;
      }
    });
  });
};

const generateAoI = (step = 0, currentAoIScore = 4) => {
  // clear AoI
  if (step === 0) {
    map.forEach((col, i) => {
      col.forEach((cell, j) => {
        if (cell.aoi === PLAYERS.SELECTION) {
          cell.aoi = undefined;
          cell.aoiScore = undefined;
        }
        if (cell.building?.placeholder) {
          cell.building = undefined;
        }
      })
    });
  }

  // console.log(pristineMap, map[selectedTile[0]][selectedTile[1]].aoi);
  if (!map[selectedTile[0]][selectedTile[1]].aoi && buildButtonPressed && !pristineMap) {
      map[selectedTile[0]][selectedTile[1]].invalidSelection = true;
    return;
  }


  if (!map[selectedTile[0]][selectedTile[1]].building) {
    if (buildButtonPressed === "1") {
        map[selectedTile[0]][selectedTile[1]].building = { placeholder: { type: "placeholder", area: buildings.commandCenter.area } };
    } else if (buildButtonPressed === "2") {
      map[selectedTile[0]][selectedTile[1]].building = { placeholder: { type: "placeholder", area: buildings.turret.area } };
    } else if (buildButtonPressed === "3") {
      map[selectedTile[0]][selectedTile[1]].building = { placeholder: { type: "placeholder", area: buildings.mine.area } };
    }
  }

  map.forEach((col, i) => {
    col.forEach((cell, j) => {
    // neibourhood algorithm (step 0)
    if (step === 0) {
      if (cell?.building) {
        // cell.aoi = player;
        if (cell.building.commandCenter) {
          cell.aoiScore = cell.building.commandCenter.area;
        } else if (cell.building.turret) {
          cell.aoiScore = cell.building.turret.area;
        } else if (cell.building.mine) {
          cell.aoiScore = cell.building.mine.area;
        } else if (cell.building.placeholder) {
          cell.aoiScore = cell.building.placeholder.area;
          cell.aoi = PLAYERS.SELECTION;
        }
      }
    } else if (step >= 1 && cell && cell.aoiScore === currentAoIScore) {
      if (map[i][j - 1] && !map[i][j - 1]?.aoiScore && !map[i][j - 1]?.aoi) {
        map[i][j - 1].aoiScore = cell.aoiScore - 1;
        map[i][j - 1].aoi = cell.aoi;
      }
      if (map[i][j + 1] && !map[i][j + 1]?.aoiScore && !map[i][j + 1]?.aoi) {
        map[i][j + 1].aoiScore = cell.aoiScore - 1;
        map[i][j + 1].aoi = cell.aoi;
      }
      if (i > 0 && map[i - 1][j] && !map[i - 1][j]?.aoiScore && !map[i - 1][j]?.aoi) {
        map[i - 1][j].aoiScore = cell.aoiScore - 1;
        map[i - 1][j].aoi = cell.aoi;
      }
      if (i < MAP_WIDTH && map[i + 1][j] && !map[i + 1][j]?.aoiScore && !map[i + 1][j]?.aoi) {
        map[i + 1][j].aoiScore = cell.aoiScore - 1;
        map[i + 1][j].aoi = cell.aoi;
      }
      if (i % 2 === 0) {
        if (i > 0 && map[i - 1][j + 1] && !map[i - 1][j + 1]?.aoiScore && !map[i - 1][j + 1]?.aoi) {
          map[i - 1][j + 1].aoiScore = cell.aoiScore - 1;
          map[i - 1][j + 1].aoi = cell.aoi;
        }
        if (i < MAP_WIDTH && map[i + 1] && map[i + 1][j + 1] && !map[i + 1][j + 1]?.aoiScore && !map[i + 1][j + 1]?.aoi) {
          map[i + 1][j + 1].aoiScore = cell.aoiScore - 1;
          map[i + 1][j + 1].aoi = cell.aoi;
        }
      } else { // TRICK: in odd columns we move two hexes up the bottom tiles to compensate offset
        if (i > 0 && map[i - 1][j - 1] && !map[i - 1][j - 1]?.aoiScore && !map[i - 1][j - 1]?.aoi) {
          map[i - 1][j - 1].aoiScore = cell.aoiScore - 1;
          map[i - 1][j - 1].aoi = cell.aoi;
        }
        if (i < MAP_WIDTH && map[i + 1][j - 1] && !map[i + 1][j - 1]?.aoiScore && !map[i + 1][j - 1]?.aoi) {
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

const findAvailableCellOfType = type => {
  let cellFound;
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (!cellFound && cell?.type === type && !cell?.building && (!cell?.aoi || cell?.aoi === PLAYERS.CPU)) {
        cellFound = { cell, x: i, y: j };
      }
    });
  });
  return cellFound;
};

const findHelium3Sources = () => {
  const sources = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.type === "helium3") {
        sources.push({ cell, x: i, y: j });
      }
    });
  });
  return sources;
}

const findAllCommandCenters = () => {
  const commandCenters = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.commandCenter) {
        commandCenters.push({ cell, x: i, y: j });
      }
    });
  });
  return commandCenters;
}

const findAllTurrets = () => {
  const turrets = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.turret) {
        turrets.push({ cell, x: i, y: j });
      }
    });
  });
  return turrets;
}

const findAllMines = () => {
  const mines = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.mine) {
        mines.push({ cell, x: i, y: j });
      }
    });
  });
  return mines;
}


const findOwnCells = player => {
  const tiles = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.aoi === player) {
        tiles.push({ cell, x: i, y: j });
      }
    });
  });
  return tiles;
}

const getEnemyDirection = () => {
  let enemyDirection;
  let enemyCC;
  let ownCC;
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.aoi === PLAYERS.HUMAN && cell?.building?.commandCenter) {
        enemyCC = { cell, x: i, y: j };
      } else if (cell?.aoi === PLAYERS.CPU && cell?.building?.commandCenter) {
        ownCC = { cell, x: i, y: j };
      }
    });
  });
  if (enemyCC) {
    if (ownCC.x < enemyCC.x) {
      enemyDirection = DIRECTION.RIGHT;
    } else if (ownCC.x === enemyCC.x) {
      enemyDirection = DIRECTION.SAME;
    } else {
      enemyDirection = DIRECTION.LEFT;
    }
  } else {
    enemyDirection = null;
  }
  return enemyDirection;
}

const getCC = () => {
  let cc;
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.aoi === PLAYERS.CPU && cell?.building?.commandCenter) {
        cc = { cell, x: i, y: j };
      }
    });
  });
  return cc;
}

const FSM = {
  state: "INIT",
  transitions: {
    INIT: {
      createCC() {
        // console.log("CREATE_CC");
        const mine = findAvailableCellOfType("helium3");
        map[mine.x + 1][mine.y].building = { commandCenter: { ...buildings.commandCenter }, createdAt: loop };
        map[mine.x + 1][mine.y].aoi = PLAYERS.CPU;
        // map[mine.x + 1][mine.y].aoiScore = buildings.commandCenter.area;
        // console.log("mine", mine);
        this.state = "CREATE_CC";
      }
    },
    CREATE_CC: {
      createMine() {
        const mine = findAvailableCellOfType("helium3");
        map[mine.x][mine.y].building = { mine: { ...buildings.mine }, createdAt: loop };
        map[mine.x][mine.y].aoi = PLAYERS.CPU;
        // map[mine.x][mine.y].aoiScore = buildings.mine.area;
        // console.log("CREATE_MINE");
        this.state = "CREATE_MINE";
      }
    },
    CREATE_MINE: {
      nextMine() {
        const heliumSources = findHelium3Sources();
        // console.log("helium", heliumSources);
        const ownAvailableSources = heliumSources.filter(h => h.cell.aoi === PLAYERS.CPU && !h.cell.building);
        // console.log("ownAvailableSources", ownAvailableSources);
        // if mine is near
        if (ownAvailableSources.length > 0) {
          map[ownAvailableSources[0].x][ownAvailableSources[0].y].building = { mine: { ...buildings.mine }, createdAt: loop };
          map[ownAvailableSources[0].x][ownAvailableSources[0].y].aoi = PLAYERS.CPU;
          this.state = "CREATE_MINE";
        } else { // if not
          this.state = "LOCATE_ENEMY_CC";
        }
      }
    },
    LOCATE_ENEMY_CC: {
      createTurret() {
        // get own tiles
        const ownCells = findOwnCells(PLAYERS.CPU);
        // locate enemy CC direction
        const direction = getEnemyDirection();
        // build turret
        const cc = getCC();
        if (direction === DIRECTION.LEFT) {
          let processingRandomPos = true;
          const leftCells = ownCells.filter(t => t.x < cc.x);
          while(processingRandomPos) {
            const cell = leftCells[Math.floor(Math.random() * leftCells.length)];
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              processingRandomPos = false;
            }
          }
        } else if (direction === DIRECTION.SAME || direction === DIRECTION.RIGHT) { // consider same + right for simplicity
          let processingRandomPos = true;
          const rightCells = ownCells.filter(t => t.x > cc.x || t.x === cc.x);
          while(processingRandomPos) {
            const cell = rightCells[Math.floor(Math.random() * rightCells.length)];
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              processingRandomPos = false;
            }
          }
        } else {
          let processingRandomPos = true;
          while(processingRandomPos) {
            const cell = ownCells[Math.floor(Math.random() * ownCells.length)];
            // console.log("cell", cell);
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              processingRandomPos = false;
            }
          }
        }
        this.state = "CREATE_MINE";
      }
    }
  },
  dispatch(actionName) {
    const action = this.transitions[this.state][actionName];
     if (action) {
         action.call(this);
     } else {
         // console.log('invalid action');
     }
  }
};

const IAStep = () => {
  IAStepNumber += 1;
  if (IAStepNumber % 3 === 0) {
    // console.log("IA step", FSM.state);
    if (FSM.state === "INIT") {
      FSM.dispatch("createCC");
      generateAoI();
    } else if (FSM.state === "CREATE_CC") {
      FSM.dispatch("createMine");
      generateAoI();
    } else if (FSM.state === "CREATE_MINE") {
      FSM.dispatch("nextMine");
      generateAoI();
    } else if (FSM.state === "LOCATE_ENEMY_CC") {
      FSM.dispatch("createTurret");
      generateAoI();
    }
  }
};

const turretAttack = () => {
  const ccs = findAllCommandCenters();
  const turrets = findAllTurrets();
  const mines = findAllMines();
  const all = turrets.concat(mines).concat(ccs);
  // console.log("turrets", turrets);
  let attacked = false;
  // calculate distance with every other building
  turrets.forEach((t, i) => {
    attacked = false;
    all.forEach((t2, j) => {
      if (!attacked) {
        const dist = Math.sqrt(Math.pow((t2.x - t.x), 2) + Math.pow((t2.y - t.y), 2));
        if (dist > 0 && dist < buildings.turret.range && t.cell.aoi !== t2.cell.aoi) {
          // console.log("dist", dist);
          // console.log("t2", t2, "t", t);
          if (t2.cell.building?.turret) {
            if (t2.cell.building?.turret && t.cell.building?.turret) {
              t2.cell.building.turret.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.turret?.hp <= 0) {
              destroy(t2);
            }
          } else if (t2.cell.building?.mine) {
            if (t2.cell.building?.mine && t.cell.building?.turret) {
              t2.cell.building.mine.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.mine?.hp <= 0) {
              destroy(t2);
            }
          } else if (t2.cell.building?.commandCenter) {
            if (t2.cell.building?.commandCenter && t.cell.building?.turret) {
              t2.cell.building.commandCenter.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.commandCenter?.hp <= 0) {
              destroy(t2);
            }
          }
          attacked = true;
        }
      }
    });
  });
};

const checkWinLoseConditions = () => {
  if (!pristineMap) {
    const ccs = findAllCommandCenters();
    console.log(ccs);
    if (!ccs.find(cc => cc.cell.aoi === PLAYERS.CPU)) { // you destroyed enemy CCs, you win
      gameState = GAME_STATES.WIN;
    } else if (!ccs.find(cc => cc.cell.aoi === PLAYERS.HUMAN)) { // all your CCs were destroyed, you lose
      gameState = GAME_STATES.LOSE;
    }
  }
};

const gameLogic = () => {
  gatherResources();
  IAStep();
  turretAttack();
  checkWinLoseConditions();
};

const gameLoop = () => {
  if (loop % 60 === 0 && gameState === GAME_STATES.RUNNING) {
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
    map[selectedTile[0]][selectedTile[1]].building = { [buildingName]: { ...buildings[buildingName] }, createdAt: loop };
    map[selectedTile[0]][selectedTile[1]].aoi = PLAYERS.HUMAN;
    helium3 -= buildings[buildingName].cost;
    generateAoI();
    startCooldown(buildingName);
  }
}

const destroy = cell => {
  // console.log("cell", cell);
  cell.cell.aoi = null;
  cell.cell.building = null;
  resetAoI();
  generateAoI();
}

const initInteraction = () => {
  document.addEventListener("keydown", ev => {
    // console.log(ev.keyCode);
    if (gameState === GAME_STATES.RUNNING) {
      switch (ev.keyCode) {
        // arrows
        case 37:
        selectedTile[0] = selectedTile[0] > 0 ? selectedTile[0] - 1 : 0;
        buildButtonPressed = undefined;
        break;
        case 38:
        selectedTile[1] = selectedTile[1] > 0 ? selectedTile[1] - 1 : 0;
        buildButtonPressed = undefined;
        break;
        case 39:
        selectedTile[0] = selectedTile[0] < MAP_WIDTH - 1 ? selectedTile[0] + 1 : MAP_WIDTH - 1;
        buildButtonPressed = undefined;
        break;
        case 40:
        selectedTile[1] = selectedTile[1] < MAP_HEIGHT - 1 ? selectedTile[1] + 1 : MAP_HEIGHT - 1;
        buildButtonPressed = undefined;
        break;
        case 49: // 1
        if ((map[selectedTile[0]][selectedTile[1]].aoi || !map[selectedTile[0]][selectedTile[1]].aoi && pristineMap) && map[selectedTile[0]][selectedTile[1]].type !== "mountain") {
          if (buildButtonPressed === "1") {
            buildButtonPressed = undefined;
            pristineMap = false;
            build("commandCenter");
          } else {
            buildButtonPressed = "1";
          }
        }
        break;
        case 50: // 2
        if (map[selectedTile[0]][selectedTile[1]].aoi && map[selectedTile[0]][selectedTile[1]].type !== "mountain") {
          if (buildButtonPressed === "2") {
            buildButtonPressed = undefined;
            pristineMap = false;
            build("turret");
          } else {
            buildButtonPressed = "2";
          }
        }
        break;
        case 51: // 3
        if (map[selectedTile[0]][selectedTile[1]].aoi && map[selectedTile[0]][selectedTile[1]].type === "helium3") {
          if (buildButtonPressed === "3") {
            buildButtonPressed = undefined;
            pristineMap = false;
            build("mine");
          } else {
            buildButtonPressed = "3";
          }
        }
        break;
        case 27: // ESC
        buildButtonPressed = undefined;
        break;
        case 68: // "d" for debuggin
        debuggingMode = !debuggingMode;
        break;
      }
    } else if (ev.key === "Enter") {
      location.reload(); // reload the game the good old way :)
    }
    generateAoI();
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
