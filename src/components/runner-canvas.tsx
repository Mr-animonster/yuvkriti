import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";

import runnerBackground from "@/assets/wedding-runner-background.png";
import mandapBackground from "@/assets/wedding-mandap-finale.png";
import type { GameConfigDraft, GameStateMessage, PartnerRole } from "@/lib/love-story-types";
import { RunnerSimulation, RUNNER_LANE_HEIGHT, RUNNER_LOGICAL_HEIGHT, RUNNER_LOGICAL_WIDTH } from "@/lib/runner-engine";
import { getPublicMediaUrl } from "@/lib/game-config";

export interface RunnerCanvasHandle {
  jump: (role: PartnerRole) => void;
}

interface RunnerCanvasProps {
  roomCode: string;
  config: GameConfigDraft;
  practiceBots: boolean;
  onState: (state: GameStateMessage) => void;
  onMilestone: (milestone: GameConfigDraft["milestones"][number]) => void;
  onHeartsRefilled: (message: string) => void;
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
  context.drawImage(
    image,
    0,
    sourceTop,
    image.naturalWidth,
    sourceHeight,
    firstX,
    laneTop,
    tileWidth,
    tileHeight,
  );
  context.save();
  context.translate(firstX + tileWidth * 2, 0);
  context.scale(-1, 1);
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
  context.drawImage(
    image,
    0,
    sourceTop,
    image.naturalWidth,
    sourceHeight,
    firstX + tileWidth * 2,
    laneTop,
    tileWidth,
    tileHeight,
  );
  context.restore();
}

function drawFlower(context: CanvasRenderingContext2D, x: number, y: number, size: number, palette: CanvasPalette) {
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
  elapsed: number,
  laneIndex: number,
  palette: CanvasPalette,
) {
  context.fillStyle = palette.cream;
  context.fillRect(0, laneTop, RUNNER_LOGICAL_WIDTH, RUNNER_LANE_HEIGHT);
  const farOffset = (elapsed * 0.009 + laneIndex * 740) % RUNNER_LOGICAL_WIDTH;
  drawBackLayer(context, image, laneTop, farOffset);

  const nearOffset = (elapsed * 0.028 + laneIndex * 360) % RUNNER_LOGICAL_WIDTH;
  context.save();
  context.globalAlpha = 0.58;
  for (let x = -80 - nearOffset; x < RUNNER_LOGICAL_WIDTH + 100; x += 320) {
    drawFlower(context, x, laneTop + 376 + (laneIndex % 2) * 8, 15, palette);
    context.strokeStyle = palette.maroon;
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(x, laneTop + 388);
    context.lineTo(x - 16, laneTop + 424);
    context.stroke();
  }
  context.restore();

  const floorY = laneTop + 435;
  context.fillStyle = palette.maroon;
  context.fillRect(0, floorY, RUNNER_LOGICAL_WIDTH, 7);
  context.fillStyle = palette.gold;
  context.fillRect(0, floorY + 7, RUNNER_LOGICAL_WIDTH, 5);
  context.fillStyle = palette.secondary;
  context.fillRect(0, floorY + 12, RUNNER_LOGICAL_WIDTH, RUNNER_LANE_HEIGHT - (floorY - laneTop) - 12);
  context.fillStyle = palette.maroon;
  context.globalAlpha = 0.18;
  for (let x = -nearOffset; x < RUNNER_LOGICAL_WIDTH; x += 100) {
    context.fillRect(x, floorY + 38, 34, 3);
  }
  context.globalAlpha = 1;
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
  const width = 182;
  const height = 73;
  context.fillStyle = palette.maroon;
  context.fillRect(x - 3, y + height, 6, 48);
  context.beginPath();
  context.roundRect(x - width / 2, y, width, height, 11);
  context.fillStyle = palette.card;
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = palette.gold;
  context.stroke();
  context.fillStyle = palette.maroon;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `700 ${label.length > 18 ? 15 : 18}px "DM Sans", sans-serif`;
  context.fillText(label, x, y + height / 2, width - 18);
}

function drawTrackItems(
  context: CanvasRenderingContext2D,
  laneTop: number,
  laneProgress: number,
  items: RunnerSimulation["track"],
  processed: Set<string>,
  palette: CanvasPalette,
) {
  const viewDistance = 18;
  const playerX = 310;
  for (const item of items) {
    if (processed.has(item.id)) continue;
    const distance = item.progress - laneProgress;
    if (distance < -1 || distance > viewDistance) continue;
    const x = playerX + (distance / viewDistance) * (RUNNER_LOGICAL_WIDTH - playerX - 110);

    if (item.kind === "obstacle") {
      drawObstacleSign(context, x, laneTop + 286, item.label, palette);
      context.fillStyle = palette.marigold;
      context.beginPath();
      context.arc(x, laneTop + 434, 22, 0, Math.PI * 2);
      context.fill();
    } else if (item.kind === "heart") {
      drawHeart(context, x, laneTop + 328, 36, palette.brideRed);
      context.beginPath();
      context.arc(x, laneTop + 330, 34, 0, Math.PI * 2);
      context.lineWidth = 3;
      context.strokeStyle = palette.gold;
      context.stroke();
    } else {
      drawFlower(context, x, laneTop + 330, 23, palette);
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
    context.arc(centerX - 18, centerY, 5, 0, Math.PI * 2);
    context.arc(centerX + 18, centerY, 5, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = palette.foreground;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(centerX, centerY + 10, 16, 0.2, Math.PI - 0.2);
    context.stroke();
  }
  context.restore();
  context.beginPath();
  context.arc(centerX, centerY, radius + 5, 0, Math.PI * 2);
  context.lineWidth = 9;
  context.strokeStyle = palette.gold;
  context.stroke();
}

function drawCharacter(
  context: CanvasRenderingContext2D,
  role: PartnerRole,
  laneTop: number,
  lane: RunnerSimulation["state"]["bride"],
  faceImage: HTMLImageElement | null,
  palette: CanvasPalette,
  x: number,
  baseY: number,
  elapsed: number,
) {
  const jumping = lane.jumpRemainingMs > 0;
  const jumpProgress = jumping ? 1 - lane.jumpRemainingMs / 1_450 : 0;
  const jumpOffset = jumping ? Math.sin(jumpProgress * Math.PI) * 100 : 0;
  const stumble = lane.stumbleRemainingMs > 0;
  const bounce = jumping ? 0 : Math.sin((lane.animationTimeMs + elapsed) * 0.014) * 4;
  const swing = Math.sin((lane.animationTimeMs + elapsed) * 0.018) * 25;

  context.save();
  context.translate(x, baseY - jumpOffset + bounce);
  if (stumble) context.rotate(Math.sin(elapsed * 0.045) * 0.11);

  context.lineCap = "round";
  context.lineWidth = 18;
  context.strokeStyle = palette.maroon;
  context.beginPath();
  context.moveTo(-18, -28);
  context.lineTo(-24 + swing * 0.6, -2);
  context.lineTo(-28 + swing, 0);
  context.moveTo(18, -28);
  context.lineTo(26 - swing * 0.6, -2);
  context.lineTo(30 - swing, 0);
  context.stroke();

  if (role === "bride") {
    context.beginPath();
    context.moveTo(-35, -174);
    context.quadraticCurveTo(-64, -107, -94, -8);
    context.quadraticCurveTo(0, 14, 94, -8);
    context.quadraticCurveTo(64, -107, 35, -174);
    context.closePath();
    context.fillStyle = palette.brideRed;
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 9;
    context.beginPath();
    context.quadraticCurveTo(0, 8, 92, -8);
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
    context.strokeStyle = palette.maroon;
    context.lineWidth = 18;
    context.beginPath();
    context.moveTo(-18, -30);
    context.lineTo(-26 - swing * 0.7, -1);
    context.moveTo(18, -30);
    context.lineTo(26 + swing * 0.7, -1);
    context.stroke();
    context.fillStyle = palette.maroon;
    context.beginPath();
    context.roundRect(-42, -198, 84, 180, 20);
    context.fill();
    context.strokeStyle = palette.gold;
    context.lineWidth = 6;
    context.beginPath();
    context.moveTo(0, -194);
    context.lineTo(0, -28);
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
  context.lineTo(-54 - swing * 0.45, -112);
  context.moveTo(34, -168);
  context.lineTo(54 + swing * 0.45, -112);
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
  void laneTop;
}

function drawLabel(context: CanvasRenderingContext2D, label: string, x: number, y: number, palette: CanvasPalette) {
  context.fillStyle = palette.card;
  context.beginPath();
  context.roundRect(x, y, 178, 44, 18);
  context.fill();
  context.strokeStyle = palette.gold;
  context.lineWidth = 3;
  context.stroke();
  context.font = '700 19px "DM Sans", sans-serif';
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = palette.maroon;
  context.fillText(label, x + 89, y + 22, 160);
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

function drawFrame(
  context: CanvasRenderingContext2D,
  simulation: RunnerSimulation,
  palette: CanvasPalette,
  backgroundImage: HTMLImageElement,
  finaleImage: HTMLImageElement,
  bridePhoto: HTMLImageElement | null,
  groomPhoto: HTMLImageElement | null,
  elapsed: number,
  deltaMs: number,
  particles: ConfettiPiece[],
) {
  const state = simulation.state;
  context.fillStyle = palette.background;
  context.fillRect(0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);

  if (state.status === "complete") {
    if (finaleImage.complete && finaleImage.naturalWidth > 0) {
      context.drawImage(finaleImage, 0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);
    }
    drawCharacter(context, "bride", 0, state.bride, bridePhoto, palette, 850, 887, elapsed);
    drawCharacter(context, "groom", 0, state.groom, groomPhoto, palette, 1_080, 887, elapsed);
    drawParticles(context, particles, deltaMs);
    return;
  }

  const laneRoles: PartnerRole[] = ["bride", "groom"];
  laneRoles.forEach((role, laneIndex) => {
    const laneTop = laneIndex * RUNNER_LANE_HEIGHT;
    const lane = state[role];
    drawLaneBackground(context, backgroundImage, laneTop, elapsed, laneIndex, palette);
    drawTrackItems(context, laneTop, lane.progress, simulation.track, lane.processedItemIds, palette);
    drawCharacter(
      context,
      role,
      laneTop,
      lane,
      role === "bride" ? bridePhoto : groomPhoto,
      palette,
      310,
      laneTop + 435,
      elapsed,
    );
    drawLabel(context, role === "bride" ? "BRIDE" : "GROOM", 44, laneTop + 28, palette);
    if (lane.gateStopped && state.gatePopupRemainingMs === 0) {
      context.save();
      context.globalAlpha = 0.85;
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

  context.fillStyle = palette.maroon;
  context.fillRect(0, RUNNER_LANE_HEIGHT - 4, RUNNER_LOGICAL_WIDTH, 8);
  context.fillStyle = palette.gold;
  context.fillRect(0, RUNNER_LANE_HEIGHT, RUNNER_LOGICAL_WIDTH, 3);
  drawParticles(context, particles, deltaMs);
}

export const RunnerCanvas = forwardRef<RunnerCanvasHandle, RunnerCanvasProps>(function RunnerCanvas(
  { roomCode, config, practiceBots, onState, onMilestone, onHeartsRefilled, onFinale },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simulationRef = useRef<RunnerSimulation | null>(null);
  const callbackRefs = useRef({ onState, onMilestone, onHeartsRefilled, onFinale });
  const botRef = useRef(practiceBots);

  useEffect(() => {
    callbackRefs.current = { onState, onMilestone, onHeartsRefilled, onFinale };
  }, [onFinale, onHeartsRefilled, onMilestone, onState]);

  useEffect(() => {
    botRef.current = practiceBots;
  }, [practiceBots]);

  useImperativeHandle(
    ref,
    () => ({
      jump: (role) => simulationRef.current?.jump(role),
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
    let frameId = 0;
    let lastFrame = 0;
    let lastStateSentAt = 0;
    let lastFireworkAt = 0;
    let finaleSent = false;

    const loop = (time: number) => {
      const delta = lastFrame === 0 ? 0 : Math.min(time - lastFrame, 50);
      lastFrame = time;
      simulation.practiceBots = botRef.current;
      const events = simulation.update(delta);
      if (events.milestone) {
        spawnConfetti(particles, RUNNER_LOGICAL_WIDTH / 2, RUNNER_LOGICAL_HEIGHT / 2, 90, palette);
        callbackRefs.current.onMilestone(events.milestone);
      }
      if (events.heartsRefilled) callbackRefs.current.onHeartsRefilled(events.heartsRefilled);
      if (events.finale && !finaleSent) {
        finaleSent = true;
        spawnConfetti(particles, RUNNER_LOGICAL_WIDTH / 2, 220, 220, palette, true);
        callbackRefs.current.onFinale();
      }
      if (simulation.state.status === "complete" && time - lastFireworkAt > 850) {
        lastFireworkAt = time;
        spawnConfetti(
          particles,
          180 + Math.random() * (RUNNER_LOGICAL_WIDTH - 360),
          80 + Math.random() * 400,
          34,
          palette,
          true,
        );
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, RUNNER_LOGICAL_WIDTH, RUNNER_LOGICAL_HEIGHT);
      drawFrame(
        context,
        simulation,
        palette,
        backgroundImage,
        finaleImage,
        bridePhoto,
        groomPhoto,
        time,
        delta,
        particles,
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