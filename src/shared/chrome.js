import './chrome.css';

const menu = document.querySelector('#mn');
const drawer = document.querySelector('#dr');

function markCurrentPage() {
  const page = location.pathname.split('/').pop() || 'index.html';
  const hash = location.hash || (page === 'health.html' ? '#checkin' : '');
  document.querySelectorAll('.hd .links a[href], .hd #dr a[href]').forEach((a) => {
    const [file, frag] = a.getAttribute('href').split('#');
    const isCurrent = (file || 'index.html') === page && frag !== undefined && `#${frag}` === hash;
    if (isCurrent) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
}

if (menu && drawer) {
  const setOpen = (open) => {
    drawer.hidden = !open;
    menu.setAttribute('aria-expanded', String(open));
  };

  menu.addEventListener('click', () => {
    const open = drawer.hidden;
    setOpen(open);
    if (open) drawer.querySelector('a')?.focus();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) {
      setOpen(false);
      menu.focus();
    }
  });

  document.addEventListener('click', (e) => {
    if (!drawer.hidden && !drawer.contains(e.target) && !menu.contains(e.target)) setOpen(false);
  });

  drawer.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
}

markCurrentPage();
window.addEventListener('hashchange', markCurrentPage);
