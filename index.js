const HEX_SIZE = 46;
const VERT_HEX_OFFSET = 24;
const HORIZ_HEX_OFFSET = -10;
const HORIZ_MAP_OFFSET = 30;
const VERT_MAP_OFFSET = 40;
const BUILDING_OFFSET = 40;
const HELIUM3_IN_MAP = 6;
const MOUNTAIN_TILES = 20;
const SEL_BRIGHTNESS_MIN = 80;
const SEL_BRIGHTNESS_MAX = 120;
const MAP_WIDTH = 20;
const MAP_HEIGHT = 8;
const HELIUM3_INC = 10;
const LANDING_OFFSET = -100;
const STATES = { // GAME STATES
  TITLE: 0,
  RUNNING: 1,
  WIN: 2,
  LOSE: 3
};
const DIFFICULTY = {
  EASY: 4,
  DIFFICULT: 3,
  EXTREME: 2
};

const map = [];
let loop = 0;
let AIStepNumber = 0;
let selCell = [0, 0];
let helium3 = 1000;
const cooldownTimers = {};
let incrementalId = 0; // for generating building id

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const loadAsset = file => {
  const asset = new Image(HEX_SIZE, HEX_SIZE);
  asset.src = `assets/graphics/${file}`;
  return asset;
};

// load graphics
const tile = loadAsset("tile.png");
const mountainTile = loadAsset("mountains.png");
const helium3Tile = loadAsset("helium3.png");
const ccTile = loadAsset("command-center.png");
const refineryTile = loadAsset("refinery.png");
const turretTile = loadAsset("turret.png");
const podTile = loadAsset("pod.png");
const ccTileCpu = loadAsset("command-center-cpu.png");
const refineryTileCpu = loadAsset("refinery-cpu.png");
const turretTileCpu = loadAsset("turret-cpu.png");
const podTileCpu = loadAsset("pod-cpu.png");
const aoiTile = loadAsset("aoi-human.png");

let hOffset = 0;
let selectionBrightness = SEL_BRIGHTNESS_MIN;
let selectionBrightnessInc = 1;
const stars = [];
let buildBtnPressed;
let pristineMap = true;
let state = STATES.TITLE;
let difficulty;
let particleSystems = []; // fire, smoke..
let selectedCellInfo = "";
let debuggingMode = false;

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

// buildings collection (used as template for creating new buildings)
const buildings = {
  cc: {
    id: undefined,
    area: 4, // Area Of Influence generated
    cooldown: 30,
    cooldownRemaining: 0,
    cost: 300,
    hp: 500,
    totalHP: 500
  },
  turret: {
    id: undefined,
    area: 2,
    cooldown: 5,
    cooldownRemaining: 0,
    cost: 200,
    damage: 20,
    hp: 200,
    range: 6,
    totalHP: 200
  },
  refinery: {
    id: undefined,
    area: 1,
    cooldown: 10,
    cooldownRemaining: 0,
    cost: 100,
    hp: 100,
    totalHP: 100
  },
};

const startParticleSystem = (id, initX, initY, color = {r: 255, g: 255, b: 255}, direction = "up", options = {}) => {
  const particles = [];
  const initTtl = options.initTtl || 50;
  const initSize = options.initSize || 6;
  const maxParticles = options.maxParticles || 10;
  const speed = options.speed || 1;
  const once = options.once || false;
  particles.push({
    x: initX + Math.random() * 10,
    y: initY,
    ttl: initTtl,
    opacity: 1,
    size: initSize
  });
  particleSystems.push({
    init: {
      color,
      direction,
      id,
      initX,
      initY,
      initTtl,
      initSize,
      maxParticles,
      once,
      speed
    },
    particles
  });
};

const updateParticleSystems = () => {
  if (state === STATES.RUNNING || state === STATES.TITLE) {
    particleSystems.forEach(system => {
      const { initX, initY, initTtl, initSize, maxParticles, color, direction, speed, once } = system.init;
      system.particles.forEach((p, index) => {
        if (!p.dead) {
          let { x, y, size } = p;
          ctx.clearRect(x, y, size, size);
          let newP = { ...p };
          ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${newP.opacity})`;
          ctx.fillRect(x, y, size, size);
          newP.ttl -= 1;
          if (newP.ttl > 0) {
            if (direction === "up") {
              newP.x += Math.random()*2 - 1;
              newP.y -= speed;
            } else if (direction === "down") {
              newP.x += Math.random()*2 - 1;
              newP.y -= -speed;
            } else if (direction === "left") {
              newP.x += -speed;
              newP.y -= Math.random()*2 - 1;
            } else if (direction === "right") {
              newP.x += speed;
              newP.y -= Math.random()*2 - 1;
            } else if (direction === "up left") {
              newP.x -= speed/2;
              newP.y -= speed/2;
            } else if (direction === "up right") {
              newP.x += speed/2;
              newP.y -= speed/2;
            } else if (direction === "down left") {
              newP.x -= speed/2;
              newP.y += speed/2;
            } else if (direction === "down right") {
              newP.x += speed/2;
              newP.y += speed/2;
            }
            newP.opacity -= 1/initTtl;
            newP.size -= initSize/initTtl;
          } else if (once) {
            newP.opacity = 0;
            newP.dead = true;
          } else {
            newP.x = initX;
            newP.y = initY;
            newP.ttl = initTtl + Math.floor(Math.random()*20);
            newP.opacity = 1;
            newP.size = initSize;
          }
          system.particles[index] = newP;
        }
      });
      if (system.particles.length < maxParticles) {
        system.particles.push({
          x: initX + Math.random() * 10,
          y: initY,
          opacity: 1,
          size: 5
        });
      }
    });
  }
};

const purgeEndedParticleSystems = () => {
  particleSystems = particleSystems.filter(system => !system.ended);
}

const drawStars = () => {
  let color = "white";
  stars.forEach(s => {
    ctx.fillStyle = color;
    color = color === "white" ? "gray" : "white";
    ctx.fillRect(s[0], s[1], 2, 2);
  });
};

const drawHP = (cx, cy, hOffset, hpPercentage, isEvenColumn) => {
  ctx.fillStyle = "black";
  ctx.fillRect(HEX_SIZE * cx + (hOffset * cx) + BUILDING_OFFSET, HEX_SIZE * cy + (isEvenColumn ? VERT_HEX_OFFSET : 0) + VERT_MAP_OFFSET, 32, 4);
  ctx.fillStyle = "lime";
  ctx.fillRect(HEX_SIZE * cx + (hOffset * cx) + BUILDING_OFFSET, HEX_SIZE * cy + (isEvenColumn ? VERT_HEX_OFFSET : 0) + VERT_MAP_OFFSET, hpPercentage * 32, 4);
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
        if (i === selCell[0] && j === selCell[1]) {
          if (cell.invalidSelection) {
            ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
          } else if (cell.type !== "mountain" && cell.aoi !== PLAYERS.CPU) {
            ctx.filter = `brightness(${selectionBrightness}%)`;
          } else {
            ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
          }
        } else if (cell.aoi === PLAYERS.SELECTION) {
          ctx.filter = `sepia(1) hue-rotate(40deg) saturate(200%)`;
        } else if (cell.targeted) {
          ctx.filter = `sepia(1) hue-rotate(-40deg) saturate(200%)`;
        } else {
          ctx.filter = "none";
        }
        if (i % 2 === 0) {
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          if (cell.aoi || cell.invalidSelection) {
            let lastFilter = ctx.filter;
            if (cell.aoi === PLAYERS.CPU) {
              ctx.filter = `sepia(1) hue-rotate(0deg) saturate(140%)`;
            }
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
            ctx.filter = lastFilter;
          }
          if (cell && cell.type === "helium3") {
            ctx.drawImage(helium3Tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "mountain") {
            ctx.drawImage(mountainTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
          }
        } else {
          ctx.drawImage(tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
          if (cell.aoi || cell.invalidSelection) {
            let lastFilter = ctx.filter;
            if (cell.aoi === PLAYERS.CPU) {
              ctx.filter = `sepia(1) hue-rotate(0deg) saturate(120%)`;
            }
            ctx.drawImage(aoiTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
            ctx.filter = lastFilter;
          }
          if (cell && cell.type === "helium3") {
            ctx.drawImage(helium3Tile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
          }
          if (cell && cell.type === "mountain") {
            ctx.drawImage(mountainTile, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
          }

        }
        // buildings
        if (cell.building) {
          if (cell.landingProgress < 100) {
            ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? podTile : podTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET + (LANDING_OFFSET + cell.landingProgress));
          } else {
            if (cell.building.cc) {
              if (i % 2 === 0) {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? ccTile : ccTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
                if (cell.building.cc.hp < cell.building.cc.totalHP) {
                  drawHP(i, j, hOffset, cell.building.cc.hp/cell.building.cc.totalHP, true);
                }
              } else {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? ccTile : ccTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
                if (cell.building.cc.hp < cell.building.cc.totalHP) {
                  drawHP(i, j, hOffset, cell.building.cc.hp/cell.building.cc.totalHP, false);
                }
              }
              if (debuggingMode) {
                ctx.fillStyle = "black";
                ctx.font = "12px Arial";
                ctx.fillText(cell.building.cc.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
              }
            } else if (cell.building.turret) {
              if (i % 2 === 0) {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? turretTile : turretTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
                if (cell.building.turret.hp < cell.building.turret.totalHP) {
                  drawHP(i, j, hOffset, cell.building.turret.hp/cell.building.turret.totalHP, true);
                }
              } else {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? turretTile : turretTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
                if (cell.building.turret.hp < cell.building.turret.totalHP) {
                  drawHP(i, j, hOffset, cell.building.turret.hp/cell.building.turret.totalHP, false);
                }
              }
              if (debuggingMode) {
                ctx.fillStyle = "black";
                ctx.font = "12px Arial";
                ctx.fillText(cell.building.turret.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
              }
            } else if (cell.building.refinery) {
              if (i % 2 === 0) {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? refineryTile : refineryTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
                if (cell.building.refinery.hp < cell.building.refinery.totalHP) {
                  drawHP(i, j, hOffset, cell.building.refinery.hp/cell.building.refinery.totalHP, true);
                }
              } else {
                ctx.drawImage(cell.aoi === PLAYERS.HUMAN ? refineryTile : refineryTileCpu, HEX_SIZE * i + (hOffset * i) + BUILDING_OFFSET, HEX_SIZE * j + VERT_MAP_OFFSET);
                if (cell.building.refinery.hp < cell.building.refinery.totalHP) {
                  drawHP(i, j, hOffset, cell.building.refinery.hp/cell.building.refinery.totalHP, false);
                }
              }
              if (debuggingMode) {
                ctx.fillStyle = "black";
                ctx.font = "12px Arial";
                ctx.fillText(cell.building.refinery.hp, HEX_SIZE * i + (hOffset * i) + HORIZ_MAP_OFFSET, HEX_SIZE * j + VERT_HEX_OFFSET + VERT_MAP_OFFSET);
              }
            }
          }
        }
      }
    })
  })
};

const canBuild = buildingName => {
    switch (buildingName) {
      case "cc":
        return helium3 > buildings.cc.cost;
      case "turret":
        return helium3 > buildings.turret.cost;
      case "refinery":
        return helium3 > buildings.refinery.cost;
      default:
        return false;
    }
};

const drawUI = () => {
  if (state === STATES.RUNNING) {
    const baseX = 60;
    const { cooldown: ccCooldown, cooldownRemaining: ccCooldownRemaining, cost: ccCost } = buildings.cc;
    const { cooldown: turretCooldown, cooldownRemaining: turretCooldownRemaining, cost: turretCost } = buildings.turret;
    const { cooldown: refineryCooldown, cooldownRemaining: refineryCooldownRemaining, cost: refineryCost } = buildings.refinery;
    // cooldown
    ctx.fillStyle = "#333333";
    ctx.fillRect(baseX, 490, ((ccCooldown - ccCooldownRemaining) / ccCooldown) * 240 , 30);
    ctx.fillRect(baseX, 520, ((turretCooldown - turretCooldownRemaining) / turretCooldown) * 240 , 30);
    ctx.fillRect(baseX, 550, ((refineryCooldown - refineryCooldownRemaining) / refineryCooldown) * 240 , 30);

    ctx.strokeStyle = "gray";
    // command center
    ctx.strokeRect(baseX, 490, 240, 30);
    ctx.fillStyle = buildBtnPressed === "1" && canBuild("cc") ? "#77aa33" : "gray";
    ctx.fillRect(baseX + 5, 495, 20, 20);
    // turret
    ctx.strokeRect(baseX, 520, 240, 30);
    ctx.fillStyle = buildBtnPressed === "2" && canBuild("turret") ? "#77aa33" : "gray";
    ctx.fillRect(baseX + 5, 525, 20, 20);
    // refinery
    ctx.strokeRect(baseX, 550, 240, 30);
    ctx.fillStyle = buildBtnPressed === "3" && canBuild("refinery") ? "#77aa33" : "gray";
    ctx.fillRect(baseX + 5, 555, 20, 20);
    // texts
    ctx.fillStyle = "black";
    ctx.font = "14px Arial";
    ctx.fillText("1", baseX + 10, 510);
    ctx.fillText("2", baseX + 10, 540);
    ctx.fillText("3", baseX + 10, 570);
    ctx.fillStyle = ccCooldownRemaining > 0 || helium3 < ccCost ? "gray" : "white";
    ctx.fillText(`Command Center (Cost: ${buildings.cc.cost})`, baseX + 30, 510);
    ctx.fillStyle = turretCooldownRemaining > 0 || helium3 < turretCost ? "gray" : "white";
    ctx.fillText(`Turret (Cost: ${buildings.turret.cost})`, baseX + 30, 540);
    ctx.fillStyle = refineryCooldownRemaining > 0 || helium3 < refineryCost ? "gray" : "white";
    ctx.fillText(`Mine (Cost: ${buildings.refinery.cost})`, baseX + 30, 570);
    // confirmation messages
    const msg = "Press again to confirm";
    if (buildBtnPressed === "1" && canBuild("cc")) {
      ctx.fillText(msg, baseX + 250, 510);
    } else if (buildBtnPressed === "2" && canBuild("turret")) {
      ctx.fillText(msg, baseX + 250, 540);
    } else if (buildBtnPressed === "3" && canBuild("refinery")) {
      ctx.fillText(msg, baseX + 250, 570);
    }
    // helium reserve
    ctx.fillStyle = "white";
    ctx.font = "20px Arial";
    ctx.fillText(`HELIUM-3: ${helium3}`, 600, 580);
    // tile info
    if (selectedCellInfo) {
      ctx.fillStyle = "gray";
      ctx.fillRect(600, 450, 150, 80);
      ctx.fillStyle = "#333333";
      ctx.fillRect(605, 455, 140, 70);
      ctx.fillStyle = "white";
      ctx.font = "14px Arial";
      ctx.fillText(selectedCellInfo, 630, 500);
    }

  } else if (state === STATES.WIN) {
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.fillText("YOU WIN!", 110, 510);
    ctx.font = "14px Arial";
    ctx.fillText("Press Enter to restart the game", 310, 510);
  } else if (state === STATES.LOSE) {
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

  if (!map[selCell[0]][selCell[1]].aoi && buildBtnPressed && !pristineMap) {
      map[selCell[0]][selCell[1]].invalidSelection = true;
    return;
  }

  if (!map[selCell[0]][selCell[1]].building) {
    if (buildBtnPressed === "1") {
        map[selCell[0]][selCell[1]].building = { placeholder: { type: "placeholder", area: buildings.cc.area } };
    } else if (buildBtnPressed === "2") {
      map[selCell[0]][selCell[1]].building = { placeholder: { type: "placeholder", area: buildings.turret.area } };
    } else if (buildBtnPressed === "3") {
      map[selCell[0]][selCell[1]].building = { placeholder: { type: "placeholder", area: buildings.refinery.area } };
    }
  }

  map.forEach((col, i) => {
    col.forEach((cell, j) => {
    // neibourhood algorithm (step 0)
    if (step === 0) {
      if (cell?.building) {
        // cell.aoi = player;
        if (cell.building.cc) {
          cell.aoiScore = cell.building.cc.area;
        } else if (cell.building.turret) {
          cell.aoiScore = cell.building.turret.area;
        } else if (cell.building.refinery) {
          cell.aoiScore = cell.building.refinery.area;
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
      if (i < MAP_WIDTH && map[i + 1] && map[i + 1][j] && !map[i + 1][j]?.aoiScore && !map[i + 1][j]?.aoi) {
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
        if (i < MAP_WIDTH && map[i + 1] && map[i + 1][j - 1] && !map[i + 1][j - 1]?.aoiScore && !map[i + 1][j - 1]?.aoi) {
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

const clearTurretRangePreview = () => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell.targeted) {
        delete(cell.targeted);
      }
    });
  });
};

const generateTurretRangePreview = (cx, cy) => {
  const ccs = findAllCommandCenters();
  const refineries = findAllMines();
  const turrets = findAllTurrets();
  const all = turrets.concat(refineries).concat(ccs);
  const t = map[cx][cy];
  // calculate distance with every other building
  all.forEach((t2, j) => {
    const dist = Math.sqrt(Math.pow((t2.x - cx), 2) + Math.pow((t2.y - cy), 2));
    if (dist > 0 && dist < buildings.turret.range && t.aoi !== t2.cell.aoi) {
      t2.cell.targeted = true
    }
  });
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
      if (cell?.building?.refinery && cell.aoi === PLAYERS.HUMAN) {
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
      if (cell?.building?.cc) {
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
  const refineries = [];
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell?.building?.refinery) {
        refineries.push({ cell, x: i, y: j });
      }
    });
  });
  return refineries;
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
      if (cell?.aoi === PLAYERS.HUMAN && cell?.building?.cc) {
        enemyCC = { cell, x: i, y: j };
      } else if (cell?.aoi === PLAYERS.CPU && cell?.building?.cc) {
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
      if (cell?.aoi === PLAYERS.CPU && cell?.building?.cc) {
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
        const refinery = findAvailableCellOfType("helium3");
        const cell = map[refinery.x + 1][refinery.y];
        cell.building = { cc: { ...buildings.cc }, createdAt: loop };
        cell.building.id = getNewId();
        cell.aoi = PLAYERS.CPU;
        cell.landingProgress = 0;
        setTimeout(() => {
          const cellPos = getCellCoordinates(refinery.x + 1, refinery.y);
          startParticleSystem(map[refinery.x + 1][refinery.y].building.id, cellPos[0] + 5, cellPos[1] + 10, { r: 220, g: 200, b: 0}, "down", { initTtl: 20, once: true, speed: 0.5, maxParticles: 30 });
        }, 900);
        this.state = "CREATE_CC";
      }
    },
    CREATE_CC: {
      createMine() {
        const refinery = findAvailableCellOfType("helium3");
        const cell = map[refinery.x][refinery.y];
        cell.building = { refinery: { ...buildings.refinery }, createdAt: loop };
        cell.building.id = getNewId();
        cell.aoi = PLAYERS.CPU;
        cell.landingProgress = 0;
        setTimeout(() => {
          const cellPos = getCellCoordinates(refinery.x + 1, refinery.y);
          startParticleSystem(map[refinery.x][refinery.y].building.id, cellPos[0] + 5, cellPos[1] + 10, { r: 220, g: 200, b: 0}, "down", { initTtl: 20, once: true, speed: 0.5, maxParticles: 30 });
        }, 900);
        const cellPos = getCellCoordinates(refinery.x, refinery.y);
        startParticleSystem(map[refinery.x][refinery.y].building.id, cellPos[0] + 17, cellPos[1], { r: 0, g: 255, b: 0}, "up", { speed: 0.3 });
        this.state = "CREATE_MINE";
      }
    },
    CREATE_MINE: {
      nextMine() {
        const heliumSources = findHelium3Sources();
        const ownAvailableSources = heliumSources.filter(h => h.cell.aoi === PLAYERS.CPU && !h.cell.building);
        // if refinery is near
        if (ownAvailableSources.length > 0) {
          const cell = map[ownAvailableSources[0].x][ownAvailableSources[0].y];
          cell.building = { refinery: { ...buildings.refinery }, createdAt: loop };
          cell.building.id = getNewId();
          cell.aoi = PLAYERS.CPU;
          cell.landingProgress = 0;
          setTimeout(() => {
            const cellPos = getCellCoordinates(ownAvailableSources[0].x, ownAvailableSources[0].y);
            startParticleSystem(map[ownAvailableSources[0].x][ownAvailableSources[0].y].building.id, cellPos[0] + 5, cellPos[1] + 10, { r: 220, g: 200, b: 0}, "down", { initTtl: 20, once: true, speed: 0.5, maxParticles: 30 });
          }, 900);
          const cellPos = getCellCoordinates(ownAvailableSources[0].x, ownAvailableSources[0].y);
          startParticleSystem(map[ownAvailableSources[0].x][ownAvailableSources[0].y].building.id, cellPos[0] + 17, cellPos[1], { r: 0, g: 255, b: 0}, "up", { speed: 0.3 });
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
          let cell;
          while(processingRandomPos) {
            cell = leftCells[Math.floor(Math.random() * leftCells.length)];
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].building.id = getNewId();
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              map[cell.x][cell.y].landingProgress = 0;
              processingRandomPos = false;
            }
          }
        } else if (direction === DIRECTION.SAME || direction === DIRECTION.RIGHT) { // consider same + right for simplicity
          let processingRandomPos = true;
          const rightCells = ownCells.filter(t => t.x > cc.x || t.x === cc.x);
          while(processingRandomPos) {
            cell = rightCells[Math.floor(Math.random() * rightCells.length)];
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].building.id = getNewId();
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              map[cell.x][cell.y].landingProgress = 0;
              processingRandomPos = false;
            }
          }
        } else {
          let processingRandomPos = true;
          while(processingRandomPos) {
            cell = ownCells[Math.floor(Math.random() * ownCells.length)];
            if (cell && cell.cell && !cell.cell.building && cell.cell.type !== "mountain") {
              map[cell.x][cell.y].building = { turret: { ...buildings.turret }, createdAt: loop };
              map[cell.x][cell.y].building.id = getNewId();
              map[cell.x][cell.y].aoi = PLAYERS.CPU;
              map[cell.x][cell.y].landingProgress = 0;
              processingRandomPos = false;
            }
          }
        }
        setTimeout(() => {
          if (cell) {
            const cellPos = getCellCoordinates(cell.x, cell.y);
            startParticleSystem(map[cell.x][cell.y].building.id, cellPos[0] + 5, cellPos[1] + 10, { r: 220, g: 200, b: 0}, "down", { initTtl: 20, once: true, speed: 0.5, maxParticles: 30 });
          }
        }, 900);
        this.state = "CREATE_MINE";
      }
    }
  },
  dispatch(actionName) {
    const action = this.transitions[this.state][actionName];
     if (action) {
         action.call(this);
     } else {
     }
  }
};

const AIStep = () => {
  AIStepNumber += 1;
  if (AIStepNumber % difficulty === 0) {
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

const getTurretDirection = (x1, y1, x2, y2) => {
  if (x1 < x2 && y1 < y2 + 1 && y1 > y2 - 1) {
    return "right";
  } else if (x1 > x2 && y1 < y2 + 1 && y1 > y2 - 1) {
    return "left";
  } else if (x1 < x2 + 1 && x1 > x2 - 1 && y1 > y2) {
    return "up";
  } else if (x1 < x2 + 1 && x1 > x2 - 1 && y1 < y2) {
    return "down";
  } else if (x1 > x2 + 1 && y1 < y2 + 1) {
    return "down left";
  } else if (x1 > x2 + 1 && y1 > y2 - 1) {
    return "up left";
  } else if (x1 > x2 + 1 && y1 < y2 - 1) {
    return "up right";
  } else if (x1 > x2 + 1 && y1 > y2) {
    return "down right";
  } else if (x1 < x2) {
    return "right";
  } else if (x1 > x2) {
    return "left";
  }
};

const turretAttack = () => {
  const ccs = findAllCommandCenters();
  const turrets = findAllTurrets();
  const refineries = findAllMines();
  const all = turrets.concat(refineries).concat(ccs);
  let attacked = false;
  // calculate distance with every other building
  turrets.forEach((t, i) => {
    attacked = false;
    all.forEach((t2, j) => {
      if (!attacked) {
        const dist = Math.sqrt(Math.pow((t2.x - t.x), 2) + Math.pow((t2.y - t.y), 2));
        if (dist > 0 && dist < buildings.turret.range && t.cell.aoi !== t2.cell.aoi) {
          const cellPos = getCellCoordinates(t2.x, t2.y);
          if (t2.cell.building?.turret) {
            if (t2.cell.building?.turret && t.cell.building?.turret) {
              t2.cell.building.turret.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.turret?.hp <= 0) {
              destroy(t2);
            } else if (t2.cell.building?.turret?.hp < t2.cell.building?.turret?.totalHP/2) {
              startParticleSystem(map[t2.x][t2.y].building.id, cellPos[0] + 15, cellPos[1] + 10, { r: 255, g: 100, b: 0}, "up", { initSize: 8, initTtl: 15, maxParticles: 5, speed: 0.5 });
            }
          } else if (t2.cell.building?.refinery) {
            if (t2.cell.building?.refinery && t.cell.building?.turret) {
              t2.cell.building.refinery.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.refinery?.hp <= 0) {
              destroy(t2);
            } else if (t2.cell.building?.refinery?.hp < t2.cell.building?.refinery?.totalHP/2) {
              startParticleSystem(map[t2.x][t2.y].building.id, cellPos[0] + 15, cellPos[1] + 10, { r: 255, g: 100, b: 0}, "up", { initSize: 8, initTtl: 15, maxParticles: 5, speed: 0.5 });
            }
          } else if (t2.cell.building?.cc) {
            if (t2.cell.building?.cc && t.cell.building?.turret) {
              t2.cell.building.cc.hp -= t.cell.building.turret.damage;
            }
            if (t2.cell.building?.cc?.hp <= 0) {
              destroy(t2);
            } else if (t2.cell.building?.cc?.hp < t2.cell.building?.cc?.totalHP/2) {
              startParticleSystem(map[t2.x][t2.y].building.id, cellPos[0] + 15, cellPos[1] + 10, { r: 255, g: 100, b: 0}, "up", { initSize: 8, initTtl: 15, maxParticles: 5, speed: 0.5 });
            }
          }
          if (map[t.x][t.y].building) {
            const cellPos = getCellCoordinates(t.x, t.y);
            startParticleSystem(map[t.x][t.y].building.id, cellPos[0] + 17, cellPos[1], { r: 255, g: 180, b: 0}, getTurretDirection(t.x, t.y, t2.x, t2.y), { initSize: 4, initTtl: 50, maxParticles: 3, speed: 4 });
          }
          attacked = true;
        }
      }
    });
    if (!attacked) { // turret not attacking. Remove animation
      const s = particleSystems.find(system => system.init.id === t.cell.building.id);
      if (s) {
        s.ended = true; // mark for elimination
      }
    }
  });
};

const checkWinLoseConditions = () => {
  if (!pristineMap && FSM.state !== "INIT") {
    const ccs = findAllCommandCenters();
    if (!ccs.find(cc => cc.cell.aoi === PLAYERS.CPU)) { // you destroyed enemy CCs, you win
      state = STATES.WIN;
    } else if (!ccs.find(cc => cc.cell.aoi === PLAYERS.HUMAN)) { // all your CCs were destroyed, you lose
      state = STATES.LOSE;
    }
  }
};

const gameLogic = () => {
  gatherResources();
  AIStep();
  turretAttack();
  checkWinLoseConditions();
};

const updateLandingProgress = () => {
  map.forEach((col, i) => {
    col.forEach((cell, j) => {
      if (cell.landingProgress < 80) {
        cell.landingProgress += 5 - cell.landingProgress / 21;
      } else if (cell.landingProgress < 100) {
        cell.landingProgress += 0.4;
      }
    });
  });
}

const startCooldown = buildingName => {
  buildings[buildingName].cooldownRemaining = buildings[buildingName].cooldown;
  cooldownTimers[buildingName] = setInterval(() => {
    buildings[buildingName].cooldownRemaining -= 1;
    if (buildings[buildingName].cooldownRemaining === 0) {
      clearInterval(cooldownTimers[buildingName]);
    }
  }, 1000);
}

const getCellCoordinates = (tileX, tileY) => tileX % 2 === 0 ?
      [HEX_SIZE * tileX + BUILDING_OFFSET + HORIZ_HEX_OFFSET * tileX, HEX_SIZE * tileY + VERT_HEX_OFFSET + VERT_MAP_OFFSET] :
      [HEX_SIZE * tileX + BUILDING_OFFSET + HORIZ_HEX_OFFSET * tileX, HEX_SIZE * tileY + VERT_MAP_OFFSET];

const getNewId = () => {
  incrementalId += 1;
  return incrementalId;
}

const build = buildingName => {
  if (helium3 >= buildings[buildingName].cost && buildings[buildingName].cooldownRemaining === 0) {
    map[selCell[0]][selCell[1]].building = { [buildingName]: { ...buildings[buildingName] }, createdAt: loop };
    map[selCell[0]][selCell[1]].building.id = getNewId();
    map[selCell[0]][selCell[1]].aoi = PLAYERS.HUMAN;
    map[selCell[0]][selCell[1]].landingProgress = 0;
    helium3 -= buildings[buildingName].cost;
    generateAoI();
    startCooldown(buildingName);

    // add building effect
    const cx = selCell[0];
    const cy = selCell[1];
    const cell = map[selCell[0]][selCell[1]];
    setTimeout(() => {
      const cellPos = getCellCoordinates(cx, cy);
      startParticleSystem(cell.building.id, cellPos[0] + 5, cellPos[1] + 10, { r: 220, g: 200, b: 0}, "down", { initTtl: 20, once: true, speed: 0.5, maxParticles: 30 });
    }, 900);
    setTimeout(() => {
      if (buildingName === "refinery") {
        const cellPos = getCellCoordinates(cx, cy);
        startParticleSystem(cell.building.id, cellPos[0] + 17, cellPos[1], { r: 0, g: 255, b: 0}, "up", { speed: 0.3 });
      }
    }, 2000);
  }
}

const destroy = cell => {
  const systems = particleSystems.filter(system => system.init.id === cell.cell.building.id);
  if (systems) {
    systems.forEach((s) => {
      s.ended = true; // mark for elimination
    })
  }
  cell.cell.aoi = null;
  cell.cell.building = null;
  resetAoI();
  generateAoI();
}

const updateSelectedCellInfo = () => {
    const selection = map[selCell[0]][selCell[1]];
    const { type, building } = selection;
    if (building?.cc) {
      selectedCellInfo = "Command Center";
    } else if (building?.turret) {
      selectedCellInfo = "Turret";
    } else if (building?.refinery) {
      selectedCellInfo = "Refinery";
    } else if (type === "mountain") {
      selectedCellInfo = "Mountains";
    } else if (type === "helium3") {
      selectedCellInfo = "Helium-3";
    } else {
      selectedCellInfo = "";
    }
}

const initInteraction = () => {
  document.addEventListener("keydown", ev => {
    if (state === STATES.RUNNING) {
      switch (ev.keyCode) {
        // arrows
        case 37:
          selCell[0] = selCell[0] > 0 ? selCell[0] - 1 : 0;
          updateSelectedCellInfo();
          buildBtnPressed = undefined;
          clearTurretRangePreview();
        break;
        case 38:
          selCell[1] = selCell[1] > 0 ? selCell[1] - 1 : 0;
          updateSelectedCellInfo();
          buildBtnPressed = undefined;
          clearTurretRangePreview();
        break;
        case 39:
          selCell[0] = selCell[0] < MAP_WIDTH - 1 ? selCell[0] + 1 : MAP_WIDTH - 1;
          updateSelectedCellInfo();
          buildBtnPressed = undefined;
          clearTurretRangePreview();
        break;
        case 40:
          selCell[1] = selCell[1] < MAP_HEIGHT - 1 ? selCell[1] + 1 : MAP_HEIGHT - 1;
          updateSelectedCellInfo();
          buildBtnPressed = undefined;
          clearTurretRangePreview();
        break;
        case 49: // 1
        if ((map[selCell[0]][selCell[1]].aoi !== PLAYERS.CPU || !map[selCell[0]][selCell[1]].aoi && pristineMap) && map[selCell[0]][selCell[1]].type !== "mountain") {
          if (buildBtnPressed === "1" && map[selCell[0]][selCell[1]].building?.placeholder) {
            buildBtnPressed = undefined;
            pristineMap = false;
            build("cc");
          } else {
            buildBtnPressed = "1";
          }
        }
        break;
        case 50: // 2
        if (map[selCell[0]][selCell[1]].aoi && map[selCell[0]][selCell[1]].aoi !== PLAYERS.CPU && map[selCell[0]][selCell[1]].type !== "mountain") {
          if (buildBtnPressed === "2" && map[selCell[0]][selCell[1]].building?.placeholder) {
            buildBtnPressed = undefined;
            pristineMap = false;
            build("turret");
          } else {
            buildBtnPressed = "2";
            generateTurretRangePreview(selCell[0], selCell[1]);
          }
        }
        break;
        case 51: // 3
        if (map[selCell[0]][selCell[1]].aoi && map[selCell[0]][selCell[1]].aoi !== PLAYERS.CPU && map[selCell[0]][selCell[1]].type === "helium3") {
          if (buildBtnPressed === "3" && map[selCell[0]][selCell[1]].building?.placeholder) {
            buildBtnPressed = undefined;
            pristineMap = false;
            build("refinery");
          } else {
            buildBtnPressed = "3";
          }
        }
        break;
        case 27: // ESC
          buildBtnPressed = undefined;
        break;
        case 46: // Supr
          destroy({ cell: map[selCell[0]][selCell[1]] });
        break;
        case 68: // "d" for debuggin
          debuggingMode = !debuggingMode;
        break;
      }
    } else if ((state === STATES.WIN || state === STATES.LOSE) && ev.key === "Enter") {
      location.reload(); // reload the game the good old way :)
    } else if (state === STATES.TITLE) {
      particleSystems = [];
      state = STATES.DIFFICULTY_SELECTION;
    } else if (state === STATES.DIFFICULTY_SELECTION) {
      switch(ev.keyCode) {
        case 49:
          difficulty = DIFFICULTY.EASY;
          state = STATES.RUNNING;
          play();
        break;
        case 50:
          difficulty = DIFFICULTY.DIFFICULT;
          state = STATES.RUNNING;
          play();
        break;
        case 51:
          difficulty = DIFFICULTY.EXTREME;
          state = STATES.RUNNING;
          play();
        break;
      }
    }
    if (state === STATES.RUNNING) {
      generateAoI();
    }
  });
};

const drawTitle = () => {
  // upper section
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 50, canvas.width, 250);
  ctx.fillStyle = "black";
  ctx.font = "80px Arial";
  ctx.fillText("LUNAR", 300, 150);
  ctx.fillText("PODS", 400, 250);
  ctx.drawImage(podTile, 100, 200);
  ctx.drawImage(podTileCpu, 200, 200);
  ctx.fillStyle = "white";
  ctx.font = "14px Arial";
  ctx.fillText("by Eric Ros (@ericrosbh) for the 2021 js13kgames", 460, 290);
  // bottom section
  ctx.strokeStyle = "white";
  ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
  ctx.strokeRect(10, 350, canvas.width - 20, 240);
  ctx.fillRect(10, 350, canvas.width - 20, 240);
  // Introduction
  ctx.fillStyle = "white";
  ctx.fillText("The year is 2050. Humanity is desperate for clean energy. The new fusion reactors are promising, but they are fueled with", 20, 370);
  ctx.fillText("helium-3.. very scarce on Earth but not on the Moon. Only the mightiest will claim the precious resource...", 20, 390);
  ctx.fillText("Use arrows to change your selection and press 1, 2, or 3 to build.", 20, 430);
  ctx.fillText("The goal is to destroy the enemy command center.", 20, 450);
  ctx.fillText("Command centers do nothing, but they generate a large territory.", 20, 470);
  ctx.fillText("Inside your territory, you can build turrets, to attack enemy buildings, and refineries, to increase your helium-3 reserves.", 20, 490);
  ctx.fillText("You cannot build in mountains. A part from that, they do not have any effect in the game.", 20, 510);
  ctx.fillText("Press any key to start", canvas.width - 150, canvas.height - 20);
};

const drawDifficultySelection = () => {
  ctx.strokeStyle = "white";
  ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
  const baseX = 300;
  const baseY = 250;
  ctx.strokeRect(baseX, baseY, 200, 40);
  ctx.fillRect(baseX, baseY, 200, 40);
  ctx.strokeRect(baseX, baseY + 60, 200, 40);
  ctx.fillRect(baseX, baseY + 60, 200, 40);
  ctx.strokeRect(baseX, baseY + 120, 200, 40);
  ctx.fillRect(baseX, baseY + 120, 200, 40);
  ctx.fillStyle = "gray";
  ctx.fillRect(baseX + 10, baseY + 10, 20, 20);
  ctx.fillRect(baseX + 10, baseY + 70, 20, 20);
  ctx.fillRect(baseX + 10, baseY + 130, 20, 20);
  // text
  ctx.fillStyle = "white";
  ctx.fillText("Choose difficulty level:", baseX, baseY - 30);
  ctx.fillStyle = "black";
  ctx.fillText("1", baseX + 16, baseY + 25);
  ctx.fillText("2", baseX + 16, baseY + 85);
  ctx.fillText("3", baseX + 16, baseY + 145);
  ctx.fillStyle = "white";
  ctx.fillText("Easy", baseX + 40, baseY + 25);
  ctx.fillText("Hard", baseX + 40, baseY + 85);
  ctx.fillText("Extreme", baseX + 40, baseY + 145);
}

const gameLoop = () => {
  if (state === STATES.TITLE) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    drawTitle();
  } else if (state === STATES.DIFFICULTY_SELECTION) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    drawDifficultySelection();
  } else {
    if (loop % 60 === 0 && state === STATES.RUNNING) {
      gameLogic();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawStars();
    drawMap();
    drawUI();
    updateLandingProgress();
  }
  updateParticleSystems();
  if (loop % 200 === 0) {
    purgeEndedParticleSystems();
  }
  loop++;
  window.requestAnimationFrame(gameLoop);
};

const initGame = () => {
  generateStarBackground(200);
  startParticleSystem(99990, 115, 230, { r: 220, g: 200, b: 0}, "down", { initTtl: 50, speed: 0.5, maxParticles: 30 });
  startParticleSystem(99991, 215, 230, { r: 220, g: 200, b: 0}, "down", { initTtl: 50, speed: 0.5, maxParticles: 30 });
  initInteraction();
  window.requestAnimationFrame(gameLoop);
};

const play = () => {
  generateMap(MAP_WIDTH, MAP_HEIGHT);
};

window.addEventListener("load", () => {
  initGame();
})
