// Variável global para controlar o estado de edição (V1.7)
let editIndex = null;

// 1. Função para Renderizar links e categorias
function renderAll(searchTerm = "") {
  chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
    const links = result.myLinks || [];
    const categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
    
    const select = document.getElementById('category-input');
    const currentSelection = select.value; 
    select.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
    if (currentSelection) select.value = currentSelection;

    const container = document.getElementById('link-container');
    container.innerHTML = '';

    categories.forEach(cat => {
      const filteredLinks = links.filter(l => {
        const belongsToCat = (l.category || 'Geral') === cat;
        const matchesSearch = l.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              cat.toLowerCase().includes(searchTerm.toLowerCase());
        return belongsToCat && matchesSearch;
      });
      
      if (filteredLinks.length > 0) {
        const header = document.createElement('h4');
        header.textContent = cat;
        container.appendChild(header);

        filteredLinks.forEach(link => {
          const globalIndex = links.indexOf(link); 
          const div = document.createElement('div');
          div.className = 'link-item';
          
          const linkContent = document.createElement('a');
          linkContent.href = link.url;
          linkContent.target = "_blank";
          linkContent.className = 'link-content';

          const img = document.createElement('img');
          img.className = 'favicon';
          try {
            const domain = new URL(link.url).hostname;
            img.src = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
          } catch (e) {
            img.src = 'icons/icon16.png'; 
          }
          img.onerror = () => { img.src = 'icons/icon16.png'; }; 

          const textSpan = document.createElement('span');
          textSpan.textContent = link.name.length > 30 ? link.name.substring(0, 27) + '...' : link.name;

          linkContent.appendChild(img);
          linkContent.appendChild(textSpan);

          // --- NOVO: Container de botões de ação (V1.7) ---
          const actionsDiv = document.createElement('div');
          actionsDiv.className = 'link-actions';

          const editBtn = document.createElement('button');
          editBtn.textContent = '✏️';
          editBtn.className = 'edit-link-btn';
          editBtn.title = "Editar link";
          editBtn.onclick = () => prepareEditLink(globalIndex);

          const delBtn = document.createElement('button');
          delBtn.textContent = 'X';
          delBtn.className = 'delete-btn';
          delBtn.onclick = () => deleteLink(globalIndex);

          actionsDiv.appendChild(editBtn);
          actionsDiv.appendChild(delBtn);

          div.appendChild(linkContent);
          div.appendChild(actionsDiv);
          container.appendChild(div);
        });
      }
    });
  });
}

// 2. Lógica de Edição de Links (V1.7)
function prepareEditLink(index) {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks || [];
    const link = links[index];
    
    // Preenche os campos com os dados para edição
    document.getElementById('name-input').value = link.name;
    document.getElementById('url-input').value = link.url;
    document.getElementById('category-input').value = link.category || 'Geral';
    
    // Altera o estado do botão de salvar
    const saveBtn = document.getElementById('save-btn');
    saveBtn.textContent = "Atualizar Link";
    saveBtn.style.backgroundColor = "var(--accent-color)";
    
    editIndex = index;
    document.getElementById('name-input').focus();
  });
}

// 3. Evento do Botão de Salvar (Atualizado V1.7 para suportar Edição)
document.getElementById('save-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('name-input');
  const urlInput = document.getElementById('url-input');
  const category = document.getElementById('category-input').value;
  const name = nameInput.value;
  let url = urlInput.value;

  if (name && url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    
    chrome.storage.sync.get(['myLinks'], (result) => {
      let links = result.myLinks || [];
      
      if (editIndex !== null) {
        // MODO EDIÇÃO: Atualiza o link existente
        links[editIndex] = { name, url, category };
        editIndex = null;
        const saveBtn = document.getElementById('save-btn');
        saveBtn.textContent = "Salvar Link";
        saveBtn.style.backgroundColor = "#10b981"; 
      } else {
        // MODO NORMAL: Adiciona novo link
        links.push({ name, url, category });
      }

      chrome.storage.sync.set({ myLinks: links }, () => {
        renderAll();
        nameInput.value = '';
        urlInput.value = '';
      });
    });
  }
});

// 4. Gerenciamento de Categorias, Busca e Backup (V1.2 - V1.4)
document.getElementById('search-input').addEventListener('input', (e) => renderAll(e.target.value));

document.getElementById('add-cat-btn').addEventListener('click', () => {
  const newCat = prompt("Digite o nome da nova categoria:");
  if (newCat) {
    chrome.storage.sync.get(['myCategories'], (result) => {
      const categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
      if (!categories.includes(newCat)) {
        categories.push(newCat);
        chrome.storage.sync.set({ myCategories: categories }, () => renderAll());
      }
    });
  }
});

document.getElementById('edit-cat-btn').addEventListener('click', () => {
  const select = document.getElementById('category-input');
  const oldCat = select.value;
  const newName = prompt(`Renomear a categoria "${oldCat}" para:`, oldCat);
  if (newName && newName !== oldCat) {
    chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
      let links = result.myLinks || [];
      let categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
      const catIndex = categories.indexOf(oldCat);
      if (catIndex > -1) categories[catIndex] = newName;
      links = links.map(l => l.category === oldCat ? { ...l, category: newName } : l);
      chrome.storage.sync.set({ myCategories: categories, myLinks: links }, () => renderAll());
    });
  }
});

document.getElementById('capture-btn').addEventListener('click', () => {
  const category = document.getElementById('category-input').value;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const name = tabs[0].title;
    let url = tabs[0].url;
    chrome.storage.sync.get(['myLinks'], (result) => {
      const links = result.myLinks || [];
      links.push({ name, url, category });
      chrome.storage.sync.set({ myLinks: links }, () => renderAll());
    });
  });
});

document.getElementById('export-btn').addEventListener('click', () => {
  chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
    const backupData = {
      links: result.myLinks || [],
      categories: result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'],
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_links_${new Date().toLocaleDateString().replace(/\//g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
});

document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.links && data.categories) {
        if (confirm("Isto irá substituir todos os seus links atuais. Continuar?")) {
          chrome.storage.sync.set({ myLinks: data.links, myCategories: data.categories }, () => {
            alert("Backup importado com sucesso!");
            renderAll();
          });
        }
      }
    } catch (err) {
      alert("Erro ao ler o ficheiro.");
    }
  };
  reader.readAsText(file);
});

function deleteLink(index) {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks || [];
    links.splice(index, 1);
    chrome.storage.sync.set({ myLinks: links }, () => renderAll());
  });
}

// 5. LÓGICA DE TEMA (V1.6)
const themeToggle = document.getElementById('theme-toggle');
const themeText = document.getElementById('theme-text');

chrome.storage.sync.get(['theme'], (result) => {
  if (result.theme === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    if (themeToggle) themeToggle.checked = true;
    if (themeText) themeText.textContent = "☀️ Modo Claro";
  }
});

if (themeToggle) {
  themeToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeText.textContent = "☀️ Modo Claro";
      chrome.storage.sync.set({ theme: 'dark' });
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      themeText.textContent = "🌙 Modo Escuro";
      chrome.storage.sync.set({ theme: 'light' });
    }
  });
}

// Inicialização
renderAll();