// 1. Função para Renderizar links e categorias agrupados
function renderAll() {
  chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
    const links = result.myLinks || [];
    // Define categorias iniciais caso o storage esteja vazio
    const categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
    
    // Atualizar o seletor (dropdown) de categorias
    const select = document.getElementById('category-input');
    select.innerHTML = '';
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });

    // Limpar o container de links
    const container = document.getElementById('link-container');
    container.innerHTML = '';

    // Renderizar links agrupados por cada categoria
    categories.forEach(cat => {
      const filteredLinks = links.filter(l => (l.category || 'Geral') === cat);
      
      // Só mostra o título da categoria se ela tiver links
      if (filteredLinks.length > 0) {
        const header = document.createElement('h4');
        header.textContent = cat;
        container.appendChild(header);

        filteredLinks.forEach(link => {
          const globalIndex = links.indexOf(link); // Index original para deletar certo
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

// 2. Função de salvamento atualizada para incluir categoria
function saveLink(name, url, category) {
  if (name && url) {
    if (!url.startsWith('http')) url = 'https://' + url;

    chrome.storage.sync.get(['myLinks'], (result) => {
      const links = result.myLinks || [];
      links.push({ name, url, category });
      
      chrome.storage.sync.set({ myLinks: links }, () => {
        renderAll();
      });
    });
  }
}

// 3. Evento: Adicionar Nova Categoria (➕)
document.getElementById('add-cat-btn').addEventListener('click', () => {
  const newCat = prompt("Digite o nome da nova categoria:");
  if (newCat) {
    chrome.storage.sync.get(['myCategories'], (result) => {
      const categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];
      if (!categories.includes(newCat)) {
        categories.push(newCat);
        chrome.storage.sync.set({ myCategories: categories }, () => renderAll());
      } else {
        alert("Esta categoria já existe!");
      }
    });
  }
});

// 4. Evento: Editar Categoria (✏️)
document.getElementById('edit-cat-btn').addEventListener('click', () => {
  const select = document.getElementById('category-input');
  const oldCat = select.value;
  const newName = prompt(`Renomear a categoria "${oldCat}" para:`, oldCat);

  if (newName && newName !== oldCat) {
    chrome.storage.sync.get(['myLinks', 'myCategories'], (result) => {
      let links = result.myLinks || [];
      let categories = result.myCategories || ['Geral', 'Faculdade', 'Concursos', 'RPG'];

      // Atualiza o nome na lista de categorias
      const catIndex = categories.indexOf(oldCat);
      if (catIndex > -1) categories[catIndex] = newName;

      // Atualiza a categoria em todos os links que a usavam
      links = links.map(l => l.category === oldCat ? { ...l, category: newName } : l);

      chrome.storage.sync.set({ myCategories: categories, myLinks: links }, () => renderAll());
    });
  }
});

// 5. Eventos de botões de links
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
  nameInput.value = '';
  urlInput.value = '';
});

// 6. Deletar e Inicializar
function deleteLink(index) {
  chrome.storage.sync.get(['myLinks'], (result) => {
    const links = result.myLinks;
    links.splice(index, 1);
    chrome.storage.sync.set({ myLinks: links }, () => renderAll());
  });
}

// Inicia a extensão carregando tudo
renderAll();