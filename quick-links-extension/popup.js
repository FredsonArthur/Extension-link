// 1. Função para Renderizar links e categorias (com suporte a busca da V1.3)
function renderAll(searchTerm = "") {
  chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
    const links = result.myLinks || [];
    const categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
    
    // Atualizar o seletor (dropdown) de categorias
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
      // Filtro para a barra de pesquisa
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
          
          const anchor = document.createElement('a');
          anchor.href = link.url;
          anchor.textContent = link.name.length > 35 ? link.name.substring(0, 32) + '...' : link.name;
          anchor.target = "_blank";

          const delBtn = document.createElement('button');
          delBtn.textContent = 'X';
          delBtn.className = 'delete-btn';
          delBtn.onclick = () => deleteLink(globalIndex);

          div.appendChild(anchor);
          div.appendChild(delBtn);
          container.appendChild(div);
        });
      }
    });
  });
}

// 2. Funções de salvamento e Categorias
function saveLink(name, url, category) {
  if (name && url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    chrome.storage.sync.get(['myLinks'], (result) => {
      const links = result.myLinks || [];
      links.push({ name, url, category });
      chrome.storage.sync.set({ myLinks: links }, () => renderAll());
    });
  }
}

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

// 3. Eventos de botões de links
document.getElementById('capture-btn').addEventListener('click', () => {
  const category = document.getElementById('category-input').value;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    saveLink(tabs[0].title, tabs[0].url, category);
  });
});

document.getElementById('save-btn').addEventListener('click', () => {
  const nameInput = document.getElementById('name-input');
  const urlInput = document.getElementById('url-input');
  const category = document.getElementById('category-input').value;
  saveLink(nameInput.value, urlInput.value, category);
  nameInput.value = ''; urlInput.value = '';
});

// ==========================================================
// NOVO: LÓGICA DE BACKUP (V1.4)
// ==========================================================

// Exportar Backup para ficheiro .json
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

// Acionar o seletor de ficheiro escondido
document.getElementById('import-btn').addEventListener('click', () => {
  document.getElementById('import-file').click();
});

// Processar a importação do ficheiro carregado
document.getElementById('import-file').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.links && data.categories) {
        if (confirm("Isto irá substituir todos os seus links atuais. Continuar?")) {
          chrome.storage.sync.set({
            myLinks: data.links,
            myCategories: data.categories
          }, () => {
            alert("Backup importado com sucesso!");
            renderAll();
          });
        }
      } else {
        alert("Ficheiro de backup inválido.");
      }
    } catch (err) {
      alert("Erro ao ler o ficheiro.");
    }
  };
  reader.readAsText(file);
});

// ==========================================================

function deleteLink(index) {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks;
    links.splice(index, 1);
    chrome.storage.sync.set({ myLinks: links }, () => renderAll());
  });
}

renderAll();