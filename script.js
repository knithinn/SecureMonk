const AGENT_KEY = 'securemonk.agents.v1';

const elements = {
  agentForm: document.querySelector('#agentForm'),
  shodanForm: document.querySelector('#shodanForm'),
  agentRows: document.querySelector('#agentRows'),
  rowTemplate: document.querySelector('#agentRowTemplate'),
  agentCount: document.querySelector('#agentCount'),
  exposedCount: document.querySelector('#exposedCount'),
  riskCount: document.querySelector('#riskCount'),
  exposedList: document.querySelector('#exposedList'),
  shodanStatus: document.querySelector('#shodanStatus'),
  navItems: [...document.querySelectorAll('.nav-item')],
};

let state = {
  agents: readAgents(),
  exposures: [],
};

function readAgents() {
  try {
    return JSON.parse(localStorage.getItem(AGENT_KEY)) ?? [];
  } catch {
    return [];
  }
}

function writeAgents() {
  localStorage.setItem(AGENT_KEY, JSON.stringify(state.agents));
}

function getRisk({ endpoint, notes }) {
  const endpointLow = endpoint.toLowerCase();
  const notesLow = (notes || '').toLowerCase();

  if (endpointLow.startsWith('http://') || !notesLow.includes('guardrail')) {
    return 'High';
  }

  if (!notesLow.includes('waf') && !notesLow.includes('filter')) {
    return 'Medium';
  }

  return 'Low';
}

function maskKey(value) {
  if (value.length <= 6) {
    return '••••••';
  }

  return `${value.slice(0, 3)}••••${value.slice(-3)}`;
}

function setActiveNav(sectionId) {
  for (const navItem of elements.navItems) {
    navItem.classList.toggle('active', navItem.getAttribute('href') === `#${sectionId}`);
  }
}

function setupSidebarNavigation() {
  const sections = elements.navItems
    .map((item) => document.querySelector(item.getAttribute('href')))
    .filter(Boolean);

  for (const navItem of elements.navItems) {
    navItem.addEventListener('click', (event) => {
      const targetSelector = navItem.getAttribute('href');
      const targetSection = document.querySelector(targetSelector);
      if (!targetSection) {
        return;
      }

      event.preventDefault();
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', targetSelector);
      setActiveNav(targetSection.id);
    });
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

      if (visible.length) {
        setActiveNav(visible[0].target.id);
      }
    },
    { threshold: [0.2, 0.45, 0.7], rootMargin: '-10% 0px -35% 0px' }
  );

  for (const section of sections) {
    observer.observe(section);
  }

  const initialHash = window.location.hash;
  if (initialHash) {
    const initialSection = document.querySelector(initialHash);
    if (initialSection) {
      setActiveNav(initialSection.id);
    }
  }
}

function renderAgents() {
  elements.agentRows.innerHTML = '';

  for (const [index, agent] of state.agents.entries()) {
    const fragment = elements.rowTemplate.content.cloneNode(true);
    const row = fragment.querySelector('tr');
    const risk = getRisk(agent);

    row.querySelector('.agent-name').textContent = agent.agentName;
    row.querySelector('.provider').textContent = agent.provider;
    row.querySelector('.model').textContent = agent.model;
    row.querySelector('.endpoint').textContent = agent.endpoint;
    row.querySelector('.api-key').textContent = maskKey(agent.apiKey);

    const riskPill = row.querySelector('.risk-pill');
    riskPill.textContent = risk;
    riskPill.classList.add(`risk-${risk.toLowerCase()}`);

    row.querySelector('.danger-btn').addEventListener('click', () => {
      state.agents.splice(index, 1);
      writeAgents();
      render();
    });

    elements.agentRows.appendChild(fragment);
  }
}

function renderMetrics() {
  elements.agentCount.textContent = state.agents.length;
  elements.exposedCount.textContent = state.exposures.length;

  const highRisk = state.agents.filter((agent) => getRisk(agent) === 'High').length;
  elements.riskCount.textContent = highRisk;
}

function renderExposures() {
  elements.exposedList.innerHTML = '';

  if (!state.exposures.length) {
    return;
  }

  for (const item of state.exposures) {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.ip_str || 'Unknown host'}</strong><br>${
      item.org || 'Unknown organization'
    } • ${item.port || 'n/a'} • ${item.location?.country_name || 'Unknown location'}<br><span class="muted">${
      item.product || item.data?.slice(0, 120) || 'No product fingerprint'
    }</span>`;
    elements.exposedList.appendChild(li);
  }
}

function render() {
  renderAgents();
  renderMetrics();
  renderExposures();
}

elements.agentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(elements.agentForm);
  const newAgent = Object.fromEntries(formData.entries());

  state.agents.unshift(newAgent);
  writeAgents();
  elements.agentForm.reset();
  render();
});

elements.shodanForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(elements.shodanForm);
  const query = formData.get('query');

  elements.shodanStatus.textContent = 'Running Shodan discovery...';
  elements.shodanStatus.classList.remove('muted');

  try {
    const response = await fetch(`/api/shodan/search?query=${encodeURIComponent(query)}`);

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      const errorMessage =
        errorPayload.error || errorPayload.details || `Shodan proxy error (${response.status})`;
      throw new Error(errorMessage);
    }

    const payload = await response.json();
    state.exposures = payload.matches?.slice(0, 8) ?? [];
    elements.shodanStatus.textContent = `Found ${payload.total ?? state.exposures.length} potential exposure(s).`;
  } catch (error) {
    state.exposures = [];
    elements.shodanStatus.textContent = `Shodan discovery failed: ${error.message}`;
  }

  render();
});

setupSidebarNavigation();
render();
