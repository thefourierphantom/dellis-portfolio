(() => {
  // Optional: auto-close other timeline items when one opens (cleaner UX)
  const root = document.querySelector('[data-timeline]');
  if (!root) return;

  root.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!(d instanceof HTMLDetailsElement)) return;
    if (!d.open) return;

    const all = root.querySelectorAll('details');
    for (const other of all) {
      if (other !== d) other.open = false;
    }
  }, true);
})();
