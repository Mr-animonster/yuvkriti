import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import runnerBackground from "@/assets/wedding-runner-background.png";
import mandapBackground from "@/assets/wedding-mandap-finale.png";
import type { GameConfigDraft, GameStateMessage, PartnerRole } from "@/lib/love-story-types";
import {
  JUMP_DURATION_MS,
  RunnerSimulation,
  RUNNER_LANE_HEIGHT,
  RUNNER_LOGICAL_HEIGHT,
  RUNNER_LOGICAL_WIDTH,
  TARGET_RUN_DURATION_MS,
} from "@/lib/runner-engine";
import { getPublicMediaUrl } from "@/lib/game-config";
import type { WeddingSoundEffect } from "@/lib/wedding-audio";

const PLAYER_X = 310;
const GROUND_OFFSET = 435;
const VIEW_DISTANCE = 9;
const CHARACTER_SCALE = 0.56;
const START_COUNTDOWN_MS = 3_000;
const TOP_BAR_HEIGHT = 78;

export interface RunnerCanvasHandle {
  jump: (role: PartnerRole) => void;
  pause: () => void;
  resume: () => void;
  skipToNextMilestone: () => void;
  restart: () => void;
}

interface RunnerCanvasProps {
  roomCode: string;
  config: GameConfigDraft;
  practiceBots: boolean;
  onState: (state: GameStateMessage) => void;
  onMilestone: (milestone: GameConfigDraft["milestones"][number]) => void;
  onHeartsRefilled: (message: string) => void;
  onSoundEffect: (effect: WeddingSoundEffect) => void;
  onFinale: () => void;
}

interface CanvasPalette {
  background: string;
  foreground: string;
  marigold: string;
  maroon: string;
  gold: string;
  cream: string;
  brideRed: string;
  skin: string;
  secondary: string;
  card: string;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  rotation: number;
  rotationSpeed: number;
  size: number;
  color: string;
  round: boolean;
}

function readPalette(): CanvasPalette {
  const style = getComputedStyle(document.documentElement);
  return {
    background: style.getPropertyValue("--background").trim(),
    foreground: style.getPropertyValue("--foreground").trim(),
    marigold: style.getPropertyValue("--marigold").trim(),
    maroon: style.getPropertyValue("--maroon").trim(),
    gold: style.getPropertyValue("--wedding-gold").trim(),
    cream: style.getPropertyValue("--cream").trim(),
    brideRed: style.getPropertyValue("--bride-red").trim(),
    skin: style.getPropertyValue("--character-skin").trim(),
    secondary: style.getPropertyValue("--secondary").trim(),
    card: style.getPropertyValue("--card").trim(),
  };
}

function loadImage(source: string): HTMLImageElement {
  const image = new Image();
  image.src = source;
  return image;
}

function drawBackLayer(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  laneTop: number,
  offset: number,
) {
  if (!image.complete || image.naturalWidth === 0) return;
  const tileWidth = RUNNER_LOGICAL_WIDTH;
  const tileHeight = RUNNER_LANE_HEIGHT;
  const sourceHeight = Math.min(470, image.naturalHeight);
  const sourceTop = Math.max(0, Math.min(image.naturalHeight - sourceHeight, 300));
  const firstX = -offset;

  context.save();
  context.beginPath();
  context.rect(0, laneTop, RUNNER_LOGICAL_WIDTH, tileHeight);
  context.clip();
  context.globalAlpha = 0.72;
  for (let tile = 0; tile < 3; tile += 1) {
    context.save();
    context.translate(firstX + tile * tileWidth, 0);
    if (tile % 2 === 1) {
      context.translate(tileWidth, 0);
      context.scale(-1, 1);
    }
    context.drawImage(
      image,
      0,
      sourceTop,
      image.naturalWidth,
      sourceHeight,
      0,
      laneTop,
      tileWidth,
      tileHeight,
    );
    context.restore();
  }
  context.restore();
}

function drawFlower(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  palette: CanvasPalette,
) {
  context.save();
  context.translate(x, y);
  for (let petal = 0; petal < 6; petal += 1) {
    context.rotate(Math.PI / 3);
    context.beginPath();
    context.ellipse(0, -size * 0.7, size * 0.34, size * 0.62, 0, 0, Math.PI * 2);
    context.fillStyle = petal % 2 === 0 ? palette.marigold : palette.gold;
    context.fill();
  }
  context.beginPath();
  context.arc(0, 0, size * 0.28, 0, Math.PI * 2);
  context.fillStyle = palette.maroon;
  context.fill();
  context.restore();
}

function drawLaneBackground(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  laneTop: number,
  worldTime: number,
  laneIndex: number,
  palette: CanvasPalette,
) {
  context.fillStyle = palette.cream;
  context.fillRect(0, laneTop, RUNNER_LOGICAL_WIDTH, RUNNER_LANE_HEIGHT);

  // Three independent layers: distant venue, garden trees, then close flowers.
  const farOffset = (worldTime * 0.009 + laneIndex * 740) % RUNNER_LOGICAL_WIDTH;
  drawBackLayer(context, image, laneTop, farOffset);

  const midOffset = (worldTime * 0.032 + laneIndex * 510) % 420;
  context.save();
  context.globalAlpha = 0.24;
  context.fillStyle = palette.maroon;
  for (let x = -160 - midOffset; x < RUNNER_LOGICAL_WIDTH + 200; x += 420) {
    context.beginPath();
    context.arc(x, laneTop + 338, 76, Math.PI, Math.PI * 2);
    context.arc(x + 70, laneTop + 350, 58, Math.PI, Math.PI * 2);
    context.arc(x - 66, laneTop + 356, 50, Math.PI, Math.PI * 2);
    context.fill();
    context.fillRect(x - 5, laneTop + 340, 10, 82);
  }
  context.restore();

  const nearOffset = (worldTime * 0.072 + laneIndex * 360) % 300;
  context.save();
  context.globalAlpha = 0.72;
  for (let x = -80 - nearOffset; x < RUNNER_LOGICAL_WIDTH + 100; x += 300) {
    drawFlower(context, x, laneTop + 390, 12, palette);
    context.strokeStyle = palette.maroon;
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(x, laneTop + 400);
    context.lineTo(x - 13, laneTop + 432);
    context.stroke();
  }
  context.restore();

  const floorY = laneTop + GROUND_OFFSET;
  context.fillStyle = palette.maroon;
  context.fillRect(0, floorY, RUNNER_LOGICAL_WIDTH, 6);
  context.fillStyle = palette.gold;
  context.fillRect(0, floorY + 6, RUNNER_LOGICAL_WIDTH, 4);
  context.fillStyle = palette.secondary;
  context.fillRect(0, floorY + 10, RUNNER_LOGICAL_WIDTH, RUNNER_LANE_HEIGHT - GROUND_OFFSET - 10);
  context.save();
  context.fillStyle = palette.maroon;
  context.globalAlpha = 0.18;
  for (let x = -nearOffset; x < RUNNER_LOGICAL_WIDTH; x += 100) {
    context.fillRect(x, floorY + 38, 34, 3);
  }
  context.restore();
}

function drawHeart(context: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) {
  context.save();
  context.translate(x, y);
  context.scale(size / 32, size / 32);
  context.beginPath();
  context.moveTo(0, 28);
  context.bezierCurveTo(-36, 5, -16, -13, 0, 0);
  context.bezierCurveTo(16, -13, 36, 5, 0, 28);
  context.fillStyle = color;
  context.fill();
  context.restore();
}

function drawObstacleSign(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  palette: CanvasPalette,
) {
  const width = 102;
  const height = 41;
  context.fillStyle = palette.maroon;
  context.fillRect(x - 2, y + height, 4, 48);
  context.beginPath();
  context.roundRect(x - width / 2, y, width, height, 7);
  context.fillStyle = palette.card;
  context.fill();
  context.lineWidth = 3;
  context.strokeStyle = palette.gold;
  context.stroke();
  context.fillStyle = palette.maroon;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${label.length > 18 ? 9 : 11}px "DM Sans", sans-serif`;
  context.fillText(label, x, y + height / 2, width - 12);
}

function drawDhol(context: CanvasRenderingContext2D, x: number, y: number, palette: CanvasPalette) {
  context.save();
  context.translate(x, y);
  context.rotate(-0.12);
  context.fillStyle = palette.marigold;
  context.beginPath();
  context.roundRect(-25, -17, 50, 34, 9);
  context.fill();
  context.strokeStyle = palette.maroon;
  context.lineWidth = 4;
  context.stroke();
  context.fillStyle = palette.cream;
  context.beginPath();
  context.ellipse(-23, 0, 7, 17, 0, 0, Math.PI * 2);
  context.ellipse(23, 0, 7, 17, 0, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = palette.gold;
  context.lineWidth = 3;
  context.beginPath();
  context.moveTo(-17, -14);
  context.lineTo(17, 14);
  context.moveTo(-17, 14);
  context.lineTo(17, -14);
  context.stroke();
  context.restore();
  context.fillStyle = palette.maroon;
  context.font = '700 12px "DM Sans", sans-serif';
  context.textAlign = "center";
  context.fillText("DHOL BOOST", x, y + 38);
}

function drawMandap(context: CanvasRenderingContext2D, x: number, groundY: number, palette: CanvasPalette) {
  const top = groundY - 258;
  context.save();
  context.globalAlpha = 0.96;
  context.strokeStyle = palette.maroon;
  context.lineWidth = 14;
  context.beginPath();
  context.moveTo(x - 112, groundY);
  context.lineTo(x - 112, top + 48);
  context.quadraticCurveTo(x, top - 34, x + 112, top + 48);
  context.lineTo(x + 112, groundY);
  context.stroke();
  context.strokeStyle = palette.gold;
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(x - 112, groundY);
  context.lineTo(x - 112, top + 48);
  context.quadraticCurveTo(x, top - 34, x + 112, top + 48);
  context.lineTo(x + 112, groundY);
  context.stroke();
  for (let index = 0; index < 9; index += 1) {
    const angle = Math.PI + (index / 8) * Math.PI;
    drawFlower(context, x + Math.cos(angle) * 112, top + 48 + Math.sin(angle) * 82, 13, palette);
  }
  for (const side of [-1, 1]) {
    for (let index = 0; index < 5; index += 1) {
      drawFlower(context, x + side * 112, top + 72 + index * 39, 11, palette);
    }
  }
  context.fillStyle = palette.maroon;
  context.beginPath();
  context.roundRect(x - 75, top + 30, 150, 40, 12);
  context.fill();
  context.fillStyle = palette.cream;
  context.font = '700 21px "DM Sans", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("MANDAP", x, top + 51);
  context.restore();
}

function drawTrackItems(
  context: CanvasRenderingContext2D,
  laneTop: number,
  laneProgress: number,
  items: RunnerSimulation["track"],
  processed: Set<string>,
  palette: CanvasPalette,
) {
  for (const item of items) {
    if (processed.has(item.id)) continue;
    const distance = item.progress - laneProgress;
    if (distance < -1 || distance > VIEW_DISTANCE) continue;
    const x = PLAYER_X + (distance / VIEW_DISTANCE) * (RUNNER_LOGICAL_WIDTH - PLAYER_X - 110);

    if (item.kind === "obstacle") {
      drawObstacleSign(context, x, laneTop + 346, item.label, palette);
      context.fillStyle = palette.marigold;
      context.beginPath();
      context.arc(x, laneTop + 432, 12, 0, Math.PI * 2);
      context.fill();
    } else if (item.kind === "heart") {
      drawHeart(context, x, laneTop + 363, 22, palette.brideRed);
      context.beginPath();
      context.arc(x, laneTop + 364, 20, 0, Math.PI * 2);
      context.lineWidth = 2;
      context.strokeStyle = palette.gold;
      context.stroke();
    } else if (item.kind === "flower") {
      drawFlower(context, x, laneTop + 365, 14, palette);
    } else {
      drawDhol(context, x, laneTop + 360, palette);
    }
  }
}

function drawPhotoHead(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  centerX: number,
  centerY: number,
  radius: number,
  palette: CanvasPalette,
) {
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = palette.skin;
  context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
  if (image?.complete && image.naturalWidth > 0) {
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = (image.naturalWidth - cropSize) / 2;
    const sourceY = (image.naturalHeight - cropSize) / 2;
    context.drawImage(image, sourceX, sourceY, cropSize, cropSize, centerX - radius, centerY - radius, radius * 2, radius * 2);
  } else {
    context.fillStyle = palette.maroon;
    context.beginPath();
    context.arc(centerX, centerY - radius * 0.43, radius * 0.82, Math.PI, Math.PI * 2);
    context.fill();
    context.fillStyle = palette.foreground;
    context.beginPath();
    context.arc(centerX - 10, centerY, 3, 0, Math.PI * 2);
    context.arc(centerX + 10, centerY, 3, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = palette.foreground;
    context.lineWidth = 3;
    context.beginPath();
    context.arc(centerX, centerY + 5, 9, 0.2, Math.PI - 0.2);
    context.stroke();
  }
  context.restore();
  context.beginPath();
  context.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
  context.lineWidth = 5;
  context.strokeStyle = palette.gold;
  context.stroke();
}

function getJumpOffset(lane: RunnerSimulation["state"]["bride"]) {
  if (lane.jumpRemainingMs <= 0) return 0;
  const progress = 1 - lane.jumpRemainingMs / JUMP_DURATION_MS;
  return Math.sin(progress * Math.PI) * 88;
}

function drawDust(
  context: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  animationTime: number,
  palette: CanvasPalette,
  reduced: boolean,
) {
  context.save();
  context.fillStyle = palette.gold;
  const count = reduced ? 2 : 4;
  for (let index = 0; index < count; index += 1) {
    const age = (animationTime / 520 + index / count) % 1;
    context.globalAlpha = (1 - age) * 0.34;
    context.beginPath();
    context.arc(x - 20 - age * 82, groundY - 3 - age * 24, 3 + age * 9, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

function drawCharacter(
  context: CanvasRenderingContext2D,
  role: PartnerRole,
  lane: RunnerSimulation["state"]["bride"],
  faceImage: HTMLImageElement | null,
  palette: CanvasPalette,
  x: number,
  baseY: number,
  reducedEffects: boolean,
) {
  const jumping = lane.jumpRemainingMs > 0;
  const jumpProgress = jumping ? 1 - lane.jumpRemainingMs / JUMP_DURATION_MS : 0;
  const jumpOffset = getJumpOffset(lane);
  const stumble = lane.stumbleRemainingMs > 0;
  const runTime = lane.animationTimeMs;
  const swing = Math.sin(runTime * 0.022) * 28;
  const bounce = jumping || lane.gateStopped ? 0 : -Math.abs(Math.sin(runTime * 0.022)) * 5;
  const squashX = jumping && jumpProgress > 0.8 ? 1.09 : jumping && jumpProgress < 0.16 ? 0.95 : 1;
  const squashY = jumping && jumpProgress > 0.8 ? 0.92 : jumping && jumpProgress < 0.16 ? 1.07 : 1;

  if (!jumping && !lane.gateStopped) drawDust(context, x, baseY, runTime, palette, reducedEffects);

  context.save();
  context.translate(x, baseY - jumpOffset);
  context.scale(CHARACTER_SCALE * squashX, CHARACTER_SCALE * squashY);
  if (stumble) context.rotate(Math.sin(runTime * 0.045) * 0.12);

  context.lineCap = "round";
  context.lineWidth = 18;
  context.strokeStyle = palette.maroon;
  context.beginPath();
  context.moveTo(-18, -36);
  context.lineTo(-24 + swing * 0.65, -12);
  context.lineTo(-30 + swing, -2 - Math.max(0, swing) * 0.12);
  context.moveTo(18, -36);
  context.lineTo(26 - swing * 0.65, -12);
  context.lineTo(30 - swing, -2 - Math.max(0, -swing) * 0.12);
  context.stroke();

  context.translate(0, bounce);
  if (role === "bride") {
    context.beginPath();
    context.moveTo(-35, -174);
    context.quadraticCurveTo(-64, -107, -86, -28);
    context.quadraticCurveTo(0, -8, 86, -28);
    context.quadraticCurveTo(64, -107, 35, -174);
    context.closePath();
    context.fillStyle = palette.brideRed;
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 9;
    context.beginPath();
    context.moveTo(-84, -28);
    context.quadraticCurveTo(0, -10, 84, -28);
    context.stroke();
    context.fillStyle = palette.maroon;
    context.beginPath();
    context.roundRect(-38, -194, 76, 62, 15);
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(30, -188);
    context.quadraticCurveTo(74, -144, 83, -70);
    context.stroke();
  } else {
    context.fillStyle = palette.maroon;
    context.beginPath();
    context.roundRect(-42, -198, 84, 164, 20);
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(0, -194);
    context.lineTo(0, -40);
    context.stroke();
    context.fillStyle = palette.gold;
    for (let button = 0; button < 5; button += 1) {
      context.beginPath();
      context.arc(0, -164 + button * 25, 4, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.strokeStyle = palette.skin;
  context.lineWidth = 15;
  context.beginPath();
  context.moveTo(-34, -168);
  context.lineTo(-54 - swing * 0.6, -112 + Math.abs(swing) * 0.2);
  context.moveTo(34, -168);
  context.lineTo(54 + swing * 0.6, -112 + Math.abs(swing) * 0.2);
  context.stroke();

  drawPhotoHead(context, faceImage, 0, -238, 56, palette);
  if (stumble) {
    context.font = '700 38px "DM Sans", sans-serif';
    context.fillStyle = palette.marigold;
    context.textAlign = "center";
    context.fillText("✦", -86, -270);
    context.fillText("✦", 82, -294);
  }
  context.restore();
}

function drawRoleLabel(
  context: CanvasRenderingContext2D,
  role: PartnerRole,
  lane: RunnerSimulation["state"]["bride"],
  baseY: number,
  palette: CanvasPalette,
) {
  const y = baseY - getJumpOffset(lane) - 196;
  context.fillStyle = palette.maroon;
  context.beginPath();
  context.roundRect(PLAYER_X - 45, y, 90, 30, 15);
  context.fill();
  context.strokeStyle = palette.gold;
  context.lineWidth = 2;
  context.stroke();
  context.font = '700 15px "DM Sans", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.cream;
  context.fillText(role === "bride" ? "BRIDE" : "GROOM", PLAYER_X, y + 15);
}

function drawForegroundPetals(
  context: CanvasRenderingContext2D,
  laneTop: number,
  worldTime: number,
  palette: CanvasPalette,
  reduced: boolean,
) {
  const count = reduced ? 5 : 12;
  context.save();
  for (let index = 0; index < count; index += 1) {
    const travel = (worldTime * (0.11 + (index % 3) * 0.025) + index * 233) % (RUNNER_LOGICAL_WIDTH + 240);
    const x = RUNNER_LOGICAL_WIDTH + 120 - travel;
    const y = laneTop + 115 + ((index * 71) % 340) + Math.sin(worldTime * 0.003 + index) * 25;
    context.translate(x, y);
    context.rotate(worldTime * 0.002 + index);
    context.globalAlpha = 0.35 + (index % 3) * 0.15;
    context.fillStyle = index % 2 === 0 ? palette.marigold : palette.brideRed;
    context.beginPath();
    context.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
    context.fill();
    context.setTransform(1, 0, 0, 1, 0, 0);
  }
  context.restore();
}

function drawMiniHead(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement | null,
  role: PartnerRole,
  x: number,
  y: number,
  palette: CanvasPalette,
) {
  context.save();
  context.beginPath();
  context.arc(x, y, 15, 0, Math.PI * 2);
  context.clip();
  context.fillStyle = palette.skin;
  context.fillRect(x - 15, y - 15, 30, 30);
  if (image?.complete && image.naturalWidth > 0) {
    const crop = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(image, (image.naturalWidth - crop) / 2, (image.naturalHeight - crop) / 2, crop, crop, x - 15, y - 15, 30, 30);
  } else {
    context.fillStyle = palette.maroon;
    context.font = '700 15px "DM Sans", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(role === "bride" ? "B" : "G", x, y + 1);
  }
  context.restore();
  context.strokeStyle = palette.gold;
  context.lineWidth = 3;
  context.beginPath();
  context.arc(x, y, 16, 0, Math.PI * 2);
  context.stroke();
}

function formatCountdown(seconds: number) {
  const safeSeconds = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safeSeconds / 60)}:${String(safeSeconds % 60).padStart(2, "0")}`;
}

function drawTopBar(
  context: CanvasRenderingContext2D,
  simulation: RunnerSimulation,
  config: GameConfigDraft,
  roomCode: string,
  bridePhoto: HTMLImageElement | null,
  groomPhoto: HTMLImageElement | null,
  palette: CanvasPalette,
) {
  const state = simulation.state;
  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = palette.maroon;
  context.fillRect(0, 0, RUNNER_LOGICAL_WIDTH, TOP_BAR_HEIGHT);
  context.restore();
  context.fillStyle = palette.gold;
  context.fillRect(0, TOP_BAR_HEIGHT - 3, RUNNER_LOGICAL_WIDTH, 3);

  context.textAlign = "left";
  context.fillStyle = palette.cream;
  context.font = '600 29px "Cormorant Garamond", serif';
  context.fillText(`${config.groomName || "Yuvraj"} & ${config.brideName || "Prakriti"}`, 30, 34);
  context.fillStyle = palette.gold;
  context.font = '600 14px "DM Sans", sans-serif';
  context.fillText(`LOVE STORY RUNNER  •  ROOM ${roomCode}`, 31, 59);

  const left = 560;
  const centre = 910;
  const right = 1260;
  const lineY = 29;
  context.strokeStyle = palette.gold;
  context.lineWidth = 4;
  context.beginPath();
  context.moveTo(left, lineY);
  context.lineTo(right, lineY);
  context.stroke();
  for (const gate of state.gateProgress) {
    const ratio = gate / 100;
    for (const x of [left + (centre - left) * ratio, right - (right - centre) * ratio]) {
      context.fillStyle = palette.cream;
      context.beginPath();
      context.arc(x, lineY, 4, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.fillStyle = palette.marigold;
  context.beginPath();
  context.arc(centre, lineY, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = palette.maroon;
  context.font = '700 15px "DM Sans", sans-serif';
  context.textAlign = "center";
  context.fillText("M", centre, lineY + 5);
  drawMiniHead(context, bridePhoto, "bride", left + (centre - left) * (state.bride.progress / 100), lineY, palette);
  drawMiniHead(context, groomPhoto, "groom", right - (right - centre) * (state.groom.progress / 100), lineY, palette);

  const averageProgress = (state.bride.progress + state.groom.progress) / 2;
  const secondsLeft = ((100 - averageProgress) / 100) * (TARGET_RUN_DURATION_MS / 1_000);
  context.fillStyle = palette.cream;
  context.font = '600 16px "DM Sans", sans-serif';
  context.fillText(averageProgress >= 99.9 ? "Welcome to the Mandap" : `Mandap in ${formatCountdown(secondsLeft)}`, centre, 62);

  context.textAlign = "right";
  context.fillStyle = palette.cream;
  context.font = '700 22px "DM Sans", sans-serif';
  context.fillText(state.score.toLocaleString(), 1810, 32);
  context.fillStyle = palette.gold;
  context.font = '600 12px "DM Sans", sans-serif';
  context.fillText("SCORE", 1810, 53);
  for (let index = 0; index < 3; index += 1) {
    drawHeart(context, 1840 + index * 24, 29, 13, index < state.hearts ? palette.marigold : palette.secondary);
  }
  if (state.boostRemainingMs > 0) {
    context.textAlign = "center";
    context.fillStyle = palette.marigold;
    context.font = '700 15px "DM Sans", sans-serif';
    context.fillText(`DHOL BOOST ${(state.boostRemainingMs / 1_000).toFixed(1)}s`, 1480, 59);
  }
}

function spawnConfetti(
  particles: ConfettiPiece[],
  x: number,
  y: number,
  count: number,
  palette: CanvasPalette,
  fireworks = false,
) {
  const colors = [palette.marigold, palette.gold, palette.brideRed, palette.maroon, palette.cream];
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = fireworks ? 3 + Math.random() * 8 : 2 + Math.random() * 8;
    const colorIndex = Math.floor(Math.random() * colors.length);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (fireworks ? 1 : 4),
      life: fireworks ? 1_800 + Math.random() * 1_300 : 1_900 + Math.random() * 1_600,
      rotation: Math.random() * Math.PI,
      rotationSpeed: (Math.random() - 0.5) * 0.25,
      size: fireworks ? 5 + Math.random() * 8 : 8 + Math.random() * 12,
      color: colors[colorIndex] ?? palette.marigold,
      round: Math.random() > 0.55,
    });
  }
}

function drawParticles(context: CanvasRenderingContext2D, particles: ConfettiPiece[], deltaMs: number) {
  for (let index = particles.length - 1; index >= 0; index -= 1) {
    const particle = particles[index];
    if (!particle) continue;
    const seconds = deltaMs / 16.67;
    particle.x += particle.vx * seconds;
    particle.y += particle.vy * seconds;
    particle.vy += 0.13 * seconds;
    particle.life -= deltaMs;
    particle.rotation += particle.rotationSpeed * seconds;
    if (particle.life <= 0 || particle.y > RUNNER_LOGICAL_HEIGHT + 50) {
      particles.splice(index, 1);
      continue;
    }
    context.save();
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation);
    context.fillStyle = particle.color;
    if (particle.round) {
      context.beginPath();
      context.arc(0, 0, particle.size / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size * 0.62);
    }
    context.restore();
  }
}

function drawSpeedEffects(
  context: CanvasRenderingContext2D,
  laneTop: number,
  worldTime: number,
  palette: CanvasPalette,
) {
  context.save();
  context.strokeStyle = palette.gold;
  context.lineWidth = 3;
  context.globalAlpha = 0.48;
  for (let index = 0; index < 16; index += 1) {
    const x = (index * 173 + worldTime * 0.6) % RUNNER_LOGICAL_WIDTH;
    const y = laneTop + 120 + ((index * 67) % 280);
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x - 80 - (index % 3) * 30, y);
    context.stroke();
  }
  context.restore();
}

function drawFrame(
  context: CanvasRenderingContext2D,
  simulation: RunnerSimulation,
  config: GameConfigDraft,
  roomCode: string,
  palette: CanvasPalette,
  backgroundImage: HTMLImageElement,
  finaleImage: HTMLImageElement,
  bridePhoto: HTMLImageElement | null,
  groomPhoto: HTMLImageElement | null,
  elapsed: number,
  deltaMs: number,
  particles: ConfettiPiece[],
  reducedEffects: boolean,
  countdown: string | null,
) {
  const state = simulation.state;
  context.fillStyle = palette.background;
  context.fillRect(0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);

  if (state.status === "complete") {
    if (finaleImage.complete && finaleImage.naturalWidth > 0) {
      context.drawImage(finaleImage, 0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);
    }
    drawCharacter(context, "bride", state.bride, bridePhoto, palette, 850, 887, reducedEffects);
    drawCharacter(context, "groom", state.groom, groomPhoto, palette, 1_080, 887, reducedEffects);
    drawParticles(context, particles, deltaMs);
    return;
  }

  const boosted = state.boostRemainingMs > 0;
  if (boosted) {
    const strength = Math.min(1, state.boostRemainingMs / 450);
    context.translate(Math.sin(elapsed * 0.11) * 5 * strength, Math.cos(elapsed * 0.14) * 3 * strength);
  }

  const laneRoles: PartnerRole[] = ["bride", "groom"];
  laneRoles.forEach((role, laneIndex) => {
    const laneTop = laneIndex * RUNNER_LANE_HEIGHT;
    const lane = state[role];
    const groundY = laneTop + GROUND_OFFSET;
    drawLaneBackground(context, backgroundImage, laneTop, lane.animationTimeMs, laneIndex, palette);
    if (lane.progress >= 85) {
      const approach = Math.min(1, (100 - lane.progress) / 15);
      const mandapX = PLAYER_X + approach * (RUNNER_LOGICAL_WIDTH - PLAYER_X - 110);
      drawMandap(context, mandapX, groundY, palette);
    }
    drawTrackItems(context, laneTop, lane.progress, simulation.track, lane.processedItemIds, palette);
    if (boosted) drawSpeedEffects(context, laneTop, lane.animationTimeMs, palette);
    drawCharacter(
      context,
      role,
      lane,
      role === "bride" ? bridePhoto : groomPhoto,
      palette,
      PLAYER_X,
      groundY,
      reducedEffects,
    );
    drawRoleLabel(context, role, lane, groundY, palette);
    drawForegroundPetals(context, laneTop, lane.animationTimeMs, palette, reducedEffects);
    if (lane.gateStopped && state.gatePopupRemainingMs === 0) {
      context.save();
      context.globalAlpha = 0.9;
      context.fillStyle = palette.card;
      context.beginPath();
      context.roundRect(1_350, laneTop + 310, 360, 90, 18);
      context.fill();
      context.restore();
      context.font = '700 25px "DM Sans", sans-serif';
      context.fillStyle = palette.maroon;
      context.textAlign = "center";
      context.fillText("Waiting for partner", 1_530, laneTop + 362, 330);
    }
  });

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.fillStyle = palette.maroon;
  context.fillRect(0, RUNNER_LANE_HEIGHT - 4, RUNNER_LOGICAL_WIDTH, 8);
  context.fillStyle = palette.gold;
  context.fillRect(0, RUNNER_LANE_HEIGHT, RUNNER_LOGICAL_WIDTH, 3);
  drawParticles(context, particles, deltaMs);
  drawTopBar(context, simulation, config, roomCode, bridePhoto, groomPhoto, palette);

  if (countdown) {
    context.save();
    context.fillStyle = palette.maroon;
    context.globalAlpha = 0.28;
    context.fillRect(0, TOP_BAR_HEIGHT, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT - TOP_BAR_HEIGHT);
    context.globalAlpha = 0.96;
    context.beginPath();
    context.arc(RUNNER_LOGICAL_WIDTH / 2, RUNNER_LOGICAL_HEIGHT / 2, 116, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 8;
    context.stroke();
    context.fillStyle = palette.cream;
    context.font = countdown === "GO!" ? '700 88px "DM Sans", sans-serif' : '700 112px "DM Sans", sans-serif';
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(countdown, RUNNER_LOGICAL_WIDTH / 2, RUNNER_LOGICAL_HEIGHT / 2 + 4);
    context.restore();
  }
}

export const RunnerCanvas = forwardRef<RunnerCanvasHandle, RunnerCanvasProps>(function RunnerCanvas(
  { roomCode, config, practiceBots, onState, onMilestone, onHeartsRefilled, onSoundEffect, onFinale },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<RunnerSimulation | null>(null);
  const particlesRef = useRef<ConfettiPiece[]>([]);
  const countdownStartedAtRef = useRef<number | null>(null);
  const finaleSentRef = useRef(false);
  const callbackRefs = useRef({ onState, onMilestone, onHeartsRefilled, onSoundEffect, onFinale });
  const botRef = useRef(practiceBots);

  useEffect(() => {
    callbackRefs.current = { onState, onMilestone, onHeartsRefilled, onSoundEffect, onFinale };
  }, [onFinale, onHeartsRefilled, onMilestone, onSoundEffect, onState]);

  useEffect(() => {
    botRef.current = practiceBots;
  }, [practiceBots]);

  useImperativeHandle(
    ref,
    () => ({
      jump: (role) => simulationRef.current?.jump(role),
      pause: () => {
        const simulation = simulationRef.current;
        if (!simulation) return;
        simulation.pause();
        callbackRefs.current.onState(simulation.getGameState());
      },
      resume: () => {
        const simulation = simulationRef.current;
        if (!simulation) return;
        simulation.resume();
        callbackRefs.current.onState(simulation.getGameState());
      },
      skipToNextMilestone: () => {
        const simulation = simulationRef.current;
        if (!simulation) return;
        simulation.skipToNextMilestone();
        callbackRefs.current.onState(simulation.getGameState());
      },
      restart: () => {
        const simulation = simulationRef.current;
        if (!simulation) return;
        simulation.restart();
        particlesRef.current.length = 0;
        countdownStartedAtRef.current = performance.now();
        finaleSentRef.current = false;
        callbackRefs.current.onState(simulation.getGameState());
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const palette = readPalette();
    const backgroundImage = loadImage(runnerBackground);
    const finaleImage = loadImage(mandapBackground);
    const bridePhotoUrl = config.brideFacePhoto ? getPublicMediaUrl(config.brideFacePhoto) : null;
    const groomPhotoUrl = config.groomFacePhoto ? getPublicMediaUrl(config.groomFacePhoto) : null;
    const bridePhoto = bridePhotoUrl ? loadImage(bridePhotoUrl) : null;
    const groomPhoto = groomPhotoUrl ? loadImage(groomPhotoUrl) : null;
    const simulation = new RunnerSimulation(roomCode, config, botRef.current);
    simulationRef.current = simulation;
    const particles: ConfettiPiece[] = [];
    particlesRef.current = particles;
    countdownStartedAtRef.current = null;
    finaleSentRef.current = false;
    let frameId = 0;
    let lastFrame = 0;
    let lastStateSentAt = 0;
    let lastFireworkAt = 0;
    let fpsWindowStart = 0;
    let fpsFrames = 0;
    let reduceEffects = false;

    const loop = (time: number) => {
      const delta = lastFrame === 0 ? 0 : Math.min(time - lastFrame, 50);
      lastFrame = time;
      if (fpsWindowStart === 0) fpsWindowStart = time;
      fpsFrames += 1;
      if (time - fpsWindowStart >= 1_000) {
        const fps = (fpsFrames * 1_000) / (time - fpsWindowStart);
        if (fps < 50) reduceEffects = true;
        else if (fps > 56) reduceEffects = false;
        fpsWindowStart = time;
        fpsFrames = 0;
      }

      if (countdownStartedAtRef.current === null) countdownStartedAtRef.current = time;
      const countdownElapsed = time - countdownStartedAtRef.current;
      const countingDown = countdownElapsed < START_COUNTDOWN_MS;
      const countdown = countingDown
        ? countdownElapsed < 750
          ? "3"
          : countdownElapsed < 1_500
            ? "2"
            : countdownElapsed < 2_250
              ? "1"
              : "GO!"
        : null;

      simulation.practiceBots = botRef.current;
      const events = countingDown
        ? { milestone: null, heartsRefilled: null, finale: false, heartCollected: false, flowerCollected: false, dholCollected: false, stumbled: false }
        : simulation.update(delta);
      if (countingDown) {
        simulation.state.bride.jumpRemainingMs = 0;
        simulation.state.groom.jumpRemainingMs = 0;
      }
      if (events.milestone) {
        spawnConfetti(particles, RUNNER_LOGICAL_WIDTH / 2, RUNNER_LOGICAL_HEIGHT / 2, reduceEffects ? 34 : 90, palette);
        callbackRefs.current.onMilestone(events.milestone);
      }
      if (events.heartsRefilled) callbackRefs.current.onHeartsRefilled(events.heartsRefilled);
      if (events.heartCollected || events.flowerCollected || events.dholCollected) callbackRefs.current.onSoundEffect("collect");
      if (events.stumbled) callbackRefs.current.onSoundEffect("stumble");
      if (events.finale && !finaleSentRef.current) {
        finaleSentRef.current = true;
        spawnConfetti(particles, RUNNER_LOGICAL_WIDTH / 2, 220, reduceEffects ? 90 : 220, palette, true);
        callbackRefs.current.onSoundEffect("finale");
        callbackRefs.current.onFinale();
      }
      if (simulation.state.status === "complete" && time - lastFireworkAt > 850) {
        lastFireworkAt = time;
        spawnConfetti(
          particles,
          180 + Math.random() * (RUNNER_LOGICAL_WIDTH - 360),
          80 + Math.random() * 400,
          reduceEffects ? 12 : 34,
          palette,
          true,
        );
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);
      drawFrame(
        context,
        simulation,
        config,
        roomCode,
        palette,
        backgroundImage,
        finaleImage,
        bridePhoto,
        groomPhoto,
        time,
        delta,
        particles,
        reduceEffects,
        countdown,
      );
      if (time - lastStateSentAt >= 200) {
        lastStateSentAt = time;
        callbackRefs.current.onState(simulation.getGameState());
      }
      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frameId);
      simulationRef.current = null;
      particlesRef.current = [];
    };
  }, [config, roomCode]);

  return (
    <canvas
      ref={canvasRef}
      width={RUNNER_LOGICAL_WIDTH}
      height={RUNNER_LOGICAL_HEIGHT}
      className="runner-canvas block h-full w-full"
      role="img"
      aria-label="Love Story Runner: bride and groom running together through the wedding garden"
    />
  );
});
