/* ============================================================
   main.js — Shared layout, centralized scroll, parallax,
   WebGL init, video fallback, scroll reveal
   ============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     Path helper
     ---------------------------------------------------------- */
  const depth = document.documentElement.dataset.depth || '0';
  const base = depth === '0' ? '.' : '..';

  /* ----------------------------------------------------------
     Navbar
     ---------------------------------------------------------- */
  function buildNavbar() {
    const nav = document.createElement('nav');
    nav.className = 'navbar';
    nav.setAttribute('aria-label', 'Main navigation');
    nav.innerHTML = `
      <div class="container">
        <a href="${base}/index.html" class="navbar__brand">
          <img src="${base}/assets/images/logo.svg"
               alt="Illumina Health Lab"
               onerror="this.src='${base}/assets/images/logo-placeholder.png'; this.onerror=function(){this.style.display='none'}" />
          <span>Illumina Health Lab</span>
        </a>
        <div class="navbar__links" id="navLinks">
          <a href="${base}/index.html" data-page="home">Home</a>
          <a href="${base}/pages/people.html" data-page="people">People</a>
          <a href="${base}/pages/about.html" data-page="about">About</a>
          <a href="${base}/pages/research-publications.html" data-page="research">Research &amp; Publications</a>
        </div>
        <button class="navbar__toggle" id="navToggle" aria-label="Toggle navigation" aria-expanded="false">
          <span></span><span></span><span></span>
        </button>
      </div>`;
    document.body.prepend(nav);

    const page = document.documentElement.dataset.page;
    if (page) {
      const active = nav.querySelector(`[data-page="${page}"]`);
      if (active) active.classList.add('active');
    }

    const toggle = document.getElementById('navToggle');
    const links = document.getElementById('navLinks');
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open);
    });

    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ----------------------------------------------------------
     Footer
     ---------------------------------------------------------- */
  function buildFooter() {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
      <div class="container">
        <div class="footer__brand">
          <strong>Illumina Health Lab</strong>
          <p>An interdisciplinary research initiative spanning Harvard Medical School, Rutgers Ernest Mario School of Pharmacy, and Duke University — advancing medicine, preventive health, health equity, and AI.</p>
          <p style="margin-top:10px">
            <a href="mailto:contact@illuminahealthlab.org">contact@illuminahealthlab.org</a>
          </p>
        </div>
        <div class="footer__links">
          <h4>Navigate</h4>
          <a href="${base}/index.html">Home</a>
          <a href="${base}/pages/people.html">People</a>
          <a href="${base}/pages/about.html">About</a>
          <a href="${base}/pages/research-publications.html">Research &amp; Publications</a>
        </div>
        <div class="footer__links">
          <h4>Connect</h4>
          <a href="#">Twitter / X</a>
          <a href="#">GitHub</a>
          <a href="#">LinkedIn</a>
          <a href="#">Google Scholar</a>
        </div>
        <div class="footer__bottom">
          &copy; ${new Date().getFullYear()} Illumina Health Lab. All rights reserved.
        </div>
      </div>`;
    document.body.appendChild(footer);
  }

  /* ----------------------------------------------------------
     Video fallback — hide container if video fails to load
     ---------------------------------------------------------- */
  function initVideoFallback() {
    document.querySelectorAll('.banner-video video').forEach(video => {
      video.addEventListener('error', () => {
        video.parentElement.style.display = 'none';
      });
    });
  }

  /* ----------------------------------------------------------
     Centralized scroll handler — single rAF-based listener
     Drives: parallax, WebGL scroll updates
     ---------------------------------------------------------- */
  function initScrollEngine() {
    const hero = document.querySelector('.hero');
    const bgLayer = document.querySelector('.hero__bg-layer');
    const bannerVideos = document.querySelectorAll('.banner-video');

    let ticking = false;

    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;

      requestAnimationFrame(() => {
        const scrollY = window.scrollY;

        /* Parallax — hero background layer */
        if (hero && bgLayer) {
          const heroH = hero.offsetHeight + hero.offsetTop;
          if (scrollY < heroH + 300) {
            bgLayer.style.transform = `translateY(${scrollY * 0.35}px)`;
          }
        }

        /* Parallax — video layers move slightly slower */
        bannerVideos.forEach(bv => {
          const parent = bv.closest('.hero, .page-banner');
          if (!parent) return;
          const rect = parent.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            const progress = -rect.top / (rect.height + window.innerHeight);
            bv.style.transform = `translateY(${progress * 40}px)`;
          }
        });

        /* WebGL scroll update */
        if (window.WebGLCubes) {
          window.WebGLCubes.updateScroll(scrollY);
        }

        ticking = false;
      });
    }, { passive: true });
  }

  /* ----------------------------------------------------------
     Scroll reveal — IntersectionObserver
     ---------------------------------------------------------- */
  function initReveal() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  /* ----------------------------------------------------------
     WebGL initialization
     ---------------------------------------------------------- */
  function initWebGL() {
    if (window.WebGLCubes) {
      window.WebGLCubes.init();
    }
  }

  /* ----------------------------------------------------------
     Init
     ---------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    buildNavbar();
    buildFooter();
    initVideoFallback();
    initWebGL();
    initScrollEngine();
    initReveal();
  });
})();
