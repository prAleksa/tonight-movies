export function createSelect({ id, label, options, value, onChange }) {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  wrap.innerHTML = `<span>${label}</span>`;

  const root = document.createElement('div');
  root.className = 'select';
  root.dataset.id = id;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'select__btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');

  const valueEl = document.createElement('span');
  valueEl.className = 'select__value';

  const chevron = document.createElement('span');
  chevron.className = 'select__chevron';
  chevron.setAttribute('aria-hidden', 'true');

  btn.append(valueEl, chevron);

  const menu = document.createElement('ul');
  menu.className = 'select__menu';
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');

  let current = value ?? options[0]?.id ?? options[0];

  function labelOf(v) {
    const found = options.find((o) => (o.id ?? o) === v);
    return found?.label ?? found ?? String(v);
  }

  function renderMenu() {
    menu.replaceChildren(
      ...options.map((o) => {
        const optVal = o.id ?? o;
        const li = document.createElement('li');
        const optionBtn = document.createElement('button');
        optionBtn.type = 'button';
        optionBtn.className = `select__option${optVal === current ? ' is-active' : ''}`;
        optionBtn.textContent = o.label ?? o;
        optionBtn.addEventListener('click', () => {
          current = optVal;
          valueEl.textContent = labelOf(current);
          close();
          onChange?.(current);
          renderMenu();
        });
        li.append(optionBtn);
        return li;
      }),
    );
  }

  function open() {
    document.querySelectorAll('.select.is-open').forEach((el) => {
      if (el !== root) {
        el.classList.remove('is-open');
        el.querySelector('.select__menu').hidden = true;
        el.querySelector('.select__btn').setAttribute('aria-expanded', 'false');
      }
    });
    root.classList.add('is-open');
    menu.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
  }

  function close() {
    root.classList.remove('is-open');
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  }

  btn.addEventListener('click', () => {
    if (root.classList.contains('is-open')) close();
    else open();
  });

  valueEl.textContent = labelOf(current);
  renderMenu();
  root.append(btn, menu);
  wrap.append(root);

  return {
    el: wrap,
    get value() {
      return current;
    },
    setValue(v) {
      current = v;
      valueEl.textContent = labelOf(current);
      renderMenu();
    },
  };
}

document.addEventListener('click', (e) => {
  if (e.target.closest('.select')) return;
  document.querySelectorAll('.select.is-open').forEach((el) => {
    el.classList.remove('is-open');
    el.querySelector('.select__menu').hidden = true;
    el.querySelector('.select__btn')?.setAttribute('aria-expanded', 'false');
  });
});
