/* ============================================================
   Custom Themed Dropdown — replaces native <select> elements
   Glassmorphism design with tech cursor support
   Auto-initializes all <select> elements on the page
   ============================================================ */

(() => {
    'use strict';

    const DROPDOWN_CLASS = 'custom-dropdown';
    const initialized = new WeakSet();

    function upgradeSelect(nativeSelect) {
        if (initialized.has(nativeSelect)) return;
        initialized.add(nativeSelect);

        // Hide the native select
        nativeSelect.style.display = 'none';

        // Build wrapper
        const wrapper = document.createElement('div');
        wrapper.className = DROPDOWN_CLASS;

        // Build the trigger button (shows selected value)
        const trigger = document.createElement('div');
        trigger.className = 'cd-trigger';
        trigger.setAttribute('tabindex', '0');
        trigger.setAttribute('role', 'combobox');
        trigger.setAttribute('aria-expanded', 'false');

        const triggerLabel = document.createElement('span');
        triggerLabel.className = 'cd-trigger-label';

        const triggerArrow = document.createElement('span');
        triggerArrow.className = 'cd-trigger-arrow';
        triggerArrow.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

        trigger.appendChild(triggerLabel);
        trigger.appendChild(triggerArrow);

        // Build the options panel
        const panel = document.createElement('div');
        panel.className = 'cd-panel';
        panel.setAttribute('role', 'listbox');

        function buildOptions() {
            panel.innerHTML = '';
            Array.from(nativeSelect.options).forEach((opt, i) => {
                const item = document.createElement('div');
                item.className = 'cd-option';
                if (opt.selected) item.classList.add('selected');
                if (opt.disabled) item.classList.add('disabled');
                item.setAttribute('role', 'option');
                item.setAttribute('data-value', opt.value);
                item.textContent = opt.textContent;
                item.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (opt.disabled) return;
                    selectOption(opt.value, opt.textContent);
                });
                panel.appendChild(item);
            });
        }

        function selectOption(value, text) {
            nativeSelect.value = value;
            triggerLabel.textContent = text;
            // Update selected class
            panel.querySelectorAll('.cd-option').forEach(o => {
                o.classList.toggle('selected', o.dataset.value === value);
            });
            closeDropdown();
            // Fire change event on native select so app.js picks it up
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        function openDropdown() {
            if (wrapper.classList.contains('open')) return;
            // Close any other open dropdowns first
            document.querySelectorAll('.' + DROPDOWN_CLASS + '.open').forEach(d => {
                d.classList.remove('open');
                d.querySelector('.cd-trigger')?.setAttribute('aria-expanded', 'false');
            });
            wrapper.classList.add('open');
            trigger.setAttribute('aria-expanded', 'true');
            // Scroll selected into view
            const sel = panel.querySelector('.cd-option.selected');
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        }

        function closeDropdown() {
            wrapper.classList.remove('open');
            trigger.setAttribute('aria-expanded', 'false');
        }

        function toggleDropdown(e) {
            e.stopPropagation();
            if (wrapper.classList.contains('open')) closeDropdown();
            else openDropdown();
        }

        trigger.addEventListener('click', toggleDropdown);

        // Keyboard support
        trigger.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleDropdown(e);
            }
            if (e.key === 'Escape') closeDropdown();
            if (e.key === 'ArrowDown' && wrapper.classList.contains('open')) {
                e.preventDefault();
                const opts = panel.querySelectorAll('.cd-option:not(.disabled)');
                const current = panel.querySelector('.cd-option.selected');
                const idx = Array.from(opts).indexOf(current);
                if (idx < opts.length - 1) {
                    const next = opts[idx + 1];
                    selectOption(next.dataset.value, next.textContent);
                    openDropdown();
                }
            }
            if (e.key === 'ArrowUp' && wrapper.classList.contains('open')) {
                e.preventDefault();
                const opts = panel.querySelectorAll('.cd-option:not(.disabled)');
                const current = panel.querySelector('.cd-option.selected');
                const idx = Array.from(opts).indexOf(current);
                if (idx > 0) {
                    const prev = opts[idx - 1];
                    selectOption(prev.dataset.value, prev.textContent);
                    openDropdown();
                }
            }
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) closeDropdown();
        });

        // Assemble
        wrapper.appendChild(trigger);
        wrapper.appendChild(panel);
        nativeSelect.parentNode.insertBefore(wrapper, nativeSelect.nextSibling);

        // Set initial label
        const selectedOpt = nativeSelect.options[nativeSelect.selectedIndex];
        triggerLabel.textContent = selectedOpt ? selectedOpt.textContent : '';
        buildOptions();

        // Watch for programmatic value changes (e.g. populateForm in app.js)
        const origDescriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        let lastValue = nativeSelect.value;

        // Poll for value changes (covers programmatic .value = x)
        const valueWatcher = setInterval(() => {
            if (nativeSelect.value !== lastValue) {
                lastValue = nativeSelect.value;
                const opt = nativeSelect.options[nativeSelect.selectedIndex];
                if (opt) {
                    triggerLabel.textContent = opt.textContent;
                    panel.querySelectorAll('.cd-option').forEach(o => {
                        o.classList.toggle('selected', o.dataset.value === nativeSelect.value);
                    });
                }
            }
        }, 200);

        // If select options change dynamically, rebuild
        const selectObserver = new MutationObserver(() => {
            buildOptions();
            const opt = nativeSelect.options[nativeSelect.selectedIndex];
            if (opt) triggerLabel.textContent = opt.textContent;
        });
        selectObserver.observe(nativeSelect, { childList: true });
    }

    // Upgrade all selects on page
    function upgradeAll() {
        document.querySelectorAll('select').forEach(upgradeSelect);
    }

    // Run on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', upgradeAll);
    } else {
        upgradeAll();
    }

    // Watch for dynamically added selects
    new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType !== 1) continue;
                if (n.tagName === 'SELECT') upgradeSelect(n);
                n.querySelectorAll?.('select').forEach(upgradeSelect);
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

})();
