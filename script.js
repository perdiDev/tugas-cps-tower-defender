/* ================================================
   AA TURRET SIMULATOR - Three.js Implementation
   ================================================ */

// ============================================
// GLOBAL VARIABLES & STATE
// ============================================

// Scene, Renderers, and Cameras
let scene, externalCamera, scopeCamera;
let leftRenderer, rightRenderer;

// 3D Objects
let turret = {
    base: null,
    head: null,     // Rotates horizontally (yaw)
    pivot: null,    // Rotates vertically (pitch)
    cannon: null,
    yaw: 0,         // Horizontal rotation in radians
    pitch: 0        // Vertical rotation in radians
};
let airplane = null;
let ground = null;
let projectiles = [];

// Raycasting & Target Lock
// Raycasting & Target Lock
let raycaster = new THREE.Raycaster();
let isTargetLocked = false;
let isAutoTargeting = false; // Auto-targeting state
let clock = new THREE.Clock(); // Clock for time-based animation

// Input State
let keys = {
    left: false,
    right: false,
    up: false,
    down: false,
    down: false,
    space: false,
    t: false // Toggle auto-targeting
};

// Arduino State
let serialPort = null;
let serialReader = null;
let arduinoState = {
    pot: 512,
    potYaw: 512,
    fire: 0,
    lastFire: 0
};

// Game State
let hitCount = 0;
let airplaneHealth = 3;
const MAX_HEALTH = 3;

// Constants
const TURRET_ROTATION_SPEED = 0.02;
const TURRET_PITCH_SPEED = 0.015;
const MIN_PITCH = -5 * (Math.PI / 180);  // -5 degrees
const MAX_PITCH = 70 * (Math.PI / 180);  // +70 degrees
const PROJECTILE_SPEED = 1.5;
const TURRET_POSITION = new THREE.Vector3(0, 0, 0);
// Lowered airplane slightly and moved closer for better visibility
const AIRPLANE_POSITION = new THREE.Vector3(0, 25, -60);
let zoomLevel = 15; // Initial zoom distance for external camera

// ============================================
// INITIALIZATION FUNCTIONS
// ============================================

/**
 * Initialize the entire application
 */
function init() {
    console.log("Initializing AA Turret Simulator...");

    initScene();
    initLighting();
    initObjects();
    initCameras();
    initRenderers();
    setupEventListeners();

    console.log("Initialization complete!");

    // Start animation loop
    animate();
}

/**
 * Create the main 3D scene
 */
function initScene() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0e27);
    // Fog is useful for depth, but we'll disable it for scope view in render loop
    scene.fog = new THREE.Fog(0x0a0e27, 20, 150);
}

/**
 * Add lighting to the scene
 */
function initLighting() {
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    // Directional light for shadows and depth
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Additional rim light for visual interest
    const rimLight = new THREE.DirectionalLight(0x4080ff, 0.5);
    rimLight.position.set(-10, 10, -10);
    scene.add(rimLight);
}

/**
 * Create all 3D objects in the scene
 */
function initObjects() {
    createGround();
    createTurret();
    createAirplane();
}

/**
 * Create the ground plane
 */
function createGround() {
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a2a1a,
        roughness: 0.8,
        metalness: 0.2
    });

    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;

    scene.add(ground);

    // Add grid helper for better depth perception
    const gridHelper = new THREE.GridHelper(200, 40, 0x00ff00, 0x003300);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);
}

/**
 * Create the AA Turret with yaw and pitch mechanisms
 */
function createTurret() {
    // 1. Static Base
    const baseGeometry = new THREE.CylinderGeometry(3, 4, 2, 8);
    const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x333333,
        roughness: 0.7,
        metalness: 0.5
    });
    turret.base = new THREE.Mesh(baseGeometry, baseMaterial);
    turret.base.position.set(0, 1, 0);
    turret.base.castShadow = true;
    scene.add(turret.base);

    // 2. Rotating Head (Yaw)
    const headGeometry = new THREE.BoxGeometry(4, 2, 4);
    const headMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a6e4a,
        roughness: 0.6,
        metalness: 0.4
    });
    turret.head = new THREE.Mesh(headGeometry, headMaterial);
    turret.head.position.set(0, 2, 0);
    turret.head.castShadow = true;
    scene.add(turret.head); // Add to scene, but we'll sync position

    // 3. Cannon Pivot (Pitch) - Attached to Head
    // This empty object will be the pivot point for vertical rotation
    turret.pivot = new THREE.Group();
    turret.pivot.position.set(0, 0, 0); // Relative to head center
    turret.head.add(turret.pivot);

    // 4. Cannon Barrels - Attached to Pivot
    const cannonGroup = new THREE.Group();

    // Main Barrel
    const barrelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 8, 16);
    const barrelMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        roughness: 0.4,
        metalness: 0.8
    });
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2; // Point forward
    barrel.position.set(0, 0, 4); // Extend forward
    barrel.castShadow = true;
    cannonGroup.add(barrel);

    // Barrel Housing
    const housingGeometry = new THREE.BoxGeometry(1.5, 1.5, 3);
    const housing = new THREE.Mesh(housingGeometry, headMaterial);
    housing.position.set(0, 0, 0);
    cannonGroup.add(housing);

    turret.cannon = cannonGroup;
    turret.pivot.add(turret.cannon);
}

/**
 * Create the airplane target
 */
function createAirplane() {
    const airplaneGroup = new THREE.Group();

    // Make airplane larger and more visible

    // Fuselage - White for visibility
    // Align along Z axis (nose at +Z, tail at -Z)
    const fuselageGeometry = new THREE.CylinderGeometry(1, 1, 12, 16);
    const fuselageMaterial = new THREE.MeshStandardMaterial({
        color: 0xffffff, // White
        roughness: 0.3,
        metalness: 0.5,
        emissive: 0x222222
    });
    const fuselage = new THREE.Mesh(fuselageGeometry, fuselageMaterial);
    fuselage.rotation.x = Math.PI / 2; // Cylinder default is Y-up, rotate to Z-aligned
    airplaneGroup.add(fuselage);

    // Wings - Red accents
    // Wings extend along X axis
    const wingGeometry = new THREE.BoxGeometry(24, 0.4, 4);
    const wingMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000, // Red
        roughness: 0.3,
        metalness: 0.5
    });
    const wing = new THREE.Mesh(wingGeometry, wingMaterial);
    wing.position.set(0, 0, 2); // Slightly forward
    airplaneGroup.add(wing);

    // Tail
    const tailGeometry = new THREE.BoxGeometry(6, 4, 0.4);
    const tail = new THREE.Mesh(tailGeometry, wingMaterial);
    tail.position.set(0, 2, -5); // Back and up
    airplaneGroup.add(tail);

    // Cockpit
    const cockpitGeometry = new THREE.SphereGeometry(1.2, 16, 16);
    const cockpitMaterial = new THREE.MeshStandardMaterial({
        color: 0x00aaff,
        roughness: 0.1,
        metalness: 0.9
    });
    const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
    cockpit.position.set(0, 1, 3); // Forward and up
    cockpit.scale.set(1, 1, 1.5);
    airplaneGroup.add(cockpit);

    airplane = airplaneGroup;
    airplane.position.copy(AIRPLANE_POSITION);
    airplane.castShadow = true;
    scene.add(airplane);
}

/**
 * Initialize both cameras
 */
function initCameras() {
    // External Camera (third-person view)
    const aspect1 = 0.6; // Approximate aspect ratio for left viewport
    externalCamera = new THREE.PerspectiveCamera(60, aspect1, 0.1, 1000);
    externalCamera.position.set(15, 10, 15);
    externalCamera.lookAt(0, 5, 0);

    // Scope Camera (first-person from cannon)
    const aspect2 = 0.4 / 0.6; // Approximate aspect ratio for right viewport
    scopeCamera = new THREE.PerspectiveCamera(40, aspect2, 0.1, 1000);

    // Attach scope camera directly to the cannon pivot so it moves with it
    // MOVED FORWARD to avoid clipping into turret body/housing
    // Old: (0, 0.8, -1) -> New: (0, 1.2, 2.0)
    // This places it clearly in front of the pivot point and housing
    scopeCamera.position.set(0, 1.2, 2.0);

    // Look forward along the barrel
    scopeCamera.lookAt(0, 1.2, 20);

    // Add camera to the pivot object so it inherits all rotations automatically
    turret.pivot.add(scopeCamera);
}

/**
 * Initialize both renderers for dual viewports
 */
function initRenderers() {
    // Left Renderer (External View)
    const leftCanvas = document.getElementById('canvas-left');
    leftRenderer = new THREE.WebGLRenderer({ canvas: leftCanvas, antialias: true });
    leftRenderer.setSize(leftCanvas.clientWidth, leftCanvas.clientHeight);
    leftRenderer.shadowMap.enabled = true;

    // Right Renderer (Scope View)
    const rightCanvas = document.getElementById('canvas-right');
    rightRenderer = new THREE.WebGLRenderer({ canvas: rightCanvas, antialias: true });
    rightRenderer.setSize(rightCanvas.clientWidth, rightCanvas.clientHeight);
    rightRenderer.shadowMap.enabled = true;
}

// ============================================
// INPUT & EVENT HANDLING
// ============================================

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Keyboard controls
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Fire button
    document.getElementById('fire-button').addEventListener('click', fireProjectile);

    // Connect Arduino button
    document.getElementById('connect-button').addEventListener('click', connectArduino);

    // Window resize
    window.addEventListener('resize', onWindowResize);

    // Zoom control
    window.addEventListener('wheel', onMouseWheel);
}

/**
 * Handle mouse wheel for zoom
 */
function onMouseWheel(event) {
    // Zoom in/out
    zoomLevel += event.deltaY * 0.05;
    // Clamp zoom
    zoomLevel = Math.max(5, Math.min(50, zoomLevel));
}

/**
 * Handle key down events
 */
function onKeyDown(event) {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = true;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = true;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = true;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = true;
            break;
        case ' ':
            event.preventDefault();
            if (!keys.space) {
                keys.space = true;
                fireProjectile();
            }
            break;
        case 't':
        case 'T':
            if (!keys.t) {
                keys.t = true;
                isAutoTargeting = !isAutoTargeting;
                const lockStatus = document.getElementById('lock-status');
                if (isAutoTargeting) {
                    lockStatus.textContent = "AUTO-TARGETING ACTIVE";
                    lockStatus.style.color = "#00ff00";
                } else {
                    lockStatus.textContent = "SCANNING";
                    lockStatus.style.color = "#ff0000";
                }
                console.log("Auto-targeting:", isAutoTargeting);
            }
            break;
    }
}

/**
 * Handle key up events
 */
function onKeyUp(event) {
    switch (event.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
            keys.left = false;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            keys.right = false;
            break;
        case 'ArrowUp':
        case 'w':
        case 'W':
            keys.up = false;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            keys.down = false;
            break;
        case ' ':
            keys.space = false;
            break;
        case 't':
        case 'T':
            keys.t = false;
            break;
    }
}

/**
 * Handle window resize
 */
function onWindowResize() {
    const leftCanvas = document.getElementById('canvas-left');
    const rightCanvas = document.getElementById('canvas-right');

    // Update cameras
    externalCamera.aspect = leftCanvas.clientWidth / leftCanvas.clientHeight;
    externalCamera.updateProjectionMatrix();

    scopeCamera.aspect = rightCanvas.clientWidth / rightCanvas.clientHeight;
    scopeCamera.updateProjectionMatrix();

    // Update renderers
    leftRenderer.setSize(leftCanvas.clientWidth, leftCanvas.clientHeight);
    rightRenderer.setSize(rightCanvas.clientWidth, rightCanvas.clientHeight);
}

// ============================================
// ARDUINO SERIAL CONNECTION
// ============================================

/**
 * Connect to Arduino via Web Serial API
 */
async function connectArduino() {
    if (!navigator.serial) {
        alert("Web Serial API not supported in this browser. Use Chrome or Edge.");
        return;
    }

    try {
        // Request port
        serialPort = await navigator.serial.requestPort();
        await serialPort.open({ baudRate: 9600 });

        const button = document.getElementById('connect-button');
        button.textContent = "CONNECTED";
        button.style.background = "#00aa00";

        // Start reading loop
        readSerialLoop();

    } catch (error) {
        console.error("Arduino connection error:", error);
        alert("Failed to connect: " + error.message);
    }
}

/**
 * Read data loop from serial port
 */
async function readSerialLoop() {
    const textDecoder = new TextDecoderStream();
    const readableStreamClosed = serialPort.readable.pipeTo(textDecoder.writable);
    const reader = textDecoder.readable.getReader();
    serialReader = reader;

    let buffer = "";

    try {
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += value;

            // Process lines
            const lines = buffer.split('\n');
            buffer = lines.pop(); // Keep incomplete line in buffer

            for (const line of lines) {
                parseArduinoData(line.trim());
            }
        }
    } catch (error) {
        console.error("Serial read error:", error);
    } finally {
        reader.releaseLock();
    }
}

/**
 * Parse incoming Arduino data string
 * Format: "pot,left,right,fire" (e.g., "512,0,0,1")
 */
function parseArduinoData(data) {
    const parts = data.split(',');
    if (parts.length !== 3) return;

    const pot = parseInt(parts[0]);
    const potYaw = parseInt(parts[1]);
    const fire = parseInt(parts[2]);

    // Update state
    arduinoState.pot = pot;
    arduinoState.potYaw = potYaw;

    // Fire logic (edge detection)
    if (fire === 1 && arduinoState.lastFire === 0) {
        fireProjectile();
    }
    arduinoState.lastFire = fire;
    arduinoState.fire = fire;
}

// ============================================
// CONTROL & UPDATE LOGIC
// ============================================

/**
 * Update turret rotation based on input (Keyboard + Arduino)
 */
function updateControls() {
    // Yaw Control (Horizontal)
    if (keys.left) {
        turret.yaw += TURRET_ROTATION_SPEED;
    }
    if (keys.right) {
        turret.yaw -= TURRET_ROTATION_SPEED;
    }

    // Apply Yaw
    turret.head.rotation.y = turret.yaw;

    // Pitch Control (Vertical)
    // Keyboard
    if (keys.up) {
        turret.pitch += TURRET_PITCH_SPEED;
    }
    if (keys.down) {
        turret.pitch -= TURRET_PITCH_SPEED;
    }

    // Arduino Potentiometer Override (if connected)
    // Arduino Potentiometer Override (if connected)
    if (serialPort) {
        // Yaw Control (Velocity)
        // Center ~512. < 480 = Left, > 540 = Right
        const yawVal = arduinoState.potYaw;
        if (yawVal < 480) {
            // Map 480-0 to 0-1 speed
            const speed = (480 - yawVal) / 480.0;
            turret.yaw += TURRET_ROTATION_SPEED * speed * 2.0; // 2x multiplier for responsiveness
        } else if (yawVal > 540) {
            // Map 540-1023 to 0-1 speed
            const speed = (yawVal - 540) / (1023 - 540);
            turret.yaw -= TURRET_ROTATION_SPEED * speed * 2.0;
        }

        // Pitch Control (Absolute)
        // Map 0-1023 to MIN_PITCH - MAX_PITCH
        // Invert logic: 0 = Down, 1023 = Up
        const t = arduinoState.pot / 1023.0;
        const targetPitch = MIN_PITCH + (MAX_PITCH - MIN_PITCH) * t;

        // Smoothly interpolate to target pitch to avoid jitter
        turret.pitch = turret.pitch * 0.8 + targetPitch * 0.2;
    }

    // Clamp Pitch
    turret.pitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, turret.pitch));

    // Apply Pitch (Negative X rotation for upward tilt in Three.js)
    turret.pivot.rotation.x = -turret.pitch;
}

/**
 * Update airplane position (fly around)
 */
function updateAirplane(deltaTime) {
    if (!airplane || !airplane.visible) return;

    const time = clock.getElapsedTime();

    // Circular path parameters
    const radius = 80;
    const speed = 0.5;
    const height = 30;

    // Calculate new position
    const x = Math.sin(time * speed) * radius;
    const z = Math.cos(time * speed) * radius - 40; // Offset z to keep it in front mostly
    const y = height + Math.sin(time * speed * 2) * 10; // Bob up and down slightly

    // Update position
    airplane.position.set(x, y, z);

    // Rotate to face direction of movement
    // Tangent vector of circle is (-cos, sin)
    // We can just look at the next position
    const nextX = Math.sin((time + 0.1) * speed) * radius;
    const nextZ = Math.cos((time + 0.1) * speed) * radius - 40;
    const nextY = height + Math.sin((time + 0.1) * speed * 2) * 10;

    airplane.lookAt(nextX, nextY, nextZ);

    // BANKING (Roll)
    // Bank into the turn. For a left turn (counter-clockwise), we bank left (negative Z rotation local).
    // Our path is clockwise or counter-clockwise?
    // x = sin(t), z = cos(t). This is clockwise looking from top?
    // Let's just calculate a bank angle based on the "centripetal" feel.
    // Fixed bank for circular motion is simple and effective.
    // We can also add some dynamic banking based on the "bobbing" (Y change).

    const bankAngle = -Math.PI / 4; // 45 degrees bank
    // We need to apply this LOCALLY. lookAt resets rotation.
    airplane.rotateZ(bankAngle);
}

/**
 * Handle Auto-Targeting Logic with Prediction
 */
function updateAutoTargeting() {
    if (!isAutoTargeting || !airplane || !airplane.visible) return;

    // 1. Calculate Target Velocity
    // We need the velocity vector to predict where it will be.
    // Since we don't store velocity explicitly on the airplane object in a physics way,
    // we can calculate it from the parametric equation derivative or finite difference.
    // Parametric derivative is cleaner.

    const time = clock.getElapsedTime();
    const speed = 0.5;
    const radius = 80;

    // Position derivatives (velocity)
    // x = sin(t*s) * r  => vx = cos(t*s) * s * r
    // z = cos(t*s) * r  => vz = -sin(t*s) * s * r
    // y = ...           => vy = ...

    const vx = Math.cos(time * speed) * speed * radius;
    const vz = -Math.sin(time * speed) * speed * radius;
    const vy = Math.cos(time * speed * 2) * speed * 2 * 10;

    const targetVelocity = new THREE.Vector3(vx, vy, vz);

    // 2. Predictive Aiming
    // We want to hit the target at some future time t.
    // FuturePos = CurrentPos + TargetVel * t
    // ProjectilePos = TurretPos + MuzzleVel * t
    // We need to solve for t such that |FuturePos - TurretPos| = ProjectileSpeed * t
    // This is a quadratic equation, but for simplicity, we can approximate t
    // based on current distance and projectile speed.

    const currentDist = airplane.position.distanceTo(turret.head.position);
    const timeToImpact = currentDist / PROJECTILE_SPEED;

    // Predict future position
    const futurePos = airplane.position.clone().add(targetVelocity.multiplyScalar(timeToImpact));

    // Aim at FUTURE position
    const targetPos = futurePos;

    // 3. Calculate Yaw (Horizontal)
    const dx = targetPos.x - turret.head.position.x;
    const dz = targetPos.z - turret.head.position.z;

    let targetYaw = Math.atan2(dx, dz);

    // Smoothly interpolate yaw
    let yawDiff = targetYaw - turret.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;

    turret.yaw += yawDiff * 0.1;

    // Apply Yaw
    turret.head.rotation.y = turret.yaw;

    // 4. Calculate Pitch (Vertical)
    const distXZ = Math.sqrt(dx * dx + dz * dz);
    const dy = targetPos.y - turret.head.position.y;

    // Ballistic arc correction?
    // Projectiles fly straight in this sim (no gravity on projectiles yet),
    // so we just aim directly at the predicted point.
    let targetPitch = Math.atan2(dy, distXZ);

    // Clamp pitch
    targetPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, targetPitch));

    // Smoothly interpolate pitch
    turret.pitch += (targetPitch - turret.pitch) * 0.1;

    // Apply Pitch
    turret.pivot.rotation.x = -turret.pitch;
}

/**
 * Update target lock detection using raycasting
 */
function updateTargetLock() {
    // Since scope camera is attached to the cannon, we can just raycast from its center
    raycaster.setFromCamera(new THREE.Vector2(0, 0), scopeCamera);

    // Check if ray intersects with airplane
    const intersects = raycaster.intersectObject(airplane, true);

    const crosshair = document.getElementById('crosshair');
    const lockStatus = document.getElementById('lock-status');

    if (intersects.length > 0 && airplane.visible) {
        // Target is locked
        if (!isTargetLocked) {
            isTargetLocked = true;
            crosshair.classList.add('locked');
            lockStatus.textContent = 'TARGET LOCKED';
        }
    } else {
        // Target not in sight
        if (isTargetLocked) {
            isTargetLocked = false;
            crosshair.classList.remove('locked');
            lockStatus.textContent = 'SCANNING';
        }
    }
}

/**
 * Update external camera to follow turret loosely
 */
function updateExternalCamera() {
    // Position camera relative to turret yaw
    const offset = new THREE.Vector3(0, zoomLevel * 0.6, zoomLevel);
    offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), turret.yaw * 0.5); // Rotate partially with turret

    const targetPos = turret.head.position.clone().add(offset);
    externalCamera.position.lerp(targetPos, 0.05);
    externalCamera.lookAt(turret.head.position.clone().add(new THREE.Vector3(0, 2, 0)));
}

// ============================================
// PROJECTILE & FIRING SYSTEM
// ============================================

/**
 * Fire a projectile from the cannon
 */
function fireProjectile() {
    console.log("FIRE! Pitch:", (turret.pitch * 180 / Math.PI).toFixed(1));

    // Calculate muzzle position (world coordinates)
    const muzzlePos = new THREE.Vector3(0, 0, 8); // Tip of barrel relative to pivot
    muzzlePos.applyMatrix4(turret.pivot.matrixWorld);

    // Calculate firing direction
    // We can get the forward vector of the pivot object in world space
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(turret.pivot.getWorldQuaternion(new THREE.Quaternion()));
    direction.normalize();

    // Create projectile
    const projectileGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const projectileMaterial = new THREE.MeshStandardMaterial({
        color: 0xffff00,
        emissive: 0xffaa00,
        emissiveIntensity: 1.0
    });
    const projectile = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectile.position.copy(muzzlePos);

    // Add trail effect
    const trailGeometry = new THREE.CylinderGeometry(0.1, 0.05, 2, 6);
    const trailMaterial = new THREE.MeshBasicMaterial({
        color: 0xff6600,
        transparent: true,
        opacity: 0.5
    });
    const trail = new THREE.Mesh(trailGeometry, trailMaterial);
    trail.rotation.x = Math.PI / 2;
    trail.position.z = -1;
    projectile.add(trail);

    scene.add(projectile);

    // Store projectile data
    projectiles.push({
        mesh: projectile,
        direction: direction,
        lifetime: 0
    });

    // Visual/audio feedback
    flashFireButton();

    // Recoil animation (simple)
    const originalZ = turret.cannon.position.z;
    turret.cannon.position.z -= 0.5;
    setTimeout(() => {
        turret.cannon.position.z = originalZ;
    }, 100);
}

/**
 * Update all active projectiles
 */
function updateProjectiles() {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];

        // Move projectile
        proj.mesh.position.add(proj.direction.clone().multiplyScalar(PROJECTILE_SPEED));
        proj.lifetime++;

        // Check collision with airplane
        // Simple distance check
        const distance = proj.mesh.position.distanceTo(airplane.position);

        // Use a slightly larger hit radius for gameplay feel
        if (distance < 8 && airplane.visible) { // Increased hit radius for larger plane
            // HIT!
            console.log("HIT!");
            onHit();

            // Remove projectile
            scene.remove(proj.mesh);
            projectiles.splice(i, 1);
            continue;
        }

        // Remove if too old or too far
        if (proj.lifetime > 200 || proj.mesh.position.length() > 300) {
            scene.remove(proj.mesh);
            projectiles.splice(i, 1);
        }
    }
}

/**
 * Handle airplane hit
 */
function onHit() {
    hitCount++;
    document.getElementById('hits').textContent = hitCount;

    // Decrease health
    airplaneHealth--;

    if (airplaneHealth <= 0) {
        destroyAirplane();
    } else {
        // Flash airplane
        const originalColor = airplane.children[0].material.color.clone();
        airplane.children.forEach(child => {
            if (child.material) {
                child.material.color.set(0xff0000);
                child.material.emissive.set(0xff0000);
                child.material.emissiveIntensity = 0.5;
            }
        });

        setTimeout(() => {
            airplane.children.forEach(child => {
                if (child.material) {
                    child.material.color.copy(originalColor);
                    child.material.emissive.set(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            });
        }, 150);

        // Add small explosion effect
        createExplosion(airplane.position, 0.5);
    }
}

/**
 * Destroy the airplane and trigger respawn
 */
function destroyAirplane() {
    // Big explosion
    createExplosion(airplane.position, 2.0);

    // Hide airplane
    airplane.visible = false;

    // Reset lock
    isTargetLocked = false;
    document.getElementById('crosshair').classList.remove('locked');
    document.getElementById('lock-status').textContent = 'SCANNING';

    // Respawn after delay
    setTimeout(respawnAirplane, 2000);
}

/**
 * Respawn airplane at random position
 */
function respawnAirplane() {
    // Random position
    const x = (Math.random() - 0.5) * 100; // -50 to 50
    const y = 20 + Math.random() * 30;     // 20 to 50
    const z = -40 - Math.random() * 60;    // -100 to -40

    airplane.position.set(x, y, z);
    airplane.visible = true;
    airplaneHealth = MAX_HEALTH;

    console.log("Airplane respawned at:", x.toFixed(0), y.toFixed(0), z.toFixed(0));
}

/**
 * Create explosion effect at position
 * @param {THREE.Vector3} position 
 * @param {number} scale Scale of the explosion
 */
function createExplosion(position, scale = 1.0) {
    const particleCount = 30 * scale;
    const particles = [];

    for (let i = 0; i < particleCount; i++) {
        const particleGeometry = new THREE.SphereGeometry(0.3 * scale, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: Math.random() > 0.5 ? 0xff6600 : 0xffff00
        });
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.position.copy(position);

        const velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.8 * scale,
            (Math.random() - 0.5) * 0.8 * scale,
            (Math.random() - 0.5) * 0.8 * scale
        );

        scene.add(particle);
        particles.push({ mesh: particle, velocity: velocity, lifetime: 0 });
    }

    // Animate particles
    const animateExplosion = () => {
        let activeParticles = false;

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.mesh.position.add(p.velocity);
            p.velocity.multiplyScalar(0.92); // Drag
            p.mesh.scale.multiplyScalar(0.9); // Shrink
            p.lifetime++;

            if (p.lifetime > 40) {
                scene.remove(p.mesh);
                particles.splice(i, 1);
            } else {
                activeParticles = true;
            }
        }

        if (activeParticles) {
            requestAnimationFrame(animateExplosion);
        }
    };

    animateExplosion();
}

/**
 * Flash fire button
 */
function flashFireButton() {
    const button = document.getElementById('fire-button');
    button.style.background = 'linear-gradient(135deg, #ffff00 0%, #ff6600 100%)';
    setTimeout(() => {
        button.style.background = 'linear-gradient(135deg, #ff0000 0%, #cc0000 100%)';
    }, 100);
}

// ============================================
// ANIMATION LOOP
// ============================================

/**
 * Main animation loop
 */
function animate() {
    requestAnimationFrame(animate);

    // Update controls and logic
    // Move airplane
    updateAirplane();

    // Auto-targeting
    if (isAutoTargeting) {
        updateAutoTargeting();
    } else {
        updateControls(); // Only allow manual control if auto-targeting is OFF
    }

    updateTargetLock();
    updateExternalCamera();
    updateProjectiles();

    // Move airplane slightly for challenge (optional)
    // airplane.position.x = Math.sin(Date.now() * 0.0005) * 20;

    // Render Left Viewport (External) - WITH FOG
    scene.fog.near = 20;
    scene.fog.far = 150;
    leftRenderer.render(scene, externalCamera);

    // Render Right Viewport (Scope) - WITHOUT FOG
    // We push fog far away to effectively disable it
    scene.fog.near = 10000;
    scene.fog.far = 20000;
    rightRenderer.render(scene, scopeCamera);
}

// ============================================
// START APPLICATION
// ============================================

// Wait for DOM to be ready, then initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
