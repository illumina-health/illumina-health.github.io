/* ============================================================
   scene.js — Three.js 3D cube scene
   Three-tier depth system: far (InstancedMesh), mid (InstancedMesh),
   near (individual MeshPhysicalMaterial glass cubes).
   Fixed full-viewport canvas behind page content.
   ============================================================ */

(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ----------------------------------------------------------
     Canvas & Renderer
     ---------------------------------------------------------- */
  var canvas = document.createElement('canvas');
  canvas.id = 'scene-canvas';
  document.body.prepend(canvas);

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  /* ----------------------------------------------------------
     Scene & Camera
     ---------------------------------------------------------- */
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 120);
  camera.position.set(0, 0, 14);

  /* ----------------------------------------------------------
     Lighting
     ---------------------------------------------------------- */
  var ambient = new THREE.AmbientLight(0xfff8f0, 0.6);
  scene.add(ambient);

  var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(5, 8, 10);
  scene.add(dirLight);

  var fillLight = new THREE.DirectionalLight(0xffd7b5, 0.3);
  fillLight.position.set(-5, -3, 5);
  scene.add(fillLight);

  /* ----------------------------------------------------------
     Shared geometry
     ---------------------------------------------------------- */
  var cubeGeo = new THREE.BoxGeometry(1, 1, 1);
  var edgesGeo = new THREE.EdgesGeometry(cubeGeo);
  var dummy = new THREE.Object3D();

  /* ----------------------------------------------------------
     Seeded random for reproducible cube placement
     ---------------------------------------------------------- */
  var seed = 42;
  function srand() {
    seed = (seed * 16807 + 0) % 2147483647;
    return (seed - 1) / 2147483646;
  }

  /* ----------------------------------------------------------
     FAR LAYER — InstancedMesh, many small cubes, low opacity
     ---------------------------------------------------------- */
  var FAR_COUNT = 12;
  var farMat = new THREE.MeshStandardMaterial({
    color: 0xff9248,
    transparent: true,
    opacity: 0.045,
    roughness: 0.9,
    metalness: 0.05
  });

  var farGroup = new THREE.Group();
  var farMesh = new THREE.InstancedMesh(cubeGeo, farMat, FAR_COUNT);

  for (var i = 0; i < FAR_COUNT; i++) {
    dummy.position.set(
      (srand() - 0.5) * 32,
      (srand() - 0.5) * 20,
      -8 - srand() * 25
    );
    dummy.rotation.set(srand() * Math.PI * 2, srand() * Math.PI * 2, 0);
    dummy.scale.setScalar(0.2 + srand() * 0.35);
    dummy.updateMatrix();
    farMesh.setMatrixAt(i, dummy.matrix);
  }
  farMesh.instanceMatrix.needsUpdate = true;
  farGroup.add(farMesh);
  scene.add(farGroup);

  /* ----------------------------------------------------------
     MID LAYER — InstancedMesh, moderate count and visibility
     ---------------------------------------------------------- */
  var MID_COUNT = 8;
  var midMat = new THREE.MeshStandardMaterial({
    color: 0xffb38a,
    transparent: true,
    opacity: 0.08,
    roughness: 0.6,
    metalness: 0.1
  });

  var midGroup = new THREE.Group();
  var midMesh = new THREE.InstancedMesh(cubeGeo, midMat, MID_COUNT);

  for (var j = 0; j < MID_COUNT; j++) {
    dummy.position.set(
      (srand() - 0.5) * 22,
      (srand() - 0.5) * 15,
      -4 - srand() * 16
    );
    dummy.rotation.set(srand() * Math.PI * 2, srand() * Math.PI * 2, srand());
    dummy.scale.setScalar(0.3 + srand() * 0.5);
    dummy.updateMatrix();
    midMesh.setMatrixAt(j, dummy.matrix);
  }
  midMesh.instanceMatrix.needsUpdate = true;
  midGroup.add(midMesh);
  scene.add(midGroup);

  /* ----------------------------------------------------------
     NEAR LAYER — individual glass cubes with MeshPhysicalMaterial
     Positioned near edges/corners to frame content, not cover it.
     ---------------------------------------------------------- */
  var glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xffb38a,
    transparent: true,
    opacity: 0.18,
    transmission: 0.7,
    roughness: 0.05,
    metalness: 0.0,
    ior: 1.45,
    thickness: 0.5,
    side: THREE.DoubleSide,
    envMapIntensity: 0.3
  });

  var edgeLineMat = new THREE.LineBasicMaterial({
    color: 0xff9248,
    transparent: true,
    opacity: 0.22
  });

  var nearDefs = [
    { x: -6.0, y: 2.8, z: -2.5, s: 1.1, rxs: 0.10, rys: 0.07 },
    { x:  6.5, y:-1.5, z: -3.5, s: 1.3, rxs: 0.07, rys: 0.12 },
    { x: -3.5, y:-3.5, z: -1.8, s: 0.8, rxs: 0.13, rys: 0.09 },
    { x:  5.0, y: 3.8, z: -4.0, s: 0.9, rxs: 0.09, rys: 0.11 }
  ];

  var nearCubes = [];

  nearDefs.forEach(function (def) {
    var mat = glassMat.clone();
    var mesh = new THREE.Mesh(cubeGeo, mat);
    mesh.position.set(def.x, def.y, def.z);
    mesh.scale.setScalar(def.s);
    mesh.rotation.set(srand() * Math.PI, srand() * Math.PI, 0);
    mesh.userData = { origY: def.y, rxs: def.rxs, rys: def.rys };

    var line = new THREE.LineSegments(edgesGeo, edgeLineMat.clone());
    mesh.add(line);

    scene.add(mesh);
    nearCubes.push(mesh);
  });

  /* ----------------------------------------------------------
     State — driven externally by main.js via CubeScene API
     ---------------------------------------------------------- */
  var scrollY = 0;
  var darkness = 0;

  /* ----------------------------------------------------------
     Animation loop
     ---------------------------------------------------------- */
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();
    var elapsed = clock.getElapsedTime();

    if (reducedMotion) {
      renderer.render(scene, camera);
      return;
    }

    var sy = scrollY * 0.001;

    /* Far: very slow collective rotation + slight vertical drift */
    farGroup.rotation.y = elapsed * 0.012 + sy * 0.04;
    farGroup.rotation.x = elapsed * 0.006;
    farGroup.position.y = sy * 0.25;

    /* Mid: moderate collective rotation + drift */
    midGroup.rotation.y = elapsed * 0.02 + sy * 0.07;
    midGroup.rotation.x = elapsed * 0.01 + sy * 0.015;
    midGroup.position.y = sy * 0.5;

    /* Near: per-cube rotation + strong parallax drift */
    for (var i = 0; i < nearCubes.length; i++) {
      var cube = nearCubes[i];
      var ud = cube.userData;
      cube.rotation.x += ud.rxs * delta;
      cube.rotation.y += ud.rys * delta;
      cube.position.y = ud.origY + sy * (1.0 + i * 0.25);
    }

    /* Theme adaptation — darkness modulates lighting */
    ambient.intensity = 0.6 - darkness * 0.35;
    dirLight.intensity = 0.8 - darkness * 0.25;

    for (var k = 0; k < nearCubes.length; k++) {
      var edge = nearCubes[k].children[0];
      if (edge && edge.material) {
        edge.material.opacity = 0.22 + darkness * 0.25;
      }
    }

    renderer.render(scene, camera);
  }

  animate();

  /* ----------------------------------------------------------
     Resize
     ---------------------------------------------------------- */
  window.addEventListener('resize', function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  window.CubeScene = {
    setScroll: function (y) { scrollY = y; },
    setDarkness: function (d) { darkness = Math.max(0, Math.min(1, d)); }
  };
})();
