// Toggle light/dark mode
const toggleBtn = document.getElementById('theme-toggle');
toggleBtn.addEventListener('click', () => {
  const htmlEl = document.documentElement;
  const isDark = htmlEl.classList.toggle('dark');
  htmlEl.classList.toggle('light', !isDark);
  toggleBtn.textContent = isDark ? '☀️' : '🌙';
});
