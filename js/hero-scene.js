/* ═══════════════════════════════════════════════════════════════
   HERO SCENE — F-22 under track (Three.js r128)
   Single continuous scene: a fast air target banking over moonlit
   terrain while a fire-control-style solution holds lock on it —
   flown track history, predicted path, lock reticle, lead point.
   The jet and the prediction share one flight equation, so the
   computed solution is honestly computed.
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

  /* procedural ground texture — rock & soil mottling (also used by
     the intro flyby). Per-pixel fbm noise + grit.                   */
  CE.groundTexture = function () {
    const n2 = makeNoise(4242);
    const size = 512;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        let n = 0, f = 0.012, a = 1, tot = 0;
        for (let o = 0; o < 4; o++) { n += n2(x * f, y * f) * a; tot += a; f *= 2.3; a *= 0.55; }
        n = n / tot * 0.5 + 0.5;
        const speck = Math.random() * 0.1;
        const rock = Math.max(0, n - 0.62) * 2;
        const i = (y * size + x) * 4;
        d[i]     = 18 + n * 26 + rock * 26 + speck * 22;
        d[i + 1] = 22 + n * 30 + rock * 28 + speck * 22;
        d[i + 2] = 28 + n * 34 + rock * 30 + speck * 22;
        d[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    return tex;
  };

  CE.initHero = function (opts) {
    const container = document.getElementById(opts.container);
    if (!container || !window.THREE) return null;

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
      return null;
    }
    renderer.setPixelRatio(CE.dpr);
    renderer.setSize(W(), H());
    container.appendChild(renderer.domElement);

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
    scene.fog = new THREE.FogExp2(0x050607, 0.014);
    const camera = new THREE.PerspectiveCamera(52, W() / H(), 0.1, 500);
    camera.position.set(0, 14, 30);
    camera.lookAt(0, 16, 0);

    /* lighting ----------------------------------------------------- */
    scene.add(new THREE.HemisphereLight(0x3a4552, 0x05070a, 0.75));
    const keyLight = new THREE.DirectionalLight(0xc2d3ea, 1.0);
    keyLight.position.set(-30, 55, 25);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0xe2182b, 0.16);
    rimLight.position.set(30, -5, -50);
    scene.add(rimLight);

    /* terrain ------------------------------------------------------ */
    const SEG = low ? 96 : 170;
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
    const groundTex = CE.groundTexture();
    groundTex.repeat.set(5, 5);
    if (renderer.capabilities.getMaxAnisotropy) groundTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const terrain = new THREE.Mesh(tGeo, new THREE.MeshPhongMaterial({
      color: 0xb9c3cf, map: groundTex, bumpMap: groundTex, bumpScale: 0.55,
      specular: 0x1c242e, shininess: 14
    }));
    scene.add(terrain);

    /* night sky ---------------------------------------------------- */
    const ST = low ? 140 : 320;
    const sGeo = new THREE.BufferGeometry();
    const sArr = new Float32Array(ST * 3);
    for (let i = 0; i < ST; i++) {
      sArr[i * 3] = (Math.random() - 0.5) * 600;
      sArr[i * 3 + 1] = 25 + Math.random() * 220;
      sArr[i * 3 + 2] = -60 - Math.random() * 320;
    }
    sGeo.setAttribute('position', new THREE.BufferAttribute(sArr, 3));
    scene.add(new THREE.Points(sGeo, new THREE.PointsMaterial({ color: 0xaebdd2, size: 0.6, transparent: true, opacity: 0.7, fog: false })));
    const moon = new THREE.Mesh(new THREE.CircleGeometry(9, 32),
      new THREE.MeshBasicMaterial({ color: 0xd8e2f0, transparent: true, opacity: 0.9, fog: false }));
    moon.position.set(-120, 130, -260);
    const moonHalo = new THREE.Mesh(new THREE.CircleGeometry(17, 32),
      new THREE.MeshBasicMaterial({ color: 0x8fa3c0, transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    moonHalo.position.copy(moon.position); moonHalo.position.z -= 1;
    moon.lookAt(0, 16, 34); moonHalo.lookAt(0, 16, 34);
    scene.add(moon); scene.add(moonHalo);
    const clouds = [];
    (function buildClouds() {
      const ccv = document.createElement('canvas');
      ccv.width = ccv.height = 128;
      const cg = ccv.getContext('2d');
      const grad = cg.createRadialGradient(64, 64, 6, 64, 64, 62);
      grad.addColorStop(0, 'rgba(190,205,225,0.5)');
      grad.addColorStop(0.55, 'rgba(150,165,190,0.2)');
      grad.addColorStop(1, 'rgba(150,165,190,0)');
      cg.fillStyle = grad; cg.fillRect(0, 0, 128, 128);
      const tex = new THREE.CanvasTexture(ccv);
      for (let i = 0; i < (low ? 3 : 5); i++) {
        const w2 = 55 + Math.random() * 70;
        const cl = new THREE.Mesh(new THREE.PlaneGeometry(w2, w2 * 0.32),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.09 + Math.random() * 0.07, depthWrite: false }));
        cl.position.set((Math.random() - 0.5) * 200, 30 + Math.random() * 26, -50 - Math.random() * 120);
        cl.userData.drift = 0.5 + Math.random() * 0.8;
        scene.add(cl); clouds.push(cl);
      }
    })();

    /* materials ---------------------------------------------------- */
    const airMat = new THREE.MeshPhongMaterial({ color: 0x525b66, specular: 0x8194ab, shininess: 110 });
    const darkMetal = new THREE.MeshPhongMaterial({ color: 0x272e36, specular: 0x4a545f, shininess: 60 });
    function beacon(color, r) {
      return new THREE.Mesh(new THREE.SphereGeometry(r || 0.06, 8, 8),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    }

    /* ═══ F-22 ════════════════════════════════════════════════════ */
    const jet = new THREE.Group();
    const jetPlumes = [], jetDiamonds = [];
    let jetBurnLight;
    (function buildJet() {
      const canopyMat = new THREE.MeshPhongMaterial({ color: 0x0c141f, specular: 0x9fb4d8, shininess: 240 });
      const prof = [
        [0.03, -2.16], [0.11, -2.02], [0.20, -1.72], [0.28, -1.3], [0.33, -0.8],
        [0.36, -0.2], [0.365, 0.2], [0.34, 0.75], [0.27, 1.25], [0.18, 1.75],
        [0.09, 2.1], [0.0, 2.38]
      ].map(p => new THREE.Vector2(p[0], p[1]));
      const fus = new THREE.LatheGeometry(prof, 24);
      fus.rotateX(Math.PI / 2);
      jet.add(new THREE.Mesh(fus, airMat));
      const tip = new THREE.ConeGeometry(0.088, 0.4, 14); tip.rotateX(Math.PI / 2); tip.translate(0, 0, 2.36);
      jet.add(new THREE.Mesh(tip, new THREE.MeshPhongMaterial({ color: 0x161b21, specular: 0x2a3038, shininess: 30 })));
      const spine = new THREE.SphereGeometry(0.3, 12, 8); spine.scale(0.55, 0.45, 2.4); spine.translate(0, 0.16, -0.1);
      jet.add(new THREE.Mesh(spine, airMat));
      const can = new THREE.SphereGeometry(0.24, 18, 12); can.scale(0.72, 0.6, 2.0); can.translate(0, 0.31, 0.85);
      jet.add(new THREE.Mesh(can, canopyMat));
      [1, -1].forEach(s => {
        const duct = new THREE.BoxGeometry(0.22, 0.3, 1.35);
        duct.translate(s * 0.44, -0.06, -0.15);
        jet.add(new THREE.Mesh(duct, darkMetal));
      });
      [0.17, -0.17].forEach(x => {
        const noz = new THREE.CylinderGeometry(0.155, 0.12, 0.42, 12);
        noz.rotateX(Math.PI / 2); noz.translate(x, 0, -2.05);
        jet.add(new THREE.Mesh(noz, new THREE.MeshPhongMaterial({ color: 0x2b2f36, specular: 0x94856a, shininess: 160 })));
        const inner = new THREE.CircleGeometry(0.1, 10);
        inner.translate(x, 0, -2.26);
        jet.add(new THREE.Mesh(inner, new THREE.MeshBasicMaterial({ color: 0x1a0b2e })));
      });
      function surf(pts, th) {
        const sh = new THREE.Shape();
        sh.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
        const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false });
        geo.rotateX(Math.PI / 2);
        jet.add(new THREE.Mesh(geo, airMat));
      }
      [1, -1].forEach(s => {
        surf([[s * 0.34, 1.1], [s * 0.5, 0.4], [s * 2.35, -0.72], [s * 2.35, -1.02], [s * 0.34, -1.3]], 0.045);
        surf([[s * 0.3, -1.15], [s * 1.22, -1.8], [s * 1.22, -1.98], [s * 0.3, -1.72]], 0.035);
        const fin = new THREE.Shape();
        fin.moveTo(0.68, 0.05); fin.lineTo(1.32, 0.98); fin.lineTo(1.58, 0.98); fin.lineTo(1.66, 0.05);
        const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.035, bevelEnabled: false });
        fg.rotateY(Math.PI / 2);
        const vt = new THREE.Mesh(fg, airMat);
        vt.position.x = s * 0.28; vt.rotation.z = -s * 0.24;
        jet.add(vt);
      });
      const navL = beacon(0xff2b3a, 0.05); navL.position.set(-2.35, 0.02, -1.02); jet.add(navL);
      const navR = beacon(0x2bff7a, 0.05); navR.position.set(2.35, 0.02, -1.02); jet.add(navR);
      const strobe = beacon(0xffffff, 0.06); strobe.position.set(0, 1.02, -1.5); jet.add(strobe);
      jet.userData.strobe = strobe;
      [-0.17, 0.17].forEach(x => {
        const grp = new THREE.Group();
        function pc(r, h, color, op, z) {
          const cg = new THREE.ConeGeometry(r, h, 9, 1, true); cg.rotateX(-Math.PI / 2);
          const m = new THREE.Mesh(cg, new THREE.MeshBasicMaterial({
            color, transparent: true, opacity: op,
            blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide
          }));
          m.position.z = z; grp.add(m); return m;
        }
        const outer = pc(0.15, 1.35, 0x7c3aed, 0.7, -2.95);
        const mid = pc(0.1, 0.95, 0xa78bfa, 0.8, -2.72);
        const core = pc(0.055, 0.55, 0xf1ecff, 0.95, -2.5);
        for (let d = 0; d < 3; d++) {
          const dm = new THREE.Mesh(new THREE.OctahedronGeometry(0.05 - d * 0.011),
            new THREE.MeshBasicMaterial({ color: 0xf1ecff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
          dm.scale.z = 2.4;
          dm.position.z = -2.5 - d * 0.24;
          grp.add(dm); jetDiamonds.push(dm);
        }
        grp.position.x = x;
        jet.add(grp);
        jetPlumes.push({ outer, mid, core });
      });
      jetBurnLight = new THREE.PointLight(0x9a6bff, 1.4, 12, 2);
      jetBurnLight.position.set(0, 0, -2.6);
      jet.add(jetBurnLight);
      jet.scale.setScalar(1.3);
      scene.add(jet);
    })();

    /* flight solution — deterministic, drives jet AND prediction.
       Varied racetrack: radius, altitude, and eccentricity all
       breathe slowly so the orbit never reads as a repeated loop. */
    const jetPosAt = function (t, out) {
      const R = 34 + Math.sin(t * 0.11) * 6;
      return out.set(
        Math.cos(t * 0.17) * R,
        20 + Math.sin(t * 0.5) * 1.8 + Math.sin(t * 0.23) * 2.2,
        Math.sin(t * 0.17) * R * (0.72 + Math.sin(t * 0.07) * 0.1)
      );
    };

    /* tracking overlay: history, prediction, lock reticle, lead --- */
    const HIST = 150;
    const histPos = new Float32Array(HIST * 3);
    let histLen = 0;
    const histGeo = new THREE.BufferGeometry();
    histGeo.setAttribute('position', new THREE.BufferAttribute(histPos, 3));
    histGeo.setDrawRange(0, 0);
    const histLine = new THREE.Line(histGeo, new THREE.LineBasicMaterial({ color: 0xff3448, transparent: true, opacity: 0.4 }));
    scene.add(histLine);
    const PRED = 24;
    const predPos = new Float32Array(PRED * 3);
    const predGeo = new THREE.BufferGeometry();
    predGeo.setAttribute('position', new THREE.BufferAttribute(predPos, 3));
    const predLine = new THREE.Line(predGeo, new THREE.LineDashedMaterial({
      color: 0x5fa8ff, dashSize: 0.9, gapSize: 0.6, transparent: true, opacity: 0.55
    }));
    scene.add(predLine);
    const reticle = new THREE.Group();
    const retRing = new THREE.Mesh(new THREE.RingGeometry(4.1, 4.22, 48),
      new THREE.MeshBasicMaterial({ color: 0xff3448, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    reticle.add(retRing);
    const brPts = [];
    const B = 5.4, L = 1.5;
    [[-B, -B, 1, 0], [-B, -B, 0, 1], [B, -B, -1, 0], [B, -B, 0, 1],
     [-B, B, 1, 0], [-B, B, 0, -1], [B, B, -1, 0], [B, B, 0, -1]].forEach(([x, y, dx, dy]) => {
      brPts.push(new THREE.Vector3(x, y, 0), new THREE.Vector3(x + dx * L, y + dy * L, 0));
    });
    reticle.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(brPts),
      new THREE.LineBasicMaterial({ color: 0xff3448, transparent: true, opacity: 0.75 })));
    scene.add(reticle);
    const lead = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.84, 4),
      new THREE.MeshBasicMaterial({ color: 0x5fa8ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(lead);
    const connGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
    const conn = new THREE.Line(connGeo, new THREE.LineDashedMaterial({ color: 0x5fa8ff, dashSize: 0.5, gapSize: 0.4, transparent: true, opacity: 0.4 }));
    scene.add(conn);
    const futV = new THREE.Vector3();

    /* HUD ----------------------------------------------------------- */
    const $ = id => document.getElementById(id);
    const hud = {
      mode: $('hud-mode'), sats: $('hud-sats'), pdop: $('hud-pdop'),
      pos: $('hud-pos'), warn: $('hud-warn'), drift: $('hud-drift'),
      bar: $('hud-signal-bar')
    };
    if (hud.mode) { hud.mode.textContent = 'TRACK · FAST AIR TARGET'; hud.mode.style.color = '#ff3448'; }
    if (hud.sats) hud.sats.textContent = '06 SV';
    if (hud.pdop) hud.pdop.textContent = 'PDOP 1.8';
    if (hud.drift) hud.drift.textContent = 'σ 0.6 m';
    if (hud.bar) { hud.bar.style.width = '78%'; hud.bar.style.background = '#ff3448'; }
    if (hud.warn) {
      hud.warn.textContent = 'LOCK MAINTAINED · LEAD SOLUTION VALID';
      hud.warn.classList.add('active');
    }

    /* state --------------------------------------------------------- */
    const S = { progress: 0, mouse: { x: 0, y: 0 }, running: true };
    CE.hero = S;

    if (!CE.touch) {
      document.addEventListener('mousemove', e => {
        S.mouse.x = (e.clientX / innerWidth - 0.5) * 2;
        S.mouse.y = (e.clientY / innerHeight - 0.5) * 2;
      }, { passive: true });
    }

    /* main loop ------------------------------------------------------ */
    const clock = new THREE.Clock();
    let frame = 0;
    const tmpLook = new THREE.Vector3(), tmpV = new THREE.Vector3();
    const camTarget = new THREE.Vector3(0, 14, 30), camLook = new THREE.Vector3(0, 16, 0);

    function animate() {
      if (!S.running) return;
      requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.elapsedTime;

      clouds.forEach(cl => { cl.position.x += cl.userData.drift * dt; if (cl.position.x > 130) cl.position.x = -130; });

      /* jet flight */
      jetPosAt(time, jet.position);
      jetPosAt(time + 0.3, tmpLook);
      jet.lookAt(tmpLook);
      jet.rotateZ(0.48 + Math.sin(time * 0.5) * 0.1);

      /* burners */
      jetPlumes.forEach(p => {
        const pl = 1.05 + Math.random() * 0.18;
        p.outer.scale.set(1, 1, pl);
        p.mid.scale.set(1, 1, pl * 0.9);
        p.core.scale.set(1, 1, 0.8 + pl * 0.3);
        p.outer.material.opacity = 0.55 + Math.random() * 0.2;
      });
      jetDiamonds.forEach(dm => {
        dm.material.opacity = 0.45 + Math.random() * 0.4;
        dm.scale.z = 2.1 + Math.random() * 0.6;
      });
      jetBurnLight.intensity = 1.5 + Math.random() * 0.4;
      const jbt = time % 1.3;
      jet.userData.strobe.material.opacity = (jbt < 0.06 || (jbt > 0.14 && jbt < 0.2)) ? 1 : 0;

      /* tracking solution overlay */
      if ((frame & 1) === 0) {
        histPos.copyWithin(0, 3);
        histPos[(HIST - 1) * 3] = jet.position.x;
        histPos[(HIST - 1) * 3 + 1] = jet.position.y;
        histPos[(HIST - 1) * 3 + 2] = jet.position.z;
        if (histLen < HIST) histLen++;
        histGeo.setDrawRange(HIST - histLen, histLen);
        histGeo.attributes.position.needsUpdate = true;
      }
      for (let i = 0; i < PRED; i++) {
        jetPosAt(time + 0.15 + i * 0.14, futV);
        predPos[i * 3] = futV.x; predPos[i * 3 + 1] = futV.y; predPos[i * 3 + 2] = futV.z;
      }
      predGeo.attributes.position.needsUpdate = true;
      predLine.computeLineDistances();
      reticle.position.copy(jet.position);
      reticle.quaternion.copy(camera.quaternion);
      reticle.scale.setScalar(1 + Math.sin(time * 3) * 0.04);
      retRing.rotation.z += dt * 0.7;
      jetPosAt(time + 1.5, futV);
      lead.position.copy(futV);
      lead.quaternion.copy(camera.quaternion);
      lead.rotateZ(Math.PI / 4);
      const cp = connGeo.attributes.position;
      cp.setXYZ(0, jet.position.x, jet.position.y, jet.position.z);
      cp.setXYZ(1, futV.x, futV.y, futV.z);
      cp.needsUpdate = true;
      conn.computeLineDistances();

      /* camera: ground-spotter vantage panning with the target,
         plus mouse parallax and a slight scroll push-in */
      camTarget.set(Math.sin(time * 0.05) * 3, 13 + Math.sin(time * 0.11) * 1.2, 27);
      camLook.lerp(jet.position, 0.09);
      camera.position.x += (camTarget.x + S.mouse.x * 2.4 - camera.position.x) * 0.045;
      camera.position.y += (camTarget.y + S.mouse.y * -1.6 - camera.position.y) * 0.045;
      camera.position.z += (camTarget.z - camera.position.z) * 0.045;
      camera.lookAt(camLook);
      camera.fov = 52 + Math.min(S.progress, 1) * 6;
      camera.updateProjectionMatrix();

      /* HUD: coordinates track the target; signal bar breathes */
      if ((frame++ & 7) === 0 && hud.pos) {
        hud.pos.textContent = (28.0587 + jet.position.x * 0.0001).toFixed(4) + '°N · ' +
                              (82.4139 + jet.position.z * 0.0001).toFixed(4) + '°W';
        if (hud.drift) hud.drift.textContent = 'σ ' + (0.5 + Math.abs(Math.sin(time * 0.4)) * 0.4).toFixed(1) + ' m';
        if (hud.bar) hud.bar.style.width = (72 + Math.sin(time * 1.7) * 8) + '%';
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
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(container);

    if (CE.reducedMotion) {
      S.running = true; animate(); S.running = false;
    } else {
      animate();
    }

    return S;
  };
})();
