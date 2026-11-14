import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { FilesetResolver, PoseLandmarker, HandLandmarker } from '@mediapipe/tasks-vision';

const q = (s) => document.querySelector(s);

const video = q('#mvv');
const overlay = q('#mvhand');
const octx = overlay.getContext('2d');
const toggle = q('#mvaibtn');
const indicator = q('#mvhandind');

let cocoModel = null;
let poseLandmarker = null;
let handLandmarker = null;
let loading = false;
let enabled = false;
let raf = 0;
let lastVideoTime = -1;
let frameCount = 0;
let fpsTime = performance.now();
let fps = 0;
let detectEvery = 3;
let frameIdx = 0;

let nextTrackId = 1;
const tracked = [];
const LOST_FRAMES = 12;
const IOU_THRESHOLD = 0.4;
const MAX_BOXES = 20;
const SMOOTH = 0.6;

let selectedTrackId = null;
let detectionMode = 'general';
const CONFIDENCE_THRESHOLD = 0.58;
const MAX_VISIBLE_TRACKS = 8;
let onDetections = null;
let onSceneAnalysis = null;

const POSE_CONNECTIONS = [
  [11,12],[11,13],[13,15],[12,14],[14,16],
  [11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28],
  [27,29],[29,31],[27,31],[28,30],[30,32],[28,32],
  [15,17],[15,19],[15,21],[17,19],[16,18],[16,20],[16,22],
  [0,11],[0,12],
];

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17],
];

let poseData = [];
let handData = [];
let handGesture = { name: 'NONE', confidence: 0, stable: false, pointing: false };
let gestureCandidate = 'NONE';
let gestureFrames = 0;

function resizeOverlay() {
  const box = q('#mvbox');
  const w = box.clientWidth;
  const h = box.clientHeight;
  if (overlay.width !== w) overlay.width = w;
  if (overlay.height !== h) overlay.height = h;
}

async function ensureModels() {
  if ((cocoModel || loading) && (poseLandmarker || loading)) return;
  loading = true;
  indicator.textContent = 'Loading AI models (object + pose + hand)...';
  try {
    await tf.ready();
    try { await tf.setBackend('webgl'); } catch(e) {}
    const tasks = [
      cocoSsd.load({ base: 'lite_mobilenet_v2' }).then((m) => { cocoModel = m; }),
    ];

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );
      tasks.push(
        PoseLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numPoses: 3,
        }).then((m) => { poseLandmarker = m; }).catch(() => {})
      );
      tasks.push(
        HandLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task', delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 4,
        }).then((m) => { handLandmarker = m; }).catch(() => {})
      );
    } catch(e) {}

    await Promise.all(tasks);

    if (!cocoModel) throw new Error('COCO-SSD failed');
    const parts = [];
    if (poseLandmarker) parts.push('pose');
    if (handLandmarker) parts.push('hand');
    indicator.textContent = `AI ready: objects${parts.length ? ' + ' + parts.join(' + ') : ''}. Processing locally.`;
  } catch (err) {
    indicator.textContent = 'AI detection unavailable: could not load the models.';
    cocoModel = null;
    enabled = false;
    toggle.innerHTML = '<span class="mv-ic-l">AI</span>';
    toggle.disabled = false;
  }
  loading = false;
}

function clearOverlay() {
  octx.clearRect(0, 0, overlay.width, overlay.height);
}

function videoToOverlay(bbox) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const ow = overlay.width;
  const oh = overlay.height;
  const vAspect = vw / vh;
  const oAspect = ow / oh;
  let scale, offsetX, offsetY;
  if (vAspect > oAspect) {
    scale = oh / vh;
    offsetX = (ow - vw * scale) / 2;
    offsetY = 0;
  } else {
    scale = ow / vw;
    offsetX = 0;
    offsetY = (oh - vh * scale) / 2;
  }
  return [
    offsetX + bbox[0] * scale,
    offsetY + bbox[1] * scale,
    bbox[2] * scale,
    bbox[3] * scale,
  ];
}

function videoPointToOverlay(p) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;
  const ow = overlay.width;
  const oh = overlay.height;
  const vAspect = vw / vh;
  const oAspect = ow / oh;
  let scale, offsetX, offsetY;
  if (vAspect > oAspect) {
    scale = oh / vh;
    offsetX = (ow - vw * scale) / 2;
    offsetY = 0;
  } else {
    scale = ow / vw;
    offsetX = 0;
    offsetY = (oh - vh * scale) / 2;
  }
  return { x: offsetX + p.x * vw * scale, y: offsetY + p.y * vh * scale, visibility: p.visibility };
}

function iou(a, b) {
  const ax1 = a[0], ay1 = a[1], ax2 = a[0] + a[2], ay2 = a[1] + a[3];
  const bx1 = b[0], by1 = b[1], bx2 = b[0] + b[2], by2 = b[1] + b[3];
  const ix1 = Math.max(ax1, bx1), iy1 = Math.max(ay1, by1);
  const ix2 = Math.min(ax2, bx2), iy2 = Math.min(ay2, by2);
  const iw = Math.max(0, ix2 - ix1), ih = Math.max(0, iy2 - iy1);
  const inter = iw * ih;
  const union = a[2] * a[3] + b[2] * b[3] - inter;
  return union > 0 ? inter / union : 0;
}

function smoothBox(oldB, newB) {
  if (!oldB) return newB;
  return [
    oldB[0] * SMOOTH + newB[0] * (1 - SMOOTH),
    oldB[1] * SMOOTH + newB[1] * (1 - SMOOTH),
    oldB[2] * SMOOTH + newB[2] * (1 - SMOOTH),
    oldB[3] * SMOOTH + newB[3] * (1 - SMOOTH),
  ];
}

function updateTracking(detections) {
  const matched = new Set();
  const matchedTrk = new Set();

  for (let i = 0; i < detections.length; i++) {
    const det = detections[i];
    let bestIdx = -1;
    let bestIou = IOU_THRESHOLD;
    for (let j = 0; j < tracked.length; j++) {
      if (matchedTrk.has(j)) continue;
      const score = iou(det.bbox, tracked[j].bbox);
      if (score > bestIou) {
        bestIou = score;
        bestIdx = j;
      }
    }
    if (bestIdx >= 0) {
      tracked[bestIdx].bbox = smoothBox(tracked[bestIdx].bbox, det.bbox);
      tracked[bestIdx].class = det.class;
      tracked[bestIdx].score = det.score;
      tracked[bestIdx].lostFrames = 0;
      tracked[bestIdx].state = 'tracked';
      tracked[bestIdx].age++;
      matched.add(i);
      matchedTrk.add(bestIdx);
    } else {
      tracked.push({
        id: nextTrackId++,
        bbox: det.bbox,
        class: det.class,
        score: det.score,
        lostFrames: 0,
        state: 'new',
        age: 1,
      });
      matched.add(i);
    }
  }

  for (let j = 0; j < tracked.length; j++) {
    if (!matchedTrk.has(j)) {
      tracked[j].lostFrames++;
      if (tracked[j].lostFrames === 1) tracked[j].state = 'lost';
      if (tracked[j].lostFrames > LOST_FRAMES) {
        if (tracked[j].id === selectedTrackId) selectedTrackId = null;
        tracked.splice(j, 1);
        j--;
      }
    }
  }

  for (let j = 0; j < tracked.length; j++) {
    if (tracked[j].state === 'new' && tracked[j].age > 3) {
      tracked[j].state = 'tracked';
    }
  }
}

function shouldDrawObject(t) {
  if (t.score < CONFIDENCE_THRESHOLD || t.state === 'lost') return false;
  if (detectionMode === 'hand' || detectionMode === 'body') return false;
  if (detectionMode === 'object' && t.class === 'person') return false;
  if (detectionMode === 'minimal' && t.id !== selectedTrackId && t.class !== 'person') return false;
  return true;
}

function drawBox(t) {
  if (!shouldDrawObject(t)) return;
  const mapped = videoToOverlay(t.bbox);
  if (!mapped) return;
  const [x, y, w, h] = mapped;
  const isSelected = t.id === selectedTrackId;
  const color = isSelected ? '#e8c24a' : t.class === 'person' ? '#19e3ff' : 'rgba(25,227,255,.72)';
  const cornerLen = Math.max(8, Math.min(w, h) * 0.14);
  octx.strokeStyle = color;
  octx.lineWidth = isSelected ? 1.8 : 1;
  octx.globalAlpha = isSelected ? 1 : .72;
  octx.beginPath();
  octx.moveTo(x, y + cornerLen); octx.lineTo(x, y); octx.lineTo(x + cornerLen, y);
  octx.moveTo(x + w - cornerLen, y); octx.lineTo(x + w, y); octx.lineTo(x + w, y + cornerLen);
  octx.moveTo(x + w, y + h - cornerLen); octx.lineTo(x + w, y + h); octx.lineTo(x + w - cornerLen, y + h);
  octx.moveTo(x + cornerLen, y + h); octx.lineTo(x, y + h); octx.lineTo(x, y + h - cornerLen);
  octx.stroke();
  octx.globalAlpha = 1;
  if (isSelected || (detectionMode === 'object' && t.age < 5)) {
    const label = `${t.class.toUpperCase()} · ${(t.score * 100).toFixed(0)}% · ${String(t.id).padStart(2, '0')}`;
    octx.font = '600 8px "Chakra Petch", monospace';
    const lw = octx.measureText(label).width;
    const ly = y - 13 < 0 ? y + h + 2 : y - 13;
    octx.fillStyle = 'rgba(5,15,30,.78)';
    octx.fillRect(x, ly, lw + 6, 12);
    octx.fillStyle = color;
    octx.fillText(label, x + 3, ly + 9);
  }
  if (isSelected) {
    octx.strokeStyle = '#e8c24a';
    octx.setLineDash([3, 3]);
    octx.strokeRect(x, y, w, h);
    octx.setLineDash([]);
  }
}

function drawPoses(landmarksList) {
  if (!landmarksList || detectionMode === 'hand' || detectionMode === 'object' || detectionMode === 'minimal') return;
  for (const landmarks of landmarksList) {
    octx.strokeStyle = 'rgba(25,227,255,0.62)';
    octx.lineWidth = 1.2;
    for (const [a, b] of POSE_CONNECTIONS) {
      const la = landmarks[a];
      const lb = landmarks[b];
      if (!la || !lb) continue;
      if ((la.visibility || 0) < 0.3 || (lb.visibility || 0) < 0.3) continue;
      const pa = videoPointToOverlay(la);
      const pb = videoPointToOverlay(lb);
      if (!pa || !pb) continue;
      octx.beginPath();
      octx.moveTo(pa.x, pa.y);
      octx.lineTo(pb.x, pb.y);
      octx.stroke();
    }
    octx.fillStyle = '#19e3ff';
    for (const lm of landmarks) {
      if ((lm.visibility || 0) < 0.3) continue;
      const p = videoPointToOverlay(lm);
      if (!p) continue;
      octx.beginPath();
      octx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      octx.fill();
    }
  }
}

function drawHands(landmarksList, handedness) {
  if (!landmarksList || detectionMode === 'body' || detectionMode === 'object' || detectionMode === 'minimal') return;
  landmarksList.forEach((landmarks, i) => {
    const handed = handedness && handedness[i] ? handedness[i][0].categoryName : 'H';
    octx.strokeStyle = 'rgba(232,194,74,0.68)';
    octx.lineWidth = 1.1;
    for (const [a, b] of HAND_CONNECTIONS) {
      const pa = videoPointToOverlay(landmarks[a]);
      const pb = videoPointToOverlay(landmarks[b]);
      if (!pa || !pb) continue;
      octx.beginPath();
      octx.moveTo(pa.x, pa.y);
      octx.lineTo(pb.x, pb.y);
      octx.stroke();
    }
    octx.fillStyle = '#e8c24a';
    for (const lm of landmarks) {
      const p = videoPointToOverlay(lm);
      if (!p) continue;
      octx.beginPath();
      octx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      octx.fill();
    }
    if (landmarks[0]) {
      const p = videoPointToOverlay(landmarks[0]);
      if (p) {
        if (detectionMode === 'hand') {
          octx.fillStyle = '#e8c24a';
          octx.font = '600 8px "Chakra Petch", monospace';
          octx.fillText(handed.toUpperCase(), p.x + 6, p.y - 3);
        }
      }
    }
  });
}

function classifyGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return { name: 'NONE', confidence: 0, pointing: false };
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const extended = [8, 12, 16, 20].filter((tip) => landmarks[tip].y < landmarks[tip - 2].y).length;
  const pinchDistance = dist(landmarks[4], landmarks[8]);
  const pointing = landmarks[8].y < landmarks[6].y && extended === 1;
  if (pinchDistance < 0.055) return { name: 'PINCH', confidence: Math.min(1, (0.055 - pinchDistance) / 0.03 + 0.7), pointing: false };
  if (pointing) return { name: 'POINTING', confidence: 0.82, pointing: true };
  if (extended >= 4) return { name: 'OPEN PALM', confidence: 0.9, pointing: false };
  if (extended === 0) return { name: 'FIST', confidence: 0.86, pointing: false };
  return { name: 'HAND', confidence: 0.55, pointing: false };
}

function pointAtObject(landmarks) {
  if (!landmarks || !landmarks[8] || !landmarks[6]) return null;
  const tip = landmarks[8];
  const base = landmarks[6];
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  if (Math.hypot(dx, dy) < 0.04) return null;
  let best = null;
  let bestScore = 0.14;
  for (const track of tracked) {
    if (track.state === 'lost' || track.class === 'person') continue;
    const cx = (track.bbox[0] + track.bbox[2] / 2) / video.videoWidth;
    const cy = (track.bbox[1] + track.bbox[3] / 2) / video.videoHeight;
    const vx = cx - tip.x;
    const vy = cy - tip.y;
    const length = Math.hypot(vx, vy);
    if (!length) continue;
    const alignment = (dx * vx + dy * vy) / (Math.hypot(dx, dy) * length);
    const score = alignment - Math.min(length, 1) * 0.12;
    if (alignment > 0.72 && score > bestScore) { bestScore = score; best = track; }
  }
  return best;
}

function updateGesture() {
  const candidate = classifyGesture(handData[0]);
  if (candidate.name === gestureCandidate) gestureFrames += 1;
  else { gestureCandidate = candidate.name; gestureFrames = 1; }
  const stable = gestureFrames >= 3;
  const pointed = candidate.pointing && pointAtObject(handData[0]);
  if (pointed) selectedTrackId = pointed.id;
  handGesture = { ...candidate, stable, pointing: !!pointed, selected: pointed || null };
}

function drawVisorOverlay() {
  const ow = overlay.width;
  const oh = overlay.height;
  const m = 14;

  octx.strokeStyle = 'rgba(25,227,255,0.25)';
  octx.lineWidth = 1;
  const cl = 20;
  octx.beginPath();
  octx.moveTo(m, m + cl); octx.lineTo(m, m); octx.lineTo(m + cl, m);
  octx.moveTo(ow - m - cl, m); octx.lineTo(ow - m, m); octx.lineTo(ow - m, m + cl);
  octx.moveTo(ow - m, oh - m - cl); octx.lineTo(ow - m, oh - m); octx.lineTo(ow - m - cl, oh - m);
  octx.moveTo(m + cl, oh - m); octx.lineTo(m, oh - m); octx.lineTo(m, oh - m - cl);
  octx.stroke();

  octx.fillStyle = 'rgba(25,227,255,0.35)';
  octx.font = '7px "Chakra Petch", monospace';
  octx.fillText('FOV', m + 4, m + 12);
  octx.fillText('CAL', ow - m - 18, m + 12);
  octx.fillText('REC', m + 4, oh - m - 3);
  octx.fillText('VIS', ow - m - 18, oh - m - 3);

  const cx = ow / 2;
  const cy = oh / 2;
  octx.strokeStyle = 'rgba(25,227,255,0.3)';
  octx.lineWidth = 1;
  octx.beginPath();
  octx.arc(cx, cy, 28, 0, Math.PI * 2);
  octx.stroke();
  octx.beginPath();
  octx.moveTo(cx - 8, cy); octx.lineTo(cx + 8, cy);
  octx.moveTo(cx, cy - 8); octx.lineTo(cx, cy + 8);
  octx.stroke();
}

function drawScanLine() {
  const ow = overlay.width;
  const oh = overlay.height;
  const t = (performance.now() / 1000) % 4;
  const sy = (t / 4) * oh;
  const grad = octx.createLinearGradient(0, sy - 25, 0, sy + 25);
  grad.addColorStop(0, 'rgba(25,227,255,0)');
  grad.addColorStop(0.5, 'rgba(25,227,255,0.08)');
  grad.addColorStop(1, 'rgba(25,227,255,0)');
  octx.fillStyle = grad;
  octx.fillRect(0, sy - 25, ow, 50);
}

function buildSceneAnalysis() {
  const active = tracked.filter((t) => t.state !== 'lost');
  if (active.length === 0 && poseData.length === 0 && handData.length === 0) {
    return 'No objects detected. Scanning scene...';
  }
  const parts = [];
  const people = active.filter((t) => t.class === 'person');
  const objects = active.filter((t) => t.class !== 'person');
  if (people.length > 0) parts.push(`${people.length} person${people.length > 1 ? 's' : ''}`);
  if (objects.length > 0) {
    const groups = {};
    for (const t of objects) groups[t.class] = (groups[t.class] || 0) + 1;
    const objParts = Object.entries(groups).map(([cls, count]) => `${count} ${cls}${count > 1 ? 's' : ''}`);
    parts.push(`${objects.length} object${objects.length > 1 ? 's' : ''} (${objParts.join(', ')})`);
  }
  if (poseData.length > 0) parts.push(`pose: ${poseData.length} active`);
  if (handData.length > 0) parts.push(`hands: ${handData.length}`);
  const activeIds = active.length;
  parts.push(`tracking: ${activeIds} ID${activeIds !== 1 ? 's' : ''}`);
  return parts.join(' · ');
}

function loop() {
  raf = requestAnimationFrame(loop);
  if (!enabled || !cocoModel || video.paused || video.ended) {
    clearOverlay();
    return;
  }
  resizeOverlay();
  clearOverlay();
  drawVisorOverlay();
  drawScanLine();

  frameCount++;
  const now = performance.now();
  if (now - fpsTime > 1000) {
    fps = Math.round((frameCount * 1000) / (now - fpsTime));
    frameCount = 0;
    fpsTime = now;
  }

  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const detectTime = performance.now();

    frameIdx++;

    if (frameIdx % detectEvery === 0) {
      cocoModel.detect(video, MAX_BOXES).then((predictions) => {
        const detections = predictions
          .filter((p) => p.score >= CONFIDENCE_THRESHOLD)
          .sort((a, b) => b.score - a.score)
          .slice(0, MAX_VISIBLE_TRACKS)
          .map((p) => ({ class: p.class, score: p.score, bbox: p.bbox }));
        updateTracking(detections);
        for (const t of tracked) drawBox(t);

        if (poseLandmarker) {
          try {
            const pres = poseLandmarker.detectForVideo(video, detectTime);
            poseData = pres.landmarks || [];
            drawPoses(poseData);
          } catch(e) {}
        }
        if (handLandmarker) {
          try {
            const hres = handLandmarker.detectForVideo(video, detectTime);
            handData = hres.landmarks || [];
            updateGesture();
            drawHands(handData, hres.handedness);
          } catch(e) {}
        }

        const activeCount = tracked.filter((t) => t.state !== 'lost').length;
        const selTrack = tracked.find((t) => t.id === selectedTrackId);
        const peopleCount = tracked.filter((t) => t.state !== 'lost' && t.class === 'person').length;
        const objCount = activeCount - peopleCount;

        if (activeCount > 0) {
          indicator.textContent = `${peopleCount}P ${objCount}O · ${fps}FPS · ${poseData.length}pose ${handData.length}hand · Local`;
        } else {
          indicator.textContent = `Scanning · ${fps}FPS · Local processing`;
        }

        if (onDetections) {
          onDetections({
            count: activeCount,
            people: peopleCount,
            objects: objCount,
            poses: poseData.length,
            hands: handData.length,
            tracks: tracked.filter((t) => t.state !== 'lost'),
            selected: selTrack || null,
            fps,
            mode: detectionMode,
            gesture: handGesture,
            models: { object: !!cocoModel, pose: !!poseLandmarker, hand: !!handLandmarker },
          });
        }
        if (onSceneAnalysis) onSceneAnalysis(buildSceneAnalysis());
      }).catch(() => {});
    } else {
      for (const t of tracked) drawBox(t);
      drawPoses(poseData);
      drawHands(handData);
    }
  }
}

function hitTest(px, py) {
  for (let i = tracked.length - 1; i >= 0; i--) {
    const t = tracked[i];
    if (t.state === 'lost') continue;
    const mapped = videoToOverlay(t.bbox);
    if (!mapped) continue;
    const [x, y, w, h] = mapped;
    if (px >= x && px <= x + w && py >= y && py <= y + h) return t;
  }
  return null;
}

overlay.style.pointerEvents = 'auto';
overlay.addEventListener('click', (e) => {
  if (!enabled) return;
  const rect = overlay.getBoundingClientRect();
  const px = (e.clientX - rect.left) * (overlay.width / rect.width);
  const py = (e.clientY - rect.top) * (overlay.height / rect.height);
  const hit = hitTest(px, py);
  if (hit) {
    selectedTrackId = selectedTrackId === hit.id ? null : hit.id;
  } else {
    selectedTrackId = null;
  }
});

toggle.onclick = async () => {
  if (enabled) {
    enabled = false;
    toggle.innerHTML = '<span class="mv-ic-l">AI</span>';
    indicator.textContent = '';
    selectedTrackId = null;
    tracked.length = 0;
    poseData = [];
    handData = [];
    handGesture = { name: 'NONE', confidence: 0, stable: false, pointing: false };
    clearOverlay();
    cancelAnimationFrame(raf);
    if (onDetections) onDetections({ count: 0, people: 0, objects: 0, poses: 0, hands: 0, tracks: [], selected: null, fps: 0, models: { object: false, pose: false, hand: false } });
    if (onSceneAnalysis) onSceneAnalysis('');
    return;
  }
  toggle.disabled = true;
  toggle.innerHTML = '<span class="mv-ic-l">···</span>';
  await ensureModels();
  toggle.disabled = false;
  if (!cocoModel) return;
  enabled = true;
  toggle.innerHTML = '<span class="mv-ic-l">AI·</span>';
  indicator.textContent = 'AI detection active. Processing locally.';
  raf = requestAnimationFrame(loop);
};

video.addEventListener('emptied', () => {
  if (enabled) {
    enabled = false;
    toggle.innerHTML = '<span class="mv-ic-l">AI</span>';
    indicator.textContent = '';
    selectedTrackId = null;
    tracked.length = 0;
    poseData = [];
    handData = [];
    handGesture = { name: 'NONE', confidence: 0, stable: false, pointing: false };
    clearOverlay();
    cancelAnimationFrame(raf);
  }
});

window.addEventListener('pagehide', () => {
  enabled = false;
  cancelAnimationFrame(raf);
  if (cocoModel) cocoModel.dispose();
  if (poseLandmarker) poseLandmarker.close();
  if (handLandmarker) handLandmarker.close();
});

export function stopVisionDetection() {
  enabled = false;
  toggle.textContent = 'AI DETECT';
  indicator.textContent = '';
  selectedTrackId = null;
  tracked.length = 0;
  poseData = [];
  handData = [];
  clearOverlay();
  cancelAnimationFrame(raf);
  if (onDetections) onDetections({ count: 0, people: 0, objects: 0, poses: 0, hands: 0, tracks: [], selected: null, fps: 0, models: { object: false, pose: false, hand: false } });
  if (onSceneAnalysis) onSceneAnalysis('');
}

export function setDetectionMode(mode) {
  const allowed = ['general', 'hand', 'body', 'object', 'minimal'];
  detectionMode = allowed.includes(mode) ? mode : 'general';
}
export function getDetectionMode() { return detectionMode; }
export function setDetectionsCallback(fn) { onDetections = fn; }
export function setSceneAnalysisCallback(fn) { onSceneAnalysis = fn; }
export function getSelectedTrack() { return tracked.find((t) => t.id === selectedTrackId) || null; }
export function clearSelection() { selectedTrackId = null; }
