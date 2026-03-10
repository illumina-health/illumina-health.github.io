/* ============================================================
   webgl-cubes.js — Fixed full-viewport WebGL overlay
   Renders transparent wireframe cubes that rotate in 3D,
   float in front of all page content, drift upward on scroll,
   and cast subtle shadow/glow.
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Shader sources
     ---------------------------------------------------------- */
  const VERT_SRC = [
    'attribute vec3 aPos;',
    'uniform mat4 uMVP;',
    'void main() {',
    '  gl_Position = uMVP * vec4(aPos, 1.0);',
    '}'
  ].join('\n');

  const FRAG_SRC = [
    'precision mediump float;',
    'uniform vec4 uColor;',
    'void main() {',
    '  gl_FragColor = uColor;',
    '}'
  ].join('\n');

  /* ----------------------------------------------------------
     4x4 matrix math — column-major, no dependencies
     ---------------------------------------------------------- */
  function identity() {
    return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
  }

  function perspective(fov, aspect, near, far) {
    var f = 1.0 / Math.tan(fov * 0.5);
    var nf = 1.0 / (near - far);
    var o = new Float32Array(16);
    o[0] = f / aspect;
    o[5] = f;
    o[10] = (far + near) * nf;
    o[11] = -1;
    o[14] = 2 * far * near * nf;
    return o;
  }

  function translate(m, x, y, z) {
    m[12] += m[0]*x + m[4]*y + m[8]*z;
    m[13] += m[1]*x + m[5]*y + m[9]*z;
    m[14] += m[2]*x + m[6]*y + m[10]*z;
    m[15] += m[3]*x + m[7]*y + m[11]*z;
  }

  function rotateX(m, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var m4=m[4],m5=m[5],m6=m[6],m7=m[7];
    var m8=m[8],m9=m[9],m10=m[10],m11=m[11];
    m[4]=m4*c+m8*s;   m[5]=m5*c+m9*s;   m[6]=m6*c+m10*s;   m[7]=m7*c+m11*s;
    m[8]=m8*c-m4*s;   m[9]=m9*c-m5*s;   m[10]=m10*c-m6*s;  m[11]=m11*c-m7*s;
  }

  function rotateY(m, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var m0=m[0],m1=m[1],m2=m[2],m3=m[3];
    var m8=m[8],m9=m[9],m10=m[10],m11=m[11];
    m[0]=m0*c-m8*s;   m[1]=m1*c-m9*s;   m[2]=m2*c-m10*s;   m[3]=m3*c-m11*s;
    m[8]=m0*s+m8*c;   m[9]=m1*s+m9*c;   m[10]=m2*s+m10*c;  m[11]=m3*s+m11*c;
  }

  function rotateZ(m, r) {
    var s = Math.sin(r), c = Math.cos(r);
    var m0=m[0],m1=m[1],m2=m[2],m3=m[3];
    var m4=m[4],m5=m[5],m6=m[6],m7=m[7];
    m[0]=m0*c+m4*s;   m[1]=m1*c+m5*s;   m[2]=m2*c+m6*s;   m[3]=m3*c+m7*s;
    m[4]=m4*c-m0*s;   m[5]=m5*c-m1*s;   m[6]=m6*c-m2*s;   m[7]=m7*c-m3*s;
  }

  function scale(m, s) {
    for (var i = 0; i < 12; i++) m[i] *= s;
  }

  function multiply(a, b) {
    var o = new Float32Array(16);
    for (var col = 0; col < 4; col++) {
      for (var row = 0; row < 4; row++) {
        o[col*4+row] = a[row]*b[col*4] + a[4+row]*b[col*4+1] + a[8+row]*b[col*4+2] + a[12+row]*b[col*4+3];
      }
    }
    return o;
  }

  /* ----------------------------------------------------------
     Wireframe cube geometry (24 line-segment vertices)
     ---------------------------------------------------------- */
  function cubeVerts() {
    var v = [
      [-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],
      [-1,-1, 1],[1,-1, 1],[1,1, 1],[-1,1, 1]
    ];
    var edges = [
      [0,1],[1,2],[2,3],[3,0],
      [4,5],[5,6],[6,7],[7,4],
      [0,4],[1,5],[2,6],[3,7]
    ];
    var buf = [];
    for (var i = 0; i < edges.length; i++) {
      var a = v[edges[i][0]], b = v[edges[i][1]];
      buf.push(a[0]*0.5,a[1]*0.5,a[2]*0.5, b[0]*0.5,b[1]*0.5,b[2]*0.5);
    }
    return new Float32Array(buf);
  }

  /* ----------------------------------------------------------
     Cube definitions — position, size, rotation, speed, opacity
     Spread across viewport in NDC-like units
     ---------------------------------------------------------- */
  var CUBES = [
    { x:-3.2, y: 1.6, z:-5,  s:0.55, rx:0.3, ry:0.5, rz:0.1, spd:0.18, op:0.18 },
    { x: 3.5, y:-1.0, z:-7,  s:0.75, rx:0.7, ry:0.2, rz:0.4, spd:0.12, op:0.14 },
    { x:-1.2, y:-2.0, z:-4,  s:0.40, rx:0.1, ry:0.8, rz:0.3, spd:0.22, op:0.20 },
    { x: 2.0, y: 2.2, z:-8,  s:0.65, rx:0.5, ry:0.3, rz:0.6, spd:0.10, op:0.12 },
    { x:-4.0, y:-0.5, z:-9,  s:0.90, rx:0.2, ry:0.6, rz:0.2, spd:0.08, op:0.09 },
    { x: 0.8, y: 0.8, z:-5.5,s:0.45, rx:0.4, ry:0.4, rz:0.5, spd:0.16, op:0.16 },
    { x: 3.0, y:-2.5, z:-3.5,s:0.35, rx:0.6, ry:0.1, rz:0.7, spd:0.25, op:0.22 },
    { x:-2.5, y: 2.8, z:-6,  s:0.50, rx:0.8, ry:0.7, rz:0.1, spd:0.13, op:0.11 },
  ];

  /* ----------------------------------------------------------
     Scene — creates canvas, compiles shaders, runs render loop
     ---------------------------------------------------------- */
  var scene = null;

  function Scene() {
    /* Create a fixed full-viewport canvas */
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'webgl-cube-overlay';
    document.body.appendChild(this.canvas);

    this.gl = this.canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true
    });

    if (!this.gl) { this.canvas.remove(); return; }

    this.scrollY = 0;
    this.time = 0;
    this.alive = true;

    this._buildShaders();
    this._buildBuffers();
    this._resize();

    window.addEventListener('resize', this._resize.bind(this));
  }

  Scene.prototype._buildShaders = function () {
    var gl = this.gl;

    var vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, VERT_SRC);
    gl.compileShader(vs);

    var fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, FRAG_SRC);
    gl.compileShader(fs);

    this.prog = gl.createProgram();
    gl.attachShader(this.prog, vs);
    gl.attachShader(this.prog, fs);
    gl.linkProgram(this.prog);
    gl.useProgram(this.prog);

    this.aPos   = gl.getAttribLocation(this.prog, 'aPos');
    this.uMVP   = gl.getUniformLocation(this.prog, 'uMVP');
    this.uColor = gl.getUniformLocation(this.prog, 'uColor');
  };

  Scene.prototype._buildBuffers = function () {
    var gl = this.gl;
    var data = cubeVerts();
    this.vertCount = data.length / 3;
    this.vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  };

  Scene.prototype._resize = function () {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = window.innerWidth;
    var h = window.innerHeight;
    this.canvas.style.width  = w + 'px';
    this.canvas.style.height = h + 'px';
    this.canvas.width  = w * dpr;
    this.canvas.height = h * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    this.proj = perspective(Math.PI / 4.5, w / h, 0.1, 60);
  };

  Scene.prototype.start = function () {
    var self = this;
    function tick(ts) {
      if (!self.alive) return;
      self.time = ts * 0.001;
      self._draw();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  };

  Scene.prototype._draw = function () {
    var gl = this.gl;

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(this.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

    /* Scroll drives cubes upward and slightly backward */
    var scrollNorm = this.scrollY * 0.002;
    var fadeIn = Math.min(1.0, this.time * 0.4);

    for (var i = 0; i < CUBES.length; i++) {
      var c = CUBES[i];
      var t = this.time * c.spd;

      /* Scroll drift — each cube drifts at its own rate */
      var driftY = scrollNorm * (1.5 + i * 0.4);
      var driftZ = scrollNorm * (0.5 + i * 0.15);

      /* ---------- Shadow pass (slightly offset, more transparent) ---------- */
      var shadowModel = identity();
      translate(shadowModel,
        c.x + Math.sin(t * 0.7 + i) * 0.2 + 0.06,
        c.y + Math.cos(t * 0.5 + i) * 0.15 + driftY - 0.06,
        c.z - driftZ - 0.1
      );
      rotateX(shadowModel, c.rx + t * 1.1);
      rotateY(shadowModel, c.ry + t * 0.8);
      rotateZ(shadowModel, c.rz + t * 0.5);
      scale(shadowModel, c.s);

      var shadowMVP = multiply(this.proj, shadowModel);
      gl.uniformMatrix4fv(this.uMVP, false, shadowMVP);
      gl.uniform4f(this.uColor, 0.0, 0.0, 0.0, c.op * 0.25 * fadeIn);
      gl.lineWidth(1.0);
      gl.drawArrays(gl.LINES, 0, this.vertCount);

      /* ---------- Main cube pass ---------- */
      var model = identity();
      translate(model,
        c.x + Math.sin(t * 0.7 + i) * 0.2,
        c.y + Math.cos(t * 0.5 + i) * 0.15 + driftY,
        c.z - driftZ
      );
      rotateX(model, c.rx + t * 1.1);
      rotateY(model, c.ry + t * 0.8);
      rotateZ(model, c.rz + t * 0.5);
      scale(model, c.s);

      var mvp = multiply(this.proj, model);
      gl.uniformMatrix4fv(this.uMVP, false, mvp);

      /* Transparent branded orange wireframe */
      gl.uniform4f(this.uColor, 1.0, 0.55, 0.2, c.op * fadeIn);
      gl.drawArrays(gl.LINES, 0, this.vertCount);
    }
  };

  /* ----------------------------------------------------------
     Public API
     ---------------------------------------------------------- */
  window.WebGLCubes = {
    init: function () {
      scene = new Scene();
      if (scene.gl) {
        scene.start();
      }
    },
    updateScroll: function (y) {
      if (scene) scene.scrollY = y;
    },
    destroy: function () {
      if (scene) {
        scene.alive = false;
        scene.canvas.remove();
        scene = null;
      }
    }
  };
})();
