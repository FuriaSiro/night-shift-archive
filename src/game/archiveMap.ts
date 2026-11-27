import * as ROT from "rot-js";

export const ARCHIVE_MAP_WIDTH = 32;
export const ARCHIVE_MAP_HEIGHT = 18;

export interface MapPosition {
  x: number;
  y: number;
}

export const archiveRoomDefinitions = [
  { id: "reading-room", label: "Reading Room", glyph: "R" },
  { id: "records-desk", label: "Records Desk", glyph: "D" },
  { id: "restricted-stacks", label: "Restricted Stacks", glyph: "S" },
  { id: "break-room", label: "Break Room", glyph: "B" },
] as const;

export type ArchiveRoomId = typeof archiveRoomDefinitions[number]["id"];

export interface ArchiveMapRoom {
  id: ArchiveRoomId;
  label: string;
  glyph: string;
  position: MapPosition;
}

export interface ArchiveMap {
  tiles: number[][];
  rooms: ArchiveMapRoom[];
  start: MapPosition;
}

let display: ROT.Display | null = null;
const mapCache = new Map<number, ArchiveMap>();

export function archiveMapSeed(profileId: number, loopCount: number, caseId: string): number {
  let seed = 2166136261;
  for (const character of `${profileId}:${loopCount}:${caseId}`) {
    seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  }
  return seed >>> 0 || 1;
}

function samePosition(left: MapPosition, right: MapPosition): boolean {
  return left.x === right.x && left.y === right.y;
}

function distanceToSelected(position: MapPosition, selected: MapPosition[]): number {
  return Math.min(...selected.map((item) =>
    Math.abs(position.x - item.x) + Math.abs(position.y - item.y),
  ));
}

export function createArchiveMap(seed: number): ArchiveMap {
  const cached = mapCache.get(seed);
  if (cached) return cached;
  const previousRngState = ROT.RNG.getState();
  try {
    ROT.RNG.setSeed(seed);
    const generator = new ROT.Map.Digger(ARCHIVE_MAP_WIDTH, ARCHIVE_MAP_HEIGHT, {
      roomWidth: [4, 7],
      roomHeight: [3, 5],
      corridorLength: [2, 5],
      dugPercentage: 0.4,
      timeLimit: 1000,
    });
    const tiles = Array.from(
      { length: ARCHIVE_MAP_WIDTH },
      () => Array<number>(ARCHIVE_MAP_HEIGHT).fill(1),
    );
    generator.create((x, y, value) => {
      tiles[x][y] = value;
    });

    const floorPositions: MapPosition[] = [];
    for (let x = 1; x < ARCHIVE_MAP_WIDTH - 1; x += 1) {
      for (let y = 1; y < ARCHIVE_MAP_HEIGHT - 1; y += 1) {
        if (tiles[x][y] !== 1) floorPositions.push({ x, y });
      }
    }
    const roomCenters = generator.getRooms()
      .map((room) => {
        const [x, y] = room.getCenter();
        return { x, y };
      })
      .filter((position) => tiles[position.x]?.[position.y] !== 1)
      .sort((left, right) => left.y - right.y || left.x - right.x);
    const candidates = [...(roomCenters.length >= archiveRoomDefinitions.length
      ? roomCenters
      : [...roomCenters, ...floorPositions])]
      .filter((position, index, list) =>
        list.findIndex((other) => samePosition(position, other)) === index,
      );
    const selected = [roomCenters[0] ?? floorPositions[0] ?? { x: 2, y: 2 }];

    while (selected.length < archiveRoomDefinitions.length) {
      const next = candidates
        .filter((position) => !selected.some((item) => samePosition(item, position)))
        .sort((left, right) =>
          distanceToSelected(right, selected) - distanceToSelected(left, selected) ||
          left.y - right.y ||
          left.x - right.x,
        )[0];
      if (!next) break;
      selected.push(next);
    }

    while (selected.length < archiveRoomDefinitions.length) {
      const position = { x: 2 + selected.length * 2, y: 2 };
      tiles[position.x][position.y] = 0;
      selected.push(position);
    }

    const map: ArchiveMap = {
      tiles,
      start: selected[0],
      rooms: archiveRoomDefinitions.map((definition, index) => ({
        ...definition,
        position: selected[index],
      })),
    };
    mapCache.set(seed, map);
    if (mapCache.size > 24) {
      const oldestSeed = mapCache.keys().next().value;
      if (oldestSeed !== undefined) mapCache.delete(oldestSeed);
    }
    return map;
  } finally {
    ROT.RNG.setState(previousRngState);
  }
}

export function isMapWalkable(map: ArchiveMap, position: MapPosition): boolean {
  return map.tiles[position.x]?.[position.y] !== undefined &&
    map.tiles[position.x][position.y] !== 1;
}

export function findArchivePath(
  map: ArchiveMap,
  from: MapPosition,
  to: MapPosition,
): MapPosition[] {
  const path: MapPosition[] = [];
  const finder = new ROT.Path.AStar(
    to.x,
    to.y,
    (x, y) => map.tiles[x]?.[y] !== undefined && map.tiles[x][y] !== 1,
    { topology: 4 },
  );
  finder.compute(from.x, from.y, (x, y) => path.push({ x, y }));
  return path;
}

export function visibleArchiveCells(map: ArchiveMap, position: MapPosition): number[] {
  const visible = new Set<number>();
  const fov = new ROT.FOV.PreciseShadowcasting(
    (x, y) => map.tiles[x]?.[y] !== undefined && map.tiles[x][y] !== 1,
    { topology: 4 },
  );
  fov.compute(position.x, position.y, 8, (x, y) => {
    if (x >= 0 && x < ARCHIVE_MAP_WIDTH && y >= 0 && y < ARCHIVE_MAP_HEIGHT) {
      visible.add(y * ARCHIVE_MAP_WIDTH + x);
    }
  });
  return [...visible];
}

export function drawArchiveMap(
  map: ArchiveMap,
  position: MapPosition,
  exploredCells: number[],
): HTMLElement | null {
  if (!display) {
    display = new ROT.Display({
      width: ARCHIVE_MAP_WIDTH,
      height: ARCHIVE_MAP_HEIGHT,
      fontSize: 14,
      fontFamily: "Cascadia Mono, Consolas, monospace",
      fg: "#d8d1bd",
      bg: "#08131c",
      layout: "rect",
    });
  }
  const container = display.getContainer();
  if (!container) return null;
  display.clear();

  const visible = new Set(visibleArchiveCells(map, position));
  const explored = new Set([...exploredCells, ...visible]);
  const roomsByPosition = new Map(map.rooms.map((room) => [
    room.position.x + room.position.y * ARCHIVE_MAP_WIDTH,
    room,
  ]));

  for (let y = 0; y < ARCHIVE_MAP_HEIGHT; y += 1) {
    for (let x = 0; x < ARCHIVE_MAP_WIDTH; x += 1) {
      const index = y * ARCHIVE_MAP_WIDTH + x;
      if (!explored.has(index)) {
        display.draw(x, y, " ", "#d8d1bd", "#08131c");
        continue;
      }
      const inSight = visible.has(index);
      const tile = map.tiles[x][y];
      const room = roomsByPosition.get(index);
      const character = samePosition(position, { x, y })
        ? "@"
        : room?.glyph ?? (tile === 1 ? "#" : tile === 2 ? "+" : "·");
      const foreground = samePosition(position, { x, y })
        ? "#f0c786"
        : room
          ? "#b5c8d2"
          : inSight
            ? tile === 1 ? "#56636c" : "#c2c8c0"
            : "#4f5c64";
      const background = inSight ? "#14212d" : "#0c1821";
      display.draw(x, y, character, foreground, background);
    }
  }
  container.setAttribute("aria-hidden", "true");
  return container;
}
