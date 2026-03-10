/* ============================================================
   main.js — Layout, Lenis smooth scroll, GSAP + ScrollTrigger
   section reveals, dark/light transitions, scene sync
   ============================================================ */

(function () {
  'use strict';

  var depth = document.documentElement.dataset.depth || '0';
  var base  = depth === '0' ? '.' : '..';

  /* ----------------------------------------------------------
     Navbar
     ---------------------------------------------------------- */
  function buildNavbar() {
    var nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML =
      '<div class="container">' +
        '<a href="' + base + '/index.html" class="navbar__brand">' +
          '<img src="' + base + '/assets/images/logo.svg" alt="Illumina Health Lab"' +
          ' onerror="this.style.display=\'none\'" />' +
          '<span>Illumina Health Lab</span>' +
        '</a>' +
        '<div class="navbar__links" id="navLinks">' +
          '<a href="' + base + '/index.html" data-page="home">Home</a>' +
          '<a href="' + base + '/pages/people.html" data-page="people">People</a>' +
          '<a href="' + base + '/pages/about.html" data-page="about">About</a>' +
          '<a href="' + base + '/pages/research-publications.html" data-page="research">Research &amp; Publications</a>' +
        '</div>' +
        '<button class="navbar__toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false">' +
          '<span></span><span></span><span></span>' +
        '</button>' +
      '</div>';
    document.body.prepend(nav);

    var page = document.documentElement.dataset.page;
    if (page) {
      var active = nav.querySelector('[data-page="' + page + '"]');
      if (active) active.classList.add('active');
    }

    var toggle = document.getElementById('navToggle');
    var links  = document.getElementById('navLinks');
    toggle.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ----------------------------------------------------------
     Footer
     ---------------------------------------------------------- */
  function buildFooter() {
    var footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML =
      '<div class="container">' +
        '<div class="footer__brand">' +
          '<strong>Illumina Health Lab</strong>' +
          '<p>An interdisciplinary research initiative spanning Harvard Medical School, Rutgers Ernest Mario School of Pharmacy, and Duke University.</p>' +
          '<p style="margin-top:10px"><a href="mailto:contact@illuminahealthlab.org">contact@illuminahealthlab.org</a></p>' +
        '</div>' +
        '<div class="footer__links">' +
          '<h4>Navigate</h4>' +
          '<a href="' + base + '/index.html">Home</a>' +
          '<a href="' + base + '/pages/people.html">People</a>' +
          '<a href="' + base + '/pages/about.html">About</a>' +
          '<a href="' + base + '/pages/research-publications.html">Research &amp; Publications</a>' +
        '</div>' +
        '<div class="footer__links">' +
          '<h4>Connect</h4>' +
          '<a href="#">Twitter / X</a>' +
          '<a href="#">GitHub</a>' +
          '<a href="#">LinkedIn</a>' +
          '<a href="#">Google Scholar</a>' +
        '</div>' +
        '<div class="footer__bottom">' +
          '&copy; ' + new Date().getFullYear() + ' Illumina Health Lab. All rights reserved.' +
        '</div>' +
      '</div>';
    document.body.appendChild(footer);
  }

  /* ----------------------------------------------------------
     Video fallback
     ---------------------------------------------------------- */
  function initVideoFallback() {
    document.querySelectorAll('.banner-video video').forEach(function (v) {
      v.addEventListener('error', function () { v.parentElement.style.display = 'none'; });
    });
  }

  /* ----------------------------------------------------------
     Guarded reveal system — content visible by default.
     JS adds .js-enabled + .reveal-init to opt elements into
     animation. Failsafe forces visibility if animation stalls.
     ---------------------------------------------------------- */
  var revealTargets = [];

  function prepareReveals() {
    document.documentElement.classList.add('js-enabled');

    /* Assign varied animation types based on element context */
    gsap.utils.toArray('.reveal').forEach(function (el, i) {
      el.classList.add('reveal-init');

      /* Cards get alternating slide-left / slide-right */
      if (el.classList.contains('card')) {
        el.classList.add(i % 2 === 0 ? 'reveal-init--left' : 'reveal-init--right');
      }
      /* Section headers get scale-up */
      else if (el.classList.contains('section__header') || el.closest('.section__header')) {
        el.classList.add('reveal-init--scale');
      }
      /* Statement titles get clip reveal */
      else if (el.classList.contains('statement-title')) {
        el.classList.add('reveal-init--clip');
      }
      /* Default: fade-up (already set by .reveal-init) */
    });

    /* Editorial items get alternating left/right */
    gsap.utils.toArray('.editorial-item').forEach(function (el, i) {
      el.classList.add('reveal-init');
      el.classList.add(i % 2 === 0 ? 'reveal-init--left' : 'reveal-init--right');
    });

    revealTargets = gsap.utils.toArray('.reveal-init');
  }

  function failsafeVisibility() {
    setTimeout(function () {
      revealTargets.forEach(function (el) {
        if (getComputedStyle(el).opacity === '0') {
          el.classList.remove('reveal-init');
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    }, 4000);
  }

  /* ----------------------------------------------------------
     GSAP ScrollTrigger — section reveals, theme transitions,
     scene sync. Single source of truth for scroll state.
     ---------------------------------------------------------- */
  function initScrollTrigger() {
    if (typeof gsap === 'undefined') return;
    gsap.registerPlugin(ScrollTrigger);

    prepareReveals();

    /* --- Sync Three.js scene with scroll --- */
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      invalidateOnRefresh: true,
      onUpdate: function (self) {
        if (window.CubeScene) window.CubeScene.setScroll(self.scroll());
      }
    });

    /* --- Dark section transitions --- */
    document.querySelectorAll('[data-theme="dark"]').forEach(function (section) {
      ScrollTrigger.create({
        trigger: section,
        start: 'top 85%',
        end: 'top 25%',
        scrub: 0.6,
        invalidateOnRefresh: true,
        onUpdate: function (self) {
          if (window.CubeScene) window.CubeScene.setDarkness(self.progress);
        }
      });
    });

    /* --- Hero entry timeline --- */
    var heroContent = document.querySelector('.hero__content');
    if (heroContent) {
      var tl = gsap.timeline({ delay: 0.15 });
      var logo = heroContent.querySelector('.hero__logo');
      var h1   = heroContent.querySelector('h1');
      var tag  = heroContent.querySelector('.hero__tagline');
      var desc = heroContent.querySelector('.hero__desc');
      var btns = heroContent.querySelector('.hero__buttons');

      if (logo) tl.from(logo, { y: 30, opacity: 0, duration: 0.7, ease: 'power2.out' });
      if (h1)   tl.from(h1,   { y: 30, opacity: 0, duration: 0.7, ease: 'power2.out' }, '-=0.45');
      if (tag)  tl.from(tag,  { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.4');
      if (desc) tl.from(desc, { y: 20, opacity: 0, duration: 0.6, ease: 'power2.out' }, '-=0.35');
      if (btns) tl.from(btns, { y: 20, opacity: 0, duration: 0.5, ease: 'power2.out' }, '-=0.3');
    }

    /* --- Page banner entry (inner pages) --- */
    var pageBanner = document.querySelector('.page-banner__content');
    if (pageBanner) {
      gsap.from(pageBanner.children, {
        y: 25, opacity: 0, duration: 0.7, stagger: 0.15, ease: 'power2.out', delay: 0.2
      });
    }

    /* --- Varied reveals based on animation type --- */
    var stOpts = { toggleActions: 'play none none none', invalidateOnRefresh: true };

    gsap.utils.toArray('.reveal-init').forEach(function (el) {
      var props = { opacity: 1, duration: 0.75, ease: 'power2.out',
        scrollTrigger: Object.assign({ trigger: el, start: 'top 90%' }, stOpts),
        onComplete: function () {
          el.classList.remove('reveal-init', 'reveal-init--left', 'reveal-init--right', 'reveal-init--scale', 'reveal-init--clip');
        }
      };

      /* Slide from left */
      if (el.classList.contains('reveal-init--left')) {
        props.x = 0; props.y = 0;
        props.ease = 'power3.out';
      }
      /* Slide from right */
      else if (el.classList.contains('reveal-init--right')) {
        props.x = 0; props.y = 0;
        props.ease = 'power3.out';
      }
      /* Scale up */
      else if (el.classList.contains('reveal-init--scale')) {
        props.scale = 1; props.y = 0;
        props.ease = 'back.out(1.4)';
        props.duration = 0.85;
      }
      /* Clip reveal (wipe) */
      else if (el.classList.contains('reveal-init--clip')) {
        props.clipPath = 'inset(0% 0 0 0)';
        props.duration = 0.9;
        props.ease = 'power4.out';
        delete props.opacity;
      }
      /* Default: fade-up */
      else {
        props.y = 0;
      }

      gsap.to(el, props);
    });

    /* --- Spotlight entrance (scale + fade) --- */
    gsap.utils.toArray('.section-spotlight').forEach(function (section) {
      var inner = section.querySelector('.container');
      if (inner) {
        gsap.from(inner, {
          scale: 0.94, opacity: 0, duration: 1.1, ease: 'power2.out',
          scrollTrigger: { trigger: section, start: 'top 80%', invalidateOnRefresh: true }
        });
      }
    });

    /* --- Parallax: hero bg-layer --- */
    var bgLayer = document.querySelector('.hero__bg-layer');
    if (bgLayer) {
      gsap.to(bgLayer, {
        yPercent: 25,
        ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true }
      });
    }

    /* --- Paper section animation (Research page) --- */
    initPaperAnimation();

    /* Refresh after layout settles */
    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    failsafeVisibility();
  }

  /* ----------------------------------------------------------
     Paper fly-in animation (Research & Publications page)
     ---------------------------------------------------------- */
  function initPaperAnimation() {
    var paperWrap = document.querySelector('.papers-wrap');
    if (!paperWrap) return;

    var papers = paperWrap.querySelectorAll('.paper-sheet');
    if (!papers.length) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.section-papers',
        start: 'top 85%',
        toggleActions: 'play none none none',
        invalidateOnRefresh: true
      }
    });

    papers.forEach(function (p, i) {
      var fromLeft = p.classList.contains('paper--left');
      tl.fromTo(p,
        { x: fromLeft ? -220 : 220, rotation: (fromLeft ? -12 : 12) + (i * 3 - 6), opacity: 0 },
        { x: 0, rotation: p.dataset.rot || 0, opacity: 1, duration: 0.7, ease: 'power2.out' },
        i * 0.1
      );
    });

    /* Subtle scroll parallax on papers after entry */
    papers.forEach(function (p, i) {
      var depth = parseFloat(p.dataset.depth) || 0.5;
      gsap.to(p, {
        yPercent: -15 * depth,
        ease: 'none',
        scrollTrigger: {
          trigger: '.section-papers',
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', function () {
    buildNavbar();
    buildFooter();
    initVideoFallback();
    initScrollTrigger();
  });
})();
