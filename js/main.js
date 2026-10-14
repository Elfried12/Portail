
'use strict';

const API = {
  projects: 'https://webcraft-api.vercel.app/data/projects.json',
  courses: 'https://webcraft-api.vercel.app/data/courses.json'
};

const state = {
  projects: [],
  courses: []
};

const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' fill='%234b5563' font-family='sans-serif' font-size='32' text-anchor='middle' dominant-baseline='middle'%3EImage indisponible%3C/text%3E%3C/svg%3E";




const $ = (selector, parent = document) => parent.querySelector(selector);

const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const slugify = (text) => text
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, '-');


const formatPrice = (price) => new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0
}).format(price);

const plural = (count, word) => `${count} ${word}${count > 1 ? 's' : ''}`;


const renderTechBadges = (technologies) => `
  <ul class="badge-list" aria-label="Technologies utilisées">
    ${technologies.map((tech) => `<li class="tag tag-tech">${escapeHTML(tech)}</li>`).join('')}
  </ul>`;


const fillSelect = (select, values) => {
  if (!select) return;
  [...values]
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .forEach((value) => select.add(new Option(value, value)));
};


async function fetchJSON(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erreur HTTP ${response.status}`);
  }
  return response.json();
}


const toggleLoader = (loader, isLoading) => {
  if (loader) loader.classList.toggle('d-none', !isLoading);
};

// Affiche le message d'erreur d'une section
const showError = (errorBox, message) => {
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.remove('d-none');
};

// API 1 : projets
async function loadProjects() {
  const loader = $('#projects-loader');
  const errorBox = $('#projects-error');

  toggleLoader(loader, true);
  try {
    const data = await fetchJSON(API.projects);
    state.projects = data.projects;

    fillSelect($('#project-tech'), data.technologies);
    fillSelect($('#project-category'), data.categories);
    renderProjects(state.projects);
  } catch (error) {
    console.error('API Projets :', error);
    showError(errorBox, 'Impossible de charger les projets pour le moment. Vérifiez votre connexion puis rechargez la page.');
  } finally {
    // Exécuté dans tous les cas : succès ou erreur
    toggleLoader(loader, false);
  }
}

// API 2 : formations
async function loadCourses() {
  const loader = $('#courses-loader');
  const errorBox = $('#courses-error');

  toggleLoader(loader, true);
  try {
    const data = await fetchJSON(API.courses);
    state.courses = data.courses;

    // Page d'accueil : filtres + cartes
    fillSelect($('#course-category'), data.categories);
    fillSelect($('#course-tech'), data.technologies);
    // Les niveaux gardent leur ordre logique (pas de tri alphabétique)
    data.levels.forEach((level) => $('#course-level')?.add(new Option(level, level)));
    renderCourses(state.courses);

    // Page d'inscription : liste déroulante des formations
    fillCourseSelect(state.courses);
  } catch (error) {
    console.error('API Formations :', error);
    showError(errorBox, 'Impossible de charger les formations pour le moment. Vérifiez votre connexion puis rechargez la page.');
    showCourseSelectError();
  } finally {
    toggleLoader(loader, false);
  }
}



const createProjectCard = (project, index) => `
  <div class="col-12 col-md-6 col-lg-4">
    <article class="item-card" style="animation-delay: ${index * 60}ms">
      <img src="${escapeHTML(project.image)}" alt="Aperçu du projet ${escapeHTML(project.title)}"
           class="item-card-img" loading="lazy">
      <div class="item-card-body">
        <span class="tag tag-category align-self-start">${escapeHTML(project.category)}</span>
        <h3 class="item-card-title">${escapeHTML(project.title)}</h3>
        <p class="item-card-subtitle">Client : ${escapeHTML(project.client)}</p>
        ${renderTechBadges(project.technologies)}
        <div class="item-card-actions">
          <button type="button" class="btn btn-details js-project-details" data-id="${project.id}"
                  aria-label="Voir les détails du projet ${escapeHTML(project.title)}">
            Voir détails
          </button>
        </div>
      </div>
    </article>
  </div>`;

function renderProjects(projects) {
  const grid = $('#projects-grid');
  const count = $('#projects-count');
  if (!grid) return;

  count.textContent = `${plural(projects.length, 'projet')} sur ${state.projects.length}`;

  if (projects.length === 0) {
    grid.innerHTML = '<div class="col-12"><p class="empty-state">Aucun projet ne correspond à votre recherche.</p></div>';
    return;
  }
  grid.innerHTML = projects.map(createProjectCard).join('');
}


const createCourseCard = (course, index) => {
  const statusClass = course.available ? 'tag-available' : 'tag-full';
  const statusLabel = course.available ? 'Disponible' : 'Complet';

  // Formation complète : bouton désactivé au lieu d'un lien
  const registerButton = course.available
    ? `<a href="inscription.html?formation=${course.id}" class="btn btn-accent"
          aria-label="S'inscrire à la formation ${escapeHTML(course.title)}">S'inscrire</a>`
    : '<button type="button" class="btn btn-accent" disabled>Complet</button>';

  return `
  <div class="col-12 col-md-6 col-lg-4">
    <article class="item-card" style="animation-delay: ${index * 60}ms">
      <div class="item-card-img-wrapper">
        <img src="${escapeHTML(course.image)}" alt="Illustration de la formation ${escapeHTML(course.title)}"
             class="item-card-img" loading="lazy">
        <span class="tag tag-status ${statusClass}">${statusLabel}</span>
      </div>
      <div class="item-card-body">
        <div class="d-flex flex-wrap gap-2">
          <span class="tag tag-category">${escapeHTML(course.category)}</span>
          <span class="tag tag-level-${slugify(course.level)}">${escapeHTML(course.level)}</span>
        </div>
        <h3 class="item-card-title">${escapeHTML(course.title)}</h3>
        <p class="item-card-meta">
          <span><span aria-hidden="true">⏱</span> ${escapeHTML(course.duration)}</span>
          <span class="rating"><span aria-hidden="true">★</span> ${course.rating.toLocaleString('fr-FR')}<span class="visually-hidden"> sur 5</span></span>
          <span>${plural(course.students, 'étudiant')}</span>
        </p>
        ${renderTechBadges(course.technologies)}
        <p class="item-card-price mb-0">${formatPrice(course.price)}</p>
        <div class="item-card-actions">
          <button type="button" class="btn btn-details js-course-details" data-id="${course.id}"
                  aria-label="Voir les détails de la formation ${escapeHTML(course.title)}">
            Voir détails
          </button>
          ${registerButton}
        </div>
      </div>
    </article>
  </div>`;
};

function renderCourses(courses) {
  const grid = $('#courses-grid');
  const count = $('#courses-count');
  if (!grid) return;

  count.textContent = `${plural(courses.length, 'formation')} sur ${state.courses.length}`;

  if (courses.length === 0) {
    grid.innerHTML = '<div class="col-12"><p class="empty-state">Aucune formation ne correspond à votre recherche.</p></div>';
    return;
  }
  grid.innerHTML = courses.map(createCourseCard).join('');
}

/* ---------- 6. Liste des formations (page inscription) ---------- */

function fillCourseSelect(courses) {
  const select = $('#course');
  if (!select) return;

  select.innerHTML = '<option value="">Choisissez une formation</option>';
  courses.forEach((course) => {
    const label = `${course.title} (${course.level})${course.available ? '' : ' — Complet'}`;
    const option = new Option(label, course.id);
    option.disabled = !course.available;   // impossible de choisir une formation complète
    select.add(option);
  });
}

function showCourseSelectError() {
  const select = $('#course');
  if (!select) return;

  select.innerHTML = '<option value="">Formations indisponibles</option>';
  select.disabled = true;
  const errorBox = $('#course-error');
  if (errorBox) {
    errorBox.textContent = 'Impossible de charger la liste des formations. Rechargez la page.';
  }
}

/* ---------- 7. Images cassées ---------- */

// L'événement "error" ne remonte pas : on l'écoute en phase de capture (true)
function handleBrokenImages() {
  document.addEventListener('error', (event) => {
    const img = event.target;
    if (img.tagName === 'IMG' && !img.dataset.fallback) {
      img.dataset.fallback = 'true';   // évite une boucle infinie
      img.src = FALLBACK_IMAGE;
    }
  }, true);
}


// Débounce : la fonction ne s'exécute que lorsque l'utilisateur
// arrête de taper pendant "delay" ms (évite de filtrer à chaque touche)
const debounce = (callback, delay = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => callback(...args), delay);
  };
};

// Texte en minuscules et sans accents : "Développement" -> "developpement"
const normalize = (text) => String(text)
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase();

// Filtres combinés : recherche ET techno ET catégorie
function filterProjects() {
  if (!state.projects.length) return;   // données pas encore chargées

  const query = normalize($('#project-search').value.trim());
  const tech = $('#project-tech').value;
  const category = $('#project-category').value;

  const results = state.projects.filter((project) => {
    const searchable = normalize([
      project.title,
      project.client,
      project.description,
      project.category,
      ...project.technologies
    ].join(' '));

    const matchesSearch = !query || searchable.includes(query);
    const matchesTech = !tech || project.technologies.includes(tech);
    const matchesCategory = !category || project.category === category;

    return matchesSearch && matchesTech && matchesCategory;
  });

  renderProjects(results);
}

// Filtres combinés : recherche ET catégorie ET niveau ET techno
function filterCourses() {
  if (!state.courses.length) return;

  const query = normalize($('#course-search').value.trim());
  const category = $('#course-category').value;
  const level = $('#course-level').value;
  const tech = $('#course-tech').value;

  const results = state.courses.filter((course) => {
    const searchable = normalize([
      course.title,
      course.description,
      course.instructor,
      course.category,
      ...course.technologies
    ].join(' '));

    const matchesSearch = !query || searchable.includes(query);
    const matchesCategory = !category || course.category === category;
    const matchesLevel = !level || course.level === level;
    const matchesTech = !tech || course.technologies.includes(tech);

    return matchesSearch && matchesCategory && matchesLevel && matchesTech;
  });

  renderCourses(results);
}

function initFilters() {
  // Projets : recherche avec débounce, filtres immédiats
  if ($('#project-search')) {
    $('#project-search').addEventListener('input', debounce(filterProjects));
    $('#project-tech').addEventListener('change', filterProjects);
    $('#project-category').addEventListener('change', filterProjects);
  }

  // Formations
  if ($('#course-search')) {
    $('#course-search').addEventListener('input', debounce(filterCourses));
    ['#course-category', '#course-level', '#course-tech'].forEach((id) => {
      $(id).addEventListener('change', filterCourses);
    });
  }

  // Touche Entrée dans une barre de recherche : pas de rechargement de page
  document.querySelectorAll('.filters').forEach((form) => {
    form.addEventListener('submit', (event) => event.preventDefault());
  });
}



let lastTrigger = null;

const showModal = (modalId) => {
  bootstrap.Modal.getOrCreateInstance(document.getElementById(modalId)).show();
};

// Bloc "étiquette / valeur" pour les listes d'informations
const infoItem = (label, value) => `<div><dt>${label}</dt><dd>${value}</dd></div>`;

function openProjectModal(id) {
  const project = state.projects.find((item) => item.id === id);
  if (!project) return;

  $('#projectModalTitle').textContent = project.title;
  $('#projectModalBody').innerHTML = `
    <img src="${escapeHTML(project.image)}" alt="Aperçu du projet ${escapeHTML(project.title)}" class="modal-img">
    <p>${escapeHTML(project.description)}</p>

    <dl class="info-grid">
      ${infoItem('Client', escapeHTML(project.client))}
      ${infoItem('Catégorie', escapeHTML(project.category))}
      ${infoItem('Année', project.year)}
      ${infoItem('Durée', escapeHTML(project.duration))}
    </dl>

    <h4 class="modal-section-title">Technologies</h4>
    ${renderTechBadges(project.technologies)}

    <h4 class="modal-section-title">Fonctionnalités</h4>
    <ul class="check-list">
      ${project.features.map((feature) => `<li>${escapeHTML(feature)}</li>`).join('')}
    </ul>

    <a href="${escapeHTML(project.url)}" class="btn btn-accent mt-4" target="_blank" rel="noopener">
      Visiter le site <span class="visually-hidden">(nouvel onglet)</span>
    </a>`;

  showModal('projectModal');
}

function openCourseModal(id) {
  const course = state.courses.find((item) => item.id === id);
  if (!course) return;

  $('#courseModalTitle').textContent = course.title;
  $('#courseModalBody').innerHTML = `
    <img src="${escapeHTML(course.image)}" alt="Illustration de la formation ${escapeHTML(course.title)}" class="modal-img">
    <p>${escapeHTML(course.description)}</p>

    <dl class="info-grid">
      ${infoItem('Formateur', escapeHTML(course.instructor))}
      ${infoItem('Catégorie', escapeHTML(course.category))}
      ${infoItem('Niveau', `<span class="tag tag-level-${slugify(course.level)}">${escapeHTML(course.level)}</span>`)}
      ${infoItem('Durée', escapeHTML(course.duration))}
      ${infoItem('Prix', formatPrice(course.price))}
      ${infoItem('Note', `<span class="rating"><span aria-hidden="true">★</span> ${course.rating.toLocaleString('fr-FR')} / 5</span>`)}
      ${infoItem('Étudiants', course.students)}
      ${infoItem('Disponibilité', course.available ? 'Places disponibles' : 'Formation complète')}
    </dl>

    <h4 class="modal-section-title">Technologies</h4>
    ${renderTechBadges(course.technologies)}

    <h4 class="modal-section-title">Programme (${course.modules.length} modules)</h4>
    <ol class="check-list">
      ${course.modules.map((module) => `<li>${escapeHTML(module)}</li>`).join('')}
    </ol>`;

  // Bouton "S'inscrire maintenant" : lien actif ou désactivé selon la disponibilité
  const cta = $('#courseModalCta');
  if (course.available) {
    cta.href = `inscription.html?formation=${course.id}`;
    cta.textContent = "S'inscrire maintenant";
    cta.classList.remove('disabled');
    cta.removeAttribute('aria-disabled');
    cta.removeAttribute('tabindex');
  } else {
    cta.removeAttribute('href');
    cta.textContent = 'Formation complète';
    cta.classList.add('disabled');
    cta.setAttribute('aria-disabled', 'true');
    cta.setAttribute('tabindex', '-1');
  }

  showModal('courseModal');
}

function initModals() {
  // Délégation d'événements : un seul écouteur par grille,
 
  $('#projects-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('.js-project-details');
    if (!button) return;
    lastTrigger = button;
    openProjectModal(Number(button.dataset.id));
  });

  $('#courses-grid')?.addEventListener('click', (event) => {
    const button = event.target.closest('.js-course-details');
    if (!button) return;
    lastTrigger = button;
    openCourseModal(Number(button.dataset.id));
  });

  // À la fermeture, le focus revient sur le bouton "Voir détails" 
  document.querySelectorAll('.modal').forEach((modal) => {
    modal.addEventListener('hidden.bs.modal', () => {
      if (lastTrigger) lastTrigger.focus();
      lastTrigger = null;
    });
  });
}

/* ---------- 10. Navigation ---------- */

function initNavigation() {
  const menu = $('#mainMenu');
  if (!menu) return;

  // Mobile : le menu se referme après un clic sur un lien
  menu.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (menu.classList.contains('show')) {
        bootstrap.Collapse.getOrCreateInstance(menu, { toggle: false }).hide();
      }
    });
  });

  // Accueil : le lien actif suit la section visible pendant le défilement
  const sections = document.querySelectorAll('main section[id]');
  const anchorLinks = menu.querySelectorAll('a[href^="#"]');
  if (!sections.length || !anchorLinks.length || !('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      anchorLinks.forEach((link) => {
        const isActive = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('active', isActive);
        if (isActive) {
          link.setAttribute('aria-current', 'page');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });   // zone de détection : milieu de l'écran

  sections.forEach((section) => observer.observe(section));
}
/* ---------- 11. Formulaire d'inscription ---------- */

const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/;          // lettres (accents compris), espace, tiret, apostrophe
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;       // regex imposée par le sujet
const PHONE_REGEX = /^\+[1-9]\d{7,14}$/;                // format international E.164 : + indicatif + numéro
const MOTIVATION_MIN = 50;

// Une fonction de validation par champ : renvoie le message d'erreur, ou '' si c'est valide
const validators = {
  firstname: (value) => {
    if (!value) return 'Le prénom est obligatoire.';
    if (value.length < 2) return 'Le prénom doit contenir au moins 2 caractères.';
    if (!NAME_REGEX.test(value)) return 'Le prénom ne peut contenir que des lettres, espaces, tirets ou apostrophes.';
    return '';
  },

  lastname: (value) => {
    if (!value) return 'Le nom est obligatoire.';
    if (value.length < 2) return 'Le nom doit contenir au moins 2 caractères.';
    if (!NAME_REGEX.test(value)) return 'Le nom ne peut contenir que des lettres, espaces, tirets ou apostrophes.';
    return '';
  },

  email: (value) => {
    if (!value) return "L'adresse email est obligatoire.";
    if (!EMAIL_REGEX.test(value)) return 'Adresse email invalide. Exemple : prenom.nom@domaine.com';
    return '';
  },

  phone: (value) => {
    if (!value) return 'Le numéro de téléphone est obligatoire.';
    // On tolère espaces, points, tirets et parenthèses, retirés avant le test
    const cleaned = value.replace(/[\s.\-()]/g, '');
    if (!cleaned.startsWith('+')) return "Le numéro doit commencer par + suivi de l'indicatif du pays (ex : +33).";
    if (!PHONE_REGEX.test(cleaned)) return 'Numéro invalide : 8 à 15 chiffres après le +. Exemple : +33 6 12 34 56 78';
    return '';
  },

  course: (value) => {
    if ($('#course').disabled) return 'La liste des formations est indisponible. Rechargez la page.';
    if (!value) return 'Veuillez choisir une formation.';
    return '';
  },

  level: (value) => (value ? '' : 'Veuillez indiquer votre niveau.'),

  motivation: (value) => {
    if (!value) return 'La motivation est obligatoire.';
    if (value.length < MOTIVATION_MIN) {
      const missing = MOTIVATION_MIN - value.length;
      return `Encore ${plural(missing, 'caractère')} pour atteindre le minimum de ${MOTIVATION_MIN}.`;
    }
    return '';
  },

  // Champ optionnel : vide = valide ; rempli = nombre entier entre 0 et 50
  experience: (value) => {
    if (!value) return '';
    const years = Number(value);
    if (!Number.isInteger(years) || years < 0 || years > 50) {
      return "L'expérience doit être un nombre entier d'années entre 0 et 50.";
    }
    return '';
  }
};

// Valide un champ, affiche ou efface son erreur, met à jour son état visuel
function validateField(field) {
  const validator = validators[field.name];
  if (!validator) return true;   // champ sans règle (ex : entreprise)

  const value = field.value.trim();
  const message = validator(value);
  const errorBox = document.getElementById(`${field.id}-error`);
  const isValid = message === '';

  if (errorBox) errorBox.textContent = message;
  field.classList.toggle('is-invalid', !isValid);
  // Un champ optionnel laissé vide ne passe pas en vert
  field.classList.toggle('is-valid', isValid && value !== '');
  field.setAttribute('aria-invalid', String(!isValid));

  return isValid;
}

// Compteur de caractères sous la motivation
function updateMotivationCounter() {
  const counter = $('#motivation-counter');
  const length = $('#motivation').value.trim().length;
  const isComplete = length >= MOTIVATION_MIN;

  counter.textContent = isComplete
    ? `✓ ${length} caractères : minimum atteint`
    : `${length} / ${MOTIVATION_MIN} caractères minimum`;
  counter.classList.toggle('is-complete', isComplete);
}

// Remet tous les champs dans leur état neutre
function clearFormStates(form) {
  form.querySelectorAll('.form-control, .form-select').forEach((field) => {
    field.classList.remove('is-valid', 'is-invalid');
    field.removeAttribute('aria-invalid');
    delete field.dataset.touched;
  });
  form.querySelectorAll('.field-error').forEach((errorBox) => {
    errorBox.textContent = '';
  });
}

function showSuccess(form) {
  const firstname = form.firstname.value.trim();
  const courseTitle = form.course.options[form.course.selectedIndex].text;

  $('#successModalBody').innerHTML = `
    <p class="mb-2">Merci <strong>${escapeHTML(firstname)}</strong>, votre demande d'inscription a bien été enregistrée.</p>
    <p class="mb-2">Formation choisie : <strong>${escapeHTML(courseTitle)}</strong></p>
    <p class="mb-0">Un conseiller vous contactera à l'adresse <strong>${escapeHTML(form.email.value.trim())}</strong> sous 48 h.</p>`;

  showModal('successModal');
}

function initForm() {
  const form = $('#registration-form');
  if (!form) return;

  const fields = form.querySelectorAll('input, select, textarea');

  fields.forEach((field) => {
    // Quand on quitte un champ, il devient "touché" et il est validé
    field.addEventListener('blur', () => {
      field.dataset.touched = 'true';
      validateField(field);
    });

    // Validation en temps réel pendant la saisie, une fois le champ touché
    // (on ne crie pas "erreur" dès la première lettre tapée)
    const liveEvent = field.tagName === 'SELECT' ? 'change' : 'input';
    field.addEventListener(liveEvent, () => {
      if (field.dataset.touched || field.tagName === 'SELECT') {
        validateField(field);
      }
    });
  });

  $('#motivation').addEventListener('input', updateMotivationCounter);

  // Validation globale à la soumission
  form.addEventListener('submit', (event) => {
    event.preventDefault();

    // On valide TOUS les champs (map, pas every : every s'arrêterait au premier faux)
    const results = [...fields].map((field) => {
      field.dataset.touched = 'true';
      return validateField(field);
    });

    if (results.includes(false)) {
      // Le focus va sur le premier champ en erreur (accessibilité)
      form.querySelector('.is-invalid')?.focus();
      return;
    }

    showSuccess(form);

    // Réinitialisation du formulaire après succès
    form.reset();
    clearFormStates(form);
    updateMotivationCounter();
  });

  // Bouton "Effacer" : on nettoie aussi les états visuels
  form.addEventListener('reset', () => {
    clearFormStates(form);
    // Le reset natif vide les champs juste après cet événement
    setTimeout(updateMotivationCounter, 0);
  });
}
function init() {
  handleBrokenImages();
  initNavigation();
  initFilters();
  initModals();
  initForm();

  if ($('#projects-grid')) loadProjects();
  if ($('#courses-grid') || $('#course')) loadCourses();
}

document.addEventListener('DOMContentLoaded', init);