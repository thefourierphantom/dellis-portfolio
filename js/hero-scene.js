/* ═══════════════════════════════════════════════════════════════
   HERO SCENE — GPS-denied mission environment (Three.js r128)
   Scroll acts as mission timeline:
   NOMINAL → INTERFERENCE → GNSS DENIED → DEAD RECKONING → RESOLVE
   Vehicle: missile with animated propulsion plume + exhaust trail
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  const CE = window.CE = window.CE || {};

  /* value noise -------------------------------------------------- */
  function makeNoise(seed) {
    const perm = new Uint8Array(512);
    let s = seed;
    for (let i = 0; i < 256; i++) perm[i] = i;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = s % (i + 1);
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    for (let i = 0; i < 256; i++) perm[256 + i] = perm[i];
    function fade(t) { return t * t * (3 - 2 * t); }
    function grad(h, x, y) { return ((h & 1) ? -x : x) + ((h & 2) ? -y : y); }
    return function (x, y) {
      const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
      x -= Math.floor(x); y -= Math.floor(y);
      const u = fade(x), v = fade(y);
      const a = perm[X + perm[Y]], b = perm[X + 1 + perm[Y]];
      const c = perm[X + perm[Y + 1]], d = perm[X + 1 + perm[Y + 1]];
      return (grad(a, x, y) * (1 - u) + grad(b, x - 1, y) * u) * (1 - v) +
             (grad(c, x, y - 1) * (1 - u) + grad(d, x - 1, y - 1) * u) * v;
    };
  }

  CE.initHero = function (opts) {
    const container = document.getElementById(opts.container);
    if (!container || !window.THREE) return null;

    // Layout may not be settled when this is called (return visits skip the
    // intro and start instantly). A 0×0 container would create an invisible
    // renderer — wait until the box has real dimensions.
    if (!container.clientWidth || !container.clientHeight) {
      let tries = 120;
      (function waitForLayout() {
        if (container.clientWidth && container.clientHeight) { CE.initHero(opts); }
        else if (tries-- > 0) requestAnimationFrame(waitForLayout);
      })();
      return null;
    }

    const noise = makeNoise(1337);
    const low = CE.lowPower;
    const W = () => container.clientWidth, H = () => container.clientHeight;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: !low, alpha: true, powerPreference: 'high-performance' });
    } catch (e) {
      console.warn('CE hero: WebGL context creation failed', e);
      return null; // WebGL unavailable — page content is unaffected
    }
    renderer.setPixelRatio(CE.dpr);
    renderer.setSize(W(), H());
    container.appendChild(renderer.domElement);

    // If the GPU context dies (bfcache restore, GPU reset, eviction),
    // stop this scene and rebuild a fresh one in its place.
    renderer.domElement.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault();
      console.warn('CE hero: WebGL context lost — rebuilding scene');
      S.running = false;
      setTimeout(function () {
        try { renderer.dispose(); } catch (e) {}
        container.innerHTML = '';
        CE.initHero(opts);
      }, 120);
    }, false);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050607, 0.016);
    const camera = new THREE.PerspectiveCamera(52, W() / H(), 0.1, 400);
    const camBase = new THREE.Vector3(0, 16, 34);
    camera.position.copy(camBase);
    camera.lookAt(0, 2, 0);

    /* terrain ---------------------------------------------------- */
    const SEG = low ? 70 : 130;
    const SIZE = 130;
    function terrainH(x, z) {
      let h = 0, f = 0.028, a = 8.5;
      for (let o = 0; o < 4; o++) { h += noise(x * f + 9, z * f + 9) * a; f *= 2.1; a *= 0.46; }
      const d = Math.hypot(x, z) / (SIZE * 0.5);
      return h * (0.35 + d * 0.9) - 2;
    }
    const tGeo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
    tGeo.rotateX(-Math.PI / 2);
    const tp = tGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) tp.setY(i, terrainH(tp.getX(i), tp.getZ(i)));
    tGeo.computeVertexNormals();
    const terrain = new THREE.Mesh(tGeo, new THREE.MeshBasicMaterial({
      color: 0x39424d, wireframe: true, transparent: true, opacity: 0.30
    }));
    scene.add(terrain);
    const terrainFill = new THREE.Mesh(tGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x07090b, transparent: true, opacity: 0.92 }));
    terrainFill.position.y = -0.08;
    scene.add(terrainFill);

    /* contour rings ---------------------------------------------- */
    if (!low) {
      for (let lvl = 0; lvl < 3; lvl++) {
        const pts = [];
        const y = 1.5 + lvl * 3.2;
        for (let a = 0; a <= 128; a++) {
          const th = a / 128 * Math.PI * 2;
          const r = 26 + lvl * 14 + noise(Math.cos(th) * 2 + lvl, Math.sin(th) * 2) * 6;
          pts.push(new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r));
        }
        scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x2a3038, transparent: true, opacity: 0.35 })));
      }
    }

    /* flight path ------------------------------------------------- */
    const wp = [
      new THREE.Vector3(-52, 0, 26), new THREE.Vector3(-30, 0, 4),
      new THREE.Vector3(-8, 0, 18), new THREE.Vector3(14, 0, -2),
      new THREE.Vector3(34, 0, 12), new THREE.Vector3(52, 0, -10)
    ];
    wp.forEach(p => { p.y = Math.max(terrainH(p.x, p.z), 0) + 7.5; });
    const curve = new THREE.CatmullRomCurve3(wp);
    const pathPts = curve.getPoints(240);

    const flownGeo = new THREE.BufferGeometry();
    const flownPos = new Float32Array(241 * 3);
    flownGeo.setAttribute('position', new THREE.BufferAttribute(flownPos, 3));
    flownGeo.setDrawRange(0, 0);
    const flownLine = new THREE.Line(flownGeo, new THREE.LineBasicMaterial({ color: 0xe2182b, transparent: true, opacity: 0.9 }));
    scene.add(flownLine);

    const planGeo = new THREE.BufferGeometry().setFromPoints(pathPts);
    const planLine = new THREE.Line(planGeo, new THREE.LineDashedMaterial({
      color: 0x9aa1ab, dashSize: 1.2, gapSize: 1.0, transparent: true, opacity: 0.35
    }));
    planLine.computeLineDistances();
    scene.add(planLine);

    /* ═══ MISSILE ═════════════════════════════════════════════════
       Modeled along +Z (forward), so Object3D.lookAt() aims it.
       The missile is lit (phong); the schematic world stays flat.  */
    scene.add(new THREE.HemisphereLight(0x3a4552, 0x05070a, 0.75));
    const keyLight = new THREE.DirectionalLight(0xc2d3ea, 1.0);
    keyLight.position.set(-30, 55, 25);
    scene.add(keyLight);

    const vehicle = new THREE.Group();
    const missile = new THREE.Group();
    vehicle.add(missile);

    const airMat = new THREE.MeshPhongMaterial({ color: 0x525b66, specular: 0x8194ab, shininess: 110 });
    const finMat = new THREE.MeshPhongMaterial({ color: 0x3b434c, specular: 0x6b7b8f, shininess: 80 });

    // airframe — continuous lathe: boat-tail → cylindrical body (forward = +Z)
    const bodyProf = [
      [0.155, -1.12], [0.205, -0.9], [0.22, -0.55], [0.22, 0.6], [0.215, 0.85], [0.19, 1.15]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const bodyGeo = new THREE.LatheGeometry(bodyProf, 24);
    bodyGeo.rotateX(Math.PI / 2);
    missile.add(new THREE.Mesh(bodyGeo, airMat));

    // ogive nose — painted seeker section, shares the seam at z 1.15
    const noseProf = [
      [0.19, 1.15], [0.15, 1.45], [0.095, 1.72], [0.045, 1.9], [0.0, 2.0]
    ].map(p => new THREE.Vector2(p[0], p[1]));
    const noseGeo = new THREE.LatheGeometry(noseProf, 24);
    noseGeo.rotateX(Math.PI / 2);
    missile.add(new THREE.Mesh(noseGeo, new THREE.MeshPhongMaterial({ color: 0x7e1220, specular: 0x5a3038, shininess: 60 })));

    // raceway conduit along the spine
    const race = new THREE.BoxGeometry(0.055, 0.04, 1.45);
    race.translate(0, 0.235, -0.15);
    missile.add(new THREE.Mesh(race, finMat));

    // guidance band — thin emissive ring at the seeker seam
    const bandGeo = new THREE.CylinderGeometry(0.226, 0.226, 0.07, 24);
    bandGeo.rotateX(Math.PI / 2);
    bandGeo.translate(0, 0, 1.02);
    missile.add(new THREE.Mesh(bandGeo, new THREE.MeshBasicMaterial({ color: 0xe2182b })));

    // nozzle bell — heat-tinted metal + shadowed throat
    const nozGeo = new THREE.CylinderGeometry(0.19, 0.145, 0.3, 20);
    nozGeo.rotateX(Math.PI / 2);
    nozGeo.translate(0, 0, -1.24);
    missile.add(new THREE.Mesh(nozGeo, new THREE.MeshPhongMaterial({ color: 0x24282f, specular: 0x94856a, shininess: 150 })));
    const throat = new THREE.CircleGeometry(0.13, 16);
    throat.translate(0, 0, -1.385);
    missile.add(new THREE.Mesh(throat, new THREE.MeshBasicMaterial({ color: 0x1a0b2e })));

    // fins with real thickness (shape x = -z longitudinal, y = radial)
    function addFins(pts) {
      for (let i = 0; i < 4; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.z = i * Math.PI / 2 + Math.PI / 4;
        const sh = new THREE.Shape();
        sh.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) sh.lineTo(pts[k][0], pts[k][1]);
        const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: false });
        fg.rotateY(Math.PI / 2);           // into the fin plane, thickness along X
        fg.translate(-0.016, 0, 0);
        pivot.add(new THREE.Mesh(fg, finMat));
        missile.add(pivot);
      }
    }
    addFins([[0.35, 0.2], [0.8, 0.66], [1.03, 0.66], [1.06, 0.2]]);        // tail fins
    addFins([[-0.92, 0.2], [-0.74, 0.44], [-0.62, 0.44], [-0.6, 0.2]]);    // canards

    /* propulsion plume — layered flickering cones (additive) */
    const flameGrp = new THREE.Group();
    const outerFlameGeo = new THREE.ConeGeometry(0.19, 1.25, 9, 1, true);
    outerFlameGeo.rotateX(-Math.PI / 2);               // tip → -Z (backwards)
    const outerFlame = new THREE.Mesh(outerFlameGeo, new THREE.MeshBasicMaterial({
      color: 0x7c3aed, transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    outerFlame.position.z = -1.82;
    flameGrp.add(outerFlame);

    const midFlameGeo = new THREE.ConeGeometry(0.13, 0.85, 9, 1, true);
    midFlameGeo.rotateX(-Math.PI / 2);
    const midFlame = new THREE.Mesh(midFlameGeo, new THREE.MeshBasicMaterial({
      color: 0xa78bfa, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    midFlame.position.z = -1.62;
    flameGrp.add(midFlame);

    const coreFlameGeo = new THREE.ConeGeometry(0.075, 0.5, 8, 1, true);
    coreFlameGeo.rotateX(-Math.PI / 2);
    const coreFlame = new THREE.Mesh(coreFlameGeo, new THREE.MeshBasicMaterial({
      color: 0xf1ecff, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    coreFlame.position.z = -1.44;
    flameGrp.add(coreFlame);

    // engine glow disc at the nozzle
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({
      color: 0xc4b5fd, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
    }));
    glow.position.z = -1.215;
    flameGrp.add(glow);

    // shock diamonds inside the plume
    const diamonds = [];
    for (let d = 0; d < 3; d++) {
      const dm = new THREE.Mesh(new THREE.OctahedronGeometry(0.062 - d * 0.013),
        new THREE.MeshBasicMaterial({ color: 0xf1ecff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      dm.scale.z = 2.4;
      dm.position.z = -1.6 - d * 0.26;
      flameGrp.add(dm);
      diamonds.push(dm);
    }
    // the plume casts real light — washes the tail section purple
    const burnLight = new THREE.PointLight(0x9a6bff, 1.4, 11, 2);
    burnLight.position.z = -1.8;
    flameGrp.add(burnLight);

    missile.add(flameGrp);

    missile.scale.setScalar(1.15);
    scene.add(vehicle);

    // targeting ring under the vehicle
    const vRing = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.62, 40),
      new THREE.MeshBasicMaterial({ color: 0xe2182b, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
    vRing.rotation.x = -Math.PI / 2;
    vehicle.add(vRing);

    /* exhaust particle trail -------------------------------------- */
    const TN = low ? 90 : 200;
    const tPos = new Float32Array(TN * 3);
    const tVel = new Float32Array(TN * 3);
    const tLife = new Float32Array(TN);
    const tLife0 = new Float32Array(TN);
    const tCol = new Float32Array(TN * 3);
    for (let i = 0; i < TN; i++) { tPos[i * 3 + 1] = -9999; }
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    trailGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    // per-particle color = fade-out: hot purple at the nozzle, dying to black
    const trail = new THREE.Points(trailGeo, new THREE.PointsMaterial({
      size: 0.42, vertexColors: true, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
    }));
    scene.add(trail);
    let trailCursor = 0;
    const nozzleLocal = new THREE.Vector3(0, 0, -1.25);
    const tmpV = new THREE.Vector3();

    /* sensor cone -------------------------------------------------- */
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.4, 9, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }));
    const coneEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.ConeGeometry(4.4, 9, 12, 1, true)),
      new THREE.LineBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.18 }));
    const coneGrp = new THREE.Group();
    coneGrp.add(cone); coneGrp.add(coneEdge);
    coneGrp.rotation.x = Math.PI;
    scene.add(coneGrp);

    /* uncertainty disc --------------------------------------------- */
    const unc = new THREE.Mesh(new THREE.RingGeometry(0.98, 1.0, 48),
      new THREE.MeshBasicMaterial({ color: 0xe8a33d, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
    unc.rotation.x = -Math.PI / 2;
    scene.add(unc);
    const uncFill = new THREE.Mesh(new THREE.CircleGeometry(1, 48),
      new THREE.MeshBasicMaterial({ color: 0xe8a33d, side: THREE.DoubleSide, transparent: true, opacity: 0 }));
    uncFill.rotation.x = -Math.PI / 2;
    scene.add(uncFill);

    /* satellites + links ------------------------------------------- */
    const SATS = 7;
    const sats = [];
    const satGrp = new THREE.Group();
    for (let i = 0; i < SATS; i++) {
      const a = (i / SATS) * Math.PI * 2 + 0.4;
      const pos = new THREE.Vector3(Math.cos(a) * 58, 44 + (i % 3) * 7, Math.sin(a) * 58);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.8),
        new THREE.MeshBasicMaterial({ color: 0x9aa1ab, wireframe: true, transparent: true, opacity: 0.9 }));
      m.position.copy(pos);
      satGrp.add(m);
      const lg = new THREE.BufferGeometry().setFromPoints([pos, new THREE.Vector3()]);
      const lk = new THREE.Line(lg, new THREE.LineBasicMaterial({ color: 0x3fd68c, transparent: true, opacity: 0.28 }));
      satGrp.add(lk);
      sats.push({ mesh: m, link: lk, phase: Math.random() * 9 });
    }
    scene.add(satGrp);

    /* atmosphere particles ------------------------------------------ */
    const P = low ? 350 : 900;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(P * 3);
    for (let i = 0; i < P; i++) {
      pPos[i * 3] = (Math.random() - 0.5) * 150;
      pPos[i * 3 + 1] = Math.random() * 45;
      pPos[i * 3 + 2] = (Math.random() - 0.5) * 150;
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ color: 0x565e6a, size: 0.16, transparent: true, opacity: 0.5, sizeAttenuation: true })));

    /* state --------------------------------------------------------- */
    const S = {
      progress: 0,
      t: 0,
      mouse: { x: 0, y: 0 },
      shake: 0,
      running: true
    };
    CE.hero = S;

    if (!CE.touch) {
      document.addEventListener('mousemove', e => {
        S.mouse.x = (e.clientX / innerWidth - 0.5) * 2;
        S.mouse.y = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    /* HUD DOM refs --------------------------------------------------- */
    const $ = id => document.getElementById(id);
    const hud = {
      mode: $('hud-mode'), sats: $('hud-sats'), pdop: $('hud-pdop'),
      pos: $('hud-pos'), warn: $('hud-warn'), drift: $('hud-drift'),
      bar: $('hud-signal-bar')
    };
    let lastWarn = '';

    function phaseInfo(p) {
      if (p < 0.18) return { name: 'NOMINAL', mode: 'GNSS · RTK LOCK', sats: 7, warn: '', col: '#3fd68c' };
      if (p < 0.40) return { name: 'INTERFERENCE', mode: 'GNSS · DEGRADED', sats: Math.max(2, Math.round(7 - (p - 0.18) / 0.22 * 5)), warn: 'RF INTERFERENCE DETECTED · BEARING 214', col: '#e8a33d' };
      if (p < 0.60) return { name: 'DENIED', mode: 'GNSS · SIGNAL LOST', sats: 0, warn: 'POSITION SOURCE LOST — ESTIMATING', col: '#ff3448' };
      if (p < 0.88) return { name: 'DEAD-RECKONING', mode: 'INS · DEAD RECKONING', sats: 0, warn: 'IMU FUSION ACTIVE · DRIFT BOUNDED', col: '#e8a33d' };
      return { name: 'RESOLVED', mode: 'INS · MISSION CONTINUES', sats: 0, warn: '', col: '#3fd68c' };
    }

    /* main loop ------------------------------------------------------- */
    const clock = new THREE.Clock();
    let frame = 0;
    const prevPos = new THREE.Vector3();
    const tmpPerp = new THREE.Vector3(), tmpLook = new THREE.Vector3();
    let throttle = 1, accel = 0;
    function animate() {
      if (!S.running) return;
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;
      const p = S.progress;
      const ph = phaseInfo(p);

      /* vehicle travels the corridor — variable throttle:
         accelerates on straights, brakes into turns, periodic surges */
      const tanAhead = curve.getTangentAt((S.t + 0.02) % 1);
      let tan = curve.getTangentAt(S.t);
      const curvy = Math.max(0, 1 - tan.dot(tanAhead));
      const targetThrottle = Math.min(1.6, Math.max(0.45,
        1.25 - curvy * 55 + Math.sin(time * 0.45) * 0.35));
      const prevThrottle = throttle;
      throttle += (targetThrottle - throttle) * Math.min(dt * 2.2, 1);
      accel = accel * 0.88 + ((throttle - prevThrottle) / Math.max(dt, 1e-3)) * 0.12;
      S.t = (S.t + dt * 0.024 * throttle) % 1;
      const pos = curve.getPointAt(S.t);
      tan = curve.getTangentAt(S.t);

      /* horizontal weave around the estimated track, banking into it */
      const perp = tmpPerp.set(tan.z, 0, -tan.x).normalize();
      const weave = Math.sin(time * 0.85) * 0.9;
      const weaveD = Math.cos(time * 0.85) * 0.85;
      prevPos.copy(vehicle.position);
      vehicle.position.copy(pos).addScaledVector(perp, weave);
      vehicle.position.y += Math.sin(time * 1.3) * 0.25;
      tmpLook.copy(vehicle.position).add(tan).addScaledVector(perp, weaveD * 0.35);
      vehicle.lookAt(tmpLook);
      missile.rotation.z = -weaveD * 0.5;
      vRing.rotation.z = time * 1.4;
      coneGrp.position.set(vehicle.position.x, vehicle.position.y - 4.5, vehicle.position.z);
      coneGrp.rotation.y = time * 0.55;

      /* propulsion — controlled purple plume; length tracks throttle,
         surges with acceleration, steady low-amplitude pulse */
      const burn = Math.min(2.2, Math.max(0.55, 0.62 + throttle * 0.55 + Math.max(accel, 0) * 0.9));
      const pulse = 1 + Math.sin(time * 22) * 0.05 + (Math.random() - 0.5) * 0.05 * (1 + S.shake);
      const swell = 1 + Math.max(accel, 0) * 0.25;
      outerFlame.scale.set(swell, swell, burn * pulse);
      midFlame.scale.set(0.97, 0.97, burn * 0.92 * pulse);
      coreFlame.scale.set(1, 1, 0.75 + burn * 0.35);
      outerFlame.material.opacity = 0.62 + throttle * 0.12;
      midFlame.material.opacity = 0.78 + throttle * 0.1;
      glow.scale.setScalar(0.85 + burn * 0.25 + Math.sin(time * 22) * 0.05);
      glow.lookAt(camera.position);
      // shock diamonds spread with the burn and shimmer
      diamonds.forEach((dm, i) => {
        dm.position.z = -1.55 - i * 0.26 * burn;
        dm.material.opacity = Math.max(0, burn - 0.5) * (0.5 + Math.random() * 0.35);
        dm.scale.set(1, 1, 2.1 + Math.random() * 0.6);
      });
      burnLight.intensity = 0.8 + burn * 0.8 + Math.random() * 0.3;

      /* exhaust trail: spawn rate & velocity track the burn */
      const spawnN = Math.max(1, Math.round((low ? 1 : 2) + throttle * 1.6 + Math.max(accel, 0) * 2));
      for (let s2 = 0; s2 < spawnN; s2++) {
        const i = trailCursor; trailCursor = (trailCursor + 1) % TN;
        tmpV.copy(nozzleLocal);
        missile.localToWorld(tmpV); // nozzle world position (missile is child of vehicle)
        tPos[i * 3] = tmpV.x + (Math.random() - 0.5) * 0.12;
        tPos[i * 3 + 1] = tmpV.y + (Math.random() - 0.5) * 0.12;
        tPos[i * 3 + 2] = tmpV.z + (Math.random() - 0.5) * 0.12;
        const vMag = 3.5 + throttle * 3 + Math.random() * 1.5;
        tVel[i * 3] = -tan.x * vMag + (Math.random() - 0.5) * 0.9;
        tVel[i * 3 + 1] = -tan.y * vMag + (Math.random() - 0.5) * 0.9 + 0.4;
        tVel[i * 3 + 2] = -tan.z * vMag + (Math.random() - 0.5) * 0.9;
        tLife[i] = 0.55 + Math.random() * 0.5;
        tLife0[i] = tLife[i];
      }
      for (let i = 0; i < TN; i++) {
        if (tLife[i] > 0) {
          tLife[i] -= dt;
          tPos[i * 3] += tVel[i * 3] * dt;
          tPos[i * 3 + 1] += tVel[i * 3 + 1] * dt;
          tPos[i * 3 + 2] += tVel[i * 3 + 2] * dt;
          tVel[i * 3] *= 0.955; tVel[i * 3 + 1] *= 0.955; tVel[i * 3 + 2] *= 0.955;
          const f = Math.max(tLife[i] / tLife0[i], 0);
          tCol[i * 3] = 0.55 * f; tCol[i * 3 + 1] = 0.36 * f; tCol[i * 3 + 2] = 0.97 * f;
          if (tLife[i] <= 0) tPos[i * 3 + 1] = -9999;
        }
      }
      trailGeo.attributes.position.needsUpdate = true;
      trailGeo.attributes.color.needsUpdate = true;

      /* flown trail line */
      const n = Math.floor(S.t * 240);
      for (let i = 0; i <= n; i++) {
        const pt = pathPts[i];
        flownPos[i * 3] = pt.x; flownPos[i * 3 + 1] = pt.y; flownPos[i * 3 + 2] = pt.z;
      }
      flownGeo.setDrawRange(0, n + 1);
      flownGeo.attributes.position.needsUpdate = true;

      /* satellite links by phase */
      const inter = p >= 0.18 && p < 0.40;
      const denied = p >= 0.40;
      sats.forEach((s, i) => {
        s.mesh.rotation.y = time * 0.8 + i;
        const alive = denied ? false : (inter ? (Math.sin(time * (6 + i) + s.phase) > (p - 0.18) / 0.22 * 1.6 - 0.4) : true);
        s.link.visible = alive;
        if (alive) {
          const lp = s.link.geometry.attributes.position;
          lp.setXYZ(1, pos.x, pos.y, pos.z);
          lp.needsUpdate = true;
          s.link.material.opacity = inter ? 0.14 : 0.28;
          s.link.material.color.setHex(inter ? 0xe8a33d : 0x3fd68c);
        }
        s.mesh.material.opacity = denied ? 0.15 : 0.9;
      });

      /* uncertainty growth & containment */
      let uR = 0;
      if (p >= 0.40 && p < 0.60) uR = 1 + (p - 0.40) / 0.20 * 9;
      else if (p >= 0.60) uR = Math.max(2.4, 10 - (p - 0.60) / 0.28 * 7.6);
      unc.visible = uncFill.visible = uR > 0;
      if (uR > 0) {
        unc.scale.set(uR, uR, uR);
        uncFill.scale.set(uR, uR, uR);
        const uy = Math.max(terrainH(pos.x, pos.z), 0) + 0.35;
        unc.position.set(pos.x, uy, pos.z);
        uncFill.position.set(pos.x, uy, pos.z);
        const isDR = p >= 0.60;
        const c = isDR ? 0xe8a33d : 0xff3448;
        unc.material.color.setHex(c); uncFill.material.color.setHex(c);
        unc.material.opacity = 0.85;
        uncFill.material.opacity = 0.07;
      }

      /* line + terrain state colors */
      flownLine.material.color.setHex(denied ? (p >= 0.6 ? 0xe8a33d : 0xff3448) : 0xe2182b);
      planLine.material.opacity = denied ? 0.12 : 0.35;
      terrain.material.opacity = 0.30 + (inter ? Math.sin(time * 18) * 0.05 : 0);
      terrain.material.color.setHex(denied && p < 0.6 ? 0x4d3038 : 0x39424d);

      /* camera: parallax + timeline travel + shake */
      const travel = Math.min(p / 0.88, 1);
      const targetPos = new THREE.Vector3(
        camBase.x + Math.sin(travel * Math.PI * 0.9) * 12 + S.mouse.x * 3.2,
        camBase.y - travel * 6 + S.mouse.y * -2.2,
        camBase.z - travel * 13
      );
      if (inter || (denied && p < 0.6)) S.shake = Math.min(S.shake + dt * 2, denied ? 1 : 0.4);
      else S.shake = Math.max(S.shake - dt * 2, 0);
      targetPos.x += (Math.random() - 0.5) * S.shake * 0.5;
      targetPos.y += (Math.random() - 0.5) * S.shake * 0.4;
      camera.position.lerp(targetPos, 0.06);
      const look = new THREE.Vector3().lerpVectors(new THREE.Vector3(0, 4, 0), pos, 0.55);
      camera.lookAt(look);

      /* HUD updates (throttled) */
      if ((frame++ & 5) === 0 && hud.mode) {
        hud.mode.textContent = ph.mode;
        hud.mode.style.color = ph.col;
        hud.sats.textContent = ph.sats > 0 ? String(ph.sats).padStart(2, '0') + ' SV' : '—— SV';
        hud.pdop.textContent = ph.sats > 0 ? 'PDOP ' + (1.4 + (7 - ph.sats) * 0.9).toFixed(1) : 'PDOP N/A';
        if (hud.pos) hud.pos.textContent = (28.0587 + pos.x * 0.0001).toFixed(4) + '°N · ' + (82.4139 + pos.z * 0.0001).toFixed(4) + '°W';
        if (hud.drift) hud.drift.textContent = uR > 0 ? 'σ ' + (uR * 1.9).toFixed(1) + ' m' : 'σ 0.4 m';
        if (hud.bar) hud.bar.style.width = (ph.sats / 7 * 100) + '%';
        if (ph.warn !== lastWarn && hud.warn) {
          lastWarn = ph.warn;
          hud.warn.textContent = ph.warn;
          hud.warn.classList.toggle('active', !!ph.warn);
          hud.warn.classList.toggle('crit', ph.name === 'DENIED');
        }
      }

      renderer.render(scene, camera);
    }

    function onResize() {
      if (!W() || !H()) return;
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    }
    addEventListener('resize', onResize);
    // React to the container's own box changing (not just the window):
    // catches late-applying CSS, pinning wrappers, and mobile URL-bar shifts.
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(container);

    if (CE.reducedMotion) {
      S.progress = 0.7; S.t = 0.55;
      S.running = true; animate(); S.running = false;
    } else {
      animate();
    }

    return S;
  };
})();
